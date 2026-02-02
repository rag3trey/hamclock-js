import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './DXpeditionPane.css';

const DXpeditionPane = ({ deLocation = { latitude: 40.7128, longitude: -74.0060 } }) => {
  const [expandedCall, setExpandedCall] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active'); // 'all', 'active', 'upcoming'
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch active expeditions
  const { data: expeditionsData, isLoading, error } = useQuery({
    queryKey: ['dxpeditions', filterStatus],
    queryFn: async () => {
      let url;
      if (filterStatus === 'active') {
        url = `http://localhost:8080/api/v1/dxpeditions/active?limit=20`;
      } else if (filterStatus === 'upcoming') {
        url = `http://localhost:8080/api/v1/dxpeditions/upcoming?limit=20`;
      } else {
        url = `http://localhost:8080/api/v1/dxpeditions/all`;
      }

      const response = await axios.get(url);
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  // Filter by search query
  const filteredExpeditions = (expeditionsData || []).filter((exp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exp.call_sign.toLowerCase().includes(query) ||
      exp.location.toLowerCase().includes(query) ||
      exp.country.toLowerCase().includes(query)
    );
  });

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return '#4ade80'; // green
      case 'upcoming':
        return '#60a5fa'; // blue
      case 'completed':
        return '#a78bfa'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '🔴 ACTIVE';
      case 'upcoming':
        return '🔵 UPCOMING';
      case 'completed':
        return '⚫ COMPLETED';
      default:
        return status;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (endDateStr) => {
    const endDate = new Date(endDateStr + 'T23:59:59Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(dLon);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;
    return Math.round(bearing);
  };

  const getBearingLabel = (bearing) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  };

  if (isLoading) {
    return (
      <div className="dxpedition-pane">
        <div className="pane-header">
          <h3>📡 DX-Peditions</h3>
        </div>
        <div className="loading-message">Loading expeditions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dxpedition-pane">
        <div className="pane-header">
          <h3>📡 DX-Peditions</h3>
        </div>
        <div className="error-message">Failed to load expeditions</div>
      </div>
    );
  }

  return (
    <div className="dxpedition-pane">
      <div className="pane-header">
        <h3>📡 DX-Peditions</h3>
        <div className="expedition-count">
          {filteredExpeditions.length}/{expeditionsData?.length || 0}
        </div>
      </div>

      <div className="dxpedition-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filterStatus === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilterStatus('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search call, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="expedition-list">
        {filteredExpeditions.length === 0 ? (
          <div className="no-expeditions">
            <p>No {filterStatus !== 'all' ? filterStatus : ''} expeditions found</p>
          </div>
        ) : (
          filteredExpeditions.map((expedition) => {
            const distance = deLocation?.latitude
              ? calculateDistance(
                  deLocation.latitude,
                  deLocation.longitude,
                  expedition.latitude || 0,
                  expedition.longitude || 0
                )
              : null;
            const bearing = deLocation?.latitude
              ? calculateBearing(
                  deLocation.latitude,
                  deLocation.longitude,
                  expedition.latitude || 0,
                  expedition.longitude || 0
                )
              : null;

            const isExpanded = expandedCall === expedition.call_sign;
            const daysLeft = getDaysRemaining(expedition.dates.end);

            return (
              <div
                key={expedition.call_sign}
                className={`expedition-item ${isExpanded ? 'expanded' : ''}`}
              >
                <div
                  className="expedition-header"
                  onClick={() => setExpandedCall(isExpanded ? null : expedition.call_sign)}
                >
                  <div className="expedition-call">
                    <span className="call-sign">{expedition.call_sign}</span>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusBadgeColor(expedition.status) }}
                      title={getStatusText(expedition.status)}
                    >
                      {getStatusText(expedition.status)}
                    </span>
                  </div>

                  <div className="expedition-summary">
                    <span className="location">{expedition.location}</span>
                    {distance !== null && (
                      <span className="distance">
                        {distance} km
                      </span>
                    )}
                    {daysLeft > 0 && (
                      <span className="days-left">{daysLeft}d</span>
                    )}
                  </div>

                  <div className="expand-icon">{isExpanded ? '▼' : '▶'}</div>
                </div>

                {isExpanded && (
                  <div className="expedition-details">
                    <div className="detail-row">
                      <span className="detail-label">Country:</span>
                      <span className="detail-value">{expedition.country}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Dates:</span>
                      <span className="detail-value">
                        {formatDate(expedition.dates.start)} — {formatDate(expedition.dates.end)}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Primary Band:</span>
                      <span className="detail-value">{expedition.primary_band}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Modes:</span>
                      <span className="detail-value">{expedition.modes.join(', ')}</span>
                    </div>

                    {expedition.qsl_via && (
                      <div className="detail-row">
                        <span className="detail-label">QSL via:</span>
                        <span className="detail-value">{expedition.qsl_via}</span>
                      </div>
                    )}

                    {expedition.notes && (
                      <div className="detail-row">
                        <span className="detail-label">Notes:</span>
                        <span className="detail-value notes">{expedition.notes}</span>
                      </div>
                    )}

                    {expedition.url && (
                      <div className="detail-row">
                        <a
                          href={expedition.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="expedition-link"
                        >
                          🔗 Visit Website
                        </a>
                      </div>
                    )}

                    {distance !== null && bearing !== null && (
                      <div className="detail-row">
                        <span className="detail-label">Distance:</span>
                        <span className="detail-value">
                          {distance.toLocaleString()} km @ {getBearingLabel(bearing)} ({bearing}°)
                        </span>
                      </div>
                    )}

                    {distance !== null && bearing !== null && (
                      <div className="detail-row">
                        <span className="detail-label">Position:</span>
                        <span className="detail-value">
                          {expedition.latitude?.toFixed(4)}, {expedition.longitude?.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DXpeditionPane;
