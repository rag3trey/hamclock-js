/**
 * Unit conversion utilities
 */

// Convert kilometers to miles
export const kmToMiles = (km) => km * 0.621371;

// Convert meters to feet
export const metersToFeet = (m) => m * 3.28084;

// Format distance based on units preference
export const formatDistance = (km, units = 'imperial') => {
  if (units === 'metric') {
    return `${Math.round(km)} km`;
  } else {
    const miles = kmToMiles(km);
    return `${Math.round(miles)} mi`;
  }
};

// Format altitude based on units preference
export const formatAltitude = (meters, units = 'imperial') => {
  if (units === 'metric') {
    return `${Math.round(meters)} m`;
  } else {
    const feet = metersToFeet(meters);
    return `${Math.round(feet)} ft`;
  }
};
