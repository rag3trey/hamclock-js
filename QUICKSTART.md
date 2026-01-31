# HamClock Web - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Option 1: Using Anaconda (Easiest for Development)

```bash
# 1. Clone or extract the project
cd hamclock-py

# 2. Create and activate conda environment
conda env create -f environment.yml
conda activate hamclock

# 3. Start the backend (in terminal 1)
./run_backend.sh

# 4. Start the frontend (in terminal 2, new window)
./run_frontend.sh

# 5. Initialize satellite data (after services start)
curl -X POST http://localhost:8080/api/v1/satellites/update-tles

# 6. Open your browser
# Frontend: http://localhost:5173 (or check terminal output)
# API Docs: http://localhost:8080/docs
```

That's it! You're running HamClock Web natively.

---

### Option 2: Using Docker

```bash
# 1. Clone or extract the project
cd hamclock-py

# 2. Start everything
docker-compose up -d

# 3. Wait ~30 seconds for services to start

# 4. Initialize satellite data
curl -X POST http://localhost:8080/api/v1/satellites/update-tles

# 5. Open your browser
# Frontend: http://localhost:3000
# API Docs: http://localhost:8080/docs
```

---

## 📱 First Steps

1. **Set Your Location (DE)**
   - Click "Edit" next to "DE Location" in the top bar
   - Enter your latitude and longitude
   - Click "Save"

2. **Click on the Map**
   - Click anywhere on the world map to set a DX location
   - See the great circle path drawn automatically

3. **View Satellite Passes**
   - Click "Satellites" in the navigation
   - Select a satellite (default: ISS)
   - View upcoming passes for your location

4. **Check Space Weather**
   - See real-time space weather data in the right panel
   - Updates every 5 minutes automatically

---

## 🔧 Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart
```

### Frontend can't connect to backend

```bash
# Check if backend is running
curl http://localhost:8080/health

# Should return: {"status":"healthy","timestamp":"..."}
```

### Satellite data not loading

```bash
# Manually update TLEs
docker-compose exec backend python -c "
from app.services.satellites import SatelliteService
import asyncio
sat = SatelliteService()
asyncio.run(sat.update_tles())
"
```

---

## 📊 API Examples

### Get Current Sun Position

```bash
curl "http://localhost:8080/api/v1/astronomy/sun/position?lat=37.7749&lng=-122.4194"
```

### Get Next ISS Pass

```bash
curl "http://localhost:8080/api/v1/satellites/ISS%20(ZARYA)/next-pass?lat=37.7749&lng=-122.4194"
```

### List All Satellites

```bash
curl "http://localhost:8080/api/v1/satellites/list"
```

---

## 🛑 Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

---

## 📚 Next Steps

- Read the full [README.md](README.md)
- Explore the [API Documentation](http://localhost:8080/docs)
- Customize your settings in `.env` files
- Deploy to production (see README.md)

---

## 💡 Tips

1. **Performance**: Use Chrome or Firefox for best Canvas performance
2. **Mobile**: Works on mobile browsers (best on tablet or larger)
3. **Updates**: Pull latest code with `git pull && docker-compose up -d --build`
4. **Logs**: View real-time logs with `docker-compose logs -f backend frontend`

---

Happy Ham Radio DXing! 📡

73!
