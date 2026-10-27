import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Truck, Users, AlertTriangle, CheckCircle2, Clock, MapPin,
  Flame, Droplets, Mountain, Wind, RefreshCw, Send, ChevronRight, Phone,
  Radio, Plus, Activity, Search, Filter, ArrowRight, X, HeartPulse, LifeBuoy,
  BellOff, ShieldCheck, Navigation, VolumeX
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import SosRequestModal from '../components/alerts/SosRequestModal';

const PRIORITY_CONFIG = {
  P1_CRITICAL: { label: 'P1 CRITICAL', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
  P2_HIGH:     { label: 'P2 HIGH',     color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' },
  P3_MEDIUM:   { label: 'P3 MEDIUM',   color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)',  border: 'rgba(234, 179, 8, 0.4)' },
  P4_LOW:      { label: 'P4 LOW',      color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)' },
};

const STATUS_COLUMNS = [
  { id: 'REPORTED',   label: 'Reported',   color: '#ef4444', desc: 'Pending unit allocation' },
  { id: 'DISPATCHED', label: 'Dispatched', color: '#3b82f6', desc: 'En route to coordinates' },
  { id: 'ON_SCENE',   label: 'On Scene',   color: '#f97316', desc: 'Active rescue & triage' },
  { id: 'CONTAINED',  label: 'Contained',  color: '#8b5cf6', desc: 'Stabilized, evacuating' },
  { id: 'CLOSED',     label: 'Closed',     color: '#10b981', desc: 'Resolved, units RTB' },
];

export default function TacticalCadBoard() {
  const { tokens, isDark } = useTheme();

  const [scenarioId, setScenarioId] = useState(2);
  const [incidents, setIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [fleetTypeFilter, setFleetTypeFilter] = useState('ALL');
  const [selectedIncidentForDispatch, setSelectedIncidentForDispatch] = useState(null);

  // Modals
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
  const [detailsIncident, setDetailsIncident] = useState(null);
  const [alertFeedback, setAlertFeedback] = useState('');

  // New incident form
  const [newTitle, setNewTitle] = useState('');
  const [newDisasterType, setNewDisasterType] = useState('FLOOD');
  const [newPriority, setNewPriority] = useState('P1_CRITICAL');
  const [newAddress, setNewAddress] = useState('');
  const [newVictims, setNewVictims] = useState(1);
  const [newTrapped, setNewTrapped] = useState(0);
  const [newDescription, setNewDescription] = useState('');

  // 1. Fetch Incidents & Fleet Telemetry
  const fetchData = async () => {
    try {
      const [incRes, unitRes] = await Promise.all([
        api.get(`/incidents?scenarioId=${scenarioId}`),
        api.get(`/units?scenarioId=${scenarioId}`)
      ]);
      setIncidents(Array.isArray(incRes.data) ? incRes.data : []);
      setUnits(Array.isArray(unitRes.data) ? unitRes.data : []);
    } catch (e) {
      console.error('Failed to fetch CAD data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [scenarioId]);

  // 2. Incident Status Advance
  const handleUpdateIncidentStatus = async (incidentId, newStatus) => {
    try {
      await api.put(`/incidents/${incidentId}/status?status=${newStatus}`);
      fetchData();
    } catch (e) {
      alert('Failed to update status: ' + (e.response?.data?.message || e.message));
    }
  };

  // 3. Instant Unit Dispatch
  const handleDispatchUnit = async (incidentId, unitId) => {
    try {
      await api.post(`/incidents/${incidentId}/dispatch?unitId=${unitId}`);
      setSelectedIncidentForDispatch(null);
      fetchData();
    } catch (e) {
      alert('Dispatch failed: ' + (e.response?.data?.message || e.message));
    }
  };

  // 4. Update Unit Readiness
  const handleUpdateUnitStatus = async (unitId, status) => {
    try {
      await api.put(`/units/${unitId}/status?status=${status}`);
      fetchData();
    } catch (e) {
      alert('Failed to update unit readiness: ' + (e.response?.data?.message || e.message));
    }
  };

  // 5. Turn Off All Active Alerts
  const handleTurnOffAlerts = async () => {
    try {
      await api.post(`/alerts/cancel-all?scenarioId=${scenarioId}`);
      sessionStorage.setItem(`aidrs_alert_dismissed_${scenarioId}`, 'true');
      setAlertFeedback('All active scenario alerts have been deactivated and silenced.');
      setTimeout(() => setAlertFeedback(''), 4000);
      fetchData();
    } catch (e) {
      alert('Failed to deactivate alerts: ' + (e.response?.data?.message || e.message));
    }
  };

  // 6. Manual Incident Creation
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const coordsMap = {
      1: { x: -118.795, y: 34.035 },
      2: { x: 79.715, y: 30.490 },
      3: { x: 85.831, y: 19.814 },
      4: { x: 78.684, y: 31.036 }
    };
    const center = coordsMap[scenarioId] || coordsMap[2];

    try {
      await api.post('/incidents', {
        scenarioId,
        code: `CAD-${Date.now().toString().slice(-4)}`,
        title: newTitle,
        disasterType: newDisasterType,
        priority: newPriority,
        addressText: newAddress || 'Scenario Operations Zone',
        victimCount: parseInt(newVictims) || 0,
        trappedCount: parseInt(newTrapped) || 0,
        description: newDescription,
        status: 'REPORTED',
        hazardsPresent: 'Pending Reconnaissance',
        location: {
          type: 'Point',
          coordinates: [center.x, center.y]
        }
      });
      setIsNewIncidentOpen(false);
      setNewTitle('');
      setNewAddress('');
      setNewDescription('');
      fetchData();
    } catch (err) {
      alert('Failed to create incident: ' + (err.response?.data?.message || err.message));
    }
  };

  // Computed Metrics
  const activeIncidents = incidents.filter(i => i.status !== 'CLOSED').length;
  const criticalCount = incidents.filter(i => i.priority === 'P1_CRITICAL' && i.status !== 'CLOSED').length;
  const totalTrapped = incidents.reduce((acc, i) => acc + (i.trappedCount || 0), 0);
  const availableUnits = units.filter(u => u.status === 'AVAILABLE').length;
  const deployedUnits = units.filter(u => ['DISPATCHED', 'ON_SCENE'].includes(u.status)).length;

  // Filtered Incidents
  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.addressText?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || inc.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Filtered Fleet Units
  const filteredUnits = units.filter(u => {
    if (fleetTypeFilter === 'ALL') return true;
    return u.unitType?.toUpperCase().includes(fleetTypeFilter.toUpperCase());
  });

  return (
    <div style={{
      maxWidth: 1800,
      margin: '0 auto',
      padding: '16px 22px',
      color: tokens.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ─── Command Header & Live Telemetry Strip ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
        paddingBottom: 14,
        borderBottom: `1px solid ${tokens.border}`
      }}>
        {/* Title & Scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
          }}>
            <Truck size={19} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                CAD & Tactical Dispatch Operations
              </h1>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                FEMA NIMS / ICS-200 UNIFIED
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: tokens.textSec }}>
              Real-Time Incident Lifecycle Queue & Integrated Tactical Fleet Telemetry Dispatch
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Scenario Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: tokens.textMuted }}>SCENARIO:</span>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(Number(e.target.value))}
              style={{
                backgroundColor: isDark ? '#1a2234' : '#f8fafc',
                color: tokens.text,
                border: `1px solid ${tokens.border}`,
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={1}>Scenario 1: Woolsey Fire (Wildfire)</option>
              <option value={2}>Scenario 2: Chamoli Flood (Glacial Breach)</option>
              <option value={3}>Scenario 3: Cyclone Fani (Cat-5 Surge)</option>
              <option value={4}>Scenario 4: Dharali Landslide (Debris Flow)</option>
            </select>
          </div>

          {/* Turn Off Alerts Button */}
          <button
            onClick={handleTurnOffAlerts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Silence sirens and deactivate all active scenario alerts"
          >
            <BellOff size={13} />
            Turn Off Alerts
          </button>

          {/* Civilian SOS Drill */}
          <button
            onClick={() => setIsSosOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)'
            }}
          >
            <LifeBuoy size={13} />
            Civilian SOS Drill
          </button>

          {/* Manual Incident Ticket */}
          <button
            onClick={() => setIsNewIncidentOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: tokens.accent,
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={13} />
            + New Ticket
          </button>

          {/* Refresh / Polling Button */}
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              color: tokens.textSec,
              border: `1px solid ${tokens.border}`,
              padding: '5px 8px',
              borderRadius: 6,
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {/* Alert Feedback Banner (if user turned off alerts) */}
      {alertFeedback && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          color: '#10b981',
          padding: '8px 14px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle2 size={16} />
          {alertFeedback}
        </div>
      )}

      {/* ─── Metric KPI Badges ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '10px 14px'
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: tokens.textMuted, textTransform: 'uppercase' }}>
            ACTIVE INCIDENTS
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: activeIncidents > 0 ? '#ef4444' : tokens.text, marginTop: 2 }}>
            {activeIncidents} <span style={{ fontSize: 11, fontWeight: 500, color: tokens.textMuted }}>/ {incidents.length} Total</span>
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '10px 14px'
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: tokens.textMuted, textTransform: 'uppercase' }}>
            P1 CRITICAL HAZARDS
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316', marginTop: 2 }}>
            {criticalCount}
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '10px 14px'
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: tokens.textMuted, textTransform: 'uppercase' }}>
            REPORTED TRAPPED
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalTrapped > 0 ? '#eab308' : tokens.text, marginTop: 2 }}>
            {totalTrapped} <span style={{ fontSize: 11, fontWeight: 500, color: tokens.textMuted }}>Victims</span>
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '10px 14px'
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: tokens.textMuted, textTransform: 'uppercase' }}>
            FLEET READINESS
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
            {availableUnits} <span style={{ fontSize: 11, fontWeight: 500, color: tokens.textMuted }}>Ready / {deployedUnits} Deployed</span>
          </div>
        </div>
      </div>

      {/* ─── UNIFIED CAD & DISPATCH WORKSTATION (TWO-COLUMN INTERACTIVE) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: 18,
        alignItems: 'start'
      }}>

        {/* ─── LEFT: CAD INCIDENT KANBAN BOARD ─── */}
        <div style={{
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          border: `1px solid ${tokens.border}`,
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* Board Header & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} color={tokens.accent} />
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                Incident Lifecycle Queue (FEMA ICS-200)
              </h2>
            </div>

            {/* Search & Priority Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isDark ? '#1a2234' : '#ffffff',
                border: `1px solid ${tokens.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                gap: 6,
                width: 200
              }}>
                <Search size={13} color={tokens.textMuted} />
                <input
                  type="text"
                  placeholder="Filter tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: tokens.text,
                    fontSize: 11,
                    width: '100%'
                  }}
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  backgroundColor: isDark ? '#1a2234' : '#ffffff',
                  color: tokens.text,
                  border: `1px solid ${tokens.border}`,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="P1_CRITICAL">P1 Critical</option>
                <option value="P2_HIGH">P2 High</option>
                <option value="P3_MEDIUM">P3 Medium</option>
                <option value="P4_LOW">P4 Low</option>
              </select>
            </div>
          </div>

          {/* 5-Column Kanban Board Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(210px, 1fr))',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 8
          }}>
            {STATUS_COLUMNS.map(col => {
              const colIncidents = filteredIncidents.filter(i => i.status === col.id);

              return (
                <div
                  key={col.id}
                  style={{
                    backgroundColor: isDark ? '#162032' : '#ffffff',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 460,
                    maxHeight: 'calc(100vh - 290px)'
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    padding: '8px 10px',
                    borderBottom: `1px solid ${tokens.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isDark ? '#1a263d' : '#f1f5f9',
                    borderTopLeftRadius: 7,
                    borderTopRightRadius: 7
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: col.color }} />
                      <span style={{ fontSize: 11.5, fontWeight: 700 }}>{col.label}</span>
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      color: tokens.textSec
                    }}>
                      {colIncidents.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div style={{
                    padding: 8,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flex: 1
                  }}>
                    {colIncidents.length === 0 ? (
                      <div style={{
                        padding: '24px 8px',
                        textAlign: 'center',
                        fontSize: 11,
                        color: tokens.textMuted,
                        border: `1px dashed ${tokens.border}66`,
                        borderRadius: 6,
                        marginTop: 6
                      }}>
                        No {col.label.toLowerCase()} tickets
                      </div>
                    ) : (
                      colIncidents.map(inc => {
                        const priority = PRIORITY_CONFIG[inc.priority] || PRIORITY_CONFIG.P3_MEDIUM;
                        const assignedUnit = units.find(u => u.id === inc.assignedTeamId);

                        return (
                          <div
                            key={inc.id}
                            style={{
                              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                              border: selectedIncidentForDispatch?.id === inc.id
                                ? `2px solid ${tokens.accent}`
                                : `1px solid ${tokens.border}`,
                              borderRadius: 6,
                              padding: 9,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Card Top: Code & Priority */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                color: tokens.accent
                              }}>
                                {inc.code || 'INCIDENT'}
                              </span>
                              <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 3,
                                color: priority.color,
                                backgroundColor: priority.bg,
                                border: `1px solid ${priority.border}`
                              }}>
                                {priority.label}
                              </span>
                            </div>

                            {/* Title (clickable for full inspector) */}
                            <div
                              onClick={() => setDetailsIncident(inc)}
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                lineHeight: 1.3,
                                cursor: 'pointer',
                                color: tokens.text
                              }}
                            >
                              {inc.title}
                            </div>

                            {/* Address Text */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              color: tokens.textMuted
                            }}>
                              <MapPin size={11} color={tokens.textMuted} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {inc.addressText || 'Operational coordinate'}
                              </span>
                            </div>

                            {/* Casualties / Trapped Pill */}
                            {(inc.trappedCount > 0 || inc.victimCount > 0) && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 10,
                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                                padding: '3px 6px',
                                borderRadius: 4,
                                color: '#ef4444',
                                fontWeight: 700
                              }}>
                                <Users size={11} />
                                <span>{inc.trappedCount || 0} trapped · {inc.victimCount || 0} casualties</span>
                              </div>
                            )}

                            {/* Assigned Team Banner */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 4,
                              borderTop: `1px solid ${tokens.border}44`,
                              fontSize: 10.5
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Truck size={11} color={assignedUnit ? '#10b981' : tokens.textMuted} />
                                <span style={{
                                  fontWeight: assignedUnit ? 700 : 500,
                                  color: assignedUnit ? '#10b981' : tokens.textMuted
                                }}>
                                  {assignedUnit ? assignedUnit.callsign : 'Unassigned'}
                                </span>
                              </div>

                              {/* Quick Dispatch Selector Toggle */}
                              {(!inc.assignedTeamId || inc.status === 'REPORTED') && (
                                <button
                                  onClick={() => setSelectedIncidentForDispatch(inc)}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: 3,
                                    backgroundColor: selectedIncidentForDispatch?.id === inc.id ? '#10b981' : tokens.accent,
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {selectedIncidentForDispatch?.id === inc.id ? 'Select Fleet →' : 'Dispatch'}
                                </button>
                              )}
                            </div>

                            {/* Quick Status Advance Bar */}
                            <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                              {col.id === 'REPORTED' && (
                                <button
                                  onClick={() => handleUpdateIncidentStatus(inc.id, 'DISPATCHED')}
                                  style={{
                                    flex: 1, padding: '3px', background: '#3b82f6', color: '#fff',
                                    border: 'none', borderRadius: 3, fontSize: 9.5, fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  En Route →
                                </button>
                              )}
                              {col.id === 'DISPATCHED' && (
                                <button
                                  onClick={() => handleUpdateIncidentStatus(inc.id, 'ON_SCENE')}
                                  style={{
                                    flex: 1, padding: '3px', background: '#f97316', color: '#fff',
                                    border: 'none', borderRadius: 3, fontSize: 9.5, fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  On Scene →
                                </button>
                              )}
                              {col.id === 'ON_SCENE' && (
                                <button
                                  onClick={() => handleUpdateIncidentStatus(inc.id, 'CONTAINED')}
                                  style={{
                                    flex: 1, padding: '3px', background: '#8b5cf6', color: '#fff',
                                    border: 'none', borderRadius: 3, fontSize: 9.5, fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  Contained →
                                </button>
                              )}
                              {col.id === 'CONTAINED' && (
                                <button
                                  onClick={() => handleUpdateIncidentStatus(inc.id, 'CLOSED')}
                                  style={{
                                    flex: 1, padding: '3px', background: '#10b981', color: '#fff',
                                    border: 'none', borderRadius: 3, fontSize: 9.5, fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  Close & RTB ✓
                                </button>
                              )}
                              {col.id === 'CLOSED' && (
                                <button
                                  onClick={() => handleUpdateIncidentStatus(inc.id, 'REPORTED')}
                                  style={{
                                    flex: 1, padding: '3px', background: 'transparent', color: tokens.textMuted,
                                    border: `1px solid ${tokens.border}`, borderRadius: 3, fontSize: 9.5, cursor: 'pointer'
                                  }}
                                >
                                  Re-open
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT: TACTICAL FLEET DISPATCH CONSOLE ─── */}
        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={16} color="#10b981" />
              <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                Fleet Dispatch Console
              </h2>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>
              {availableUnits} Units Available
            </span>
          </div>

          {/* Prompt if an incident is currently selected for assignment */}
          {selectedIncidentForDispatch ? (
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 11
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#3b82f6' }}>Assigning to {selectedIncidentForDispatch.code}:</strong>
                <button
                  onClick={() => setSelectedIncidentForDispatch(null)}
                  style={{ background: 'transparent', border: 'none', color: tokens.textSec, cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              </div>
              <div style={{ marginTop: 2, color: tokens.text, fontWeight: 600 }}>
                {selectedIncidentForDispatch.title}
              </div>
              <div style={{ fontSize: 10, color: tokens.textMuted, marginTop: 2 }}>
                Click "Assign Unit" on any unit below to execute dispatch.
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: 11,
              color: tokens.textSec,
              backgroundColor: isDark ? '#1a2234' : '#f8fafc',
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${tokens.border}44`
            }}>
              Select an incident or dispatch any available unit below.
            </div>
          )}

          {/* Fleet Filter Tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
            {['ALL', 'USAR', 'MEDIC', 'FIRE', 'AIR', 'BOAT'].map(cat => (
              <button
                key={cat}
                onClick={() => setFleetTypeFilter(cat)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: fleetTypeFilter === cat ? tokens.accent : (isDark ? '#1e293b' : '#f1f5f9'),
                  color: fleetTypeFilter === cat ? '#fff' : tokens.textSec,
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Response Units Scrollable List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 'calc(100vh - 360px)',
            overflowY: 'auto'
          }}>
            {filteredUnits.map(unit => {
              const isAvail = unit.status === 'AVAILABLE';
              const isDisp = unit.status === 'DISPATCHED';
              const isOnScene = unit.status === 'ON_SCENE';
              const assignedInc = incidents.find(i => i.id === unit.activeIncidentId);

              return (
                <div
                  key={unit.id}
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 6,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  {/* Unit Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: isAvail ? '#10b981' : (isDisp ? '#3b82f6' : '#f97316')
                      }} />
                      <strong style={{ fontSize: 12, color: tokens.text }}>
                        {unit.callsign}
                      </strong>
                      <span style={{ fontSize: 10, color: tokens.textMuted }}>
                        ({unit.unitType})
                      </span>
                    </div>

                    {/* Status Toggle Dropdown */}
                    <select
                      value={unit.status}
                      onChange={(e) => handleUpdateUnitStatus(unit.id, e.target.value)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                        color: isAvail ? '#10b981' : (isDisp ? '#3b82f6' : (isOnScene ? '#f97316' : '#94a3b8')),
                        backgroundColor: isAvail ? 'rgba(16, 185, 129, 0.15)' : (isDisp ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)')
                      }}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="DISPATCHED">DISPATCHED</option>
                      <option value="ON_SCENE">ON SCENE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="OFF_DUTY">OFF DUTY</option>
                    </select>
                  </div>

                  {/* Telemetry info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 10.5,
                    color: tokens.textMuted
                  }}>
                    <span>Crew: <strong>{unit.personnelCount}</strong> Responders</span>
                    <span>{unit.assignedStation || 'Central EOC Base'}</span>
                  </div>

                  {/* Active Mission or Standby */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 10.5,
                    paddingTop: 4,
                    borderTop: `1px solid ${tokens.border}33`
                  }}>
                    <div>
                      {assignedInc ? (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                          Mission: {assignedInc.code}
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          Ready for Dispatch
                        </span>
                      )}
                    </div>

                    {/* Dispatch Execution Button */}
                    {selectedIncidentForDispatch ? (
                      <button
                        onClick={() => handleDispatchUnit(selectedIncidentForDispatch.id, unit.id)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          backgroundColor: '#10b981',
                          color: '#fff',
                          border: 'none',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Assign Unit
                      </button>
                    ) : (
                      isAvail && (
                        <button
                          onClick={() => {
                            // Find highest pending reported incident
                            const pending = incidents.find(i => i.status === 'REPORTED');
                            if (pending) {
                              handleDispatchUnit(pending.id, unit.id);
                            } else {
                              alert(`No pending reported incidents. Select an incident on the board first.`);
                            }
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            backgroundColor: tokens.accent,
                            color: '#fff',
                            border: 'none',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Quick Deploy
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── MODAL: NEW INCIDENT ─── */}
      {isNewIncidentOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            backgroundColor: isDark ? '#111827' : '#ffffff',
            border: `1px solid ${tokens.border}`,
            borderRadius: 12,
            width: '100%',
            maxWidth: 520,
            padding: 22,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color={tokens.accent} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Create CAD Incident Ticket
                </h3>
              </div>
              <button
                onClick={() => setIsNewIncidentOpen(false)}
                style={{ background: 'transparent', border: 'none', color: tokens.textSec, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                  INCIDENT TITLE:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flood Ingress / Structural Collapse"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#1a2234' : '#fff',
                    color: tokens.text,
                    fontSize: 12.5,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                    DISASTER TYPE:
                  </label>
                  <select
                    value={newDisasterType}
                    onChange={(e) => setNewDisasterType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="FLOOD">FLOOD</option>
                    <option value="FIRE">WILDFIRE</option>
                    <option value="CYCLONE">CYCLONE</option>
                    <option value="LANDSLIDE">LANDSLIDE</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                    PRIORITY:
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="P1_CRITICAL">P1 CRITICAL</option>
                    <option value="P2_HIGH">P2 HIGH</option>
                    <option value="P3_MEDIUM">P3 MEDIUM</option>
                    <option value="P4_LOW">P4 LOW</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                    VICTIMS COUNT:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newVictims}
                    onChange={(e) => setNewVictims(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                    TRAPPED COUNT:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTrapped}
                    onChange={(e) => setNewTrapped(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                  LOCATION / ADDRESS TEXT:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tapovan Barrage Tunnel Site #2"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#1a2234' : '#fff',
                    color: tokens.text,
                    fontSize: 12.5,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                  HAZARDS / SITUATIONAL DESCRIPTION:
                </label>
                <textarea
                  rows={2}
                  placeholder="Access blockage, structural instability..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#1a2234' : '#fff',
                    color: tokens.text,
                    fontSize: 12,
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsNewIncidentOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: 'transparent',
                    color: tokens.textSec,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 18px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: tokens.accent,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: INCIDENT DETAILS ─── */}
      {detailsIncident && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            backgroundColor: isDark ? '#111827' : '#ffffff',
            border: `1px solid ${tokens.border}`,
            borderRadius: 12,
            width: '100%',
            maxWidth: 500,
            padding: 22,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: tokens.accent, fontFamily: 'monospace' }}>
                  {detailsIncident.code}
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: 16, fontWeight: 700 }}>
                  {detailsIncident.title}
                </h3>
              </div>
              <button
                onClick={() => setDetailsIncident(null)}
                style={{ background: 'transparent', border: 'none', color: tokens.textSec, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div>
                <strong>Status:</strong> {detailsIncident.status}
              </div>
              <div>
                <strong>Priority:</strong> {detailsIncident.priority}
              </div>
              <div>
                <strong>Location:</strong> {detailsIncident.addressText || 'Coordinates registered'}
              </div>
              <div>
                <strong>Casualties / Trapped:</strong> {detailsIncident.victimCount || 0} casualties, {detailsIncident.trappedCount || 0} trapped
              </div>
              {detailsIncident.callerName && (
                <div>
                  <strong>Reported By:</strong> {detailsIncident.callerName} ({detailsIncident.callerPhone || 'No callback'})
                </div>
              )}
              {detailsIncident.medicalNotes && (
                <div>
                  <strong>Medical Notes:</strong> {detailsIncident.medicalNotes}
                </div>
              )}
              {detailsIncident.hazardsPresent && (
                <div>
                  <strong>Hazards Present:</strong> {detailsIncident.hazardsPresent}
                </div>
              )}
              <div>
                <strong>Description:</strong> {detailsIncident.description || 'No additional narrative provided.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setDetailsIncident(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  backgroundColor: tokens.accent,
                  color: '#fff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Civilian SOS Modal */}
      <SosRequestModal
        isOpen={isSosOpen}
        onClose={() => {
          setIsSosOpen(false);
          fetchData();
        }}
        scenarioId={scenarioId}
      />
    </div>
  );
}
