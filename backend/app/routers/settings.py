"""
Settings API endpoints for user preferences management.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services.settings import SettingsService, UserSettings
from ..services.qrz import get_qrz_service
from ..services.radioid import get_radioid_service

router = APIRouter(prefix="/settings", tags=["Settings"])
settings_service = SettingsService()


class UpdateSettingsRequest(BaseModel):
    """Request model for updating settings."""
    de_latitude: Optional[float] = None
    de_longitude: Optional[float] = None
    de_location_name: Optional[str] = None
    theme: Optional[str] = None
    time_format: Optional[str] = None
    elevation_angle_default: Optional[int] = None
    satellite_lookahead_hours: Optional[int] = None
    units: Optional[str] = None


class QRZCredentialsRequest(BaseModel):
    """Request model for QRZ credentials."""
    username: str
    api_key: str


class DELocationRequest(BaseModel):
    """Request model for DE location."""
    latitude: float
    longitude: float
    name: Optional[str] = None


@router.get("/", response_model=UserSettings)
async def get_settings():
    """Get all user settings."""
    return settings_service.get_settings()


@router.post("/", response_model=UserSettings)
async def update_settings(request: UpdateSettingsRequest):
    """Update user settings."""
    try:
        return settings_service.update_settings(**request.dict(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update settings: {str(e)}")


@router.post("/de-location", response_model=UserSettings)
async def set_de_location(request: DELocationRequest):
    """Set DE (home) location."""
    if request.latitude < -90 or request.latitude > 90:
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if request.longitude < -180 or request.longitude > 180:
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")

    settings_service.set_de_location(
        request.latitude, request.longitude, request.name
    )
    return settings_service.get_settings()


@router.get("/de-location")
async def get_de_location():
    """Get DE (home) location."""
    location = settings_service.get_de_location()
    if not location:
        raise HTTPException(status_code=404, detail="DE location not configured")
    return location


@router.post("/qrz-credentials", response_model=UserSettings)
async def set_qrz_credentials(request: QRZCredentialsRequest):
    """Set QRZ API credentials."""
    if not request.username or not request.api_key:
        raise HTTPException(status_code=400, detail="Username and API key required")

    settings_service.set_qrz_credentials(request.username, request.api_key)
    
    # Sync credentials to QRZ service
    try:
        from ..services.qrz import QRZService
        qrz_service = QRZService()
        qrz_service.set_credentials(request.username, request.api_key)
    except Exception as e:
        print(f"Warning: Could not sync QRZ credentials to service: {e}")
    
    return settings_service.get_settings()


@router.get("/qrz-status")
async def get_qrz_status():
    """Check if QRZ credentials are configured."""
    creds = settings_service.get_qrz_credentials()
    return {"configured": creds is not None}


@router.post("/theme/{theme}", response_model=UserSettings)
async def set_theme(theme: str):
    """Set UI theme (dark or light)."""
    if theme not in ("dark", "light"):
        raise HTTPException(status_code=400, detail="Theme must be 'dark' or 'light'")

    settings_service.set_theme(theme)
    return settings_service.get_settings()


@router.post("/time-format/{format}", response_model=UserSettings)
async def set_time_format(format: str):
    """Set time format (24h or 12h)."""
    if format not in ("24h", "12h"):
        raise HTTPException(status_code=400, detail="Format must be '24h' or '12h'")

    settings_service.set_time_format(format)
    return settings_service.get_settings()


@router.post("/units/{units}", response_model=UserSettings)
async def set_units(units: str):
    """Set units (metric or imperial)."""
    if units not in ("metric", "imperial"):
        raise HTTPException(status_code=400, detail="Units must be 'metric' or 'imperial'")

    settings_service.set_units(units)
    return settings_service.get_settings()


@router.post("/callsign/{callsign}", response_model=UserSettings)
async def set_callsign(callsign: str):
    """Set amateur radio callsign."""
    if not callsign or len(callsign) == 0:
        raise HTTPException(status_code=400, detail="Callsign cannot be empty")
    
    # Validate callsign format (basic: 1-6 alphanumeric characters, can include /)
    if not all(c.isalnum() or c == '/' for c in callsign.upper()):
        raise HTTPException(status_code=400, detail="Callsign must contain only letters, numbers, and /")
    
    settings_service.update_settings(callsign=callsign.upper())
    return settings_service.get_settings()


@router.get("/callsign")
async def get_callsign():
    """Get the configured amateur radio callsign."""
    settings = settings_service.get_settings()
    return {"callsign": settings.callsign}


@router.post("/reset", response_model=UserSettings)
async def reset_settings():
    """Reset all settings to defaults."""
    return settings_service.reset_to_defaults()

@router.post("/lookup-callsign/{callsign}")
async def lookup_callsign(callsign: str):
    """
    Look up a callsign using the configured service.
    Uses RadioID.net by default, or QRZ if configured and credentials are set.
    """
    settings = settings_service.get_settings()
    service = settings.callsign_lookup_service or "radioid"
    
    try:
        if service == "qrz" and settings.qrz_username and settings.qrz_api_key:
            qrz_service = get_qrz_service()
            qrz_service.set_credentials(settings.qrz_username, settings.qrz_api_key)
            return await qrz_service.lookup_callsign(callsign)
        else:
            # Default to RadioID.net
            radioid_service = get_radioid_service()
            return await radioid_service.lookup_callsign(callsign)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))