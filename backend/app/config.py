"""
Configuration settings for HamClock API
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "HamClock API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    
    # Database
    DATABASE_URL: str = "postgresql://hamclock:hamclock@localhost:5432/hamclock"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # API Keys (optional, for external services)
    NOAA_API_KEY: str = ""
    CELESTRAK_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    
    # DX Cluster
    DX_CLUSTER_HOST: str = "dxc.nc7j.com"
    DX_CLUSTER_PORT: int = 7373
    
    # Satellite TLE Update
    TLE_UPDATE_INTERVAL: int = 86400  # 24 hours in seconds
    CELESTRAK_TLE_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle"
    CELESTRAK_SUPPLEMENTAL_TLE_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle"
    
    # Space Weather Update
    SPACEWX_UPDATE_INTERVAL: int = 300  # 5 minutes
    NOAA_SPACEWX_URL: str = "https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json"
    
    # Cache TTL (seconds)
    CACHE_TTL_SHORT: int = 60  # 1 minute
    CACHE_TTL_MEDIUM: int = 300  # 5 minutes
    CACHE_TTL_LONG: int = 3600  # 1 hour
    
    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
