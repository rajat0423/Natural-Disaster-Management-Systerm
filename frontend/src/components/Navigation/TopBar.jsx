import React from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { BRANDING } from '../../config/branding';
import { useTheme } from '../../context/ThemeContext';

const TopBar = () => {
  const location = useLocation();
  const { scenarioId } = useParams();
  const { theme, toggleTheme, isDark, tokens } = useTheme();

  // If we are in a scenario, determine the active scenario name
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
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: tokens.textPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.08)',
    borderBottom: `1px solid ${tokens.border}`,
    zIndex: 2000,
    fontFamily: 'sans-serif',
    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s'
  };

  const logoStyle = {
    fontWeight: 'bold',
    fontSize: '1.25rem',
    color: tokens.accent,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const navContainerStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  };

  const getLinkStyle = ({ isActive }) => ({
    color: isActive ? tokens.accent : tokens.textSecondary,
    backgroundColor: isActive ? tokens.accentSubtle : 'transparent',
    textDecoration: 'none',
    fontWeight: isActive ? '700' : '500',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    transition: 'all 0.15s ease',
  });

  const rightSideStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const badgeStyle = {
    backgroundColor: tokens.bgTertiary,
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.82rem',
    color: tokens.textSecondary,
    border: `1px solid ${tokens.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  };

  const btnStyle = {
    background: tokens.bgTertiary,
    border: `1px solid ${tokens.border}`,
    color: tokens.textPrimary,
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s ease'
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
            <span>Active:</span> <strong style={{ color: tokens.textPrimary }}>{activeScenario.name}</strong>
          </div>
        )}
        
        {/* Theme Toggle Button */}
        <button
          style={btnStyle}
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {isDark ? '☀ Light' : '🌙 Dark'}
        </button>

        <button style={btnStyle} onClick={handleRefresh} title="Refresh Data">
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default TopBar;
