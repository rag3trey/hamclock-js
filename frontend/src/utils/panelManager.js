/**
 * Panel Manager - Manages which panels are visible on the dashboard
 */

const PANEL_DEFAULTS = {
  sunmoon: true,
  sunmoontimes: true,
  bandconditions: true,
  ncdxf: true,
  pskreporter: true,
  spaceweather: true,
  trend: true,
  dxcluster: true,
  activations: true,
  contests: true,
  satellites: true,
  watchlist: true,
  rss: true,
};

const PANEL_LABELS = {
  sunmoon: '🌅 Sun & Moon',
  sunmoontimes: '🕐 Sun & Moon Times',
  bandconditions: '📊 Band Conditions',
  ncdxf: '🔔 NCDXF Beacons',
  pskreporter: '📻 PSK Reporter',
  spaceweather: '☄️ Space Weather',
  trend: '☀️ Solar Flux Trend',
  dxcluster: '🌍 DX Cluster',
  activations: '🏕️ On The Air',
  contests: '📅 Radio Contests',
  satellites: '🛰️ Satellites',
  watchlist: '⭐ Watchlist',
  rss: '📰 RSS Feeds',
};

const STORAGE_KEY = 'hamclock_visible_panels';

/**
 * Get visible panels from localStorage
 */
export const getVisiblePanels = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error loading panel preferences:', err);
  }
  return PANEL_DEFAULTS;
};

/**
 * Save visible panels to localStorage
 */
export const saveVisiblePanels = (panels) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  } catch (err) {
    console.error('Error saving panel preferences:', err);
  }
};

/**
 * Toggle a panel's visibility
 */
export const togglePanel = (panelName) => {
  const current = getVisiblePanels();
  current[panelName] = !current[panelName];
  saveVisiblePanels(current);
  return current;
};

/**
 * Set all panels to visible
 */
export const showAllPanels = () => {
  const all = {};
  Object.keys(PANEL_DEFAULTS).forEach(key => {
    all[key] = true;
  });
  saveVisiblePanels(all);
  return all;
};

/**
 * Hide all panels
 */
export const hideAllPanels = () => {
  const none = {};
  Object.keys(PANEL_DEFAULTS).forEach(key => {
    none[key] = false;
  });
  saveVisiblePanels(none);
  return none;
};

/**
 * Reset to defaults
 */
export const resetPanels = () => {
  saveVisiblePanels(PANEL_DEFAULTS);
  return PANEL_DEFAULTS;
};

export { PANEL_DEFAULTS, PANEL_LABELS, STORAGE_KEY };
