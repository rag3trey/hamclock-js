"""
CAT Control API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

# Lazy import of serial tools
def get_available_ports():
    """Get available serial ports"""
    try:
        import serial.tools.list_ports
        return list(serial.tools.list_ports.comports())
    except ImportError:
        return []

from ..services.cat import cat_service

router = APIRouter()


@router.get("/ports")
async def get_available_ports_endpoint():
    """List available serial ports for CAT connection"""
    ports = []
    try:
        port_list = get_available_ports()
        for port in port_list:
            ports.append({
                "port": port.device,
                "description": port.description,
                "manufacturer": port.manufacturer,
            })
    except Exception as e:
        print(f"CAT: Error listing ports: {e}")
    
    return {
        "ports": ports,
        "count": len(ports)
    }


@router.post("/connect")
async def connect_cat(
    port: str = Query(..., description="Serial port (e.g., /dev/ttyUSB0 or COM3)"),
    radio_model: str = Query("kenwood", description="Radio model: kenwood, yaesu, or icom"),
    baudrate: int = Query(9600, description="Serial baud rate")
):
    """Connect to radio via CAT interface"""
    try:
        if cat_service.connect(port, radio_model, baudrate):
            status = cat_service.get_status()
            return {
                "status": "connected",
                "radio": status["radio_model"],
                "port": status["port"],
                "frequency_mhz": status["frequency_mhz"],
                "mode": status["mode"],
                "power": status["power"],
            }
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to connect to radio on {port}. Check port and radio power."
            )
    except Exception as e:
        print(f"CAT connect error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"CAT connection failed: {str(e)}"
        )


@router.post("/disconnect")
async def disconnect_cat():
    """Disconnect from radio"""
    cat_service.disconnect()
    return {
        "status": "disconnected",
        "message": "Disconnected from radio"
    }


@router.get("/status")
async def get_cat_status():
    """Get current radio status"""
    if not cat_service.connected:
        return {
            "connected": False,
            "message": "Not connected to radio"
        }
    
    try:
        status = cat_service.get_status()
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading radio status: {str(e)}"
        )


@router.get("/frequency")
async def get_frequency():
    """Get current frequency (Hz)"""
    if not cat_service.connected:
        raise HTTPException(status_code=503, detail="Radio not connected")
    
    freq_hz = cat_service.get_frequency()
    return {
        "frequency_hz": freq_hz,
        "frequency_mhz": freq_hz / 1_000_000,
    }


@router.post("/frequency")
async def set_frequency(frequency_hz: int = Query(..., description="Frequency in Hz")):
    """Set frequency (Hz)"""
    if not cat_service.connected:
        raise HTTPException(status_code=503, detail="Radio not connected")
    
    if cat_service.set_frequency(frequency_hz):
        return {
            "status": "success",
            "frequency_hz": frequency_hz,
            "frequency_mhz": frequency_hz / 1_000_000,
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to set frequency")


@router.get("/mode")
async def get_mode():
    """Get current mode"""
    if not cat_service.connected:
        raise HTTPException(status_code=503, detail="Radio not connected")
    
    mode = cat_service.get_mode()
    return {
        "mode": mode,
        "available_modes": ["LSB", "USB", "CW", "FM", "AM", "FSK"]
    }


@router.post("/mode")
async def set_mode(mode: str = Query(..., description="Mode: LSB, USB, CW, FM, AM, FSK")):
    """Set mode"""
    if not cat_service.connected:
        raise HTTPException(status_code=503, detail="Radio not connected")
    
    if cat_service.set_mode(mode):
        return {
            "status": "success",
            "mode": mode,
        }
    else:
        raise HTTPException(status_code=400, detail=f"Invalid mode: {mode}")


@router.get("/power")
async def get_power():
    """Get current power level"""
    if not cat_service.connected:
        raise HTTPException(status_code=503, detail="Radio not connected")
    
    power = cat_service.get_power()
    return {
        "power": power,
        "unit": "watts or 0-100"
    }


@router.post("/power")
async def set_power(power: int = Query(..., description="Power level (0-100 or watts)")):
    """Set power level"""
    if not cat_service.connected:
        raise HTTPException(status_code=503, detail="Radio not connected")
    
    if cat_service.set_power(power):
        return {
            "status": "success",
            "power": power,
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid power level")


@router.get("/bands")
async def get_ham_bands():
    """Get common ham radio bands with frequencies"""
    return {
        "bands": [
            {"name": "160m", "freq_mhz": 1.8, "start": 1800000, "end": 2000000},
            {"name": "80m", "freq_mhz": 3.5, "start": 3500000, "end": 4000000},
            {"name": "60m", "freq_mhz": 5.3, "start": 5330000, "end": 5405000},
            {"name": "40m", "freq_mhz": 7.0, "start": 7000000, "end": 7300000},
            {"name": "30m", "freq_mhz": 10.1, "start": 10100000, "end": 10150000},
            {"name": "20m", "freq_mhz": 14.0, "start": 14000000, "end": 14350000},
            {"name": "17m", "freq_mhz": 18.1, "start": 18068000, "end": 18168000},
            {"name": "15m", "freq_mhz": 21.0, "start": 21000000, "end": 21450000},
            {"name": "12m", "freq_mhz": 24.9, "start": 24890000, "end": 24990000},
            {"name": "10m", "freq_mhz": 28.0, "start": 28000000, "end": 29700000},
            {"name": "6m", "freq_mhz": 50.0, "start": 50000000, "end": 54000000},
            {"name": "2m", "freq_mhz": 144.0, "start": 144000000, "end": 148000000},
            {"name": "70cm", "freq_mhz": 432.0, "start": 420000000, "end": 450000000},
            {"name": "23cm", "freq_mhz": 1240.0, "start": 1240000000, "end": 1300000000},
        ]
    }
