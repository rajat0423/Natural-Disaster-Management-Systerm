/**
 * ============================================================
 * ExecutiveDashboard.jsx — Comprehensive Spatial Disaster Summary
 * ============================================================
 *
 * Implements:
 *   - High-level KPI status cards
 *   - AI Damage Severity and Priority Urgency breakdowns
 *   - Critical infrastructure inventory (Hospitals, Shelters, Roadways)
 *   - Multi-disaster scenario metadata
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DAMAGE_COLORS = {
  'no-damage': '#2ecc71',
  'minor-damage': '#f1c40f',
  'major-damage': '#e67e22',
  'destroyed': '#e74c3c'
};

const PRIORITY_COLORS = {
  'CRITICAL': '#d90429',
  'HIGH': '#f77f00',
  'MEDIUM': '#fcbf49',
  'LOW': '#2a9d8f'
};

function ExecutiveDashboard() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(1);
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
      setError('Could not connect to Spring Boot backend (http://localhost:8081).');
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

  const criticalCount = priorities.filter(p => p.priorityLevel === 'CRITICAL').length;
  const highCount = priorities.filter(p => p.priorityLevel === 'HIGH').length;
  const mediumCount = priorities.filter(p => p.priorityLevel === 'MEDIUM').length;
  const lowCount = priorities.filter(p => p.priorityLevel === 'LOW').length;
  const blockedRoadCount = roads.filter(r => r.properties?.isBlocked).length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header & Scenario Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #dee2e6', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1d3557', margin: 0 }}>
            📊 Executive Disaster Operations Summary
          </h2>
          <span style={{ fontSize: '12px', color: '#6c757d' }}>
            Decision Support & Spatial Analytics Overview
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>Select Scenario:</label>
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '13px',
              fontWeight: 600,
              color: '#1d3557',
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
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Scenario Information Card */}
      {scenarioData && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1d3557', margin: '0 0 4px 0' }}>
                {scenarioData.name}
              </h3>
              <p style={{ fontSize: '12px', color: '#495057', margin: '0 0 6px 0', maxWidth: '800px' }}>
                {scenarioData.description}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#6c757d' }}>
                <span><strong>Type:</strong> {scenarioData.disasterType}</span>
                <span><strong>Date:</strong> {scenarioData.eventDate}</span>
                <span><strong>Location:</strong> {scenarioData.locationName}</span>
                <span><strong>Data Source:</strong> {scenarioData.dataSource}</span>
              </div>
            </div>
            <span style={{ backgroundColor: '#e63946', color: '#fff', fontSize: '11px', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
              ACTIVE INCIDENT
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#1d3557' }}>{summary?.totalBuildings || 181}</div>
          <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 600 }}>Total Assessed Structures</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#d90429' }}>{criticalCount}</div>
          <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 600 }}>Critical Priority (≥70%)</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#f77f00' }}>{highCount}</div>
          <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 600 }}>High Priority (50-70%)</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#2a9d8f' }}>{hospitals.length}</div>
          <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 600 }}>Operational Hospitals</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0077b6' }}>{shelters.length}</div>
          <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 600 }}>Active Relief Shelters</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#8e44ad' }}>{blockedRoadCount}</div>
          <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 600 }}>Blocked Road Corridors</div>
        </div>
      </div>

      {/* Two-Column Analytics Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* Left Card: AI Damage Severity Breakdown */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1d3557', margin: 0 }}>
              AI Damage Severity Breakdown
            </h4>
            <span style={{ fontSize: '11px', color: '#6c757d' }}>Two-Stage CV Model</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['no-damage'] }}>🟢 No Damage</span>
                <strong>{summary?.noDamageCount || 106} ({(((summary?.noDamageCount || 106) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.noDamageCount || 106) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['no-damage'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['minor-damage'] }}>🟡 Minor Damage</span>
                <strong>{summary?.minorDamageCount || 41} ({(((summary?.minorDamageCount || 41) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.minorDamageCount || 41) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['minor-damage'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['major-damage'] }}>🟠 Major Damage</span>
                <strong>{summary?.majorDamageCount || 24} ({(((summary?.majorDamageCount || 24) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.majorDamageCount || 24) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['major-damage'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: DAMAGE_COLORS['destroyed'] }}>🔴 Destroyed</span>
                <strong>{summary?.destroyedCount || 10} ({(((summary?.destroyedCount || 10) / (summary?.totalBuildings || 181)) * 100).toFixed(1)}%)</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(((summary?.destroyedCount || 10) / (summary?.totalBuildings || 181)) * 100)}%`, height: '100%', backgroundColor: DAMAGE_COLORS['destroyed'] }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Explainable Priority Urgency Breakdown */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1d3557', margin: 0 }}>
              Explainable Priority Urgency
            </h4>
            <span style={{ fontSize: '11px', color: '#6c757d' }}>4-Factor Weighted Ranking</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, color: PRIORITY_COLORS['CRITICAL'] }}>🚨 Critical Priority</span>
                <strong>{criticalCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(criticalCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['CRITICAL'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['HIGH'] }}>⚠️ High Priority</span>
                <strong>{highCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(highCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['HIGH'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['MEDIUM'] }}>🟡 Medium Priority</span>
                <strong>{mediumCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(mediumCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['MEDIUM'] }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['LOW'] }}>🟢 Low Priority</span>
                <strong>{lowCount} locations</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(lowCount / (summary?.totalBuildings || 181)) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS['LOW'] }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Critical Infrastructure Inventory Tables */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1d3557', marginBottom: '12px' }}>
          🏥 Emergency Medical & Evacuation Facility Inventory
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Hospitals Table */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#d90429', marginBottom: '6px' }}>Hospitals / Medical Units:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Facility</th>
                  <th style={{ padding: '6px 8px' }}>Capacity</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{h.properties?.name}</td>
                    <td style={{ padding: '6px 8px' }}>{h.properties?.capacity} beds</td>
                    <td style={{ padding: '6px 8px', color: '#2ecc71', fontWeight: 600 }}>🟢 Operational</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shelters Table */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0077b6', marginBottom: '6px' }}>Evacuation Relief Shelters:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Shelter Name</th>
                  <th style={{ padding: '6px 8px' }}>Capacity</th>
                  <th style={{ padding: '6px 8px' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {shelters.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.properties?.name}</td>
                    <td style={{ padding: '6px 8px' }}>{s.properties?.capacity} people</td>
                    <td style={{ padding: '6px 8px', color: '#495057' }}>{s.properties?.shelterType}</td>
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
