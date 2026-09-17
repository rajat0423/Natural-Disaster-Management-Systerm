import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BRANDING } from '../config/branding';
import { useTheme } from '../context/ThemeContext';

const ScenarioSelector = () => {
  const navigate = useNavigate();
  const { isDark, tokens } = useTheme();

  const containerStyle = {
    padding: '2rem',
    color: tokens.textPrimary,
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
    backgroundColor: tokens.bgCard,
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: tokens.shadow,
    cursor: 'pointer',
    border: `1px solid ${tokens.border}`,
    transition: 'transform 0.2s, border-color 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  };

  const handleCardClick = (id) => {
    navigate(`/scenario/${id}/map`);
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ color: tokens.textPrimary }}>Select a Scenario</h1>
      <p style={{ color: tokens.textSecondary }}>Choose a disaster scenario to begin analysis and operations planning.</p>
      
      <div style={gridStyle}>
        {BRANDING.scenarios.map((scenario) => (
          <div 
            key={scenario.id} 
            style={cardStyle}
            onClick={() => handleCardClick(scenario.id)}
            onMouseOver={(e) => e.currentTarget.style.borderColor = tokens.accent}
            onMouseOut={(e) => e.currentTarget.style.borderColor = tokens.border}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: tokens.textPrimary }}>{scenario.name}</h2>
              <span style={{ fontSize: '1.5rem' }}>
                {scenario.type === 'WILDFIRE' ? '🔥' : scenario.type === 'CYCLONE' ? '🌀' : '🌊'}
              </span>
            </div>
            
            <div style={{ color: tokens.textSecondary, fontSize: '0.9rem' }}>
              Location: <strong>{scenario.state ? `${scenario.state}, ` : ''}{scenario.country}</strong>
            </div>

            <div style={{ 
              marginTop: 'auto',
              padding: '4px 10px', 
              backgroundColor: tokens.bgTertiary, 
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'inline-block',
              alignSelf: 'flex-start',
              color: tokens.accent,
              border: `1px solid ${tokens.border}`
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
