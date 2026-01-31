"""NCDXF Beacon API endpoints"""
from fastapi import APIRouter, Query
from ..services.ncdxf import ncdxf_service
from .spaceweather import get_current_spaceweather

router = APIRouter()

@router.get("/all")
async def get_all_beacons():
    """Get all NCDXF beacons"""
    beacons = ncdxf_service.get_all_beacons()
    return {
        'beacons': beacons,
        'count': len(beacons),
        'frequency': '14.100 MHz'
    }

@router.get("/active")
async def get_active_beacons():
    """Get currently active beacon (transmitting now)"""
    beacons = ncdxf_service.get_active_beacons()
    return {
        'active': beacons,
        'timestamp': beacons[0].get('last_heard') if beacons else None
    }

@router.get("/heard")
async def get_heard_beacons(
    latitude: float = Query(37.7749, description="Observer latitude"),
    longitude: float = Query(-122.4194, description="Observer longitude")
):
    """Get beacons likely to be heard from a location
    
    Based on distance and current space weather conditions
    """
    # Get current space weather
    try:
        spacewx = await get_current_spaceweather()
        solar_flux = spacewx.get('solar_flux', 150)
        k_index = spacewx.get('k_index', 2)
    except:
        solar_flux = 150
        k_index = 2
    
    # Get beacon status
    status = ncdxf_service.get_beacon_status_summary(latitude, longitude, solar_flux, k_index)
    
    return status

@router.get("/status")
async def get_beacon_status(
    latitude: float = Query(37.7749),
    longitude: float = Query(-122.4194)
):
    """Get beacon propagation status for a location"""
    try:
        spacewx = await get_current_spaceweather()
        solar_flux = spacewx.get('solar_flux', 150)
        k_index = spacewx.get('k_index', 2)
    except:
        solar_flux = 150
        k_index = 2
    
    status = ncdxf_service.get_beacon_status_summary(latitude, longitude, solar_flux, k_index)
    
    return {
        'location': {'latitude': latitude, 'longitude': longitude},
        'propagation': status['propagation_quality'],
        'heard_count': status['heard_count'],
        'maybe_count': status['maybe_count'],
        'total_beacons': len(status['beacons']),
        'solar_flux': solar_flux,
        'k_index': k_index,
        'timestamp': status['timestamp']
    }
