import React from 'react';
import './MapControls.css';

const MapControls = ({
  showNightShade,
  setShowNightShade,
  showGrid,
  setShowGrid,
  projection,
  setProjection,
  onZoomPreset,
  dxSpots,
  deLocation,
  onClearDX
}) => {
  return (
    <div className="map-toolbar">
      <div className="toolbar-section">
        <label className="toolbar-checkbox" title="Toggle night shade overlay">
          <input
            type="checkbox"
            checked={showNightShade}
            onChange={(e) => setShowNightShade(e.target.checked)}
          />
          <span>Night</span>
        </label>
        <label className="toolbar-checkbox" title="Toggle coordinate grid">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          <span>Grid</span>
        </label>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <select 
          value={projection} 
          onChange={(e) => setProjection(e.target.value)}
          className="projection-select"
          title="Map projection"
        >
          <option value="mercator">Mercator</option>
          <option value="azimuthal">Azimuthal</option>
          <option value="robinson">Robinson</option>
        </select>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section preset-section">
        <button 
          onClick={() => onZoomPreset('world')}
          className="toolbar-btn"
          title="View entire world"
        >
          World
        </button>
        <button 
          onClick={() => onZoomPreset('na')}
          className="toolbar-btn"
          title="North America"
        >
          NA
        </button>
        <button 
          onClick={() => onZoomPreset('eu')}
          className="toolbar-btn"
          title="Europe"
        >
          EU
        </button>
        <button 
          onClick={() => onZoomPreset('asia')}
          className="toolbar-btn"
          title="Asia/Pacific"
        >
          ASIA
        </button>
        {deLocation && (
          <button 
            onClick={() => onZoomPreset('de')}
            className="toolbar-btn toolbar-btn-de"
            title="Zoom to DE location"
          >
            DE
          </button>
        )}
        {dxSpots && dxSpots.length > 0 && (
          <button 
            onClick={() => onZoomPreset('dx')}
            className="toolbar-btn toolbar-btn-dx"
            title="Zoom to DX location"
          >
            DX
          </button>
        )}
      </div>

      {dxSpots && dxSpots.length > 0 && onClearDX && (
        <>
          <div className="toolbar-divider"></div>
          <div className="toolbar-section">
            <button 
              onClick={onClearDX}
              className="clear-dx-btn"
              title="Clear all DX spots"
            >
              Clear DX
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MapControls;
