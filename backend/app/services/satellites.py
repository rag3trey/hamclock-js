"""
Satellite Tracking Service
Replaces P13.cpp and earthsat.cpp using Skyfield library

Provides satellite orbit propagation and pass predictions using SGP4/SDP4
"""

from skyfield.api import load, wgs84, EarthSatellite
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Tuple
import httpx
import asyncio
from ..config import settings


class SatelliteService:
    """
    Satellite tracking and pass prediction
    Replaces P13.cpp and earthsat.cpp functionality with Skyfield
    """
    
    def __init__(self):
        self.ts = load.timescale()
        self.satellites = {}
        self.tle_cache = {}
        self.last_tle_update = None
        # Initialize with demo satellites
        self._init_demo_satellites()
    
    def _init_demo_satellites(self):
        """Initialize with demo satellite data for development/testing"""
        # Demo TLE data for common satellites (valid as of 2024)
        demo_tles = {
            'ISS (ZARYA)': {
                'line1': '1 25544U 98067A   24030.50000000  .00016717  00000-0  29862-3 0  9005',
                'line2': '2 25544  51.6438 247.4627 0006703 130.5360 325.0288 15.54179828432190'
            },
            'HUBBLE SPACE TELESCOPE': {
                'line1': '1 20580U 90037B   24030.50000000  .00001234  00000-0  61234-4 0  9996',
                'line2': '2 20580  28.4698  69.3825 0002853 288.6532  71.4608 15.09601234999999'
            },
            'NOAA 18': {
                'line1': '1 28654U 05018A   24030.50000000  .00000123  00000-0  91234-4 0  9996',
                'line2': '2 28654  99.0090 125.3261 0014834 150.1234  28.5432 14.12527362999999'
            },
            'GOES 16': {
                'line1': '1 41866U 16071A   24030.50000000  .00000234  00000-0  10000-3 0  9998',
                'line2': '2 41866   0.0297  73.2856 0001298 250.1234 156.2346  1.00272000999999'
            },
            'NOAA 19': {
                'line1': '1 33591U 09005A   24030.50000000  .00000145  00000-0  11234-3 0  9995',
                'line2': '2 33591  99.0640  65.2349 0014862  51.1234 309.1234 14.12456872999999'
            }
        }
        
        for sat_name, tle_data in demo_tles.items():
            try:
                sat = EarthSatellite(tle_data['line1'], tle_data['line2'], sat_name, self.ts)
                self.satellites[sat_name] = {
                    'satellite': sat,
                    'tle': {
                        'name': sat_name,
                        'line1': tle_data['line1'],
                        'line2': tle_data['line2']
                    }
                }
            except Exception as e:
                print(f"Error loading demo satellite {sat_name}: {e}")
        
        print(f"✅ Demo satellites initialized: {len(self.satellites)} satellites")
        
    async def update_tles(self):
        """
        Fetch latest TLE data from CelesTrak
        Should be called periodically (daily recommended)
        """
        try:
            headers = {
                'User-Agent': 'HamClock-Ground-Station/1.0'
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    settings.CELESTRAK_TLE_URL, 
                    timeout=30.0,
                    headers=headers,
                    follow_redirects=True
                )
                response.raise_for_status()
                
                # Parse TLE data
                tle_lines = response.text.strip().split('\n')
                
                # Process TLEs (3 lines per satellite: name, line1, line2)
                i = 0
                satellites = {}
                
                while i < len(tle_lines) - 2:
                    name = tle_lines[i].strip()
                    line1 = tle_lines[i + 1].strip()
                    line2 = tle_lines[i + 2].strip()
                    
                    # Skip empty lines
                    if not name or not line1 or not line2:
                        i += 1
                        continue
                    
                    # Create EarthSatellite object
                    try:
                        sat = EarthSatellite(line1, line2, name, self.ts)
                        satellites[name] = {
                            'satellite': sat,
                            'tle': {
                                'name': name,
                                'line1': line1,
                                'line2': line2
                            }
                        }
                    except Exception as e:
                        print(f"Error parsing TLE for {name}: {e}")
                    
                    i += 3
                
                if satellites:
                    self.satellites = satellites
                    self.last_tle_update = datetime.now(timezone.utc)
                    print(f"✅ Updated TLEs for {len(satellites)} satellites")
                    return len(satellites)
                else:
                    print(f"⚠️  No satellites parsed from TLE data, using demo satellites")
                    self._init_demo_satellites()
                    return len(self.satellites)
                
        except Exception as e:
            print(f"❌ Error updating TLEs: {e}")
            print(f"⚠️  Using demo satellites instead")
            # Fall back to demo satellites if fetch fails
            self._init_demo_satellites()
            return len(self.satellites)
    
    def get_satellite(self, name: str) -> Optional[EarthSatellite]:
        """Get satellite by name"""
        sat_data = self.satellites.get(name)
        return sat_data['satellite'] if sat_data else None
    
    def list_satellites(self) -> List[Dict]:
        """List all available satellites"""
        return [
            {
                'name': name,
                'tle': data['tle']
            }
            for name, data in self.satellites.items()
        ]
    
    def get_satellite_position(
        self, 
        sat_name: str, 
        observer_lat: float, 
        observer_lng: float,
        dt: Optional[datetime] = None
    ) -> Dict:
        """
        Get current satellite position as seen from observer
        
        Args:
            sat_name: Satellite name
            observer_lat: Observer latitude in degrees
            observer_lng: Observer longitude in degrees
            dt: DateTime (UTC), defaults to now
            
        Returns:
            Dict with azimuth, elevation, distance, velocity, etc.
        """
        satellite = self.get_satellite(sat_name)
        if not satellite:
            raise ValueError(f"Satellite {sat_name} not found")
        
        if dt is None:
            dt = datetime.now(timezone.utc)
        
        # Observer location
        observer = wgs84.latlon(observer_lat, observer_lng)
        
        # Create time
        t = self.ts.from_datetime(dt)
        
        # Calculate topocentric position (relative to observer)
        difference = satellite - observer
        topocentric = difference.at(t)
        
        # Get altitude and azimuth
        alt, az, distance = topocentric.altaz()
        
        # Get geocentric position (lat, lng, altitude)
        geocentric = satellite.at(t)
        lat, lng = wgs84.latlon_of(geocentric)
        height = wgs84.height_of(geocentric)
        
        # Get velocity
        velocity = geocentric.velocity.km_per_s
        speed = (velocity[0]**2 + velocity[1]**2 + velocity[2]**2)**0.5
        
        return {
            'satellite': sat_name,
            'timestamp': dt.isoformat(),
            'observer': {
                'latitude': observer_lat,
                'longitude': observer_lng
            },
            'position': {
                'azimuth': az.degrees,
                'elevation': alt.degrees,
                'altitude': alt.degrees,
                'distance_km': distance.km,
                'range_km': distance.km,  # Alias
                'latitude': lat.degrees,
                'longitude': lng.degrees,
                'height_km': height.km
            },
            'velocity': {
                'speed_km_s': round(speed, 2)
            },
            'above_horizon': alt.degrees > 0
        }
    
    def calculate_passes(
        self,
        sat_name: str,
        observer_lat: float,
        observer_lng: float,
        hours: int = 24,
        min_elevation: float = 10.0
    ) -> List[Dict]:
        """
        Calculate satellite passes over observer location
        
        This is the main function replacing the complex C++ pass prediction code
        
        Args:
            sat_name: Satellite name
            observer_lat: Observer latitude
            observer_lng: Observer longitude
            hours: Hours to look ahead
            min_elevation: Minimum elevation in degrees
            
        Returns:
            List of passes, each with AOS, MAX, LOS times and data
        """
        satellite = self.get_satellite(sat_name)
        if not satellite:
            raise ValueError(f"Satellite {sat_name} not found")
        
        # Observer location
        observer = wgs84.latlon(observer_lat, observer_lng)
        
        # Time range
        t0 = self.ts.now()
        t1 = self.ts.utc(
            t0.utc.year, 
            t0.utc.month, 
            t0.utc.day, 
            t0.utc.hour + hours
        )
        
        # Find events (rise, culminate, set)
        times, events = satellite.find_events(
            observer, 
            t0, 
            t1, 
            altitude_degrees=min_elevation
        )
        
        # Group events into passes
        passes = []
        current_pass = None
        
        for ti, event in zip(times, events):
            dt = ti.utc_datetime()
            
            # Calculate position at this time
            difference = satellite - observer
            topocentric = difference.at(ti)
            alt, az, distance = topocentric.altaz()
            
            event_type = ['AOS', 'MAX', 'LOS'][event]
            
            event_data = {
                'time': dt.isoformat(),
                'event': event_type,
                'elevation': alt.degrees,
                'azimuth': az.degrees,
                'distance_km': distance.km
            }
            
            if event_type == 'AOS':
                # Start of new pass
                current_pass = {
                    'aos': event_data,
                    'max': None,
                    'los': None,
                    'duration_minutes': None,
                    'max_elevation': None
                }
            elif event_type == 'MAX':
                if current_pass:
                    current_pass['max'] = event_data
                    current_pass['max_elevation'] = alt.degrees
            elif event_type == 'LOS':
                if current_pass:
                    current_pass['los'] = event_data
                    
                    # Calculate duration
                    aos_time = datetime.fromisoformat(current_pass['aos']['time'])
                    los_time = datetime.fromisoformat(current_pass['los']['time'])
                    duration = (los_time - aos_time).total_seconds() / 60
                    current_pass['duration_minutes'] = round(duration, 1)
                    
                    passes.append(current_pass)
                    current_pass = None
        
        return passes
    
    def calculate_orbit_track(
        self,
        sat_name: str,
        dt: Optional[datetime] = None,
        duration_minutes: int = 90,
        num_points: int = 100
    ) -> List[Dict]:
        """
        Calculate satellite ground track (for map overlay)
        
        Args:
            sat_name: Satellite name
            dt: Start time (UTC)
            duration_minutes: Track duration
            num_points: Number of points in track
            
        Returns:
            List of lat/lng points
        """
        satellite = self.get_satellite(sat_name)
        if not satellite:
            raise ValueError(f"Satellite {sat_name} not found")
        
        if dt is None:
            dt = datetime.now(timezone.utc)
        
        # Create time array
        start_time = self.ts.from_datetime(dt)
        end_time = self.ts.from_datetime(dt + timedelta(minutes=duration_minutes))
        
        times = self.ts.linspace(start_time, end_time, num_points)
        
        # Calculate positions
        track = []
        geocentric = satellite.at(times)
        
        for i, t in enumerate(times):
            pos = geocentric[i]
            lat, lng = wgs84.latlon_of(pos)
            height = wgs84.height_of(pos)
            
            track.append({
                'time': t.utc_datetime().isoformat(),
                'latitude': lat.degrees,
                'longitude': lng.degrees,
                'altitude_km': height.km
            })
        
        return track
    
    def get_next_pass(
        self,
        sat_name: str,
        observer_lat: float,
        observer_lng: float,
        min_elevation: float = 10.0
    ) -> Optional[Dict]:
        """Get the next pass for a satellite"""
        passes = self.calculate_passes(
            sat_name,
            observer_lat,
            observer_lng,
            hours=48,
            min_elevation=min_elevation
        )
        
        return passes[0] if passes else None
    
    def is_satellite_visible(
        self,
        sat_name: str,
        observer_lat: float,
        observer_lng: float,
        dt: Optional[datetime] = None
    ) -> bool:
        """Check if satellite is currently above horizon"""
        pos = self.get_satellite_position(sat_name, observer_lat, observer_lng, dt)
        return pos['position']['elevation'] > 0
