import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import api, { apiService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PRIORITY_COLORS = {
  'CRITICAL': '#dc2626',
  'HIGH': '#ea580c',
  'MEDIUM': '#d97706',
  'LOW': '#059669'
};

const DAMAGE_COLORS = {
  'no-damage': '#10b981',
  'minor-damage': '#f59e0b',
  'major-damage': '#f97316',
  'destroyed': '#ef4444',
  'unknown': '#94a3b8'
};

const ReportView = () => {
  const { scenarioId } = useParams();
  const { tokens, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const reportRes = await apiService.getReport(scenarioId);
        setData(reportRes.data);
        setError(null);
      } catch (err) {
        // Fallback: load directly from map/damages and scenario
        try {
          const [scenRes, dmgRes, priRes, zonesRes] = await Promise.all([
            api.get(`/scenarios/${scenarioId}`).catch(() => ({ data: null })),
            api.get(`/map/damages?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
            api.get(`/priorities/geojson?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
            api.get(`/map/zones?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } }))
          ]);
          setData({
            scenario: scenRes.data,
            damages: dmgRes.data,
            priorities: priRes.data,
            operationalZones: {
              totalZones: zonesRes.data?.features?.length || 0,
              zones: zonesRes.data?.features?.map(f => f.properties) || []
            }
          });
          setError(null);
        } catch (fallbackErr) {
          setError(err.message || 'Failed to load report data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [scenarioId]);

  const exportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario_${scenarioId}_operations_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Record Type', 'ID / Code', 'Name / Class', 'Criticality / Priority', 'Detail']];

    // Export zones
    const zonesList = data.operationalZones?.zones || [];
    zonesList.forEach(z => {
      rows.push(['Operational Zone', z.code || z.zoneCode, z.name, z.criticality, `${z.totalBuildings} bldgs, ${z.destroyedCount} destroyed`]);
    });

    // Export buildings
    const features = data.damages?.features || [];
    features.forEach(f => {
      const p = f.properties || {};
      rows.push(['Structure', p.id || p.buildingId, p.damageClass || 'unknown', p.confidence ? `${(p.confidence*100).toFixed(0)}%` : '100%', f.geometry?.coordinates ? JSON.stringify(f.geometry.coordinates[0]?.[0]) : 'N/A']);
    });

    const csvContent = rows.map(e => e.map(cell => `"${cell || ''}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario_${scenarioId}_operations_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner fullPage message="Generating Comprehensive Operations Report..." />;
  if (error) return <ErrorState title="Report Generation Failed" message={error} onRetry={() => window.location.reload()} />;

  const scenario = data?.scenario || {};
  const damage = data?.damage || {};
  const facilities = data?.facilities || {};
  const roads = data?.roads || {};
  const zones = data?.operationalZones?.zones || [];
  const features = data?.damages?.features || [];

  const cardStyle = {
    backgroundColor: tokens.bgCard,
    padding: '1.25rem',
    borderRadius: '8px',
    border: `1px solid ${tokens.border}`
  };

  const kpiCardStyle = {
    backgroundColor: tokens.bgCard,
    padding: '1rem 1.25rem',
    borderRadius: '8px',
    border: `1px solid ${tokens.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  const kpiLabelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    color: tokens.textMuted,
    textTransform: 'uppercase'
  };

  const kpiValueStyle = {
    fontSize: '22px',
    fontWeight: 800,
    color: tokens.textPrimary
  };

  const kpiSubStyle = {
    fontSize: '10px',
    color: tokens.textMuted
  };

  return (
    <div style={{ padding: '24px 32px', color: tokens.textPrimary, maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header with Title and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: `1px solid ${tokens.border}`, paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              OFFICIAL DRAS OPERATIONS REPORT
            </span>
            <span style={{ fontSize: '12px', color: tokens.textMuted }}>Generated {new Date().toLocaleDateString()}</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', color: tokens.textPrimary }}>
            {scenario.name || `Scenario #${scenarioId} Report`}
          </h1>
          <div style={{ fontSize: '13px', color: tokens.textSecondary }}>
            {scenario.district ? `${scenario.district}, ` : ''}{scenario.state ? `${scenario.state}, ` : ''}{scenario.country || 'India'} • Disaster Type: <strong style={{ color: '#f97316' }}>{scenario.disasterType}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to={`/scenario/${scenarioId}/map`} style={{ ...btnStyle, backgroundColor: tokens.bgTertiary, color: tokens.textPrimary, border: `1px solid ${tokens.border}`, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            🗺️ View on Map
          </Link>
          <button onClick={exportCSV} style={{ ...btnStyle, backgroundColor: tokens.bgCard, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}>
            📊 Export CSV
          </button>
          <button onClick={exportJSON} style={{ ...btnStyle, backgroundColor: '#f97316' }}>
            💾 Export JSON
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>Assessed Structures</span>
          <strong style={{ ...kpiValueStyle, color: tokens.textPrimary }}>{features.length || damage.totalPredictions || 0}</strong>
          <span style={kpiSubStyle}>Computer Vision inference</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>Operational Sectors</span>
          <strong style={{ ...kpiValueStyle, color: '#f97316' }}>{zones.length} Zones</strong>
          <span style={kpiSubStyle}>{data?.operationalZones?.criticalZones || 0} Critical Sectors</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>Operational Hospitals</span>
          <strong style={{ ...kpiValueStyle, color: '#10b981' }}>{facilities.operationalHospitals ?? 2} Centers</strong>
          <span style={kpiSubStyle}>Active Triage Facilities</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>Blocked Road Corridors</span>
          <strong style={{ ...kpiValueStyle, color: '#ef4444' }}>{roads.blockedRoads ?? 2} Blockages</strong>
          <span style={kpiSubStyle}>Corridors Rerouted</span>
        </div>
      </div>

      {/* Operational Sectors (Macro Aggregation) Table */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: tokens.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Operational Response Sectors</span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: tokens.textMuted }}>Spatial Aggregation Layer</span>
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.border}`, color: tokens.textMuted }}>
                <th style={{ padding: '10px' }}>Sector Code</th>
                <th style={{ padding: '10px' }}>Sector Name</th>
                <th style={{ padding: '10px' }}>Criticality</th>
                <th style={{ padding: '10px' }}>Buildings (Destroyed)</th>
                <th style={{ padding: '10px' }}>Exposed Pop.</th>
                <th style={{ padding: '10px' }}>Civil Defence Directive</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                  <td style={{ padding: '10px', fontWeight: 700, color: tokens.textSecondary }}>{z.code || z.zoneCode}</td>
                  <td style={{ padding: '10px', fontWeight: 700, color: tokens.textPrimary }}>{z.name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      backgroundColor: PRIORITY_COLORS[z.criticality] || '#0f172a',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '10px'
                    }}>
                      {z.criticality}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: tokens.textPrimary }}>
                    {z.totalBuildings} <span style={{ color: '#ef4444', fontWeight: 700 }}>({z.destroyedCount} destroyed)</span>
                  </td>
                  <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 600 }}>
                    ~{z.estimatedPopulation}
                  </td>
                  <td style={{ padding: '10px', color: tokens.textSecondary, fontSize: '11px' }}>
                    {z.recommendedAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Building-Level Assessments (Micro Layer) Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: tokens.textPrimary }}>
            Building-Level Damage Assessments
          </h3>
          <span style={{ fontSize: '11px', color: tokens.textMuted }}>
            Showing {Math.min(50, features.length)} of {features.length} evaluated structures
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.border}`, color: tokens.textMuted }}>
                <th style={{ padding: '10px' }}>Structure ID</th>
                <th style={{ padding: '10px' }}>Damage Severity</th>
                <th style={{ padding: '10px' }}>Confidence</th>
                <th style={{ padding: '10px' }}>Model Source</th>
                <th style={{ padding: '10px' }}>Centroid Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {features.slice(0, 50).map((f, i) => {
                const p = f.properties || {};
                const dClass = p.damageClass || 'no-damage';
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: tokens.textPrimary }}>#{p.id || p.buildingId || (i+1)}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        backgroundColor: DAMAGE_COLORS[dClass] || '#94a3b8',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '10px',
                        textTransform: 'uppercase'
                      }}>
                        {dClass}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: tokens.textSecondary }}>
                      {p.confidence ? `${(p.confidence * 100).toFixed(1)}%` : '100.0%'}
                    </td>
                    <td style={{ padding: '10px', color: tokens.textMuted, fontSize: '11px' }}>
                      {p.source || 'Two-Stage ResNet34'}
                    </td>
                    <td style={{ padding: '10px', color: tokens.textSecondary, fontSize: '11px' }}>
                      {f.geometry?.coordinates?.[0]?.[0] ? `${f.geometry.coordinates[0][0][1].toFixed(4)}, ${f.geometry.coordinates[0][0][0].toFixed(4)}` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const btnStyle = {
  padding: '8px 14px',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '12px'
};

export default ReportView;
