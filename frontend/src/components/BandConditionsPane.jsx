import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBandConditions } from '../api';
import './BandConditionsPane.css';

const BandConditionsPane = () => {
  const { data: bandData, isLoading } = useQuery({
    queryKey: ['bandconditions'],
    queryFn: fetchBandConditions,
    refetchInterval: 300000, // 5 minutes
  });
  
  if (isLoading) return <div className="band-pane loading">Loading bands...</div>;
  if (!bandData) return <div className="band-pane">No data</div>;
  
  // Order bands by frequency
  const bandOrder = ['160m', '80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m'];
  const orderedBands = bandOrder.filter(b => bandData.bands[b]);
  
  const getConditionColor = (condition) => {
    const cond = (condition || '').toLowerCase();
    const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
    switch(cond) {
      case 'excellent': return isDarkTheme ? '#00ff00' : '#15803d';
      case 'very good': return isDarkTheme ? '#90ee90' : '#15803d';
      case 'good': return isDarkTheme ? '#90ee90' : '#15803d';
      case 'fair': return isDarkTheme ? '#ffff00' : '#b8860b';
      case 'poor': return isDarkTheme ? '#ff6b6b' : '#dc2626';
      case 'very poor': return isDarkTheme ? '#8b0000' : '#991b1b';
      default: return isDarkTheme ? '#888' : '#666';
    }
  };

  const getConditionBgColor = (condition) => {
    const cond = (condition || '').toLowerCase();
    switch(cond) {
      case 'excellent': return 'rgba(0, 255, 0, 0.1)';
      case 'very good': return 'rgba(144, 238, 144, 0.1)';
      case 'good': return 'rgba(144, 238, 144, 0.1)';
      case 'fair': return 'rgba(255, 255, 0, 0.1)';
      case 'poor': return 'rgba(255, 107, 107, 0.1)';
      case 'very poor': return 'rgba(139, 0, 0, 0.1)';
      default: return 'rgba(100, 100, 100, 0.1)';
    }
  };
  
  return (
    <div className="band-pane">
      <div className="band-header">
        <div className="band-title">📡 Band Propagation</div>
        <div className="space-weather-summary">
          <span className="sw-item">☀️ SFI: <strong>{bandData.solar_flux.toFixed(0)}</strong></span>
          <span className="sw-item">K: <strong>{bandData.k_index}</strong></span>
          <span className="sw-item">A: <strong>{bandData.a_index}</strong></span>
        </div>
      </div>
      
      <div className="bands-grid">
        {orderedBands.map(bandName => {
          const band = bandData.bands[bandName];
          const color = getConditionColor(band.condition);
          const bgColor = getConditionBgColor(band.condition);
          
          return (
            <div 
              key={bandName} 
              className="band-item"
              style={{
                borderLeftColor: color,
                backgroundColor: bgColor
              }}
            >
              <div className="band-name">{bandName}</div>
              <div className="band-condition" style={{ color: color }}>
                {(band.condition || 'Unknown').toUpperCase()}
              </div>
              {band.muf && (
                <div className="band-detail">
                  MUF: {Math.round(band.muf)}MHz
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BandConditionsPane;
