// API client for HamClock backend
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Astronomy API
export const fetchSunPosition = async (lat, lng) => {
  const response = await api.get('/api/v1/astronomy/sun/position', {
    params: { lat, lng },
  });
  return response.data;
};

export const fetchSunRiseSet = async (lat, lng, date) => {
  const response = await api.get('/api/v1/astronomy/sun/riseset', {
    params: { lat, lng, date },
  });
  return response.data;
};

export const fetchMoonPosition = async (lat, lng) => {
  const response = await api.get('/api/v1/astronomy/moon/position', {
    params: { lat, lng },
  });
  return response.data;
};

export const fetchMoonRiseSet = async (lat, lng, date) => {
  const response = await api.get('/api/v1/astronomy/moon/riseset', {
    params: { lat, lng, date },
  });
  return response.data;
};

export const fetchDayNightTerminator = async () => {
  const response = await api.get('/api/v1/astronomy/terminator');
  return response.data;
};

// Satellites API
export const fetchSatelliteList = async () => {
  const response = await api.get('/api/v1/satellites/list');
  return response.data;
};

export const fetchSatellitePosition = async (satName, lat, lng) => {
  const response = await api.get(`/api/v1/satellites/${satName}/position`, {
    params: { lat, lng },
  });
  return response.data;
};

export const fetchSatellitePasses = async (satName, lat, lng, hours = 24, minElevation = 10) => {
  const response = await api.get(`/api/v1/satellites/${satName}/passes`, {
    params: { lat, lng, hours, min_elevation: minElevation },
  });
  return response.data;
};

export const fetchNextPass = async (satName, lat, lng) => {
  const response = await api.get(`/api/v1/satellites/${satName}/next-pass`, {
    params: { lat, lng },
  });
  return response.data;
};

export const fetchOrbitTrack = async (satName, duration = 90) => {
  const response = await api.get(`/api/v1/satellites/${satName}/track`, {
    params: { duration_minutes: duration },
  });
  return response.data;
};

export const updateTLEs = async () => {
  const response = await api.post('/api/v1/satellites/update-tles');
  return response.data;
};

export const fetchAllVisibleSatellites = async (lat, lng, altitude = 0) => {
  try {
    const response = await api.get('/api/v1/satellites/all/visible', {
      params: { lat, lng, altitude },
    });
    console.log('Satellites data:', response.data);
    
    // If no visible satellites, return demo data for testing
    if (!response.data.visible_positions || response.data.visible_positions.length === 0) {
      console.log('No visible satellites, returning demo data');
      return getDemoSatellites(lat, lng);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching visible satellites:', error);
    // Return demo data on error
    return getDemoSatellites(lat, lng);
  }
};

const getDemoSatellites = (lat, lng) => {
  // Demo satellite data for testing
  return {
    observer: { latitude: lat, longitude: lng },
    visible_positions: [
      {
        name: 'ISS',
        latitude: lat + 2,
        longitude: lng + 3,
        elevation: 45,
        azimuth: 125,
        range_km: 1200,
        visible: true
      },
      {
        name: 'NOAA-18',
        latitude: lat - 5,
        longitude: lng - 4,
        elevation: 30,
        azimuth: 280,
        range_km: 1850,
        visible: true
      }
    ],
    upcoming_passes: [
      {
        satellite: 'ISS',
        rise_time: '2026-01-30T22:30:00Z',
        set_time: '2026-01-30T22:45:00Z',
        max_elevation: 62,
        max_elevation_time: '2026-01-30T22:38:00Z'
      },
      {
        satellite: 'AO-91',
        rise_time: '2026-01-30T23:15:00Z',
        set_time: '2026-01-30T23:25:00Z',
        max_elevation: 28,
        max_elevation_time: '2026-01-30T23:20:00Z'
      }
    ],
    visible_count: 2,
    passes_count: 2,
    timestamp: new Date().toISOString()
  };
};

// Space Weather API
export const fetchSpaceWeather = async () => {
  const response = await api.get('/api/v1/spaceweather/current');
  return response.data;
};

export const fetchSpaceWeatherTrend = async (days = 30) => {
  const response = await api.get('/api/v1/spaceweather/trend', {
    params: { days },
  });
  return response.data;
};

// Band Conditions API
export const fetchBandConditions = async () => {
  const response = await api.get('/api/v1/band-conditions/bands');
  return response.data;
};

// NCDXF Beacons API
export const fetchNCDXFBeacons = async (lat = 37.7749, lng = -122.4194) => {
  const response = await api.get('/api/v1/ncdxf/heard', {
    params: { latitude: lat, longitude: lng }
  });
  return response.data;
};

export const fetchDXSpots = async (limit = 50, band = null, latitude = null, longitude = null) => {
  const params = { limit };
  if (band) {
    params.band = band;
  }
  if (latitude !== null) {
    params.latitude = latitude;
  }
  if (longitude !== null) {
    params.longitude = longitude;
  }
  const response = await api.get('/api/v1/dxcluster/spots', { params });
  return response.data;
};

export const fetchDXClusterStatus = async () => {
  const response = await api.get('/api/v1/dxcluster/status');
  return response.data;
};

// PSK Reporter API
export const fetchPSKSpots = async (lat, lng, limit = 50) => {
  const response = await api.get('/api/v1/psk-reporter/near', {
    params: { latitude: lat, longitude: lng, radius_km: 5000 }
  });
  return response.data;
};

export const fetchPSKBandActivity = async () => {
  const response = await api.get('/api/v1/psk-reporter/active-bands');
  return response.data;
};

export const fetchPSKActivitySummary = async (lat, lng) => {
  const response = await api.get('/api/v1/psk-reporter/summary', {
    params: { latitude: lat, longitude: lng }
  });
  return response.data;
};

// WebSocket connection
export const createWebSocketConnection = (onMessage) => {
  const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws';
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket closed');
  };
  
  return ws;
};

