import React, { useState, useEffect } from 'react';
import './LocationSelector.css';

const LocationSelector = ({ label, location, onLocationChange }) => {
  const [editing, setEditing] = useState(false);
  const [lat, setLat] = useState(location.latitude);
  const [lng, setLng] = useState(location.longitude);
  
  // Update internal state when location prop changes
  useEffect(() => {
    setLat(location.latitude);
    setLng(location.longitude);
  }, [location]);
  
  const handleSave = () => {
    onLocationChange({ latitude: parseFloat(lat), longitude: parseFloat(lng), name: label });
    setEditing(false);
  };
  
  if (editing) {
    return (
      <div className="location-selector editing">
        <input
          type="number"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          step="0.0001"
        />
        <input
          type="number"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="Longitude"
          step="0.0001"
        />
        <button onClick={handleSave}>Save</button>
        <button onClick={() => setEditing(false)}>Cancel</button>
      </div>
    );
  }
  
  return (
    <div className="location-selector">
      <span className="location-label">{label}:</span>
      <span className="location-coords">
        {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
      </span>
      <button onClick={() => setEditing(true)}>Edit</button>
    </div>
  );
};

export default LocationSelector;
