import React, { useEffect, useState } from 'react';
import { fetchLatLngToGrid } from '../api/index.js';
import './MaidenheadDisplay.css';

export default function MaidenheadDisplay({ latitude, longitude, label = "Grid" }) {
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [precision, setPrecision] = useState(6);

  useEffect(() => {
    const loadGrid = async () => {
      if (latitude === null || longitude === null || latitude === undefined || longitude === undefined) {
        setGrid(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchLatLngToGrid(latitude, longitude, precision);
        setGrid(data.grid);
      } catch (err) {
        console.error('Error fetching Maidenhead grid:', err);
        setError('Failed to load grid');
        setGrid(null);
      } finally {
        setLoading(false);
      }
    };

    loadGrid();
  }, [latitude, longitude, precision]);

  if (loading) {
    return (
      <div className="maidenhead-display">
        <label>{label}</label>
        <div className="grid-value loading">Loading...</div>
      </div>
    );
  }

  if (error || !grid) {
    return (
      <div className="maidenhead-display">
        <label>{label}</label>
        <div className="grid-value error">{error || 'No location'}</div>
      </div>
    );
  }

  return (
    <div className="maidenhead-display">
      <label>{label}</label>
      <div className="grid-container">
        <div className="grid-value">{grid}</div>
        <div className="precision-selector">
          <button
            className={`precision-btn ${precision === 2 ? 'active' : ''}`}
            onClick={() => setPrecision(2)}
            title="Field (20°)"
          >
            F
          </button>
          <button
            className={`precision-btn ${precision === 4 ? 'active' : ''}`}
            onClick={() => setPrecision(4)}
            title="Square (2°)"
          >
            S
          </button>
          <button
            className={`precision-btn ${precision === 6 ? 'active' : ''}`}
            onClick={() => setPrecision(6)}
            title="Subsquare (5')"
          >
            SS
          </button>
          <button
            className={`precision-btn ${precision === 8 ? 'active' : ''}`}
            onClick={() => setPrecision(8)}
            title='Extended (2.5")'
          >
            EX
          </button>
        </div>
      </div>
    </div>
  );
}
