import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSunPosition, fetchSunRiseSet, fetchMoonPosition } from '../api/astronomy';
import './SunMoonInfo.css';

// Moon phase graphic component
const MoonPhaseGraphic = ({ illumination, phaseName }) => {
  // Calculate rotation based on phase (0-360 degrees)
  // New moon = 0°, First quarter = 90°, Full moon = 180°, Last quarter = 270°
  const phaseToRotation = () => {
    const phases = {
      'New Moon': 0,
      'Waxing Crescent': 45,
      'First Quarter': 90,
      'Waxing Gibbous': 135,
      'Full Moon': 180,
      'Waning Gibbous': 225,
      'Last Quarter': 270,
      'Waning Crescent': 315,
    };
    return phases[phaseName] || Math.round((illumination / 100) * 360);
  };

  const rotation = phaseToRotation();
  const illuminationPercent = Math.round(illumination);

  return (
    <div className="moon-phase-graphic">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Outer circle (dark) */}
        <circle cx="40" cy="40" r="35" fill="#1a1a1a" stroke="#666" strokeWidth="2" />
        
        {/* Illuminated portion */}
        {illuminationPercent > 0 && illuminationPercent < 100 && (
          <defs>
            <mask id="moonMask">
              <circle cx="40" cy="40" r="35" fill="white" />
              {/* Ellipse for moon phase calculation */}
              <ellipse
                cx={40 + 35 * Math.sin((rotation * Math.PI) / 180)}
                cy="40"
                rx={35 * Math.abs(Math.cos((rotation * Math.PI) / 180))}
                ry="35"
                fill="black"
              />
            </mask>
          </defs>
        )}
        
        {/* Illuminated circle with mask */}
        {illuminationPercent > 0 && illuminationPercent < 100 ? (
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="#e0e0e0"
            mask="url(#moonMask)"
          />
        ) : illuminationPercent >= 100 ? (
          <circle cx="40" cy="40" r="35" fill="#e0e0e0" />
        ) : null}
        
        {/* Craters/details */}
        <circle cx="35" cy="30" r="2" fill="#999" opacity="0.6" />
        <circle cx="45" cy="50" r="1.5" fill="#999" opacity="0.6" />
        <circle cx="38" cy="55" r="1" fill="#999" opacity="0.6" />
        
        {/* Border */}
        <circle cx="40" cy="40" r="35" fill="none" stroke="#999" strokeWidth="1" />
      </svg>
      <div className="moon-phase-label">
        <div className="phase-name">{phaseName}</div>
        <div className="illumination">{illuminationPercent}% illuminated</div>
      </div>
    </div>
  );
};

const SunMoonInfo = ({ latitude, longitude }) => {
  const { data: sunPos } = useQuery({
    queryKey: ['sunPosition', latitude, longitude],
    queryFn: () => fetchSunPosition(latitude, longitude),
    refetchInterval: 60000,
  });
  
  const { data: sunRiseSet } = useQuery({
    queryKey: ['sunRiseSet', latitude, longitude],
    queryFn: () => fetchSunRiseSet(latitude, longitude),
    refetchInterval: 300000, // 5 minutes
  });
  
  const { data: moonPos } = useQuery({
    queryKey: ['moonPosition', latitude, longitude],
    queryFn: () => fetchMoonPosition(latitude, longitude),
    refetchInterval: 60000,
  });
  
  return (
    <div className="sun-moon-info">
      <div className="info-section">
        <h4>☀️ Sun</h4>
        {sunPos && (
          <div className="info-data">
            <div>Azimuth: {sunPos.azimuth.toFixed(1)}°</div>
            <div>Elevation: {sunPos.elevation.toFixed(1)}°</div>
          </div>
        )}
        {sunRiseSet && (
          <div className="info-data">
            <div>Sunrise: {new Date(sunRiseSet.sunrise).toLocaleTimeString()}</div>
            <div>Sunset: {new Date(sunRiseSet.sunset).toLocaleTimeString()}</div>
          </div>
        )}
      </div>
      
      <div className="info-section">
        <h4>🌙 Moon</h4>
        {moonPos && (
          <>
            <MoonPhaseGraphic illumination={moonPos.illumination_percent} phaseName={moonPos.phase_name} />
            <div className="info-data">
              <div>Azimuth: {moonPos.azimuth.toFixed(1)}°</div>
              <div>Elevation: {moonPos.elevation.toFixed(1)}°</div>
              <div>Phase: {moonPos.phase_name}</div>
              <div>Illumination: {moonPos.illumination_percent}%</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SunMoonInfo;
