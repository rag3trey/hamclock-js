import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDXSpots } from '../api';
import { formatDistance } from '../utils/units';
import useWebSocket from '../hooks/useWebSocket';
import QRZInfo from './QRZInfo';
import './DXClusterPane.css';

const DXClusterPane = ({ onSpotClick, deLocation, units = 'imperial' }) => {
  const [selectedBand, setSelectedBand] = useState('all');
  const [showSpotterInfo, setShowSpotterInfo] = useState(null);
  const [selectedCallsign, setSelectedCallsign] = useState(null);
  const [spots, setSpots] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  
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
  
  return (
    <div className="dx-cluster-pane">
      <div className="dx-header">
        <div className="dx-title">
          <span className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}></span>
          DX Cluster
          <span className="spot-count">({spots.length} spots)</span>
          {wsConnected && <span className="ws-status" title="Real-time WebSocket">🔴 Live</span>}
        </div>
        
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
      </div>
      
      <div className="dx-spots-container">
        {spots.length === 0 ? (
          <div className="no-spots">
            {wsConnected ? 'Waiting for spots...' : 'Connecting...'}
          </div>
        ) : (
          <div className="dx-spots-list">
            {spots
              .filter(spot => selectedBand === 'all' || spot.band === selectedBand)
              .map((spot, index) => (
              <div 
                key={`${spot.callsign}-${spot.frequency}-${index}`} 
                className="dx-spot"
                onClick={() => handleSpotClick(spot)}
                title="Click to see details"
              >
              <div className="spot-header">
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
