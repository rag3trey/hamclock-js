"""
Maidenhead Grid Square Service
Converts lat/lng coordinates to Maidenhead grid square (QTH locator)

This service provides:
- Lat/lng to grid square conversion
- Grid square to lat/lng conversion
- Grid square distance calculation
- Grid square validation
"""

import math
from typing import Tuple, Optional


class MaidenheadService:
    """Service for Maidenhead grid square calculations"""
    
    def __init__(self):
        """Initialize the Maidenhead service"""
        pass
    
    @staticmethod
    def latlong_to_grid(latitude: float, longitude: float, precision: int = 6) -> str:
        """
        Convert latitude and longitude to Maidenhead grid square
        
        Args:
            latitude: Observer latitude (-90 to 90)
            longitude: Observer longitude (-180 to 180)
            precision: Grid square precision (2, 4, 6, or 8 characters)
                2: Field (e.g., "AB")
                4: Square (e.g., "AB12")
                6: Subsquare (e.g., "AB12CD")
                8: Extended (e.g., "AB12CD34")
        
        Returns:
            Maidenhead grid square string
        """
        if not -90 <= latitude <= 90:
            raise ValueError(f"Latitude must be between -90 and 90, got {latitude}")
        if not -180 <= longitude <= 180:
            raise ValueError(f"Longitude must be between -180 and 180, got {longitude}")
        if precision not in [2, 4, 6, 8]:
            raise ValueError(f"Precision must be 2, 4, 6, or 8, got {precision}")
        
        # Normalize coordinates
        lon = longitude + 180
        lat = latitude + 90
        
        grid = ""
        
        # Field (letters) - 20 degree squares
        grid += chr(ord('A') + int(lon / 20))
        grid += chr(ord('A') + int(lat / 10))
        
        if precision >= 4:
            # Square (numbers) - 2 degree squares
            grid += str(int((lon % 20) / 2))
            grid += str(int((lat % 10) / 1))
        
        if precision >= 6:
            # Subsquare (letters) - 5 minute squares
            grid += chr(ord('A') + int(((lon % 2) / 2) * 24))
            grid += chr(ord('A') + int(((lat % 1) / 1) * 24))
        
        if precision == 8:
            # Extended (numbers) - 2.5 second squares
            grid += str(int((((lon % 2) / 2 * 24) % 1) * 10))
            grid += str(int((((lat % 1) / 1 * 24) % 1) * 10))
        
        return grid
    
    @staticmethod
    def grid_to_latlong(grid: str) -> Tuple[float, float]:
        """
        Convert Maidenhead grid square to latitude and longitude
        Returns the center point of the grid square
        
        Args:
            grid: Maidenhead grid square string (2, 4, 6, or 8 characters)
        
        Returns:
            Tuple of (latitude, longitude) at center of grid square
        """
        grid = grid.upper()
        
        if len(grid) < 2 or len(grid) > 8 or len(grid) % 2 != 0:
            raise ValueError(f"Grid must be 2, 4, 6, or 8 characters, got {grid}")
        
        # Field (letters)
        if ord(grid[0]) < ord('A') or ord(grid[0]) > ord('X'):
            raise ValueError(f"Invalid field letter: {grid[0]}")
        if ord(grid[1]) < ord('A') or ord(grid[1]) > ord('R'):
            raise ValueError(f"Invalid field letter: {grid[1]}")
        
        lon = (ord(grid[0]) - ord('A')) * 20 - 180
        lat = (ord(grid[1]) - ord('A')) * 10 - 90
        
        if len(grid) >= 4:
            # Square (numbers)
            if not grid[2].isdigit() or not grid[3].isdigit():
                raise ValueError(f"Invalid square: {grid[2:4]}")
            
            lon += int(grid[2]) * 2
            lat += int(grid[3]) * 1
        
        if len(grid) >= 6:
            # Subsquare (letters)
            if ord(grid[4]) < ord('A') or ord(grid[4]) > ord('X'):
                raise ValueError(f"Invalid subsquare letter: {grid[4]}")
            if ord(grid[5]) < ord('A') or ord(grid[5]) > ord('X'):
                raise ValueError(f"Invalid subsquare letter: {grid[5]}")
            
            lon += (ord(grid[4]) - ord('A')) / 12.0
            lat += (ord(grid[5]) - ord('A')) / 24.0
        
        if len(grid) == 8:
            # Extended (numbers)
            if not grid[6].isdigit() or not grid[7].isdigit():
                raise ValueError(f"Invalid extended: {grid[6:8]}")
            
            lon += int(grid[6]) / 120.0
            lat += int(grid[7]) / 240.0
        
        # Return center of grid square
        if len(grid) == 2:
            lon += 10
            lat += 5
        elif len(grid) == 4:
            lon += 1
            lat += 0.5
        elif len(grid) == 6:
            lon += 1/24.0
            lat += 1/48.0
        elif len(grid) == 8:
            lon += 1/240.0
            lat += 1/480.0
        
        return (lat, lon)
    
    @staticmethod
    def grid_distance_azimuth(grid1: str, grid2: str) -> Tuple[float, float]:
        """
        Calculate distance and azimuth between two grid squares
        
        Args:
            grid1: First Maidenhead grid square
            grid2: Second Maidenhead grid square
        
        Returns:
            Tuple of (distance_km, azimuth_degrees)
        """
        lat1, lon1 = MaidenheadService.grid_to_latlong(grid1)
        lat2, lon2 = MaidenheadService.grid_to_latlong(grid2)
        
        return MaidenheadService._haversine_distance_azimuth(lat1, lon1, lat2, lon2)
    
    @staticmethod
    def _haversine_distance_azimuth(lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[float, float]:
        """
        Calculate distance and azimuth using Haversine formula
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
        
        Returns:
            Tuple of (distance_km, azimuth_degrees)
        """
        R = 6371.0  # Earth radius in km
        
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine distance
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        distance = R * c
        
        # Calculate bearing/azimuth
        x = math.sin(dlon) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(dlon)
        
        azimuth = math.atan2(x, y)
        azimuth = math.degrees(azimuth)
        azimuth = (azimuth + 360) % 360
        
        return (distance, azimuth)
    
    @staticmethod
    def is_valid_grid(grid: str) -> bool:
        """
        Check if a string is a valid Maidenhead grid square
        
        Args:
            grid: String to validate
        
        Returns:
            True if valid, False otherwise
        """
        try:
            grid = grid.upper()
            
            if len(grid) < 2 or len(grid) > 8 or len(grid) % 2 != 0:
                return False
            
            # Check field letters
            if ord(grid[0]) < ord('A') or ord(grid[0]) > ord('X'):
                return False
            if ord(grid[1]) < ord('A') or ord(grid[1]) > ord('R'):
                return False
            
            # Check square numbers
            if len(grid) >= 4:
                if not grid[2].isdigit() or not grid[3].isdigit():
                    return False
                if int(grid[2]) > 9 or int(grid[3]) > 9:
                    return False
            
            # Check subsquare letters
            if len(grid) >= 6:
                if ord(grid[4]) < ord('A') or ord(grid[4]) > ord('X'):
                    return False
                if ord(grid[5]) < ord('A') or ord(grid[5]) > ord('X'):
                    return False
            
            # Check extended numbers
            if len(grid) == 8:
                if not grid[6].isdigit() or not grid[7].isdigit():
                    return False
            
            return True
        except:
            return False


# Create singleton instance
maidenhead_service = MaidenheadService()
