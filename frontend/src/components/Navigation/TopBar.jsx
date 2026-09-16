import React from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { BRANDING } from '../../config/branding';

const TopBar = () => {
  const location = useLocation();
  const { scenarioId } = useParams();

  // If we are in a scenario, determine the active scenario name
  // Note: we can parse scenarioId from location.pathname if useParams doesn't catch it outside Routes
  const match = location.pathname.match(/\/scenario\/(\d+)/);
  const activeScenarioId = match ? parseInt(match[1]) : null;
  
  const activeScenario = BRANDING.scenarios.find(s => s.id === activeScenarioId);

  const handleRefresh = () => {
    window.location.reload();
  };

  const barStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    zIndex: 2000, // Above leaflet map
    fontFamily: 'sans-serif'
  };

  const logoStyle = {
    fontWeight: 'bold',
    fontSize: '1.25rem',
    color: '#f97316',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const navContainerStyle = {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  };

  const getLinkStyle = ({ isActive }) => ({
    color: isActive ? '#f97316' : '#f8fafc',
    textDecoration: 'none',
    fontWeight: isActive ? 'bold' : 'normal',
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  });

  const rightSideStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  };

  const badgeStyle = {
    backgroundColor: '#1e293b',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    color: '#94a3b8',
    border: '1px solid #334155'
  };

  const refreshBtnStyle = {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#f8fafc',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  return (
    <div style={barStyle}>
      <NavLink to="/" style={logoStyle}>
        <span style={{ fontSize: '1.5rem' }}>🚨</span> {BRANDING.productName}
      </NavLink>

      <div style={navContainerStyle}>
        <NavLink to="/scenarios" style={getLinkStyle}>Scenarios</NavLink>
        {activeScenarioId && (
          <>
            <NavLink to={`/scenario/${activeScenarioId}/dashboard`} style={getLinkStyle}>Dashboard</NavLink>
            <NavLink to={`/scenario/${activeScenarioId}/map`} style={getLinkStyle}>Operations Map</NavLink>
            <NavLink to={`/scenario/${activeScenarioId}/reports`} style={getLinkStyle}>Reports</NavLink>
          </>
        )}
        <NavLink to="/research" style={getLinkStyle}>Research</NavLink>
      </div>

      <div style={rightSideStyle}>
        {activeScenario && (
          <div style={badgeStyle}>
            Active: <strong>{activeScenario.name}</strong>
          </div>
        )}
        <button style={refreshBtnStyle} onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default TopBar;
