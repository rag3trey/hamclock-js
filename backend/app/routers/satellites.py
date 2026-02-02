"""
Satellites API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from datetime import datetime
from typing import Optional

from ..services.satellites import SatelliteService

router = APIRouter()
sat_service = SatelliteService()


@router.post("/update-tles")
async def update_tles(background_tasks: BackgroundTasks):
    """Trigger TLE update (runs in background)"""
    background_tasks.add_task(sat_service.update_tles)
    return {
        "message": "TLE update started",
        "last_update": sat_service.last_tle_update.isoformat() if sat_service.last_tle_update else None
    }


@router.post("/update-supplemental-tles")
async def update_supplemental_tles(background_tasks: BackgroundTasks):
    """Trigger supplemental TLE update from Celestrak (amateur radio group)"""
    background_tasks.add_task(sat_service.update_supplemental_tles)
    return {
        "message": "Supplemental TLE update started",
        "source": "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle",
        "last_update": sat_service.last_tle_update.isoformat() if sat_service.last_tle_update else None
    }


@router.get("/list")
async def list_satellites():
    """List all available satellites"""
    satellites = sat_service.list_satellites()
    return {
        "count": len(satellites),
        "satellites": satellites,
        "last_tle_update": sat_service.last_tle_update.isoformat() if sat_service.last_tle_update else None
    }


@router.get("/{sat_name}/position")
async def get_satellite_position(
    sat_name: str,
    lat: float = Query(..., description="Observer latitude"),
    lng: float = Query(..., description="Observer longitude"),
    timestamp: Optional[str] = Query(None, description="ISO timestamp (UTC)")
):
    """Get satellite position as seen from observer"""
    try:
        dt = datetime.fromisoformat(timestamp) if timestamp else None
        result = sat_service.get_satellite_position(sat_name, lat, lng, dt)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{sat_name}/passes")
async def get_satellite_passes(
    sat_name: str,
    lat: float = Query(..., description="Observer latitude"),
    lng: float = Query(..., description="Observer longitude"),
    hours: int = Query(24, description="Hours to look ahead", ge=1, le=168),
    min_elevation: float = Query(10.0, description="Minimum elevation in degrees", ge=0, le=90)
):
    """Calculate satellite passes over observer location"""
    try:
        passes = sat_service.calculate_passes(sat_name, lat, lng, hours, min_elevation)
        return {
            "satellite": sat_name,
            "observer": {"latitude": lat, "longitude": lng},
            "passes": passes,
            "count": len(passes)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{sat_name}/next-pass")
async def get_next_pass(
    sat_name: str,
    lat: float = Query(...),
    lng: float = Query(...),
    min_elevation: float = Query(10.0, ge=0, le=90)
):
    """Get the next pass for a satellite"""
    try:
        next_pass = sat_service.get_next_pass(sat_name, lat, lng, min_elevation)
        if not next_pass:
            return {"message": "No passes found in next 48 hours"}
        return next_pass
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{sat_name}/track")
async def get_orbit_track(
    sat_name: str,
    timestamp: Optional[str] = Query(None),
    duration_minutes: int = Query(90, ge=1, le=1440),
    num_points: int = Query(100, ge=10, le=1000)
):
    """Get satellite ground track for map overlay"""
    try:
        dt = datetime.fromisoformat(timestamp) if timestamp else None
        track = sat_service.calculate_orbit_track(sat_name, dt, duration_minutes, num_points)
        return {
            "satellite": sat_name,
            "track": track
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/all/visible")
async def get_all_visible_satellites(
    lat: float = Query(..., description="Observer latitude"),
    lng: float = Query(..., description="Observer longitude"),
    altitude: float = Query(0, description="Observer altitude in meters")
):
    """Get all visible satellites and next passes from observer location"""
    try:
        satellites_list = sat_service.list_satellites()
        
        positions = []
        passes = []
        
        for sat_data in satellites_list:
            # Extract satellite name from dict
            sat_name = sat_data['name'] if isinstance(sat_data, dict) else sat_data
            
            try:
                # Get current position
                pos = sat_service.get_satellite_position(sat_name, lat, lng)
                if pos and pos.get('position', {}).get('elevation', 0) > 0:
                    positions.append({
                        'name': sat_name,
                        'latitude': pos['position']['latitude'],
                        'longitude': pos['position']['longitude'],
                        'elevation': pos['position']['elevation'],
                        'azimuth': pos['position']['azimuth'],
                        'range_km': pos['position']['range_km'],
                        'visible': True
                    })
            except Exception as pos_error:
                # Skip satellites that fail to get position
                pass
            
            try:
                # Get next pass
                next_pass = sat_service.get_next_pass(sat_name, lat, lng)
                if next_pass:
                    passes.append({
                        'satellite': sat_name,
                        'rise_time': next_pass.get('rise_time'),
                        'set_time': next_pass.get('set_time'),
                        'max_elevation': next_pass.get('max_elevation'),
                        'max_elevation_time': next_pass.get('max_elevation_time'),
                        'duration': next_pass.get('duration')
                    })
            except Exception as pass_error:
                # Skip satellites that fail to get passes
                pass
        
        # Sort passes by rise time, filtering out None values
        passes = [p for p in passes if p.get('rise_time')]
        passes.sort(key=lambda x: x.get('rise_time', ''))
        
        return {
            'observer': {'latitude': lat, 'longitude': lng},
            'visible_positions': positions,
            'upcoming_passes': passes[:10],  # Top 10 upcoming passes
            'visible_count': len(positions),
            'passes_count': len(passes),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        import traceback
        print(f"Error in get_all_visible_satellites: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

