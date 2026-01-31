"""Band Conditions Service - HF propagation forecasts"""
from datetime import datetime, timezone
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class BandCondition:
    """Represents propagation conditions for a single band"""
    
    def __init__(self, band: str, frequency: float):
        self.band = band
        self.frequency = frequency
        self.condition = "fair"
        self.noise_level = 0
        self.activity = 0
        self.open_regions: List[str] = []
        self.recommendation = "Check VOACAP"
    
    def to_dict(self) -> Dict:
        return {
            'band': self.band,
            'frequency': self.frequency,
            'condition': self.condition,
            'noise_level': self.noise_level,
            'activity': self.activity,
            'open_regions': self.open_regions,
            'recommendation': self.recommendation
        }


class BandConditionsService:
    """Service for calculating HF band propagation conditions"""
    
    # Band definitions (name, frequency in MHz)
    BANDS = [
        ("160m", 1.8),
        ("80m", 3.5),
        ("60m", 5.3),
        ("40m", 7.0),
        ("30m", 10.1),
        ("20m", 14.0),
        ("17m", 18.1),
        ("15m", 21.0),
        ("12m", 24.9),
        ("10m", 28.0),
        ("6m", 50.0),
        ("2m", 144.0),
    ]
    
    def __init__(self):
        self.bands = {name: BandCondition(name, freq) for name, freq in self.BANDS}
    
    def calculate_conditions(self, solar_flux: float, k_index: int, a_index: int) -> Dict[str, Dict]:
        """Calculate band conditions based on space weather indices"""
        
        conditions = {}
        
        # Get solar activity level
        solar_activity = self._get_solar_activity(solar_flux)
        geomagnetic = self._get_geomagnetic_level(k_index, a_index)
        
        for band_name, band_obj in self.bands.items():
            condition = self._calculate_band_condition(
                band_name,
                solar_flux,
                solar_activity,
                k_index,
                a_index,
                geomagnetic
            )
            conditions[band_name] = condition.to_dict()
        
        return conditions
    
    def _get_solar_activity(self, solar_flux: float) -> str:
        """Get solar activity level"""
        if solar_flux < 70:
            return "very_low"
        elif solar_flux < 100:
            return "low"
        elif solar_flux < 150:
            return "moderate"
        elif solar_flux < 200:
            return "high"
        else:
            return "very_high"
    
    def _get_geomagnetic_level(self, k_index: int, a_index: int) -> str:
        """Get geomagnetic disturbance level"""
        if k_index <= 2 and a_index <= 15:
            return "quiet"
        elif k_index <= 4 and a_index <= 25:
            return "unsettled"
        elif k_index <= 6 and a_index <= 40:
            return "active"
        else:
            return "stormy"
    
    def _calculate_band_condition(
        self, 
        band: str, 
        solar_flux: float,
        solar_activity: str,
        k_index: int,
        a_index: int,
        geomagnetic: str
    ) -> BandCondition:
        """Calculate condition for a specific band"""
        
        band_obj = self.bands[band]
        
        # Low bands (160m, 80m) - affected by absorption and geomagnetic storms
        if band in ["160m", "80m"]:
            if geomagnetic == "stormy":
                band_obj.condition = "poor"
            elif geomagnetic == "active":
                band_obj.condition = "fair"
            elif solar_activity in ["low", "very_low"]:
                band_obj.condition = "good"
            else:
                band_obj.condition = "fair"
        
        # Medium bands (40m, 30m)
        elif band in ["40m", "30m"]:
            if geomagnetic == "stormy":
                band_obj.condition = "fair"
            elif solar_flux < 80:
                band_obj.condition = "good"
            elif solar_flux < 150:
                band_obj.condition = "fair"
            else:
                band_obj.condition = "good"
        
        # High bands (20m, 17m, 15m, 12m, 10m) - affected by sunspots
        elif band in ["20m", "17m", "15m", "12m", "10m"]:
            if geomagnetic == "stormy":
                band_obj.condition = "poor"
            elif geomagnetic in ["active", "unsettled"]:
                band_obj.condition = "fair"
            
            # Solar flux effect on skip
            if solar_flux < 70:
                band_obj.condition = "poor"
            elif solar_flux < 100:
                band_obj.condition = "fair"
            elif solar_flux < 150:
                band_obj.condition = "good"
            else:
                band_obj.condition = "excellent"
        
        # VHF (6m, 2m) - sporadic-E, aurora
        elif band in ["6m", "2m"]:
            if geomagnetic in ["active", "stormy"]:
                band_obj.condition = "good"  # Aurora
            else:
                band_obj.condition = "poor"  # Need Sporadic-E
        
        # Set noise level (inverse of condition)
        noise_map = {
            "excellent": 1,
            "good": 2,
            "fair": 3,
            "poor": 4
        }
        band_obj.noise_level = noise_map.get(band_obj.condition, 3)
        
        # Set recommendations
        band_obj.recommendation = self._get_recommendation(band, band_obj.condition)
        band_obj.open_regions = self._get_open_regions(band, solar_flux, k_index)
        
        return band_obj
    
    def _get_recommendation(self, band: str, condition: str) -> str:
        """Get recommendation for band"""
        if condition == "excellent":
            return "Excellent - Use this band!"
        elif condition == "good":
            return "Good conditions - Good choice"
        elif condition == "fair":
            return "Fair - Try multiple bands"
        else:
            return "Poor - Try lower bands"
    
    def _get_open_regions(self, band: str, solar_flux: float, k_index: int) -> List[str]:
        """Get open regions for band (simplified)"""
        if band == "160m":
            return ["Local", "Regional"]
        elif band == "80m":
            return ["Regional", "Continental"]
        elif band in ["40m", "30m"]:
            return ["Continental", "Intercontinental"]
        elif band in ["20m", "17m", "15m"]:
            if solar_flux > 150:
                return ["Worldwide"]
            else:
                return ["Continental", "Limited Worldwide"]
        elif band in ["12m", "10m"]:
            if solar_flux > 180:
                return ["Worldwide"]
            else:
                return ["Limited"]
        elif band == "6m":
            if k_index <= 4:
                return ["Sporadic-E possible"]
            else:
                return ["Aurora"]
        else:
            return []


# Global instance
band_conditions_service = BandConditionsService()
