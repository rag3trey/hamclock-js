import React, { useState, useEffect } from 'react';
import { formatDistance } from '../utils/units';
import useWebSocket from '../hooks/useWebSocket';
import './SatellitesPane.css';

const SatellitesPane = ({ deLocation, satelliteData, onSatelliteSelect, units = 'imperial' }) => {
  const [satellites, setSatellites] = useState(satelliteData?.visible_positions || satelliteData?.visible || []);
  const [wsConnected, setWsConnected] = useState(false);
  
  // WebSocket hook for real-time satellite updates
  const { isConnected, subscribe } = useWebSocket({
    onMessage: (data) => {
      // Handle both possible message formats
      if (data.visible_positions && Array.isArray(data.visible_positions)) {
        setSatellites(data.visible_positions);
      } else if (data.visible && Array.isArray(data.visible)) {
        setSatellites(data.visible);
      }
    },
    channels: ['satellites']
  });
  
  // Update connection status
  useEffect(() => {
    setWsConnected(isConnected);
  }, [isConnected]);
  
  // Subscribe to satellites channel when WebSocket connects
  useEffect(() => {
    if (isConnected) {
      subscribe('satellites');
    }
  }, [isConnected, subscribe]);
  
  // Initialize from REST API and keep in sync
  useEffect(() => {
    if (satelliteData) {
      const sats = satelliteData.visible_positions || satelliteData.visible || [];
      if (sats.length > 0) {
        setSatellites(sats);
      }
    }
  }, [satelliteData]);
  
  if (!deLocation) {
    return <div className="satellites-pane">Set location in Settings to track satellites</div>;
  }

  if (satellites.length === 0) {
    return <div className="satellites-pane loading">
      <p>Loading satellites...</p>
      {!deLocation && <small style={{ color: '#888', marginTop: '0.5rem' }}>Set your location in Settings</small>}
      {deLocation && <small style={{ color: '#888', marginTop: '0.5rem' }}>Waiting for satellite data from backend...</small>}
    </div>;
  }

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}Z`;
    } catch {
      return isoString.substring(11, 16) + 'Z';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <div className="satellites-pane">
      <div className="satellites-header">
        <div className="satellites-title">
          <span className="satellite-icon">🛰️</span>
          Satellites
          <span className="sat-count">({satellites.length} visible)</span>
          {wsConnected && <span className="ws-status" title="Real-time WebSocket">🔴 Live</span>}
        </div>
      </div>

      <div className="satellites-content">
        {/* Visible Satellites */}
        {satellites && satellites.length > 0 ? (
          <div className="section">
            <div className="section-title">Currently Visible ({satellites.length})</div>
            <div className="satellites-list">
              {satellites.map((sat, index) => (
                <div 
                  key={`${sat.name}-${index}`} 
                  className="satellite-item visible"
                  onClick={() => onSatelliteSelect?.(sat.name)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="sat-name">🔴 {sat.name}</div>
                  <div className="sat-details">
                    <span className="sat-bearing">
                      🧭 {Math.round(sat.azimuth || 0)}°
                    </span>
                    <span className="sat-elevation">
                      ⬆️ {Math.round(sat.elevation || 0)}°
                    </span>
                    <span className="sat-range">
                      📍 {formatDistance(sat.range_km || 0, units)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="section">
            <div className="section-title">No visible satellites</div>
          </div>
        )}

        {/* Upcoming Passes */}
        {satelliteData.upcoming_passes && satelliteData.upcoming_passes.length > 0 ? (
          <div className="section">
            <div className="section-title">Next Passes</div>
            <div className="passes-list">
              {satelliteData.upcoming_passes.slice(0, 5).map((pass, index) => (
                <div key={index} className="pass-item">
                  <div className="pass-satellite">{pass.satellite}</div>
                  <div className="pass-times">
                    <span className="pass-rise">🌅 {formatTime(pass.rise_time)}</span>
                    <span className="pass-max">⬆️ {Math.round(pass.max_elevation || 0)}°</span>
                    <span className="pass-set">🌇 {formatTime(pass.set_time)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="section">
            <div className="section-title">No upcoming passes</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SatellitesPane;
