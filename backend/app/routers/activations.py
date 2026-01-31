"""
API endpoints for On The Air activations (SOTA/POTA)
"""

from fastapi import APIRouter, HTTPException
from ..services.activations import get_all_activations, get_sota_activations, get_pota_activations
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/v1/activations/all")
async def get_all_activation_spots():
    """
    Get all active SOTA and POTA activations
    Returns list of activations with coordinates for mapping
    """
    try:
        activations = await get_all_activations()
        return {
            "activations": activations,
            "count": len(activations)
        }
    except Exception as e:
        logger.error(f"Error fetching activations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/activations/sota")
async def get_sota_spots():
    """
    Get active SOTA activations only
    """
    try:
        activations = await get_sota_activations()
        return {
            "activations": activations,
            "count": len(activations),
            "type": "SOTA"
        }
    except Exception as e:
        logger.error(f"Error fetching SOTA activations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/activations/pota")
async def get_pota_spots():
    """
    Get active POTA activations only
    """
    try:
        activations = await get_pota_activations()
        return {
            "activations": activations,
            "count": len(activations),
            "type": "POTA"
        }
    except Exception as e:
        logger.error(f"Error fetching POTA activations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/activations/demo")
async def get_demo_activations():
    """
    Get demo activations for testing (when APIs are not returning data)
    """
    demo_activations = [
        {
            'type': 'SOTA',
            'callsign': 'W5XYZ',
            'latitude': 35.0896,
            'longitude': -106.6055,
            'name': 'Sandia Peak',
            'reference': 'W5N/SP-001',
            'altitude': 3255,
            'frequency': 14.074,
            'mode': 'SSB',
            'status': 'Active',
            'activator': 'W5XYZ',
            'timestamp': '2026-01-30T12:00:00'
        },
        {
            'type': 'POTA',
            'callsign': 'K6ABC',
            'latitude': 37.7749,
            'longitude': -122.4194,
            'name': 'Golden Gate National Recreation Area',
            'reference': 'K-0601',
            'state': 'CA',
            'frequency': 7.074,
            'mode': 'CW',
            'status': 'Active',
            'activator': 'K6ABC',
            'timestamp': '2026-01-30T11:45:00'
        },
        {
            'type': 'SOTA',
            'callsign': 'G4RZA',
            'latitude': 53.0635,
            'longitude': -2.3284,
            'name': 'Mam Tor',
            'reference': 'G/SP-004',
            'altitude': 517,
            'frequency': 3.573,
            'mode': 'SSB',
            'status': 'Active',
            'activator': 'G4RZA',
            'timestamp': '2026-01-30T11:30:00'
        },
        {
            'type': 'POTA',
            'callsign': 'VK3ABC',
            'latitude': -37.8136,
            'longitude': 144.9631,
            'name': 'Dandenong Ranges National Park',
            'reference': 'VK-0002',
            'state': 'VIC',
            'frequency': 14.200,
            'mode': 'SSB',
            'status': 'Active',
            'activator': 'VK3ABC',
            'timestamp': '2026-01-30T11:15:00'
        }
    ]
    
    return {
        "activations": demo_activations,
        "count": len(demo_activations),
        "note": "Demo data - use /all for live data"
    }
