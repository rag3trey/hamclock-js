import React, { useState, useEffect } from 'react';
import { 
  getWatchlist, 
  removeSatelliteFromWatchlist, 
  removeDXFromWatchlist,
  removeFrequencyFromWatchlist,
  clearWatchlist 
} from '../utils/watchlistManager';
import './WatchlistPane.css';

export default function WatchlistPane({ visible }) {
  const [watchlist, setWatchlist] = useState(() => getWatchlist());
  const [activeTab, setActiveTab] = useState('satellites');

  useEffect(() => {
    const handleWatchlistChange = () => {
      setWatchlist(getWatchlist());
    };

    window.addEventListener('watchlistChanged', handleWatchlistChange);
    return () => window.removeEventListener('watchlistChanged', handleWatchlistChange);
  }, []);

  if (!visible) return null;

  const handleRemoveSatellite = (satelliteId) => {
    removeSatelliteFromWatchlist(satelliteId);
  };

  const handleRemoveDX = (callsign) => {
    removeDXFromWatchlist(callsign);
  };

  const handleRemoveFrequency = (frequency, mode) => {
    removeFrequencyFromWatchlist(frequency, mode);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear entire watchlist?')) {
      clearWatchlist();
    }
  };

  const isEmpty = 
    watchlist.satellites.length === 0 && 
    watchlist.dxCallsigns.length === 0 && 
    watchlist.frequencies.length === 0;

  return (
    <div className="pane watchlist-pane">
      <div className="pane-header">
        <h2>⭐ Watchlist</h2>
        {!isEmpty && (
          <button className="clear-btn" onClick={handleClearAll} title="Clear entire watchlist">
            🗑️
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="watchlist-empty">
          <p>No items in watchlist</p>
          <p className="hint">Click the ⭐ icon in Satellites or DX Cluster to add items</p>
        </div>
      ) : (
        <>
          <div className="watchlist-tabs">
            {watchlist.satellites.length > 0 && (
              <button 
                className={`tab ${activeTab === 'satellites' ? 'active' : ''}`}
                onClick={() => setActiveTab('satellites')}
              >
                🛰️ Satellites ({watchlist.satellites.length})
              </button>
            )}
            {watchlist.dxCallsigns.length > 0 && (
              <button 
                className={`tab ${activeTab === 'dx' ? 'active' : ''}`}
                onClick={() => setActiveTab('dx')}
              >
                📡 DX ({watchlist.dxCallsigns.length})
              </button>
            )}
            {watchlist.frequencies.length > 0 && (
              <button 
                className={`tab ${activeTab === 'frequencies' ? 'active' : ''}`}
                onClick={() => setActiveTab('frequencies')}
              >
                📶 Frequencies ({watchlist.frequencies.length})
              </button>
            )}
          </div>

          <div className="watchlist-content">
            {activeTab === 'satellites' && watchlist.satellites.length > 0 && (
              <ul className="watchlist-list satellites-list">
                {watchlist.satellites.map(sat => (
                  <li key={sat.id} className="watchlist-item">
                    <div className="item-content">
                      <div className="item-name">🛰️ {sat.name}</div>
                      <div className="item-id">ID: {sat.id}</div>
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => handleRemoveSatellite(sat.id)}
                      title="Remove from watchlist"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === 'dx' && watchlist.dxCallsigns.length > 0 && (
              <ul className="watchlist-list dx-list">
                {watchlist.dxCallsigns.map(dx => (
                  <li key={dx.callsign} className="watchlist-item">
                    <div className="item-content">
                      <div className="item-name">📡 {dx.callsign}</div>
                      <div className="item-details">
                        {dx.frequency && <span className="freq">{dx.frequency}</span>}
                        {dx.mode && <span className="mode">{dx.mode}</span>}
                        {dx.country && <span className="country">{dx.country}</span>}
                      </div>
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => handleRemoveDX(dx.callsign)}
                      title="Remove from watchlist"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === 'frequencies' && watchlist.frequencies.length > 0 && (
              <ul className="watchlist-list frequencies-list">
                {watchlist.frequencies.map((freq, idx) => (
                  <li key={`${freq.frequency}-${freq.mode}-${idx}`} className="watchlist-item">
                    <div className="item-content">
                      <div className="item-name">📶 {freq.frequency} MHz</div>
                      <div className="item-details">
                        {freq.mode && <span className="mode">{freq.mode}</span>}
                        {freq.band && <span className="band">{freq.band}</span>}
                      </div>
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => handleRemoveFrequency(freq.frequency, freq.mode)}
                      title="Remove from watchlist"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
