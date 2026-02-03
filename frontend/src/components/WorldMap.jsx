import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { fetchDayNightTerminator } from '../api/astronomy';
import { worldCoastlines } from '../data/worldCoastlines';
import { geoPath, geoAzimuthalEquidistant, geoGraticule, geoMercator } from 'd3-geo';
import { geoRobinson } from 'd3-geo-projection';
import { feature } from 'topojson-client';
import worldLandTopo from '../data/world-land.json';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './WorldMap.css';
import MapControls from './MapControls';
import { generateMaidenheadGrid, generateCQZoneGridLines, generateITURegionGridLines } from '../utils/gridUtils';
import { generateStandardRangeRings } from '../utils/rangeRings';

// Convert TopoJSON to GeoJSON for rendering
const worldLand = feature(worldLandTopo, worldLandTopo.objects.land);

// Bearing calculation utility (great circle bearing from point A to point B)
// Returns bearing in degrees (0-360), where 0 = North, 90 = East, 180 = South, 270 = West
function calculateBearing(fromLat, fromLng, toLat, toLng) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  
  const lat1 = fromLat * toRad;
  const lng1 = fromLng * toRad;
  const lat2 = toLat * toRad;
  const lng2 = toLng * toRad;
  
  const dLng = lng2 - lng1;
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x) * toDeg;
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  
  return bearing;
}

