import React, { useState, useEffect } from 'react';
import {
  fetchGetSettings,
  fetchUpdateSettings,
  fetchSetDELocation,
  fetchSetQRZCredentials,
  fetchSetTheme,
  fetchSetTimeFormat,
  fetchSetUnits,
  fetchSetCallsign,
  fetchResetSettings,
} from '../api/index';
import './SettingsModal.css';

export default function SettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('location');
  const [formData, setFormData] = useState({});

  // Load settings on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGetSettings();
      console.log('Settings loaded:', data);
      setSettings(data);
      setFormData(data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load settings';
      setError(errorMsg);
      console.error('Error loading settings:', err);
      // Initialize with empty form data so form still works
      setFormData({
        de_latitude: null,
        de_longitude: null,
        de_location_name: '',
        theme: 'dark',
        time_format: '24h',
        units: 'metric',
        callsign_lookup_service: 'radioid',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSaveDELocation = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Saving DE location:', formData.de_latitude, formData.de_longitude, formData.de_location_name);
      await fetchSetDELocation(
        formData.de_latitude,
        formData.de_longitude,
        formData.de_location_name
      );
      await loadSettings();
      alert('Location saved successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save DE location';
      setError(errorMsg);
      console.error('Error saving location:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQRZ = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Saving QRZ settings:', formData.callsign_lookup_service);
      // Save the lookup service preference
      await fetchUpdateSettings({ callsign_lookup_service: formData.callsign_lookup_service });
      // If QRZ is selected, also save credentials
      if (formData.callsign_lookup_service === 'qrz') {
        if (!formData.qrz_username || !formData.qrz_api_key) {
          throw new Error('QRZ username and API key are required');
        }
        await fetchSetQRZCredentials(formData.qrz_username, formData.qrz_api_key);
      }
      await loadSettings();
      alert('Callsign lookup settings saved!');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save callsign lookup settings';
      setError(errorMsg);
      console.error('Error saving QRZ settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (theme) => {
    console.log('handleThemeChange called with:', theme);
    try {
      setError(null);
      console.log('Saving theme:', theme);
      await fetchSetTheme(theme);
      console.log('Theme saved successfully');
      setFormData(prev => ({ ...prev, theme }));
      setSettings(prev => ({ ...prev, theme }));
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme);
      console.log('Theme applied to document');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save theme';
      setError(errorMsg);
      console.error('Error saving theme:', err);
    }
  };

  const handleTimeFormatChange = async (format) => {
    try {
      setError(null);
      console.log('Saving time format:', format);
      await fetchSetTimeFormat(format);
      setFormData(prev => ({ ...prev, time_format: format }));
      setSettings(prev => ({ ...prev, time_format: format }));
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save time format';
      setError(errorMsg);
      console.error('Error saving time format:', err);
    }
  };

  const handleUnitsChange = async (units) => {
    try {
      setError(null);
      console.log('Saving units:', units);
      await fetchSetUnits(units);
      setFormData(prev => ({ ...prev, units }));
      setSettings(prev => ({ ...prev, units }));
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save units';
      setError(errorMsg);
      console.error('Error saving units:', err);
    }
  };

  const handleCallsignChange = async (callsign) => {
    try {
      setError(null);
      console.log('Saving callsign:', callsign);
      await fetchSetCallsign(callsign);
      setFormData(prev => ({ ...prev, callsign }));
      setSettings(prev => ({ ...prev, callsign }));
      alert(`Callsign set to ${callsign}!`);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save callsign';
      setError(errorMsg);
      console.error('Error saving callsign:', err);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        setLoading(true);
        setError(null);
        console.log('Resetting settings...');
        await fetchResetSettings();
        await loadSettings();
        alert('Settings reset to defaults!');
      } catch (err) {
        const errorMsg = err.response?.data?.detail || err.message || 'Failed to reset settings';
        setError(errorMsg);
        console.error('Error resetting settings:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings & Preferences</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'callsign' ? 'active' : ''}`}
            onClick={() => setActiveTab('callsign')}
          >
            📞 Callsign
          </button>
          <button
            className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`}
            onClick={() => setActiveTab('location')}
          >
            📍 Location
          </button>
          <button
            className={`tab-btn ${activeTab === 'qrz' ? 'active' : ''}`}
            onClick={() => setActiveTab('qrz')}
          >
            📡 QRZ
          </button>
          <button
            className={`tab-btn ${activeTab === 'display' ? 'active' : ''}`}
            onClick={() => setActiveTab('display')}
          >
            🎨 Display
          </button>
          <button
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            ⚙️ Advanced
          </button>
        </div>

        <div className="settings-content">
          {error && <div className="error-message">{error}</div>}
          {loading && <div className="loading-spinner">Loading...</div>}

          {/* Callsign Tab */}
          {activeTab === 'callsign' && (
            <div className="tab-content">
              <div className="form-group">
                <label>Amateur Radio Callsign</label>
                <div className="input-group">
                  <input
                    type="text"
                    value={formData.callsign || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, callsign: e.target.value.toUpperCase() }))}
                    placeholder="e.g., W5XYZ or N0URE/MM"
                    maxLength="7"
                  />
                  <button 
                    onClick={() => handleCallsignChange(formData.callsign || '')}
                    disabled={!formData.callsign}
                    className="save-btn"
                  >
                    Save
                  </button>
                </div>
                <small>Your callsign will be displayed in the app header and used for QRZ lookups.</small>
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="tab-content">
              <div className="form-group">
                <label>Location Name</label>
                <input
                  type="text"
                  name="de_location_name"
                  value={formData.de_location_name || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., Home, Office"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    name="de_latitude"
                    value={formData.de_latitude || ''}
                    onChange={handleInputChange}
                    placeholder="-90 to 90"
                    step="0.0001"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    name="de_longitude"
                    value={formData.de_longitude || ''}
                    onChange={handleInputChange}
                    placeholder="-180 to 180"
                    step="0.0001"
                  />
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSaveDELocation}>
                Save Location
              </button>
            </div>
          )}

          {/* QRZ Tab */}
          {activeTab === 'qrz' && (
            <div className="tab-content">
              <div className="form-group">
                <label>Callsign Lookup Service</label>
                <div className="service-selector">
                  <button
                    className={`service-btn ${formData.callsign_lookup_service === 'radioid' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, callsign_lookup_service: 'radioid' }))}
                  >
                    📊 RadioID (Free)
                  </button>
                  <button
                    className={`service-btn ${formData.callsign_lookup_service === 'qrz' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, callsign_lookup_service: 'qrz' }))}
                  >
                    📡 QRZ (Premium)
                  </button>
                </div>
              </div>

              {formData.callsign_lookup_service === 'radioid' && (
                <div className="info-box">
                  <p><strong>RadioID.net</strong> - Free callsign lookup service</p>
                  <p>No credentials needed. Displays basic callsign and location information.</p>
                </div>
              )}

              {formData.callsign_lookup_service === 'qrz' && (
                <>
                  <div className="info-box">
                    <p><strong>QRZ.com</strong> - Premium callsign lookup service</p>
                    <p>Requires premium account and API credentials.</p>
                  </div>

                  <p className="help-text">
                    Enter your QRZ.com credentials to enable callsign lookup features.
                    Your credentials are stored locally and never shared.
                  </p>

                  <div className="form-group">
                    <label>QRZ Username</label>
                    <input
                      type="text"
                      name="qrz_username"
                      value={formData.qrz_username || ''}
                      onChange={handleInputChange}
                      placeholder="Your QRZ username"
                    />
                  </div>

                  <div className="form-group">
                    <label>QRZ API Key</label>
                    <input
                      type="password"
                      name="qrz_api_key"
                      value={formData.qrz_api_key || ''}
                      onChange={handleInputChange}
                      placeholder="Your QRZ API key"
                    />
                    <small>
                      Get your API key from{' '}
                      <a href="https://www.qrz.com/page/api_details" target="_blank" rel="noopener noreferrer">
                        QRZ API Settings
                      </a>
                    </small>
                  </div>
                </>
              )}

              <button className="btn btn-primary" onClick={handleSaveQRZ}>
                Save Callsign Lookup Settings
              </button>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div className="tab-content">
              <div className="form-group">
                <label>Theme</label>
                <div className="theme-selector">
                  <button
                    className={`theme-btn ${formData.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    🌙 Dark
                  </button>
                  <button
                    className={`theme-btn ${formData.theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Time Format</label>
                <div className="format-selector">
                  <button
                    className={`format-btn ${formData.time_format === '24h' ? 'active' : ''}`}
                    onClick={() => handleTimeFormatChange('24h')}
                  >
                    24-Hour
                  </button>
                  <button
                    className={`format-btn ${formData.time_format === '12h' ? 'active' : ''}`}
                    onClick={() => handleTimeFormatChange('12h')}
                  >
                    12-Hour
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Units</label>
                <div className="format-selector">
                  <button
                    className={`format-btn ${formData.units === 'metric' ? 'active' : ''}`}
                    onClick={() => handleUnitsChange('metric')}
                  >
                    Metric (km, m/s)
                  </button>
                  <button
                    className={`format-btn ${formData.units === 'imperial' ? 'active' : ''}`}
                    onClick={() => handleUnitsChange('imperial')}
                  >
                    Imperial (miles, mph)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="tab-content">
              <div className="form-group">
                <label>Default Elevation Angle (degrees)</label>
                <input
                  type="number"
                  name="elevation_angle_default"
                  value={formData.elevation_angle_default || 10}
                  onChange={handleInputChange}
                  min="0"
                  max="90"
                />
                <small>Minimum elevation for satellite pass predictions</small>
              </div>

              <div className="form-group">
                <label>Satellite Look-Ahead (hours)</label>
                <input
                  type="number"
                  name="satellite_lookahead_hours"
                  value={formData.satellite_lookahead_hours || 24}
                  onChange={handleInputChange}
                  min="1"
                  max="72"
                />
                <small>Maximum hours to predict satellite passes</small>
              </div>

              <button className="btn btn-danger" onClick={handleReset}>
                Reset to Defaults
              </button>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
