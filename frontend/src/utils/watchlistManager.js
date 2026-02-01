/**
 * Watchlist Manager - Persistent storage for favorite satellites and DX callsigns
 * Uses localStorage to persist across page reloads
 */

const WATCHLIST_STORAGE_KEY = 'hamclock_watchlist';

// Initialize empty watchlist structure
const defaultWatchlist = {
  satellites: [],
  dxCallsigns: [],
  frequencies: []
};

/**
 * Get entire watchlist from localStorage
 */
export function getWatchlist() {
  try {
    const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { ...defaultWatchlist };
  } catch (error) {
    console.error('Error reading watchlist:', error);
    return { ...defaultWatchlist };
  }
}

/**
 * Add satellite to watchlist
 */
export function addSatelliteToWatchlist(satelliteId, satelliteName) {
  const watchlist = getWatchlist();
  const entry = { id: satelliteId, name: satelliteName, addedAt: new Date().toISOString() };
  
  if (!watchlist.satellites.find(s => s.id === satelliteId)) {
    watchlist.satellites.push(entry);
    saveWatchlist(watchlist);
    dispatchWatchlistEvent('satelliteAdded', entry);
  }
}

/**
 * Remove satellite from watchlist
 */
export function removeSatelliteFromWatchlist(satelliteId) {
  const watchlist = getWatchlist();
  watchlist.satellites = watchlist.satellites.filter(s => s.id !== satelliteId);
  saveWatchlist(watchlist);
  dispatchWatchlistEvent('satelliteRemoved', { id: satelliteId });
}

/**
 * Check if satellite is in watchlist
 */
export function isSatelliteInWatchlist(satelliteId) {
  const watchlist = getWatchlist();
  return watchlist.satellites.some(s => s.id === satelliteId);
}

/**
 * Add DX callsign to watchlist
 */
export function addDXToWatchlist(callsign, details = {}) {
  const watchlist = getWatchlist();
  const entry = { 
    callsign, 
    frequency: details.frequency || null,
    mode: details.mode || null,
    country: details.country || null,
    addedAt: new Date().toISOString() 
  };
  
  if (!watchlist.dxCallsigns.find(d => d.callsign === callsign)) {
    watchlist.dxCallsigns.push(entry);
    saveWatchlist(watchlist);
    dispatchWatchlistEvent('dxAdded', entry);
  }
}

/**
 * Remove DX callsign from watchlist
 */
export function removeDXFromWatchlist(callsign) {
  const watchlist = getWatchlist();
  watchlist.dxCallsigns = watchlist.dxCallsigns.filter(d => d.callsign !== callsign);
  saveWatchlist(watchlist);
  dispatchWatchlistEvent('dxRemoved', { callsign });
}

/**
 * Check if DX callsign is in watchlist
 */
export function isDXInWatchlist(callsign) {
  const watchlist = getWatchlist();
  return watchlist.dxCallsigns.some(d => d.callsign === callsign);
}

/**
 * Add frequency to watchlist
 */
export function addFrequencyToWatchlist(frequency, mode = '', band = '') {
  const watchlist = getWatchlist();
  const entry = { 
    frequency, 
    mode, 
    band,
    addedAt: new Date().toISOString() 
  };
  
  if (!watchlist.frequencies.find(f => f.frequency === frequency && f.mode === mode)) {
    watchlist.frequencies.push(entry);
    saveWatchlist(watchlist);
    dispatchWatchlistEvent('frequencyAdded', entry);
  }
}

/**
 * Remove frequency from watchlist
 */
export function removeFrequencyFromWatchlist(frequency, mode = '') {
  const watchlist = getWatchlist();
  watchlist.frequencies = watchlist.frequencies.filter(
    f => !(f.frequency === frequency && f.mode === mode)
  );
  saveWatchlist(watchlist);
  dispatchWatchlistEvent('frequencyRemoved', { frequency, mode });
}

/**
 * Get watchlist count
 */
export function getWatchlistCount() {
  const watchlist = getWatchlist();
  return {
    satellites: watchlist.satellites.length,
    dxCallsigns: watchlist.dxCallsigns.length,
    frequencies: watchlist.frequencies.length,
    total: watchlist.satellites.length + watchlist.dxCallsigns.length + watchlist.frequencies.length
  };
}

/**
 * Clear entire watchlist
 */
export function clearWatchlist() {
  localStorage.removeItem(WATCHLIST_STORAGE_KEY);
  dispatchWatchlistEvent('watchlistCleared', {});
}

/**
 * Export watchlist as JSON
 */
export function exportWatchlist() {
  return JSON.stringify(getWatchlist(), null, 2);
}

/**
 * Import watchlist from JSON
 */
export function importWatchlist(jsonData) {
  try {
    const imported = JSON.parse(jsonData);
    saveWatchlist(imported);
    dispatchWatchlistEvent('watchlistImported', imported);
    return true;
  } catch (error) {
    console.error('Error importing watchlist:', error);
    return false;
  }
}

// ============ Private Functions ============

/**
 * Save watchlist to localStorage
 */
function saveWatchlist(watchlist) {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  } catch (error) {
    console.error('Error saving watchlist:', error);
  }
}

/**
 * Dispatch custom event for watchlist changes
 */
function dispatchWatchlistEvent(eventType, data) {
  window.dispatchEvent(new CustomEvent('watchlistChanged', {
    detail: { type: eventType, data }
  }));
}
