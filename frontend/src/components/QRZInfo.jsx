import React, { useState } from 'react';
import { fetchCallsignLookup } from '../api/index';
import './QRZInfo.css';

export default function QRZInfo({ callsign, onClose }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (callsign) {
      lookupCallsign();
    }
  }, [callsign]);

  const lookupCallsign = async () => {
    try {
      setLoading(true);
      const result = await fetchCallsignLookup(callsign);
      setInfo(result);
      setError(null);
    } catch (err) {
      setError(`Failed to look up ${callsign}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!info) return null;

  return (
    <div className="qrz-info-overlay" onClick={onClose}>
      <div className="qrz-info-card" onClick={e => e.stopPropagation()}>
        <div className="qrz-header">
          <h3>{info.callsign || callsign}</h3>
          <button className="qrz-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="qrz-loading">Looking up...</div>}

        {error && <div className="qrz-error">{error}</div>}

        {info.found ? (
          <div className="qrz-content">
            {info.image && (
              <div className="qrz-photo">
                <img 
                  src={info.image} 
                  alt={info.name || callsign}
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
            
            {info.name && <div className="qrz-field">
              <span className="qrz-label">Name:</span>
              <span className="qrz-value">{info.name}</span>
            </div>}
            
            {info.country && <div className="qrz-field">
              <span className="qrz-label">Country:</span>
              <span className="qrz-value">{info.country}</span>
            </div>}
            
            {info.state && <div className="qrz-field">
              <span className="qrz-label">State:</span>
              <span className="qrz-value">{info.state}</span>
            </div>}
            
            {info.county && <div className="qrz-field">
              <span className="qrz-label">County:</span>
              <span className="qrz-value">{info.county}</span>
            </div>}
            
            {info.grid && <div className="qrz-field">
              <span className="qrz-label">Grid:</span>
              <span className="qrz-value">{info.grid}</span>
            </div>}
            
            {info.latitude && info.longitude && <div className="qrz-field">
              <span className="qrz-label">Coordinates:</span>
              <span className="qrz-value">{info.latitude.toFixed(4)}° / {info.longitude.toFixed(4)}°</span>
            </div>}
            
            {info.license_class && <div className="qrz-field">
              <span className="qrz-label">License Class:</span>
              <span className="qrz-value">{info.license_class}</span>
            </div>}
            
            {info.expires && <div className="qrz-field">
              <span className="qrz-label">Expires:</span>
              <span className="qrz-value">{info.expires}</span>
            </div>}
            
            {info.email && <div className="qrz-field">
              <span className="qrz-label">Email:</span>
              <span className="qrz-value">
                <a href={`mailto:${info.email}`}>{info.email}</a>
              </span>
            </div>}
            
            {info.web && <div className="qrz-field">
              <span className="qrz-label">Web:</span>
              <span className="qrz-value">
                <a href={info.web} target="_blank" rel="noopener noreferrer">
                  {info.web}
                </a>
              </span>
            </div>}
            
            {info.qsl && <div className="qrz-field">
              <span className="qrz-label">QSL:</span>
              <span className="qrz-value">{info.qsl}</span>
            </div>}
            
            {info.iota && <div className="qrz-field">
              <span className="qrz-label">IOTA:</span>
              <span className="qrz-value">{info.iota}</span>
            </div>}
            
            {info.bio && (
              <div className="qrz-bio">
                <span className="qrz-label">Bio:</span>
                <div className="qrz-bio-text">{info.bio}</div>
              </div>
            )}
            
            {info.radio_id && <div className="qrz-field">
              <span className="qrz-label">Radio ID:</span>
              <span className="qrz-value">{info.radio_id}</span>
            </div>}
            
            {info.dmr_id && <div className="qrz-field">
              <span className="qrz-label">DMR ID:</span>
              <span className="qrz-value">{info.dmr_id}</span>
            </div>}
          </div>
        ) : (
          <div className="qrz-not-found">
            Callsign "{callsign}" not found {info.source ? `in ${info.source}` : 'in callsign database'}
          </div>
        )}
      </div>
    </div>
  );
}
