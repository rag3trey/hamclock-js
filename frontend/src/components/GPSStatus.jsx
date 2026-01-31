import React, { useState, useEffect } from 'react';
import { getGPSStatus, connectGPS, disconnectGPS, getDemoGPSPosition } from '../api';
import { formatAltitude } from '../utils/units';
import './GPSStatus.css';

const GPSStatus = ({ onLocationUpdate, units = 'imperial' }) => {
  const [gpsStatus, setGpsStatus] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Fetch GPS status periodically
  useEffect(() => {
    // GPS requires actual hardware - set initial state with error
    setGpsStatus({ 
      connected: false, 
      enabled: false, 
      has_position: false,
      satellites: 0 
    });
    setError('GPS requires hardware connection (gpsd)');

    return () => {};
  }, [onLocationUpdate]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setShowDiagnostics(false);
    try {
      await connectGPS('localhost', 2947);
      const status = await getGPSStatus();
      setGpsStatus(status);
    } catch (err) {
      setError(`Connection failed: ${err.response?.data?.detail || err.message}`);
      // Fetch diagnostics to help user troubleshoot
      try {
        const response = await fetch('/api/v1/gps/health');
        const diag = await response.json();
        setDiagnostics(diag);
        setShowDiagnostics(true);
      } catch (diagErr) {
        console.error('Could not fetch diagnostics:', diagErr);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGPS();
      setGpsStatus({ connected: false, enabled: false, has_position: false });
    } catch (err) {
      setError(`Disconnect failed: ${err.message}`);
    }
  };

  const handleDemoGPS = async () => {
    try {
      const demoData = await getDemoGPSPosition();
      if (onLocationUpdate && demoData.position) {
        onLocationUpdate({
          latitude: demoData.position.latitude,
          longitude: demoData.position.longitude,
          altitude: demoData.position.altitude,
        });
      }
    } catch (err) {
      setError(`Demo fetch failed: ${err.message}`);
    }
  };

  if (!gpsStatus) {
    return <div className="gps-status loading">GPS Status Loading...</div>;
  }

  const isConnected = gpsStatus.connected;
  const hasPosition = gpsStatus.has_position;
  const satellites = gpsStatus.satellites || 0;
  const accuracy = gpsStatus.accuracy_m;
  const lastFix = gpsStatus.last_fix;

  return (
    <div className={`gps-status ${isConnected ? 'connected' : 'disconnected'} ${hasPosition ? 'has-fix' : 'no-fix'}`}>
      <div className="gps-header">
        <div className="gps-indicator">
          <span className="gps-icon">📡</span>
          <span className="gps-title">GPS</span>
          <span className={`gps-dot ${hasPosition ? 'active' : ''}`}></span>
        </div>

        <div className="gps-controls">
          {!isConnected ? (
            <>
              <button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="gps-btn connect-btn"
                title="Connect to GPSD daemon"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
              <button 
                onClick={handleDemoGPS}
                className="gps-btn demo-btn"
                title="Load demo GPS position (San Francisco)"
              >
                Demo
              </button>
            </>
          ) : (
            <button 
              onClick={handleDisconnect}
              className="gps-btn disconnect-btn"
              title="Disconnect from GPSD"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="gps-btn details-btn"
            title="Show/hide details"
          >
            {showDetails ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {error && (
        <div className="gps-error">
          ⚠️ {error}
          {diagnostics && (
            <button 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="diagnostics-toggle"
            >
              {showDiagnostics ? '▼ Hide Help' : '▶ Show Help'}
            </button>
          )}
        </div>
      )}

      {diagnostics && showDiagnostics && (
        <div className="gps-diagnostics">
          <div className="diag-title">🔧 Troubleshooting Guide</div>
          <div className="diag-row">
            <span className="diag-label">GPSD Running:</span>
            <span className={`diag-status ${diagnostics.gpsd_running ? 'ok' : 'fail'}`}>
              {diagnostics.gpsd_running ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          <div className="diag-row">
            <span className="diag-label">GPSD Reachable:</span>
            <span className={`diag-status ${diagnostics.gpsd_reachable ? 'ok' : 'fail'}`}>
              {diagnostics.gpsd_reachable ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          {diagnostics.suggestions && diagnostics.suggestions.length > 0 && (
            <div className="diag-suggestions">
              <div className="diag-subtitle">📝 Next Steps:</div>
              {diagnostics.suggestions.map((suggestion, idx) => (
                <div key={idx} className="suggestion-item">
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDetails && (
        <div className="gps-details">
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className="detail-value">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>

          {hasPosition && lastFix && (
            <>
              <div className="detail-row">
                <span className="detail-label">Position:</span>
                <span className="detail-value">
                  {lastFix.latitude?.toFixed(4)}°, {lastFix.longitude?.toFixed(4)}°
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Altitude:</span>
                <span className="detail-value">
                  {formatAltitude(lastFix.altitude || 0, units)}
                </span>
              </div>

              {accuracy && (
                <div className="detail-row">
                  <span className="detail-label">Accuracy:</span>
                  <span className="detail-value">
                    ±{accuracy.toFixed(1)} m
                  </span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">Satellites:</span>
                <span className="detail-value">
                  {satellites} 🛰️
                </span>
              </div>

              {lastFix.speed && (
                <div className="detail-row">
                  <span className="detail-label">Speed:</span>
                  <span className="detail-value">
                    {(lastFix.speed * 3.6).toFixed(1)} km/h
                  </span>
                </div>
              )}

              {lastFix.timestamp && (
                <div className="detail-row">
                  <span className="detail-label">Last Fix:</span>
                  <span className="detail-value">
                    {new Date(lastFix.timestamp).toLocaleTimeString('en-US', { hour12: false })}Z
                  </span>
                </div>
              )}
            </>
          )}

          {!hasPosition && (
            <div className="detail-row">
              <span className="detail-label">Position:</span>
              <span className="detail-value">No fix</span>
            </div>
          )}
        </div>
      )}

      {hasPosition && !showDetails && (
        <div className="gps-summary">
          📍 {lastFix.latitude?.toFixed(4)}°, {lastFix.longitude?.toFixed(4)}° | {satellites} 🛰️
        </div>
      )}
    </div>
  );
};

export default GPSStatus;
