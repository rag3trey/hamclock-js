import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNCDXFBeacons } from '../api';
import './NCDXFBeaconsPane.css';

const NCDXFBeaconsPane = ({ latitude = 37.7749, longitude = -122.4194 }) => {
  const { data: beaconData, isLoading } = useQuery({
    queryKey: ['ncdxf', latitude, longitude],
    queryFn: () => fetchNCDXFBeacons(latitude, longitude),
    refetchInterval: 30000, // Update every 30 seconds
  });
  
  if (isLoading) return <div className="ncdxf-pane loading">Loading beacons...</div>;
  if (!beaconData) return <div className="ncdxf-pane">No data</div>;
  
  // Group beacons by status
  const heard = beaconData.beacons.filter(b => b.status === 'heard');
  const maybe = beaconData.beacons.filter(b => b.status === 'maybe');
  const notHeard = beaconData.beacons.filter(b => b.status === 'not_heard');
  
  const getPropagationColor = (propagation) => {
    switch(propagation) {
      case 'Excellent': return '#4caf50';
      case 'Good': return '#81c784';
      case 'Fair': return '#ffb74d';
      case 'Poor': return '#e57373';
      default: return '#888';
    }
  };
  
  const getSignalBars = (strength) => {
    const bars = Math.round(strength);
    return '▮'.repeat(bars) + '▯'.repeat(5 - bars);
  };
  
  return (
    <div className="ncdxf-pane">
      <div className="ncdxf-header">
        <div className="propagation-summary">
          <div 
            className="prop-badge"
            style={{ backgroundColor: getPropagationColor(beaconData.propagation_quality) }}
          >
            {beaconData.propagation_quality}
          </div>
          <div className="prop-stats">
            <span className="heard">◉ {beaconData.heard_count} heard</span>
            {beaconData.maybe_count > 0 && (
              <span className="maybe">◐ {beaconData.maybe_count} maybe</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="beacons-container">
        {heard.length > 0 && (
          <div className="beacon-group">
            <div className="group-label heard-label">Heard (Strong Signal)</div>
            <div className="beacons-list">
              {heard.map(beacon => (
                <div key={beacon.call} className="beacon-item heard">
                  <div className="beacon-call">{beacon.call}</div>
                  <div className="beacon-info">
                    <span className="beacon-location">{beacon.location}</span>
                    <span className="beacon-signal">{getSignalBars(beacon.signal_strength)}</span>
                  </div>
                  <div className="beacon-freq">{beacon.frequency} MHz</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {maybe.length > 0 && (
          <div className="beacon-group">
            <div className="group-label maybe-label">Maybe (Weak Signal)</div>
            <div className="beacons-list">
              {maybe.map(beacon => (
                <div key={beacon.call} className="beacon-item maybe">
                  <div className="beacon-call">{beacon.call}</div>
                  <div className="beacon-info">
                    <span className="beacon-location">{beacon.location}</span>
                    <span className="beacon-signal">{getSignalBars(beacon.signal_strength)}</span>
                  </div>
                  <div className="beacon-freq">{beacon.frequency} MHz</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {notHeard.length > 0 && (
          <div className="beacon-group">
            <div className="group-label not-heard-label">Not Heard</div>
            <div className="beacons-list">
              {notHeard.map(beacon => (
                <div key={beacon.call} className="beacon-item not-heard">
                  <div className="beacon-call">{beacon.call}</div>
                  <div className="beacon-location">{beacon.location}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="ncdxf-footer">
        <small>NCDXF Beacons @ 14.100 MHz | Seq: 10s tx / 10s rest</small>
      </div>
    </div>
  );
};

export default NCDXFBeaconsPane;
