"""RadioID.net callsign lookup service."""
import aiohttp
from typing import Optional


class RadioIDService:
    """Service for RadioID.net callsign lookups."""
    
    BASE_URL = "https://radioid.net/api/v2"
    
    def __init__(self):
        """Initialize RadioID service."""
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def lookup_callsign(self, callsign: str) -> dict:
        """
        Look up a callsign on RadioID.net.
        
        Args:
            callsign: Callsign to look up
            
        Returns:
            Dictionary with callsign information or empty dict if not found
        """
        try:
            session = await self._get_session()
            url = f"{self.BASE_URL}/user/?callsign={callsign.upper()}"
            
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("response") and len(data["response"]) > 0:
                        user = data["response"][0]
                        return {
                            "found": True,
                            "callsign": user.get("callsign", callsign),
                            "name": user.get("firstname", ""),
                            "surname": user.get("surname", ""),
                            "city": user.get("city", ""),
                            "state": user.get("state", ""),
                            "country": user.get("country", ""),
                            "dmr_id": user.get("id", ""),
                            "radio_id": user.get("id", ""),
                            "source": "RadioID.net"
                        }
                return {"found": False, "source": "RadioID.net"}
        except Exception as e:
            return {
                "found": False,
                "error": str(e),
                "source": "RadioID.net"
            }
    
    async def close(self):
        """Close the aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()


# Global instance
_radioid_service: Optional[RadioIDService] = None


def get_radioid_service() -> RadioIDService:
    """Get or create the global RadioID service instance."""
    global _radioid_service
    if _radioid_service is None:
        _radioid_service = RadioIDService()
    return _radioid_service
