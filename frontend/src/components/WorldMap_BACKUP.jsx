import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { fetchDayNightTerminator } from '../api/astronomy';
import { worldCoastlines } from '../data/worldCoastlines';
import { geoPath, geoAzimuthalEquidistant } from 'd3-geo';
import { geoRobinson } from 'd3-geo-projection';
import { select } from 'd3-selection';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './WorldMap.css';

// Custom marker icons using SVG
const deIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#00ff00" stroke="#ffffff" stroke-width="2"/>
    <circle cx="12" cy="12" r="5" fill="#ffffff"/>
  </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const dxIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#ff0000" stroke="#ffffff" stroke-width="2"/>
    <circle cx="12" cy="12" r="5" fill="#ffffff"/>
  </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map click handler component
function MapClickHandler({ onMapClick }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, onMapClick]);
  
  return null;
}

// Night overlay component with gradient like HamClock
function NightOverlay({ terminatorData, showNightShade }) {
  const map = useMap();
  
  useEffect(() => {
    if (!showNightShade || !terminatorData?.points || !map) {
      return;
    }
    
    // Convert terminator points to Leaflet format
    const points = terminatorData.points.map(([lat, lng]) => [lat, lng]);
    
    // Create multiple polygons with gradient effect for realistic appearance
    const layers = [];
    
    // Main dark side polygon
    const nightPolygon = L.polygon([points], {
      color: 'transparent',
      fillColor: '#000033',
      fillOpacity: 0.65,
      weight: 0,
    });
    nightPolygon.addTo(map);
    layers.push(nightPolygon);
    
    return () => {
      layers.forEach(layer => map.removeLayer(layer));
    };
  }, [map, terminatorData, showNightShade]);
  
  return null;
}

// Calculate great circle path points for Leaflet
function calculateGreatCirclePath(lat1, lng1, lat2, lng2, numPoints = 100) {
  const points = [];
  const d2r = Math.PI / 180;
  const r2d = 180 / Math.PI;
  
  lat1 *= d2r;
  lng1 *= d2r;
  lat2 *= d2r;
  lng2 *= d2r;
  
  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)
  ));
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * r2d;
    const lng = Math.atan2(y, x) * r2d;
    points.push([lat, lng]);
  }
  
  return points;
}

// Canvas map for Azimuthal projection using D3
function AzimuthalCanvas({ deLocation, dxLocation, onMapClick, showNightShade }) {
  const canvasRef = useRef(null);
  const centerLat = deLocation ? deLocation.latitude : 40;
  const centerLng = deLocation ? deLocation.longitude : 0;
  
  // Fetch day/night terminator
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  // Render the canvas using D3
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#001a33';
    ctx.fillRect(0, 0, width, height);
    
    // Create D3 projection centered on DE location
    const projection = geoAzimuthalEquidistant()
      .center([centerLng, centerLat])
      .scale(width / 3)
      .translate([width / 2, height / 2]);
    
    const path = geoPath(projection, ctx);
    
    // Draw ocean
    ctx.fillStyle = '#003366';
    ctx.fillRect(0, 0, width, height);
    
    // Draw continents
    if (worldCoastlines?.features) {
      ctx.fillStyle = '#4a7c30';
      ctx.strokeStyle = '#2a4015';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      path(worldCoastlines);
      ctx.fill();
      ctx.stroke();
    }
    
    // Draw graticule (grid lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      path({type: 'LineString', coordinates: Array.from({length: 361}, (_, i) => [i - 180, lat])});
      ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 30) {
      ctx.beginPath();
      path({type: 'LineString', coordinates: Array.from({length: 181}, (_, i) => [lng, i - 90])});
      ctx.stroke();
    }
    
    // Draw night shade if enabled
    if (showNightShade && terminatorData?.points?.length) {
      const terminatorLine = {
        type: 'LineString',
        coordinates: terminatorData.points.map(([lat, lng]) => [lng, lat])
      };
      ctx.fillStyle = 'rgba(0, 0, 51, 0.65)';
      ctx.beginPath();
      path(terminatorLine);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw great circle path
    if (deLocation && dxLocation) {
      const gcPath = {
        type: 'LineString',
        coordinates: calculateGreatCirclePath(
          deLocation.latitude, deLocation.longitude,
          dxLocation.latitude, dxLocation.longitude
        ).map(([lat, lng]) => [lng, lat])
      };
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      path(gcPath);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw markers
    if (deLocation) {
      const point = projection([deLocation.longitude, deLocation.latitude]);
      if (point) {
        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('DE', point[0] + 12, point[1] - 8);
      }
    }
    if (dxLocation) {
      const point = projection([dxLocation.longitude, dxLocation.latitude]);
      if (point) {
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('DX', point[0] + 12, point[1] - 8);
      }
    }
  }, [deLocation, dxLocation, terminatorData, showNightShade, centerLat, centerLng]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Create projection for reverse mapping
    const projection = geoAzimuthalEquidistant()
      .center([centerLng, centerLat])
      .scale(canvas.width / 3)
      .translate([canvas.width / 2, canvas.height / 2]);
    
    const coords = projection.invert([x, y]);
    if (coords) {
      onMapClick(coords[1], coords[0]); // lat, lng
    }
  };
      drawAzimuthalMarker(ctx, width, height, dxLocation.latitude, dxLocation.longitude, '#ff0000', 'DX', centerLat, centerLng);
    }
  }, [deLocation, dxLocation, terminatorData, showNightShade, centerLat, centerLng]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const dx = x - cx;
    const dy = cy - y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const maxR = Math.min(canvas.width, canvas.height) / 2.5;
    
    if (r > maxR) return;

    // Convert from azimuthal back to lat/lng
    const c = (r / maxR) * (Math.PI / 2);
    const azimuth = Math.atan2(dx, dy);
    
    const centerLatRad = centerLat * Math.PI / 180;
    const centerLngRad = centerLng * Math.PI / 180;
    
    const lat = Math.asin(Math.cos(c) * Math.sin(centerLatRad) + dy / r * Math.sin(c) * Math.cos(centerLatRad));
    const lng = centerLngRad + Math.atan2(dx * Math.sin(c), r * Math.cos(centerLatRad) * Math.cos(c) - dy * Math.sin(centerLatRad) * Math.sin(c));
    
    onMapClick(lat * 180 / Math.PI, lng * 180 / Math.PI);
  };

  return (
    <canvas
      ref={canvasRef}
      width={1320}
      height={660}
      onClick={handleClick}
      style={{ width: '100%', height: '660px', cursor: 'crosshair', backgroundColor: '#001a33' }}
    />
  );
}

