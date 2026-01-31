"""PSK Reporter service for tracking digital mode activity."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, asdict
import random
import math

logger = logging.getLogger(__name__)


@dataclass
class Spot:
    """Represents a PSK Reporter spot."""
    reporter_call: str
    reporter_lat: float
    reporter_lng: float
    reporter_loc: str
    rx_call: str
    rx_lat: float
    rx_lng: float
    rx_loc: str
    tx_call: str
    tx_lat: float
    tx_lng: float
    tx_loc: str
    frequency: float
    mode: str  # PSK31, RTTY, JT65, FT8, etc.
    snr: float
    time_received: datetime
    distance_km: float


class PSKReporterService:
    """Service for PSK Reporter digital mode activity."""
    
    def __init__(self):
        self._demo_spots = self._init_demo_spots()
        self._last_update = datetime.utcnow()
    
    def _init_demo_spots(self) -> list[dict]:
        """Initialize demo PSK Reporter spots for development."""
        demo_data = [
            # PSK31 3.5 MHz activity
            {"reporter": "W1ABC", "reporter_lat": 42.3, "reporter_lng": -71.0, "reporter_loc": "Boston, MA",
             "rx": "M0XYZ", "rx_lat": 51.5, "rx_lng": -0.1, "rx_loc": "London, UK",
             "tx": "G4XYZ", "tx_lat": 51.4, "tx_lng": -0.5, "tx_loc": "South England",
             "freq": 3.580, "mode": "PSK31", "snr": 12},
            
            # PSK31 7 MHz activity
            {"reporter": "W5XYZ", "reporter_lat": 32.7, "reporter_lng": -96.8, "reporter_loc": "Dallas, TX",
             "rx": "VE3ABC", "rx_lat": 43.7, "rx_lng": -79.4, "rx_loc": "Toronto, ON",
             "tx": "N0XYZ", "tx_lat": 39.7, "tx_lng": -104.9, "tx_loc": "Denver, CO",
             "freq": 7.035, "mode": "PSK31", "snr": 8},
            
            # FT8 7 MHz activity
            {"reporter": "K4ABC", "reporter_lat": 34.0, "reporter_lng": -81.0, "reporter_loc": "Columbia, SC",
             "rx": "WB2XYZ", "rx_lat": 40.7, "rx_lng": -74.0, "rx_loc": "New York, NY",
             "tx": "K1XYZ", "tx_lat": 42.3, "tx_lng": -71.0, "tx_loc": "Boston, MA",
             "freq": 7.074, "mode": "FT8", "snr": -5},
            
            # RTTY 14 MHz activity
            {"reporter": "N0XYZ", "reporter_lat": 39.7, "reporter_lng": -104.9, "reporter_loc": "Denver, CO",
             "rx": "W9YYY", "rx_lat": 41.9, "rx_lng": -87.6, "rx_loc": "Chicago, IL",
             "tx": "J6ABC", "tx_lat": 17.9, "tx_lng": -64.7, "tx_loc": "US Virgin Islands",
             "freq": 14.085, "mode": "RTTY", "snr": 6},
            
            # PSK31 14 MHz activity
            {"reporter": "G4XYZ", "reporter_lat": 51.4, "reporter_lng": -0.5, "reporter_loc": "South England",
             "rx": "VK4XYZ", "rx_lat": -27.5, "rx_lng": 152.9, "rx_loc": "Brisbane, AU",
             "tx": "ZL1ABC", "tx_lat": -37.8, "tx_lng": 175.3, "tx_loc": "Auckland, NZ",
             "freq": 14.070, "mode": "PSK31", "snr": 15},
            
            # JT65 10 MHz activity
            {"reporter": "W0XYZ", "reporter_lat": 40.8, "reporter_lng": -96.7, "reporter_loc": "Omaha, NE",
             "rx": "JA1ABC", "rx_lat": 35.7, "rx_lng": 139.7, "rx_loc": "Tokyo, JA",
             "tx": "VK6ABC", "tx_lat": -32.0, "tx_lng": 115.9, "tx_loc": "Perth, AU",
             "freq": 10.138, "mode": "JT65", "snr": -8},
            
            # FT8 14 MHz activity (East Coast)
            {"reporter": "W2ABC", "reporter_lat": 40.7, "reporter_lng": -74.0, "reporter_loc": "New York, NY",
             "rx": "ZS6XYZ", "rx_lat": -26.0, "rx_lng": 28.0, "rx_loc": "South Africa",
             "tx": "PZ5ABC", "tx_lat": 6.0, "tx_lng": -58.0, "tx_loc": "Paramaribo, SR",
             "freq": 14.074, "mode": "FT8", "snr": -2},
            
            # PSK31 21 MHz activity
            {"reporter": "VE2XYZ", "reporter_lat": 45.5, "reporter_lng": -73.6, "reporter_loc": "Montreal, QC",
             "rx": "HK3ABC", "rx_lat": 5.5, "rx_lng": -73.0, "rx_loc": "Bogota, CO",
             "tx": "PY5ABC", "tx_lat": -23.5, "tx_lng": -46.6, "tx_loc": "São Paulo, BR",
             "freq": 21.070, "mode": "PSK31", "snr": 11},
            
            # FT8 21 MHz activity
            {"reporter": "N7XYZ", "reporter_lat": 47.6, "reporter_lng": -122.3, "reporter_loc": "Seattle, WA",
             "rx": "KH6ABC", "rx_lat": 21.3, "rx_lng": -157.8, "rx_loc": "Honolulu, HI",
             "tx": "XE3ABC", "tx_lat": 25.7, "tx_lng": -100.3, "tx_loc": "Monterrey, MX",
             "freq": 21.074, "mode": "FT8", "snr": 0},
            
            # RTTY 21 MHz activity
            {"reporter": "W4ABC", "reporter_lat": 36.2, "reporter_lng": -81.6, "reporter_loc": "Charlotte, NC",
             "rx": "LU1ABC", "rx_lat": -34.8, "rx_lng": -58.3, "rx_loc": "Buenos Aires, AR",
             "tx": "EA1ABC", "tx_lat": 40.4, "tx_lng": -3.7, "tx_loc": "Madrid, ES",
             "freq": 21.085, "mode": "RTTY", "snr": 7},
        ]
        
        spots = []
        now = datetime.utcnow()
        
        for data in demo_data:
            # Calculate distance
            lat1, lon1 = math.radians(data["reporter_lat"]), math.radians(data["reporter_lng"])
            lat2, lon2 = math.radians(data["tx_lat"]), math.radians(data["tx_lng"])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            distance = 6371 * c  # Earth radius in km
            
            # Add some randomness to time (within last 10 minutes)
            time_offset = random.randint(0, 600)
            time_received = now - timedelta(seconds=time_offset)
            
            # Add slight noise to SNR
            snr = data["snr"] + random.uniform(-2, 2)
            
            spot = Spot(
                reporter_call=data["reporter"],
                reporter_lat=data["reporter_lat"],
                reporter_lng=data["reporter_lng"],
                reporter_loc=data["reporter_loc"],
                rx_call=data["rx"],
                rx_lat=data["rx_lat"],
                rx_lng=data["rx_lng"],
                rx_loc=data["rx_loc"],
                tx_call=data["tx"],
                tx_lat=data["tx_lat"],
                tx_lng=data["tx_lng"],
                tx_loc=data["tx_loc"],
                frequency=data["freq"],
                mode=data["mode"],
                snr=snr,
                time_received=time_received,
                distance_km=distance
            )
            spots.append(asdict(spot))
        
        return spots
    
    def get_all_spots(self, limit: int = 50) -> list[dict]:
        """Get all recent PSK Reporter spots."""
        # In demo, return all spots; could be limited to recent time window
        return self._demo_spots[:limit]
    
    def get_spots_by_frequency(self, min_freq: float, max_freq: float) -> list[dict]:
        """Get spots within frequency range."""
        return [s for s in self._demo_spots if min_freq <= s["frequency"] <= max_freq]
    
    def get_spots_by_mode(self, mode: str) -> list[dict]:
        """Get spots for specific mode (PSK31, FT8, RTTY, JT65, etc.)."""
        return [s for s in self._demo_spots if s["mode"].upper() == mode.upper()]
    
    def get_active_bands(self) -> dict:
        """Get activity summary by band."""
        bands = {
            "160m": {"min": 1.8, "max": 2.0},
            "80m": {"min": 3.5, "max": 4.0},
            "40m": {"min": 7.0, "max": 7.3},
            "30m": {"min": 10.1, "max": 10.15},
            "20m": {"min": 14.0, "max": 14.35},
            "17m": {"min": 18.068, "max": 18.168},
            "15m": {"min": 21.0, "max": 21.45},
            "12m": {"min": 24.89, "max": 24.99},
            "10m": {"min": 28.0, "max": 29.7},
        }
        
        activity = {}
        for band, freq_range in bands.items():
            spots = self.get_spots_by_frequency(freq_range["min"], freq_range["max"])
            if spots:
                modes = {}
                for spot in spots:
                    mode = spot["mode"]
                    modes[mode] = modes.get(mode, 0) + 1
                
                activity[band] = {
                    "spot_count": len(spots),
                    "modes": modes,
                    "frequency": freq_range["min"]
                }
        
        return activity
    
    def get_spots_near_user(self, user_lat: float, user_lng: float, radius_km: float = 5000) -> list[dict]:
        """Get spots from reporters near the user's location."""
        nearby = []
        for spot in self._demo_spots:
            reporter_lat, reporter_lng = spot["reporter_lat"], spot["reporter_lng"]
            lat1 = math.radians(user_lat)
            lon1 = math.radians(user_lng)
            lat2 = math.radians(reporter_lat)
            lon2 = math.radians(reporter_lng)
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            distance = 6371 * c
            
            if distance <= radius_km:
                nearby.append(spot)
        
        # Sort by distance
        nearby.sort(key=lambda x: x["distance_km"])
        return nearby
    
    def get_activity_summary(self, user_lat: Optional[float] = None, user_lng: Optional[float] = None) -> dict:
        """Get overall activity summary."""
        active_bands = self.get_active_bands()
        total_spots = len(self._demo_spots)
        
        modes = {}
        for spot in self._demo_spots:
            mode = spot["mode"]
            modes[mode] = modes.get(mode, 0) + 1
        
        return {
            "total_spots": total_spots,
            "active_bands": active_bands,
            "modes": modes,
            "last_update": self._last_update.isoformat(),
            "top_modes": sorted(modes.items(), key=lambda x: x[1], reverse=True)[:3]
        }
