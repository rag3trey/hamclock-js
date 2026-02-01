import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lookupCallsign } from '../utils/prefixLookup';
import './CallsignInfo.css';

export default function CallsignInfo({ callsign, children }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState(null);
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);
  
  const info = callsign ? lookupCallsign(callsign) : null;

  useEffect(() => {
    if (!showTooltip || !wrapperRef.current || !tooltipRef.current) {
      setPosition(null);
      return;
    }

    const update = () => {
      if (!wrapperRef.current || !tooltipRef.current) return;
      
      const wrapper = wrapperRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();
      
      const tooltipHeight = tooltip.height || 100;
      const tooltipWidth = tooltip.width || 200;
      
      const spaceAbove = wrapper.top;
      const spaceBelow = window.innerHeight - wrapper.bottom;
      const showAbove = spaceAbove > tooltipHeight + 10;
      
      const top = showAbove 
        ? wrapper.top - tooltipHeight - 8 
        : wrapper.bottom + 8;
      
      let left = wrapper.left + wrapper.width / 2 - tooltipWidth / 2;
      if (left < 10) left = 10;
      if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      
      setPosition({ top, left, showAbove });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });
  }, [showTooltip]);

  if (!info || !info.country) {
    return <>{children}</>;
  }

  return (
    <>
      <span 
        ref={wrapperRef}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ display: 'inline' }}
      >
        {children}
      </span>
      
      {showTooltip && createPortal(
        <div 
          ref={tooltipRef}
          className={`callsign-tooltip ${position?.showAbove ? 'above' : 'below'}`}
          style={{
            position: 'fixed',
            top: position ? `${position.top}px` : '-9999px',
            left: position ? `${position.left}px` : '-9999px',
            zIndex: 10000,
            opacity: position ? 1 : 0
          }}
        >
          <div className="tooltip-content">
            <div className="tooltip-country">{info.country}</div>
            {info.cqZone && <div>CQ Zone: {info.cqZone}</div>}
            {info.ituZone && <div>ITU Zone: {info.ituZone}</div>}
            {info.continent && <div>Continent: {info.continent}</div>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
