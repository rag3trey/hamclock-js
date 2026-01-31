"""DX Cluster Service - Connects to DX cluster and parses spots"""
import asyncio
import re
from datetime import datetime, timezone
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class DXSpot:
    """Represents a DX spot"""
    def __init__(self, callsign: str, frequency: float, spotter: str, 
                 comment: str, time: datetime, band: str = "", 
                 latitude: Optional[float] = None, longitude: Optional[float] = None):
        self.callsign = callsign
        self.frequency = frequency
        self.spotter = spotter
        self.comment = comment
        self.time = time
        self.band = band or self._determine_band(frequency)
        self.latitude = latitude
        self.longitude = longitude
    
    def _determine_band(self, freq: float) -> str:
        """Determine band from frequency in kHz"""
        if 1800 <= freq < 2000:
            return "160m"
        elif 3500 <= freq < 4000:
            return "80m"
        elif 5330 <= freq < 5405:
            return "60m"
        elif 7000 <= freq < 7300:
            return "40m"
        elif 10100 <= freq < 10150:
            return "30m"
        elif 14000 <= freq < 14350:
            return "20m"
        elif 18068 <= freq < 18168:
            return "17m"
        elif 21000 <= freq < 21450:
            return "15m"
        elif 24890 <= freq < 24990:
            return "12m"
        elif 28000 <= freq < 29700:
            return "10m"
        elif 50000 <= freq < 54000:
            return "6m"
        elif 144000 <= freq < 148000:
            return "2m"
        else:
            return "Other"
    
    def to_dict(self, observer_lat: Optional[float] = None, observer_lon: Optional[float] = None) -> Dict:
        """Convert to dictionary with optional bearing/distance"""
        result = {
            'callsign': self.callsign,
            'frequency': self.frequency,
            'spotter': self.spotter,
            'comment': self.comment,
            'time': self.time.isoformat(),
            'band': self.band,
            'latitude': self.latitude,
            'longitude': self.longitude
        }
        
        # Calculate bearing and distance if observer location and spot location available
        if observer_lat is not None and observer_lon is not None and self.latitude is not None and self.longitude is not None:
            bearing = self._calculate_bearing(observer_lat, observer_lon, self.latitude, self.longitude)
            distance = self._calculate_distance(observer_lat, observer_lon, self.latitude, self.longitude)
            result['bearing'] = bearing
            result['distance'] = distance
        
        return result
    
    @staticmethod
    def _calculate_bearing(from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> float:
        """Calculate great circle bearing in degrees (0-360)"""
        import math
        to_rad = math.pi / 180
        to_deg = 180 / math.pi
        
        lat1 = from_lat * to_rad
        lon1 = from_lon * to_rad
        lat2 = to_lat * to_rad
        lon2 = to_lon * to_rad
        
        d_lon = lon2 - lon1
        y = math.sin(d_lon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lon)
        
        bearing = math.atan2(y, x) * to_deg
        bearing = (bearing + 360) % 360
        return bearing
    
    @staticmethod
    def _calculate_distance(from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> float:
        """Calculate great circle distance in kilometers"""
        import math
        to_rad = math.pi / 180
        R = 6371  # Earth's radius in km
        
        lat1 = from_lat * to_rad
        lat2 = to_lat * to_rad
        d_lat = (to_lat - from_lat) * to_rad
        d_lon = (to_lon - from_lon) * to_rad
        
        a = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c


class DXClusterService:
    """Service for connecting to DX clusters and parsing spots"""
    
    def __init__(self, host: str = "dxc.nc7j.com", port: int = 7373, callsign: str = "HAMCLOCK"):
        self.host = host
        self.port = port
        self.callsign = callsign
        self.spots: List[DXSpot] = []
        self.max_spots = 100
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.connected = False
        self._connection_task: Optional[asyncio.Task] = None
        self.ws_manager = None  # Will be set by main.py
        
        # Demo spots for development
        self._init_demo_spots()
        
    async def connect(self) -> bool:
        """Connect to DX cluster"""
        try:
            logger.info(f"Connecting to DX cluster {self.host}:{self.port}...")
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                timeout=10.0
            )
            
            # Wait for login prompt
            await asyncio.sleep(1)
            
            # Send callsign
            self.writer.write(f"{self.callsign}\n".encode())
            await self.writer.drain()
            
            # Read welcome messages
            for _ in range(5):
                try:
                    line = await asyncio.wait_for(self.reader.readline(), timeout=2.0)
                    logger.debug(f"DX Cluster: {line.decode('utf-8', errors='ignore').strip()}")
                except asyncio.TimeoutError:
                    break
            
            self.connected = True
            logger.info("Connected to DX cluster")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to DX cluster: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from DX cluster"""
        if self.writer:
            try:
                self.writer.write(b"bye\n")
                await self.writer.drain()
                self.writer.close()
                await self.writer.wait_closed()
            except Exception as e:
                logger.error(f"Error disconnecting: {e}")
        
        self.connected = False
        logger.info("Disconnected from DX cluster")
    
    def parse_spot(self, line: str) -> Optional[DXSpot]:
        """Parse a DX spot line"""
        try:
            # DX spot format: DX de SPOTTER:     FREQ CALLSIGN COMMENT                  TIME Z
            # Example: DX de W1AW:     14074.0  K1ABC        FT8                       1845Z
            
            # Pattern for standard DX spot
            pattern = r'DX de ([A-Z0-9/-]+):\s+(\d+\.\d+)\s+([A-Z0-9/-]+)\s+(.+?)\s+(\d{4})Z'
            match = re.search(pattern, line)
            
            if match:
                spotter = match.group(1).strip()
                frequency = float(match.group(2))
                callsign = match.group(3).strip()
                comment = match.group(4).strip()
                time_str = match.group(5)
                
                # Parse time (HHMM format)
                now = datetime.now(timezone.utc)
                hour = int(time_str[:2])
                minute = int(time_str[2:])
                spot_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                return DXSpot(callsign, frequency, spotter, comment, spot_time)
            
        except Exception as e:
            logger.debug(f"Failed to parse spot: {line.strip()} - {e}")
        
        return None
    
    async def read_spots(self):
        """Read spots continuously from cluster"""
        if not self.connected or not self.reader:
            return
        
        try:
            while self.connected:
                line = await asyncio.wait_for(self.reader.readline(), timeout=30.0)
                if not line:
                    logger.warning("Connection closed by server")
                    break
                
                decoded = line.decode('utf-8', errors='ignore').strip()
                
                # Parse spot
                spot = self.parse_spot(decoded)
                if spot:
                    self.spots.insert(0, spot)
                    # Keep only max_spots most recent
                    if len(self.spots) > self.max_spots:
                        self.spots = self.spots[:self.max_spots]
                    
                    logger.debug(f"New spot: {spot.callsign} on {spot.frequency}")
                    
                    # Broadcast to WebSocket clients if manager is available
                    if self.ws_manager:
                        try:
                            await self.ws_manager.broadcast({
                                "type": "dx_spot",
                                "data": spot.to_dict()
                            }, channel="dx_spots")
                        except Exception as e:
                            logger.debug(f"Error broadcasting spot: {e}")
                
        except asyncio.TimeoutError:
            logger.warning("Timeout reading from DX cluster")
        except Exception as e:
            logger.error(f"Error reading spots: {e}")
        finally:
            self.connected = False
    
    async def start(self):
        """Start the DX cluster connection and spot reader"""
        if await self.connect():
            self._connection_task = asyncio.create_task(self.read_spots())
    
    async def stop(self):
        """Stop the DX cluster connection"""
        if self._connection_task:
            self._connection_task.cancel()
            try:
                await self._connection_task
            except asyncio.CancelledError:
                pass
        
        await self.disconnect()
    
    def get_recent_spots(self, limit: int = 50, band: Optional[str] = None, 
                        observer_lat: Optional[float] = None, observer_lon: Optional[float] = None) -> List[Dict]:
        """Get recent DX spots with optional bearing/distance"""
        spots = self.spots[:limit]
        
        if band:
            spots = [s for s in spots if s.band == band]
        
        return [spot.to_dict(observer_lat, observer_lon) for spot in spots]
    
    def get_spot_count(self) -> int:
        """Get total number of spots"""
        return len(self.spots)
    
    def _init_demo_spots(self):
        """Initialize demo spots for development"""
        demo_callsigns = [
            # (callsign, frequency, spotter, comment, latitude, longitude)
            ('ZL2/G0MRF', 14074.5, 'G0MRF', 'FT8', -41.35, 174.87),  # New Zealand
            ('EA1/HB9CVQ', 14097.0, 'HB9CVQ', 'CW pileup', 40.45, -3.7),  # Spain
            ('KP2/N0UR', 7040.0, 'N0UR', '40m CW', 17.75, -64.8),  # US Virgin Islands
            ('VP2/K1LZ', 21285.0, 'K1LZ', 'PSK31', 17.2, -61.8),  # Antigua
            ('VK4RZA', 28400.0, 'VK4RZA', '10m SSB strong', -27.8, 151.2),  # Australia
            ('LU1/W1AW', 3510.0, 'W1AW', 'Beacon', -34.6, -58.4),  # Argentina
            ('SV1/G0DUX', 24950.0, 'G0DUX', '12m DX', 38.0, 23.7),  # Greece
            ('C6AKQ', 18130.0, 'C6AKQ', 'MFSK32', 25.1, -77.3),  # Bahamas
            ('N5BYW', 50200.0, 'N5BYW', '6m SSB', 30.7, -97.3),  # Texas
            ('ZE1JRC', 145400.0, 'ZE1JRC', '2m FM', -17.9, 25.9),  # Zimbabwe
        ]
        
        now = datetime.now(timezone.utc)
        for call, freq, spotter, comment, lat, lon in demo_callsigns:
            spot = DXSpot(call, freq, spotter, comment, now, latitude=lat, longitude=lon)
            self.spots.append(spot)


# Global instance
dxcluster_service = DXClusterService()
