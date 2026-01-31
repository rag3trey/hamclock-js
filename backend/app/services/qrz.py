"""
QRZ.com API integration for callsign lookup.
Provides access to QRZ callbook database.
"""

import aiohttp
import asyncio
from typing import Optional, Dict, Any
from functools import lru_cache


class QRZService:
    """Service for QRZ.com callbook lookups."""
    
    _instance: Optional["QRZService"] = None
    QRZ_BASE_URL = "https://xmldata.qrz.com/xml/current/"
    
    def __new__(cls) -> "QRZService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.session_id = None
        self.username = None
        self.password = None
    
    def set_credentials(self, username: str, password: str) -> None:
        """Set QRZ API credentials."""
        self.username = username
        self.password = password
        self.session_id = None  # Clear session to force re-auth
    
    async def _get_session_id(self) -> Optional[str]:
        """Get QRZ session ID. Returns cached ID if still valid."""
        if not self.username or not self.password:
            return None
        
        # Return existing session if available
        if self.session_id:
            return self.session_id
        
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    'username': self.username,
                    'password': self.password,
                    'agent': 'hamclock-py/2.0'
                }
                async with session.get(self.QRZ_BASE_URL, params=params) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        # Parse XML response to extract session ID
                        # Format: <Session><SessionID>...</SessionID></Session>
                        if '<SessionID>' in text:
                            start = text.find('<SessionID>') + 11
                            end = text.find('</SessionID>')
                            self.session_id = text[start:end]
                            return self.session_id
        except Exception as e:
            print(f"Error getting QRZ session: {e}")
        
        return None
    
    async def lookup_callsign(self, callsign: str) -> Optional[Dict[str, Any]]:
        """
        Look up a callsign on QRZ.com.
        
        Returns dict with callsign info or None if not found/error.
        """
        if not callsign or not self.username or not self.password:
            return None
        
        try:
            session_id = await self._get_session_id()
            if not session_id:
                return None
            
            async with aiohttp.ClientSession() as session:
                params = {
                    'session': session_id,
                    'callsign': callsign.upper(),
                    'agent': 'hamclock-py/2.0'
                }
                async with session.get(self.QRZ_BASE_URL, params=params, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        
                        # Check for error
                        if '<Error>' in text:
                            error_start = text.find('<Error>') + 7
                            error_end = text.find('</Error>')
                            error = text[error_start:error_end]
                            if 'not found' in error.lower():
                                return None
                            print(f"QRZ Error: {error}")
                            return None
                        
                        # Parse XML response
                        result = {}
                        fields = [
                            'call', 'name', 'country', 'state', 'county',
                            'grid', 'lat', 'lon', 'class', 'exp',
                            'email', 'web', 'qsl', 'iota', 'image', 'bio'
                        ]
                        
                        for field in fields:
                            pattern = f'<{field}>'
                            if pattern in text:
                                start = text.find(pattern) + len(pattern)
                                end = text.find(f'</{field}>')
                                if start < end:
                                    value = text[start:end].strip()
                                    # Only include non-empty values
                                    if value:
                                        result[field] = value
                        
                        return result if result else None
        except asyncio.TimeoutError:
            print(f"QRZ lookup timeout for {callsign}")
        except Exception as e:
            print(f"Error looking up {callsign}: {e}")
        
        return None
    
    async def lookup_prefix(self, prefix: str) -> Optional[Dict[str, str]]:
        """
        Look up country info by callsign prefix.
        Note: QRZ API doesn't have a dedicated prefix lookup,
        so we use cached data or return None.
        """
        # This would require maintaining a local prefix database
        # For now, we'll return None and let the frontend handle it
        return None


# Global singleton instance
_qrz_service = QRZService()

def get_qrz_service() -> QRZService:
    """Get the global QRZ service instance."""
    return _qrz_service