/**
 * Contests API client
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Fetch upcoming radio contests
 * @param {number} days - Number of days to look ahead (default 30)
 * @returns {Promise<Object>} Contest data
 */
export const fetchUpcomingContests = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/contests/upcoming?days=${days}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('Error fetching contests:', err);
    throw err;
  }
};

/**
 * Fetch contests by band
 * @param {string} band - Band name (e.g., '20m', '40m')
 * @param {number} days - Number of days to look ahead (default 30)
 * @returns {Promise<Object>} Contests for specified band
 */
export const fetchContestsByBand = async (band, days = 30) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/contests/by-band/${band}?days=${days}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Error fetching contests for band ${band}:`, err);
    throw err;
  }
};

/**
 * Fetch contests by mode
 * @param {string} mode - Mode name (e.g., 'CW', 'SSB', 'RTTY')
 * @param {number} days - Number of days to look ahead (default 30)
 * @returns {Promise<Object>} Contests for specified mode
 */
export const fetchContestsByMode = async (mode, days = 30) => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/contests/by-mode/${mode}?days=${days}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Error fetching contests for mode ${mode}:`, err);
    throw err;
  }
};
