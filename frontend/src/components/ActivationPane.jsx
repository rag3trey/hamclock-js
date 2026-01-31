import React from 'react';

const ActivationPane = ({ activations }) => {
  if (!activations || activations.length === 0) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: '#888' }}>
        No active SOTA/POTA activations
      </div>
    );
  }

  return (
    <div style={{ padding: '8px', fontSize: '12px' }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: '4px' }}>
        Active Activations: {activations.length}
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {activations.slice(0, 15).map((activation, index) => (
          <div
            key={index}
            style={{
              marginBottom: '8px',
              padding: '6px',
              backgroundColor: activation.type === 'SOTA' ? 'rgba(74, 158, 255, 0.1)' : 'rgba(156, 39, 176, 0.1)',
              borderLeft: `3px solid ${activation.type === 'SOTA' ? '#4a9eff' : '#9c27b0'}`,
              borderRadius: '2px'
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#fff' }}>
              {activation.callsign}
              {activation.type === 'SOTA' ? ' ⛏️' : ' 🏕️'}
            </div>
            <div style={{ color: '#aaa', fontSize: '11px' }}>
              {activation.name}
            </div>
            <div style={{ color: '#888', fontSize: '10px' }}>
              {activation.reference}
              {activation.frequency && ` · ${activation.frequency} MHz`}
              {activation.mode && ` · ${activation.mode}`}
            </div>
            {activation.altitude && (
              <div style={{ color: '#888', fontSize: '10px' }}>
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
