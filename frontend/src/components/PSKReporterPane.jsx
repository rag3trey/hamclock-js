import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPSKSpots, fetchPSKBandActivity } from '../api/index';
import { formatDistance } from '../utils/units';
import './PSKReporterPane.css';

const PSKReporterPane = ({ latitude, longitude, units = 'imperial' }) => {
  const [selectedBand, setSelectedBand] = useState('all');
  const [sortBy, setSortBy] = useState('snr'); // snr, distance, time

  // Fetch PSK Reporter spots
  const { data: spotsData, isLoading: spotsLoading } = useQuery({
    queryKey: ['pskSpots', latitude, longitude],
    queryFn: () => fetchPSKSpots(latitude, longitude),
    refetchInterval: 30000, // Update every 30 seconds
    enabled: !!latitude && !!longitude,
  });

  // Fetch active bands
  const { data: bandsData } = useQuery({
    queryKey: ['pskBands'],
    queryFn: fetchPSKBandActivity,
    refetchInterval: 30000,
  });

  const getSpots = () => {
    if (!spotsData?.spots) return [];
    
    let filtered = [...spotsData.spots];

    // Filter by band if selected
    if (selectedBand !== 'all') {
      const bandRanges = {
        '160m': { min: 1.8, max: 2.0 },
        '80m': { min: 3.5, max: 4.0 },
        '40m': { min: 7.0, max: 7.3 },
        '30m': { min: 10.1, max: 10.15 },
        '20m': { min: 14.0, max: 14.35 },
        '17m': { min: 18.068, max: 18.168 },
        '15m': { min: 21.0, max: 21.45 },
        '12m': { min: 24.89, max: 24.99 },
        '10m': { min: 28.0, max: 29.7 },
      };

      const range = bandRanges[selectedBand];
      if (range) {
        filtered = filtered.filter(s => s.frequency >= range.min && s.frequency <= range.max);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'snr') return b.snr - a.snr;
      if (sortBy === 'distance') return a.distance_km - b.distance_km;
      if (sortBy === 'time') return new Date(b.time_received) - new Date(a.time_received);
      return 0;
    });

    return filtered;
  };

  const getBandName = (freq) => {
    if (freq >= 1.8 && freq < 2.0) return '160m';
    if (freq >= 3.5 && freq < 4.0) return '80m';
    if (freq >= 7.0 && freq < 7.3) return '40m';
    if (freq >= 10.1 && freq < 10.15) return '30m';
    if (freq >= 14.0 && freq < 14.35) return '20m';
    if (freq >= 18.068 && freq < 18.168) return '17m';
    if (freq >= 21.0 && freq < 21.45) return '15m';
    if (freq >= 24.89 && freq < 24.99) return '12m';
    if (freq >= 28.0 && freq < 29.7) return '10m';
    return 'VHF/UHF';
  };

  const getModeColor = (mode) => {
    const modeColors = {
      'PSK31': '#4caf50',
      'FT8': '#2196f3',
      'RTTY': '#ff9800',
      'JT65': '#9c27b0',
      'FT4': '#00bcd4',
      'FSK441': '#f44336',
    };
    return modeColors[mode] || '#999';
  };

  const getSNRColor = (snr) => {
    if (snr >= 10) return '#4caf50'; // Excellent
    if (snr >= 0) return '#81c784'; // Good
    if (snr >= -10) return '#ffb74d'; // Fair
    return '#e57373'; // Poor
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const spotTime = new Date(dateString);
    const diff = Math.floor((now - spotTime) / 1000); // seconds

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const spots = getSpots();

  return (
    <div className="psk-reporter-pane">
      <div className="psk-header">
        <h3>📡 PSK Reporter - Digital Modes</h3>
        <div className="psk-controls">
          <select 
            value={selectedBand} 
            onChange={(e) => setSelectedBand(e.target.value)}
            className="psk-band-select"
          >
            <option value="all">All Bands</option>
            <option value="160m">160m</option>
            <option value="80m">80m</option>
            <option value="40m">40m</option>
            <option value="30m">30m</option>
            <option value="20m">20m</option>
            <option value="17m">17m</option>
            <option value="15m">15m</option>
            <option value="12m">12m</option>
            <option value="10m">10m</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="psk-sort-select"
          >
            <option value="snr">Sort: SNR</option>
            <option value="distance">Sort: Distance</option>
            <option value="time">Sort: Recent</option>
          </select>
        </div>
      </div>

      {bandsData?.active_bands && Object.keys(bandsData.active_bands).length > 0 && (
        <div className="psk-active-bands">
          <div className="bands-label">Active Bands:</div>
          <div className="bands-list">
            {Object.entries(bandsData.active_bands).map(([band, info]) => (
              <div key={band} className="band-badge">
                <span className="band-name">{band}</span>
                <span className="band-count">{info.spot_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psk-stats">
        <div className="stat-item">
          <span className="stat-label">Total Spots:</span>
          <span className="stat-value">{spotsData?.count || 0}</span>
        </div>
      </div>

      {spotsLoading ? (
        <div className="psk-loading">Loading PSK Reporter data...</div>
      ) : spots.length === 0 ? (
        <div className="psk-empty">
          {selectedBand !== 'all' ? (
            <>No spots on {selectedBand}</>
          ) : (
            <>No PSK Reporter spots available</>
          )}
        </div>
      ) : (
        <div className="psk-spots-container">
          <div className="psk-spots-header">
            <div className="spot-col-tx">TX Call</div>
            <div className="spot-col-freq">Frequency</div>
            <div className="spot-col-mode">Mode</div>
            <div className="spot-col-snr">SNR</div>
            <div className="spot-col-dist">Distance</div>
            <div className="spot-col-time">Time</div>
          </div>

          <div className="psk-spots-list">
            {spots.slice(0, 20).map((spot, idx) => (
              <div key={idx} className="psk-spot-item">
                <div className="spot-col-tx">
                  <span className="tx-call" title={spot.tx_loc}>
                    {spot.tx_call}
                  </span>
                </div>
                <div className="spot-col-freq">
                  <span className="frequency">{spot.frequency.toFixed(3)}</span>
                  <span className="band-name-small">{getBandName(spot.frequency)}</span>
                </div>
                <div className="spot-col-mode">
                  <span 
                    className="mode-badge"
                    style={{ backgroundColor: getModeColor(spot.mode) }}
                  >
                    {spot.mode}
                  </span>
                </div>
                <div className="spot-col-snr">
                  <span 
                    className="snr-value"
                    style={{ color: getSNRColor(spot.snr) }}
                  >
                    {spot.snr > 0 ? '+' : ''}{spot.snr.toFixed(0)} dB
                  </span>
                </div>
                <div className="spot-col-dist">
                  <span className="distance">
                    {formatDistance(spot.distance_km, units)}
                  </span>
                </div>
                <div className="spot-col-time">
                  <span className="time-ago">{formatTime(spot.time_received)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psk-footer">
        PSK Reporter tracks FT8, FT4, PSK31, RTTY, JT65 and other digital modes
      </div>
    </div>
  );
};

export default PSKReporterPane;
