/**
 * ============================================================
 * App.jsx — Disaster Management Platform Root Application
 * ============================================================
 */

import { useState } from 'react';
import LandingOverview from './pages/LandingOverview';
import DisasterMap from './pages/DisasterMap';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ResearchMetrics from './pages/ResearchMetrics';
import SystemHealth from './pages/SystemHealth';

function App() {
  const [currentPage, setCurrentPage] = useState('overview');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Professional Command Navigation Bar */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setCurrentPage('overview')}>
            <span style={{ fontSize: '18px' }}>🛰️</span>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
              Disaster Intelligence Command
            </span>
          </div>
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            fontWeight: 700,
            border: '1px solid #334155'
          }}>
            DECISION-SUPPORT
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setCurrentPage('overview')}
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: currentPage === 'overview' ? '#1e293b' : 'transparent',
              color: currentPage === 'overview' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            🏠 Incident Overview
          </button>

          <button
            onClick={() => setCurrentPage('map')}
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: currentPage === 'map' ? '#1e293b' : 'transparent',
              color: currentPage === 'map' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            🗺️ Operations Map & Routing
          </button>

          <button
            onClick={() => setCurrentPage('dashboard')}
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: currentPage === 'dashboard' ? '#1e293b' : 'transparent',
              color: currentPage === 'dashboard' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            📊 Executive Dashboard
          </button>

          <button
            onClick={() => setCurrentPage('metrics')}
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: currentPage === 'metrics' ? '#1e293b' : 'transparent',
              color: currentPage === 'metrics' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            🔬 AI Model Evaluation
          </button>

          <button
            onClick={() => setCurrentPage('health')}
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: currentPage === 'health' ? '#1e293b' : 'transparent',
              color: currentPage === 'health' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            ⚙️ System Diagnostics
          </button>
        </nav>
      </header>

      {/* Main Screen Body */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'overview' && <LandingOverview onNavigate={setCurrentPage} />}
        {currentPage === 'map' && <DisasterMap />}
        {currentPage === 'dashboard' && <ExecutiveDashboard />}
        {currentPage === 'metrics' && <ResearchMetrics />}
        {currentPage === 'health' && <SystemHealth />}
      </main>

    </div>
  );
}

export default App;
