/**
 * Contest Favorites Manager
 * Manages favorited/starred contests using localStorage
 */

const STORAGE_KEY = 'hamclock_contest_favorites';

/**
 * Get all favorited contest names
 * @returns {Set<string>} Set of favorite contest names
 */
export const getFavorites = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch (err) {
    console.error('Error loading favorites:', err);
    return new Set();
  }
};

/**
 * Check if a contest is favorited
 * @param {string} contestName - Contest name
 * @returns {boolean}
 */
export const isFavorite = (contestName) => {
  return getFavorites().has(contestName);
};

/**
 * Add a contest to favorites
 * @param {string} contestName - Contest name
 */
export const addFavorite = (contestName) => {
  const favorites = getFavorites();
  favorites.add(contestName);
  saveFavorites(favorites);
  
  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('favoritesChanged', {
    detail: { contested: contestName, action: 'added' }
  }));
};

/**
 * Remove a contest from favorites
 * @param {string} contestName - Contest name
 */
export const removeFavorite = (contestName) => {
  const favorites = getFavorites();
  favorites.delete(contestName);
  saveFavorites(favorites);
  
  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('favoritesChanged', {
    detail: { contestName: contestName, action: 'removed' }
  }));
};

/**
 * Toggle favorite status
 * @param {string} contestName - Contest name
 * @returns {boolean} New favorite status
 */
export const toggleFavorite = (contestName) => {
  if (isFavorite(contestName)) {
    removeFavorite(contestName);
    return false;
  } else {
    addFavorite(contestName);
    return true;
  }
};

/**
 * Save favorites to localStorage
 * @param {Set<string>} favorites - Set of favorite contest names
 */
const saveFavorites = (favorites) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites)));
  } catch (err) {
    console.error('Error saving favorites:', err);
  }
};

/**
 * Clear all favorites
 */
export const clearFavorites = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('favoritesChanged', {
    detail: { action: 'cleared' }
  }));
};

/**
 * Get count of favorited contests
 * @returns {number}
 */
export const getFavoriteCount = () => {
  return getFavorites().size;
};
