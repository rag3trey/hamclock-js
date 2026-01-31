import React, { useState, useEffect } from 'react';
import {
  connectCAT,
  disconnectCAT,
  getCATStatus,
  setCATFrequency,
  setCATMode,
  setCATpower,
  getAvailableCATPorts,
  getHamBands,
} from '../api';
import './CATStatus.css';

const CATStatus = () => {
  const [catStatus, setCatStatus] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [selectedRadioModel, setSelectedRadioModel] = useState('yaesu');
  const [bands, setBands] = useState([]);
  const [frequencyInput, setFrequencyInput] = useState('');

  // Fetch available ports and bands on mount
  useEffect(() => {
    const fetchPorts = async () => {
      try {
        const portList = await getAvailableCATPorts();
        setPorts(portList.ports || []);
        if (portList.ports && portList.ports.length === 0) {
          setError('No serial ports found. Connect a radio via USB and refresh.');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching ports:', err);
        setError('Failed to fetch serial ports');
      }
    };

    fetchPorts();
  }, []);

  // Poll CAT status if connected
  useEffect(() => {
    if (!catStatus?.connected) return;

    const interval = setInterval(async () => {
      try {
        const status = await getCATStatus();
        setCatStatus(status);
      } catch (err) {
        console.error('CAT status fetch error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [catStatus?.connected]);

  const handleConnect = async () => {
    if (!selectedPort) {
      setError('Please select a serial port');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await connectCAT(selectedPort, selectedRadioModel, 9600);
      setCatStatus({
        connected: true,
        radio_model: result.radio,
        port: result.port,
        frequency_mhz: result.frequency_mhz,
        mode: result.mode,
        power: result.power,
      });
    } catch (err) {
      setError(`Connection failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectCAT();
      setCatStatus({ connected: false });
    } catch (err) {
      setError(`Disconnect failed: ${err.message}`);
    }
  };

  const handleSetFrequency = async (freqMhz) => {
    try {
      const freqHz = Math.round(freqMhz * 1_000_000);
      await setCATFrequency(freqHz);
      const status = await getCATStatus();
      setCatStatus(status);
      setFrequencyInput('');
    } catch (err) {
      setError(`Set frequency failed: ${err.message}`);
    }
  };

  const handleChangeMode = async (mode) => {
    try {
      await setCATMode(mode);
      const status = await getCATStatus();
      setCatStatus(status);
    } catch (err) {
      setError(`Set mode failed: ${err.message}`);
    }
  };

  const handleChangePower = async (powerVal) => {
    try {
      await setCATpower(powerVal);
      const status = await getCATStatus();
      setCatStatus(status);
    } catch (err) {
      setError(`Set power failed: ${err.message}`);
    }
  };

  const formatFrequency = (mhz) => {
    return mhz ? mhz.toFixed(3) : 'N/A';
  };

  return (
    <div className={`cat-status ${catStatus?.connected ? 'connected' : 'disconnected'}`}>
      <div className="cat-header">
        <div className="cat-title-section">
          <span className="cat-icon">📻</span>
          <span className="cat-title">Radio (CAT)</span>
        </div>
        {catStatus?.connected && (
          <div className="cat-indicator">
            <span className="cat-dot"></span>
            <span className="cat-label">Connected</span>
          </div>
        )}
      </div>

      {error && (
        <div className="cat-error">
          ⚠️ {error}
        </div>
      )}

      {!catStatus?.connected ? (
        <div className="cat-connection-panel">
          <div className="connection-input">
            <label>Serial Port:</label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isConnecting}
            >
              <option value="">-- Select Port --</option>
              {ports.map((port) => (
                <option key={port.port} value={port.port}>
                  {port.port} ({port.description})
                </option>
              ))}
            </select>
          </div>

          <div className="connection-input">
            <label>Radio Model:</label>
            <select
              value={selectedRadioModel}
              onChange={(e) => setSelectedRadioModel(e.target.value)}
              disabled={isConnecting}
            >
              <option value="yaesu">Yaesu</option>
              <option value="kenwood">Kenwood</option>
              <option value="icom">Icom</option>
            </select>
          </div>

          <div className="connection-buttons">
            <button
              onClick={handleConnect}
              disabled={isConnecting || !selectedPort}
              className="connect-btn"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>

          {ports.length === 0 && (
            <div className="no-ports-message">
              No serial ports found. Connect a radio via USB and refresh.
            </div>
          )}
        </div>
      ) : (
        <div className="cat-connected-panel">
          <div className="frequency-display">
            <div className="freq-label">Frequency</div>
            <div className="freq-value">{formatFrequency(catStatus?.frequency_mhz)} MHz</div>
            <div className="freq-input-group">
              <input
                type="number"
                step="0.001"
                placeholder="MHz"
                value={frequencyInput}
                onChange={(e) => setFrequencyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && frequencyInput) {
                    handleSetFrequency(parseFloat(frequencyInput));
                  }
                }}
              />
              <button onClick={() => frequencyInput && handleSetFrequency(parseFloat(frequencyInput))}>
                Set
              </button>
            </div>
          </div>

          <div className="mode-display">
            <div className="mode-label">Mode</div>
            <div className="mode-value">{catStatus?.mode || 'N/A'}</div>
            <div className="mode-buttons">
              {['LSB', 'USB', 'CW', 'FM'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleChangeMode(mode)}
                  className={`mode-btn ${catStatus?.mode === mode ? 'active' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="power-display">
            <div className="power-label">Power</div>
            <div className="power-value">{catStatus?.power || 0}%</div>
            <input
              type="range"
              min="0"
              max="100"
              value={catStatus?.power || 0}
              onChange={(e) => handleChangePower(parseInt(e.target.value))}
              className="power-slider"
            />
          </div>

          <div className="bands-section">
            <div className="bands-label">Quick Bands</div>
            <div className="bands-grid">
              {bands.slice(0, 8).map((band) => (
                <button
                  key={band.name}
                  onClick={() => handleSetFrequency(band.freq_mhz)}
                  className="band-btn"
                  title={`${band.start / 1_000_000} - ${band.end / 1_000_000} MHz`}
                >
                  {band.name}
                </button>
              ))}
            </div>
            <div className="bands-grid">
              {bands.slice(8).map((band) => (
                <button
                  key={band.name}
                  onClick={() => handleSetFrequency(band.freq_mhz)}
                  className="band-btn"
                  title={`${band.start / 1_000_000} - ${band.end / 1_000_000} MHz`}
                >
                  {band.name}
                </button>
              ))}
            </div>
          </div>

          <div className="cat-buttons">
            <button onClick={() => setShowDetails(!showDetails)} className="details-btn">
              {showDetails ? '▼ Hide Details' : '▶ Show Details'}
            </button>
            <button onClick={handleDisconnect} className="disconnect-btn">
              Disconnect
            </button>
          </div>

          {showDetails && (
            <div className="cat-details">
              <div className="detail-row">
                <span className="detail-label">Radio Model:</span>
                <span className="detail-value">{catStatus?.radio_model || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Serial Port:</span>
                <span className="detail-value">{catStatus?.port || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CATStatus;
