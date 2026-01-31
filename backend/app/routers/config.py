"""Configuration API endpoints"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_config():
    """Get current configuration"""
    return {"message": "Config endpoint"}
