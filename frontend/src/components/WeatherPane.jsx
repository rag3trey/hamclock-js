import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './WeatherPane.css';

const WeatherPane = ({ latitude = 40.7128, longitude = -74.0060, temperatureUnit = 'celsius' }) => {
  const [location, setLocation] = useState({ lat: latitude, lon: longitude });
  const [unit, setUnit] = useState('metric'); // metric or imperial

  // Temperature conversion helper
  const convertTemperature = (celsius) => {
    if (temperatureUnit === 'fahrenheit') {
      return Math.round((celsius * 9/5) + 32);
    } else if (temperatureUnit === 'kelvin') {
      return Math.round(celsius + 273.15);
    }
    return Math.round(celsius);
  };

  const getTemperatureSymbol = () => {
    switch(temperatureUnit) {
      case 'fahrenheit': return '°F';
      case 'kelvin': return 'K';
      default: return '°C';
    }
  };

  // Fetch current weather
  const { data: currentData, isLoading: currentLoading, error: currentError } = useQuery({
    queryKey: ['weather-current', location.lat, location.lon],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:8080/api/v1/weather/current`, {
        params: { lat: location.lat, lon: location.lon }
      });
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 60 * 1000
  });

  // Fetch forecast
  const { data: forecastData, isLoading: forecastLoading, error: forecastError } = useQuery({
    queryKey: ['weather-forecast', location.lat, location.lon],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:8080/api/v1/weather/forecast`, {
        params: { lat: location.lat, lon: location.lon }
      });
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000
  });

  // Update location when props change
  useEffect(() => {
    if (latitude && longitude) {
      setLocation({ lat: latitude, lon: longitude });
    }
  }, [latitude, longitude]);

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getWeatherIcon = (description) => {
    const desc = description?.toLowerCase() || '';
    if (desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain')) return '🌧️';
    if (desc.includes('storm') || desc.includes('thunder')) return '⛈️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('mist') || desc.includes('fog')) return '🌫️';
    return '🌤️';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (currentLoading || forecastLoading) {
    return (
      <div className="weather-pane loading">
        <div className="loading-spinner">Loading weather data...</div>
      </div>
    );
  }

  if (currentError || forecastError) {
    return (
      <div className="weather-pane error">
        <div className="error-message">Failed to load weather data</div>
      </div>
    );
  }

  // Get next 24 hours of forecast (8 intervals of 3 hours)
  const shortForecast = forecastData?.forecasts?.slice(0, 8) || [];

  return (
    <div className="weather-pane">
      {/* Current Weather */}
      {currentData && (
        <div className="weather-current">
          <div className="current-header">
            <div className="location-info">
              <span className="location-name">{currentData.location}</span>
              {currentData.country && <span className="country-code">{currentData.country}</span>}
            </div>
            <div className="weather-icon">{getWeatherIcon(currentData.description)}</div>
          </div>

          <div className="current-main">
            <div className="temperature-display">
              <span className="temp-value">{Math.round(convertTemperature(currentData.temperature))}°</span>
              <span className="temp-unit">{getTemperatureSymbol()}</span>
            </div>
            <div className="weather-description">
              <div className="main-desc">{currentData.description}</div>
              <div className="detail-desc">{currentData.detail}</div>
              <div className="feels-like">Feels like {Math.round(convertTemperature(currentData.feels_like))}°{getTemperatureSymbol()}</div>
            </div>
          </div>

          <div className="weather-details">
            <div className="detail-item">
              <span className="detail-icon">💨</span>
              <span className="detail-label">Wind</span>
              <span className="detail-value">
                {currentData.wind_speed} m/s {getWindDirection(currentData.wind_direction)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">💧</span>
              <span className="detail-label">Humidity</span>
              <span className="detail-value">{currentData.humidity}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">🌡️</span>
              <span className="detail-label">Pressure</span>
              <span className="detail-value">{currentData.pressure} hPa</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">👁️</span>
              <span className="detail-label">Visibility</span>
              <span className="detail-value">{(currentData.visibility / 1000).toFixed(1)} km</span>
            </div>
          </div>
        </div>
      )}

      {/* Forecast */}
      {shortForecast.length > 0 && (
        <div className="weather-forecast">
          <div className="forecast-header">
            <h3>24-Hour Forecast</h3>
          </div>
          <div className="forecast-items">
            {shortForecast.map((item, index) => (
              <div key={index} className="forecast-item">
                <div className="forecast-time">{formatTime(item.timestamp)}</div>
                <div className="forecast-icon">{getWeatherIcon(item.description)}</div>
                <div className="forecast-temp">{Math.round(convertTemperature(item.temperature))}°</div>
                <div className="forecast-wind">
                  💨 {item.wind_speed} m/s
                </div>
                {item.rain_probability > 0 && (
                  <div className="forecast-rain">
                    💧 {Math.round(item.rain_probability)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Propagation Impact */}
      {currentData && (
        <div className="weather-propagation">
          <div className="prop-header">
            <h3>🛰️ Propagation Conditions</h3>
          </div>
          <div className="prop-content">
            <div className="prop-item">
              <span className="prop-label">Atmospheric Pressure:</span>
              <span className={`prop-status ${currentData.pressure > 1015 ? 'good' : 'fair'}`}>
                {currentData.pressure > 1020 ? 'Excellent' : currentData.pressure > 1015 ? 'Good' : 'Fair'}
              </span>
            </div>
            <div className="prop-item">
              <span className="prop-label">Humidity Impact:</span>
              <span className={`prop-status ${currentData.humidity < 70 ? 'good' : 'fair'}`}>
                {currentData.humidity < 70 ? 'Minimal' : 'Moderate'}
              </span>
            </div>
            <div className="prop-item">
              <span className="prop-label">Weather Conditions:</span>
              <span className={`prop-status ${currentData.cloudiness < 50 ? 'good' : 'fair'}`}>
                {currentData.cloudiness < 30 ? 'Clear - Excellent' : currentData.cloudiness < 70 ? 'Partly Cloudy - Good' : 'Overcast - Fair'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherPane;
