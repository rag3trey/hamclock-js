import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSatelliteList, fetchSatellitePasses } from '../api';
import './SatellitePage.css';

const SatellitePage = () => {
  const [selectedSat, setSelectedSat] = useState(null);
  const [observerLat, setObserverLat] = useState(null);
  const [observerLng, setObserverLng] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [minElevation, setMinElevation] = useState(10);
  const [lookAhead, setLookAhead] = useState(24);
  const [displayLimit, setDisplayLimit] = useState(10);
  
  // Request geolocation on mount
  useEffect(() => {
    const requestLocation = () => {
      if (!navigator.geolocation) {
        setObserverLat(37.7749);
        setObserverLng(-122.4194);
        return;
      }
      
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setObserverLat(position.coords.latitude);
          setObserverLng(position.coords.longitude);
          setGettingLocation(false);
        },
        () => {
          setObserverLat(37.7749);
          setObserverLng(-122.4194);
          setGettingLocation(false);
        }
      );
    };
    
    requestLocation();
  }, []);
  
  const { data: satList, isLoading: satListLoading } = useQuery({
    queryKey: ['satellites'],
    queryFn: fetchSatelliteList,
  });
  
  // Set default satellite once list is loaded
  useEffect(() => {
    if (satList?.satellites && satList.satellites.length > 0 && !selectedSat) {
      setSelectedSat(satList.satellites[0].name);
    }
  }, [satList, selectedSat]);
  
  const { data: passes, isLoading: passesLoading, error: passesError } = useQuery({
    queryKey: ['passes', selectedSat, observerLat, observerLng, lookAhead, minElevation],
    queryFn: () => {
      if (!selectedSat || observerLat === null || observerLng === null) {
        return Promise.reject(new Error('Missing required parameters'));
      }
      return fetchSatellitePasses(selectedSat, observerLat, observerLng, lookAhead, minElevation);
    },
    enabled: !!selectedSat && observerLat !== null && observerLng !== null,
    retry: 1,
  });
  
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };
  
  const formatDateOnly = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  const groupPassesByDay = (passes) => {
    if (!passes) return [];
    const grouped = {};
    passes.forEach(pass => {
      const day = formatDateOnly(pass.aos.time);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(pass);
    });
    return Object.entries(grouped).map(([day, dayPasses]) => ({ day, passes: dayPasses }));
  };
  
  return (
    <div className="satellite-page">
      <div className="page-header">
        <h2>🛰️ Satellite Tracker</h2>
        <p className="subtitle">Predict satellite passes from your location</p>
      </div>
      
      {gettingLocation && (
        <div className="location-banner">
          📍 Requesting your location...
        </div>
      )}
      
      <div className="satellite-container">
        <div className="controls-panel">
          <h3>Observation Parameters</h3>
          
          <div className="control-group">
            <label>Satellite:</label>
            {satListLoading ? (
              <div className="loading">Loading satellites...</div>
            ) : (
              <select 
                value={selectedSat || ''} 
                onChange={(e) => setSelectedSat(e.target.value)}
                className="control-select"
              >
                <option value="">Select a satellite...</option>
                {satList?.satellites?.map(sat => (
                  <option key={sat.name} value={sat.name}>{sat.name}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="control-group">
            <label>Observer Location:</label>
            <div className="location-display">
              <div>Latitude: {observerLat?.toFixed(4) || 'Loading...'}</div>
              <div>Longitude: {observerLng?.toFixed(4) || 'Loading...'}</div>
            </div>
          </div>
          
          <div className="control-group">
            <label>Minimum Elevation: {minElevation}°</label>
            <input
              type="range"
              min="0"
              max="90"
              value={minElevation}
              onChange={(e) => setMinElevation(parseInt(e.target.value))}
              className="control-slider"
            />
          </div>
          
          <div className="control-group">
            <label>Look Ahead: {lookAhead} hours</label>
            <input
              type="range"
              min="1"
              max="72"
              value={lookAhead}
              onChange={(e) => setLookAhead(parseInt(e.target.value))}
              className="control-slider"
            />
            <div className="slider-note">Showing top {Math.min(displayLimit, passes?.count || 0)} of {passes?.count || 0} passes</div>
          </div>
        </div>
        
        <div className="passes-panel">
          <h3>Upcoming Passes</h3>
          
          {passesError && (
            <div className="error-message">
              <strong>Error loading passes:</strong> {passesError.message}
              {passesError.response?.data?.detail && (
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {passesError.response.data.detail}
                </div>
              )}
            </div>
          )}
          
          {passesLoading ? (
            <div className="loading">Calculating passes...</div>
          ) : !passes?.passes || passes.passes.length === 0 ? (
            <div className="no-passes">
              <p>No passes found in the next {lookAhead} hours above {minElevation}°</p>
            </div>
          ) : (
            <>
              {groupPassesByDay(passes.passes.slice(0, displayLimit)).map(({ day, passes: dayPasses }, dayIdx) => (
                <div key={dayIdx} className="passes-day-group">
                  <div className="passes-day-header">{day}</div>
                  <div className="passes-list">
                    {dayPasses.map((pass, passIdx) => (
                      <div key={passIdx} className="pass-card">
                        <div className="pass-header">
                          {new Date(pass.aos.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(pass.los.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="pass-body">
                          <div className="pass-row">
                            <span className="pass-label">Rise:</span>
                            <span className="pass-value">{new Date(pass.aos.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="pass-detail">{pass.aos.azimuth.toFixed(0)}°</span>
                          </div>
                          
                          <div className="pass-row highlight">
                            <span className="pass-label">Max:</span>
                            <span className="pass-value">{pass.max_elevation.toFixed(1)}°</span>
                            <span className="pass-detail">{pass.duration_minutes}m</span>
                          </div>
                          
                          <div className="pass-row">
                            <span className="pass-label">Set:</span>
                            <span className="pass-value">{new Date(pass.los.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="pass-detail">{pass.los.azimuth.toFixed(0)}°</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {passes.passes.length > displayLimit && (
                <div className="passes-note">
                  Showing {displayLimit} of {passes.passes.length} passes · Total: {passes.count} visible
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SatellitePage;
