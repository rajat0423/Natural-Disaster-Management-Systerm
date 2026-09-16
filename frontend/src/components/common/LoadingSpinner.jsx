import React from 'react';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...', fullPage = false }) => {
  const sizeMap = {
    small: '1.5rem',
    medium: '3rem',
    large: '5rem'
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const spinnerStyle = {
    width: spinnerSize,
    height: spinnerSize,
    border: `4px solid #334155`,
    borderTop: `4px solid #f97316`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const containerStyle = fullPage
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.8)', // navy with opacity
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem'
      };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={spinnerStyle}></div>
      {message && (
        <p style={{ marginTop: '1rem', color: '#f8fafc', fontWeight: 500, fontFamily: 'sans-serif' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
