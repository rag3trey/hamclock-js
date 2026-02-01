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
    
    // Detect theme
    const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
    
    // Set canvas resolution
    canvas.width = width;
    canvas.height = height;

    // Calculate bounds with proper padding
    const leftPadding = 60;
    const rightPadding = 40;
    const topPadding = 40;
    const bottomPadding = 60;
    const chartWidth = width - leftPadding - rightPadding;
    const chartHeight = height - topPadding - bottomPadding;

    const fluxValues = data.map(d => d.solar_flux);
    const minFlux = Math.min(...fluxValues);
    const maxFlux = Math.max(...fluxValues);
    const fluxRange = maxFlux - minFlux || 1;

    // Draw background with theme awareness
    ctx.fillStyle = isDarkTheme ? '#1a1a1a' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Draw grid with theme awareness
    ctx.strokeStyle = isDarkTheme ? '#333' : '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = topPadding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(width - rightPadding, y);
      ctx.stroke();

      // Y-axis labels (solar flux values)
      const fluxValue = maxFlux - (fluxRange / 5) * i;
      ctx.fillStyle = isDarkTheme ? '#888' : '#6b7280';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(fluxValue), leftPadding - 10, y + 4);
    }

    // Vertical grid lines
    const gridLines = Math.min(data.length, 12); // Max 12 vertical lines
    for (let i = 0; i < gridLines; i++) {
      const x = leftPadding + (chartWidth / (gridLines - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, topPadding);
      ctx.lineTo(x, height - bottomPadding);
      ctx.stroke();
    }

    // Draw axes with theme awareness
    ctx.strokeStyle = isDarkTheme ? '#666' : '#9ca3af';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftPadding, topPadding);
    ctx.lineTo(leftPadding, height - bottomPadding);
    ctx.lineTo(width - rightPadding, height - bottomPadding);
    ctx.stroke();

    // Draw data line
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = leftPadding + (chartWidth / (data.length - 1 || 1)) * index;
      const y = height - bottomPadding - ((point.solar_flux - minFlux) / fluxRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#1d4ed8';
    data.forEach((point, index) => {
      const x = leftPadding + (chartWidth / (data.length - 1 || 1)) * index;
      const y = height - bottomPadding - ((point.solar_flux - minFlux) / fluxRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // X-axis labels (dates) with theme awareness - fewer labels to avoid overlap
    ctx.fillStyle = isDarkTheme ? '#888' : '#6b7280';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const labelInterval = Math.ceil(data.length / 4); // Show only ~4 labels to avoid crowding
    data.forEach((point, index) => {
      if (index % labelInterval === 0 || index === data.length - 1) {
        const x = leftPadding + (chartWidth / (data.length - 1 || 1)) * index;
        const dateStr = point.date;
        ctx.fillText(dateStr, x, height - bottomPadding + 25);
      }
    });
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
