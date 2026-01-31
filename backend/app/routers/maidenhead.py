"""
Maidenhead Grid Square API Router
Endpoints for grid square conversion and calculations
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Tuple
from ..services.maidenhead import maidenhead_service

router = APIRouter(prefix="/api/v1/maidenhead", tags=["maidenhead"])


class LatLngRequest(BaseModel):
    """Request model for lat/lng to grid conversion"""
    latitude: float
    longitude: float
    precision: int = 6


class GridRequest(BaseModel):
    """Request model for grid to lat/lng conversion"""
    grid: str


class GridDistanceRequest(BaseModel):
    """Request model for grid distance calculation"""
    grid1: str
    grid2: str


@router.post("/latlong-to-grid")
async def latlong_to_grid(request: LatLngRequest):
    """
    Convert latitude and longitude to Maidenhead grid square
    
    Parameters:
    - latitude: -90 to 90
    - longitude: -180 to 180
    - precision: 2 (field), 4 (square), 6 (subsquare), 8 (extended)
    """
    try:
        grid = maidenhead_service.latlong_to_grid(
            request.latitude,
            request.longitude,
            request.precision
        )
        return {
            "grid": grid,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "precision": request.precision
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/latlong-to-grid")
async def latlong_to_grid_get(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    precision: int = Query(6, description="Grid precision (2, 4, 6, or 8)")
):
    """
    Convert latitude and longitude to Maidenhead grid square (GET endpoint)
    """
    try:
        grid = maidenhead_service.latlong_to_grid(lat, lng, precision)
        return {
            "grid": grid,
            "latitude": lat,
            "longitude": lng,
            "precision": precision
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/grid-to-latlong")
async def grid_to_latlong(request: GridRequest):
    """
    Convert Maidenhead grid square to latitude and longitude
    
    Returns the center point of the grid square
    """
    try:
        if not maidenhead_service.is_valid_grid(request.grid):
            raise ValueError(f"Invalid grid square: {request.grid}")
        
        lat, lng = maidenhead_service.grid_to_latlong(request.grid)
        return {
            "grid": request.grid.upper(),
            "latitude": lat,
            "longitude": lng,
            "type": "center_point"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/grid-to-latlong")
async def grid_to_latlong_get(grid: str = Query(..., description="Maidenhead grid square")):
    """
    Convert Maidenhead grid square to latitude and longitude (GET endpoint)
    """
    try:
        if not maidenhead_service.is_valid_grid(grid):
            raise ValueError(f"Invalid grid square: {grid}")
        
        lat, lng = maidenhead_service.grid_to_latlong(grid)
        return {
            "grid": grid.upper(),
            "latitude": lat,
            "longitude": lng,
            "type": "center_point"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/distance")
async def grid_distance(request: GridDistanceRequest):
    """
    Calculate distance and azimuth between two grid squares
    """
    try:
        if not maidenhead_service.is_valid_grid(request.grid1):
            raise ValueError(f"Invalid grid1: {request.grid1}")
        if not maidenhead_service.is_valid_grid(request.grid2):
            raise ValueError(f"Invalid grid2: {request.grid2}")
        
        distance, azimuth = maidenhead_service.grid_distance_azimuth(
            request.grid1,
            request.grid2
        )
        return {
            "grid1": request.grid1.upper(),
            "grid2": request.grid2.upper(),
            "distance_km": round(distance, 2),
            "azimuth_degrees": round(azimuth, 2)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/distance")
async def grid_distance_get(
    grid1: str = Query(..., description="First grid square"),
    grid2: str = Query(..., description="Second grid square")
):
    """
    Calculate distance and azimuth between two grid squares (GET endpoint)
    """
    try:
        if not maidenhead_service.is_valid_grid(grid1):
            raise ValueError(f"Invalid grid1: {grid1}")
        if not maidenhead_service.is_valid_grid(grid2):
            raise ValueError(f"Invalid grid2: {grid2}")
        
        distance, azimuth = maidenhead_service.grid_distance_azimuth(grid1, grid2)
        return {
            "grid1": grid1.upper(),
            "grid2": grid2.upper(),
            "distance_km": round(distance, 2),
            "azimuth_degrees": round(azimuth, 2)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/validate")
async def validate_grid(grid: str = Query(..., description="Grid square to validate")):
    """
    Validate if a string is a valid Maidenhead grid square
    """
    is_valid = maidenhead_service.is_valid_grid(grid)
    return {
        "grid": grid.upper() if is_valid else grid,
        "valid": is_valid
    }
