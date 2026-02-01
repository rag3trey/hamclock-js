"""Contests API endpoints"""
from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.services.contests import ContestsService

router = APIRouter(prefix="/api/v1/contests", tags=["contests"])

# Initialize service
contests_service = ContestsService()


@router.get("/upcoming")
async def get_upcoming_contests(days: int = Query(30, ge=1, le=365)):
    """
    Get upcoming radio contests
    
    Args:
        days: Number of days to look ahead (1-365, default 30)
        
    Returns:
        Dictionary with list of upcoming contests
    """
    print(f"📅 /contests/upcoming called with days={days}")
    result = await contests_service.get_upcoming_contests(days)
    return result


@router.get("/by-band/{band}")
async def get_contests_by_band(band: str, days: int = Query(30, ge=1, le=365)):
    """
    Get contests for a specific band
    
    Args:
        band: Band name (e.g., '20m', '40m', '2m')
        days: Number of days to look ahead (default 30)
        
    Returns:
        List of contests for the specified band
    """
    print(f"📅 /contests/by-band/{band} called")
    contests = await contests_service.get_contests_by_band(band, days)
    return {
        'band': band,
        'contests': contests,
        'count': len(contests),
        'updated': datetime.now(timezone.utc).isoformat()
    }


@router.get("/by-mode/{mode}")
async def get_contests_by_mode(mode: str, days: int = Query(30, ge=1, le=365)):
    """
    Get contests for a specific mode
    
    Args:
        mode: Mode name (e.g., 'CW', 'SSB', 'RTTY')
        days: Number of days to look ahead (default 30)
        
    Returns:
        List of contests for the specified mode
    """
    print(f"📅 /contests/by-mode/{mode} called")
    contests = await contests_service.get_contests_by_mode(mode, days)
    return {
        'mode': mode,
        'contests': contests,
        'count': len(contests),
        'updated': datetime.now(timezone.utc).isoformat()
    }
