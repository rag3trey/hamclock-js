"""
QRZ API endpoints for callsign lookup.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..services.qrz import QRZService

router = APIRouter(prefix="/qrz", tags=["QRZ Callbook"])
qrz_service = QRZService()


class CallsignLookupResponse(BaseModel):
    """Response model for callsign lookup."""
    found: bool
    callsign: Optional[str] = None
    name: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    county: Optional[str] = None
    grid: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_class: Optional[str] = None
    expires: Optional[str] = None
    email: Optional[str] = None
    web: Optional[str] = None
    qsl: Optional[str] = None
    iota: Optional[str] = None


@router.get("/lookup", response_model=CallsignLookupResponse)
async def lookup_callsign(callsign: str = Query(..., min_length=1, max_length=10)):
    """
    Look up a callsign in the QRZ database.
    
    Requires QRZ credentials to be configured in settings.
    """
    try:
        result = await qrz_service.lookup_callsign(callsign)
        
        if result:
            # Convert coordinate strings to floats if present
            lat = None
            lon = None
            try:
                if 'lat' in result:
                    lat = float(result.get('lat'))
                if 'lon' in result:
                    lon = float(result.get('lon'))
            except (ValueError, TypeError):
                pass
            
            return CallsignLookupResponse(
                found=True,
                callsign=result.get('call'),
                name=result.get('name'),
                country=result.get('country'),
                state=result.get('state'),
                county=result.get('county'),
                grid=result.get('grid'),
                latitude=lat,
                longitude=lon,
                license_class=result.get('class'),
                expires=result.get('exp'),
                email=result.get('email'),
                web=result.get('web'),
                qsl=result.get('qsl'),
                iota=result.get('iota'),
            )
        else:
            return CallsignLookupResponse(found=False)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QRZ lookup failed: {str(e)}")


@router.post("/set-credentials")
async def set_qrz_credentials(username: str = Query(...), password: str = Query(...)):
    """
    Set QRZ API credentials (typically from settings).
    This is called internally by the settings service.
    """
    try:
        qrz_service.set_credentials(username, password)
        return {"status": "credentials set"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to set credentials: {str(e)}")


@router.get("/status")
async def get_status():
    """Check if QRZ service is available and configured."""
    has_creds = qrz_service.username is not None and qrz_service.password is not None
    return {
        "configured": has_creds,
        "has_session": qrz_service.session_id is not None,
    }
