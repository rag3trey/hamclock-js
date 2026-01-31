"""
Service for fetching SOTA (Summits On The Air) and POTA (Parks On The Air) activations
"""

import aiohttp
import ssl
import logging
from datetime import datetime, timedelta
from typing import Optional, List

logger = logging.getLogger(__name__)

# SOTA API: https://api.sota.org.uk/docs
SOTA_API_URL = "https://api.sota.org.uk/api"

# POTA API: https://api.pota.app/
POTA_API_URL = "https://api.pota.app/api"

# Create SSL context that doesn't verify certificates (for problematic external APIs)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE


async def get_sota_activations() -> List[dict]:
    """
    Fetch recent SOTA activations
    Returns list of activations with callsign, summit, coordinates, etc.
    """
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            # Get recent activations (last 24 hours)
            url = f"{SOTA_API_URL}/activators/all"
            logger.info(f"Fetching SOTA from {url}")
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), ssl=False) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    activators = data.get('activators', []) if isinstance(data, dict) else data
                    
                    logger.info(f"SOTA returned {len(activators) if activators else 0} activators")
                    
                    # Parse activations
                    activations = []
                    for activator in (activators if isinstance(activators, list) else []):
                        try:
                            summit_code = activator.get('activationCode') or activator.get('summitCode') or activator.get('reference', '')
                            callsign = activator.get('activatorCallSign') or activator.get('callsign', '')
                            
                            if summit_code and callsign:
                                # Get summit details
                                summit = await _get_sota_summit_details(session, summit_code)
                                if summit and summit.get('latitude') and summit.get('longitude'):
                                    activations.append({
                                        'type': 'SOTA',
                                        'callsign': callsign,
                                        'latitude': float(summit.get('latitude', 0)),
                                        'longitude': float(summit.get('longitude', 0)),
                                        'name': summit.get('summitName', summit_code),
                                        'reference': summit_code,
                                        'altitude': summit.get('altitudeMeters', 0),
                                        'frequency': activator.get('frequency', 0),
                                        'mode': activator.get('mode', 'SSB'),
                                        'status': 'Active',
                                        'activator': callsign,
                                        'timestamp': datetime.now().isoformat()
                                    })
                        except Exception as e:
                            logger.warning(f"Error parsing SOTA activation: {e}")
                            continue
                    
                    logger.info(f"SOTA parsed {len(activations)} valid activations")
                    return activations
                else:
                    logger.warning(f"SOTA API returned status {resp.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching SOTA activations: {e}")
        return []


async def _get_sota_summit_details(session: aiohttp.ClientSession, summit_code: str) -> Optional[dict]:
    """Get details for a specific SOTA summit"""
    try:
        url = f"{SOTA_API_URL}/summits/{summit_code}"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5), ssl=False) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data if isinstance(data, dict) else data.get('summit')
    except Exception as e:
        logger.warning(f"Error fetching SOTA summit details for {summit_code}: {e}")
    return None


async def get_pota_activations() -> List[dict]:
    """
    Fetch recent POTA activations
    Returns list of activations with callsign, park, coordinates, etc.
    """
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            # Try the standard endpoint first
            url = f"{POTA_API_URL}/activators/active"
            logger.info(f"Fetching POTA from {url}")
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), ssl=False) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    activators = data.get('activators', []) if isinstance(data, dict) else data
                    
                    logger.info(f"POTA returned {len(activators) if activators else 0} activators")
                    
                    activations = []
                    for activator in (activators if isinstance(activators, list) else []):
                        try:
                            park_code = activator.get('reference') or activator.get('parkCode', '')
                            callsign = activator.get('activator') or activator.get('callsign', '')
                            
                            if park_code and callsign:
                                park = await _get_pota_park_details(session, park_code)
                                if park and park.get('latitude') and park.get('longitude'):
                                    activations.append({
                                        'type': 'POTA',
                                        'callsign': callsign,
                                        'latitude': float(park.get('latitude', 0)),
                                        'longitude': float(park.get('longitude', 0)),
                                        'name': park.get('name', park_code),
                                        'reference': park_code,
                                        'state': park.get('state', ''),
                                        'frequency': activator.get('frequency', 0),
                                        'mode': activator.get('mode', 'SSB'),
                                        'status': 'Active',
                                        'activator': callsign,
                                        'timestamp': datetime.now().isoformat()
                                    })
                        except Exception as e:
                            logger.warning(f"Error parsing POTA activation: {e}")
                            continue
                    
                    logger.info(f"POTA parsed {len(activations)} valid activations")
                    return activations
                elif resp.status == 403:
                    logger.warning(f"POTA API returned 403 - endpoint may have changed or require auth")
                    return []
                else:
                    logger.warning(f"POTA API returned status {resp.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching POTA activations: {e}")
        return []


async def _get_pota_park_details(session: aiohttp.ClientSession, park_code: str) -> Optional[dict]:
    """Get details for a specific POTA park"""
    try:
        url = f"{POTA_API_URL}/parks/{park_code}"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5), ssl=False) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data if isinstance(data, dict) else data.get('park')
    except Exception as e:
        logger.warning(f"Error fetching POTA park details for {park_code}: {e}")
    return None


async def get_all_activations() -> List[dict]:
    """
    Fetch both SOTA and POTA activations
    Returns combined list sorted by timestamp
    """
    sota_activations = await get_sota_activations()
    pota_activations = await get_pota_activations()
    
    logger.info(f"Total activations: {len(sota_activations)} SOTA + {len(pota_activations)} POTA")
    
    all_activations = sota_activations + pota_activations
    # Sort by timestamp, most recent first
    all_activations.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    return all_activations
