import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSpaceWeather } from '../api/spaceweather';
import useWebSocket from '../hooks/useWebSocket';
import './SpaceWeatherPane.css';

const SpaceWeatherPane = () => {
  const [spacewx, setSpacewx] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  // WebSocket hook for real-time space weather updates
  const { isConnected, subscribe } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'spaceweather_update') {
        setSpacewx(data.data);
      }
    },
    channels: ['spaceweather']
  });
  
  // Update connection status
  useEffect(() => {
    setWsConnected(isConnected);
  }, [isConnected]);
  
  // Subscribe to spaceweather channel when WebSocket connects
  useEffect(() => {
    if (isConnected) {
      subscribe('spaceweather');
    }
  }, [isConnected, subscribe]);
  
  // Initial load from REST API
  const { data: initialSpacewx, isLoading } = useQuery({
    queryKey: ['spaceweather'],
    queryFn: fetchSpaceWeather,
    refetchInterval: 600000, // 10 minutes (WebSocket will provide real-time updates)
  });
  
  // Initialize from REST API
  useEffect(() => {
    if (initialSpacewx && !spacewx) {
      setSpacewx(initialSpacewx);
    }
  }, [initialSpacewx, spacewx]);
  
  if (isLoading && !spacewx) return <div className="space-weather-pane loading">Loading...</div>;
  if (!spacewx) return <div className="space-weather-pane">No data</div>;
  
  // Determine condition colors
  const getConditionClass = () => {
    if (spacewx.conditions === 'excellent') return 'condition-excellent';
    if (spacewx.conditions === 'good') return 'condition-good';
    if (spacewx.conditions === 'fair') return 'condition-fair';
    return 'condition-poor';
  };
  
  const getKIndexClass = (k) => {
    if (k >= 5) return 'value-poor';
    if (k >= 3) return 'value-fair';
    return 'value-good';
  };
  
  const getSolarFluxClass = (flux) => {
    if (flux >= 200) return 'value-excellent';
    if (flux >= 150) return 'value-good';
    if (flux >= 100) return 'value-fair';
    return 'value-poor';
  };
  
  return (
    <div className="space-weather-pane">
      <div className={`conditions-banner ${getConditionClass()} ${wsConnected ? 'ws-live' : ''}`}>
        Band Conditions: {spacewx.conditions.toUpperCase()}
        {wsConnected && <span className="ws-indicator" title="Real-time WebSocket">🔴</span>}
      </div>
      
      <div className="weather-grid">
        <div className="weather-metric">
          <span className="metric-label">Solar Flux</span>
          <span className={`metric-value ${getSolarFluxClass(spacewx.solar_flux)}`}>
            {spacewx.solar_flux.toFixed(1)}
          </span>
          <span className="metric-unit">SFU</span>
        </div>
        
        <div className="weather-metric">
          <span className="metric-label">Sunspot #</span>
          <span className="metric-value">
            {spacewx.sunspot_number}
          </span>
        </div>
        
        <div className="weather-metric">
          <span className="metric-label">A-Index</span>
          <span className="metric-value">
            {spacewx.a_index}
          </span>
        </div>
        
        <div className="weather-metric">
          <span className="metric-label">K-Index</span>
          <span className={`metric-value ${getKIndexClass(spacewx.k_index)}`}>
            {spacewx.k_index}
          </span>
        </div>
        
        <div className="weather-metric">
          <span className="metric-label">X-Ray</span>
          <span className="metric-value">
            {spacewx.xray_flux}
          </span>
        </div>
      </div>
      
      <div className="weather-updated">
        Updated: {new Date(spacewx.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SpaceWeatherPane;
