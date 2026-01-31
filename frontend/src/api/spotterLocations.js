// Helper to map callsign prefixes to approximate coordinates
const CALLSIGN_PREFIXES = {
  // North America
  'N': { lat: 37, lng: -95, region: 'USA' },
  'W': { lat: 37, lng: -95, region: 'USA' },
  'K': { lat: 37, lng: -95, region: 'USA' },
  'VE': { lat: 56, lng: -106, region: 'Canada' },
  'XE': { lat: 23, lng: -102, region: 'Mexico' },
  'KP': { lat: 19, lng: -155, region: 'Hawaii' },
  'KL': { lat: 64, lng: -153, region: 'Alaska' },
  
  // South America
  'PY': { lat: -15, lng: -51, region: 'Brazil' },
  'LU': { lat: -34, lng: -64, region: 'Argentina' },
  'C6': { lat: 24, lng: -76, region: 'Bahamas' },
  
  // Europe
  'G': { lat: 54, lng: -3, region: 'UK' },
  'F': { lat: 46, lng: 2, region: 'France' },
  'D': { lat: 51, lng: 10, region: 'Germany' },
  'EA': { lat: 40, lng: -3, region: 'Spain' },
  'I': { lat: 42, lng: 12, region: 'Italy' },
  'HB': { lat: 46.8, lng: 8.2, region: 'Switzerland' },
  'ON': { lat: 50, lng: 4.5, region: 'Belgium' },
  'PA': { lat: 52, lng: 5, region: 'Netherlands' },
  'SV': { lat: 39, lng: 21, region: 'Greece' },
  
  // Africa
  'ZS': { lat: -30, lng: 25, region: 'South Africa' },
  '5Z': { lat: -1, lng: 37, region: 'Kenya' },
  'ZE': { lat: -17, lng: 25, region: 'Zimbabwe' },
  
  // Asia
  'VK': { lat: -25, lng: 133, region: 'Australia' },
  'ZL': { lat: -41, lng: 174, region: 'New Zealand' },
  'JA': { lat: 37, lng: 138, region: 'Japan' },
  'BV': { lat: 35, lng: 139, region: 'Japan' },
  'HL': { lat: 37, lng: 127, region: 'South Korea' },
  'BY': { lat: 39, lng: 116, region: 'China' },
  'VU': { lat: 17, lng: 72, region: 'India' },
  'JT': { lat: 54, lng: 104, region: 'Mongolia' },
  
  // Middle East
  'EP': { lat: 32, lng: 54, region: 'Iran' },
  '4X': { lat: 31, lng: 35, region: 'Israel' },
};

export const getSpotterLocation = (spotter) => {
  // Extract prefix (up to 3 characters typically)
  const prefix = spotter.substring(0, 3).toUpperCase();
  
  // Try 3-letter prefix first, then 2-letter
  let location = CALLSIGN_PREFIXES[prefix];
  if (!location && prefix.length >= 2) {
    location = CALLSIGN_PREFIXES[prefix.substring(0, 2)];
  }
  if (!location && prefix.length >= 1) {
    location = CALLSIGN_PREFIXES[prefix.substring(0, 1)];
  }
  
  // Fallback to default location
  if (!location) {
    location = { lat: 0, lng: 0, region: 'Unknown' };
  }
  
  return location;
};

export const getSpotMarker = (spot) => {
  const location = getSpotterLocation(spot.spotter);
  return {
    ...location,
    name: `${spot.spotter} - ${spot.callsign} on ${spot.frequency} kHz`,
    callsign: spot.callsign,
    spotter: spot.spotter,
    frequency: spot.frequency,
    band: spot.band
  };
};
