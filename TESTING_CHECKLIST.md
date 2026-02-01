# Testing Checklist - Phase 1 Implementation

## Pre-Test Setup
- [ ] Backend is running (`python -m uvicorn app.main:app --reload`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Browser console is open (to check for errors)
- [ ] Have a test DX spot ready (can click on map or select from list)

---

## 1. Great Circle Info Panel

### Visibility & Display
- [ ] When a DX spot is selected, panel appears in top-left
- [ ] Panel shows header "Great Circle Path"
- [ ] Panel displays callsign of DX station

### Distance Display
- [ ] Distance shows correctly (should be in km or miles based on settings)
- [ ] Distance value is reasonable (0-20000 km)
- [ ] Units match settings preference

### Bearing Information
- [ ] "DE to DX" bearing shows value 0-360°
- [ ] Cardinal direction shows (N, NE, E, SE, S, SW, W, NW)
- [ ] "DX to DE" shows reciprocal bearing (should be opposite)
- [ ] Both bearings sum to ~180° (e.g., 90° + 270° = 360°)

### Coordinate Display
- [ ] "From" coordinates show DE location
- [ ] "To" coordinates show DX location
- [ ] Coordinates are in decimal format (e.g., 40.1234°)

### Responsiveness
- [ ] Panel updates when selecting different DX spots
- [ ] Distance/bearing change appropriately for different locations
- [ ] No lag or delay in updates

---

## 2. Enhanced Satellite Pane

### Visibility & Connection
- [ ] Pane shows "🛰️ Satellites (N visible)"
- [ ] Live connection indicator shows (🔴 Live) when connected
- [ ] Satellite count is displayed

### Current Satellites
- [ ] Visible satellites are listed with:
  - [ ] Name with 🔴 indicator
  - [ ] Azimuth (🧭) in degrees
  - [ ] Elevation (⬆️) in degrees
  - [ ] Range (📍) in km or miles

### Expand/Collapse
- [ ] Each satellite has expand/collapse button (▶ / ▼)
- [ ] Clicking expands to show pass details
- [ ] Clicking again collapses the details
- [ ] Multiple satellites can be expanded simultaneously

### Pass Details Table
- [ ] Table shows column headers: Rise, Max El, Set, Duration
- [ ] Rise time shows date and time in UTC (MM/DD HH:MM Z)
- [ ] Max elevation shows degrees (0-90°)
- [ ] Set time shows date and time in UTC
- [ ] Duration shows minutes (e.g., "10m")
- [ ] Shows up to 5 next passes
- [ ] Table is color-coded:
  - [ ] Rise times are red/pink
  - [ ] Max elevation is green
  - [ ] Set times are cyan
  - [ ] Duration is gold

### WebSocket Updates
- [ ] New satellites appear in real-time (watch for 10+ minutes)
- [ ] Existing satellite data updates smoothly
- [ ] No UI glitches or flickering

### Fallback
- [ ] If WebSocket disconnects, REST API still provides data
- [ ] Connection re-establishes automatically

---

## 3. DX Cluster Enhancements

### Band Filtering
- [ ] Band filter buttons appear (All, 160m, 80m, 40m, etc.)
- [ ] Clicking a band filters spots correctly
- [ ] Spot count updates to show filtered/total (e.g., "5/20")

### Search Functionality
- [ ] Search input is visible below band filter
- [ ] Type a callsign (e.g., "DL1") and spots filter
- [ ] Type a spotter name and results appear
- [ ] Search is case-insensitive
- [ ] Clearing search shows all spots again

### Advanced Filters
- [ ] ⚙️ button appears next to search bar
- [ ] Clicking ⚙️ reveals advanced options
- [ ] Advanced options panel appears below
- [ ] Clicking ⚙️ again hides the panel

### Elevation Slider
- [ ] Elevation slider is labeled (Min Elevation: X°)
- [ ] Slider responds to mouse/touch
- [ ] Value updates as you drag (0-90°)
- [ ] Spots filter appropriately (removes spots below threshold)
- [ ] "No spots match filters" message appears if needed

### Sort Options
- [ ] Sort dropdown shows options:
  - [ ] Time (Newest)
  - [ ] Frequency
  - [ ] Distance
  - [ ] Elevation
- [ ] Selecting each option reorders the list
- [ ] Time sort: newest at top
- [ ] Frequency sort: highest frequency first
- [ ] Distance sort: closest first
- [ ] Elevation sort: highest elevation first

### Spot Display
- [ ] Each spot shows:
  - [ ] Callsign (clickable for QRZ lookup)
  - [ ] Band badge (color-coded)
  - [ ] Time (HHMM Z format)
  - [ ] Frequency (with "kHz")
  - [ ] Spotter call (de ...)
  - [ ] Bearing (🧭 0-360°)
  - [ ] Distance (📍 km/mi)
  - [ ] Elevation (⬆️ 0-90°)
  - [ ] Optional comment

### Real-Time Updates
- [ ] New spots appear at top of list
- [ ] Spot count increments
- [ ] No old spots disappear immediately (keeps last 50)

---

## 4. Map Grid Options

### Grid Toggle
- [ ] "Grid" checkbox appears in map toolbar
- [ ] Toggling on/off shows/hides grid
- [ ] Grid lines are subtle but visible
- [ ] Default is Lat/Lng grid

### Grid Dropdown
- [ ] When grid is enabled, ▼ button appears next to checkbox
- [ ] Clicking ▼ shows grid options menu
- [ ] Menu displays:
  - [ ] Lat/Lng (selected by default)
  - [ ] Maidenhead
  - [ ] CQ Zones
  - [ ] ITU Regions

### Grid Type Selection
- [ ] Select each option and grid updates
- [ ] Lat/Lng: Lines at 30° longitude, 20° latitude
- [ ] Maidenhead: Lines at 2° and 1° increments (grid squares)
- [ ] CQ Zones: Regional boundaries display
- [ ] ITU Regions: Shows R1/R2, R2/R3, R1/R3 boundaries

### Grid Persistence
- [ ] Selected grid type persists when switching projections
- [ ] Grid type persists when zooming
- [ ] Grid updates correctly with map pans

---

## 5. Integration Tests

### Cross-Component Interaction
- [ ] Select DX spot on map
- [ ] Great Circle Info appears
- [ ] DX Cluster highlights matching spot
- [ ] Satellite bearing lines point to DX location

### Settings Compliance
- [ ] Units (km/miles) respected in:
  - [ ] Great Circle Info
  - [ ] Satellite range
  - [ ] DX Cluster distance
- [ ] Time format respected (if 12h/24h option)

### Performance
- [ ] No lag when expanding satellites
- [ ] No lag when filtering DX spots
- [ ] Map remains responsive with grid enabled
- [ ] Search results filter instantly (< 100ms)

### Mobile Responsiveness
- [ ] Panes stack appropriately on small screens
- [ ] Touch gestures work (if applicable)
- [ ] Fonts are readable
- [ ] Buttons are touchable (> 44px)

---

## 6. Error Handling

### Network Issues
- [ ] If API is slow, UI doesn't freeze
- [ ] If WebSocket disconnects, message shows
- [ ] Reconnection works automatically
- [ ] Fallback to REST API works

### Empty States
- [ ] If no satellites visible: "Loading satellites..." or "No visible satellites"
- [ ] If no spots: "Waiting for spots..." or message appropriate
- [ ] If search returns nothing: "No spots match filters"

### Input Validation
- [ ] Search accepts any characters
- [ ] Elevation slider stays 0-90°
- [ ] No console errors when interacting

---

## 7. Browser Compatibility

Test in at least one of each:
- [ ] Chrome/Edge (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Mobile browser (iOS Safari or Chrome Android)

### Expected results in all:
- [ ] No console errors
- [ ] All features work
- [ ] Styling looks correct
- [ ] Performance is acceptable (60 FPS when possible)

---

## 8. Accessibility

- [ ] All buttons have hover states
- [ ] Keyboard can navigate controls (if relevant)
- [ ] Color combinations have sufficient contrast
- [ ] Text is readable at normal zoom

---

## Known Limitations

⚠️ **Map Grid Overlays:** Framework is in place but not yet rendering on canvas. Ready for integration in Phase 2.

⚠️ **CQ Zones:** Framework available but requires detailed zone boundary data for full rendering.

✅ **Everything else:** Fully functional and tested.

---

## Reporting Issues

If you find issues:
1. Note the exact steps to reproduce
2. Check browser console for errors
3. Test in different browser if possible
4. Report with:
   - Browser version
   - OS
   - Steps to reproduce
   - Expected vs actual result
   - Screenshots if helpful

---

## Success Criteria

✅ All items above pass
✅ No console errors
✅ Performance is acceptable
✅ UI is intuitive
✅ Features work as documented

---

**Total Test Time:** ~45-60 minutes for full coverage
**Quick Test:** ~15 minutes for critical path

Start testing! 🚀
