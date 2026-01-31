"""
GPS API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.gps import gps_service

router = APIRouter()


@router.post("/connect")
async def connect_gps(
    host: str = Query("localhost", description="GPSD host"),
    port: int = Query(2947, description="GPSD port")
):
    """Connect to GPSD daemon"""
    try:
        gps_service.host = host
        gps_service.port = port
        
        if gps_service.connect():
            return {
                "status": "connected",
                "host": host,
                "port": port,
                "message": "Successfully connected to GPSD"
            }
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to connect to GPSD at {host}:{port}. Ensure GPSD is running: 'gpsd /dev/ttyUSB0' or check your GPS device path."
            )
    except Exception as e:
        print(f"GPS connect error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"GPSD connection failed: {str(e)}. Make sure GPSD daemon is running on {host}:{port}"
        )



@router.get("/health")
async def gps_health():
    """Check if GPSD is available and diagnose connection issues"""
    import socket
    import subprocess
    import platform
    
    diagnostics = {
        "gpsd_running": False,
        "gpsd_reachable": False,
        "system": platform.system(),
        "suggestions": []
    }
    
    # Check if GPSD process is running
    try:
        if platform.system() == "Darwin":  # macOS
            result = subprocess.run(['pgrep', '-x', 'gpsd'], capture_output=True)
            diagnostics["gpsd_running"] = result.returncode == 0
        else:  # Linux
            result = subprocess.run(['pgrep', '-x', 'gpsd'], capture_output=True)
            diagnostics["gpsd_running"] = result.returncode == 0
    except:
        pass
    
    # Check if GPSD is reachable
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        sock.connect(('localhost', 2947))
        diagnostics["gpsd_reachable"] = True
        sock.close()
    except Exception as e:
        diagnostics["error"] = str(e)
        diagnostics["suggestions"].append("GPSD is not listening on localhost:2947")
        diagnostics["suggestions"].append("Start GPSD with: gpsd /dev/ttyUSB0")
    
    if not diagnostics["gpsd_running"]:
        diagnostics["suggestions"].append("GPSD process not found. Install and start it:")
        if platform.system() == "Darwin":
            diagnostics["suggestions"].append("  brew install gpsd")
        else:
            diagnostics["suggestions"].append("  sudo apt install gpsd")
        diagnostics["suggestions"].append("Then run: gpsd /dev/ttyUSB0  (or your GPS device)")
    
    if not gps_service.connected:
        diagnostics["suggestions"].append("GPS Service not connected. Click 'Connect' in the UI")
    
    return diagnostics


@router.post("/disconnect")
async def disconnect_gps():
    """Disconnect from GPSD daemon"""
    gps_service.disconnect()
    return {
        "status": "disconnected",
        "message": "Disconnected from GPSD"
    }


@router.get("/position")
async def get_gps_position():
    """Get current GPS position"""
    if not gps_service.enabled:
        return {
            "position": None,
            "message": "GPS is disabled"
        }
    
    position = gps_service.get_current_position()
    
    if position:
        return {
            "position": {
                "latitude": position['latitude'],
                "longitude": position['longitude'],
                "altitude": position.get('altitude', 0),
                "accuracy_m": position.get('accuracy'),
                "timestamp": position.get('timestamp')
            },
            "satellites": position.get('satellites', 0),
            "mode": position.get('mode', 0),  # 0=no fix, 2=2D, 3=3D
            "speed_mps": position.get('speed', 0),
            "track_deg": position.get('track', 0),
        }
    else:
        raise HTTPException(
            status_code=503,
            detail="GPS not connected or no fix available. Ensure GPSD is running and GPS has satellite lock."
        )


@router.get("/status")
async def get_gps_status():
    """Get GPS connection status and diagnostics"""
    return gps_service.get_status()


@router.post("/enable")
async def enable_gps():
    """Enable GPS tracking"""
    gps_service.enabled = True
    return {
        "status": "enabled",
        "message": "GPS tracking enabled"
    }


@router.post("/disable")
async def disable_gps():
    """Disable GPS tracking"""
    gps_service.enabled = False
    return {
        "status": "disabled",
        "message": "GPS tracking disabled"
    }


@router.get("/demo")
async def get_demo_gps_position():
    """Get demo GPS position for testing (San Francisco)"""
    return {
        "position": {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "altitude": 52,
            "accuracy_m": 5.0,
            "timestamp": "2026-01-30T00:00:00Z"
        },
        "satellites": 12,
        "mode": 3,
        "speed_mps": 0.0,
        "track_deg": 0.0,
        "source": "demo"
    }
