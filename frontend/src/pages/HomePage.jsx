import React, { useState, useEffect } from 'react';
import WorldMap from '../components/WorldMap';
import SunMoonInfo from '../components/SunMoonInfo';
import SunMoonTimes from '../components/SunMoonTimes';
import SpaceWeatherPane from '../components/SpaceWeatherPane';
import SolarFluxTrend from '../components/SolarFluxTrend';
import BandConditionsPane from '../components/BandConditionsPane';
import NCDXFBeaconsPane from '../components/NCDXFBeaconsPane';
import PSKReporterPane from '../components/PSKReporterPane';
import DXClusterPane from '../components/DXClusterPane';
import ActivationPane from '../components/ActivationPane';
import ContestsPane from '../components/ContestsPane';
import SatellitesPane from '../components/SatellitesPane';
import GPSStatus from '../components/GPSStatus';
import CATStatus from '../components/CATStatus';
import GimbalStatus from '../components/GimbalStatus';
import ClockDisplay from '../components/ClockDisplay';
import LocationSelector from '../components/LocationSelector';
import MaidenheadDisplay from '../components/MaidenheadDisplay';
import GreatCircleInfo from '../components/GreatCircleInfo';
import SettingsModal from '../components/SettingsModal';
import { getSpotterLocation } from '../api/spotterLocations';
import { fetchCallsignLookup, fetchAllActivationsWithFallback, fetchAllVisibleSatellites, fetchGetSettings } from '../api';
import { getVisiblePanels } from '../utils/panelManager';
import './HomePage.css';

