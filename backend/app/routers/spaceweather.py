"""Space Weather API endpoints"""
from fastapi import APIRouter
from ..services.spaceweather import spaceweather_service

router = APIRouter()

@router.get("/current")
async def get_current_spaceweather():
    """Get current space weather data from NOAA SWPC"""
    return await spaceweather_service.get_current_conditions()


@router.get("/trend")
async def get_spaceweather_trend(days: int = 30):
    """Get space weather trend data for the past N days"""
    if days > 90:
        days = 90  # Limit to 90 days max
    if days < 1:
        days = 1
    return spaceweather_service.get_solar_flux_trend(days)

