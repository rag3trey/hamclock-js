# Roadmap: Achieving HamClock-js Parity with ESPHamClock

## Quick Summary
Your current `hamclock-js` is at **~58% feature parity** with the original ESPHamClock. To reach **90%+** requires implementing missing UI elements, grid overlays, and data source integrations.

---

## PHASE 1: Quick Wins (2-3 days) → 70% Parity

### 1.1 Map Grid Overlays
**What:** Add Maidenhead, CQ, and ITU zone overlays to the map  
**Status:** Currently missing  
**Files to modify:**
- `frontend/src/components/WorldMap.jsx` - Add grid rendering
- `backend/app/services/` - Create grid calculation service

**Implementation sketch:**
```javascript
// In WorldMap.jsx, add drawGrids() function
const drawMaidenheadGrid = (ctx, projection) => {
  // Draw 2x2, 2x3 squares
  for (let lon = -180; lon < 180; lon += 2) {
    for (let lat = -90; lat < 90; lat += 1) {
      // Draw grid lines
    }
  }
}
```

**Effort:** ~6 hours

---

### 1.2 Satellite Pane Enhancements
**What:** Better pass prediction display with AOS/MAX/LOS details  
**Files to modify:**
- `frontend/src/components/SatellitesPane.jsx`
- `backend/app/routers/satellites.py` - Add detailed pass info endpoint

**Add:**
- Pass details table (AOS time, duration, max elevation)
- Filtering by elevation threshold
- Next pass highlighting
- Favorite satellite star

**Effort:** ~4 hours

---

### 1.3 DX Cluster Improvements  
**What:** Better filtering, sorting, search functionality  
**Files to modify:**
- `frontend/src/components/DXClusterPane.jsx`
- `backend/app/routers/dxcluster.py`

**Add:**
- Frequency range filter
- Spotter country filter
- Sort by distance/frequency
- Search by band/mode
- Real-time spot notifications

**Effort:** ~5 hours

---

### 1.4 Great Circle Path Display
**What:** Show distance and bearing between DE and DX  
**Files to modify:**
- `frontend/src/components/WorldMap.jsx`
- `frontend/src/utils/greatCircle.js` (likely exists)

**Add:**
- Bearing display (degrees)
- Distance display (km/miles)
- Reciprocal bearing
- Path heading info

**Effort:** ~2 hours

---

## PHASE 2: UI Enhancements (2-3 days) → 80% Parity

### 2.1 Add Missing Information Panes
**Create new components:**

1. **Sunrise/Sunset Times Table**
   - Next 7 days
   - Day length trends
   - File: `frontend/src/components/SunriseSunsetPane.jsx`
   - Effort: ~2 hours

2. **Moonrise/Moonset Times Table**
   - Moon rise/set times
   - Moon age and illumination
   - File: `frontend/src/components/MoonTimes.jsx`
   - Effort: ~2 hours

3. **Solar Data Trend**
   - Solar flux, A-index, K-index trend graphs
   - Enhance existing `SolarFluxTrend.jsx`
   - Effort: ~3 hours

4. **Band Conditions Detail**
   - MUF/FOE/LUF by band
   - Propagation predictions
   - File: Already exists `BandPropagationPane.jsx`
   - Effort: ~1 hour (enhancements)

---

### 2.2 Improve Hardware Status Displays
**Enhance:**
- `frontend/src/components/GPSStatus.jsx` - Add coordinate display
- `frontend/src/components/GimbalStatus.jsx` - Add more detail
- `frontend/src/components/CATStatus.jsx` - Add frequency/mode

**Effort:** ~4 hours

---

### 2.3 Better Contest Integration
**What:** Show active contests on map/calendar  
**Files to create:**
- `frontend/src/components/ContestPane.jsx`
- `backend/app/services/contests.py`

**Data sources:**
- ARRL Contest Calendar API
- CQ Contest Calendar
- RSGB contests

**Effort:** ~6 hours

---

## PHASE 3: Advanced Features (3-5 days) → 90%+ Parity

### 3.1 SOTA/POTA Integration
**What:** Show summits on map, track activators  
**Files to create:**
- `backend/app/services/sota_pota.py`
- `frontend/src/components/SOTAPOTAPane.jsx`

**Data sources:**
- Summits on the Air API
- Parks on the Air API
- SOTAwatch

**Effort:** ~8 hours

---

### 3.2 DXpedition Tracker
**What:** Display active DXpeditions on map  
**Files to create:**
- `backend/app/services/dxpeditions.py`
- `frontend/src/components/DXpeditionPane.jsx`

**Data sources:**
- DXpedition Calendar API
- ClubLog DXpedition info

**Effort:** ~6 hours

---

### 3.3 Audio Alerts
**What:** Sound notifications for events  
**Files to create:**
- `frontend/src/hooks/useAudioAlert.js`
- `frontend/src/services/alertManager.js`

**Alerts for:**
- Satellite AOS/LOS
- DX spot notifications
- DXpedition alerts
- Contest start/end

**Effort:** ~4 hours

---

