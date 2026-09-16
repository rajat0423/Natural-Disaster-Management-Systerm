/**
 * ============================================================
 * LandingOverview.jsx — Incident Overview (DRAS Demonstration)
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { BRANDING } from '../config/branding';
import api from '../services/api';

function LandingOverview({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidentData();
  }, []);

  async function loadIncidentData() {
    try {
      const [scenResp, sumResp] = await Promise.all([
        api.get('/scenarios/1').catch(() => ({ data: null })),
        api.get('/analysis/1/summary').catch(() => ({ data: null }))
      ]);
      setScenario(scenResp.data);
      setSummary(sumResp.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Top Banner */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '3px' }}>
                {BRANDING.SCENARIO_BADGE}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                {BRANDING.FULL_PRODUCT_NAME} ({BRANDING.VERSION})
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              {BRANDING.PRODUCT_NAME}
            </h1>
            <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
              {BRANDING.PRODUCT_TAGLINE} — {BRANDING.DISCLAIMER}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onNavigate('map')}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              Open Operations Map →
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Executive Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Incident Profile */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              EVALUATION SCENARIO
            </span>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '2px 0 0 0' }}>
              {scenario?.name || BRANDING.DEFAULT_SCENARIO_NAME}
            </h2>
          </div>
          <span style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            Scenario ID: #001
          </span>
        </div>

        <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: '0 0 12px 0' }}>
          {scenario?.description || 'Historical wildfire dataset in Los Angeles and Ventura counties used for automated satellite building damage segmentation and network detour analysis.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '11px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div><strong style={{ color: '#0f172a' }}>Hazard:</strong> Wildfire Perimeter</div>
          <div><strong style={{ color: '#0f172a' }}>Event Date:</strong> November 8, 2018</div>
          <div><strong style={{ color: '#0f172a' }}>Location:</strong> Malibu / Santa Monica Mountains, CA</div>
          <div><strong style={{ color: '#0f172a' }}>Dataset Source:</strong> Maxar / xBD Multi-Hazard Benchmark</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Structures Assessed</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{summary?.totalBuildings || 181}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>100% vector polygonized</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '2px' }}>Critical / High Priority</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>63</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>2 Critical + 61 High urgency</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '2px' }}>Emergency Hospitals</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>{summary?.hospitalCount || 7}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>730 total bed capacity</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '2px' }}>Relief Shelters</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7' }}>{summary?.shelterCount || 6}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>3,850 evacuee capacity</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '2px' }}>Blocked Corridors</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed' }}>4</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>4 of 8 corridors obstructed</div>
        </div>

      </div>

      {/* 3-Step Conceptual Workflow Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', letterSpacing: '0.04em', marginBottom: '4px' }}>PHASE 01 • ASSESS</div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Damage Assessment
            </h3>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4, margin: 0 }}>
              Automated building localization and 4-tier damage classification from multi-temporal satellite imagery.
            </p>
          </div>
          <button
            onClick={() => onNavigate('map')}
            style={{ marginTop: '12px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            Launch Map Viewer →
          </button>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#ea580c', letterSpacing: '0.04em', marginBottom: '4px' }}>PHASE 02 • PRIORITISE</div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Impact & Triage
            </h3>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4, margin: 0 }}>
              Multi-factor explainable prioritization combining damage severity, population, and infrastructure proximity.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{ marginTop: '12px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            Open Dashboard →
          </button>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669', letterSpacing: '0.04em', marginBottom: '4px' }}>PHASE 03 • RESPOND</div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Response & Evacuation Routing
            </h3>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4, margin: 0 }}>
              Dynamic road hazard routing computing responder access paths and evacuation detours around roadblocks.
            </p>
          </div>
          <button
            onClick={() => onNavigate('metrics')}
            style={{ marginTop: '12px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            Inspect Metrics →
          </button>
        </div>

      </div>

      {/* Notice */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
        <strong>Notice:</strong> {BRANDING.SCIENTIFIC_NOTICE}
      </div>

    </div>
  );
}

export default LandingOverview;
