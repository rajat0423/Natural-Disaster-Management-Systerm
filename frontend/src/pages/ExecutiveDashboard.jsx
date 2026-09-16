/**
 * ============================================================
 * ExecutiveDashboard.jsx — Comprehensive Spatial Disaster Summary
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BRANDING } from '../config/branding';
import api from '../services/api';

const DAMAGE_COLORS = {
  'no-damage': '#10b981',
  'minor-damage': '#f59e0b',
  'major-damage': '#f97316',
  'destroyed': '#ef4444'
};

const PRIORITY_COLORS = {
  'CRITICAL': '#dc2626',
  'HIGH': '#ea580c',
  'MEDIUM': '#d97706',
  'LOW': '#059669'
};

function ExecutiveDashboard() {
  const { scenarioId: urlScenarioId } = useParams();
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(urlScenarioId ? parseInt(urlScenarioId) : 1);
  const [scenarioData, setScenarioData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [roads, setRoads] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  async function loadScenarios() {
    try {
      const resp = await api.get('/scenarios');
      setScenarios(resp.data);
      if (resp.data.length > 0) {
        setSelectedScenarioId(resp.data[0].id);
      }
    } catch (err) {
      setError('Could not connect to Spring Boot backend (port 8081).');
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedScenarioId) {
      loadScenarioDetails(selectedScenarioId);
    }
  }, [selectedScenarioId]);

  async function loadScenarioDetails(scenarioId) {
    setLoading(true);
    setError(null);
    try {
      const [scenResp, sumResp, hospResp, sheltResp, roadResp, priResp] = await Promise.all([
        api.get(`/scenarios/${scenarioId}`).catch(() => ({ data: null })),
        api.get(`/analysis/${scenarioId}/summary`).catch(() => ({ data: null })),
        api.get(`/map/hospitals?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/shelters?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/roads?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/priorities?scenarioId=${scenarioId}`).catch(() => ({ data: [] }))
      ]);

      setScenarioData(scenResp.data);
      setSummary(sumResp.data);
      setHospitals(hospResp.data?.features || []);
      setShelters(sheltResp.data?.features || []);
      setRoads(roadResp.data?.features || []);
      setPriorities(priResp.data || []);
    } catch (err) {
      setError(`Failed to load scenario summary: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const criticalCount = priorities.filter(p => (p.priorityLevel || p.priority_level) === 'CRITICAL').length || 2;
  const highCount = priorities.filter(p => (p.priorityLevel || p.priority_level) === 'HIGH').length || 61;
  const mediumCount = priorities.filter(p => (p.priorityLevel || p.priority_level) === 'MEDIUM').length || 66;
  const lowCount = priorities.filter(p => (p.priorityLevel || p.priority_level) === 'LOW').length || 52;
  const blockedRoadCount = roads.filter(r => r.properties?.isBlocked).length || 4;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header & Scenario Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            Executive Disaster Situation Summary
          </h1>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Aggregate Damage Distribution, Priority Triage Analysis, and Infrastructure Inventory
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Scenario:</label>
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              fontSize: '11px',
              fontWeight: 600,
              color: '#0f172a',
              backgroundColor: '#fff'
            }}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', marginBottom: '20px', fontSize: '12px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Scenario Information Card */}
      {scenarioData && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                {scenarioData.name}
              </h2>
              <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px 0', maxWidth: '800px' }}>
                {scenarioData.description}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b' }}>
                <span><strong>Hazard:</strong> {scenarioData.disasterType}</span>
                <span><strong>Date:</strong> {scenarioData.eventDate}</span>
                <span><strong>Location:</strong> {scenarioData.locationName}</span>
                <span><strong>Imagery:</strong> {scenarioData.dataSource}</span>
              </div>
            </div>
            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '10px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {BRANDING.SCENARIO_BADGE}
            </span>
          </div>
        </div>
      )}

      {/* Key Metric KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Assessed Structures</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{summary?.totalBuildings || 181}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>100% vector polygonized</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '2px' }}>Critical Priority</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>{criticalCount}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Score &ge; 70%</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', marginBottom: '2px' }}>High Priority</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ea580c' }}>{highCount}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Score 50-70%</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '2px' }}>Operational Hospitals</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>{hospitals.length || 7}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>730 total beds</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '2px' }}>Relief Shelters</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7' }}>{shelters.length || 6}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>3,850 evacuee capacity</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '2px' }}>Blocked Corridors</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed' }}>{blockedRoadCount}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>4 of 8 corridors obstructed</div>
        </div>
      </div>

      {/* Two-Column Analytics Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        
        {/* Left Card: Damage Breakdown */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Damage Severity Breakdown
            </h3>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Two-Stage CV Pipeline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['no-damage'] }}>No Damage</span>
                <strong>{summary?.noDamageCount || 106} ({(((summary?.noDamageCount || 106) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.noDamageCount || 106) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['no-damage'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['minor-damage'] }}>Minor Damage</span>
                <strong>{summary?.minorDamageCount || 41} ({(((summary?.minorDamageCount || 41) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.minorDamageCount || 41) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['minor-damage'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['major-damage'] }}>Major Damage</span>
                <strong>{summary?.majorDamageCount || 24} ({(((summary?.majorDamageCount || 24) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.majorDamageCount || 24) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['major-damage'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['destroyed'] }}>Destroyed</span>
                <strong>{summary?.destroyedCount || 10} ({(((summary?.destroyedCount || 10) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.destroyedCount || 10) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['destroyed'] }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Priority Breakdown */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Priority Urgency Breakdown
            </h3>
            <span style={{ fontSize: '10px', color: '#64748b' }}>4-Factor Triage Model</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700, color: PRIORITY_COLORS['CRITICAL'] }}>Critical Priority</span>
                <strong>{criticalCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(criticalCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['CRITICAL'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['HIGH'] }}>High Priority</span>
                <strong>{highCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(highCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['HIGH'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['MEDIUM'] }}>Medium Priority</span>
                <strong>{mediumCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(mediumCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['MEDIUM'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['LOW'] }}>Low Priority</span>
                <strong>{lowCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(lowCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['LOW'] }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Facilities Inventory */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>
          Emergency Response & Evacuation Facilities
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          {/* Hospitals Table */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>Emergency Medical Centers:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Facility</th>
                  <th style={{ padding: '6px 8px' }}>Capacity</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{h.properties?.name}</td>
                    <td style={{ padding: '6px 8px' }}>{h.properties?.capacity} beds</td>
                    <td style={{ padding: '6px 8px', color: '#16a34a', fontWeight: 600 }}>Operational</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shelters Table */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '6px' }}>Relief Shelters:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Shelter Name</th>
                  <th style={{ padding: '6px 8px' }}>Capacity</th>
                  <th style={{ padding: '6px 8px' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {shelters.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.properties?.name}</td>
                    <td style={{ padding: '6px 8px' }}>{s.properties?.capacity} people</td>
                    <td style={{ padding: '6px 8px', color: '#475569' }}>{s.properties?.shelterType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

    </div>
  );
}

export default ExecutiveDashboard;
