import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './MobileMenu.css';

export default function MobileMenu({ callsign, onThemeToggle, currentTheme }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button className="hamburger" onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {isOpen && <div className="menu-backdrop" onClick={closeMenu}></div>}

      <nav className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h2>Menu</h2>
          <button className="menu-close" onClick={closeMenu}>✕</button>
        </div>

        <div className="menu-content">
          <Link to="/" className="menu-item" onClick={closeMenu}>
            🏠 Home
          </Link>
          <Link to="/satellite" className="menu-item" onClick={closeMenu}>
            🛰️ Satellites
          </Link>

          <div className="menu-divider"></div>

          <button className="menu-item theme-toggle" onClick={() => {
            onThemeToggle();
            closeMenu();
          }}>
            {currentTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>

          <a href="#settings" className="menu-item" onClick={(e) => {
            e.preventDefault();
            // Trigger settings modal if available
            window.dispatchEvent(new Event('openSettings'));
            closeMenu();
          }}>
            ⚙️ Settings
          </a>

          {callsign && (
            <div className="menu-footer">
              <div className="menu-callsign">Callsign: <strong>{callsign}</strong></div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
