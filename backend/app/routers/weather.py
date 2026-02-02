"""
Weather API Routes
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.weather import weather_service

router = APIRouter(prefix="/api/v1/weather", tags=["weather"])


@router.get("/current")
async def get_current_weather(
    lat: float = Query(40.7128, description="Latitude"),
    lon: float = Query(-74.0060, description="Longitude")
):
    """
    Get current weather for given coordinates
    
    Query Parameters:
    - lat: Latitude (default: 40.7128 - NYC)
    - lon: Longitude (default: -74.0060 - NYC)
    """
    try:
        weather = await weather_service.get_current_weather(lat, lon)
        if weather:
            return {
                'status': 'success',
                'data': weather
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to fetch weather data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weather: {str(e)}")


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(40.7128, description="Latitude"),
    lon: float = Query(-74.0060, description="Longitude")
):
    """
    Get 5-day weather forecast for given coordinates
    
    Query Parameters:
    - lat: Latitude (default: 40.7128 - NYC)
    - lon: Longitude (default: -74.0060 - NYC)
    """
    try:
        forecast = await weather_service.get_forecast(lat, lon)
        if forecast:
            return {
                'status': 'success',
                'data': forecast
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to fetch forecast data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching forecast: {str(e)}")
