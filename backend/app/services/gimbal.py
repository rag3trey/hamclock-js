"""
Gimbal/Antenna Tracking Service
Calculates azimuth and elevation for satellite tracking
Supports Yaesu and Alfa rotator control
"""

import math
from typing import Dict, Any, Optional, Tuple
from datetime import datetime


class GimbalService:
    """Service for calculating and controlling antenna pointing"""
    
    def __init__(self):
        self.tracking_enabled = False
        self.current_satellite = None
        self.current_azimuth = 0
        self.current_elevation = 0
        self.rotator_model = None
        self.rotator_port = None
        
    def calculate_azimuth_elevation(
        self,
        observer_lat: float,
        observer_lon: float,
        observer_alt: float,
        satellite_lat: float,
        satellite_lon: float,
        satellite_alt: float
    ) -> Tuple[float, float]:
        """
        Calculate azimuth and elevation from observer to satellite
        
        Args:
            observer_lat: Observer latitude in degrees
            observer_lon: Observer longitude in degrees
            observer_alt: Observer altitude in meters
            satellite_lat: Satellite latitude in degrees
            satellite_lon: Satellite longitude in degrees
            satellite_alt: Satellite altitude in km (above Earth)
        
        Returns:
            Tuple of (azimuth_degrees, elevation_degrees)
        """
        
        # Convert degrees to radians
        obs_lat_rad = math.radians(observer_lat)
        obs_lon_rad = math.radians(observer_lon)
        sat_lat_rad = math.radians(satellite_lat)
        sat_lon_rad = math.radians(satellite_lon)
        
        # Earth radius in km
        earth_radius = 6371.0
        observer_alt_km = observer_alt / 1000.0
        
        # Convert observer position to ECEF (Earth-Centered, Earth-Fixed)
        obs_x = (earth_radius + observer_alt_km) * math.cos(obs_lat_rad) * math.cos(obs_lon_rad)
        obs_y = (earth_radius + observer_alt_km) * math.cos(obs_lat_rad) * math.sin(obs_lon_rad)
        obs_z = (earth_radius + observer_alt_km) * math.sin(obs_lat_rad)
        
        # Convert satellite position to ECEF
        sat_x = (earth_radius + satellite_alt) * math.cos(sat_lat_rad) * math.cos(sat_lon_rad)
        sat_y = (earth_radius + satellite_alt) * math.cos(sat_lat_rad) * math.sin(sat_lon_rad)
        sat_z = (earth_radius + satellite_alt) * math.sin(sat_lat_rad)
        
        # Vector from observer to satellite
        dx = sat_x - obs_x
        dy = sat_y - obs_y
        dz = sat_z - obs_z
        
        # Distance to satellite
        distance = math.sqrt(dx**2 + dy**2 + dz**2)
        
        # South vector (pointing towards south at observer location)
        south_x = -math.sin(obs_lat_rad) * math.cos(obs_lon_rad)
        south_y = -math.sin(obs_lat_rad) * math.sin(obs_lon_rad)
        south_z = math.cos(obs_lat_rad)
        
        # East vector (pointing towards east at observer location)
        east_x = -math.sin(obs_lon_rad)
        east_y = math.cos(obs_lon_rad)
        east_z = 0
        
        # Zenith vector (pointing up at observer location)
        zenith_x = math.cos(obs_lat_rad) * math.cos(obs_lon_rad)
        zenith_y = math.cos(obs_lat_rad) * math.sin(obs_lon_rad)
        zenith_z = math.sin(obs_lat_rad)
        
        # Project satellite vector onto local horizontal plane
        dot_zenith = dx * zenith_x + dy * zenith_y + dz * zenith_z
        north_comp = (dx * south_x + dy * south_y + dz * south_z) / distance
        east_comp = (dx * east_x + dy * east_y + dz * east_z) / distance
        
        # Calculate elevation
        elevation_rad = math.asin(dot_zenith / distance)
        elevation = math.degrees(elevation_rad)
        
        # Calculate azimuth (0° = North, 90° = East, 180° = South, 270° = West)
        azimuth_rad = math.atan2(east_comp, north_comp)
        azimuth = math.degrees(azimuth_rad)
        
        # Normalize azimuth to 0-360
        if azimuth < 0:
            azimuth += 360
            
        return azimuth, elevation
    
    def is_visible(self, elevation: float, min_elevation: float = 0.0) -> bool:
        """Check if satellite is visible above minimum elevation"""
        return elevation >= min_elevation
    
    def get_next_pass_peak(
        self,
        observer_lat: float,
        observer_lon: float,
        observer_alt: float,
        satellite_passes: list
    ) -> Optional[Dict[str, Any]]:
        """
        Get the peak elevation point for next pass
        
        Args:
            satellite_passes: List of pass events from satellite service
        
        Returns:
            Dictionary with peak azimuth, elevation, and time
        """
        if not satellite_passes:
            return None
        
        # Find pass with highest max elevation
        best_pass = max(satellite_passes, key=lambda p: p.get('max_elevation', 0))
        return {
            'max_elevation': best_pass.get('max_elevation', 0),
            'max_azimuth': best_pass.get('max_azimuth', 0),
            'rise_time': best_pass.get('rise_time'),
            'culmination_time': best_pass.get('culmination_time'),
            'set_time': best_pass.get('set_time'),
        }
    
    def format_rotator_command(
        self,
        azimuth: float,
        elevation: float,
        rotator_type: str = "yaesu"
    ) -> str:
        """
        Format azimuth/elevation into rotator control command
        
        Args:
            azimuth: Azimuth in degrees (0-360)
            elevation: Elevation in degrees (-90 to +90)
            rotator_type: "yaesu" or "alfa"
        
        Returns:
            Command string to send to rotator
        """
        
        # Clamp values
        azimuth = max(0, min(360, azimuth))
        elevation = max(-90, min(90, elevation))
        
        if rotator_type.lower() == "yaesu":
            # Yaesu GS-232B format: AZ###.# EL##.#
            return f"AZ{azimuth:06.1f} EL{elevation:05.1f}\r"
        elif rotator_type.lower() == "alfa":
            # Alfa format: AZ=### EL=##
            return f"AZ={azimuth:03.0f} EL={elevation:02.0f}\r"
        else:
            # Generic format
            return f"AZ{azimuth:06.1f} EL{elevation:05.1f}\r"
    
    def start_tracking(
        self,
        satellite_name: str,
        observer_location: Dict[str, float],
        rotator_type: str = "yaesu"
    ) -> Dict[str, Any]:
        """Start tracking a satellite"""
        self.tracking_enabled = True
        self.current_satellite = satellite_name
        self.rotator_model = rotator_type
        
        return {
            "status": "tracking_started",
            "satellite": satellite_name,
            "rotator": rotator_type,
            "tracking": True
        }
    
    def stop_tracking(self) -> Dict[str, Any]:
        """Stop tracking"""
        self.tracking_enabled = False
        self.current_satellite = None
        
        return {
            "status": "tracking_stopped",
            "tracking": False
        }
    
    def get_tracking_status(self) -> Dict[str, Any]:
        """Get current tracking status"""
        return {
            "tracking": self.tracking_enabled,
            "satellite": self.current_satellite,
            "azimuth": self.current_azimuth,
            "elevation": self.current_elevation,
            "rotator": self.rotator_model,
            "visible": self.is_visible(self.current_elevation)
        }
    
    def calculate_satellite_direction(
        self,
        observer_lat: float,
        observer_lon: float,
        observer_alt: float,
        satellite_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate complete pointing data for a satellite
        
        Args:
            observer_lat/lon/alt: Observer position
            satellite_data: Satellite position and info from astro service
        
        Returns:
            Dictionary with azimuth, elevation, range, and visibility
        """
        
        try:
            sat_lat = satellite_data.get('latitude', 0)
            sat_lon = satellite_data.get('longitude', 0)
            sat_alt = satellite_data.get('altitude', 0)  # km
            
            azimuth, elevation = self.calculate_azimuth_elevation(
                observer_lat, observer_lon, observer_alt,
                sat_lat, sat_lon, sat_alt
            )
            
            self.current_azimuth = azimuth
            self.current_elevation = elevation
            
            range_km = satellite_data.get('range', 0)
            range_miles = range_km * 0.621371
            
            return {
                "satellite": satellite_data.get('name', 'Unknown'),
                "azimuth": round(azimuth, 1),
                "elevation": round(elevation, 1),
                "range_km": round(range_km, 1),
                "range_miles": round(range_miles, 1),
                "altitude_km": sat_alt,
                "latitude": sat_lat,
                "longitude": sat_lon,
                "visible": self.is_visible(elevation),
                "doppler_shift": satellite_data.get('doppler_shift', 0),
            }
            
        except Exception as e:
            print(f"Gimbal: Error calculating direction: {e}")
            return {
                "error": str(e),
                "azimuth": 0,
                "elevation": 0,
                "visible": False
            }


# Global gimbal service instance
gimbal_service = GimbalService()
