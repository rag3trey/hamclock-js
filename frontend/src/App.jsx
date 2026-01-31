import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import SatellitePage from './pages/SatellitePage';
import { fetchGetCallsign } from './api';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [callsign, setCallsign] = useState(null);

  useEffect(() => {
    const loadCallsign = async () => {
      try {
        const data = await fetchGetCallsign();
        if (data && data.callsign) setCallsign(data.callsign);
      } catch (err) {
        console.log('No callsign set');
      }
    };
    loadCallsign();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <header className="app-header">
            <div className="container">
              <div className="header-content">
                <h1 className="app-title">
                  <span className="title-icon">📡</span>
                  HamClock
                  {callsign && <span className="callsign-badge">{callsign}</span>}
                </h1>
                <nav className="main-nav">
                  <Link to="/" className="nav-link">Home</Link>
                  <Link to="/satellite" className="nav-link">Satellites</Link>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/satellite" element={<SatellitePage />} />
            </Routes>
          </main>
          
          <footer className="app-footer">
            <div className="container">
              <p>HamClock v2.0 | Amateur Radio Clock & Information Display</p>
            </div>
          </footer>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