// Canvas map for Robinson projection using D3
function RobinsonCanvas({ deLocation, dxLocation, onMapClick, showNightShade }) {
  const canvasRef = useRef(null);
  
  // Fetch day/night terminator
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  // Render the canvas using D3
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#001a33';
    ctx.fillRect(0, 0, width, height);
    
    // Create D3 Robinson projection
    const projection = geoRobinson()
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);
    
    const path = geoPath(projection, ctx);
    
    // Draw ocean
    ctx.fillStyle = '#003366';
    ctx.fillRect(0, 0, width, height);
    
    // Draw continents
    if (worldCoastlines?.features) {
      ctx.fillStyle = '#4a7c30';
      ctx.strokeStyle = '#2a4015';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      path(worldCoastlines);
      ctx.fill();
      ctx.stroke();
    }
    
    // Draw graticule (grid lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      path({type: 'LineString', coordinates: Array.from({length: 361}, (_, i) => [i - 180, lat])});
      ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 30) {
      ctx.beginPath();
      path({type: 'LineString', coordinates: Array.from({length: 181}, (_, i) => [lng, i - 90])});
      ctx.stroke();
    }
    
    // Draw night shade if enabled
    if (showNightShade && terminatorData?.points?.length) {
      const terminatorLine = {
        type: 'LineString',
        coordinates: terminatorData.points.map(([lat, lng]) => [lng, lat])
      };
      ctx.fillStyle = 'rgba(0, 0, 51, 0.65)';
      ctx.beginPath();
      path(terminatorLine);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw great circle path
    if (deLocation && dxLocation) {
      const gcPath = {
        type: 'LineString',
        coordinates: calculateGreatCirclePath(
          deLocation.latitude, deLocation.longitude,
          dxLocation.latitude, dxLocation.longitude
        ).map(([lat, lng]) => [lng, lat])
      };
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      path(gcPath);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw markers
    if (deLocation) {
      const point = projection([deLocation.longitude, deLocation.latitude]);
      if (point) {
        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('DE', point[0] + 12, point[1] - 8);
      }
    }
    if (dxLocation) {
      const point = projection([dxLocation.longitude, dxLocation.latitude]);
      if (point) {
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('DX', point[0] + 12, point[1] - 8);
      }
    }
  }, [deLocation, dxLocation, terminatorData, showNightShade]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Create projection for reverse mapping
    const projection = geoRobinson()
      .scale(canvas.width / 5.5)
      .translate([canvas.width / 2, canvas.height / 2]);
    
    const coords = projection.invert([x, y]);
    if (coords) {
      onMapClick(coords[1], coords[0]); // lat, lng
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={1320}
      height={660}
      onClick={handleClick}
      style={{ width: '100%', height: '660px', cursor: 'crosshair', backgroundColor: '#001a33' }}
    />
  );
}