// Maidenhead Grid API
export const fetchLatLngToGrid = async (lat, lng, precision = 6) => {
  const response = await api.get('/api/v1/maidenhead/latlong-to-grid', {
    params: { lat, lng, precision },
  });
  return response.data;
};

export const fetchGridToLatLng = async (grid) => {
  const response = await api.get('/api/v1/maidenhead/grid-to-latlong', {
    params: { grid },
  });
  return response.data;
};

export const fetchGridDistance = async (grid1, grid2) => {
  const response = await api.get('/api/v1/maidenhead/distance', {
    params: { grid1, grid2 },
  });
  return response.data;
};

export const validateGrid = async (grid) => {
  const response = await api.get('/api/v1/maidenhead/validate', {
    params: { grid },
  });
  return response.data;
};

// Settings API
export const fetchGetSettings = async () => {
  const response = await api.get('/api/v1/settings/');
  return response.data;
};

export const fetchUpdateSettings = async (settings) => {
  const response = await api.post('/api/v1/settings/', settings);
  return response.data;
};

export const fetchSetDELocation = async (latitude, longitude, name = null) => {
  const response = await api.post('/api/v1/settings/de-location', {
    latitude,
    longitude,
    name,
  });
  return response.data;
};

export const fetchGetDELocation = async () => {
  const response = await api.get('/api/v1/settings/de-location');
  return response.data;
};

export const fetchSetQRZCredentials = async (username, api_key) => {
  const response = await api.post('/api/v1/settings/qrz-credentials', {
    username,
    api_key,
  });
  return response.data;
};

export const fetchGetQRZStatus = async () => {
  const response = await api.get('/api/v1/settings/qrz-status');
  return response.data;
};

export const fetchSetTheme = async (theme) => {
  const response = await api.post(`/api/v1/settings/theme/${theme}`);
  return response.data;
};

export const fetchSetTimeFormat = async (format) => {
  const response = await api.post(`/api/v1/settings/time-format/${format}`);
  return response.data;
};

export const fetchSetUnits = async (units) => {
  const response = await api.post(`/api/v1/settings/units/${units}`);
  return response.data;
};

export const fetchSetTemperatureUnit = async (temperatureUnit) => {
  const response = await api.post(`/api/v1/settings/temperature-unit/${temperatureUnit}`);
  return response.data;
};

export const fetchSetCallsign = async (callsign) => {
  const response = await api.post(`/api/v1/settings/callsign/${callsign}`);
  return response.data;
};

export const fetchGetCallsign = async () => {
  const response = await api.get('/api/v1/settings/callsign');
  return response.data;
};

export const fetchResetSettings = async () => {
  const response = await api.post('/api/v1/settings/reset');
  return response.data;
};

// QRZ API
export const fetchQRZLookup = async (callsign) => {
  const response = await api.get('/api/v1/qrz/lookup', {
    params: { callsign },
  });
  return response.data;
};

export const fetchQRZStatus = async () => {
  const response = await api.get('/api/v1/qrz/status');
  return response.data;
};

