"""Radio contest calendar service"""
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import json
from pathlib import Path


# Hardcoded list of major radio contests for 2026
MAJOR_CONTESTS = [
    {
        "name": "ARRL New Year Contest",
        "start_date": "2026-01-03 00:00",
        "end_date": "2026-01-05 23:59",
        "description": "ARRL New Year Contest - SSB & CW",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["CW", "SSB"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "ARRL International DX Contest (CW)",
        "start_date": "2026-02-14 00:00",
        "end_date": "2026-02-15 23:59",
        "description": "ARRL International DX Contest - CW",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["CW"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "ARRL International DX Contest (SSB)",
        "start_date": "2026-03-07 00:00",
        "end_date": "2026-03-08 23:59",
        "description": "ARRL International DX Contest - SSB",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["SSB"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "CQ WW WPX Contest (CW)",
        "start_date": "2026-05-30 00:00",
        "end_date": "2026-05-31 23:59",
        "description": "CQ WW WPX Contest - CW",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["CW"],
        "url": "https://www.cqwwpx.com"
    },
    {
        "name": "CQ WW WPX Contest (SSB)",
        "start_date": "2026-09-26 00:00",
        "end_date": "2026-09-27 23:59",
        "description": "CQ WW WPX Contest - SSB",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["SSB"],
        "url": "https://www.cqwwpx.com"
    },
    {
        "name": "ARRL 10m Contest",
        "start_date": "2026-12-05 00:00",
        "end_date": "2026-12-06 23:59",
        "description": "ARRL 10 Meter Contest - SSB & CW",
        "bands": ["10m"],
        "modes": ["CW", "SSB"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "CQ WW DX Contest (CW)",
        "start_date": "2026-10-24 00:00",
        "end_date": "2026-10-25 23:59",
        "description": "CQ WW DX Contest - CW",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["CW"],
        "url": "https://www.cqwwdx.com"
    },
    {
        "name": "CQ WW DX Contest (SSB)",
        "start_date": "2026-11-07 00:00",
        "end_date": "2026-11-08 23:59",
        "description": "CQ WW DX Contest - SSB",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["SSB"],
        "url": "https://www.cqwwdx.com"
    },
    {
        "name": "ARRL Field Day",
        "start_date": "2026-06-27 18:00",
        "end_date": "2026-06-28 20:00",
        "description": "ARRL Field Day Contest",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m", "6m", "2m", "70cm"],
        "modes": ["CW", "SSB", "RTTY", "FT8"],
        "url": "https://www.arrl.org/field-day"
    },
    {
        "name": "FT8 Digital Contest",
        "start_date": "2026-02-01 00:00",
        "end_date": "2026-02-07 23:59",
        "description": "FT8 Digital Contest Week",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["FT8"],
        "url": "https://www.ft8.org"
    },
    {
        "name": "ARRL VHF/UHF Contest",
        "start_date": "2026-01-18 18:00",
        "end_date": "2026-01-19 03:00",
        "description": "ARRL VHF/UHF Contest - SSB & CW",
        "bands": ["6m", "2m", "70cm", "33cm", "23cm"],
        "modes": ["CW", "SSB"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "ARRL January VHF Sweepstakes",
        "start_date": "2026-01-25 18:00",
        "end_date": "2026-01-26 03:00",
        "description": "VHF Sweepstakes - SSB & CW",
        "bands": ["6m", "2m", "70cm"],
        "modes": ["CW", "SSB"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "FM Simplex Contest",
        "start_date": "2026-04-12 14:00",
        "end_date": "2026-04-12 19:00",
        "description": "FM Simplex Contest on 2m & 70cm",
        "bands": ["2m", "70cm"],
        "modes": ["FM"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "ARRL UHF Contest",
        "start_date": "2026-08-16 18:00",
        "end_date": "2026-08-17 03:00",
        "description": "ARRL UHF Contest - 222 MHz, 432 MHz, and up",
        "bands": ["1.3GHz", "2.3GHz", "3.4GHz", "5.7GHz"],
        "modes": ["CW", "SSB", "FM"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "ARRL EME Contest",
        "start_date": "2026-10-10 18:00",
        "end_date": "2026-10-12 03:00",
        "description": "Earth-Moon-Earth (EME) Contest",
        "bands": ["6m", "2m", "70cm", "33cm"],
        "modes": ["CW", "SSB"],
        "url": "https://www.arrl.org/contests"
    },
    {
        "name": "Winter Field Day",
        "start_date": "2026-01-02 19:00",
        "end_date": "2026-01-03 19:00",
        "description": "Winter Field Day - Phone, CW & Digital",
        "bands": ["160m", "80m", "40m", "20m", "15m", "10m"],
        "modes": ["CW", "SSB", "RTTY", "PSK"],
        "url": "https://www.arrl.org/contests"
    }
]


class ContestsService:
    """Service for fetching radio contest information"""
    
    def __init__(self):
        self.cache = {}
        self.cache_duration = 3600  # 1 hour
        self.cache_time = {}
        self.history_file = Path("/tmp/contests_history.json")
        self._load_history()
        
    def _load_history(self):
        """Load historical contest data from file"""
        try:
            if self.history_file.exists():
                with open(self.history_file, 'r') as f:
                    self.history = json.load(f)
            else:
                self.history = []
        except Exception as e:
            print(f"❌ Error loading contests history: {e}")
            self.history = []
    
    def _save_history(self):
        """Save contest data to file"""
        try:
            with open(self.history_file, 'w') as f:
                json.dump(self.history, f, indent=2)
        except Exception as e:
            print(f"❌ Error saving contests history: {e}")
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cache entry is still valid"""
        if key not in self.cache_time:
            return False
        elapsed = (datetime.now(timezone.utc) - self.cache_time[key]).total_seconds()
        return elapsed < self.cache_duration
    
    async def get_upcoming_contests(self, days_ahead: int = 30) -> Dict[str, Any]:
        """
        Get upcoming radio contests
        
        Args:
            days_ahead: Number of days to look ahead
            
        Returns:
            Dictionary with contest information
        """
        cache_key = f"contests_{days_ahead}"
        
        # Check cache
        if cache_key in self.cache and self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        try:
            print(f"🔄 Fetching contests (next {days_ahead} days)...")
            
            # Use our curated list of major contests
            contests = self._process_contests(MAJOR_CONTESTS)
            
            # Update cache
            self.cache[cache_key] = {
                'contests': contests,
                'count': len(contests),
                'updated': datetime.now(timezone.utc).isoformat(),
                'next_days': days_ahead,
                'source': 'Major radio contests'
            }
            self.cache_time[cache_key] = datetime.now(timezone.utc)
            
            # Save to history
            self.history = contests
            self._save_history()
            
            print(f"✅ Found {len(contests)} contests")
            return self.cache[cache_key]
            
        except Exception as e:
            print(f"❌ Error processing contests: {e}")
            
            # Return cached history if available
            if self.history:
                return {
                    'contests': self.history[:10],  # Last 10 cached contests
                    'count': len(self.history),
                    'error': str(e),
                    'cached': True,
                    'updated': 'from cache'
                }
            
            return {
                'contests': [],
                'count': 0,
                'error': str(e),
                'updated': datetime.now(timezone.utc).isoformat()
            }
    
    def _process_contests(self, contests: List[Dict]) -> List[Dict]:
        """Process and format contest data"""
        processed = []
        now = datetime.now(timezone.utc)
        
        for contest in contests:
            try:
                # Parse start and end times
                start_str = contest.get('start_date', '')
                end_str = contest.get('end_date', '')
                
                # Convert to datetime objects
                start = self._parse_contest_date(start_str)
                end = self._parse_contest_date(end_str)
                
                if not start or not end:
                    continue
                
                # Skip past contests
                if end < now:
                    continue
                
                # Calculate status
                if start <= now <= end:
                    status = 'active'
                elif start > now:
                    status = 'upcoming'
                else:
                    status = 'finished'
                
                # Determine duration
                duration_hours = (end - start).total_seconds() / 3600
                
                processed_contest = {
                    'name': contest.get('name', 'Unknown'),
                    'description': contest.get('description', ''),
                    'start': start.isoformat(),
                    'end': end.isoformat(),
                    'start_display': start.strftime('%b %d %H:%M UTC'),
                    'end_display': end.strftime('%b %d %H:%M UTC'),
                    'duration_hours': round(duration_hours, 1),
                    'status': status,
                    'bands': self._extract_bands(contest.get('description', '')),
                    'url': contest.get('url', ''),
                    'modes': self._extract_modes(contest.get('description', ''))
                }
                
                processed.append(processed_contest)
                
            except Exception as e:
                print(f"❌ Error processing contest: {e}")
                continue
        
        # Sort by start date
        processed.sort(key=lambda x: x['start'])
        
        return processed
    
    def _parse_contest_date(self, date_str: str) -> Optional[datetime]:
        """Parse contest date string to datetime object"""
        try:
            # Try various date formats
            formats = [
                '%Y-%m-%d %H:%M',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%dT%H:%M:%S',
                '%m/%d/%Y %H:%M',
                '%m/%d %H:%M'
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    # Assume UTC if no timezone
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except ValueError:
                    continue
            
            return None
        except Exception as e:
            print(f"❌ Error parsing date '{date_str}': {e}")
            return None
    
    def _extract_bands(self, description: str) -> List[str]:
        """Extract band names from contest description"""
        bands = []
        band_keywords = ['160m', '80m', '40m', '20m', '15m', '10m', '6m', '2m', '70cm', 'VHF', 'UHF']
        
        description_lower = description.lower()
        for band in band_keywords:
            if band.lower() in description_lower:
                bands.append(band)
        
        return bands
    
    def _extract_modes(self, description: str) -> List[str]:
        """Extract modes from contest description"""
        modes = []
        mode_keywords = {'SSB': 'SSB', 'CW': 'CW', 'RTTY': 'RTTY', 'FT8': 'FT8', 'PSK': 'PSK', 'MIXED': 'Mixed'}
        
        description_upper = description.upper()
        for keyword, mode in mode_keywords.items():
            if keyword in description_upper:
                modes.append(mode)
        
        return modes
    
    async def get_contests_by_band(self, band: str, days_ahead: int = 30) -> List[Dict]:
        """Get contests for a specific band"""
        all_contests = await self.get_upcoming_contests(days_ahead)
        
        filtered = [
            c for c in all_contests['contests']
            if band in c.get('bands', []) or not c.get('bands')  # Include if band matches or no specific bands listed
        ]
        
        return filtered
    
    async def get_contests_by_mode(self, mode: str, days_ahead: int = 30) -> List[Dict]:
        """Get contests for a specific mode"""
        all_contests = await self.get_upcoming_contests(days_ahead)
        
        filtered = [
            c for c in all_contests['contests']
            if mode in c.get('modes', []) or not c.get('modes')  # Include if mode matches or no specific modes listed
        ]
        
        return filtered
