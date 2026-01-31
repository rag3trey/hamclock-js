import React, { useState, useEffect } from 'react';
import { calculatePointing, getTrackingStatus, startTracking, stopTracking } from '../api';
import './GimbalStatus.css';

const GimbalStatus = ({ currentSatellite, deLocation }) => {
  const [gimbalData, setGimbalData] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Update gimbal pointing when satellite or location changes
  useEffect(() => {
    if (!currentSatellite || !deLocation) return;

    const updatePointing = async () => {
      try {
        const data = await calculatePointing(
          currentSatellite,
          deLocation.latitude,
          deLocation.longitude,
          deLocation.altitude || 0
        );
        setGimbalData(data);
        setError(null);
      } catch (err) {
        console.error('Gimbal update error:', err);
        setError('Failed to calculate pointing');
      }
    };

    updatePointing();
    const interval = setInterval(updatePointing, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [currentSatellite, deLocation]);

  // Poll tracking status
  useEffect(() => {
    const pollStatus = async () => {
      // Gimbal requires actual hardware - don't poll
      setIsTracking(false);
      setError('Gimbal control requires hardware connection');
    };

    // Don't poll - set error immediately
    setError('Gimbal control requires hardware connection');

    return () => {};
  }, []);

  const handleStartTracking = async () => {
    if (!currentSatellite) {
      setError('Select a satellite first');
      return;
    }

    setLoading(true);
    try {
      await startTracking(currentSatellite, 'yaesu');
      setIsTracking(true);
    } catch (err) {
      setError(`Tracking start failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    setLoading(true);
    try {
      await stopTracking();
      setIsTracking(false);
    } catch (err) {
      setError(`Tracking stop failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!deLocation) {
    return (
      <div className="gimbal-status">
        <div className="gimbal-message">Set location to use antenna tracking</div>
      </div>
    );
  }

  if (!gimbalData || !currentSatellite) {
    return (
      <div className="gimbal-status">
        <div className="gimbal-message">Select a satellite to track</div>
      </div>
    );
  }

  const az = gimbalData.azimuth || 0;
  const el = gimbalData.elevation || 0;
  const visible = gimbalData.visible;

  // Calculate compass needle rotation
  const needleRotation = az;

  return (
    <div className={`gimbal-status ${visible ? 'visible' : 'not-visible'}`}>
      <div className="gimbal-header">
        <span className="gimbal-icon">🎯</span>
        <span className="gimbal-title">Antenna</span>
        {isTracking && <span className="gimbal-tracking">● TRACKING</span>}
      </div>

      {error && <div className="gimbal-error">{error}</div>}

      <div className="gimbal-compass">
        {/* Compass background with directions */}
        <svg viewBox="0 0 200 200" className="compass-svg">
          {/* Compass circle */}
          <circle cx="100" cy="100" r="90" className="compass-circle" />

          {/* Cardinal directions */}
          <text x="100" y="25" textAnchor="middle" className="compass-label cardinal">
            N
          </text>
          <text x="175" y="105" textAnchor="middle" className="compass-label cardinal">
            E
          </text>
          <text x="100" y="180" textAnchor="middle" className="compass-label cardinal">
            S
          </text>
          <text x="25" y="105" textAnchor="middle" className="compass-label cardinal">
            W
          </text>

          {/* Intercardinal directions */}
          <text x="145" y="40" textAnchor="middle" className="compass-label">
            NE
          </text>
          <text x="160" y="160" textAnchor="middle" className="compass-label">
            SE
          </text>
          <text x="40" y="160" textAnchor="middle" className="compass-label">
            SW
          </text>
          <text x="55" y="40" textAnchor="middle" className="compass-label">
            NW
          </text>

          {/* Degree markers */}
          <g className="degree-markers">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 100 + 85 * Math.sin(rad);
              const y1 = 100 - 85 * Math.cos(rad);
              const x2 = 100 + 95 * Math.sin(rad);
              const y2 = 100 - 95 * Math.cos(rad);
              return (
                <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} className="degree-mark" />
              );
            })}
          </g>

          {/* Antenna needle pointing to satellite */}
          <g transform={`rotate(${needleRotation} 100 100)`}>
            <line x1="100" y1="100" x2="100" y2="30" className="antenna-needle" strokeWidth="3" />
            <circle cx="100" cy="100" r="8" className="antenna-center" />
          </g>
        </svg>

        {/* Center elevation display */}
        <div className="elevation-box">
          <div className="elev-label">ELEV</div>
          <div className="elev-value">{el.toFixed(1)}°</div>
        </div>
      </div>

      {/* Azimuth display */}
      <div className="azimuth-display">
        <div className="az-label">Azimuth</div>
        <div className="az-value">{az.toFixed(1)}°</div>
      </div>

      {/* Visibility and range */}
      <div className="gimbal-info">
        <div className="info-row">
          <span className="info-label">Range:</span>
          <span className="info-value">{gimbalData.range_km?.toFixed(0)} km</span>
        </div>
        <div className="info-row">
          <span className="info-label">Altitude:</span>
          <span className="info-value">{gimbalData.altitude_km?.toFixed(0)} km</span>
        </div>
        {gimbalData.doppler_shift && (
          <div className="info-row">
            <span className="info-label">Doppler:</span>
            <span className="info-value">{gimbalData.doppler_shift > 0 ? '+' : ''}{gimbalData.doppler_shift.toFixed(1)} Hz</span>
          </div>
        )}
      </div>

      {/* Tracking buttons */}
      <div className="gimbal-controls">
        {!isTracking ? (
          <button
            onClick={handleStartTracking}
            disabled={loading || !visible}
            className="track-btn start"
            title={visible ? 'Start antenna tracking' : 'Satellite below horizon'}
          >
            {loading ? 'Starting...' : 'Start Track'}
          </button>
        ) : (
          <button onClick={handleStopTracking} disabled={loading} className="track-btn stop">
            {loading ? 'Stopping...' : 'Stop Track'}
          </button>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="details-btn"
        >
          {showDetails ? '▼ Details' : '▶ Details'}
        </button>
      </div>

      {/* Extended details */}
      {showDetails && (
        <div className="gimbal-details">
          <div className="detail-row">
            <span className="detail-label">Satellite:</span>
            <span className="detail-value">{currentSatellite}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Observer:</span>
            <span className="detail-value">
              {deLocation.latitude.toFixed(4)}°, {deLocation.longitude.toFixed(4)}°
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Visibility:</span>
            <span className={`detail-value ${visible ? 'ok' : 'fail'}`}>
              {visible ? '✓ Visible' : '✗ Below Horizon'}
            </span>
          </div>
          {gimbalData.rotator_command_yaesu && (
            <div className="rotator-commands">
              <div className="cmd-label">Rotator Commands:</div>
              <div className="cmd-row">
                <span className="cmd-type">Yaesu:</span>
                <code className="cmd-text">{gimbalData.rotator_command_yaesu.trim()}</code>
              </div>
              {gimbalData.rotator_command_alfa && (
                <div className="cmd-row">
                  <span className="cmd-type">Alfa:</span>
                  <code className="cmd-text">{gimbalData.rotator_command_alfa.trim()}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GimbalStatus;