### 3.4 Advanced Map Controls
**What:** Pan, zoom, layer toggles  
**Files to modify:**
- `frontend/src/components/WorldMap.jsx`
- `frontend/src/components/MapControls.jsx`

**Add:**
- Pinch-to-zoom support
- Drag-to-pan
- Layer visibility toggles
- Bookmark locations
- Measurement tool

**Effort:** ~8 hours

---

### 3.5 Rotator Control
**What:** Remote antenna rotator control  
**Files to create:**
- `backend/app/services/rotator.py`
- `frontend/src/components/RotatorControl.jsx`

**Support:**
- EasyComm protocol
- AZ/EL commands
- Stop/reset
- Current position feedback

**Effort:** ~4 hours

---

## Current Gaps by Category

| Category | Status | Gap | Effort to Close |
|----------|--------|-----|-----------------|
| **Astronomy** | ✅ 100% | None | 0 hours |
| **Satellites** | ✅ 90% | Better UI | 4 hours |
| **Mapping** | ⚠️ 67% | Grids, controls | 10 hours |
| **Information** | ⚠️ 38% | Many panes | 10 hours |
| **Hardware** | ❌ 17% | CAT, rotator, sensors | 15 hours |
| **Data sources** | ⚠️ 43% | Contests, SOTA, DXpeds | 20 hours |
| **UI/Polish** | ⚠️ 60% | Various | 10 hours |

---

## Recommended Timeline

### Week 1: Phase 1 (Quick Wins)
- Day 1-2: Grid overlays
- Day 2: Satellite enhancements
- Day 3: DX Cluster improvements
- Total: 15 hours → **70% parity**

### Week 2: Phase 2 (UI Polish)
- Day 1: Information panes
- Day 2: Hardware displays
- Day 3: Contest integration
- Total: 15 hours → **80% parity**

### Week 3+: Phase 3 (Advanced)
- SOTA/POTA, DXpeditions, Audio, Controls
- Pick what matters most to you
- Total: 20+ hours → **90%+ parity**

---

## Decision Matrix

Choose what matters most:

### If you want: Core Amateur Radio Features
**Priority Order:**
1. ✅ Astronomy (done)
2. ✅ Satellites (done)
3. ⚠️ Better Satellite UI → **Phase 1**
4. ⚠️ DX Cluster improvements → **Phase 1**
5. ⚠️ Contest calendar → **Phase 2**
6. ⚠️ SOTA/POTA → **Phase 3**

### If you want: Remote Station Control
**Priority Order:**
1. ✅ Astronomy (done)
2. ⚠️ CAT radio control → **Phase 3**
3. ⚠️ Rotator control → **Phase 3**
4. ⚠️ GPS integration → **Phase 3**
5. ⚠️ Gimbal control → **Phase 2**

### If you want: Complete Visual Experience
**Priority Order:**
1. ✅ Map rendering (done)
2. ⚠️ Grid overlays → **Phase 1**
3. ⚠️ Advanced map controls → **Phase 3**
4. ⚠️ Information panes → **Phase 2**
5. ⚠️ Animations/polish → **Optional**

---

## Quick Start: Pick Your First Task

### Option A: 4 hours (Just map grids)
```bash
# Start with Maidenhead grid in WorldMap.jsx
# Add calculateMaidenheadGrids() function
# Hook it into canvas drawing loop
# Test with different lat/lng ranges
```

### Option B: 6 hours (Satellite improvements)
```bash
# Enhance SatellitesPane.jsx
# Show AOS/MAX/LOS times
# Add elevation angle display
# Add pass duration
# Add filtering by visible passes
```

### Option C: 10 hours (Full Phase 1)
```bash
# Do Option B + grid overlays + DX cluster
# = Full quick wins phase
# = 70% parity achieved
```

---

## Files Most Likely to Modify

### Frontend
- `WorldMap.jsx` - Map rendering and overlays
- `SatellitesPane.jsx` - Satellite display
- `DXClusterPane.jsx` - Spot handling
- `App.jsx` - Add new panes

### Backend
- `satellites.py` (service) - Enhanced pass predictions
- `astronomy.py` (service) - Possible grid calculations
- `main.py` - New endpoints for enhancements

---

## Next Steps

1. **Read** `FEATURE_PARITY_ANALYSIS.md` (just created)
2. **Choose** a phase and first task
3. **Estimate** effort using the time guidelines
4. **Plan** your sprint (hours/day available)
5. **Implement** systematically

---

## Questions to Consider

1. **What's your primary use case?**
   - Remote monitoring from web browser?
   - Replacement for original HamClock display?
   - Both?

2. **What features do you use most in original?**
   - Satellite passes?
   - DX cluster?
   - Space weather?
   - All equally?

3. **Hardware control needed?**
   - Just monitoring?
   - Need to control gimbal/radio?

4. **Timeline?**
   - Want feature parity in 1 week?
   - 1 month?
   - Ongoing development?

---

## Need Help?

Each phase has:
- ✅ Clear file paths
- ✅ Implementation sketches
- ✅ Effort estimates
- ✅ Data source references

Start with Phase 1, measure progress, then decide on next phase.

**Goal: Make hamclock-js indistinguishable from original for web users!**
