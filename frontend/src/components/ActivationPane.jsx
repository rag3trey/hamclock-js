import React from 'react';
import './ActivationPane.css';

const ActivationPane = ({ activations }) => {
  if (!activations || activations.length === 0) {
    return (
      <div className="activation-empty">
        No active SOTA/POTA activations
      </div>
    );
  }

  return (
    <div className="activation-pane">
      <div className="activation-header">
        Active Activations: {activations.length}
      </div>
      <div className="activation-list">
        {activations.slice(0, 15).map((activation, index) => (
          <div
            key={index}
            className={`activation-item ${activation.type === 'SOTA' ? 'activation-item-sota' : 'activation-item-pota'}`}
          >
            <div className="activation-callsign">
              {activation.callsign}
              {activation.type === 'SOTA' ? ' ⛏️' : ' 🏕️'}
            </div>
            <div className="activation-name">
              {activation.name}
            </div>
            <div className="activation-details">
              {activation.reference}
              {activation.frequency && ` · ${activation.frequency} MHz`}
              {activation.mode && ` · ${activation.mode}`}
            </div>
            {activation.altitude && (
              <div className="activation-altitude">
                {activation.altitude}m
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivationPane;
