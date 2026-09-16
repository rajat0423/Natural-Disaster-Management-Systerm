/**
 * ============================================================
 * App.jsx — Disaster Management Platform Root Navigation Shell
 * ============================================================
 */

import { useState } from 'react';
import { BRANDING } from './config/branding';
import LandingOverview from './pages/LandingOverview';
import DisasterMap from './pages/DisasterMap';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ResearchMetrics from './pages/ResearchMetrics';
import SystemHealth from './pages/SystemHealth';

function App() {
  const [currentPage, setCurrentPage] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Incident Overview' },
    { id: 'map', label: 'Operations Map' },
    { id: 'dashboard', label: 'Executive Dashboard' },
    { id: 'metrics', label: 'Research & Benchmarks' },
    { id: 'health', label: 'System Diagnostics' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Professional Command Navigation Bar */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1e293b',
        zIndex: 1000
      }}>
        {/* Brand & Mode Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => setCurrentPage('overview')}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#38bdf8' }}></span>
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.2px', color: '#ffffff' }}>
              {BRANDING.PRODUCT_NAME}
            </span>
          </div>
          <span style={{
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '3px',
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            fontWeight: 700,
            letterSpacing: '0.04em',
            border: '1px solid #334155'
          }}>
            {BRANDING.SCENARIO_BADGE}
          </span>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', gap: '4px' }}>
          {navItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isActive ? '#1e293b' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
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
