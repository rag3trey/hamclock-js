import React, { useEffect, useRef, useState } from 'react';
import { fetchSpaceWeatherTrend } from '../api/index';
import './SolarFluxTrend.css';

export default function SolarFluxTrend() {
  const canvasRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadTrendData();
  }, [days]);

  const loadTrendData = async () => {
    try {
      setLoading(true);
      const trendData = await fetchSpaceWeatherTrend(days);
      setData(trendData);
      setError(null);
    } catch (err) {
      setError('Failed to load solar flux trend');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data && canvasRef.current) {
      drawChart();
    }
  }, [data]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // Set canvas resolution
    canvas.width = width;
    canvas.height = height;

    // Calculate bounds
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const fluxValues = data.map(d => d.solar_flux);
    const minFlux = Math.min(...fluxValues);
    const maxFlux = Math.max(...fluxValues);
    const fluxRange = maxFlux - minFlux || 1;

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Y-axis labels (solar flux values)
      const fluxValue = maxFlux - (fluxRange / 5) * i;
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(fluxValue), padding - 10, y + 4);
    }

    // Vertical grid lines
    const gridLines = Math.min(data.length, 12); // Max 12 vertical lines
    for (let i = 0; i < gridLines; i++) {
      const x = padding + (chartWidth / (gridLines - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw data line
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
      const y = height - padding - ((point.solar_flux - minFlux) / fluxRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#4a9eff';
    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
      const y = height - padding - ((point.solar_flux - minFlux) / fluxRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // X-axis labels (dates)
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';

    const labelInterval = Math.ceil(data.length / 6); // Show ~6 labels
    data.forEach((point, index) => {
      if (index % labelInterval === 0 || index === data.length - 1) {
        const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
        const dateStr = point.date;
        ctx.fillText(dateStr, x, height - padding + 20);
      }
    });

    // Draw title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Solar Flux (F10.7) Trend - Last ' + days + ' Days', width / 2, 25);

    // Draw legend
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(width - 180, 40, 15, 15);
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Solar Flux', width - 160, 52);
  };

  return (
    <div className="solar-flux-trend">
      <div className="trend-header">
        <h3>☀️ Solar Flux Trend</h3>
        <div className="trend-controls">
          <button
            className={`trend-btn ${days === 7 ? 'active' : ''}`}
            onClick={() => setDays(7)}
          >
            7D
          </button>
          <button
            className={`trend-btn ${days === 30 ? 'active' : ''}`}
            onClick={() => setDays(30)}
          >
            30D
          </button>
          <button
            className={`trend-btn ${days === 90 ? 'active' : ''}`}
            onClick={() => setDays(90)}
          >
            90D
          </button>
        </div>
      </div>

      {loading && <div className="trend-loading">Loading trend data...</div>}
      {error && <div className="trend-error">{error}</div>}

      {data && data.length > 0 && (
        <div className="trend-chart-container">
          <canvas ref={canvasRef} className="trend-chart"></canvas>
        </div>
      )}

      {data && data.length === 0 && (
        <div className="trend-no-data">No data available yet. Check back after the service has been running.</div>
      )}
    </div>
  );
}
