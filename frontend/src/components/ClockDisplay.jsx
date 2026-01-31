import React from 'react';
import './ClockDisplay.css';

const ClockDisplay = ({ time, format = '24h' }) => {
  // Format UTC time
  const utcHours = time.getUTCHours();
  const utcMinutes = time.getUTCMinutes().toString().padStart(2, '0');
  const utcSeconds = time.getUTCSeconds().toString().padStart(2, '0');
  
  let utcTime;
  if (format === '12h') {
    const period = utcHours >= 12 ? 'PM' : 'AM';
    const displayHours = utcHours % 12 || 12;
    utcTime = `${displayHours}:${utcMinutes}:${utcSeconds} ${period}`;
  } else {
    utcTime = `${utcHours.toString().padStart(2, '0')}:${utcMinutes}:${utcSeconds}`;
  }
  
  // Format local time
  const localHours = time.getHours();
  const localMinutes = time.getMinutes().toString().padStart(2, '0');
  const localSeconds = time.getSeconds().toString().padStart(2, '0');
  
  let localTime;
  if (format === '12h') {
    const period = localHours >= 12 ? 'PM' : 'AM';
    const displayHours = localHours % 12 || 12;
    localTime = `${displayHours}:${localMinutes}:${localSeconds} ${period}`;
  } else {
    localTime = `${localHours.toString().padStart(2, '0')}:${localMinutes}:${localSeconds}`;
  }
  
  return (
    <div className="clock-display">
      <div className="clock-section">
        <div className="clock-label">UTC</div>
        <div className="clock-time">{utcTime}</div>
      </div>
      <div className="clock-section">
        <div className="clock-label">Local</div>
        <div className="clock-time">{localTime}</div>
      </div>
    </div>
  );
};

export default ClockDisplay;
