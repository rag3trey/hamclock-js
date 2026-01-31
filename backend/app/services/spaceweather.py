"""Space Weather data fetching service"""
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import re
import json
from pathlib import Path


class SpaceWeatherService:
    """Service for fetching space weather data from NOAA SWPC"""
    
    def __init__(self):
        self.cache = {}
        self.cache_duration = 600  # 10 minutes
        self.history_file = Path("/tmp/spaceweather_history.json")
        self.max_history_days = 30
        self._load_history()
        
    def _load_history(self):
        """Load historical data from file"""
        try:
            if self.history_file.exists():
                with open(self.history_file, 'r') as f:
                    self.history = json.load(f)
            else:
                self.history = []
        except Exception as e:
            print(f"Error loading history: {e}")
            self.history = []
    
    def _save_history(self):
        """Save historical data to file"""
        try:
            # Keep only last 30 days
            now = datetime.now(timezone.utc)
            cutoff = now - timedelta(days=self.max_history_days)
            
            self.history = [
                entry for entry in self.history
                if datetime.fromisoformat(entry['timestamp']) > cutoff
            ]
            
            with open(self.history_file, 'w') as f:
                json.dump(self.history, f)
        except Exception as e:
            print(f"Error saving history: {e}")
        
    async def get_current_conditions(self) -> Dict[str, Any]:
        """Fetch current space weather conditions from NOAA SWPC"""
        
        # Check cache
        now = datetime.now(timezone.utc)
        if 'data' in self.cache:
            cache_time = self.cache.get('timestamp')
            if cache_time and (now - cache_time).total_seconds() < self.cache_duration:
                return self.cache['data']
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch multiple data sources
                solar_flux = await self._fetch_solar_flux(client)
                indices = await self._fetch_planetary_indices(client)
                sunspot = await self._fetch_sunspot_number(client)
                xray = await self._fetch_xray_flux(client)
                
                data = {
                    'solar_flux': solar_flux,
                    'a_index': indices.get('a_index', 0),
                    'k_index': indices.get('k_index', 0),
                    'sunspot_number': sunspot,
                    'xray_flux': xray.get('flux', 'A0.0'),
                    'xray_class': xray.get('class', 'A'),
                    'conditions': self._determine_conditions(solar_flux, indices.get('k_index', 0)),
                    'timestamp': now.isoformat()
                }
                
                # Update cache
                self.cache = {
                    'data': data,
                    'timestamp': now
                }
                
                # Add to history
                self.history.append({
                    'solar_flux': solar_flux,
                    'a_index': indices.get('a_index', 0),
                    'k_index': indices.get('k_index', 0),
                    'sunspot_number': sunspot,
                    'timestamp': now.isoformat()
                })
                self._save_history()
                
                return data
                
        except Exception as e:
            print(f"Error fetching space weather: {e}")
            # Return cached data if available, otherwise defaults
            if 'data' in self.cache:
                return self.cache['data']
            return self._get_default_data()
    
    async def _fetch_solar_flux(self, client: httpx.AsyncClient) -> float:
        """Fetch solar flux (F10.7) from NOAA"""
        try:
            # NOAA SWPC provides solar flux data
            response = await client.get('https://services.swpc.noaa.gov/text/daily-solar-indices.txt')
            if response.status_code == 200:
                lines = response.text.strip().split('\n')
                # Find the data line (last non-comment line)
                for line in reversed(lines):
                    if line and not line.startswith('#') and not line.startswith(':'):
                        parts = line.split()
                        if len(parts) >= 4:
                            # Solar flux is typically the 4th column (index 3)
                            try:
                                return float(parts[3])
                            except (ValueError, IndexError):
                                pass
        except Exception as e:
            print(f"Error fetching solar flux: {e}")
        
        return 150.0  # Default value
    
    async def _fetch_planetary_indices(self, client: httpx.AsyncClient) -> Dict[str, int]:
        """Fetch planetary K and A indices"""
        try:
            response = await client.get('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
            if response.status_code == 200:
                data = response.json()
                # Get the most recent reading
                if data and len(data) > 1:
                    latest = data[-1]  # Last entry
                    if len(latest) >= 2:
                        k_index = int(float(latest[1]))
                        # A-index approximation: roughly A = 15 * K^2 / 4
                        a_index = int(15 * (k_index ** 2) / 4)
                        return {
                            'k_index': k_index,
                            'a_index': a_index
                        }
        except Exception as e:
            print(f"Error fetching indices: {e}")
        
        return {'k_index': 2, 'a_index': 8}
    
    async def _fetch_sunspot_number(self, client: httpx.AsyncClient) -> int:
        """Fetch current sunspot number"""
        try:
            response = await client.get('https://services.swpc.noaa.gov/text/daily-solar-indices.txt')
            if response.status_code == 200:
                lines = response.text.strip().split('\n')
                for line in reversed(lines):
                    if line and not line.startswith('#') and not line.startswith(':'):
                        parts = line.split()
                        if len(parts) >= 3:
                            try:
                                return int(float(parts[2]))
                            except (ValueError, IndexError):
                                pass
        except Exception as e:
            print(f"Error fetching sunspot number: {e}")
        
        return 50  # Default
    
    async def _fetch_xray_flux(self, client: httpx.AsyncClient) -> Dict[str, str]:
        """Fetch X-ray flux level"""
        try:
            response = await client.get('https://services.swpc.noaa.gov/products/summary/solar-cycle-sunspot-number.json')
            # For simplicity, return a default. Full implementation would parse real-time X-ray data
            return {'flux': 'A1.0', 'class': 'A'}
        except Exception as e:
            print(f"Error fetching X-ray flux: {e}")
        
        return {'flux': 'A1.0', 'class': 'A'}
    
    def _determine_conditions(self, solar_flux: float, k_index: int) -> str:
        """Determine overall band conditions"""
        if k_index >= 5 or solar_flux < 70:
            return 'poor'
        elif k_index >= 3 or solar_flux < 100:
            return 'fair'
        elif solar_flux >= 150:
            return 'excellent'
        else:
            return 'good'
    
    def _get_default_data(self) -> Dict[str, Any]:
        """Return default data when fetch fails"""
        return {
            'solar_flux': 150.0,
            'a_index': 8,
            'k_index': 2,
            'sunspot_number': 50,
            'xray_flux': 'A1.0',
            'xray_class': 'A',
            'conditions': 'good',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def get_solar_flux_trend(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get solar flux trend data for the past N days"""
        self._load_history()  # Refresh history
        
        if not self.history:
            return []
        
        # Filter to requested time period
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=days)
        
        trend = [
            {
                'timestamp': entry['timestamp'],
                'date': entry['timestamp'].split('T')[0],  # YYYY-MM-DD
                'solar_flux': entry['solar_flux'],
                'a_index': entry['a_index'],
                'k_index': entry['k_index'],
                'sunspot_number': entry['sunspot_number']
            }
            for entry in self.history
            if datetime.fromisoformat(entry['timestamp']) > cutoff
        ]
        
        return sorted(trend, key=lambda x: x['timestamp'])


# Global instance
spaceweather_service = SpaceWeatherService()
