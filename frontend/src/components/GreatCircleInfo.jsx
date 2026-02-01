import React from 'react';
import './GreatCircleInfo.css';

/**
 * Calculates bearing from one location to another using haversine formula
 * Returns bearing in degrees (0-360), where 0 = North, 90 = East, 180 = South, 270 = West
 */
function calculateBearing(fromLat, fromLng, toLat, toLng) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  
  const lat1 = fromLat * toRad;
  const lng1 = fromLng * toRad;
  const lat2 = toLat * toRad;
  const lng2 = toLng * toRad;
  
  const dLng = lng2 - lng1;
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x) * toDeg;
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  
  return bearing;
}

/**
 * Calculates great circle distance between two points on Earth (kilometers)
 */
function calculateDistance(fromLat, fromLng, toLat, toLng) {
  const toRad = Math.PI / 180;
  const R = 6371; // Earth's radius in km
  
  const lat1 = fromLat * toRad;
  const lat2 = toLat * toRad;
  const dLat = (toLat - fromLat) * toRad;
  const dLng = (toLng - fromLng) * toRad;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
function bearingToCardinal(bearing) {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return cardinals[index];
}

/**
 * Format distance in km or miles
 */
function formatDistance(km, units = 'km') {
  if (units === 'miles') {
    return `${(km * 0.621371).toFixed(0)} mi`;
  }
  return `${km.toFixed(0)} km`;
}

const GreatCircleInfo = ({ deLocation, dxSpot, distanceUnits = 'km' }) => {
  if (!deLocation || !dxSpot) {
    return null;
  }

  const bearing = calculateBearing(
    deLocation.latitude,
    deLocation.longitude,
    dxSpot.latitude,
    dxSpot.longitude
  );

  const reciprocalBearing = (bearing + 180) % 360;

  const distance = calculateDistance(
    deLocation.latitude,
    deLocation.longitude,
    dxSpot.latitude,
    dxSpot.longitude
  );

  const cardinal = bearingToCardinal(bearing);
  const reciprocalCardinal = bearingToCardinal(reciprocalBearing);

  return (
    <div className="great-circle-info">
      <div className="gc-header">
        <h3>Great Circle Path</h3>
        <span className="gc-callsign">{dxSpot.callsign || dxSpot.spotter || 'DX'}</span>
      </div>
      
      <div className="gc-content">
        <div className="gc-row">
          <div className="gc-item">
            <div className="gc-label">Distance</div>
            <div className="gc-value">{formatDistance(distance, distanceUnits)}</div>
          </div>
          
          <div className="gc-item">
            <div className="gc-label">DE to DX</div>
            <div className="gc-value">
              <span className="bearing">{bearing.toFixed(0)}°</span>
              <span className="cardinal">{cardinal}</span>
            </div>
          </div>
          
          <div className="gc-item">
            <div className="gc-label">DX to DE</div>
            <div className="gc-value">
              <span className="bearing">{reciprocalBearing.toFixed(0)}°</span>
              <span className="cardinal">{reciprocalCardinal}</span>
            </div>
          </div>
        </div>

        <div className="gc-details">
          <div className="gc-detail-row">
            <span className="gc-detail-label">From:</span>
            <span className="gc-detail-value">
              {deLocation.latitude.toFixed(4)}°, {deLocation.longitude.toFixed(4)}°
            </span>
          </div>
          <div className="gc-detail-row">
            <span className="gc-detail-label">To:</span>
            <span className="gc-detail-value">
              {dxSpot.latitude.toFixed(4)}°, {dxSpot.longitude.toFixed(4)}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreatCircleInfo;
