"""
Gimbal/Antenna Tracking API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.gimbal import gimbal_service
from ..services.gps import gps_service

router = APIRouter()


@router.post("/track/start")
async def start_tracking(
    satellite_name: str = Query(..., description="Satellite name to track"),
    rotator_type: str = Query("yaesu", description="Rotator type: yaesu or alfa")
):
    """Start tracking a satellite"""
    try:
        result = gimbal_service.start_tracking(
            satellite_name,
            {},
            rotator_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/track/stop")
async def stop_tracking():
    """Stop tracking"""
    result = gimbal_service.stop_tracking()
    return result


@router.get("/track/status")
async def get_tracking_status():
    """Get current tracking status"""
    return gimbal_service.get_tracking_status()


@router.get("/calculate")
async def calculate_pointing(
    satellite_name: str = Query(..., description="Satellite name"),
    observer_lat: Optional[float] = Query(None, description="Observer latitude"),
    observer_lon: Optional[float] = Query(None, description="Observer longitude"),
    observer_alt: Optional[float] = Query(0, description="Observer altitude in meters")
):
    """
    Calculate azimuth and elevation for a satellite
    If observer location not provided, uses GPS location
    """
    
    # Use GPS location if available and not provided
    if observer_lat is None or observer_lon is None:
        try:
            position = gps_service.get_current_position()
            if position:
                observer_lat = position.get('latitude', 0)
                observer_lon = position.get('longitude', 0)
                observer_alt = position.get('altitude', 0)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Observer location required. Provide coordinates or connect GPS."
                )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"GPS error: {str(e)}")
    
    # For now, return a placeholder response since we don't have sat_service
    # The frontend will handle this gracefully
    return {
        "satellite": satellite_name,
        "azimuth": 0,
        "elevation": 0,
        "range_km": 0,
        "altitude_km": 400,
        "visible": False,
        "error": "Satellite position data not available. Use satellite panel for tracking data."
    }


@router.get("/satellite/{satellite_name}/next-peak")
async def get_next_peak(
    satellite_name: str,
    observer_lat: Optional[float] = Query(None),
    observer_lon: Optional[float] = Query(None),
    observer_alt: Optional[float] = Query(0),
    days: int = Query(7, description="Days in future to check")
):
    """Get next peak elevation point for satellite pass"""
    
    # For now return placeholder
    return {
        "satellite": satellite_name,
        "next_peak": None,
        "message": "Peak prediction not available"
    }


@router.get("/rotator-commands")
async def get_rotator_commands(
    azimuth: float = Query(..., description="Azimuth 0-360"),
    elevation: float = Query(..., description="Elevation -90 to +90"),
    rotator_type: str = Query("yaesu", description="Rotator type: yaesu or alfa")
):
    """Get raw rotator commands for given azimuth/elevation"""
    try:
        command = gimbal_service.format_rotator_command(azimuth, elevation, rotator_type)
        return {
            "azimuth": azimuth,
            "elevation": elevation,
            "rotator_type": rotator_type,
            "command": command,
            "command_hex": command.encode().hex()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/visible-satellites")
async def get_visible_satellites(
    observer_lat: Optional[float] = Query(None),
    observer_lon: Optional[float] = Query(None),
    observer_alt: Optional[float] = Query(0),
    min_elevation: float = Query(0, description="Minimum elevation degrees")
):
    """Get all visible satellites for current observer location"""
    
    # Use GPS location if available
    if observer_lat is None or observer_lon is None:
        try:
            position = gps_service.get_current_position()
            if position:
                observer_lat = position.get('latitude', 0)
                observer_lon = position.get('longitude', 0)
                observer_alt = position.get('altitude', 0)
            else:
                raise HTTPException(status_code=400, detail="Observer location required")
        except:
            raise HTTPException(status_code=400, detail="GPS error")
    
    try:
        visible = []
        
        # Get all satellites (this endpoint is for future use with real-time tracking)
        # For now, return empty to avoid performance issues
        # Individual satellite tracking uses the calculate endpoint
        
        return {
            "location": {
                "latitude": observer_lat,
                "longitude": observer_lon,
                "altitude_m": observer_alt
            },
            "min_elevation": min_elevation,
            "visible_satellites": visible,
            "count": len(visible),
            "message": "Use /calculate endpoint for individual satellite tracking"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
