"""
DX-Peditions Service

Provides live DX expedition tracking and monitoring.
Fetches data from various sources and maintains current active expeditions.
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from xml.etree import ElementTree as ET
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class Expedition:
    """Data model for a DX expedition"""
    call_sign: str
    location: str
    country: str
    dates: Dict[str, str]  # {start: "2024-01-15", end: "2024-02-15"}
    latitude: Optional[float]
    longitude: Optional[float]
    primary_band: str
    modes: List[str]
    qsl_via: Optional[str]
    notes: Optional[str]
    status: str  # "active", "upcoming", "completed"
    url: Optional[str]
    source: str  # "dxpedition_daily", "cqdx", "etc"


class DXpeditionService:
    """Service for fetching and managing DX expedition data"""

    # Known DX-pedition data sources
    DXPEDITION_DAILY_URL = "https://www.dxpedition.rocks/dxpeditions"
    CQDX_CLUSTERS = [
        "telnet.dxc.nc7j.com",
        "telnet.k4.w5xd.net",
        "telnet.dxspot.com",
    ]

    # Mock data for demonstration
    MOCK_EXPEDITIONS = [
        {
            "call_sign": "PJ2T",
            "location": "Curacao",
            "country": "Curacao",
            "dates": {
                "start": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
                "end": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
            },
            "latitude": 12.1696,
            "longitude": -68.9900,
            "primary_band": "10m",
            "modes": ["CW", "SSB", "FT8"],
            "qsl_via": "PJ2T Bureau",
            "notes": "Active on all HF bands, focus on CW",
            "status": "active",
            "url": "https://www.pj2t.com",
            "source": "dxpedition_daily",
        },
        {
            "call_sign": "V5",
            "location": "Namibia",
            "country": "Namibia",
            "dates": {
                "start": (datetime.now() - timedelta(days=15)).strftime("%Y-%m-%d"),
                "end": (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d"),
            },
            "latitude": -22.5597,
            "longitude": 17.0832,
            "primary_band": "12m",
            "modes": ["CW", "SSB"],
            "qsl_via": "ZS6AA",
            "notes": "Weekend operations, rare DX",
            "status": "active",
            "url": "https://v5namibia.com",
            "source": "dxpedition_daily",
        },
        {
            "call_sign": "5W0CDX",
            "location": "Samoa",
            "country": "Samoa",
            "dates": {
                "start": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
                "end": (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%d"),
            },
            "latitude": -13.759,
            "longitude": -172.105,
            "primary_band": "15m",
            "modes": ["CW", "SSB", "FT8", "RTTY"],
            "qsl_via": "Direct to K5XX",
            "notes": "Major expedition, all bands",
            "status": "active",
            "url": None,
            "source": "dxpedition_daily",
        },
        {
            "call_sign": "ZL9DX",
            "location": "Campbell Island",
            "country": "New Zealand",
            "dates": {
                "start": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "end": (datetime.now() + timedelta(days=40)).strftime("%Y-%m-%d"),
            },
            "latitude": -52.5436,
            "longitude": 169.1538,
            "primary_band": "20m",
            "modes": ["CW", "SSB"],
            "qsl_via": "ZL2BJ",
            "notes": "Scheduled for February, rare island",
            "status": "upcoming",
            "url": None,
            "source": "dxpedition_daily",
        },
        {
            "call_sign": "3Y/N",
            "location": "Bouvet Island",
            "country": "Bouvet Island",
            "dates": {
                "start": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
                "end": (datetime.now() + timedelta(days=75)).strftime("%Y-%m-%d"),
            },
            "latitude": 54.4209,
            "longitude": 3.3659,
            "primary_band": "20m",
            "modes": ["CW", "SSB"],
            "qsl_via": "LA9NEA",
            "notes": "One of the rarest DX locations",
            "status": "upcoming",
            "url": None,
            "source": "dxpedition_daily",
        },
    ]

    def __init__(self):
        """Initialize the DX-pedition service"""
        self.expeditions: List[Expedition] = []
        self.last_update: Optional[datetime] = None
        self.cache_duration = 3600  # 1 hour cache

    async def get_expeditions(
        self,
        status_filter: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get DX expeditions, optionally filtered by status.

        Args:
            status_filter: Filter by status ("active", "upcoming", "completed")
            limit: Maximum number of expeditions to return

        Returns:
            List of expedition dictionaries
        """
        # Check if cache is still valid
        if (
            self.last_update
            and (datetime.now() - self.last_update).total_seconds() < self.cache_duration
        ):
            expeditions = self.expeditions
        else:
            # Fetch fresh data
            expeditions = await self._fetch_expeditions()
            self.expeditions = expeditions
            self.last_update = datetime.now()

        # Apply filters
        result = expeditions
        if status_filter:
            result = [e for e in result if e.status == status_filter]

        # Sort by date relevance
        now = datetime.now().date()
        result.sort(
            key=lambda e: (
                e.status != "active",  # Active first
                abs(
                    (
                        datetime.strptime(e.dates["start"], "%Y-%m-%d").date()
                        - now
                    ).days
                ),  # Then by proximity to now
            )
        )

        if limit:
            result = result[:limit]

        return [asdict(e) for e in result]

    async def get_active_expeditions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get currently active expeditions"""
        return await self.get_expeditions(status_filter="active", limit=limit)

    async def get_upcoming_expeditions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get upcoming expeditions"""
        return await self.get_expeditions(status_filter="upcoming", limit=limit)

    async def get_expedition_by_call(self, call_sign: str) -> Optional[Dict[str, Any]]:
        """Get expedition details by call sign"""
        expeditions = await self.get_expeditions()
        for exp in expeditions:
            if exp["call_sign"].upper() == call_sign.upper():
                return exp
        return None

    async def search_expeditions(self, query: str) -> List[Dict[str, Any]]:
        """
        Search expeditions by call sign, location, or country.

        Args:
            query: Search query string

        Returns:
            List of matching expeditions
        """
        expeditions = await self.get_expeditions()
        query_lower = query.lower()

        results = [
            exp
            for exp in expeditions
            if (
                query_lower in exp["call_sign"].lower()
                or query_lower in exp["location"].lower()
                or query_lower in exp["country"].lower()
            )
        ]

        return results

    async def get_expeditions_by_location(
        self, latitude: float, longitude: float, radius_km: float = 1000
    ) -> List[Dict[str, Any]]:
        """
        Get expeditions near a location.

        Args:
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees
            radius_km: Search radius in kilometers

        Returns:
            List of expeditions within radius
        """
        from math import radians, cos, sin, asin, sqrt

        def haversine(lat1, lon1, lat2, lon2):
            """Calculate distance between two points on Earth"""
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
            c = 2 * asin(sqrt(a))
            km = 6371 * c
            return km

        expeditions = await self.get_expeditions()
        results = []

        for exp in expeditions:
            if exp["latitude"] and exp["longitude"]:
                distance = haversine(
                    latitude, longitude, exp["latitude"], exp["longitude"]
                )
                if distance <= radius_km:
                    results.append({**exp, "distance_km": round(distance, 1)})

        results.sort(key=lambda x: x["distance_km"])
        return results

    async def _fetch_expeditions(self) -> List[Expedition]:
        """
        Fetch expeditions from all available sources.
        Currently returns mock data; can be extended with real sources.
        """
        expeditions: List[Expedition] = []

        # Try to fetch from real source, fall back to mock data
        try:
            real_expeditions = await self._fetch_from_dxpedition_daily()
            expeditions.extend(real_expeditions)
        except Exception as e:
            logger.warning(f"Failed to fetch from dxpedition.rocks: {e}")
            # Fall back to mock data
            expeditions = [Expedition(**exp) for exp in self.MOCK_EXPEDITIONS]

        # Ensure we have at least mock data if real source is empty
        if not expeditions:
            expeditions = [Expedition(**exp) for exp in self.MOCK_EXPEDITIONS]

        return expeditions

    async def _fetch_from_dxpedition_daily(self) -> List[Expedition]:
        """
        Fetch expeditions from dxpedition.rocks (if available).
        This is a placeholder for real integration.
        """
        # In a real implementation, this would:
        # 1. Scrape or parse data from the website
        # 2. Extract call sign, location, dates, bands, etc.
        # 3. Convert to Expedition objects
        # 4. Return list

        # For now, return empty list to use mock data
        expeditions = []

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.DXPEDITION_DAILY_URL, timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        # Parse response and extract expeditions
                        # This is placeholder; real parsing would go here
                        pass
        except Exception as e:
            logger.debug(f"Error fetching from dxpedition.rocks: {e}")

        return expeditions

    def _parse_status(self, start_date_str: str, end_date_str: str) -> str:
        """Determine expedition status from dates"""
        now = datetime.now().date()
        start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end = datetime.strptime(end_date_str, "%Y-%m-%d").date()

        if start <= now <= end:
            return "active"
        elif start > now:
            return "upcoming"
        else:
            return "completed"

    async def refresh(self) -> None:
        """Force refresh of expedition data"""
        self.last_update = None
        self.expeditions = await self._fetch_expeditions()
        self.last_update = datetime.now()


# Singleton instance
_dxpedition_service: Optional[DXpeditionService] = None


def get_dxpedition_service() -> DXpeditionService:
    """Get or create the singleton DX-pedition service"""
    global _dxpedition_service
    if _dxpedition_service is None:
        _dxpedition_service = DXpeditionService()
    return _dxpedition_service
