/**
 * Contest Countdown Utility
 * Calculates and formats time remaining until contest starts
 */

/**
 * Calculate time difference from now to target date
 * @param {string} targetDate - ISO date string
 * @returns {Object} Object with days, hours, minutes, seconds, total_seconds, is_past
 */
export const calculateCountdown = (targetDate) => {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target - now;

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total_seconds: 0,
      is_past: true,
      display: 'Contest started'
    };
  }

  const total_seconds = Math.floor(diffMs / 1000);
  const days = Math.floor(total_seconds / (24 * 3600));
  const hours = Math.floor((total_seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((total_seconds % 3600) / 60);
  const seconds = total_seconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    total_seconds,
    is_past: false,
    display: formatCountdown(days, hours, minutes, seconds)
  };
};

/**
 * Format countdown for display
 * @param {number} days - Days
 * @param {number} hours - Hours
 * @param {number} minutes - Minutes
 * @param {number} seconds - Seconds
 * @returns {string} Formatted countdown string
 */
export const formatCountdown = (days, hours, minutes, seconds) => {
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Get countdown status class for styling
 * @param {Object} countdown - Countdown object from calculateCountdown
 * @returns {string} CSS class name
 */
export const getCountdownClass = (countdown) => {
  if (countdown.is_past) {
    return 'countdown-started';
  }
  if (countdown.total_seconds < 3600) { // Less than 1 hour
    return 'countdown-imminent';
  }
  if (countdown.total_seconds < 86400) { // Less than 1 day
    return 'countdown-soon';
  }
  return 'countdown-future';
};

/**
 * Get countdown icon
 * @param {Object} countdown - Countdown object from calculateCountdown
 * @returns {string} Icon emoji
 */
export const getCountdownIcon = (countdown) => {
  if (countdown.is_past) {
    return '▶️';
  }
  if (countdown.total_seconds < 3600) {
    return '🔴';
  }
  if (countdown.total_seconds < 86400) {
    return '⏱️';
  }
  return '⏰';
};
