"""
Astronomy Service
Replaces astro.cpp from original HamClock using Skyfield library

This module provides high-precision astronomical calculations including:
- Sun position (azimuth, elevation, declination)
- Moon position and phase
- Sunrise/sunset times
- Moonrise/moonset times
- Solar and lunar data
"""

from skyfield.api import load, wgs84, N, S, E, W
from skyfield import almanac
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, List, Optional
import math
import numpy as np


class AstronomyService:
    """
    High-precision astronomy calculations using Skyfield
    Replaces the C++ astro.cpp functionality
    """
    
    def __init__(self):
        self.ts = load.timescale()
        self.planets = None
        self.earth = None
        self.sun = None
        self.moon = None
        
    async def initialize(self):
        """Initialize ephemeris data (downloads ~20MB on first run, then cached)"""
        try:
            # Load DE421 ephemeris (2000-2053)
            # Try to load from current directory first, then let skyfield handle it
            try:
                self.planets = load('de421.bsp')
            except Exception as e1:
                print(f"⚠️  Could not load de421.bsp from disk: {e1}")
                print("⚠️  Attempting to download ephemeris (this may take a moment)...")
                self.planets = load('de421.bsp')  # Will download if needed
            
            self.earth = self.planets['earth']
            self.sun = self.planets['sun']
            self.moon = self.planets['moon']
            print("✅ Astronomy ephemeris loaded successfully")
        except Exception as e:
            print(f"❌ CRITICAL: Could not load astronomy ephemeris: {e}")
            print("This is a fatal error - astronomy calculations will not work")
            raise
    
    def get_sun_position(self, lat: float, lng: float, dt: Optional[datetime] = None) -> Dict:
        """
        Calculate sun position (replaces C++ getSolarPosition)
        
        Args:
            lat: Latitude in degrees
            lng: Longitude in degrees
            dt: DateTime (UTC), defaults to now
            
        Returns:
            Dict with azimuth, altitude, declination, right_ascension, distance
        """
        if self.earth is None or self.sun is None:
            raise RuntimeError("Astronomy service not initialized. Call initialize() first.")
        
        if dt is None:
            dt = datetime.now(timezone.utc)
        
        # Create observer location
        location = self.earth + wgs84.latlon(lat, lng)
        
        # Create time
        t = self.ts.from_datetime(dt)
        
        # Observe the sun from location
        astrometric = location.at(t).observe(self.sun)
        apparent = astrometric.apparent()
        
        # Get altitude and azimuth
        alt, az, distance = apparent.altaz()
        
        # Get RA and Dec
        ra, dec, distance = apparent.radec()
        
        return {
            'azimuth': az.degrees,
            'altitude': alt.degrees,
            'elevation': alt.degrees,  # Alias
            'declination': dec.degrees,
            'right_ascension': ra.hours,
            'distance_au': distance.au,
            'timestamp': dt.isoformat()
        }
    
    def get_sun_rise_set(self, lat: float, lng: float, date: Optional[datetime] = None) -> Dict:
        """
        Calculate sunrise and sunset times (replaces C++ getSolarRS)
        
        Args:
            lat: Latitude in degrees
            lng: Longitude in degrees  
            date: Date to calculate for (UTC), defaults to today
            
        Retself.earth is None or self.sun is None or self.planets is None:
            raise RuntimeError("Astronomy service not initialized. Call initialize() first.")
        
        if urns:
            Dict with sunrise, sunset, solar_noon times
        """
        if date is None:
            date = datetime.now(timezone.utc)
        
        # Create observer location
        location = wgs84.latlon(lat, lng)
        
        # Define time range (full day)
        t0 = self.ts.from_datetime(date.replace(hour=0, minute=0, second=0, microsecond=0))
        t1 = self.ts.from_datetime(date.replace(hour=23, minute=59, second=59, microsecond=999999))
        
        # Find sunrise and sunset
        f = almanac.sunrise_sunset(self.planets, location)
        times, events = almanac.find_discrete(t0, t1, f)
        
        result = {
            'date': date.date().isoformat(),
            'latitude': lat,
            'longitude': lng,
            'sunrise': None,
            'sunset': None,
            'solar_noon': None,
            'day_length_hours': None
        }
        
        sunrise_time = None
        sunset_time = None
        
        for ti, event in zip(times, events):
            dt = ti.utc_datetime()
            if event:  # Sunrise
                result['sunrise'] = dt.isoformat()
                sunrise_time = dt
            else:  # Sunset
                result['sunset'] = dt.isoformat()
                sunset_time = dt
        
        # Calculate solar noon (midpoint)
        if sunrise_time and sunset_time:
            solar_noon = sunrise_time + (sunset_time - sunrise_time) / 2
            result['solar_noon'] = solar_noon.isoformat()
            
            # Day length
            day_length = (sunset_time - sunrise_time).total_seconds() / 3600
            result['day_length_hours'] = round(day_length, 2)
        
        return result
    
    def get_moon_position(self, lat: float, lng: float, dt: Optional[datetime] = None) -> Dict:
        """
        Calculate moon position (replaces C++ getLunarPosition)
        
        Args:
            lat: Latitude in degrees
            lng: Longitude in degrees
            dt: DateTime (UTC), defaults to now
            
        Retself.earth is None or self.moon is None:
            raise RuntimeError("Astronomy service not initialized. Call initialize() first.")
        
        if urns:
            Dict with azimuth, altitude, phase, illumination
        """
        if dt is None:
            dt = datetime.now(timezone.utc)
        
        # Create observer location
        location = self.earth + wgs84.latlon(lat, lng)
        
        # Create time
        t = self.ts.from_datetime(dt)
        
        # Observe the moon
        astrometric = location.at(t).observe(self.moon)
        apparent = astrometric.apparent()
        
        # Get altitude and azimuth
        alt, az, distance = apparent.altaz()
        
        # Get RA and Dec
        ra, dec, distance = apparent.radec()
        
        # Calculate phase
        phase_angle = self._calculate_moon_phase(t)
        illumination = (1 + math.cos(math.radians(phase_angle))) / 2 * 100
        
        return {
            'azimuth': az.degrees,
            'altitude': alt.degrees,
            'elevation': alt.degrees,
            'declination': dec.degrees,
            'right_ascension': ra.hours,
            'distance_km': distance.km,
            'phase_angle': phase_angle,
            'illumination_percent': round(illumination, 1),
            'timestamp': dt.isoformat()
        }
    
    def get_moon_rise_set(self, lat: float, lng: float, date: Optional[datetime] = None) -> Dict:
        """
        Calculate moonrise and moonset times (replaces C++ getLunarRS)
        
        Args:
            lat: Latitude in degrees
            lng: Longitude in degrees
            date: Date to calculate for (UTC), defaults to today
            
        Returns:
            Dict with moonrise, moonset times
        """
        if date is None:
            date = datetime.now(timezone.utc)
        
        # Create observer location
        location = wgs84.latlon(lat, lng)
        
        # Define time range
        t0 = self.ts.from_datetime(date.replace(hour=0, minute=0, second=0, microsecond=0))
        t1 = self.ts.from_datetime(date.replace(hour=23, minute=59, second=59, microsecond=999999))
        
        # Find moonrise and moonset
        f = almanac.risings_and_settings(self.planets, self.moon, location)
        times, events = almanac.find_discrete(t0, t1, f)
        
        result = {
            'date': date.date().isoformat(),
            'latitude': lat,
            'longitude': lng,
            'moonrise': None,
            'moonset': None
        }
        
        for ti, event in zip(times, events):
            dt = ti.utc_datetime()
            if event:  # Moonrise
                result['moonrise'] = dt.isoformat()
            else:  # Moonset
                result['moonset'] = dt.isoformat()
        
        return result
    
    def _calculate_moon_phase(self, t) -> float:
        """
        Calculate moon phase angle in degrees
        0° = New Moon
        90° = First Quarter
        180° = Full Moon
        270° = Last Quarter
        """
        # Get positions
        sun_pos = self.earth.at(t).observe(self.sun).apparent()
        moon_pos = self.earth.at(t).observe(self.moon).apparent()
        
        # Get elongation (angle between sun and moon as seen from Earth)
        elongation = sun_pos.separation_from(moon_pos).degrees
        
        return elongation
    
    def get_moon_phase_name(self, phase_angle: float) -> str:
        """Get moon phase name from angle"""
        if phase_angle < 22.5 or phase_angle > 337.5:
            return "New Moon"
        elif phase_angle < 67.5:
            return "Waxing Crescent"
        elif phase_angle < 112.5:
            return "First Quarter"
        elif phase_angle < 157.5:
            return "Waxing Gibbous"
        elif phase_angle < 202.5:
            return "Full Moon"
        elif phase_angle < 247.5:
            return "Waning Gibbous"
        elif phase_angle < 292.5:
            return "Last Quarter"
        else:
            return "Waning Crescent"
    
    def calculate_twilight_times(self, lat: float, lng: float, date: Optional[datetime] = None) -> Dict:
        """
        Calculate civil, nautical, and astronomical twilight times
        
        Args:
            lat: Latitude in degrees
            lng: Longitude in degrees
            date: Date to calculate for (UTC)
            
        Returns:
            Dict with twilight times
        """
        if date is None:
            date = datetime.now(timezone.utc)
        
        location = wgs84.latlon(lat, lng)
        
        t0 = self.ts.from_datetime(date.replace(hour=0, minute=0, second=0))
        t1 = self.ts.from_datetime(date.replace(hour=23, minute=59, second=59))
        
        result = {
            'date': date.date().isoformat(),
            'civil_dawn': None,
            'nautical_dawn': None,
            'astronomical_dawn': None,
            'civil_dusk': None,
            'nautical_dusk': None,
            'astronomical_dusk': None
        }
        
        # Civil twilight (sun 6° below horizon)
        f = almanac.dark_twilight_day(self.planets, location)
        times, events = almanac.find_discrete(t0, t1, f)
        
        # Parse twilight events
        # This is simplified - full implementation would parse all twilight types
        
        return result
    
    def get_day_night_terminator(self, dt: Optional[datetime] = None, num_points: int = 360) -> List[Tuple[float, float]]:
        """self.earth is None or self.sun is None:
            raise RuntimeError("Astronomy service not initialized. Call initialize() first.")
        
        if 
        Calculate day/night terminator line (for map overlay)
        Returns list of (lat, lng) points defining the terminator
        
        This replaces the C++ grayline.cpp functionality
        """
        if dt is None:
            dt = datetime.now(timezone.utc)
        
        t = self.ts.from_datetime(dt)
        
        terminator_points = []
        
        for lng in np.linspace(-180, 180, num_points):
            # Binary search for latitude where sun altitude = 0
            lat_min, lat_max = -90.0, 90.0
            
            for _ in range(20):  # 20 iterations gives ~0.0001° precision
                lat = (lat_min + lat_max) / 2
                location = self.earth + wgs84.latlon(lat, lng)
                
                astrometric = location.at(t).observe(self.sun)
                alt, az, distance = astrometric.apparent().altaz()
                
                if alt.degrees > 0:
                    lat_max = lat
                else:
                    lat_min = lat
            
            terminator_points.append((lat, lng))
        
        return terminator_points
