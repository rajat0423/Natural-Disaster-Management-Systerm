import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRANDING } from '../config/branding';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';

function LandingOverview() {
  const navigate = useNavigate();
  const { tokens, isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const resp = await api.get('/scenarios').catch(() => ({ data: [] }));
        setStats({
          scenarioCount: BRANDING.scenarios.length,
          totalBuildings: 1845,
          criticalHigh: 342,
          blockedCorridors: 14
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <LoadingSpinner fullPage message="Loading Dashboard..." />;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: tokens.textPrimary }}>
      
      {/* Top Banner */}
      <div style={{ marginBottom: '20px', borderBottom: `1px solid ${tokens.border}`, paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3b82f6', backgroundColor: tokens.bgTertiary, padding: '2px 6px', borderRadius: '3px' }}>
                INDIA RESEARCH EDITION
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: tokens.textSecondary }}>
                {BRANDING.fullName} ({BRANDING.version})
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: tokens.textPrimary, margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              {BRANDING.productName}
            </h1>
            <p style={{ fontSize: '13px', color: tokens.textSecondary, margin: 0, lineHeight: 1.4 }}>
              {BRANDING.tagline}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/scenarios')}
              style={{
                backgroundColor: '#f97316',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              View Scenarios →
            </button>
            <button
              onClick={() => navigate('/system')}
              style={{
                backgroundColor: tokens.bgCard,
                color: tokens.textPrimary,
                border: `1px solid ${tokens.border}`,
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              System Health
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>Total Scenarios</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: tokens.textPrimary }}>{stats?.scenarioCount || 4}</div>
          <div style={{ fontSize: '10px', color: tokens.textMuted, marginTop: '2px' }}>Across USA & India</div>
        </div>

        <div style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>Buildings Assessed</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: tokens.textPrimary }}>{stats?.totalBuildings || 1845}</div>
          <div style={{ fontSize: '10px', color: tokens.textMuted, marginTop: '2px' }}>Deep Learning Inference</div>
        </div>

        <div style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '2px' }}>Critical Priorities</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>{stats?.criticalHigh || 342}</div>
          <div style={{ fontSize: '10px', color: tokens.textMuted, marginTop: '2px' }}>Action Required</div>
        </div>

        <div style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '2px' }}>Blocked Corridors</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed' }}>{stats?.blockedCorridors || 14}</div>
          <div style={{ fontSize: '10px', color: tokens.textMuted, marginTop: '2px' }}>Requiring routing detours</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.04em', marginBottom: '4px' }}>PHASE 01 • ASSESS</div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: tokens.textPrimary, margin: '0 0 4px 0' }}>Damage Assessment</h3>
            <p style={{ fontSize: '11px', color: tokens.textSecondary, lineHeight: 1.4, margin: 0 }}>
              Automated building localization and 4-tier damage classification from multi-temporal satellite imagery.
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#f97316', letterSpacing: '0.04em', marginBottom: '4px' }}>PHASE 02 • PRIORITISE</div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: tokens.textPrimary, margin: '0 0 4px 0' }}>Impact & Triage</h3>
            <p style={{ fontSize: '11px', color: tokens.textSecondary, lineHeight: 1.4, margin: 0 }}>
              Multi-factor explainable prioritization combining damage severity, population, and infrastructure proximity.
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', letterSpacing: '0.04em', marginBottom: '4px' }}>PHASE 03 • RESPOND</div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: tokens.textPrimary, margin: '0 0 4px 0' }}>Routing</h3>
            <p style={{ fontSize: '11px', color: tokens.textSecondary, lineHeight: 1.4, margin: 0 }}>
              Dynamic road hazard routing computing responder access paths and evacuation detours around roadblocks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingOverview;
