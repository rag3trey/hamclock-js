"""ADIF Log API endpoints"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from typing import Optional
import os
import tempfile
from ..services.adif import adif_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/adif", tags=["ADIF Logs"])


@router.post("/upload")
async def upload_adif_log(file: UploadFile = File(...), name: str = Query("main")):
    """
    Upload an ADIF log file
    
    Args:
        file: ADIF file to upload
        name: Name to store log under (default: "main")
        
    Returns:
        Statistics about the loaded log
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".adi") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            stats = await adif_service.upload_log(tmp_path, name)
            return {
                "success": True,
                "name": name,
                "statistics": stats
            }
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except Exception as e:
        logger.error(f"Error uploading ADIF: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/qsos")
async def get_qsos(
    name: str = Query("main"),
    limit: int = Query(100, ge=1, le=500),
    band: Optional[str] = Query(None),
    mode: Optional[str] = Query(None)
):
    """
    Get QSOs from loaded log
    
    Args:
        name: Log name (default: "main")
        limit: Maximum QSOs to return (1-500)
        band: Filter by band (e.g., "20m")
        mode: Filter by mode (e.g., "CW", "SSB")
        
    Returns:
        List of QSO records
    """
    try:
        qsos = adif_service.get_qsos(name, limit, band, mode)
        return {
            "qsos": qsos,
            "count": len(qsos),
            "log_name": name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/grids")
async def get_worked_grids(name: str = Query("main")):
    """Get worked grid squares from log"""
    try:
        grids = adif_service.get_worked_grids(name)
        return {
            "grids": grids,
            "count": len(grids),
            "log_name": name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/countries")
async def get_worked_countries(name: str = Query("main")):
    """Get worked countries from log"""
    try:
        countries = adif_service.get_worked_countries(name)
        return {
            "countries": countries,
            "count": len(countries),
            "log_name": name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/statistics")
async def get_statistics(name: str = Query("main")):
    """Get statistics from log"""
    try:
        stats = adif_service.get_statistics(name)
        return {
            "statistics": stats,
            "log_name": name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/search")
async def search_qsos(call: str, name: str = Query("main")):
    """
    Search QSOs by callsign
    
    Args:
        call: Callsign to search for
        name: Log name
        
    Returns:
        Matching QSO records
    """
    try:
        qsos = adif_service.search_qsos(call, name)
        return {
            "search": call,
            "qsos": qsos,
            "count": len(qsos),
            "log_name": name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
