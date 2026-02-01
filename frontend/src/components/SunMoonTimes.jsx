import React, { useState, useEffect } from 'react';
import { fetchSunRiseSet, fetchMoonRiseSet, fetchMoonPosition } from '../api/astronomy';
import './SunMoonTimes.css';

const SunMoonTimes = ({ deLocation, units = 'imperial' }) => {
  const [sunData, setSunData] = useState(null);
  const [moonData, setMoonData] = useState(null);
  const [moonPhase, setMoonPhase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deLocation) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch sun rise/set
        const sunResponse = await fetchSunRiseSet(deLocation.latitude, deLocation.longitude, today);
        setSunData(sunResponse);

        // Fetch moon rise/set
        const moonResponse = await fetchMoonRiseSet(deLocation.latitude, deLocation.longitude, today);
        setMoonData(moonResponse);

        // Fetch moon phase
        const moonPosResponse = await fetchMoonPosition(deLocation.latitude, deLocation.longitude);
        setMoonPhase(moonPosResponse);
      } catch (err) {
        console.error('Error fetching sun/moon data:', err);
        setError('Failed to load sun/moon times');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [deLocation]);

  if (!deLocation) {
    return <div className="sun-moon-times">Set location to view sun/moon times</div>;
  }

  if (loading) {
    return <div className="sun-moon-times loading">Loading...</div>;
  }

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}Z`;
    } catch {
      return 'N/A';
    }
  };

  const getMoonPhaseEmoji = (illumination) => {
    if (!illumination) return '🌙';
    if (illumination < 10) return '🌑'; // New moon
    if (illumination < 25) return '🌒'; // Waxing crescent
    if (illumination < 40) return '🌓'; // First quarter
    if (illumination < 60) return '🌔'; // Waxing gibbous
    if (illumination < 75) return '🌕'; // Full moon
    if (illumination < 90) return '🌖'; // Waning gibbous
    return '🌗'; // Last quarter
  };

  const getMoonPhaseLabel = (illumination) => {
    if (!illumination) return 'Unknown';
    if (illumination < 10) return 'New Moon';
    if (illumination < 25) return 'Waxing Crescent';
    if (illumination < 40) return 'First Quarter';
    if (illumination < 60) return 'Waxing Gibbous';
    if (illumination < 75) return 'Full Moon';
    if (illumination < 90) return 'Waning Gibbous';
    return 'Last Quarter';
  };

  return (
    <div className="sun-moon-times">
      <div className="sun-moon-header">
        <h3>☀️ Today's Sun & Moon</h3>
      </div>

      <div className="sun-moon-content">
        {/* Sun Times */}
        <div className="sun-section">
          <div className="section-title">☀️ Sun</div>
          <div className="time-row">
            <span className="time-label">🌅 Rise:</span>
            <span className="time-value">{formatTime(sunData?.sunrise)}</span>
          </div>
          <div className="time-row">
            <span className="time-label">🌇 Set:</span>
            <span className="time-value">{formatTime(sunData?.sunset)}</span>
          </div>
          {sunData?.daylight_hours && (
            <div className="time-row">
              <span className="time-label">⏱️ Daylight:</span>
              <span className="time-value">{sunData.daylight_hours.toFixed(1)} hrs</span>
            </div>
          )}
        </div>

        {/* Moon Times */}
        <div className="moon-section">
          <div className="section-title">🌙 Moon</div>
          <div className="time-row">
            <span className="time-label">🌅 Rise:</span>
            <span className="time-value">{formatTime(moonData?.moonrise)}</span>
          </div>
          <div className="time-row">
            <span className="time-label">🌇 Set:</span>
            <span className="time-value">{formatTime(moonData?.moonset)}</span>
          </div>
          {moonPhase?.illumination !== undefined && (
            <>
              <div className="time-row">
                <span className="time-label">💡 Illumination:</span>
                <span className="time-value">{(moonPhase.illumination * 100).toFixed(0)}%</span>
              </div>
              <div className="time-row moon-phase-row">
                <span className="phase-emoji">{getMoonPhaseEmoji(moonPhase.illumination * 100)}</span>
                <span className="phase-label">{getMoonPhaseLabel(moonPhase.illumination * 100)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default SunMoonTimes;
