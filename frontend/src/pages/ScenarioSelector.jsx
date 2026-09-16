import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BRANDING } from '../config/branding';

const ScenarioSelector = () => {
  const navigate = useNavigate();

  const containerStyle = {
    padding: '2rem',
    color: '#f8fafc',
    fontFamily: 'sans-serif',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '2rem',
    marginTop: '2rem'
  };

  const cardStyle = {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    border: '1px solid #334155',
    transition: 'transform 0.2s, borderColor 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  };

  const handleCardClick = (id) => {
    navigate(`/scenario/${id}/map`);
  };

  return (
    <div style={containerStyle}>
      <h1>Select a Scenario</h1>
      <p style={{ color: '#94a3b8' }}>Choose a disaster scenario to begin analysis and operations planning.</p>
      
      <div style={gridStyle}>
        {BRANDING.scenarios.map((scenario) => (
          <div 
            key={scenario.id} 
            style={cardStyle}
            onClick={() => handleCardClick(scenario.id)}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#f97316'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{scenario.name}</h2>
              <span style={{ fontSize: '1.5rem' }}>
                {scenario.name.includes('Fire') ? '🔥' : scenario.name.includes('Flood') ? '🌊' : '⛰️'}
              </span>
            </div>
            
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Location: {scenario.country}
            </div>

            <div style={{ 
              marginTop: 'auto',
              padding: '4px 8px', 
              backgroundColor: '#334155', 
              borderRadius: '4px',
              fontSize: '0.8rem',
              display: 'inline-block',
              alignSelf: 'flex-start',
              color: '#f97316'
            }}>
              {scenario.badge}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScenarioSelector;
