/**
 * ============================================================
 * System Health Page
 * ============================================================
 *
 * Purpose:
 *   Shows the connection status of every service in our system.
 *   This is the first page the user sees to verify everything
 *   is wired up correctly.
 *
 * What it checks:
 *   1. Spring Boot backend → /api/health
 *   2. Through the backend → database status
 *   3. Through the backend → AI service status
 *
 * How it works:
 *   When the page loads, it calls GET /api/health/detailed
 *   on the Spring Boot backend. That endpoint internally checks
 *   the database and AI service, then returns the status of all three.
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

function SystemHealth() {
  // State variables to hold our health check results
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect runs when the component first loads
  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    setLoading(true);
    setError(null);
    try {
      // Call the backend's detailed health endpoint
      const response = await api.get('/health/detailed');
      setHealth(response.data);
    } catch (err) {
      setError(
        'Cannot reach backend at http://localhost:8081. ' +
        'Make sure Spring Boot is running.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Helper function to render a status badge
  function StatusBadge({ status }) {
    const isUp = status === 'UP';
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: isUp ? '#2d6a4f' : status === 'DEGRADED' ? '#e9c46a' : '#9b2226',
      }}>
        {status}
      </span>
    );
  }

  // Helper to render one service card
  function ServiceCard({ title, status, details }) {
    return (
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
        backgroundColor: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#212529' }}>{title}</h3>
          <StatusBadge status={status} />
        </div>
        {details && (
          <div style={{ fontSize: '13px', color: '#6c757d' }}>
            {Object.entries(details).map(([key, value]) => (
              key !== 'status' && (
                <div key={key} style={{ marginBottom: '4px' }}>
                  <strong>{key}:</strong> {String(value)}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '700px',
      margin: '40px auto',
      padding: '0 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#212529', marginBottom: '4px' }}>
        Disaster Management System
      </h1>
      <p style={{ color: '#6c757d', marginBottom: '24px', fontSize: '14px' }}>
        System Health Monitor — Milestone 1 Verification
      </p>

      {loading && (
        <p style={{ color: '#6c757d' }}>Checking services...</p>
      )}

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
          marginBottom: '16px',
          fontSize: '14px',
        }}>
          <strong>Connection Error:</strong> {error}
        </div>
      )}

      {health && (
        <>
          {/* Overall system status */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            backgroundColor: health.status === 'UP' ? '#d4edda' : '#fff3cd',
            border: `1px solid ${health.status === 'UP' ? '#c3e6cb' : '#ffeaa7'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#212529' }}>Overall System Status</span>
              <StatusBadge status={health.status} />
            </div>
            {health.timestamp && (
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </div>
            )}
          </div>

          {/* Individual service cards */}
          <ServiceCard
            title="Spring Boot Backend"
            status="UP"
            details={{ port: '8081', service: health.service }}
          />

          <ServiceCard
            title="PostgreSQL + PostGIS Database"
            status={health.database?.status || 'UNKNOWN'}
            details={health.database}
          />

          <ServiceCard
            title="Python AI Service (FastAPI)"
            status={health.aiService?.status || 'UNKNOWN'}
            details={health.aiService}
          />
        </>
      )}

      {/* Refresh button */}
      <button
        onClick={checkHealth}
        disabled={loading}
        style={{
          marginTop: '16px',
          padding: '10px 24px',
          backgroundColor: '#212529',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Checking...' : 'Refresh Status'}
      </button>
    </div>
  );
}

export default SystemHealth;
