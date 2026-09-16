import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import api, { apiService } from '../services/api';

const ReportView = () => {
  const { scenarioId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // We simulate a compound fetch for the report if the backend endpoint /reports is not ready,
        // or we try the newly added endpoint. Let's use the actual api service we defined.
        
        // Since getReport might not be fully implemented on backend, 
        // we'll try to fetch it, but fallback to a combined state if it fails 
        // based on existing map-layers APIs.
        try {
          const reportRes = await apiService.getReport(scenarioId);
          setData(reportRes.data);
        } catch (e) {
          // Fallback to fetch individual parts if getReport fails
          const damagesRes = await api.get('/map-layers/damages/' + scenarioId).catch(() => ({ data: { features: [] } }));
          const prioritiesRes = await api.get('/priorities/' + scenarioId).catch(() => ({ data: [] } ));
          
          setData({
            damages: damagesRes.data,
            priorities: prioritiesRes.data
          });
        }
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load report data');
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
    a.download = `scenario_${scenarioId}_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!data || !data.damages || !data.damages.features) return;
    
    const rows = [
      ['ID', 'Damage Class', 'Longitude', 'Latitude']
    ];

    data.damages.features.forEach(f => {
      const coords = f.geometry.coordinates;
      rows.push([
        f.id || 'N/A',
        f.properties.damageClass || 'N/A',
        coords[0],
        coords[1]
      ]);
    });

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario_${scenarioId}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner fullPage message="Generating Report..." />;
  if (error) return <ErrorState title="Report Generation Failed" message={error} onRetry={() => window.location.reload()} />;

  const features = data?.damages?.features || [];

  return (
    <div style={{ padding: '2rem', color: '#f8fafc', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Operations Report</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportCSV} style={btnStyle}>Export CSV</button>
          <button onClick={exportJSON} style={btnStyle}>Export JSON</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <h3>Damage Summary</h3>
          <p>Total Buildings Assessed: {features.length}</p>
        </div>
        <div style={cardStyle}>
          <h3>Accessibility Analysis</h3>
          <p>Analyzing priority zones and road blocks...</p>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Building Assessments</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Damage Class</th>
                <th style={{ padding: '12px' }}>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {features.slice(0, 50).map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '12px' }}>{f.id || `Bld-${i}`}</td>
                  <td style={{ padding: '12px' }}>{f.properties?.damageClass || 'Unknown'}</td>
                  <td style={{ padding: '12px' }}>
                    {f.geometry?.coordinates ? `${f.geometry.coordinates[1].toFixed(4)}, ${f.geometry.coordinates[0].toFixed(4)}` : 'N/A'}
                  </td>
                </tr>
              ))}
              {features.length > 50 && (
                <tr>
                  <td colSpan="3" style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>
                    ... and {features.length - 50} more records (Export to view all)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const btnStyle = {
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const cardStyle = {
  backgroundColor: '#1e293b',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid #334155'
};

export default ReportView;
