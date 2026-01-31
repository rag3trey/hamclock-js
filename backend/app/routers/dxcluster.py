"""DX Cluster API endpoints"""
from fastapi import APIRouter, Query
from typing import Optional
from ..services.dxcluster import dxcluster_service

router = APIRouter()

@router.get("/spots")
async def get_dx_spots(
    limit: int = Query(50, ge=1, le=200),
    band: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
):
    """Get recent DX spots
    
    Args:
        limit: Maximum number of spots to return (1-200)
        band: Filter by band (e.g., "20m", "40m")
        latitude: Observer latitude for bearing/distance calculation
        longitude: Observer longitude for bearing/distance calculation
    
    Returns:
        List of recent DX spots with callsign, frequency, spotter, time, comment, bearing, distance
    """
    spots = dxcluster_service.get_recent_spots(limit=limit, band=band, 
                                               observer_lat=latitude, observer_lon=longitude)
    return {
        "spots": spots,
        "count": len(spots),
        "connected": dxcluster_service.connected
    }

@router.get("/status")
async def get_dx_cluster_status():
    """Get DX cluster connection status"""
    return {
        "connected": dxcluster_service.connected,
        "host": dxcluster_service.host,
        "port": dxcluster_service.port,
        "spot_count": dxcluster_service.get_spot_count(),
        "callsign": dxcluster_service.callsign
    }
