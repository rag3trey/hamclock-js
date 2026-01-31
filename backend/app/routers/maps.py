"""Maps API endpoints"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/projections")
async def list_projections():
    """List available map projections"""
    return {"projections": ["mercator", "azimuthal", "robinson"]}
