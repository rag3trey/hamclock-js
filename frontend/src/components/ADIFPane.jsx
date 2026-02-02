import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { uploadADIFLog, fetchADIFQSOs, fetchADIFStatistics, searchADIFQSOs } from '../api';
import './ADIFPane.css';

const ADIFPane = () => {
  const [logName] = useState('main');
  const [selectedBand, setSelectedBand] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [searchCall, setSearchCall] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [qsos, setQsos] = useState([]);
  const [stats, setStats] = useState(null);

  // Fetch statistics
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['adif-stats', logName],
    queryFn: () => fetchADIFStatistics(logName),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch QSOs
  const { data: qsosData, isLoading: qsosLoading, error: qsosError, refetch: refetchQsos } = useQuery({
    queryKey: ['adif-qsos', logName, selectedBand, selectedMode],
    queryFn: () => fetchADIFQSOs(
      logName,
      50,
      selectedBand !== 'all' ? selectedBand : null,
      selectedMode !== 'all' ? selectedMode : null
    ),
    staleTime: 5 * 60 * 1000,
  });

  // Update local state from query results
  useEffect(() => {
    if (statsData?.statistics) {
      setStats(statsData.statistics);
    }
  }, [statsData]);

  useEffect(() => {
    if (qsosData?.qsos) {
      setQsos(qsosData.qsos);
    }
  }, [qsosData]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const result = await uploadADIFLog(file, logName);
      setStats(result.statistics);
      setUploadError(null);
      
      // Refetch QSOs after upload
      refetchQsos();
      
      // Reset file input
      if (event.target) event.target.value = '';
    } catch (error) {
      setUploadError(error.message || 'Failed to upload ADIF log');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCall.trim()) {
      refetchQsos();
      return;
    }

    try {
      const result = await searchADIFQSOs(searchCall, logName);
      setQsos(result.qsos || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const bands = stats?.band_stats ? Object.keys(stats.band_stats).sort() : [];
  const modes = stats?.mode_stats ? Object.keys(stats.mode_stats).sort() : [];

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="adif-pane">
      {/* Header */}
      <div className="adif-header">
        <div className="adif-title">📋 QSO Log</div>
        <label className="upload-btn">
          {uploading ? 'Uploading...' : '📤 Upload'}
          <input
            type="file"
            accept=".adi,.adif,.txt"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Statistics */}
      {stats && stats.total_qsos > 0 ? (
        <div className="adif-stats">
          <div className="stat-item">
            <span className="stat-label">Total QSOs</span>
            <span className="stat-value">{stats.total_qsos}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unique Calls</span>
            <span className="stat-value">{stats.unique_calls}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Grids Worked</span>
            <span className="stat-value">{stats.worked_grids}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Countries</span>
            <span className="stat-value">{stats.worked_countries}</span>
          </div>
        </div>
      ) : (
        <div className="adif-stats">
          <div className="stat-item">
            <span className="stat-label">Total QSOs</span>
            <span className="stat-value">0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unique Calls</span>
            <span className="stat-value">0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Grids Worked</span>
            <span className="stat-value">0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Countries</span>
            <span className="stat-value">0</span>
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="upload-error">
          ⚠️ {uploadError}
        </div>
      )}

      {/* Filters - Only show if we have stats */}
      {stats && (
      <div className="adif-filters">
        <div className="filter-group">
          <label>Band:</label>
          <select
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            {bands.map((band) => (
              <option key={band} value={band}>
                {band} ({stats.band_stats[band]})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Mode:</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode} ({stats.mode_stats[mode]})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <input
            type="text"
            placeholder="Search callsign..."
            value={searchCall}
            onChange={(e) => setSearchCall(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-btn">🔍</button>
        </div>
      </div>
      )}

      {/* QSO List */}
      <div className="qso-list">
        {qsosLoading ? (
          <div className="loading">Loading QSOs...</div>
        ) : qsos.length === 0 ? (
          <div className="no-qsos">
            {stats?.total_qsos === 0
              ? 'No QSOs logged. Upload an ADIF file to get started!'
              : 'No QSOs match the selected filters.'}
          </div>
        ) : (
          qsos.map((qso, idx) => (
            <div key={idx} className="qso-entry">
              <div className="qso-top">
                <span className="qso-call">{qso.call}</span>
                <span className="qso-freq">{qso.frequency.toFixed(2)} MHz</span>
                <span className="qso-mode">{qso.mode}</span>
              </div>

              <div className="qso-middle">
                <span className="qso-date">{formatDate(qso.date_time)}</span>
                <span className="qso-time">{formatTime(qso.date_time)}</span>
                {qso.grid && <span className="qso-grid">🗺️ {qso.grid}</span>}
                {qso.country && <span className="qso-country">🌍 {qso.country}</span>}
              </div>

              <div className="qso-details">
                {qso.rst_sent && (
                  <span className="qso-rst">
                    ↗️ {qso.rst_sent}
                  </span>
                )}
                {qso.rst_received && (
                  <span className="qso-rst">
                    ↙️ {qso.rst_received}
                  </span>
                )}
                {qso.power && (
                  <span className="qso-power">
                    ⚡ {qso.power.toFixed(0)}W
                  </span>
                )}
              </div>

              {qso.notes && (
                <div className="qso-notes">{qso.notes}</div>
              )}
            </div>
          ))
        )}
      </div>

      {qsos.length > 0 && (
        <div className="qso-footer">
          Showing {qsos.length} of {stats?.total_qsos || 0} QSOs
        </div>
      )}
    </div>
  );
};

export default ADIFPane;
