"""NCDXF Beacon Service - International 14 MHz beacons"""
from datetime import datetime, timezone
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class Beacon:
    """Represents an NCDXF beacon"""
    
    def __init__(self, call: str, frequency: float, location: str, lat: float, lng: float, power: str = "100W"):
        self.call = call
        self.frequency = frequency
        self.location = location
        self.latitude = lat
        self.longitude = lng
        self.power = power
        self.status = "unknown"  # heard, not_heard, active
        self.last_heard = None
        self.signal_strength = 0  # 0-5 S units
    
    def to_dict(self) -> Dict:
        return {
            'call': self.call,
            'frequency': self.frequency,
            'location': self.location,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'power': self.power,
            'status': self.status,
            'last_heard': self.last_heard.isoformat() if self.last_heard else None,
            'signal_strength': self.signal_strength
        }


class NCDXFBeaconService:
    """Service for NCDXF beacon monitoring"""
    
    # NCDXF Beacons - 14.100 MHz (primary frequency)
    # Transmit in sequence, 10 seconds each, 10 seconds rest
    BEACONS = [
        Beacon('4U1UN', 14100.0, 'New York', 40.7128, -74.0060),
        Beacon('VE3RN', 14100.0, 'Ottawa, Canada', 45.4215, -75.6972),
        Beacon('W6WX', 14100.0, 'California', 37.7749, -122.4194),
        Beacon('KH6RS', 14100.0, 'Hawaii', 19.7433, -155.5006),
        Beacon('ZL6B', 14100.0, 'New Zealand', -41.2865, 174.8860),
        Beacon('VK6RBP', 14100.0, 'Australia', -31.9505, 115.8605),
        Beacon('JA2IGY', 14100.0, 'Japan', 35.6762, 139.6503),
        Beacon('RZ3A', 14100.0, 'Russia', 55.7558, 37.6173),
        Beacon('OE3XFR', 14100.0, 'Austria', 48.2082, 16.3738),
        Beacon('W5WJ', 14100.0, 'Texas', 30.2672, -97.7431),
    ]
    
    def __init__(self):
        self.beacons = {b.call: b for b in self.BEACONS}
        self.last_update = datetime.now(timezone.utc)
    
    def get_all_beacons(self) -> List[Dict]:
        """Get all beacons"""
        return [beacon.to_dict() for beacon in self.BEACONS]
    
    def get_active_beacons(self, time: datetime = None) -> List[Dict]:
        """Get currently active beacon based on time slot
        
        Beacons transmit in sequence:
        0-10s: 4U1UN
        10-20s: VE3RN
        20-30s: W6WX
        etc.
        """
        if time is None:
            time = datetime.now(timezone.utc)
        
        # Calculate which beacon should be transmitting
        minute = time.minute
        second = time.second
        total_seconds = minute * 60 + second
        
        # Each beacon gets 10 seconds, rest 10 seconds (20 sec cycle)
        cycle_position = total_seconds % (len(self.BEACONS) * 20)
        active_index = cycle_position // 20
        
        if active_index < len(self.BEACONS):
            beacon = self.BEACONS[active_index]
            beacon.status = "active"
            beacon.signal_strength = 5  # Strong signal
            beacon.last_heard = time
            return [beacon.to_dict()]
        
        return []
    
    def simulate_heard_beacons(self, latitude: float, longitude: float, 
                               solar_flux: float = 150, k_index: int = 2) -> List[Dict]:
        """Simulate which beacons would be heard from a location
        
        Uses simple distance-based propagation model:
        - Closer beacons more likely to be heard
        - Solar flux affects long-path propagation
        - K-index affects propagation quality
        """
        heard = []
        
        # Calculate distance to each beacon
        for beacon in self.BEACONS:
            # Simple distance calculation (not great circle, but close enough)
            distance = ((beacon.latitude - latitude) ** 2 + 
                       (beacon.longitude - longitude) ** 2) ** 0.5
            
            # Normalize distance (rough estimate)
            # Less than 30 degrees = likely heard
            # Between 30-90 degrees = maybe heard (depends on solar flux)
            # More than 90 degrees = unlikely
            
            if distance < 30:
                # Close beacon - always heard
                beacon.status = "heard"
                beacon.signal_strength = max(3, 5 - (distance / 10))
            elif distance < 90:
                # Mid-range - depends on solar flux
                if solar_flux > 150:
                    beacon.status = "heard"
                    beacon.signal_strength = max(1, 4 - (distance / 30))
                else:
                    beacon.status = "maybe"
                    beacon.signal_strength = max(0, 3 - (distance / 40))
            else:
                # Far beacon - long path if conditions good
                if solar_flux > 180 and k_index < 4:
                    beacon.status = "heard"
                    beacon.signal_strength = 1
                else:
                    beacon.status = "not_heard"
                    beacon.signal_strength = 0
            
            # Degrade signal if geomagnetic activity high
            if k_index > 5:
                beacon.signal_strength = max(0, beacon.signal_strength - 1)
            
            heard.append(beacon.to_dict())
        
        return heard
    
    def get_beacon_status_summary(self, latitude: float, longitude: float,
                                  solar_flux: float = 150, k_index: int = 2) -> Dict:
        """Get summary of beacon propagation"""
        beacons = self.simulate_heard_beacons(latitude, longitude, solar_flux, k_index)
        
        heard_count = len([b for b in beacons if b['status'] == 'heard'])
        maybe_count = len([b for b in beacons if b['status'] == 'maybe'])
        
        if heard_count >= 8:
            propagation = "Excellent"
        elif heard_count >= 6:
            propagation = "Good"
        elif heard_count >= 4:
            propagation = "Fair"
        else:
            propagation = "Poor"
        
        return {
            'beacons': beacons,
            'heard_count': heard_count,
            'maybe_count': maybe_count,
            'propagation_quality': propagation,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }


# Global instance
ncdxf_service = NCDXFBeaconService()
