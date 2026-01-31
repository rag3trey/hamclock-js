"""Band Conditions API endpoints"""
from fastapi import APIRouter, Query
from typing import Optional
from ..services.band_conditions import band_conditions_service
from .spaceweather import get_current_spaceweather

router = APIRouter()

@router.get("/bands")
async def get_band_conditions():
    """Get current band conditions based on space weather
    
    Returns:
        Dictionary of band conditions indexed by band name
    """
    # Get current space weather
    spacewx = await get_current_spaceweather()
    
    # Calculate band conditions
    conditions = band_conditions_service.calculate_conditions(
        solar_flux=spacewx['solar_flux'],
        k_index=spacewx['k_index'],
        a_index=spacewx['a_index']
    )
    
    return {
        'bands': conditions,
        'solar_flux': spacewx['solar_flux'],
        'k_index': spacewx['k_index'],
        'a_index': spacewx['a_index'],
        'timestamp': spacewx['timestamp']
    }

@router.get("/bands/{band_name}")
async def get_band_condition(band_name: str):
    """Get condition for a specific band
    
    Args:
        band_name: Band identifier (e.g., "20m", "40m")
    
    Returns:
        Band condition data
    """
    # Get current space weather
    spacewx = await get_current_spaceweather()
    
    # Calculate all conditions
    conditions = band_conditions_service.calculate_conditions(
        solar_flux=spacewx['solar_flux'],
        k_index=spacewx['k_index'],
        a_index=spacewx['a_index']
    )
    
    if band_name not in conditions:
        return {'error': f'Band {band_name} not found'}
    
    return conditions[band_name]
