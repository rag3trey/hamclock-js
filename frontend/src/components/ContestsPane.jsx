import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUpcomingContests } from '../api/contests';
import ContestDetailsModal from './ContestDetailsModal';
import './ContestsPane.css';

const ContestsPane = () => {
  const [contests, setContests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'upcoming', 'active'
  const [sortBy, setSortBy] = useState('start'); // 'start', 'duration', 'name'
  const [daysAhead, setDaysAhead] = useState(30);
  const [selectedContest, setSelectedContest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch contests
  const { data: contestsData, isLoading, error, refetch } = useQuery({
    queryKey: ['contests', daysAhead],
    queryFn: () => fetchUpcomingContests(daysAhead),
    refetchInterval: 1800000, // 30 minutes
    enabled: true,
  });

  // Update contests when data arrives
  useEffect(() => {
    if (contestsData?.contests) {
      let filtered = [...contestsData.contests];

      // Apply status filter
      if (filterStatus === 'upcoming') {
        filtered = filtered.filter(c => c.status === 'upcoming');
      } else if (filterStatus === 'active') {
        filtered = filtered.filter(c => c.status === 'active');
      }

      // Apply sorting
      if (sortBy === 'duration') {
        filtered.sort((a, b) => b.duration_hours - a.duration_hours);
      } else if (sortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }
      // Default is already sorted by start time

      setContests(filtered);
    }
  }, [contestsData, filterStatus, sortBy]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'upcoming':
        return 'status-upcoming';
      default:
        return 'status-finished';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return '🔴 Active';
      case 'upcoming':
        return '⏰ Upcoming';
      default:
        return '✓ Finished';
    }
  };

  if (isLoading) {
    return <div className="contests-pane loading">Loading contests...</div>;
  }

  if (error) {
    return (
      <div className="contests-pane error">
        <div className="error-message">Failed to load contests</div>
        <button onClick={() => refetch()} className="retry-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="contests-pane">
      <ContestDetailsModal 
        contest={selectedContest} 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          setSelectedContest(null);
        }}
      />
      
      <div className="contests-header">
        <h3>📅 Radio Contests</h3>
        <div className="contests-controls">
          <div className="control-group">
            <label>Days:</label>
            <select 
              value={daysAhead} 
              onChange={(e) => setDaysAhead(parseInt(e.target.value))}
              className="days-select"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          <div className="control-group">
            <label>Filter:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div className="control-group">
            <label>Sort:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="start">Start Time</option>
              <option value="duration">Duration</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      <div className="contests-list">
        {contests.length === 0 ? (
          <div className="no-contests">No contests found for the selected filters.</div>
        ) : (
          contests.map((contest, idx) => (
            <div 
              key={idx} 
              className={`contest-item ${getStatusClass(contest.status)}`}
              onClick={() => {
                setSelectedContest(contest);
                setShowModal(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="contest-top">
                <div className="contest-name">{contest.name}</div>
                <div className={`contest-status ${getStatusClass(contest.status)}`}>
                  {getStatusLabel(contest.status)}
                </div>
              </div>

              <div className="contest-times">
                <div className="time-row">
                  <span className="label">Start:</span>
                  <span className="time">{contest.start_display}</span>
                </div>
                <div className="time-row">
                  <span className="label">End:</span>
                  <span className="time">{contest.end_display}</span>
                </div>
                <div className="time-row">
                  <span className="label">Duration:</span>
                  <span className="duration">{contest.duration_hours}h</span>
                </div>
              </div>

              {(contest.bands.length > 0 || contest.modes.length > 0) && (
                <div className="contest-details">
                  {contest.bands.length > 0 && (
                    <div className="bands">
                      <span className="label">Bands:</span>
                      <div className="tags">
                        {contest.bands.map((band, i) => (
                          <span key={i} className="tag band-tag">{band}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {contest.modes.length > 0 && (
                    <div className="modes">
                      <span className="label">Modes:</span>
                      <div className="tags">
                        {contest.modes.map((mode, i) => (
                          <span key={i} className="tag mode-tag">{mode}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {contest.description && (
                <div className="contest-description">
                  {contest.description.substring(0, 150)}
                  {contest.description.length > 150 ? '...' : ''}
                </div>
              )}

              {contest.url && (
                <div className="contest-link">
                  <a href={contest.url} target="_blank" rel="noopener noreferrer">
                    More Info →
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {contestsData?.error && (
        <div className="contests-footer">
          <div className="cache-notice">
            ⚠️ Using cached data: {contestsData.error}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestsPane;