// Calculate distance between two points on Earth (kilometers)
function calculateDistance(fromLat, fromLng, toLat, toLng) {
  const toRad = Math.PI / 180;
  const R = 6371; // Earth's radius in km
  
  const lat1 = fromLat * toRad;
  const lat2 = toLat * toRad;
  const dLat = (toLat - fromLat) * toRad;
  const dLng = (toLng - fromLng) * toRad;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

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

// Night overlay component
function NightOverlay({ terminatorData, showNightShade }) {
  const map = useMap();
  
  useEffect(() => {
    if (!showNightShade || !terminatorData?.points || !map) {
      return;
    }
    
    const points = terminatorData.points.map(([lat, lng]) => [lat, lng]);
    const layers = [];
    
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

// Calculate great circle path points
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
function AzimuthalCanvas({ deLocation, dxSpots, activations, satellites, onMapClick, showNightShade, showGrid, gridType, showRangeRings, zoomCenter, zoomScale, visiblePanels, onWheel, dragDistanceRef }) {
  const canvasRef = useRef(null);
  const centerLat = zoomCenter ? zoomCenter.lat : (deLocation ? deLocation.latitude : 40);
  const centerLng = zoomCenter ? zoomCenter.lng : (deLocation ? deLocation.longitude : 0);
  
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#001a33';
    ctx.fillRect(0, 0, width, height);
    
    const projection = geoAzimuthalEquidistant()
      .center([centerLng, centerLat])
      .scale((width / 3) * zoomScale)
      .translate([width / 2, height / 2]);
    
    const path = geoPath(projection, ctx);
    
    // Draw ocean with gradient
    const oceanGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    oceanGradient.addColorStop(0, '#1a4d7a');
    oceanGradient.addColorStop(1, '#0a2540');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw land with topographic coloring and relief
    if (worldLand) {
      // Base land color
      ctx.fillStyle = '#5a8c3a';
      ctx.strokeStyle = '#3d6028';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      path(worldLand);
      ctx.fill();
      ctx.stroke();
      
      // Add subtle relief/shadow effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.strokeStyle = '#2a4018';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      path(worldLand);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      
      // Highlight edges for depth
      ctx.strokeStyle = '#7aa04f';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      path(worldLand);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    
    // Draw grid based on type
    if (showGrid) {
      if (gridType === 'maidenhead') {
        const bounds = projection.invert([0, 0]);
        const boundsMax = projection.invert([width, height]);
        const minLat = Math.min(bounds[1], boundsMax[1]);
        const maxLat = Math.max(bounds[1], boundsMax[1]);
        const minLng = Math.min(bounds[0], boundsMax[0]);
        const maxLng = Math.max(bounds[0], boundsMax[0]);
        
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        
        const gridLines = generateMaidenheadGrid(minLat, maxLat, minLng, maxLng);
        gridLines?.forEach(line => {
          line.coordinates?.forEach((point, i) => {
            const projected = projection(point);
            if (projected) {
              if (i === 0) ctx.moveTo(projected[0], projected[1]);
              else ctx.lineTo(projected[0], projected[1]);
            }
          });
        });
        ctx.stroke();
        ctx.stroke();
      } else if (gridType === 'cq-zones') {
        const bounds = projection.invert([0, 0]);
        const boundsMax = projection.invert([width, height]);
        const minLat = Math.min(bounds[1], boundsMax[1]);
        const maxLat = Math.max(bounds[1], boundsMax[1]);
        const minLng = Math.min(bounds[0], boundsMax[0]);
        const maxLng = Math.max(bounds[0], boundsMax[0]);
        
        const gridLines = generateCQZoneGridLines(minLat, maxLat, minLng, maxLng);
        gridLines?.forEach(line => {
          ctx.strokeStyle = line.style?.color || 'rgba(255, 200, 100, 0.3)';
          ctx.lineWidth = line.style?.width || 1;
          ctx.beginPath();
          line.coordinates?.forEach((point, i) => {
            const projected = projection(point);
            if (projected) {
              if (i === 0) ctx.moveTo(projected[0], projected[1]);
              else ctx.lineTo(projected[0], projected[1]);
            }
          });
          ctx.stroke();
        });
      } else if (gridType === 'itu-regions') {
        const bounds = projection.invert([0, 0]);
        const boundsMax = projection.invert([width, height]);
        const minLat = Math.min(bounds[1], boundsMax[1]);
        const maxLat = Math.max(bounds[1], boundsMax[1]);
        const minLng = Math.min(bounds[0], boundsMax[0]);
        const maxLng = Math.max(bounds[0], boundsMax[0]);
        
        const gridLines = generateITURegionGridLines(minLat, maxLat, minLng, maxLng);
        gridLines?.forEach(line => {
          ctx.strokeStyle = line.style?.color || 'rgba(255, 150, 50, 0.6)';
          ctx.lineWidth = line.style?.width || 2.5;
          ctx.beginPath();
          line.coordinates?.forEach((point, i) => {
            const projected = projection(point);
            if (projected) {
              if (i === 0) ctx.moveTo(projected[0], projected[1]);
              else ctx.lineTo(projected[0], projected[1]);
            }
          });
          ctx.stroke();
        });
      } else {
        // Default: Lat/Lng
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const graticule = geoGraticule().step([30, 20]);
        path(graticule());
        ctx.stroke();
      }
    }
    
    if (showNightShade && terminatorData?.points?.length) {
      // Determine which hemisphere has night
      const midIdx = Math.floor(terminatorData.points.length / 2);
      const sunSubsolarLat = terminatorData.points[midIdx][0];
      const shadeNorth = sunSubsolarLat < 0;
      
      // Find the continuous visible segment
      const segments = [];
      let currentSegment = [];
      let prevX = null;
      
      for (let i = 0; i < terminatorData.points.length; i++) {
        const [lat, lng] = terminatorData.points[i];
        const point = projection([lng, lat]);
        
        if (point && point[0] != null && point[1] != null) {
          const x = point[0];
          
          // Detect wraparound
          if (prevX !== null && Math.abs(x - prevX) > width * 0.5) {
            if (currentSegment.length > 0) {
              segments.push(currentSegment);
            }
            currentSegment = [[lat, lng]];
          } else {
            currentSegment.push([lat, lng]);
          }
          
          prevX = x;
        }
      }
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      
      // Use the longest segment
      const visibleCurve = segments.reduce((longest, seg) => 
        seg.length > longest.length ? seg : longest, segments[0] || []);
      
      if (visibleCurve.length < 3) return;
      
      // Get the longitude range of the visible curve
      const firstLng = visibleCurve[0][1];
      const lastLng = visibleCurve[visibleCurve.length - 1][1];
      
      // Create a proper Polygon that includes the terminator and map edges
      const polygonCoords = [];
      
      if (shadeNorth) {
        // North shade: top edge, then terminator, back to top
        polygonCoords.push([firstLng, 85]); // Top edge at first longitude
        
        // Add terminator points (as lng, lat for GeoJSON)
        visibleCurve.forEach(([lat, lng]) => {
          polygonCoords.push([lng, lat]);
        });
        
        polygonCoords.push([lastLng, 85]); // Top edge at last longitude
        polygonCoords.push([firstLng, 85]); // Close the polygon
      } else {
        // South shade: bottom edge, then terminator, back to bottom
        polygonCoords.push([firstLng, -85]); // Bottom edge
        
        visibleCurve.forEach(([lat, lng]) => {
          polygonCoords.push([lng, lat]);
        });
        
        polygonCoords.push([lastLng, -85]); // Bottom edge
        polygonCoords.push([firstLng, -85]); // Close
      }
      
      // Create GeoJSON Polygon
      const nightPolygon = {
        type: 'Polygon',
        coordinates: [polygonCoords]
      };
      
      // Draw using D3's path - this handles all the smooth interpolation
      ctx.fillStyle = 'rgba(0, 0, 51, 0.65)';
      ctx.beginPath();
      path(nightPolygon);
      ctx.fill();
    }
    
    if (deLocation && dxSpots && dxSpots.length > 0) {
      const firstSpot = dxSpots[0];
      const gcPath = {
        type: 'LineString',
        coordinates: calculateGreatCirclePath(
          deLocation.latitude, deLocation.longitude,
          firstSpot.latitude, firstSpot.longitude
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
    
    // Draw range rings from DE location
    if (showRangeRings && deLocation) {
      const rings = generateStandardRangeRings(deLocation.latitude, deLocation.longitude);
      rings.forEach((ring, ringIndex) => {
        ctx.strokeStyle = `rgba(100, 200, 100, ${0.3 - ringIndex * 0.05})`;
        ctx.lineWidth = ringIndex === 0 ? 1.5 : 1;
        ctx.beginPath();
        
        ring.points.forEach((point, pointIndex) => {
          const projected = projection([point[0], point[1]]);
          if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
            if (pointIndex === 0) {
              ctx.moveTo(projected[0], projected[1]);
            } else {
              ctx.lineTo(projected[0], projected[1]);
            }
          }
        });
        
        ctx.stroke();
      });
    }
    
    // Draw bearing lines from DE to all DX spots (Azimuthal)
    if (visiblePanels?.dxcluster && deLocation && dxSpots && dxSpots.length > 0) {
      dxSpots.forEach((spot) => {
        const dePoint = projection([deLocation.longitude, deLocation.latitude]);
        const dxPoint = projection([spot.longitude, spot.latitude]);
        
        if (dePoint && dxPoint) {
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(dePoint[0], dePoint[1]);
          ctx.lineTo(dxPoint[0], dxPoint[1]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw bearing label at midpoint
          const midX = (dePoint[0] + dxPoint[0]) / 2;
          const midY = (dePoint[1] + dxPoint[1]) / 2;
          const bearing = calculateBearing(deLocation.latitude, deLocation.longitude, spot.latitude, spot.longitude);
          
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(`${Math.round(bearing)}°`, midX, midY - 8);
          ctx.fillText(`${Math.round(bearing)}°`, midX, midY - 8);
          ctx.textAlign = 'left';
        }
      });
    }
    
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
    
    // Draw all DX spots
    if (visiblePanels?.dxcluster && dxSpots && dxSpots.length > 0) {
      dxSpots.forEach((spot, index) => {
        const point = projection([spot.longitude, spot.latitude]);
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
          ctx.fillText(spot.callsign || 'DX', point[0] + 12, point[1] - 8);
        }
      });
    }
    
    // Draw activations (SOTA/POTA) - blue markers with different style
    if (visiblePanels?.activations && activations && activations.length > 0) {
      activations.forEach((activation, index) => {
        const point = projection([activation.longitude, activation.latitude]);
        if (point) {
          // Draw star for SOTA, triangle for POTA
          if (activation.type === 'SOTA') {
            ctx.fillStyle = '#4a9eff';
            ctx.beginPath();
            const size = 7;
            for (let i = 0; i < 5; i++) {
              const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
              const x = point[0] + size * Math.cos(angle);
              const y = point[1] + size * Math.sin(angle);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            // POTA triangle
            ctx.fillStyle = '#9c27b0';
            ctx.beginPath();
            ctx.moveTo(point[0], point[1] - 8);
            ctx.lineTo(point[0] - 8, point[1] + 8);
            ctx.lineTo(point[0] + 8, point[1] + 8);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(activation.callsign.substring(0, 4), point[0] - 8, point[1] + 16);
        }
      });
    }
    
    // Draw satellites (Azimuthal)
    if (visiblePanels?.satellites && satellites && satellites.length > 0) {
      satellites.forEach((sat) => {
        const point = projection([sat.longitude, sat.latitude]);
        if (point) {
          ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(point[0], point[1], 12, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFA500';
          ctx.beginPath();
          ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFA500';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(sat.name.substring(0, 5), point[0] + 8, point[1]);
        }
      });
    }
  }, [deLocation, dxSpots, activations, satellites, terminatorData, showNightShade, showGrid, gridType, showRangeRings, zoomCenter, zoomScale, visiblePanels]);

  const handleClick = (e) => {
    // Don't register clicks if there was a drag
    if (dragDistanceRef && dragDistanceRef.current > 5) {
      dragDistanceRef.current = 0;
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const projection = geoAzimuthalEquidistant()
      .center([centerLng, centerLat])
      .scale((canvas.width / 3) * zoomScale)
      .translate([canvas.width / 2, canvas.height / 2]);
    
    const coords = projection.invert([x, y]);
    if (coords) {
      onMapClick(coords[1], coords[0]);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Call the parent's onWheel callback to trigger zoom
    if (onWheel) {
      onWheel(e);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onWheel]);

  return (
    <canvas
      ref={canvasRef}
      width={1320}
      height={660}
      onClick={handleClick}
      onTouchStart={(e) => e.preventDefault()}
      style={{ width: '100%', height: '660px', cursor: 'crosshair', backgroundColor: '#001a33', touchAction: 'none' }}
    />
  );
}

// Canvas map for Mercator projection using D3
function MercatorCanvas({ deLocation, dxSpots, activations, satellites, onMapClick, showNightShade, showGrid, gridType, showRangeRings, zoomCenter, zoomScale, visiblePanels, onWheel, dragDistanceRef }) {
  const canvasRef = useRef(null);
  
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#001a33';
    ctx.fillRect(0, 0, width, height);
    
    // Draw ocean with gradient
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
    oceanGradient.addColorStop(0, '#0a2540');
    oceanGradient.addColorStop(0.5, '#1a4d7a');
    oceanGradient.addColorStop(1, '#0a2540');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);

    // Main projection for overlays and UI
    const projection = geoMercator()
      .scale((width / (2 * Math.PI)) * zoomScale)
      .center([zoomCenter.lng, zoomCenter.lat])
      .translate([width / 2, height / 2]);
    
    const path = geoPath(projection, ctx);

    // Draw land with seamless wrapping - draw 3 copies at different longitudes
    if (worldLand) {
      [-360, 0, 360].forEach(lngOffset => {
        const offsetProjection = geoMercator()
          .scale((width / (2 * Math.PI)) * zoomScale)
          .center([zoomCenter.lng + lngOffset, zoomCenter.lat])
          .translate([width / 2, height / 2]);
        
        const offsetPath = geoPath(offsetProjection, ctx);
        
        // Base land color
        ctx.fillStyle = '#5a8c3a';
        ctx.strokeStyle = '#3d6028';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        offsetPath(worldLand);
        ctx.fill();
        ctx.stroke();
        
        // Add subtle relief/shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.strokeStyle = '#2a4018';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        offsetPath(worldLand);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        
        // Highlight edges for depth
        ctx.strokeStyle = '#7aa04f';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        offsetPath(worldLand);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });
    }
    
    // Draw grid based on type
    if (showGrid) {
      if (gridType === 'maidenhead') {
        [-360, 0, 360].forEach(lngOffset => {
          const offsetProjection = geoMercator()
            .scale((width / (2 * Math.PI)) * zoomScale)
            .center([zoomCenter.lng + lngOffset, zoomCenter.lat])
            .translate([width / 2, height / 2]);
          
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          
          // Always use world bounds for simplicity and reliability
          const gridLines = generateMaidenheadGrid(-85, 85, -180, 180);
          gridLines?.forEach(line => {
            line.coordinates?.forEach((point, i) => {
              const projected = offsetProjection(point);
              if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
                if (i === 0) ctx.moveTo(projected[0], projected[1]);
                else ctx.lineTo(projected[0], projected[1]);
              }
            });
          });
          ctx.stroke();
        });
      } else if (gridType === 'cq-zones') {
        [-360, 0, 360].forEach(lngOffset => {
          const offsetProjection = geoMercator()
            .scale((width / (2 * Math.PI)) * zoomScale)
            .center([zoomCenter.lng + lngOffset, zoomCenter.lat])
            .translate([width / 2, height / 2]);
          
          // Always use world bounds for simplicity and reliability
          const gridLines = generateCQZoneGridLines(-85, 85, -180, 180);
          gridLines?.forEach(line => {
            ctx.strokeStyle = line.style?.color || 'rgba(255, 200, 100, 0.3)';
            ctx.lineWidth = line.style?.width || 1;
            ctx.beginPath();
            line.coordinates?.forEach((point, i) => {
              const projected = offsetProjection(point);
              if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
                if (i === 0) ctx.moveTo(projected[0], projected[1]);
                else ctx.lineTo(projected[0], projected[1]);
              }
            });
            ctx.stroke();
          });
        });
      } else if (gridType === 'itu-regions') {
        [-360, 0, 360].forEach(lngOffset => {
          const offsetProjection = geoMercator()
            .scale((width / (2 * Math.PI)) * zoomScale)
            .center([zoomCenter.lng + lngOffset, zoomCenter.lat])
            .translate([width / 2, height / 2]);
          
          // Always use world bounds for simplicity and reliability
          const gridLines = generateITURegionGridLines(-85, 85, -180, 180);
          gridLines?.forEach(line => {
            ctx.strokeStyle = line.style?.color || 'rgba(255, 150, 50, 0.6)';
            ctx.lineWidth = line.style?.width || 2.5;
            ctx.beginPath();
            line.coordinates?.forEach((point, i) => {
              const projected = offsetProjection(point);
              if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
                if (i === 0) ctx.moveTo(projected[0], projected[1]);
                else ctx.lineTo(projected[0], projected[1]);
              }
            });
            ctx.stroke();
          });
        });
      } else {
        // Default: Lat/Lng - draw graticule for all three copies
        [-360, 0, 360].forEach(lngOffset => {
          const offsetProjection = geoMercator()
            .scale((width / (2 * Math.PI)) * zoomScale)
            .center([zoomCenter.lng + lngOffset, zoomCenter.lat])
            .translate([width / 2, height / 2]);
          
          const offsetPath = geoPath(offsetProjection, ctx);
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          const graticule = geoGraticule().step([30, 20]);
          offsetPath(graticule());
          ctx.stroke();
        });
      }
    }
    
    // Draw night shade if enabled
    if (showNightShade && terminatorData?.points?.length) {
      // Determine which hemisphere has night
      const midIdx = Math.floor(terminatorData.points.length / 2);
      const sunSubsolarLat = terminatorData.points[midIdx][0];
      const shadeNorth = sunSubsolarLat < 0;
      
      // Find the continuous visible segment
      const segments = [];
      let currentSegment = [];
      let prevX = null;
      
      for (let i = 0; i < terminatorData.points.length; i++) {
        const [lat, lng] = terminatorData.points[i];
        const point = projection([lng, lat]);
        
        if (point && point[0] != null && point[1] != null) {
          const x = point[0];
          
          // Detect wraparound
          if (prevX !== null && Math.abs(x - prevX) > width * 0.5) {
            if (currentSegment.length > 0) {
              segments.push(currentSegment);
            }
            currentSegment = [[lat, lng]];
          } else {
            currentSegment.push([lat, lng]);
          }
          
          prevX = x;
        }
      }
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      
      // Use the longest segment
      const visibleCurve = segments.reduce((longest, seg) => 
        seg.length > longest.length ? seg : longest, segments[0] || []);
      
      if (visibleCurve.length >= 3) {
        // Get the longitude range of the visible curve
        const firstLng = visibleCurve[0][1];
        const lastLng = visibleCurve[visibleCurve.length - 1][1];
        
        // Create a proper Polygon that includes the terminator and map edges
        const polygonCoords = [];
        
        if (shadeNorth) {
          // North shade: top edge, then terminator, back to top
          polygonCoords.push([firstLng, 85]); // Top edge at first longitude
          
          // Add terminator points (as lng, lat for GeoJSON)
          visibleCurve.forEach(([lat, lng]) => {
            polygonCoords.push([lng, lat]);
          });
          
          polygonCoords.push([lastLng, 85]); // Top edge at last longitude
          polygonCoords.push([firstLng, 85]); // Close the polygon
        } else {
          // South shade: bottom edge, then terminator, back to bottom
          polygonCoords.push([firstLng, -85]); // Bottom edge
          
          visibleCurve.forEach(([lat, lng]) => {
            polygonCoords.push([lng, lat]);
          });
          
          polygonCoords.push([lastLng, -85]); // Bottom edge
          polygonCoords.push([firstLng, -85]); // Close
        }
        
        // Create GeoJSON Polygon
        const nightPolygon = {
          type: 'Polygon',
          coordinates: [polygonCoords]
        };
        
        // Draw using D3's path - this handles all the smooth interpolation
        ctx.fillStyle = 'rgba(0, 0, 51, 0.65)';
        ctx.beginPath();
        path(nightPolygon);
        ctx.fill();
      }
    }
    
    // Draw great circle path
    if (deLocation && dxSpots && dxSpots.length > 0) {
      const firstSpot = dxSpots[0];
      const gcPath = {
        type: 'LineString',
        coordinates: calculateGreatCirclePath(
          deLocation.latitude, deLocation.longitude,
          firstSpot.latitude, firstSpot.longitude
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

    // Draw range rings (Mercator)
    if (showRangeRings && deLocation) {
      const rings = generateStandardRangeRings(deLocation.latitude, deLocation.longitude);
      rings.forEach((ring, ringIndex) => {
        ctx.strokeStyle = `rgba(100, 200, 100, ${0.3 - ringIndex * 0.05})`;
        ctx.lineWidth = ringIndex === 0 ? 1.5 : 1;
        ctx.beginPath();
        ring.points.forEach((point, pointIndex) => {
          const projected = projection([point[0], point[1]]);
          if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
            if (pointIndex === 0) ctx.moveTo(projected[0], projected[1]);
            else ctx.lineTo(projected[0], projected[1]);
          }
        });
        ctx.stroke();
      });
    }
    
    // Draw bearing lines from DE to all DX spots
    if (deLocation && visiblePanels?.dxcluster && dxSpots && dxSpots.length > 0) {
      dxSpots.forEach((spot) => {
        const dePoint = projection([deLocation.longitude, deLocation.latitude]);
        const dxPoint = projection([spot.longitude, spot.latitude]);
        
        if (dePoint && dxPoint) {
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(dePoint[0], dePoint[1]);
          ctx.lineTo(dxPoint[0], dxPoint[1]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw bearing label at midpoint
          const midX = (dePoint[0] + dxPoint[0]) / 2;
          const midY = (dePoint[1] + dxPoint[1]) / 2;
          const bearing = calculateBearing(deLocation.latitude, deLocation.longitude, spot.latitude, spot.longitude);
          const distance = calculateDistance(deLocation.latitude, deLocation.longitude, spot.latitude, spot.longitude);
          
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(`${Math.round(bearing)}°`, midX, midY - 8);
          ctx.fillText(`${Math.round(bearing)}°`, midX, midY - 8);
          ctx.textAlign = 'left';
        }
      });
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
    
    // Draw all DX spots
    if (visiblePanels?.dxcluster && dxSpots && dxSpots.length > 0) {
      dxSpots.forEach((spot, index) => {
        const point = projection([spot.longitude, spot.latitude]);
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
          ctx.fillText(spot.callsign || 'DX', point[0] + 12, point[1] - 8);
        }
      });
    }
    
    // Draw activations (SOTA/POTA) - blue markers with different style
    if (visiblePanels?.activations && activations && activations.length > 0) {
      activations.forEach((activation, index) => {
        const point = projection([activation.longitude, activation.latitude]);
        if (point) {
          // Draw star for SOTA, triangle for POTA
          if (activation.type === 'SOTA') {
            ctx.fillStyle = '#4a9eff';
            ctx.beginPath();
            const size = 7;
            for (let i = 0; i < 5; i++) {
              const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
              const x = point[0] + size * Math.cos(angle);
              const y = point[1] + size * Math.sin(angle);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            // POTA triangle
            ctx.fillStyle = '#9c27b0';
            ctx.beginPath();
            ctx.moveTo(point[0], point[1] - 8);
            ctx.lineTo(point[0] - 8, point[1] + 8);
            ctx.lineTo(point[0] + 8, point[1] + 8);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(activation.callsign.substring(0, 4), point[0] - 8, point[1] + 16);
        }
      });
    }
    
    // Draw satellites (Mercator)
    if (visiblePanels?.satellites && satellites && satellites.length > 0) {
      satellites.forEach((sat) => {
        const point = projection([sat.longitude, sat.latitude]);
        if (point) {
          ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(point[0], point[1], 12, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFA500';
          ctx.beginPath();
          ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFA500';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(sat.name.substring(0, 5), point[0] + 8, point[1]);
        }
      });
    }
  }, [deLocation, dxSpots, activations, satellites, terminatorData, showNightShade, showGrid, gridType, showRangeRings, zoomCenter, zoomScale, visiblePanels]);

  const handleClick = (e) => {
    // Don't register clicks if there was a drag
    if (dragDistanceRef && dragDistanceRef.current > 5) {
      dragDistanceRef.current = 0;
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const projection = geoMercator()
      .scale((canvas.width / (2 * Math.PI)) * zoomScale)
      .center([zoomCenter.lng, zoomCenter.lat])
      .translate([canvas.width / 2, canvas.height / 2]);
    
    const coords = projection.invert([x, y]);
    if (coords) {
      onMapClick(coords[1], coords[0]);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWheel) {
      onWheel(e);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onWheel]);

  return (
    <canvas
      ref={canvasRef}
      width={1320}
      height={660}
      onClick={handleClick}
      onTouchStart={(e) => e.preventDefault()}
      style={{ width: '100%', height: '660px', cursor: 'crosshair', backgroundColor: '#001a33', touchAction: 'none' }}
    />
  );
}

// Canvas map for Robinson projection using D3
function RobinsonCanvas({ deLocation, dxSpots, activations, satellites, onMapClick, showNightShade, showGrid, gridType, showRangeRings, zoomCenter, zoomScale, visiblePanels, onWheel, dragDistanceRef }) {
  const canvasRef = useRef(null);
  
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#001a33';
    ctx.fillRect(0, 0, width, height);
    
    // Draw ocean with gradient
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
    oceanGradient.addColorStop(0, '#0a2540');
    oceanGradient.addColorStop(0.5, '#1a4d7a');
    oceanGradient.addColorStop(1, '#0a2540');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);

    const projection = geoRobinson()
      .center([zoomCenter.lng, zoomCenter.lat])
      .scale((width / 5.5) * zoomScale)
      .translate([width / 2, height / 2]);
    
    const path = geoPath(projection, ctx);
    
    // Draw land with topographic coloring and relief
    if (worldLand) {
      // Base land color
      ctx.fillStyle = '#5a8c3a';
      ctx.strokeStyle = '#3d6028';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      path(worldLand);
      ctx.fill();
      ctx.stroke();
      
      // Add subtle relief/shadow effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.strokeStyle = '#2a4018';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      path(worldLand);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      
      // Highlight edges for depth
      ctx.strokeStyle = '#7aa04f';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      path(worldLand);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    
    // Draw grid based on type
    if (showGrid) {
      if (gridType === 'maidenhead') {
        const bounds = projection.invert([0, 0]);
        const boundsMax = projection.invert([width, height]);
        const minLat = Math.min(bounds[1], boundsMax[1]);
        const maxLat = Math.max(bounds[1], boundsMax[1]);
        const minLng = Math.min(bounds[0], boundsMax[0]);
        const maxLng = Math.max(bounds[0], boundsMax[0]);
        
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        
        const gridLines = generateMaidenheadGrid(minLat, maxLat, minLng, maxLng);
        gridLines?.forEach(line => {
          line.coordinates?.forEach((point, i) => {
            const projected = projection(point);
            if (projected) {
              if (i === 0) ctx.moveTo(projected[0], projected[1]);
              else ctx.lineTo(projected[0], projected[1]);
            }
          });
        });
        ctx.stroke();
        ctx.stroke();
      } else if (gridType === 'cq-zones') {
        const bounds = projection.invert([0, 0]);
        const boundsMax = projection.invert([width, height]);
        const minLat = Math.min(bounds[1], boundsMax[1]);
        const maxLat = Math.max(bounds[1], boundsMax[1]);
        const minLng = Math.min(bounds[0], boundsMax[0]);
        const maxLng = Math.max(bounds[0], boundsMax[0]);
        
        const gridLines = generateCQZoneGridLines(minLat, maxLat, minLng, maxLng);
        gridLines?.forEach(line => {
          ctx.strokeStyle = line.style?.color || 'rgba(255, 200, 100, 0.3)';
          ctx.lineWidth = line.style?.width || 1;
          ctx.beginPath();
          line.coordinates?.forEach((point, i) => {
            const projected = projection(point);
            if (projected) {
              if (i === 0) ctx.moveTo(projected[0], projected[1]);
              else ctx.lineTo(projected[0], projected[1]);
            }
          });
          ctx.stroke();
        });
      } else if (gridType === 'itu-regions') {
        const bounds = projection.invert([0, 0]);
        const boundsMax = projection.invert([width, height]);
        const minLat = Math.min(bounds[1], boundsMax[1]);
        const maxLat = Math.max(bounds[1], boundsMax[1]);
        const minLng = Math.min(bounds[0], boundsMax[0]);
        const maxLng = Math.max(bounds[0], boundsMax[0]);
        
        const gridLines = generateITURegionGridLines(minLat, maxLat, minLng, maxLng);
        gridLines?.forEach(line => {
          ctx.strokeStyle = line.style?.color || 'rgba(255, 150, 50, 0.6)';
          ctx.lineWidth = line.style?.width || 2.5;
          ctx.beginPath();
          line.coordinates?.forEach((point, i) => {
            const projected = projection(point);
            if (projected) {
              if (i === 0) ctx.moveTo(projected[0], projected[1]);
              else ctx.lineTo(projected[0], projected[1]);
            }
          });
          ctx.stroke();
        });
      } else {
        // Default: Lat/Lng
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const graticule = geoGraticule().step([30, 20]);
        path(graticule());
        ctx.stroke();
      }
    }
    
    if (showNightShade && terminatorData?.points?.length) {
      // Determine which hemisphere has night
      const midIdx = Math.floor(terminatorData.points.length / 2);
      const sunSubsolarLat = terminatorData.points[midIdx][0];
      const shadeNorth = sunSubsolarLat < 0;
      
      // Find the continuous visible segment
      const segments = [];
      let currentSegment = [];
      let prevX = null;
      
      for (let i = 0; i < terminatorData.points.length; i++) {
        const [lat, lng] = terminatorData.points[i];
        const point = projection([lng, lat]);
        
        if (point && point[0] != null && point[1] != null) {
          const x = point[0];
          
          // Detect wraparound
          if (prevX !== null && Math.abs(x - prevX) > width * 0.5) {
            if (currentSegment.length > 0) {
              segments.push(currentSegment);
            }
            currentSegment = [[lat, lng]];
          } else {
            currentSegment.push([lat, lng]);
          }
          
          prevX = x;
        }
      }
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      
      // Use the longest segment
      const visibleCurve = segments.reduce((longest, seg) => 
        seg.length > longest.length ? seg : longest, segments[0] || []);
      
      if (visibleCurve.length < 3) return;
      
      // Get the longitude range of the visible curve
      const firstLng = visibleCurve[0][1];
      const lastLng = visibleCurve[visibleCurve.length - 1][1];
      
      // Create a proper Polygon that includes the terminator and map edges
      const polygonCoords = [];
      
      if (shadeNorth) {
        // North shade: top edge, then terminator, back to top
        polygonCoords.push([firstLng, 85]); // Top edge at first longitude
        
        // Add terminator points (as lng, lat for GeoJSON)
        visibleCurve.forEach(([lat, lng]) => {
          polygonCoords.push([lng, lat]);
        });
        
        polygonCoords.push([lastLng, 85]); // Top edge at last longitude
        polygonCoords.push([firstLng, 85]); // Close the polygon
      } else {
        // South shade: bottom edge, then terminator, back to bottom
        polygonCoords.push([firstLng, -85]); // Bottom edge
        
        visibleCurve.forEach(([lat, lng]) => {
          polygonCoords.push([lng, lat]);
        });
        
        polygonCoords.push([lastLng, -85]); // Bottom edge
        polygonCoords.push([firstLng, -85]); // Close
      }
      
      // Create GeoJSON Polygon
      const nightPolygon = {
        type: 'Polygon',
        coordinates: [polygonCoords]
      };
      
      // Draw using D3's path - this handles all the smooth interpolation
      ctx.fillStyle = 'rgba(0, 0, 51, 0.65)';
      ctx.beginPath();
      path(nightPolygon);
      ctx.fill();
    }
    
    if (deLocation && dxSpots && dxSpots.length > 0) {
      const firstSpot = dxSpots[0];
      const gcPath = {
        type: 'LineString',
        coordinates: calculateGreatCirclePath(
          deLocation.latitude, deLocation.longitude,
          firstSpot.latitude, firstSpot.longitude
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

    // Draw range rings (Robinson)
    if (showRangeRings && deLocation) {
      const rings = generateStandardRangeRings(deLocation.latitude, deLocation.longitude);
      rings.forEach((ring, ringIndex) => {
        ctx.strokeStyle = `rgba(100, 200, 100, ${0.3 - ringIndex * 0.05})`;
        ctx.lineWidth = ringIndex === 0 ? 1.5 : 1;
        ctx.beginPath();
        ring.points.forEach((point, pointIndex) => {
          const projected = projection([point[0], point[1]]);
          if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
            if (pointIndex === 0) ctx.moveTo(projected[0], projected[1]);
            else ctx.lineTo(projected[0], projected[1]);
          }
        });
        ctx.stroke();
      });
    }
    
    // Draw bearing lines from DE to all DX spots (Robinson)
    if (deLocation && visiblePanels?.dxcluster && dxSpots && dxSpots.length > 0) {
      dxSpots.forEach((spot) => {
        const dePoint = projection([deLocation.longitude, deLocation.latitude]);
        const dxPoint = projection([spot.longitude, spot.latitude]);
        
        if (dePoint && dxPoint) {
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(dePoint[0], dePoint[1]);
          ctx.lineTo(dxPoint[0], dxPoint[1]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw bearing label at midpoint
          const midX = (dePoint[0] + dxPoint[0]) / 2;
          const midY = (dePoint[1] + dxPoint[1]) / 2;
          const bearing = calculateBearing(deLocation.latitude, deLocation.longitude, spot.latitude, spot.longitude);
          
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(`${Math.round(bearing)}°`, midX, midY - 8);
          ctx.fillText(`${Math.round(bearing)}°`, midX, midY - 8);
          ctx.textAlign = 'left';
        }
      });
    }
    
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
    
    // Draw all DX spots
    if (visiblePanels?.dxcluster && dxSpots && dxSpots.length > 0) {
      dxSpots.forEach((spot, index) => {
        const point = projection([spot.longitude, spot.latitude]);
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
          ctx.fillText(spot.callsign || 'DX', point[0] + 12, point[1] - 8);
        }
      });
    }
    
    // Draw activations (SOTA/POTA) - blue markers with different style
    if (visiblePanels?.activations && activations && activations.length > 0) {
      activations.forEach((activation, index) => {
        const point = projection([activation.longitude, activation.latitude]);
        if (point) {
          // Draw star for SOTA, triangle for POTA
          if (activation.type === 'SOTA') {
            ctx.fillStyle = '#4a9eff';
            ctx.beginPath();
            const size = 7;
            for (let i = 0; i < 5; i++) {
              const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
              const x = point[0] + size * Math.cos(angle);
              const y = point[1] + size * Math.sin(angle);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            // POTA triangle
            ctx.fillStyle = '#9c27b0';
            ctx.beginPath();
            ctx.moveTo(point[0], point[1] - 8);
            ctx.lineTo(point[0] - 8, point[1] + 8);
            ctx.lineTo(point[0] + 8, point[1] + 8);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(activation.callsign.substring(0, 4), point[0] - 8, point[1] + 16);
        }
      });
    }
    
    // Draw satellites (Robinson)
    if (visiblePanels?.satellites && satellites && satellites.length > 0) {
      satellites.forEach((sat) => {
        const point = projection([sat.longitude, sat.latitude]);
        if (point) {
          ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(point[0], point[1], 12, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFA500';
          ctx.beginPath();
          ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFA500';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(sat.name.substring(0, 5), point[0] + 8, point[1]);
        }
      });
    }
  }, [deLocation, dxSpots, activations, satellites, terminatorData, showNightShade, showGrid, gridType, showRangeRings, zoomCenter, zoomScale, visiblePanels]);

  const handleClick = (e) => {
    // Don't register clicks if there was a drag
    if (dragDistanceRef && dragDistanceRef.current > 5) {
      dragDistanceRef.current = 0;
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const projection = geoRobinson()
      .center([zoomCenter.lng, zoomCenter.lat])
      .scale((canvas.width / 5.5) * zoomScale)
      .translate([canvas.width / 2, canvas.height / 2]);
    
    const coords = projection.invert([x, y]);
    if (coords) {
      onMapClick(coords[1], coords[0]);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWheel) {
      onWheel(e);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onWheel]);

  return (
    <canvas
      ref={canvasRef}
      width={1320}
      height={660}
      onClick={handleClick}
      onTouchStart={(e) => e.preventDefault()}
      style={{ width: '100%', height: '660px', cursor: 'crosshair', backgroundColor: '#001a33', touchAction: 'none' }}
    />
  );
}

// Main WorldMap component
// Canvas wrapper component that adds mouse wheel zoom and drag pan
function CanvasMapContainer({ children, onZoomChange, projection }) {
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0); // Track total drag distance;
  const lastTimeRef = useRef(Date.now());
  const panSpeedRef = useRef(0.5); // degrees per second
  
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click
      isDraggingRef.current = true;
      dragDistanceRef.current = 0;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    
    dragDistanceRef.current += Math.sqrt(dx * dx + dy * dy);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    
    onZoomChange((prev) => {
      if (projection === 'azimuthal') {
        // For azimuthal: rotate like a globe - direct and responsive
        // Higher rotation speed makes it feel more like grabbing and rotating a physical globe
        const rotationSpeed = 0.6; // degrees per pixel - more responsive globe feel
        const dLng = -dx * rotationSpeed;
        const dLat = dy * rotationSpeed;
        
        return {
          ...prev,
          center: {
            lat: Math.max(-85, Math.min(85, prev.center.lat + dLat)),
            lng: ((prev.center.lng + dLng + 540) % 360) - 180
          }
        };
      } else if (projection === 'mercator') {
        // For Mercator: direct 1:1 panning feel
        const dLat = dy / 6; // ~6 pixels per degree - direct, responsive feel
        const dLng = -dx / 6;
        
        // Calculate latitude limits based on zoom to prevent showing map edges
        // At scale 1, limit to ~60 degrees, progressively more at higher zooms
        const maxLat = Math.min(85, 60 + (prev.scale - 1) * 8);
        
        return {
          ...prev,
          center: {
            lat: Math.max(-maxLat, Math.min(maxLat, prev.center.lat + dLat)),
            lng: ((prev.center.lng + dLng + 540) % 360) - 180
          }
        };
      } else {
        // For Robinson: direct map dragging
        const dLat = dy / 15; // ~15 pixels per degree
        const dLng = -dx / 15;
        
        return {
          ...prev,
          center: {
            lat: Math.max(-85, Math.min(85, prev.center.lat + dLat)),
            lng: ((prev.center.lng + dLng + 540) % 360) - 180
          }
        };
      }
    });
  };
  
  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e) => {
    // Prevent clicks if there was a meaningful drag
    if (dragDistanceRef.current > 5) {
      dragDistanceRef.current = 0;
      e.stopPropagation();
      return;
    }
    dragDistanceRef.current = 0;
  };
  // Continuous pan animation - disabled
  // useEffect(() => {
  //   if (projection !== 'mercator' || isDraggingRef.current) return;
  //
  //   let lastTime = Date.now();
  //   let frameId;
  //
  //   const animate = () => {
  //     if (isDraggingRef.current) {
  //       frameId = requestAnimationFrame(animate);
  //       return;
  //     }
  //
  //     const now = Date.now();
  //     const deltaTime = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms
  //     lastTime = now;
  //
  //     onZoomChange((prev) => ({
  //       ...prev,
  //       center: {
  //         ...prev.center,
  //         lng: ((prev.center.lng + 5 * deltaTime + 540) % 360) - 180  // Increased from 0.5 to 5 for 10x faster
  //       }
  //     }));
  //
  //     frameId = requestAnimationFrame(animate);
  //   };
  //
  //   frameId = requestAnimationFrame(animate);
  //   return () => cancelAnimationFrame(frameId);
  // }, [projection, onZoomChange]);
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);
  
  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ touchAction: 'none', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
    >
      {children && typeof children === 'function' 
        ? children({ dragDistanceRef })
        : children}
    </div>
  );
}

const WorldMap = ({ deLocation, dxSpots, activations, satellites, autoZoomToDX, onZoomComplete, onMapClick, onClearDX, visiblePanels }) => {
  const [showNightShade, setShowNightShade] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [gridType, setGridType] = useState('lat-lng');
  const [projection, setProjection] = useState('mercator');
  const [showRangeRings, setShowRangeRings] = useState(false);
  const [zoom, setZoom] = useState({ center: { lat: 0, lng: 0 }, scale: 1 });
  
  const { data: terminatorData } = useQuery({
    queryKey: ['terminator'],
    queryFn: fetchDayNightTerminator,
    refetchInterval: 60000,
  });
  
  // Auto-zoom to first DX spot when requested
  useEffect(() => {
    if (autoZoomToDX && dxSpots && dxSpots.length > 0) {
      const firstSpot = dxSpots[0];
      setZoom({ 
        center: { lat: firstSpot.latitude, lng: firstSpot.longitude }, 
        scale: 3.5 
      });
      if (onZoomComplete) {
        onZoomComplete();
      }
    }
  }, [autoZoomToDX, dxSpots, onZoomComplete]);
  
  // Define preset bounds
  const presetBounds = {
    world: deLocation ? { lat: deLocation.latitude, lng: deLocation.longitude, scale: 1 } : { lat: 0, lng: 0, scale: 1 },
    na: { lat: 40, lng: -100, scale: 2.2 },
    eu: { lat: 50, lng: 10, scale: 2.5 },
    asia: { lat: 30, lng: 100, scale: 2 },
    de: deLocation ? { lat: deLocation.latitude, lng: deLocation.longitude, scale: 3.5 } : null,
    dx: dxSpots && dxSpots.length > 0 ? { lat: dxSpots[0].latitude, lng: dxSpots[0].longitude, scale: 3.5 } : null,
  };
  
  const handleZoomPreset = (preset) => {
    const bounds = presetBounds[preset];
    if (bounds) {
      setZoom({ center: { lat: bounds.lat, lng: bounds.lng }, scale: bounds.scale });
    }
  };
  
  return (
    <div className="world-map">
      <MapControls
        showNightShade={showNightShade}
        setShowNightShade={setShowNightShade}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        gridType={gridType}
        setGridType={setGridType}
        showRangeRings={showRangeRings}
        setShowRangeRings={setShowRangeRings}
        projection={projection}
        setProjection={setProjection}
        onZoomPreset={handleZoomPreset}
        dxSpots={dxSpots}
        deLocation={deLocation}
        onClearDX={onClearDX}
      />
      
      <CanvasMapContainer onZoomChange={setZoom} projection={projection}>
        {({ dragDistanceRef }) => projection === 'azimuthal' ? (
          <AzimuthalCanvas
            deLocation={deLocation}
            dxSpots={dxSpots}
            activations={activations}
            satellites={satellites}
            onMapClick={onMapClick}
            showNightShade={showNightShade}
            showGrid={showGrid}
            gridType={gridType}
            showRangeRings={showRangeRings}
            zoomCenter={zoom.center}
            zoomScale={zoom.scale}
            visiblePanels={visiblePanels}
            dragDistanceRef={dragDistanceRef}
            onWheel={(e) => {
              const delta = e.deltaY > 0 ? 0.8 : 1.2;
              setZoom((prev) => ({
                ...prev,
                scale: Math.max(1, Math.min(4, prev.scale * delta))
              }));
            }}
          />
        ) : projection === 'robinson' ? (
          <RobinsonCanvas
            deLocation={deLocation}
            dxSpots={dxSpots}
            activations={activations}
            satellites={satellites}
            onMapClick={onMapClick}
            showNightShade={showNightShade}
            showGrid={showGrid}
            gridType={gridType}
            showRangeRings={showRangeRings}
            zoomCenter={zoom.center}
            zoomScale={zoom.scale}
            visiblePanels={visiblePanels}
            dragDistanceRef={dragDistanceRef}
            onWheel={(e) => {
              const delta = e.deltaY > 0 ? 0.8 : 1.2;
              setZoom((prev) => ({
                ...prev,
                scale: Math.max(1, Math.min(4, prev.scale * delta))
              }));
            }}
          />
        ) : (
          <MercatorCanvas
            deLocation={deLocation}
            dxSpots={dxSpots}
            activations={activations}
            satellites={satellites}
            onMapClick={onMapClick}
            showNightShade={showNightShade}
            showGrid={showGrid}
            gridType={gridType}
            showRangeRings={showRangeRings}
            zoomCenter={zoom.center}
            zoomScale={zoom.scale}
            visiblePanels={visiblePanels}
            dragDistanceRef={dragDistanceRef}
            onWheel={(e) => {
              const delta = e.deltaY > 0 ? 0.8 : 1.2;
              setZoom((prev) => ({
                ...prev,
                scale: Math.max(1, Math.min(4, prev.scale * delta))
              }));
            }}
          />
        )}
      </CanvasMapContainer>
    </div>
  );
};

export default WorldMap;
