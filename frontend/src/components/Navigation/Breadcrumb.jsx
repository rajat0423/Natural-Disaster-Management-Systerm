import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { BRANDING } from '../../config/branding';

const Breadcrumb = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show breadcrumbs on the landing page
  if (location.pathname === '/') return null;

  const pathnames = location.pathname.split('/').filter(x => x);

  const containerStyle = {
    position: 'fixed',
    top: '56px', // Below TopBar
    left: 0,
    right: 0,
    height: '40px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    zIndex: 1900,
    fontFamily: 'sans-serif',
    fontSize: '0.9rem',
    borderBottom: '1px solid #334155'
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#f8fafc',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginRight: '16px',
    padding: '4px 8px',
    backgroundColor: '#334155',
    borderRadius: '4px'
  };

  const linkStyle = {
    color: '#3b82f6',
    textDecoration: 'none'
  };

  const textStyle = {
    color: '#f8fafc'
  };

  const separatorStyle = {
    margin: '0 8px',
    color: '#64748b'
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
