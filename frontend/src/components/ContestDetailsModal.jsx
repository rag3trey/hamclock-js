/**
 * Contest Details Modal
 * Shows detailed information about a selected contest
 */

import React from 'react';
import './ContestDetailsModal.css';

export default function ContestDetailsModal({ contest, isOpen, onClose }) {
  if (!isOpen || !contest) return null;

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  const calculateEndTime = (endDate) => {
    return new Date(endDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="contest-modal-overlay" onClick={onClose}>
      <div className="contest-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="contest-modal-header">
          <h2>{contest.name}</h2>
          <button className="contest-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="contest-modal-body">
          {/* Status Badge */}
          <div className="contest-details-status">
            {contest.status === 'active' && (
              <span className="status-badge active">🔴 ACTIVE NOW</span>
            )}
            {contest.status === 'upcoming' && (
              <span className="status-badge upcoming">⏰ UPCOMING</span>
            )}
            {contest.status === 'finished' && (
              <span className="status-badge finished">✓ FINISHED</span>
            )}
          </div>

          {/* Description */}
          {contest.description && (
            <div className="contest-detail-section">
              <h3>About</h3>
              <p>{contest.description}</p>
            </div>
          )}

          {/* Schedule */}
          <div className="contest-detail-section">
            <h3>📅 Schedule</h3>
            <div className="schedule-info">
              <div className="schedule-item">
                <label>Starts:</label>
                <span>{formatDateTime(contest.start)}</span>
              </div>
              <div className="schedule-item">
                <label>Ends:</label>
                <span>{calculateEndTime(contest.end)}</span>
              </div>
              <div className="schedule-item">
                <label>Duration:</label>
                <span>{contest.duration_hours} hours</span>
              </div>
            </div>
          </div>

          {/* Bands */}
          {contest.bands && contest.bands.length > 0 && (
            <div className="contest-detail-section">
              <h3>📡 Bands</h3>
              <div className="bands-list">
                {contest.bands.map((band, idx) => (
                  <span key={idx} className="band-tag">{band}</span>
                ))}
              </div>
            </div>
          )}

          {/* Modes */}
          {contest.modes && contest.modes.length > 0 && (
            <div className="contest-detail-section">
              <h3>📶 Modes</h3>
              <div className="modes-list">
                {contest.modes.map((mode, idx) => (
                  <span key={idx} className="mode-tag">{mode}</span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="contest-detail-section">
            <h3>ℹ️ Info</h3>
            <div className="info-items">
              <div className="info-item">
                <label>Contest Type:</label>
                <span>{contest.type || 'Multi-band/Multi-mode'}</span>
              </div>
              <div className="info-item">
                <label>Region:</label>
                <span>{contest.region || 'Worldwide'}</span>
              </div>
            </div>
          </div>

          {/* Link to More Info */}
          {contest.url && (
            <div className="contest-detail-section">
              <a 
                href={contest.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="contest-info-link"
              >
                → View Full Contest Rules & Info
              </a>
            </div>
          )}
        </div>

        <div className="contest-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