const HomePage = () => {
  const [deLocation, setDeLocation] = useState(null);
  const [dxSpots, setDxSpots] = useState([]);
  const [activations, setActivations] = useState([]);
  const [satelliteData, setSatelliteData] = useState(null);
  const [autoZoomToDX, setAutoZoomToDX] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gettingLocation, setGettingLocation] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [timeFormat, setTimeFormat] = useState('24h'); // '12h' or '24h'
  const [units, setUnits] = useState('imperial'); // 'metric' or 'imperial'
  const [visiblePanels, setVisiblePanels] = useState(getVisiblePanels());
  
  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    // Listen for custom event when panels are toggled
    const handlePanelsChanged = (e) => {
      setVisiblePanels(e.detail);
    };
    // Also listen for storage changes (for other tabs)
    const handleStorageChange = () => {
      setVisiblePanels(getVisiblePanels());
    };
    window.addEventListener('panelsChanged', handlePanelsChanged);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('panelsChanged', handlePanelsChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const loadSettings = async () => {
    try {
      const settings = await fetchGetSettings();
      // Apply theme to document
      if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
      }
      // Apply time format
      if (settings.time_format) {
        setTimeFormat(settings.time_format);
      }
      // Apply units
      if (settings.units) {
        setUnits(settings.units);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };
  
  // Collapsible panel states
  const [collapsedPanels, setCollapsedPanels] = useState({
    sunmoon: false,
    sunmoontimes: false,
    bandconditions: false,
    ncdxf: false,
    pskreporter: false,
    spaceweather: false,
    trend: false,
    dxcluster: false,
    activations: false,
    contests: false,
    satellites: false
  });
  
  const [dxSpotMarker, setDxSpotMarker] = useState(null);
  
  const togglePanel = (panelName) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  };
  
  // Request location on mount
  useEffect(() => {
    const requestLocation = () => {
      if (!navigator.geolocation) {
        // Fallback to default if geolocation not available
        setDeLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          name: 'San Francisco, CA'
        });
        return;
      }
      
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'My Location'
          });
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to default
          setDeLocation({
            latitude: 37.7749,
            longitude: -122.4194,
            name: 'San Francisco, CA'
          });
          setGettingLocation(false);
        }
      );
    };
    
    requestLocation();
  }, []);
  
  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Fetch activations on mount and periodically (every 5 minutes)
  useEffect(() => {
    const fetchActivations = async () => {
      try {
        const data = await fetchAllActivationsWithFallback();
        if (data && data.activations) {
          setActivations(data.activations);
        }
      } catch (error) {
        console.error('Error fetching activations:', error);
      }
    };
    
    fetchActivations();
    const interval = setInterval(fetchActivations, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch satellite data
  useEffect(() => {
    const fetchSatellites = async () => {
      try {
        if (!deLocation) return;
        const data = await fetchAllVisibleSatellites(deLocation.latitude, deLocation.longitude, 0);
        if (data) {
          console.log('Satellite data fetched:', data);
          setSatelliteData(data);
        }
      } catch (error) {
        console.error('Error fetching satellites:', error);
      }
    };
    
    fetchSatellites();
    const interval = setInterval(fetchSatellites, 60000); // 60 seconds (increased from 30s to reduce API hammering)
    
    return () => clearInterval(interval);
  }, [deLocation]);
  
  // Manual location request
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: 'My Location'
        });
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check browser permissions.');
        setGettingLocation(false);
      }
    );
  };

  // Handle GPS location updates
  const handleGPSLocationUpdate = (gpsLocation) => {
    if (gpsLocation && gpsLocation.latitude && gpsLocation.longitude) {
      setDeLocation({
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        name: 'GPS Location',
        source: 'gps'
      });
      console.log('GPS location updated:', gpsLocation);
    }
  };
  
  // Handle spot click - lookup callsign and add to visible spots, then zoom
  const handleSpotClick = async (spot) => {
    try {
      // Look up the DX callsign to get location
      const data = await fetchCallsignLookup(spot.callsign);
      
      if (data && data.latitude !== undefined && data.longitude !== undefined) {
        // Add DX spot with the looked up coordinates
        const newSpot = {
          ...spot,
          latitude: data.latitude,
          longitude: data.longitude,
          name: `${spot.callsign} - ${spot.frequency}kHz ${spot.band}`,
          fromLookup: true
        };
        setDxSpots(prev => [newSpot, ...prev.filter(s => s.callsign !== spot.callsign)]);
        setAutoZoomToDX(true);
      } else {
        // Fallback: use spotter location if callsign lookup fails
        const spotterLoc = getSpotterLocation(spot.spotter);
        const newSpot = {
          ...spot,
          latitude: spotterLoc.lat,
          longitude: spotterLoc.lng,
          name: `${spot.spotter} (${spotterLoc.region}) - ${spot.callsign} ${spot.frequency}kHz`,
          fromLookup: false
        };
        setDxSpots(prev => [newSpot, ...prev.filter(s => s.callsign !== spot.callsign)]);
        setAutoZoomToDX(true);
      }
    } catch (error) {
      console.error('Error looking up callsign:', error);
      // Fallback to spotter location
      const spotterLoc = getSpotterLocation(spot.spotter);
      const newSpot = {
        ...spot,
        latitude: spotterLoc.lat,
        longitude: spotterLoc.lng,
        name: `${spot.spotter} (${spotterLoc.region}) - ${spot.callsign} ${spot.frequency}kHz`,
        fromLookup: false
      };
      setDxSpots(prev => [newSpot, ...prev.filter(s => s.callsign !== spot.callsign)]);
      setAutoZoomToDX(true);
    }
  };
  
  return (
    <div className="home-page">
      <div className="main-grid">
        {/* Top info bar */}
        <div className="info-bar">
          <ClockDisplay time={currentTime} format={timeFormat} />
          {deLocation ? (
            <>
              <LocationSelector
                label="DE Location"
                location={deLocation}
                onLocationChange={setDeLocation}
              />
              <MaidenheadDisplay
                latitude={deLocation.latitude}
                longitude={deLocation.longitude}
                label="My Grid"
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={getUserLocation}
                  disabled={gettingLocation}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: gettingLocation ? 'wait' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {gettingLocation ? 'Getting Location...' : 'Update Location'}
                </button>
                <button 
                  onClick={() => setSettingsOpen(true)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ⚙️ Settings
                </button>
              </div>
              {dxSpots && dxSpots.length > 0 && (
                <>
                  <LocationSelector
                    label="DX Location"
                    location={{
                      latitude: dxSpots[0].latitude,
                      longitude: dxSpots[0].longitude,
                      name: dxSpots[0].name || dxSpots[0].callsign
                    }}
                    onLocationChange={(loc) => {
                      const updatedSpot = { ...dxSpots[0], latitude: loc.latitude, longitude: loc.longitude, name: loc.name };
                      setDxSpots([updatedSpot, ...dxSpots.slice(1)]);
                    }}
                  />
                  <MaidenheadDisplay
                    latitude={dxSpots[0].latitude}
                    longitude={dxSpots[0].longitude}
                    label="DX Grid"
                  />
                  <GreatCircleInfo
                    deLocation={deLocation}
                    dxSpot={dxSpots[0]}
                    distanceUnits={units === 'imperial' ? 'miles' : 'km'}
                  />
                </>
              )}
            </>
          ) : (
            <div style={{ color: '#888', fontSize: '14px' }}>
              {gettingLocation ? 'Getting your location...' : 'Allow location access to get started'}
            </div>
          )}
        </div>
        
        {/* Main map area */}
        <div className="map-container">
          {deLocation ? (
            <WorldMap
              deLocation={deLocation}
              dxSpots={dxSpots}
              activations={activations}
              satellites={satelliteData?.visible_positions || []}
              autoZoomToDX={autoZoomToDX}
              onZoomComplete={() => setAutoZoomToDX(false)}
              onMapClick={(lat, lng) => {
                const newSpot = { latitude: lat, longitude: lng, name: 'DX', callsign: 'MANUAL' };
                setDxSpots(prev => [newSpot, ...prev]);
              }}
              onClearDX={() => setDxSpots([])}
              visiblePanels={visiblePanels}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: '#666',
              fontSize: '16px'
            }}>
              Waiting for location...
            </div>
          )}
        </div>
        
        {/* Side panels */}
        <div className="side-panels">
          {/* GPS Status */}
          <div className="panel gps-panel">
            <GPSStatus onLocationUpdate={handleGPSLocationUpdate} units={units} />
          </div>

          {/* CAT (Radio) Control */}
          <div className="panel cat-panel">
            <CATStatus />
          </div>

          {/* Gimbal (Antenna Tracking) */}
          {deLocation && (
            <div className="panel gimbal-panel">
              <GimbalStatus currentSatellite={selectedSatellite} deLocation={deLocation} />
            </div>
          )}

          {deLocation && (
            <>
              {visiblePanels.sunmoon && (
              <div className={`panel ${collapsedPanels.sunmoon ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>Sun & Moon</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('sunmoon')}
                    title={collapsedPanels.sunmoon ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.sunmoon ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.sunmoon && (
                  <SunMoonInfo
                    latitude={deLocation.latitude}
                    longitude={deLocation.longitude}
                  />
                )}
              </div>
              )}

              {visiblePanels.sunmoontimes && (
              <div className={`panel sun-moon-times-panel ${collapsedPanels.sunmoontimes ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>Sun & Moon Times</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('sunmoontimes')}
                    title={collapsedPanels.sunmoontimes ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.sunmoontimes ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.sunmoontimes && deLocation && (
                  <SunMoonTimes
                    deLocation={deLocation}
                    units={units}
                  />
                )}
              </div>
              )}
              
              {visiblePanels.bandconditions && (
              <div className={`panel band-conditions-panel ${collapsedPanels.bandconditions ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>Band Conditions</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('bandconditions')}
                    title={collapsedPanels.bandconditions ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.bandconditions ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.bandconditions && (
                  <BandConditionsPane />
                )}
              </div>
              )}
              
              {visiblePanels.ncdxf && (
              <div className={`panel ${collapsedPanels.ncdxf ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>NCDXF Beacons</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('ncdxf')}
                    title={collapsedPanels.ncdxf ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.ncdxf ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.ncdxf && (
                  <NCDXFBeaconsPane 
                    latitude={deLocation.latitude}
                    longitude={deLocation.longitude}
                  />
                )}
              </div>
              )}
              
              {visiblePanels.pskreporter && (
              <div className={`panel ${collapsedPanels.pskreporter ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>PSK Reporter</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('pskreporter')}
                    title={collapsedPanels.pskreporter ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.pskreporter ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.pskreporter && (
                  <PSKReporterPane 
                    latitude={deLocation.latitude}
                    longitude={deLocation.longitude}
                    units={units}
                  />
                )}
              </div>
              )}
              
              {visiblePanels.spaceweather && (
              <div className={`panel ${collapsedPanels.spaceweather ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>Space Weather</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('spaceweather')}
                    title={collapsedPanels.spaceweather ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.spaceweather ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.spaceweather && (
                  <SpaceWeatherPane />
                )}
              </div>
              )}

              {visiblePanels.trend && (
              <div className={`panel trend-panel ${collapsedPanels.trend ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>Solar Flux Trend</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('trend')}
                    title={collapsedPanels.trend ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.trend ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.trend && (
                  <SolarFluxTrend />
                )}
              </div>
              )}
              
              {visiblePanels.dxcluster && (
              <div className={`panel dx-panel ${collapsedPanels.dxcluster ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>DX Cluster</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('dxcluster')}
                    title={collapsedPanels.dxcluster ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.dxcluster ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.dxcluster && (
                  <DXClusterPane 
                    onSpotClick={handleSpotClick}
                    deLocation={deLocation}
                    units={units}
                  />
                )}
              </div>
              )}
              
              {visiblePanels.activations && (
              <div className={`panel ${collapsedPanels.activations ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>On The Air</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('activations')}
                    title={collapsedPanels.activations ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.activations ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.activations && (
                  <ActivationPane 
                    activations={activations}
                  />
                )}
              </div>
              )}

              {visiblePanels.contests && (
              <div className={`panel ${collapsedPanels.contests ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>Contests</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('contests')}
                    title={collapsedPanels.contests ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.contests ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.contests && (
                  <ContestsPane />
                )}
              </div>
              )}

              {visiblePanels.satellites && (
              <div className={`panel ${collapsedPanels.satellites ? 'collapsed' : ''}`}>
                <div className="panel-header">
                  <h3>Satellites</h3>
                  <button 
                    className="collapse-btn"
                    onClick={() => togglePanel('satellites')}
                    title={collapsedPanels.satellites ? 'Expand' : 'Collapse'}
                  >
                    {collapsedPanels.satellites ? '▶' : '▼'}
                  </button>
                </div>
                {!collapsedPanels.satellites && (
                  <SatellitesPane 
                    deLocation={deLocation}
                    satelliteData={satelliteData}
                    onSatelliteSelect={setSelectedSatellite}
                    units={units}
                  />
                )}
              </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => {
          setSettingsOpen(false);
          loadSettings(); // Reload settings when modal closes
        }} 
      />
    </div>
  );
};

export default HomePage;
