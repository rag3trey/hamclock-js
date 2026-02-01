/**
 * Maidenhead Locator System calculations and utilities
 */

/**
 * Convert lat/lng to Maidenhead grid square
 * Example: (40.5, -74.5) = "FN20"
 */
export function latLngToMaidenhead(lat, lng) {
  // Normalize lng to -180..180
  lng = ((lng + 180) % 360) - 180;
  
  // Normalize lat to -90..90
  lat = Math.max(-90, Math.min(90, lat));
  
  // Field (first 2 characters): 18x18 grid
  const fieldLng = Math.floor((lng + 180) / 20);
  const fieldLat = Math.floor((lat + 90) / 10);
  
  const fieldChars = 'ABCDEFGHIJKLMNOPQR';
  const field = fieldChars[fieldLng] + fieldChars[fieldLat];
  
  // Square (2nd 2 characters): 10x10 grid
  const squareLng = Math.floor(((lng + 180) % 20) / 2);
  const squareLat = Math.floor(((lat + 90) % 10) / 1);
  
  const square = squareLng + '' + squareLat;
  
  return field + square;
}

/**
 * Get the corners of a Maidenhead grid square
 * Example: "FN20" returns [[40, -75], [40, -74], [41, -74], [41, -75]]
 */
export function maidenheadToBounds(grid) {
  if (!grid || grid.length < 2) return null;
  
  const field = grid.substring(0, 2).toUpperCase();
  let square = grid.substring(2, 4);
  
  // Parse field
  const fieldChars = 'ABCDEFGHIJKLMNOPQR';
  const fieldLngIdx = fieldChars.indexOf(field[0]);
  const fieldLatIdx = fieldChars.indexOf(field[1]);
  
  if (fieldLngIdx < 0 || fieldLatIdx < 0) return null;
  
  // Calculate field bounds
  const fieldLngMin = fieldLngIdx * 20 - 180;
  const fieldLngMax = fieldLngMin + 20;
  const fieldLatMin = fieldLatIdx * 10 - 90;
  const fieldLatMax = fieldLatMin + 10;
  
  // Parse square if provided
  if (square && square.length === 2) {
    const squareLngIdx = parseInt(square[0]);
    const squareLatIdx = parseInt(square[1]);
    
    if (squareLngIdx < 0 || squareLngIdx > 9 || squareLatIdx < 0 || squareLatIdx > 9) {
      return null;
    }
    
    // Calculate square bounds within the field
    const squareLngMin = fieldLngMin + squareLngIdx * 2;
    const squareLngMax = squareLngMin + 2;
    const squareLatMin = fieldLatMin + squareLatIdx * 1;
    const squareLatMax = squareLatMin + 1;
    
    return [
      [squareLatMax, squareLngMin],
      [squareLatMax, squareLngMax],
      [squareLatMin, squareLngMax],
      [squareLatMin, squareLngMin],
      [squareLatMax, squareLngMin] // Close the polygon
    ];
  }
  
  // Return field bounds
  return [
    [fieldLatMax, fieldLngMin],
    [fieldLatMax, fieldLngMax],
    [fieldLatMin, fieldLngMax],
    [fieldLatMin, fieldLngMin],
    [fieldLatMax, fieldLngMin] // Close the polygon
  ];
}

/**
 * Generate Maidenhead grid lines for the visible area
 */
export function generateMaidenheadGrid(minLat, maxLat, minLng, maxLng, level = 'square') {
  const lines = [];
  
  // Level 0: Fields (20° x 10°)
  // Level 1: Squares (2° x 1°)
  // Level 2: Subsquares (0.2° x 0.1°)
  
  let lngStep, latStep;
  
  if (level === 'field') {
    lngStep = 20;
    latStep = 10;
  } else if (level === 'subsquare') {
    lngStep = 0.2;
    latStep = 0.1;
  } else {
    // square (default)
    lngStep = 2;
    latStep = 1;
  }
  
  // Vertical lines (longitude)
  const startLng = Math.floor(minLng / lngStep) * lngStep;
  for (let lng = startLng; lng <= maxLng; lng += lngStep) {
    if (lng >= minLng && lng <= maxLng) {
      lines.push({
        type: 'line',
        coordinates: [[minLat, lng], [maxLat, lng]],
        level
      });
    }
  }
  
  // Horizontal lines (latitude)
  const startLat = Math.floor(minLat / latStep) * latStep;
  for (let lat = startLat; lat <= maxLat; lat += latStep) {
    if (lat >= minLat && lat <= maxLat) {
      lines.push({
        type: 'line',
        coordinates: [[lat, minLng], [lat, maxLng]],
        level
      });
    }
  }
  
  return lines;
}

/**
 * CQ Zones (currently returns dummy data - would need actual zone boundaries)
 * CQ Zones are numbered 1-40
 */
export function generateCQZoneGridLines(minLat, maxLat, minLng, maxLng) {
  // This is a simplified representation
  // In reality, CQ zones are irregular regions
  // For now, returning approximate lines
  const lines = [];
  
  // Approximate CQ zone boundaries (very simplified)
  // Zone boundaries don't follow lat/lng lines, so this is complex
  // Leaving as placeholder for future implementation
  
  return lines;
}

/**
 * ITU Regions
 * Region 1: Europe, Africa, Middle East, Russia
 * Region 2: North/South America, Greenland
 * Region 3: Asia-Pacific
 */
export function generateITURegionGridLines(minLat, maxLat, minLng, maxLng) {
  const lines = [];
  
  // Approximate ITU region boundaries
  // Region 1/2 boundary at ~20W longitude
  // Region 2/3 boundary at ~170E longitude
  // Region 1/3 boundary at ~40E longitude
  
  lines.push({
    type: 'line',
    name: 'ITU R1/R2',
    coordinates: [[-90, -20], [90, -20]],
    level: 'itu'
  });
  
  lines.push({
    type: 'line',
    name: 'ITU R2/R3',
    coordinates: [[-90, 170], [90, 170]],
    level: 'itu'
  });
  
  lines.push({
    type: 'line',
    name: 'ITU R1/R3',
    coordinates: [[-90, 40], [90, 40]],
    level: 'itu'
  });
  
  return lines;
}
