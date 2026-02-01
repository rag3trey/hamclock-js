import React, { useState, useEffect } from 'react';
import { formatDistance } from '../utils/units';
import { isSatelliteInWatchlist, addSatelliteToWatchlist, removeSatelliteFromWatchlist } from '../utils/watchlistManager';
import useWebSocket from '../hooks/useWebSocket';
import './SatellitesPane.css';

const SatellitesPane = ({ deLocation, satelliteData, onSatelliteSelect, units = 'imperial' }) => {
  const [satellites, setSatellites] = useState(satelliteData?.visible_positions || satelliteData?.visible || []);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [passes, setPasses] = useState({});
  const [loadingPasses, setLoadingPasses] = useState({});
  const [expandedSatellites, setExpandedSatellites] = useState({});
  const [watchlist, setWatchlist] = useState({});
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  
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

  // Listen for watchlist changes
  useEffect(() => {
    const handleWatchlistChange = () => {
      // Update watchlist status for all satellites
      const updatedWatchlist = {};
      satellites.forEach(sat => {
        updatedWatchlist[sat.name] = isSatelliteInWatchlist(sat.name);
      });
      setWatchlist(updatedWatchlist);
    };
    
    window.addEventListener('watchlistChanged', handleWatchlistChange);
    // Initial load
    handleWatchlistChange();
    return () => window.removeEventListener('watchlistChanged', handleWatchlistChange);
  }, [satellites]);

  // Fetch passes for a satellite
  const fetchPasses = async (satName) => {
    if (!deLocation) {
      console.warn('fetchPasses: deLocation not set');
      return;
    }
    
    setLoadingPasses(prev => ({ ...prev, [satName]: true }));
    try {
      const params = new URLSearchParams({
        lat: deLocation.latitude,
        lng: deLocation.longitude,
        hours: '48',
        min_elevation: '10'
      });
      
      const url = `/api/v1/satellites/${encodeURIComponent(satName)}/passes?${params}`;
      console.log(`Fetching passes for ${satName} from:`, url);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log(`Passes received for ${satName}:`, data);
        setPasses(prev => ({ ...prev, [satName]: data.passes || [] }));
        setExpandedSatellites(prev => ({ ...prev, [satName]: true }));
      } else {
        console.error(`API returned ${response.status} for ${satName}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error(`Error fetching passes for ${satName}:`, error);
    } finally {
      setLoadingPasses(prev => ({ ...prev, [satName]: false }));
    }
  };

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
      const day = date.getUTCDate();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      return `${month}/${day} ${hours}:${minutes}Z`;
    } catch {
      return isoString.substring(11, 16) + 'Z';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  };

  const toggleSatelliteExpand = (satName) => {
    setExpandedSatellites(prev => ({
      ...prev,
      [satName]: !prev[satName]
    }));
    
    if (!expandedSatellites[satName] && !passes[satName]) {
      fetchPasses(satName);
    }
  };

  const handleWatchlistToggle = (e, satName, satLabel) => {
    e.stopPropagation();
    if (watchlist[satName]) {
      removeSatelliteFromWatchlist(satName);
    } else {
      addSatelliteToWatchlist(satName, satLabel);
    }
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
        {Object.values(watchlist).some(v => v) && (
          <button 
            className={`filter-btn ${showWatchlistOnly ? 'active' : ''}`}
            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
            title="Show watchlist only"
          >
            ⭐ {Object.values(watchlist).filter(v => v).length}
          </button>
        )}
      </div>

      <div className="satellites-content">
        {/* Visible Satellites */}
        {satellites && satellites.length > 0 ? (
          <div className="section">
            <div className="section-title">Currently Visible ({
              showWatchlistOnly 
                ? satellites.filter(s => watchlist[s.name]).length 
                : satellites.length
            })</div>
            <div className="satellites-list">
              {(showWatchlistOnly 
                ? satellites.filter(s => watchlist[s.name]) 
                : satellites
              ).map((sat, index) => (
                <div key={`${sat.name}-${index}`} className="satellite-item-container">
                  <div 
                    className={`satellite-item visible ${expandedSatellites[sat.name] ? 'expanded' : ''}`}
                    onClick={() => {
                      onSatelliteSelect?.(sat.name);
                      setSelectedSatellite(sat.name);
                    }}
                  >
                    <div className="sat-main">
                      <button 
                        className={`watchlist-btn ${watchlist[sat.name] ? 'active' : ''}`}
                        onClick={(e) => handleWatchlistToggle(e, sat.name, sat.name)}
                        title={watchlist[sat.name] ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {watchlist[sat.name] ? '⭐' : '☆'}
                      </button>
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
                    <button 
                      className="expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSatelliteExpand(sat.name);
                      }}
                      title={expandedSatellites[sat.name] ? 'Hide passes' : 'Show passes'}
                    >
                      {expandedSatellites[sat.name] ? '▼' : '▶'}
                    </button>
                  </div>

                  {/* Expanded pass details */}
                  {expandedSatellites[sat.name] && (
                    <div className="satellite-passes">
                      {loadingPasses[sat.name] ? (
                        <div className="passes-loading">Loading passes...</div>
                      ) : passes[sat.name] && passes[sat.name].length > 0 ? (
                        <div className="passes-table">
                          <div className="passes-table-header">
                            <div className="col-rise">Rise</div>
                            <div className="col-max">Max El</div>
                            <div className="col-set">Set</div>
                            <div className="col-duration">Duration</div>
                          </div>
                          {passes[sat.name].slice(0, 5).map((pass, pidx) => (
                            <div key={pidx} className="passes-table-row">
                              <div className="col-rise">🌅 {formatTime(pass.rise_time)}</div>
                              <div className="col-max">⬆️ {Math.round(pass.max_elevation || 0)}°</div>
                              <div className="col-set">🌇 {formatTime(pass.set_time)}</div>
                              <div className="col-duration">⏱️ {formatDuration(pass.duration_seconds)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="passes-empty">No passes in next 48 hours</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="section">
            <div className="section-title">No visible satellites</div>
          </div>
        )}

        {/* Upcoming Passes Summary */}
        {satelliteData.upcoming_passes && satelliteData.upcoming_passes.length > 0 ? (
          <div className="section upcoming-passes-section">
            <div className="section-title">Next Passes (All Satellites)</div>
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
        ) : null}
      </div>
    </div>
  );
};

export default SatellitesPane;
