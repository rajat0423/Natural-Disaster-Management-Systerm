import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { BRANDING } from '../../config/branding';
import { useTheme } from '../../context/ThemeContext';

const Breadcrumb = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, tokens } = useTheme();

  // Don't show breadcrumbs on the landing page
  if (location.pathname === '/') return null;

  const pathnames = location.pathname.split('/').filter(x => x);

  const containerStyle = {
    position: 'fixed',
    top: '56px', // Below TopBar
    left: 0,
    right: 0,
    height: '40px',
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    color: tokens.textSecondary,
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    zIndex: 1900,
    fontFamily: 'sans-serif',
    fontSize: '0.85rem',
    borderBottom: `1px solid ${tokens.border}`,
    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s'
  };

  const backButtonStyle = {
    background: isDark ? '#334155' : '#e2e8f0',
    border: `1px solid ${tokens.border}`,
    color: tokens.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginRight: '16px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.82rem',
    fontWeight: '600'
  };

  const linkStyle = {
    color: isDark ? '#60a5fa' : '#2563eb',
    textDecoration: 'none',
    fontWeight: '500'
  };

  const textStyle = {
    color: tokens.textPrimary,
    fontWeight: '600'
  };

  const separatorStyle = {
    margin: '0 8px',
    color: tokens.textMuted
  };

  const getBreadcrumbName = (path, index, paths) => {
    if (path === 'scenario' && paths[index + 1]) {
      return 'Scenarios';
    }
    // If it's an ID
    if (!isNaN(path)) {
      const scenario = BRANDING.scenarios.find(s => s.id === parseInt(path));
      return scenario ? scenario.name : `Scenario ${path}`;
    }
    // Capitalize normally
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div style={containerStyle}>
      <button style={backButtonStyle} onClick={() => navigate(-1)}>
        ⬅ Back
      </button>

      <Link to="/" style={linkStyle}>Home</Link>
      
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        
        // Skip 'scenario' if it's followed by an ID to avoid redundant breadcrumbs (or map them cleanly)
        if (value === 'scenario') return null;

        return (
          <React.Fragment key={to}>
            <span style={separatorStyle}>›</span>
            {isLast ? (
              <span style={textStyle}>{getBreadcrumbName(value, index, pathnames)}</span>
            ) : (
              <Link to={to} style={linkStyle}>
                {getBreadcrumbName(value, index, pathnames)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Breadcrumb;