// Main WorldMap component
const WorldMap = ({ deLocation, dxLocation, onMapClick }) => {
  const [showNightShade, setShowNightShade] = useState(true);
  const [projection, setProjection] = useState('mercator');
  
  // Fetch day/night terminator
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  // Calculate great circle path for Leaflet (only for Mercator)
  const greatCirclePath = deLocation && dxLocation && projection === 'mercator'
    ? calculateGreatCirclePath(
        deLocation.latitude, deLocation.longitude,
        dxLocation.latitude, dxLocation.longitude
      )
    : null;
  
  return (
    <div className="world-map" 
               Math.cos(centerLatRad) * Math.cos(latRad) * Math.cos(lngRad - centerLngRad);
  
  if (cosc < 0) return null; // Behind hemisphere
  
  const c = Math.acos(Math.max(-1, Math.min(1, cosc)));
  const k = c / Math.sin(c);
  
  if (!isFinite(k)) return [width / 2, height / 2];
  
  const x = k * Math.cos(latRad) * Math.sin(lngRad - centerLngRad);
  const y = k * (Math.cos(centerLatRad) * Math.sin(latRad) - 
             Math.sin(centerLatRad) * Math.cos(latRad) * Math.cos(lngRad - centerLngRad));
  
  const scale = Math.min(width, height) / 5;
  return [width / 2 + x * scale, height / 2 - y * scale];
}

// Robinson projection helper
function projectRobinson(lat, lng, width, height) {
  // Robinson projection coefficients
  const X = [1.0000, 0.9986, 0.9954, 0.9900, 0.9822, 0.9730, 0.9600, 0.9427, 0.9216, 0.8962, 0.8679, 0.8350, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
  const Y = [0.0000, 0.0620, 0.1240, 0.1860, 0.2480, 0.3100, 0.3720, 0.4340, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1.0000];
  
  const latAbs = Math.abs(lat);
  const latIndex = Math.floor(latAbs / 5);
  const latFrac = (latAbs % 5) / 5;
  
  let xCoeff, yCoeff;
  if (latIndex >= 18) {
    xCoeff = X[18];
    yCoeff = Y[18];
  } else {
    xCoeff = X[latIndex] + (X[latIndex + 1] - X[latIndex]) * latFrac;
    yCoeff = Y[latIndex] + (Y[latIndex + 1] - Y[latIndex]) * latFrac;
  }
  
  const x = xCoeff * lng * Math.PI / 180;
  const y = yCoeff * (lat < 0 ? -1 : 1);
  
  const scale = width / (2 * Math.PI * 0.8487);
  return [width / 2 + x * scale, height / 2 - y * scale * 1.3523];
}

function drawContinents(ctx, width, height, centerLat, centerLng) {
  if (!worldCoastlines?.features) return;

  worldCoastlines.features.forEach((feature, index) => {
    if (!feature.geometry?.coordinates) return;
    
    const colors = ['#4a7c30', '#3a6c25', '#5a8c40', '#3a5c20', '#4a7030'];
    ctx.fillStyle = colors[index % colors.length];
    ctx.strokeStyle = '#2a4015';
    ctx.lineWidth = 0.5;

    const coords = feature.geometry.coordinates[0];
    ctx.beginPath();
    let started = false;
    let lastPoint = null;

    coords.forEach(point => {
      const [lng, lat] = point;
      const projected = projectAzimuthal(lat, lng, width, height, centerLat, centerLng);
      
      if (projected) {
        const [x, y] = projected;
        if (lastPoint) {
          const dx = Math.abs(x - lastPoint[0]);
          const dy = Math.abs(y - lastPoint[1]);
          if (dx > 200 || dy > 200) {
            if (started) {
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          ctx.moveTo(x, y);
          started = true;
        }
        lastPoint = [x, y];
      } else {
        if (started) {
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        started = false;
        lastPoint = null;
      }
    });

    if (started) {
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });
}

function drawRobinsonContinents(ctx, width, height) {
  if (!worldCoastlines?.features) return;

  worldCoastlines.features.forEach((feature, index) => {
    if (!feature.geometry?.coordinates) return;
    
    const colors = ['#4a7c30', '#3a6c25', '#5a8c40', '#3a5c20', '#4a7030'];
    ctx.fillStyle = colors[index % colors.length];
    ctx.strokeStyle = '#2a4015';
    ctx.lineWidth = 0.5;

    const coords = feature.geometry.coordinates[0];
    ctx.beginPath();
    let started = false;
    let lastPoint = null;

    coords.forEach(point => {
      const [lng, lat] = point;
      const projected = projectRobinson(lat, lng, width, height);
      
      if (projected) {
        const [x, y] = projected;
        if (lastPoint) {
          const dx = Math.abs(x - lastPoint[0]);
          const dy = Math.abs(y - lastPoint[1]);
          if (dx > 300 || dy > 300) {
            if (started) {
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          ctx.moveTo(x, y);
          started = true;
        }
        lastPoint = [x, y];
      } else {
        if (started) {
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        started = false;
        lastPoint = null;
      }
    });

    if (started) {
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });
}

function drawAzimuthalGrid(ctx, width, height, centerLat, centerLng) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;

  // Draw latitude circles
  for (let lat = 0; lat <= 80; lat += 20) {
    ctx.beginPath();
    for (let lng = -180; lng <= 180; lng += 2) {
      const p = projectAzimuthal(lat, lng, width, height, centerLat, centerLng);
      if (p) {
        const [x, y] = p;
        if (lng === -180) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  // Draw longitude lines
  for (let lng = -180; lng < 180; lng += 30) {
    ctx.beginPath();
    for (let lat = 0; lat <= 85; lat += 2) {
      const p = projectAzimuthal(lat, lng, width, height, centerLat, centerLng);
      if (p) {
        const [x, y] = p;
        if (lat === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

function drawRobinsonGrid(ctx, width, height) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;

  // Draw latitude lines
  for (let lat = -80; lat <= 80; lat += 20) {
    ctx.beginPath();
    for (let lng = -180; lng <= 180; lng += 2) {
      const p = projectRobinson(lat, lng, width, height);
      if (p) {
        const [x, y] = p;
        if (lng === -180) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  // Draw longitude lines
  for (let lng = -180; lng <= 180; lng += 30) {
    ctx.beginPath();
    for (let lat = -85; lat <= 85; lat += 2) {
      const p = projectRobinson(lat, lng, width, height);
      if (p) {
        const [x, y] = p;
        if (lat === -85) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

function drawAzimuthalTerminator(ctx, width, height, points, centerLat, centerLng) {
  if (!points?.length) return;

  ctx.fillStyle = 'rgba(0, 0, 51, 0.7)';
  ctx.beginPath();
  let started = false;

  points.forEach(point => {
    const [lat, lng] = point;
    const p = projectAzimuthal(lat, lng, width, height, centerLat, centerLng);
    if (p) {
      const [x, y] = p;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });

  if (started) {
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAzimuthalGreatCircle(ctx, width, height, from, to, centerLat, centerLng) {
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const lat1Rad = from.latitude * Math.PI / 180;
  const lon1Rad = from.longitude * Math.PI / 180;
  const lat2Rad = to.latitude * Math.PI / 180;
  const lon2Rad = to.longitude * Math.PI / 180;
  
  const d = Math.acos(Math.sin(lat1Rad) * Math.sin(lat2Rad) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad));
  
  if (isNaN(d) || d === 0) return;
  
  let started = false;
  for (let i = 0; i <= 100; i++) {
    const f = i / 100;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    
    const x = a * Math.cos(lat1Rad) * Math.cos(lon1Rad) + b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y = a * Math.cos(lat1Rad) * Math.sin(lon1Rad) + b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lon = Math.atan2(y, x) * 180 / Math.PI;
    
    const p = projectAzimuthal(lat, lon, width, height, centerLat, centerLng);
    if (p) {
      const [px, py] = p;
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
  }

  ctx.stroke();
}

function drawAzimuthalMarker(ctx, width, height, lat, lng, color, label, centerLat, centerLng) {
  const p = projectAzimuthal(lat, lng, width, height, centerLat, centerLng);
  if (!p) return;
  
  const [x, y] = p;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(label, x + 15, y - 10);
}

function drawRobinsonTerminator(ctx, width, height, points) {
  if (!points?.length) return;

  ctx.fillStyle = 'rgba(0, 0, 51, 0.7)';
  ctx.beginPath();
  let started = false;

  points.forEach(point => {
    const [lat, lng] = point;
    const p = projectRobinson(lat, lng, width, height);
    if (p) {
      const [x, y] = p;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });

  if (started) {
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRobinsonGreatCircle(ctx, width, height, from, to) {
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const lat1Rad = from.latitude * Math.PI / 180;
  const lon1Rad = from.longitude * Math.PI / 180;
  const lat2Rad = to.latitude * Math.PI / 180;
  const lon2Rad = to.longitude * Math.PI / 180;
  
  const d = Math.acos(Math.sin(lat1Rad) * Math.sin(lat2Rad) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad));
  
  if (isNaN(d) || d === 0) return;
  
  let started = false;
  for (let i = 0; i <= 100; i++) {
    const f = i / 100;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    
    const x = a * Math.cos(lat1Rad) * Math.cos(lon1Rad) + b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y = a * Math.cos(lat1Rad) * Math.sin(lon1Rad) + b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lon = Math.atan2(y, x) * 180 / Math.PI;
    
    const p = projectRobinson(lat, lon, width, height);
    if (p) {
      const [px, py] = p;
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
  }

  ctx.stroke();
}

function drawRobinsonMarker(ctx, width, height, lat, lng, color, label) {
  const p = projectRobinson(lat, lng, width, height);
  if (!p) return;
  
  const [x, y] = p;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(label, x + 15, y - 10);
}

// Main WorldMap component
const WorldMap = ({ deLocation, dxLocation, onMapClick }) => {
  const [showNightShade, setShowNightShade] = useState(true);
  const [projection, setProjection] = useState('mercator');
  
  // Fetch day/night terminator
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  // Calculate great circle path for Leaflet (only for Mercator)
  const greatCirclePath = deLocation && dxLocation && projection === 'mercator'
    ? calculateGreatCirclePath(
        deLocation.latitude, deLocation.longitude,
        dxLocation.latitude, dxLocation.longitude
      )
    : null;
  
  return (
    <div className="world-map">
      <div className="map-controls">
        <label>
          <input
            type="checkbox"
            checked={showNightShade}
            onChange={(e) => setShowNightShade(e.target.checked)}
          />
          Night Shade
        </label>
        <select value={projection} onChange={(e) => setProjection(e.target.value)}>
          <option value="mercator">Mercator</option>
          <option value="azimuthal">Azimuthal</option>
          <option value="robinson">Robinson</option>
        </select>
      </div>
      
      {projection === 'azimuthal' ? (
        <AzimuthalCanvas
          deLocation={deLocation}
          dxLocation={dxLocation}
          onMapClick={onMapClick}
          showNightShade={showNightShade}
        />
      ) : projection === 'robinson' ? (
        <RobinsonCanvas
          deLocation={deLocation}
          dxLocation={dxLocation}
          onMapClick={onMapClick}
          showNightShade={showNightShade}
        />
      ) : (
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={1}
          maxZoom={6}
          maxBounds={[[-90, -180], [90, 180]]}
          style={{ height: '660px', width: '100%', backgroundColor: '#000033' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          {/* Satellite imagery base layer */}
          <TileLayer
            attribution='Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            noWrap={true}
            bounds={[[-90, -180], [90, 180]]}
            opacity={0.7}
          />
          {/* Political boundaries overlay */}
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            noWrap={true}
            bounds={[[-90, -180], [90, 180]]}
            opacity={0.35}
          />
          
          <MapClickHandler onMapClick={onMapClick} />
          <NightOverlay terminatorData={terminatorData} showNightShade={showNightShade} />
          
          {deLocation && (
            <Marker position={[deLocation.latitude, deLocation.longitude]} icon={deIcon}>
              <Popup>DE: {deLocation.latitude.toFixed(2)}°, {deLocation.longitude.toFixed(2)}°</Popup>
            </Marker>
          )}
          
          {dxLocation && (
            <Marker position={[dxLocation.latitude, dxLocation.longitude]} icon={dxIcon}>
              <Popup>DX: {dxLocation.latitude.toFixed(2)}°, {dxLocation.longitude.toFixed(2)}°</Popup>
            </Marker>
          )}
          
          {greatCirclePath && (
            <Polyline
              positions={greatCirclePath}
              color="#FFD700"
              weight={3}
              opacity={0.9}
              dashArray="5, 10"
            />
          )}
        </MapContainer>
      )}
    </div>
  );
};

export default WorldMap;