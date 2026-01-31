import React from 'react';
import './BandPropagationPane.css';

const BandPropagationPane = ({ bandConditions }) => {
  if (!bandConditions) {
    return <div className="band-propagation-pane loading">Loading band conditions...</div>;
  }

  const bandOrder = ['160m', '80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '70cm'];
  
  const getConditionColor = (condition) => {
    switch(condition?.toLowerCase()) {
      case 'excellent': return '#00ff00';
      case 'good': return '#90ee90';
      case 'fair': return '#ffff00';
      case 'poor': return '#ff6b6b';
      case 'very_poor': return '#8b0000';
      default: return '#cccccc';
    }
  };

  const getConditionBg = (condition) => {
    switch(condition?.toLowerCase()) {
      case 'excellent': return 'rgba(0, 255, 0, 0.1)';
      case 'good': return 'rgba(144, 238, 144, 0.1)';
      case 'fair': return 'rgba(255, 255, 0, 0.1)';
      case 'poor': return 'rgba(255, 107, 107, 0.1)';
      case 'very_poor': return 'rgba(139, 0, 0, 0.1)';
      default: return 'rgba(200, 200, 200, 0.1)';
    }
  };

  const formatValue = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(0);
    }
    return value || 'N/A';
  };

  return (
    <div className="band-propagation-pane">
      <div className="band-header">
        <div className="band-title">
          <span className="band-icon">📡</span>
          Band Propagation
        </div>
        <div className="space-weather-summary">
          <span className="solar-flux">☀️ SFI: {formatValue(bandConditions.solar_flux)}</span>
          <span className="k-index">K: {formatValue(bandConditions.k_index)}</span>
          <span className="a-index">A: {formatValue(bandConditions.a_index)}</span>
        </div>
      </div>

      <div className="bands-container">
        {bandOrder.map((band) => {
          const bandData = bandConditions.bands?.[band];
          if (!bandData) return null;

          const condition = bandData.condition || 'unknown';
          const color = getConditionColor(condition);
          const bgColor = getConditionBg(condition);

          return (
            <div 
              key={band} 
              className="band-card"
              style={{ borderLeftColor: color, backgroundColor: bgColor }}
            >
              <div className="band-name">{band}</div>
              <div className="band-condition" style={{ color }}>
                {condition.toUpperCase()}
              </div>
              {bandData.muf && (
                <div className="band-muf">
                  MUF: {Math.round(bandData.muf)} MHz
                </div>
              )}
              {bandData.critical_frequency && (
                <div className="band-fcrit">
                  fCrit: {Math.round(bandData.critical_frequency)} MHz
                </div>
              )}
            </div>
          );
        })}
      </div>

      {bandConditions.timestamp && (
        <div className="band-timestamp">
          Updated: {new Date(bandConditions.timestamp).toLocaleTimeString('en-US', { hour12: false })}Z
        </div>
      )}
    </div>
  );
};

export default BandPropagationPane;
