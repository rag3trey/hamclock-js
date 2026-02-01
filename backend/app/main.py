"""
HamClock FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import asyncio
import json
from typing import List, Optional

from .config import settings
from .routers import astronomy, satellites, spaceweather, dxcluster, config, maps, band_conditions, ncdxf, psk_reporter, maidenhead, qrz, activations, gps, cat, gimbal, contests
from .routers import settings as settings_router
from .services.websocket_manager import WebSocketManager
from .services.background_tasks import BackgroundTaskManager

# WebSocket manager
ws_manager = WebSocketManager()
bg_tasks = BackgroundTaskManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting HamClock API Server...")
    
    # Start background tasks
    bg_tasks.ws_manager = ws_manager  # Set ws_manager for broadcasting
    asyncio.create_task(bg_tasks.start())
    
    # Initialize astronomy data in background (don't block startup)
    async def init_astronomy():
        try:
            from .routers import astronomy
            await astronomy.astro_service.initialize()
            print("✅ Astronomy service initialized")
        except Exception as e:
            print(f"⚠️  Astronomy initialization failed (non-critical): {e}")
    
    asyncio.create_task(init_astronomy())
    
    # Initialize satellite data in background (don't block startup)
    async def init_satellites():
        try:
            from .routers import satellites
            await satellites.sat_service.update_tles()
            print("✅ Satellite TLEs updated")
        except Exception as e:
            print(f"⚠️  Satellite update failed (non-critical): {e}")
    
    asyncio.create_task(init_satellites())
    
    # Start DX Cluster connection in background (don't block startup)
    async def start_dxcluster():
        try:
            from .services.dxcluster import dxcluster_service
            dxcluster_service.ws_manager = ws_manager
            asyncio.create_task(dxcluster_service.start())
            print("✅ DX Cluster started")
        except Exception as e:
            print(f"⚠️  DX Cluster startup failed (non-critical): {e}")
    
    asyncio.create_task(start_dxcluster())
    
    print("✅ HamClock API Server ready!")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down HamClock API Server...")
    await bg_tasks.stop()


# Create FastAPI app
app = FastAPI(
    title="HamClock API",
    description="Amateur Radio Clock and Information Display API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(astronomy.router, prefix="/api/v1/astronomy", tags=["Astronomy"])
app.include_router(satellites.router, prefix="/api/v1/satellites", tags=["Satellites"])
app.include_router(spaceweather.router, prefix="/api/v1/spaceweather", tags=["Space Weather"])
app.include_router(band_conditions.router, prefix="/api/v1/band-conditions", tags=["Band Conditions"])
app.include_router(ncdxf.router, prefix="/api/v1/ncdxf", tags=["NCDXF Beacons"])
app.include_router(psk_reporter.router, prefix="/api/v1/psk-reporter", tags=["PSK Reporter"])
app.include_router(dxcluster.router, prefix="/api/v1/dxcluster", tags=["DX Cluster"])
app.include_router(activations.router, tags=["On The Air"])
app.include_router(maidenhead.router, tags=["Maidenhead Grid"])
app.include_router(qrz.router, prefix="/api/v1", tags=["QRZ Callbook"])
app.include_router(gps.router, prefix="/api/v1/gps", tags=["GPS"])
app.include_router(cat.router, prefix="/api/v1/cat", tags=["CAT Control"])
app.include_router(gimbal.router, prefix="/api/v1/gimbal", tags=["Antenna Tracking"])
app.include_router(contests.router, tags=["Contests"])
app.include_router(settings_router.router, prefix="/api/v1", tags=["Settings"])
app.include_router(config.router, prefix="/api/v1/config", tags=["Configuration"])
app.include_router(maps.router, prefix="/api/v1/maps", tags=["Maps"])


@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "ws_connections": len(ws_manager.active_connections)
    }
    """API root endpoint"""
    return {
        "name": "HamClock API",
        "version": "2.0.0",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "docs": "/docs",
            "astronomy": "/api/v1/astronomy",
            "satellites": "/api/v1/satellites",
            "spaceweather": "/api/v1/spaceweather",
            "band_conditions": "/api/v1/band-conditions",
            "ncdxf": "/api/v1/ncdxf",
            "psk_reporter": "/api/v1/psk-reporter",
            "dxcluster": "/api/v1/dxcluster",
            "maidenhead": "/api/v1/maidenhead",
            "websocket": "/ws"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time updates
    
    Streams:
    - DX spots
    - Space weather updates
    - Satellite position updates
    """
    await ws_manager.connect(websocket)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle subscription requests
            if message.get("action") == "subscribe" or message.get("type") == "subscribe":
                channel = message.get("channel")
                await ws_manager.subscribe(websocket, channel)
                await websocket.send_json({
                    "type": "subscribed",
                    "channel": channel,
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif message.get("action") == "unsubscribe" or message.get("type") == "unsubscribe":
                channel = message.get("channel")
                await ws_manager.unsubscribe(websocket, channel)
                await websocket.send_json({
                    "type": "unsubscribed",
                    "channel": channel,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.get("/api/v1/ws/status")
async def ws_status():
    """Get WebSocket connection status"""
    return {
        "total_connections": len(ws_manager.active_connections),
        "active_channels": ws_manager.get_active_channels(),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )
