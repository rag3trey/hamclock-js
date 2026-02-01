"""
Astronomy API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional

from ..services.astronomy import AstronomyService

router = APIRouter()

# Create astronomy service instance - will be initialized by main.py lifespan
astro_service = AstronomyService()


@router.get("/sun/position")
async def get_sun_position(
    lat: float = Query(..., description="Latitude in degrees"),
    lng: float = Query(..., description="Longitude in degrees"),
    timestamp: Optional[str] = Query(None, description="ISO timestamp (UTC), defaults to now")
):
    """Get current sun position (azimuth, elevation, etc.)"""
    try:
        dt = datetime.fromisoformat(timestamp) if timestamp else None
        result = astro_service.get_sun_position(lat, lng, dt)
        return result
    except RuntimeError as e:
        print(f"RuntimeError in sun_position: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        print(f"ValueError in sun_position: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")
    except Exception as e:
        print(f"Exception in sun_position: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/sun/riseset")
async def get_sun_rise_set(
    lat: float = Query(..., description="Latitude in degrees"),
    lng: float = Query(..., description="Longitude in degrees"),
    date: Optional[str] = Query(None, description="Date (YYYY-MM-DD), defaults to today")
):
    """Get sunrise and sunset times for a location"""
    print(f"🌅 Sun rise/set request: lat={lat}, lng={lng}, date={date}")
    try:
        # Check if service is initialized
        if astro_service.sun is None:
            print("❌ Astronomy service not initialized")
            raise HTTPException(status_code=503, detail="Astronomy service still initializing, please try again in a few seconds")
        
        print("✅ Astronomy service initialized, processing request...")
        
        if date:
            try:
                dt = datetime.fromisoformat(date)
                # Add UTC timezone if not present
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                print(f"✅ Date parsed: {dt}")
            except ValueError as ve:
                print(f"❌ Date parsing error: {ve}")
                raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD, got: {date}")
        else:
            dt = None
            print("ℹ️  No date provided, using today")
            
        print(f"🔄 Calling astro_service.get_sun_rise_set({lat}, {lng}, {dt})")
        result = astro_service.get_sun_rise_set(lat, lng, dt)
        print(f"✅ Result: {result}")
        return result
    except HTTPException:
        raise
    except RuntimeError as e:
        print(f"❌ RuntimeError: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        print(f"❌ ValueError: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")
    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/moon/position")
async def get_moon_position(
    lat: float = Query(..., description="Latitude in degrees"),
    lng: float = Query(..., description="Longitude in degrees"),
    timestamp: Optional[str] = Query(None, description="ISO timestamp (UTC)")
):
    """Get current moon position and phase"""
    try:
        dt = datetime.fromisoformat(timestamp) if timestamp else None
        result = astro_service.get_moon_position(lat, lng, dt)
        
        # Add phase name
        result['phase_name'] = astro_service.get_moon_phase_name(result['phase_angle'])
        
        return result
    except RuntimeError as e:
        print(f"RuntimeError in moon_position: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        print(f"ValueError in moon_position: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")
    except Exception as e:
        print(f"Exception in moon_position: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/moon/riseset")
async def get_moon_rise_set(
    lat: float = Query(..., description="Latitude in degrees"),
    lng: float = Query(..., description="Longitude in degrees"),
    date: Optional[str] = Query(None, description="Date (YYYY-MM-DD)")
):
    """Get moonrise and moonset times"""
    try:
        # Check if service is initialized
        if astro_service.sun is None:
            raise HTTPException(status_code=503, detail="Astronomy service still initializing, please try again in a few seconds")
        
        if date:
            try:
                dt = datetime.fromisoformat(date)
                # Add UTC timezone if not present
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD, got: {date}")
        else:
            dt = None
            
        result = astro_service.get_moon_rise_set(lat, lng, dt)
        return result
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/terminator")
async def get_day_night_terminator(
    timestamp: Optional[str] = Query(None, description="ISO timestamp (UTC)"),
    num_points: int = Query(360, description="Number of points in terminator line")
):
    """
    Get day/night terminator line for map overlay
    Returns array of [lat, lng] coordinates
    """
    try:
        dt = datetime.fromisoformat(timestamp) if timestamp else None
        points = astro_service.get_day_night_terminator(dt, num_points)
        
        return {
            'timestamp': (dt or datetime.now(timezone.utc)).isoformat(),
            'points': [[lat, lng] for lat, lng in points]
        }
    except RuntimeError as e:
        print(f"RuntimeError in terminator: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        print(f"ValueError in terminator: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")
    except Exception as e:
        print(f"Exception in terminator: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