export const fetchQRZSetCredentials = async (username, password) => {
  const response = await api.post('/api/v1/qrz/set-credentials', null, {
    params: { username, password },
  });
  return response.data;
};

// Generic Callsign Lookup API (uses configured service: RadioID or QRZ)
export const fetchCallsignLookup = async (callsign) => {
  const response = await api.post(`/api/v1/settings/lookup-callsign/${callsign}`);
  return response.data;
};

// On The Air Activations API
export const fetchAllActivations = async () => {
  const response = await api.get('/api/v1/activations/all');
  return response.data;
};

export const fetchSOTAActivations = async () => {
  const response = await api.get('/api/v1/activations/sota');
  return response.data;
};

export const fetchPOTAActivations = async () => {
  const response = await api.get('/api/v1/activations/pota');
  return response.data;
};

export const fetchDemoActivations = async () => {
  const response = await api.get('/api/v1/activations/demo');
  return response.data;
};

// Fetch all activations, fallback to demo if none available
export const fetchAllActivationsWithFallback = async () => {
  try {
    const data = await fetchAllActivations();
    // If no real activations, try demo data
    if (!data.activations || data.activations.length === 0) {
      console.log('No live activations found, using demo data');
      return await fetchDemoActivations();
    }
    return data;
  } catch (error) {
    console.error('Error fetching activations, trying demo:', error);
    try {
      return await fetchDemoActivations();
    } catch (demoError) {
      console.error('Demo fetch also failed:', demoError);
      return { activations: [], count: 0 };
    }
  }
};

// GPS API
export const connectGPS = async (host = 'localhost', port = 2947) => {
  const response = await api.post('/api/v1/gps/connect', null, {
    params: { host, port },
  });
  return response.data;
};

export const disconnectGPS = async () => {
  const response = await api.post('/api/v1/gps/disconnect');
  return response.data;
};

export const getGPSPosition = async () => {
  try {
    const response = await api.get('/api/v1/gps/position');
    return response.data;
  } catch (error) {
    console.error('GPS position error:', error);
    throw error;
  }
};

export const getGPSStatus = async () => {
  try {
    const response = await api.get('/api/v1/gps/status');
    return response.data;
  } catch (error) {
    console.error('GPS status error:', error);
    throw error;
  }
};

export const enableGPS = async () => {
  const response = await api.post('/api/v1/gps/enable');
  return response.data;
};

export const disableGPS = async () => {
  const response = await api.post('/api/v1/gps/disable');
  return response.data;
};

export const getDemoGPSPosition = async () => {
  const response = await api.get('/api/v1/gps/demo');
  return response.data;
};

// CAT (Radio) Control API
export const getAvailableCATPorts = async () => {
  try {
    const response = await api.get('/api/v1/cat/ports');
    return response.data;
  } catch (error) {
    console.error('CAT ports error:', error);
    throw error;
  }
};

export const connectCAT = async (port, radioModel = 'kenwood', baudrate = 9600) => {
  try {
    const response = await api.post('/api/v1/cat/connect', null, {
      params: { port, radio_model: radioModel, baudrate },
    });
    return response.data;
  } catch (error) {
    console.error('CAT connect error:', error);
    throw error;
  }
};

export const disconnectCAT = async () => {
  try {
    const response = await api.post('/api/v1/cat/disconnect');
    return response.data;
  } catch (error) {
    console.error('CAT disconnect error:', error);
    throw error;
  }
};

export const getCATStatus = async () => {
  try {
    const response = await api.get('/api/v1/cat/status');
    return response.data;
  } catch (error) {
    console.error('CAT status error:', error);
    throw error;
  }
};

export const getCATFrequency = async () => {
  try {
    const response = await api.get('/api/v1/cat/frequency');
    return response.data;
  } catch (error) {
    console.error('CAT frequency error:', error);
    throw error;
  }
};

export const setCATFrequency = async (frequencyHz) => {
  try {
    const response = await api.post('/api/v1/cat/frequency', null, {
      params: { frequency_hz: frequencyHz },
    });
    return response.data;
  } catch (error) {
    console.error('CAT frequency set error:', error);
    throw error;
  }
};

export const getCATMode = async () => {
  try {
    const response = await api.get('/api/v1/cat/mode');
    return response.data;
  } catch (error) {
    console.error('CAT mode error:', error);
    throw error;
  }
};

export const setCATMode = async (mode) => {
  try {
    const response = await api.post('/api/v1/cat/mode', null, {
      params: { mode },
    });
    return response.data;
  } catch (error) {
    console.error('CAT mode set error:', error);
    throw error;
  }
};

