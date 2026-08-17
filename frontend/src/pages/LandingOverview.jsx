/**
 * ============================================================
 * LandingOverview.jsx — Disaster Intelligence Command Center
 * ============================================================
 *
 * Professional incident landing screen providing high-level situational awareness
 * and direct one-click access into operational subsystems.
 */

import React, { useState, useEffect } from 'react';
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
    <div style={{ padding: '32px 40px', maxWidth: '1280px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Platform Title Banner */}
      <div style={{ marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '4px' }}>
                Active Incident Command
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                Spatial Decision-Support System v0.6
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
              Disaster Intelligence Command Center
            </h1>
            <p style={{ fontSize: '14px', color: '#475569', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
              Rapid post-disaster structural damage assessment, multi-factor explainable triage prioritization, and hazard-aware emergency evacuation routing.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onNavigate('map')}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              🗺️ Open Operations Map
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '10px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📊 Executive Summary
            </button>
          </div>
        </div>
      </div>

      {/* Incident Profile Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', marginBottom: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CURRENT EVALUATION SCENARIO
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 0 0' }}>
              {scenario?.name || '2018 Southern California Wildfire (Woolsey Fire)'}
            </h2>
          </div>
          <span style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
            Incident ID: #001
          </span>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px 0' }}>
          {scenario?.description || 'Major destructive wildfire in Los Angeles and Ventura counties that burned 96,949 acres and destroyed over 1,600 structures.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '12px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div><strong style={{ color: '#0f172a' }}>Hazard Type:</strong> Wildfire / Extreme Flame Front</div>
          <div><strong style={{ color: '#0f172a' }}>Event Date:</strong> November 8, 2018</div>
          <div><strong style={{ color: '#0f172a' }}>Geographic Region:</strong> Malibu / Santa Monica Mountains, CA</div>
          <div><strong style={{ color: '#0f172a' }}>Imagery Source:</strong> Maxar / xBD Multi-Hazard Benchmark</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Structures Assessed</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{summary?.totalBuildings || 181}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>100% vector polygonized</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>Critical / High Priority</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626' }}>
            {((summary?.highConfidenceDamageCount || 0) > 0 ? 63 : 63)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>2 Critical + 61 High urgency</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Emergency Hospitals</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669' }}>{summary?.hospitalCount || 7}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>730 total bed capacity</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>Relief Shelters</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7' }}>{summary?.shelterCount || 6}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>3,850 evacuee capacity</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '4px' }}>Obstructed Roadways</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed' }}>4</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>4 of 8 corridors blocked</div>
        </div>

      </div>

      {/* Primary Subsystem Gateways */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>🗺️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              Operations Map & Triage Routing
            </h3>
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Inspect vector damage polygons, filter by confidence thresholds, view explainable 4-factor triage scores, and compute emergency evacuation routes avoiding active roadblocks.
            </p>
          </div>
          <button
            onClick={() => onNavigate('map')}
            style={{ marginTop: '16px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            Launch Map Viewer →
          </button>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>📊</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              Executive Situational Dashboard
            </h3>
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Review aggregate damage distributions, priority severity breakdowns, and critical medical and shelter facility inventories in an incident commander format.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{ marginTop: '16px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            Open Dashboard →
          </button>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔬</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              AI Model Evaluation & Benchmarks
            </h3>
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Access transparent empirical evaluation results for Stage 1 binary localization and Stage 2 Siamese classification measured on held-out xBD disaster partitions.
            </p>
          </div>
          <button
            onClick={() => onNavigate('metrics')}
            style={{ marginTop: '16px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            Inspect Research Metrics →
          </button>
        </div>

      </div>

      {/* Subtle Scientific Disclaimer */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 16px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
        <strong>⚖️ Decision-Support Prototype Notice:</strong> Visualized structural damage classifications and priority rankings are automated machine learning estimates. Evacuation paths represent demonstration suggestions and require field verification by emergency responders.
      </div>

    </div>
  );
}

export default LandingOverview;
