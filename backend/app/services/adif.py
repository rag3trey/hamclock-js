"""ADIF Log Parsing Service - Parse amateur radio contact logs"""
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class QSO:
    """Represents a single QSO (contact) from ADIF log"""
    call: str
    frequency: float  # MHz
    mode: str
    date_time: datetime
    rst_sent: str = ""
    rst_received: str = ""
    name: str = ""
    qth: str = ""
    grid: str = ""
    country: str = ""
    band: str = ""
    power: Optional[float] = None
    notes: str = ""
    
    def to_dict(self) -> Dict:
        return {
            'call': self.call,
            'frequency': self.frequency,
            'mode': self.mode,
            'date_time': self.date_time.isoformat(),
            'rst_sent': self.rst_sent,
            'rst_received': self.rst_received,
            'name': self.name,
            'qth': self.qth,
            'grid': self.grid,
            'country': self.country,
            'band': self.band,
            'power': self.power,
            'notes': self.notes
        }


class ADIFParser:
    """Parse ADIF (Amateur Data Interchange Format) log files"""
    
    # Band mapping from frequency
    BAND_MAP = {
        0.136: '2200m', 0.5: '630m', 1.8: '160m', 3.5: '80m', 5.3: '60m',
        7.0: '40m', 10.1: '30m', 14.0: '20m', 18.1: '17m', 21.0: '15m',
        24.9: '12m', 28.0: '10m', 50.0: '6m', 144.0: '2m', 222.0: '1.25m',
        420.0: '70cm', 902.0: '33cm', 1240.0: '23cm', 2300.0: '13cm',
        3400.0: '9cm', 5650.0: '5cm', 10368.0: '3cm', 24000.0: '1.2cm'
    }
    
    def __init__(self):
        self.qsos: List[QSO] = []
        self.worked_grids: set = set()
        self.worked_countries: set = set()
        self.band_stats: Dict[str, int] = {}
        self.mode_stats: Dict[str, int] = {}
    
    def parse_file(self, file_path: str) -> Tuple[List[QSO], Dict]:
        """
        Parse an ADIF file and return QSO list with statistics
        
        Args:
            file_path: Path to ADIF file
            
        Returns:
            Tuple of (QSO list, statistics dict)
        """
        try:
            with open(file_path, 'r', errors='ignore') as f:
                content = f.read()
            
            return self.parse_content(content)
        
        except Exception as e:
            logger.error(f"Error reading ADIF file: {e}")
            raise
    
    def parse_content(self, content: str) -> Tuple[List[QSO], Dict]:
        """
        Parse ADIF content string
        
        Args:
            content: ADIF file content as string
            
        Returns:
            Tuple of (QSO list, statistics dict)
        """
        self.qsos = []
        self.worked_grids = set()
        self.worked_countries = set()
        self.band_stats = {}
        self.mode_stats = {}
        
        # Split into header and records
        header_match = re.search(r'<eoh>', content, re.IGNORECASE)
        if not header_match:
            logger.warning("No ADIF header found")
            records_text = content
        else:
            records_text = content[header_match.end():]
        
        # Find all QSO records (fields between < and >)
        record_pattern = r'<eor>'
        records = re.split(record_pattern, records_text, flags=re.IGNORECASE)
        
        for record in records:
            if not record.strip():
                continue
            
            try:
                qso = self._parse_record(record)
                if qso:
                    self.qsos.append(qso)
                    
                    # Update statistics
                    if qso.grid:
                        self.worked_grids.add(qso.grid.upper())
                    if qso.country:
                        self.worked_countries.add(qso.country)
                    
                    if qso.band:
                        self.band_stats[qso.band] = self.band_stats.get(qso.band, 0) + 1
                    
                    if qso.mode:
                        self.mode_stats[qso.mode] = self.mode_stats.get(qso.mode, 0) + 1
            
            except Exception as e:
                logger.debug(f"Error parsing record: {e}")
                continue
        
        # Sort by date (newest first)
        self.qsos.sort(key=lambda x: x.date_time, reverse=True)
        
        stats = self._calculate_stats()
        return self.qsos, stats
    
    def _parse_record(self, record: str) -> Optional[QSO]:
        """Parse a single ADIF record"""
        fields = self._extract_fields(record)
        
        if not fields.get('call'):
            return None
        
        # Required fields
        call = fields.get('call', '').upper()
        frequency = float(fields.get('freq', fields.get('freq_rx', 14.0)))
        mode = fields.get('mode', 'SSB').upper()
        
        # Parse date/time
        date_str = fields.get('qso_date', '')
        time_str = fields.get('time_on', '')
        date_time = self._parse_datetime(date_str, time_str)
        
        if not date_time:
            return None
        
        # Band determination
        band = self._get_band(frequency)
        
        # Optional fields
        grid = fields.get('gridsquare', '').upper()
        country = fields.get('country', '')
        name = fields.get('name', '')
        qth = fields.get('qth', '')
        rst_sent = fields.get('rst_sent', '')
        rst_received = fields.get('rst_rcvd', '')
        power = None
        if fields.get('tx_pwr'):
            try:
                power = float(fields.get('tx_pwr'))
            except:
                pass
        notes = fields.get('comment', '')
        
        return QSO(
            call=call,
            frequency=frequency,
            mode=mode,
            date_time=date_time,
            rst_sent=rst_sent,
            rst_received=rst_received,
            name=name,
            qth=qth,
            grid=grid,
            country=country,
            band=band,
            power=power,
            notes=notes
        )
    
    def _extract_fields(self, record: str) -> Dict[str, str]:
        """Extract ADIF fields from record text"""
        fields = {}
        
        # Pattern: <fieldname:length>value or <fieldname:length:type>value
        pattern = r'<([a-zA-Z_]+)(?::(\d+))?(?::([a-zA-Z]))?>(.*?)(?=<|$)'
        
        for match in re.finditer(pattern, record, re.IGNORECASE):
            field_name = match.group(1).lower()
            field_length = int(match.group(2)) if match.group(2) else None
            field_type = match.group(3) if match.group(3) else 'S'  # String default
            field_value = match.group(4)
            
            # Extract only the specified length
            if field_length and len(field_value) > field_length:
                field_value = field_value[:field_length]
            
            fields[field_name] = field_value.strip()
        
        return fields
    
    def _parse_datetime(self, date_str: str, time_str: str) -> Optional[datetime]:
        """Parse ADIF date and time strings"""
        try:
            if not date_str:
                return None
            
            # Date format: YYYYMMDD
            if len(date_str) < 8:
                return None
            
            year = int(date_str[0:4])
            month = int(date_str[4:6])
            day = int(date_str[6:8])
            
            # Time format: HHMM or HHMMSS (optional)
            hour = 0
            minute = 0
            second = 0
            
            if time_str:
                if len(time_str) >= 4:
                    hour = int(time_str[0:2])
                    minute = int(time_str[2:4])
                if len(time_str) >= 6:
                    second = int(time_str[4:6])
            
            return datetime(year, month, day, hour, minute, second)
        
        except Exception as e:
            logger.debug(f"Error parsing datetime {date_str} {time_str}: {e}")
            return None
    
    def _get_band(self, frequency_mhz: float) -> str:
        """Determine band from frequency in MHz"""
        for freq, band in sorted(self.BAND_MAP.items()):
            if frequency_mhz >= freq:
                band_freq = band
        
        return band_freq if 'band_freq' in locals() else 'Unknown'
    
    def _calculate_stats(self) -> Dict:
        """Calculate statistics from QSOs"""
        stats = {
            'total_qsos': len(self.qsos),
            'unique_calls': len(set(qso.call for qso in self.qsos)),
            'worked_grids': len(self.worked_grids),
            'worked_countries': len(self.worked_countries),
            'band_stats': self.band_stats,
            'mode_stats': self.mode_stats,
            'date_range': {
                'first': self.qsos[-1].date_time.isoformat() if self.qsos else None,
                'last': self.qsos[0].date_time.isoformat() if self.qsos else None
            }
        }
        
        return stats