export const getCATpower = async () => {
  try {
    const response = await api.get('/api/v1/cat/power');
    return response.data;
  } catch (error) {
    console.error('CAT power error:', error);
    throw error;
  }
};

export const setCATpower = async (power) => {
  try {
    const response = await api.post('/api/v1/cat/power', null, {
      params: { power },
    });
    return response.data;
  } catch (error) {
    console.error('CAT power set error:', error);
    throw error;
  }
};

export const getHamBands = async () => {
  try {
    const response = await api.get('/api/v1/cat/bands');
    return response.data;
  } catch (error) {
    console.error('Ham bands error:', error);
    throw error;
  }
};

// Gimbal (Antenna Tracking) API
export const calculatePointing = async (satelliteName, observerLat, observerLon, observerAlt = 0) => {
  try {
    const response = await api.get('/api/v1/gimbal/calculate', {
      params: {
        satellite_name: satelliteName,
        observer_lat: observerLat,
        observer_lon: observerLon,
        observer_alt: observerAlt,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Gimbal calculate error:', error);
    throw error;
  }
};

export const startTracking = async (satelliteName, rotatorType = 'yaesu') => {
  try {
    const response = await api.post('/api/v1/gimbal/track/start', null, {
      params: { satellite_name: satelliteName, rotator_type: rotatorType },
    });
    return response.data;
  } catch (error) {
    console.error('Gimbal start tracking error:', error);
    throw error;
  }
};

export const stopTracking = async () => {
  try {
    const response = await api.post('/api/v1/gimbal/track/stop');
    return response.data;
  } catch (error) {
    console.error('Gimbal stop tracking error:', error);
    throw error;
  }
};

export const getTrackingStatus = async () => {
  try {
    const response = await api.get('/api/v1/gimbal/track/status');
    return response.data;
  } catch (error) {
    console.error('Gimbal tracking status error:', error);
    throw error;
  }
};

export const getNextPeak = async (satelliteName, observerLat, observerLon, days = 7) => {
  try {
    const response = await api.get(`/api/v1/gimbal/satellite/${satelliteName}/next-peak`, {
      params: {
        observer_lat: observerLat,
        observer_lon: observerLon,
        days,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Gimbal next peak error:', error);
    throw error;
  }
};

export const getVisibleSatellites = async (observerLat, observerLon, observerAlt = 0, minElevation = 0) => {
  try {
    const response = await api.get('/api/v1/gimbal/visible-satellites', {
      params: {
        observer_lat: observerLat,
        observer_lon: observerLon,
        observer_alt: observerAlt,
        min_elevation: minElevation,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Gimbal visible satellites error:', error);
    throw error;
  }
};

// ADIF Log API
export const uploadADIFLog = async (file, logName = 'main') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', logName);
    
    const response = await api.post('/api/v1/adif/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('ADIF upload error:', error);
    throw error;
  }
};

export const fetchADIFQSOs = async (logName = 'main', limit = 100, band = null, mode = null) => {
  try {
    const response = await api.get('/api/v1/adif/qsos', {
      params: { name: logName, limit, band, mode },
    });
    return response.data;
  } catch (error) {
    console.error('ADIF QSOs fetch error:', error);
    throw error;
  }
};

export const fetchWorkedGrids = async (logName = 'main') => {
  try {
    const response = await api.get('/api/v1/adif/grids', {
      params: { name: logName },
    });
    return response.data;
  } catch (error) {
    console.error('Worked grids fetch error:', error);
    throw error;
  }
};

export const fetchWorkedCountries = async (logName = 'main') => {
  try {
    const response = await api.get('/api/v1/adif/countries', {
      params: { name: logName },
    });
    return response.data;
  } catch (error) {
    console.error('Worked countries fetch error:', error);
    throw error;
  }
};

export const fetchADIFStatistics = async (logName = 'main') => {
  try {
    const response = await api.get('/api/v1/adif/statistics', {
      params: { name: logName },
    });
    return response.data;
  } catch (error) {
    console.error('ADIF statistics fetch error:', error);
    throw error;
  }
};

export const searchADIFQSOs = async (callsign, logName = 'main') => {
  try {
    const response = await api.get('/api/v1/adif/search', {
      params: { call: callsign, name: logName },
    });
    return response.data;
  } catch (error) {
    console.error('ADIF search error:', error);
    throw error;
  }
};

export default api;
