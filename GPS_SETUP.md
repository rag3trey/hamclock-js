# GPS Integration Setup Guide

## Overview
The GPS integration is now complete with full error handling and diagnostics support.

## Features Implemented

### Backend
- **GPS Service** (`backend/app/services/gps.py`)
  - Pure Python GPSD client using sockets
  - No external dependencies (uses standard `socket` module)
  - Connects to GPSD daemon on localhost:2947
  - Reads real-time position, satellite, and accuracy data

- **GPS API Endpoints** (`backend/app/routers/gps.py`)
  - `POST /api/v1/gps/connect` - Connect to GPSD daemon
  - `POST /api/v1/gps/disconnect` - Disconnect from GPSD
  - `GET /api/v1/gps/position` - Get current position
  - `GET /api/v1/gps/status` - Get connection status
  - `GET /api/v1/gps/health` - Diagnostic check (new)
  - `POST /api/v1/gps/enable` / `disable` - Toggle tracking
  - `GET /api/v1/gps/demo` - Demo data (San Francisco)

### Frontend
- **GPS Status Component** (`frontend/src/components/GPSStatus.jsx`)
  - Real-time GPS indicator with 5-second refresh
  - Connect/Disconnect/Demo buttons
  - Expandable details panel showing position, altitude, accuracy, satellites
  - **NEW: Diagnostic troubleshooting panel**
    - Shows GPSD process status (running/not running)
    - Shows GPSD reachability (connected/unreachable)
    - Displays OS-specific installation suggestions

- **HomePage Integration**
  - GPS location automatically updates map center
  - Triggers satellite refresh when GPS provides new location
  - Callback mechanism for location updates

## Testing

### Quick Test (No GPSD Required)
1. Click **"Demo"** button in GPS Status panel
2. Map should center on San Francisco (37.7749°N, 122.4194°W)
3. Satellite list should update for that location

### Full Setup with GPSD

#### macOS (Homebrew)
```bash
# Install GPSD
brew install gpsd

# Start GPSD with your GPS device
# Common USB device paths: /dev/cu.usbserial-*, /dev/cu.usbmodem*
gpsd /dev/cu.usbserial-1420
```

#### Linux (Conda or Package Manager)
```bash
# Option 1: Conda (conda-forge)
conda install conda-forge::gpsd

# Option 2: Package Manager
sudo apt install gpsd

# Start GPSD with your GPS device
gpsd /dev/ttyUSB0
```

#### Test Connection
1. In browser, navigate to app and click **"Connect"**
2. If GPSD not running/reachable:
   - Error message will appear
   - Click **"Show Help"** button
   - Follow suggestions provided
3. Once connected:
   - Green indicator shows GPS is active
   - Details panel shows real-time position
   - Map auto-updates with GPS location

### Troubleshooting

**"Connection failed" with 503 error:**
- GPSD not running
- Solution: See "Full Setup with GPSD" section above
- Use "Show Help" button for diagnostic suggestions

**GPSD running but still can't connect:**
1. Verify GPSD is listening:
   ```bash
   netstat -an | grep 2947
   # or
   lsof -i :2947
   ```

2. Test socket connection:
   ```bash
   telnet localhost 2947
   ```

3. Check GPS device path:
   ```bash
   ls -la /dev/tty* | grep -E '(USB|modem)'
   ```

**No satellite lock:**
- GPS needs clear view of sky
- Some devices take 30+ seconds to lock
- Check satellite count in Details panel
- Check accuracy value (should be < 100m when locked)

## Architecture Notes

### Data Flow
```
GPSD Daemon → Python Socket Connection → GPS Service → FastAPI Router → Frontend API → React Component → Map Display
```

### Error Handling
- **Service Level**: Specific exception handling for socket timeouts and connection errors
- **Router Level**: 503 Service Unavailable status (semantically correct for daemon unavailability)
- **Frontend Level**: Error messages + automatic diagnostics fetching
- **UI Level**: Expandable troubleshooting panel with next steps

### Demo Mode
- No GPSD required
- Returns San Francisco test data
- Useful for UI testing and feature validation
- Button always available even if GPSD unavailable

## Known Limitations
- Requires GPSD daemon to be running (no direct USB connection support)
- GPS accuracy depends on clear sky view
- Updates every 5 seconds (configurable)
- Single GPS source (no fallback to browser geolocation yet)

## Next Steps
- Once GPS working: Test gimbal/antenna tracking
- Radio CAT control integration
- Log GPS track history
