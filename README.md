# HamClock-js - Amateur Radio Clock & Information Display

A modern web-based rewrite of ESPHamClock using **Python FastAPI** backend and **JavaScript/React** frontend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)

## 🎯 Features

- **Real-time World Map** with customizable projections (Mercator, Azimuthal, Robinson)
  - Multiple grid overlay options: Lat/Lng, Maidenhead Locator, CQ Zones, ITU Regions
  - Range rings and night shade overlay
  - Satellite positions and trails
  - Great circle path visualization
- **Satellite Tracking** with SGP4/SDP4 orbit propagation and pass predictions
- **Astronomical Calculations** - Sun/Moon position, rise/set times, phases
- **Day/Night Terminator** overlay on world map
- **Space Weather** monitoring (Solar Flux, A-Index, K-Index, Solar Wind)
- **Radio Contests Calendar** with favorites, countdown timers, and live status tracking
- **DX Cluster** integration for real-time amateur radio spots with bearing visualization
- **SOTA/POTA Activations** (On The Air) display with markers
- **WebSocket** support for live updates
- **Location Management** for DE (home station) and DX (remote station)
- **Maidenhead Locator** square calculation and display
- **Radio Band Conditions** monitoring and propagation forecasts
- **QRZ.com Integration** for call sign lookup
- **PSK Reporter** integration for digital mode spots

## 📋 Table of Contents

- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Original C++ Codebase](#original-c-codebase)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         React Frontend (Port 3000)          │
│  • World Map Canvas Rendering              │
│  • Real-time Data Visualization            │
│  • WebSocket Client                         │
└───────────────┬─────────────────────────────┘
                │ HTTP REST + WebSocket
                │
┌───────────────▼─────────────────────────────┐
│      FastAPI Backend (Port 8080)            │
│  • RESTful API Endpoints                    │
│  • Skyfield (Astronomy)                     │
│  • PyOrbital (Satellite Tracking)           │
│  • WebSocket Server                         │
│  • Background Tasks                         │
└───────────────┬─────────────────────────────┘
                │
    ┌───────────┴──────────────┐
    │                          │
┌───▼────┐              ┌──────▼──────┐
│ PostgreSQL│              │   Redis    │
│ (Data)    │              │  (Cache)   │
└──────────┘              └─────────────┘
```

---

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework with async support
- **Skyfield** - High-precision astronomy library (replaces astro.cpp)
- **PyOrbital** - Satellite tracking with SGP4/SDP4 (replaces P13.cpp)
- **PostgreSQL** - Database for persistent data
- **Redis** - Caching layer
- **Uvicorn** - ASGI web server

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **Canvas API** - World map rendering

### DevOps
- **Docker** & **Docker Compose** - Containerization
- **Nginx** - Reverse proxy (production)

---

## 🚀 Getting Started

### Prerequisites

Choose one of the following setups:

**Option 1: Anaconda (Recommended for local development)**
- **Anaconda** or **Miniconda** (https://docs.conda.io/projects/miniconda/en/latest/)
- **Node.js 20+**
- Internet connection for initial package downloads

**Option 2: Docker (Recommended for production)**
- **Docker** and **Docker Compose**

---

### ⚡ Quick Start with Conda (Local Development)

#### 1. Clone the repository

```bash
git clone https://github.com/rag3trey/hamclock-js.git
cd hamclock-js
```

#### 2. Create Conda environment

```bash
# Create environment from environment.yml
conda env create -f environment.yml

# Activate environment
conda activate hamclock
```

#### 3. Install Node.js dependencies (frontend)

```bash
cd frontend
npm install
cd ..
```

#### 4. Run backend (Terminal 1)

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Or use the provided script:
```bash
./run_backend.sh
```

**Backend will start at:** http://localhost:8080

#### 5. Run frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Or use the provided script:
```bash
./run_frontend.sh
```

**Frontend will start at:** http://localhost:3000

#### 6. Access the app

Open your browser and go to: **http://localhost:3000**

---

### 🐳 Running with Docker

```bash
# Build and start all services
docker-compose up --build

# Backend: http://localhost:8080
# Frontend: http://localhost:3000
```

---

### ⚙️ Configuration

#### Backend Configuration
Environment variables (optional, can edit `backend/app/config.py`):
```bash
# .env file in backend/ directory
DATABASE_URL=postgresql://user:password@localhost:5432/hamclock
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
```

#### Frontend Configuration
API base URL is auto-configured in `frontend/src/api/index.js`:
- Development: `http://localhost:8080`
- Production: `VITE_API_URL` environment variable

---

### 📍 First Time Setup

1. **Set your location:**
   - Click "Settings" (⚙️) button in top right
   - Go to "📍 Location" tab
   - Enter your latitude, longitude, and location name
   - Click "Save Location"

2. **Set your callsign (optional):**
   - Click "Settings" → "📞 Callsign" tab
   - Enter your amateur radio callsign
   - Click "Save"

3. **Explore the features:**
   - View real-time world map with day/night terminator
   - Check visible satellites and upcoming passes
   - Monitor space weather (solar flux, K-index)
   - Connect to DX Cluster for real-time spots
   - View band propagation conditions
   - Browse radio contests calendar with live countdowns
   - Toggle map grid overlays (Lat/Lng, Maidenhead, CQ Zones, ITU Regions)

---

## 🗺️ Map Grid System

The map supports four different grid overlay types accessible via the Grid dropdown:

| Grid Type | Spacing | Use Case |
|-----------|---------|----------|
| **Lat/Lng** | 30° longitude × 20° latitude | Traditional latitude/longitude grid |
| **Maidenhead** | 2° × 1° | Maidenhead locator squares (HF radio) |
| **CQ Zones** | 45° longitude × 15° latitude | CQ zone divisions |
| **ITU Regions** | 3 vertical lines (-20°, +40°, +170°) | ITU radio regulation regions |

---

## 📻 Radio Contests Calendar

Track amateur radio contests with:
- **12-16 major contests** covering HF, VHF, UHF, and FM bands
- **Live countdowns** showing time until contest start
- **Favorite marking** with star system (persistent storage)
- **Detailed information** including bands, modes, and official links
- **Color-coded status** (upcoming, active, finished)
- **Filter options** (all, upcoming, active, favorites)

---

### 🆘 Troubleshooting

**Backend won't start:**
```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill process on port 8080 if needed
pkill -f "uvicorn"
```

**Frontend won't start:**
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Conda environment issues:**
```bash
# Recreate environment
conda env remove -n hamclock
conda env create -f environment.yml
conda activate hamclock
```

**WebSocket connection failing:**
- Ensure backend is running on port 8080
- Check firewall allows localhost:8080
- Frontend should be on http://localhost:3000 (not 127.0.0.1)

---

## 🚀 Getting Started (Original)

### Prerequisites

Choose one of the following setups:

**Option 1: Docker (Recommended for production)**
- **Docker** and **Docker Compose**

**Option 2: Anaconda (Recommended for development)**
- **Anaconda** or **Miniconda**
- **Node.js 20+**
- **PostgreSQL 15+** (optional, can use SQLite for development)
- **Redis 7+** (optional, for caching features)

**Option 3: Manual Setup**
- **Python 3.11+**
- **Node.js 20+**
- **PostgreSQL 15+**
- **Redis 7+**

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/rag3trey/hamclock-js.git
   cd hamclock-js
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Initialize satellite TLEs** (first time only)
   ```bash
   curl -X POST http://localhost:8080/api/v1/satellites/update-tles
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8080/docs
   - API: http://localhost:8080

### Quick Start with Anaconda (Recommended for Development)

1. **Create conda environment**
   ```bash
   conda env create -f environment.yml
   conda activate hamclock
   ```

2. **Start the backend** (Terminal 1)
   ```bash
   ./run_backend.sh
   ```
   
   Or manually:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

3. **Start the frontend** (Terminal 2)
   ```bash
   ./run_frontend.sh
   ```
   
   Or manually:
   ```bash
   cd frontend
   npm install  # First time only
   npm run dev
   ```

4. **Initialize satellite TLEs** (first time only)
   ```bash
   curl -X POST http://localhost:8080/api/v1/satellites/update-tles
   ```

5. **Access the application**
   - Frontend: http://localhost:3000 or http://localhost:5173
   - API Docs: http://localhost:8080/docs
   - API: http://localhost:8080

**Note:** For development without PostgreSQL/Redis, the app will work with in-memory storage and file-based caching. For production features, set up the optional services.

### Manual Setup

#### Backend Setup

1. **Create virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

#### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed (default: http://localhost:8080)
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

---

## 📚 API Documentation

### Interactive API Docs

Visit http://localhost:8080/docs for interactive Swagger documentation.

### Key Endpoints

#### Astronomy

```http
GET /api/v1/astronomy/sun/position?lat={lat}&lng={lng}
```
Get current sun position (azimuth, elevation, declination)

```http
GET /api/v1/astronomy/sun/riseset?lat={lat}&lng={lng}
```
Get sunrise and sunset times for a location

```http
GET /api/v1/astronomy/moon/position?lat={lat}&lng={lng}
```
Get current moon position and phase

```http
GET /api/v1/astronomy/terminator
```
Get day/night terminator line for map overlay

#### Satellites

```http
GET /api/v1/satellites/list
```
List all available satellites

```http
GET /api/v1/satellites/{sat_name}/position?lat={lat}&lng={lng}
```
Get satellite position as seen from observer

```http
GET /api/v1/satellites/{sat_name}/passes?lat={lat}&lng={lng}&hours=24
```
Calculate satellite passes over observer location

```http
GET /api/v1/satellites/{sat_name}/next-pass?lat={lat}&lng={lng}
```
Get the next pass for a satellite

```http
POST /api/v1/satellites/update-tles
```
Trigger TLE update (runs in background)

#### Space Weather

```http
GET /api/v1/spaceweather/current
```
Get current space weather data

#### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

// Subscribe to channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'dxspots'
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

---

## 🔧 Development

### Backend Development

**Project Structure:**
```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── routers/             # API route handlers
│   │   ├── astronomy.py
│   │   ├── satellites.py
│   │   ├── spaceweather.py
│   │   └── dxcluster.py
│   └── services/            # Business logic
│       ├── astronomy.py     # Skyfield astronomy calculations
│       ├── satellites.py    # PyOrbital satellite tracking
│       └── websocket_manager.py
├── requirements.txt
└── Dockerfile
```

**Running Tests:**
```bash
cd backend
pytest
```

**Code Ported from C++:**

| C++ File | Lines | Python Replacement | Implementation |
|----------|-------|-------------------|----------------|
| `astro.cpp` | 32 KB | Skyfield library | `services/astronomy.py` |
| `P13.cpp` + `earthsat.cpp` | 94 KB | Skyfield SGP4 | `services/satellites.py` |
| `maidenhead.cpp` | 4.5 KB | maidenhead lib | Utility function |
| `sphere.cpp` | 1 KB | geopy + custom | Great circle math |

### Frontend Development

**Project Structure:**
```
frontend/
├── src/
│   ├── App.jsx              # Main application
│   ├── main.jsx             # Entry point
│   ├── api/                 # API client
│   │   └── index.js
│   ├── components/          # Reusable components
│   │   ├── WorldMap.jsx     # Canvas map rendering
│   │   ├── SunMoonInfo.jsx
│   │   ├── SpaceWeatherPane.jsx
│   │   └── ClockDisplay.jsx
│   └── pages/               # Page components
│       ├── HomePage.jsx
│       └── SatellitePage.jsx
├── package.json
└── vite.config.js
```

**Building for Production:**
```bash
cd frontend
npm run build
```

---

## 🌐 Deployment

### Production Deployment with Docker

1. **Update docker-compose.yml for production:**
   ```yaml
   # Use production builds
   # Set DEBUG=False
   # Configure proper domain names
   ```

2. **Deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Cloud Deployment Options

#### Option 1: VPS (DigitalOcean, Linode, etc.)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone and deploy
git clone https://github.com/rag3trey/hamclock-js.git
cd hamclock-js
docker-compose up -d
```

#### Option 2: Cloud Platforms

**Backend:**
- **Railway.app** - Zero-config Python deployment
- **Fly.io** - Docker-based deployment
- **Render.com** - Managed services

**Frontend:**
- **Vercel** - Zero-config React deployment
- **Netlify** - Static site hosting
- **Cloudflare Pages** - Global CDN

#### Option 3: Kubernetes

```bash
# Build images
docker build -t hamclock-backend:latest ./backend
docker build -t hamclock-frontend:latest ./frontend

# Deploy to Kubernetes
kubectl apply -f k8s/
```

---

## 📖 Original C++ Codebase

This project is a complete rewrite of **ESPHamClock** originally developed by Elwood Downey, WB0OEW.

**Original Project:** http://www.clearskyinstitute.com/ham/HamClock

### Key Differences

| Aspect | Original (C++) | This Project (Python + JS) |
|--------|---------------|----------------------------|
| **Platform** | ESP8266, UNIX | Web (any device) |
| **Display** | RA8875 TFT | HTML5 Canvas |
| **Astronomy** | Custom 2000+ lines | Skyfield library (~10 lines) |
| **Satellite** | P13.cpp 2000+ lines | Skyfield SGP4 (~20 lines) |
| **Deployment** | Embedded device | Cloud/self-hosted |
| **Updates** | Compile & flash | Hot reload |
| **Access** | Local network | Internet (optional) |

### Migration Guide

If you're coming from the original HamClock:

1. **Your configuration** - Can be migrated via API endpoints
2. **Custom map styles** - Upload custom map images
3. **DX Cluster settings** - Configure in backend `.env`
4. **Satellite TLEs** - Auto-update from CelesTrak
5. **GPIO/Hardware** - Not supported (web-only)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Backend**: Follow PEP 8, use type hints
- **Frontend**: Follow React best practices, use ESLint
- **Testing**: Write tests for new features
- **Documentation**: Update README and API docs

---

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

The original ESPHamClock is Copyright © 2019 Elwood Downey, WB0OEW.

---

## 🙏 Acknowledgments

- **Elwood Downey (WB0OEW)** - Original ESPHamClock creator
- **Skyfield** - Brandon Rhodes for the excellent astronomy library
- **FastAPI** - Sebastián Ramírez for the modern Python framework
- **Amateur Radio Community** - For feedback and testing

---

## 📞 Support

- **Issues**: https://github.com/rag3trey/hamclock-js/issues
- **Discussions**: https://github.com/rag3trey/hamclock-js/discussions
- **Email**: rag3trey@gmail.com

---

## 🗺️ Roadmap

- [x] Core astronomy calculations (sun, moon)
- [x] Satellite tracking and pass predictions
- [x] World map rendering
- [x] Day/night terminator
- [ ] DX Cluster integration
- [ ] POTA/SOTA activations
- [ ] Contest calendar
- [ ] VOACAP band conditions
- [ ] PSK Reporter integration
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)

---

## 📊 Performance

| Metric | Original (C++) | Web Version |
|--------|---------------|-------------|
| Startup Time | 5-10 seconds | <1 second |
| Memory Usage | 4 MB (ESP) | ~50 MB (backend) |
| CPU Usage | 80% (ESP) | <5% (server) |
| Update Latency | N/A | <100ms (WebSocket) |
| Concurrent Users | 1 | Unlimited (scaled) |

---

**Made with ❤️ for the Amateur Radio Community**

73 de WA5RAG
