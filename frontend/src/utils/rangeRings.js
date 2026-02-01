/**
 * Range rings utility - draw concentric circles at fixed distances
 */

/**
 * Calculate great circle endpoints at a given bearing and distance
 * @param {number} lat - Starting latitude in degrees
 * @param {number} lng - Starting longitude in degrees
 * @param {number} bearing - Bearing in degrees (0-360)
 * @param {number} distanceKm - Distance in kilometers
 * @returns {[number, number]} - [longitude, latitude] endpoint
 */
export function getPointAtDistance(lat, lng, bearing, distanceKm) {
  const R = 6371; // Earth radius in km
  const d = distanceKm / R; // Angular distance
  
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const brng = (bearing * Math.PI) / 180;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  
  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/**
 * Generate points for a range ring circle
 * @param {number} centerLat - Center latitude in degrees
 * @param {number} centerLng - Center longitude in degrees
 * @param {number} distanceKm - Radius in kilometers
 * @param {number} points - Number of points to generate (default 64)
 * @returns {Array<[number, number]>} - Array of [lng, lat] coordinates
 */
export function generateRangeRing(centerLat, centerLng, distanceKm, points = 64) {
  const ring = [];
  const step = 360 / points;
  
  for (let i = 0; i < 360; i += step) {
    const [lng, lat] = getPointAtDistance(centerLat, centerLng, i, distanceKm);
    ring.push([lng, lat]);
  }
  
  // Close the ring
  ring.push(ring[0]);
  
  return ring;
}

/**
 * Generate multiple range rings at standard distances
 * @param {number} centerLat - Center latitude in degrees
 * @param {number} centerLng - Center longitude in degrees
 * @returns {Array<Object>} - Array of {distance, points, label}
 */
export function generateStandardRangeRings(centerLat, centerLng) {
  const distances = [100, 250, 500, 1000, 2000];
  
  return distances.map(distance => ({
    distance,
    points: generateRangeRing(centerLat, centerLng, distance),
    label: distance >= 1000 ? `${distance / 1000}Mm` : `${distance}km`
  }));
}
