import React, { useState } from 'react';
import { getCallsignInfo } from '../utils/prefixLookup';
import './CallsignInfo.css';

export default function CallsignInfo({ callsign, children }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const info = getCallsignInfo(callsign);

  if (!info) {
    return children || <span>{callsign}</span>;
  }

  return (
    <div className="callsign-info-wrapper">
      <div 
        className="callsign-trigger"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {children || <span className="callsign-text">{callsign}</span>}
      </div>

      {showTooltip && (
        <div className="callsign-tooltip">
          <div className="tooltip-header">
            <strong>{info.country}</strong>
            <span className="prefix-badge">{info.prefix}</span>
          </div>
          
          <div className="tooltip-body">
            <div className="info-row">
              <span className="label">🌍 Continent:</span>
              <span className="value">{info.continent}</span>
            </div>
            
            <div className="info-row">
              <span className="label">📊 CQ Zone:</span>
              <span className="value">{info.cqZone}</span>
            </div>
            
            <div className="info-row">
              <span className="label">📡 ITU Zone:</span>
              <span className="value">{info.ituZone}</span>
            </div>
            
            <div className="info-row">
              <span className="label">📍 Location:</span>
              <span className="value">{info.lat.toFixed(2)}°, {info.lng.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
