"""
Weather Service
Fetches weather data from OpenWeatherMap API
Provides current conditions and forecasts for ham radio operations
"""

import aiohttp
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List
import logging
from ..config import settings

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for fetching and managing weather data"""

    def __init__(self):
        self.api_key = settings.OPENWEATHER_API_KEY
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        self.cache = {}
        self.cache_ttl = 600  # 10 minutes
        self.last_update = {}
        logger.info(f"Weather service initialized with API key: {'***' + self.api_key[-4:] if self.api_key else 'NOT SET'}")

    async def get_current_weather(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Get current weather for given coordinates
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Weather data dict or None if error
        """
        if not self.api_key:
            logger.warning("OpenWeatherMap API key not configured")
            return self._get_mock_weather(lat, lon)

        cache_key = f"weather_{lat}_{lon}"
        
        # Check cache
        if cache_key in self.cache:
            if datetime.now() - self.last_update.get(cache_key, datetime.now()) < timedelta(seconds=self.cache_ttl):
                return self.cache[cache_key]

        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        formatted = self._format_weather_data(data)
                        self.cache[cache_key] = formatted
                        self.last_update[cache_key] = datetime.now()
                        return formatted
                    else:
                        logger.error(f"Weather API error: {resp.status}")
                        return self._get_mock_weather(lat, lon)
                        
        except Exception as e:
            logger.error(f"Error fetching weather: {e}")
            return self._get_mock_weather(lat, lon)

    async def get_forecast(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Get 5-day weather forecast
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Forecast data dict or None if error
        """
        if not self.api_key:
            logger.warning("OpenWeatherMap API key not configured")
            return self._get_mock_forecast(lat, lon)

        cache_key = f"forecast_{lat}_{lon}"
        
        # Check cache
        if cache_key in self.cache:
            if datetime.now() - self.last_update.get(cache_key, datetime.now()) < timedelta(seconds=self.cache_ttl):
                return self.cache[cache_key]

        try:
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': 40  # 5 days, 3-hour intervals
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        formatted = self._format_forecast_data(data)
                        self.cache[cache_key] = formatted
                        self.last_update[cache_key] = datetime.now()
                        return formatted
                    else:
                        logger.error(f"Forecast API error: {resp.status}")
                        return self._get_mock_forecast(lat, lon)
                        
        except Exception as e:
            logger.error(f"Error fetching forecast: {e}")
            return self._get_mock_forecast(lat, lon)

    def _format_weather_data(self, data: Dict) -> Dict:
        """Format OpenWeatherMap current weather data"""
        try:
            weather = data.get('weather', [{}])[0]
            main = data.get('main', {})
            wind = data.get('wind', {})
            clouds = data.get('clouds', {})
            
            return {
                'location': data.get('name', 'Unknown'),
                'country': data.get('sys', {}).get('country', ''),
                'temperature': round(main.get('temp', 0), 1),
                'feels_like': round(main.get('feels_like', 0), 1),
                'humidity': main.get('humidity', 0),
                'pressure': main.get('pressure', 0),
                'description': weather.get('main', 'Unknown'),
                'detail': weather.get('description', ''),
                'wind_speed': round(wind.get('speed', 0), 1),
                'wind_direction': wind.get('deg', 0),
                'wind_gust': round(wind.get('gust', 0), 1),
                'cloudiness': clouds.get('all', 0),
                'visibility': data.get('visibility', 10000),
                'uvi': data.get('uvi', 0),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error formatting weather data: {e}")
            return {}

    def _format_forecast_data(self, data: Dict) -> Dict:
        """Format OpenWeatherMap forecast data"""
        try:
            forecasts = []
            for item in data.get('list', []):
                weather = item.get('weather', [{}])[0]
                main = item.get('main', {})
                wind = item.get('wind', {})
                
                forecasts.append({
                    'timestamp': item.get('dt'),
                    'temperature': round(main.get('temp', 0), 1),
                    'feels_like': round(main.get('feels_like', 0), 1),
                    'humidity': main.get('humidity', 0),
                    'pressure': main.get('pressure', 0),
                    'description': weather.get('main', 'Unknown'),
                    'wind_speed': round(wind.get('speed', 0), 1),
                    'wind_direction': wind.get('deg', 0),
                    'cloudiness': item.get('clouds', {}).get('all', 0),
                    'rain_probability': item.get('pop', 0) * 100,
                    'rain_mm': item.get('rain', {}).get('3h', 0)
                })
            
            return {
                'location': data.get('city', {}).get('name', 'Unknown'),
                'country': data.get('city', {}).get('country', ''),
                'forecasts': forecasts,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error formatting forecast data: {e}")
            return {'forecasts': []}

    def _get_mock_weather(self, lat: float, lon: float) -> Dict:
        """Return mock weather data for demo/offline use"""
        import random
        
        temps = [15, 18, 22, 25, 12]
        descriptions = ['Clear', 'Cloudy', 'Partly Cloudy', 'Overcast', 'Clear']
        
        return {
            'location': 'Demo Location',
            'country': 'US',
            'temperature': random.choice(temps),
            'feels_like': random.choice(temps) - 1,
            'humidity': random.randint(40, 90),
            'pressure': random.randint(1010, 1020),
            'description': random.choice(descriptions),
            'detail': 'Demo weather data',
            'wind_speed': round(random.uniform(0, 15), 1),
            'wind_direction': random.randint(0, 360),
            'wind_gust': round(random.uniform(5, 20), 1),
            'cloudiness': random.randint(0, 100),
            'visibility': 10000,
            'uvi': random.uniform(0, 8),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

    def _get_mock_forecast(self, lat: float, lon: float) -> Dict:
        """Return mock forecast data for demo/offline use"""
        import random
        
        forecasts = []
        base_time = datetime.now(timezone.utc)
        
        for i in range(0, 120, 3):  # 5 days, 3-hour intervals
            forecast_time = base_time + timedelta(hours=i)
            forecasts.append({
                'timestamp': int(forecast_time.timestamp()),
                'temperature': round(random.uniform(10, 25), 1),
                'feels_like': round(random.uniform(9, 24), 1),
                'humidity': random.randint(40, 90),
                'pressure': random.randint(1010, 1020),
                'description': random.choice(['Clear', 'Cloudy', 'Partly Cloudy']),
                'wind_speed': round(random.uniform(0, 15), 1),
                'wind_direction': random.randint(0, 360),
                'cloudiness': random.randint(0, 100),
                'rain_probability': random.randint(0, 50),
                'rain_mm': round(random.uniform(0, 5), 1)
            })
        
        return {
            'location': 'Demo Location',
            'country': 'US',
            'forecasts': forecasts,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }


# Global weather service instance
weather_service = WeatherService()