class ADIFService:
    """Service for managing ADIF logs"""
    
    def __init__(self):
        self.parser = ADIFParser()
        self.log_files: Dict[str, Tuple[List[QSO], Dict]] = {}
    
    async def upload_log(self, file_path: str, name: str = "main") -> Dict:
        """
        Upload and parse an ADIF log file
        
        Args:
            file_path: Path to ADIF file
            name: Name to store log under
            
        Returns:
            Statistics dictionary
        """
        try:
            qsos, stats = self.parser.parse_file(file_path)
            self.log_files[name] = (qsos, stats)
            
            logger.info(f"✅ Loaded {len(qsos)} QSOs from {file_path}")
            return stats
        
        except Exception as e:
            logger.error(f"❌ Error uploading log: {e}")
            raise
    
    def get_qsos(self, name: str = "main", limit: int = 100, 
                 band: Optional[str] = None, mode: Optional[str] = None) -> List[Dict]:
        """Get QSOs from log"""
        if name not in self.log_files:
            return []
        
        qsos, _ = self.log_files[name]
        
        # Filter by band if specified
        if band:
            qsos = [q for q in qsos if q.band == band]
        
        # Filter by mode if specified
        if mode:
            qsos = [q for q in qsos if q.mode == mode]
        
        # Limit results
        qsos = qsos[:limit]
        
        return [q.to_dict() for q in qsos]
    
    def get_worked_grids(self, name: str = "main") -> List[str]:
        """Get list of worked grid squares"""
        if name not in self.log_files:
            return []
        
        _, stats = self.log_files[name]
        return sorted(list(self.parser.worked_grids))
    
    def get_worked_countries(self, name: str = "main") -> List[str]:
        """Get list of worked countries"""
        if name not in self.log_files:
            return []
        
        _, stats = self.log_files[name]
        return sorted(list(self.parser.worked_countries))
    
    def get_statistics(self, name: str = "main") -> Dict:
        """Get log statistics"""
        if name not in self.log_files:
            return {}
        
        _, stats = self.log_files[name]
        return stats
    
    def search_qsos(self, call: str, name: str = "main") -> List[Dict]:
        """Search QSOs by callsign"""
        if name not in self.log_files:
            return []
        
        qsos, _ = self.log_files[name]
        call_upper = call.upper()
        
        matches = [q for q in qsos if call_upper in q.call]
        return [q.to_dict() for q in matches]


# Global instance
adif_service = ADIFService()
