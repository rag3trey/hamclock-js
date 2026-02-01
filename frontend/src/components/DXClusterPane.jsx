import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDXSpots } from '../api';
import { formatDistance } from '../utils/units';
import { isDXInWatchlist, addDXToWatchlist, removeDXFromWatchlist } from '../utils/watchlistManager';
import useWebSocket from '../hooks/useWebSocket';
import QRZInfo from './QRZInfo';
import './DXClusterPane.css';

const DXClusterPane = ({ onSpotClick, deLocation, units = 'imperial' }) => {
  const [selectedBand, setSelectedBand] = useState('all');
  const [showSpotterInfo, setShowSpotterInfo] = useState(null);
  const [selectedCallsign, setSelectedCallsign] = useState(null);
  const [spots, setSpots] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minElevation, setMinElevation] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('time'); // 'time', 'frequency', 'distance', 'elevation'
  const [watchlist, setWatchlist] = useState({});
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  
  // WebSocket hook for real-time spot updates
  const { isConnected, subscribe } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'dx_spot') {
        // Add new spot to the top of the list
        setSpots(prev => [data.data, ...prev.slice(0, 49)]);
      }
    },
    channels: ['dx_spots']
  });
  
  // Update connection status
  useEffect(() => {
    setWsConnected(isConnected);
  }, [isConnected]);
  
  // Subscribe to dx_spots channel when WebSocket connects
  useEffect(() => {
    if (isConnected) {
      subscribe('dx_spots');
    }
  }, [isConnected, subscribe]);
  
  // Initial load from REST API
  const { data: dxData, isLoading } = useQuery({
    queryKey: ['dxspots', selectedBand, deLocation?.latitude, deLocation?.longitude],
    queryFn: () => fetchDXSpots(
      50, 
      selectedBand === 'all' ? null : selectedBand,
      deLocation?.latitude,
      deLocation?.longitude
    ),
    refetchInterval: 60000, // Refresh every 60 seconds (WebSocket will provide real-time updates)
  });
  
  // Initialize spots from REST API, then WebSocket takes over
  useEffect(() => {
    if (dxData?.spots && spots.length === 0) {
      setSpots(dxData.spots);
    }
  }, [dxData, spots.length]);

  // Listen for watchlist changes
  useEffect(() => {
    const handleWatchlistChange = () => {
      // Update watchlist status for all spots
      const updatedWatchlist = {};
      spots.forEach(spot => {
        updatedWatchlist[spot.callsign] = isDXInWatchlist(spot.callsign);
      });
      setWatchlist(updatedWatchlist);
    };
    
    window.addEventListener('watchlistChanged', handleWatchlistChange);
    // Initial load
    handleWatchlistChange();
    return () => window.removeEventListener('watchlistChanged', handleWatchlistChange);
  }, [spots]);

  if (isLoading && spots.length === 0) return <div className="dx-cluster-pane loading">Loading spots...</div>;
  if (spots.length === 0) return <div className="dx-cluster-pane">No data</div>;
  
  const bands = ['all', '160m', '80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m'];
  
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}${minutes}Z`;
  };
  
  const formatFrequency = (freq) => {
    return freq.toFixed(1);
  };
  
  const handleSpotClick = (spot) => {
    if (onSpotClick) {
      // Pass the full spot data to the callback
      onSpotClick(spot);
    }
  };

  const handleWatchlistToggle = (e, callsign, details) => {
    e.stopPropagation();
    if (watchlist[callsign]) {
      removeDXFromWatchlist(callsign);
    } else {
      addDXToWatchlist(callsign, {
        frequency: details.frequency,
        mode: details.mode,
        country: details.country
      });
    }
  };

  // Filter and sort spots
  const filteredSpots = spots
    .filter(spot => {
      // Band filter
      if (selectedBand !== 'all' && spot.band !== selectedBand) return false;
      
      // Search filter (callsign or spotter)
      if (searchQuery) {
        const query = searchQuery.toUpperCase();
        if (!spot.callsign.toUpperCase().includes(query) && 
            !spot.spotter.toUpperCase().includes(query)) {
          return false;
        }
      }
      
      // Elevation filter
      if (minElevation > 0 && spot.elevation !== undefined) {
        if (spot.elevation < minElevation) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'frequency':
          return b.frequency - a.frequency;
        case 'distance':
          if (!a.distance || !b.distance) return 0;
          return a.distance - b.distance;
        case 'elevation':
          if (!a.elevation || !b.elevation) return 0;
          return b.elevation - a.elevation;
        case 'time':
        default:
          return new Date(b.time) - new Date(a.time);
      }
    });
  
  return (
    <div className="dx-cluster-pane">
      <div className="dx-header">
        <div className="dx-title">
          <span className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}></span>
          DX Cluster
          <span className="spot-count">({
            showWatchlistOnly
              ? filteredSpots.filter(s => watchlist[s.callsign]).length
              : filteredSpots.length
          }/{spots.length})</span>
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
        
        <div className="band-filter">
          {bands.map(band => (
            <button
              key={band}
              className={`band-btn ${selectedBand === band ? 'active' : ''}`}
              onClick={() => setSelectedBand(band)}
            >
              {band === 'all' ? 'All' : band}
            </button>
          ))}
        </div>

        <div className="dx-search-bar">
          <input
            type="text"
            placeholder="Search callsign/spotter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button 
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Advanced filters"
          >
            ⚙️
          </button>
        </div>

        {showAdvanced && (
          <div className="advanced-filters">
            <div className="filter-group">
              <label>Min Elevation: {minElevation}°</label>
              <input
                type="range"
                min="0"
                max="90"
                value={minElevation}
                onChange={(e) => setMinElevation(Number(e.target.value))}
                className="filter-slider"
              />
            </div>
            
            <div className="filter-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                <option value="time">Time (Newest)</option>
                <option value="frequency">Frequency</option>
                <option value="distance">Distance</option>
                <option value="elevation">Elevation</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      <div className="dx-spots-container">
        {filteredSpots.length === 0 ? (
          <div className="no-spots">
            {wsConnected ? 'No spots match filters' : 'Connecting...'}
          </div>
        ) : (
          <div className="dx-spots-list">
            {(showWatchlistOnly 
              ? filteredSpots.filter(s => watchlist[s.callsign]) 
              : filteredSpots
            ).map((spot, index) => (
              <div 
                key={`${spot.callsign}-${spot.frequency}-${index}`} 
                className="dx-spot"
                onClick={() => handleSpotClick(spot)}
                title="Click to see details"
              >
              <div className="spot-header">
                  <button 
                    className={`watchlist-btn ${watchlist[spot.callsign] ? 'active' : ''}`}
                    onClick={(e) => handleWatchlistToggle(e, spot.callsign, { 
                      frequency: spot.frequency, 
                      mode: spot.mode,
                      country: spot.country 
                    })}
                    title={watchlist[spot.callsign] ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    {watchlist[spot.callsign] ? '⭐' : '☆'}
                  </button>
                  <span 
                    className="spot-callsign"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCallsign(spot.callsign);
                    }}
                    title="Click to view QRZ info"
                    style={{ cursor: 'pointer' }}
                  >
                    {spot.callsign}
                  </span>
                  <span className={`spot-band band-${spot.band.replace('m', '')}`}>
                    {spot.band}
                  </span>
                  <span className="spot-time">{formatTime(spot.time)}</span>
                </div>
                <div className="spot-details">
                  <span className="spot-frequency">{formatFrequency(spot.frequency)} kHz</span>
                  <span className="spot-spotter">de {spot.spotter}</span>
                  {spot.bearing !== undefined && spot.distance !== undefined && (
                    <>
                      <span className="spot-bearing">
                        🧭 {Math.round(spot.bearing)}°
                      </span>
                      <span className="spot-distance">
                        📍 {formatDistance(spot.distance, units)}
                      </span>
                    </>
                  )}
                  {spot.elevation !== undefined && (
                    <span className="spot-elevation">
                      ⬆️ {Math.round(spot.elevation)}°
                    </span>
                  )}
                </div>
                {spot.comment && (
                  <div className="spot-comment">{spot.comment}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCallsign && (
        <QRZInfo callsign={selectedCallsign} onClose={() => setSelectedCallsign(null)} />
      )}
    </div>
  );
};

export default DXClusterPane;
