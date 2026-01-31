"""PSK Reporter API routes."""

from fastapi import APIRouter, Query
from ..services.psk_reporter import PSKReporterService

router = APIRouter()
service = PSKReporterService()


@router.get("/all")
async def get_all_spots(limit: int = Query(50, ge=1, le=200)):
    """Get all recent PSK Reporter digital mode spots."""
    spots = service.get_all_spots(limit=limit)
    return {
        "spots": spots,
        "count": len(spots)
    }


@router.get("/band/{band_name}")
async def get_band_activity(band_name: str):
    """Get activity on a specific band (e.g., 20m, 40m, 10m)."""
    bands = {
        "160m": {"min": 1.8, "max": 2.0},
        "80m": {"min": 3.5, "max": 4.0},
        "40m": {"min": 7.0, "max": 7.3},
        "30m": {"min": 10.1, "max": 10.15},
        "20m": {"min": 14.0, "max": 14.35},
        "17m": {"min": 18.068, "max": 18.168},
        "15m": {"min": 21.0, "max": 21.45},
        "12m": {"min": 24.89, "max": 24.99},
        "10m": {"min": 28.0, "max": 29.7},
    }
    
    band_name = band_name.lower()
    if band_name not in bands:
        return {"error": f"Unknown band: {band_name}"}
    
    freq_range = bands[band_name]
    spots = service.get_spots_by_frequency(freq_range["min"], freq_range["max"])
    
    return {
        "band": band_name,
        "frequency_range": freq_range,
        "spots": spots,
        "count": len(spots)
    }


@router.get("/mode/{mode}")
async def get_mode_activity(mode: str):
    """Get activity for specific mode (PSK31, FT8, RTTY, JT65, etc.)."""
    spots = service.get_spots_by_mode(mode)
    
    return {
        "mode": mode,
        "spots": spots,
        "count": len(spots)
    }


@router.get("/near")
async def get_spots_near_location(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: int = Query(5000, ge=100, le=20000)
):
    """Get PSK spots from reporters near user's location."""
    spots = service.get_spots_near_user(latitude, longitude, radius_km)
    
    return {
        "user_location": {"latitude": latitude, "longitude": longitude},
        "radius_km": radius_km,
        "spots": spots,
        "count": len(spots)
    }


@router.get("/summary")
async def get_activity_summary(
    latitude: float = Query(None, ge=-90, le=90),
    longitude: float = Query(None, ge=-180, le=180)
):
    """Get overall digital mode activity summary."""
    summary = service.get_activity_summary(latitude, longitude)
    return summary


@router.get("/active-bands")
async def get_active_bands():
    """Get which bands currently have activity."""
    active_bands = service.get_active_bands()
    
    return {
        "active_bands": active_bands,
        "band_count": len(active_bands)
    }
