"""
DX-Peditions API Router

Endpoints for DX-peditions tracking and filtering.
"""

from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional, List
from app.services.dxpeditions import get_dxpedition_service

router = APIRouter(tags=["dxpeditions"])


@router.get("/all")
async def get_all_expeditions() -> dict:
    """
    Get all DX expeditions (active, upcoming, and completed).

    Returns:
        List of all expeditions with their details
    """
    service = get_dxpedition_service()
    expeditions = await service.get_expeditions()
    return {
        "status": "success",
        "count": len(expeditions),
        "data": expeditions,
    }


@router.get("/active")
async def get_active_expeditions(limit: int = Query(10, ge=1, le=50)) -> dict:
    """
    Get currently active DX expeditions.

    Args:
        limit: Maximum number of expeditions to return (1-50)

    Returns:
        List of active expeditions
    """
    service = get_dxpedition_service()
    expeditions = await service.get_active_expeditions(limit=limit)
    return {
        "status": "success",
        "count": len(expeditions),
        "data": expeditions,
    }


@router.get("/upcoming")
async def get_upcoming_expeditions(limit: int = Query(10, ge=1, le=50)) -> dict:
    """
    Get upcoming DX expeditions.

    Args:
        limit: Maximum number of expeditions to return (1-50)

    Returns:
        List of upcoming expeditions
    """
    service = get_dxpedition_service()
    expeditions = await service.get_upcoming_expeditions(limit=limit)
    return {
        "status": "success",
        "count": len(expeditions),
        "data": expeditions,
    }


@router.get("/search")
async def search_expeditions(q: str = Query(..., min_length=1)) -> dict:
    """
    Search expeditions by call sign, location, or country.

    Args:
        q: Search query string

    Returns:
        List of matching expeditions
    """
    if len(q) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 1 character",
        )

    service = get_dxpedition_service()
    results = await service.search_expeditions(q)
    return {
        "status": "success",
        "query": q,
        "count": len(results),
        "data": results,
    }


@router.get("/{call_sign}")
async def get_expedition_by_call(call_sign: str) -> dict:
    """
    Get expedition details by call sign.

    Args:
        call_sign: Call sign of the expedition

    Returns:
        Expedition details or 404 if not found
    """
    service = get_dxpedition_service()
    expedition = await service.get_expedition_by_call(call_sign)

    if expedition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expedition '{call_sign}' not found",
        )

    return {
        "status": "success",
        "data": expedition,
    }


@router.get("/nearby/location")
async def get_expeditions_nearby(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(1000, ge=10, le=5000),
) -> dict:
    """
    Get DX expeditions near a location.

    Args:
        latitude: Latitude in decimal degrees (-90 to 90)
        longitude: Longitude in decimal degrees (-180 to 180)
        radius_km: Search radius in kilometers (10-5000)

    Returns:
        List of expeditions within radius, sorted by distance
    """
    service = get_dxpedition_service()
    expeditions = await service.get_expeditions_by_location(
        latitude=latitude, longitude=longitude, radius_km=radius_km
    )

    return {
        "status": "success",
        "location": {"latitude": latitude, "longitude": longitude},
        "radius_km": radius_km,
        "count": len(expeditions),
        "data": expeditions,
    }


@router.post("/refresh")
async def refresh_expeditions() -> dict:
    """
    Force refresh of expedition data from sources.

    Returns:
        Refresh status and new expedition count
    """
    service = get_dxpedition_service()
    await service.refresh()
    expeditions = await service.get_expeditions()

    return {
        "status": "success",
        "message": "Expedition data refreshed",
        "count": len(expeditions),
    }
