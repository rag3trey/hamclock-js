"""Background task manager for periodic data updates and broadcasting"""
import asyncio
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class BackgroundTaskManager:
    def __init__(self):
        self.tasks = []
        self.ws_manager = None  # Set by main.py
        self.update_intervals = {
            'spaceweather': 300,  # 5 minutes
            'satellites': 60,      # 1 minute
        }
    
    async def start(self):
        """Start background tasks"""
        print("🔄 Starting background tasks...")
        
        # Start space weather update task
        self.tasks.append(asyncio.create_task(self._spaceweather_update_loop()))
        
        # Start satellite update task (if location is available)
        self.tasks.append(asyncio.create_task(self._satellite_update_loop()))
    
    async def _spaceweather_update_loop(self):
        """Periodically fetch and broadcast space weather updates"""
        if not self.ws_manager:
            return
        
        try:
            from .spaceweather import spaceweather_service
            
            while True:
                try:
                    logger.debug("Fetching space weather data...")
                    data = await spaceweather_service.get_current_conditions()
                    
                    # Broadcast to connected clients
                    await self.ws_manager.broadcast({
                        "type": "spaceweather_update",
                        "data": data
                    }, channel="spaceweather")
                    
                    logger.debug("Broadcasted space weather update")
                except Exception as e:
                    logger.error(f"Error fetching space weather: {e}")
                
                # Wait for next update
                await asyncio.sleep(self.update_intervals['spaceweather'])
        except Exception as e:
            logger.error(f"Space weather update loop error: {e}")
    
    async def _satellite_update_loop(self):
        """Periodically fetch and broadcast satellite passes"""
        if not self.ws_manager:
            return
        
        try:
            from .satellites import SatelliteService
            from .settings import get_settings_service
            
            sat_service = SatelliteService()
            settings_service = get_settings_service()
            
            while True:
                try:
                    settings = settings_service.get_settings()
                    
                    # Only broadcast if DE location is set
                    if settings.de_latitude and settings.de_longitude:
                        logger.debug("Fetching visible satellites...")
                        
                        # Get visible satellites
                        visible_sats = sat_service.get_visible_satellites(
                            settings.de_latitude,
                            settings.de_longitude,
                            min_elevation=settings.elevation_angle_default,
                            lookahead_hours=settings.satellite_lookahead_hours
                        )
                        
                        # Broadcast to connected clients
                        await self.ws_manager.broadcast({
                            "type": "satellites_update",
                            "data": visible_sats
                        }, channel="satellites")
                        
                        logger.debug(f"Broadcasted {len(visible_sats)} visible satellites")
                except Exception as e:
                    logger.error(f"Error fetching satellites: {e}")
                
                # Wait for next update
                await asyncio.sleep(self.update_intervals['satellites'])
        except Exception as e:
            logger.error(f"Satellite update loop error: {e}")
    
    async def stop(self):
        """Stop background tasks"""
        print("🛑 Stopping background tasks...")
        for task in self.tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
