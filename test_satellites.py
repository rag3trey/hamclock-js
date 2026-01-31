#!/usr/bin/env python3
"""Quick test of satellite service"""

import asyncio
from backend.app.services.satellites import SatelliteService

async def test_satellites():
    service = SatelliteService()
    
    print("Testing Satellite Service")
    print("=" * 60)
    
    # List available satellites
    sats = service.list_satellites()
    print(f"\n✅ Available satellites: {len(sats)}")
    for sat in sats:
        print(f"  - {sat['name']}")
    
    # Try to get a satellite
    if sats:
        sat_name = sats[0]['name']
        print(f"\n Testing satellite lookup: {sat_name}")
        
        # Get position
        try:
            pos = service.get_satellite_position(sat_name, 37.7749, -122.4194)
            print(f"  Position: Az {pos['position']['azimuth']:.1f}°, El {pos['position']['elevation']:.1f}°")
        except Exception as e:
            print(f"  Error: {e}")
        
        # Get passes
        try:
            passes = service.calculate_passes(sat_name, 37.7749, -122.4194, hours=24, min_elevation=10)
            print(f"  Passes in next 24h: {len(passes)}")
            if passes:
                print(f"    First pass: {passes[0]['aos']['time']}")
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == '__main__':
    asyncio.run(test_satellites())
