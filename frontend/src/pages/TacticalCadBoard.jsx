import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, Truck, Users, AlertTriangle, CheckCircle2, Clock, MapPin,
  Flame, Droplets, Mountain, Wind, RefreshCw, Send, ChevronRight, Phone,
  Radio, Plus, Activity, Search, Filter, ArrowRight, X, HeartPulse, LifeBuoy
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
  { id: 'REPORTED',   label: 'Reported / Triaged', color: '#ef4444', desc: 'Pending unit allocation' },
  { id: 'DISPATCHED', label: 'Units En Route',     color: '#3b82f6', desc: 'Vehicles traveling to coordinates' },
  { id: 'ON_SCENE',   label: 'Boots On Scene',     color: '#f97316', desc: 'Active triage & extraction' },
  { id: 'CONTAINED',  label: 'Hazard Contained',   color: '#8b5cf6', desc: 'Threat neutralized, stabilizing' },
  { id: 'CLOSED',     label: 'Closed / RTB',       color: '#10b981', desc: 'Resolved, all units RTB' },
];

export default function TacticalCadBoard() {
  const { tokens, isDark } = useTheme();

  const [scenarioId, setScenarioId] = useState(2);
  const [activeTab, setActiveTab] = useState('KANBAN'); // KANBAN, FLEET
  const [incidents, setIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [dispatchModalIncident, setDispatchModalIncident] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
  const [detailsIncident, setDetailsIncident] = useState(null);

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
    const interval = setInterval(fetchData, 6000); // Poll every 6s for dynamic CAD
    return () => clearInterval(interval);
  }, [scenarioId]);

  // 2. Incident Actions
  const handleUpdateIncidentStatus = async (incidentId, newStatus) => {
    try {
      await api.put(`/incidents/${incidentId}/status?status=${newStatus}`);
      fetchData();
    } catch (e) {
      alert('Failed to update incident status: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDispatch = async () => {
    if (!dispatchModalIncident) return;
    try {
      await api.post(`/incidents/${dispatchModalIncident.id}/dispatch${selectedUnitId ? `?unitId=${selectedUnitId}` : ''}`);
      setDispatchModalIncident(null);
      setSelectedUnitId('');
      fetchData();
    } catch (e) {
      alert('Dispatch failed: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleUpdateUnitStatus = async (unitId, status) => {
    try {
      await api.put(`/units/${unitId}/status?status=${status}`);
      fetchData();
    } catch (e) {
      alert('Failed to update unit status: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Approximate scenario center coordinates
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

  // Metrics Calculations
  const totalIncidents = incidents.length;
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

  return (
    <div style={{
      maxWidth: 1600,
      margin: '0 auto',
      padding: '24px 28px',
      color: tokens.text,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* ─── Top Header & Controls ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: `1px solid ${tokens.border}`
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}>
              <Truck size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Tactical CAD Dispatch & Command Operations
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: tokens.textSec }}>
                FEMA NIMS / ICS-200 Compliant Dispatch Queue & Real-Time Telemetry Fleet Tracking
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Scenario Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: tokens.textMuted }}>SCENARIO:</span>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(Number(e.target.value))}
              style={{
                backgroundColor: isDark ? '#1a2234' : '#f8fafc',
                color: tokens.text,
                border: `1px solid ${tokens.border}`,
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={1}>Scenario 1: Woolsey Fire (Wildfire/Evac)</option>
              <option value={2}>Scenario 2: Chamoli Flood (Glacial Breach)</option>
              <option value={3}>Scenario 3: Cyclone Fani (Category 5 Surge)</option>
              <option value={4}>Scenario 4: Dharali Landslide (Debris Flow)</option>
            </select>
          </div>

          {/* Quick SOS Trigger Button */}
          <button
            onClick={() => setIsSosOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)'
            }}
          >
            <LifeBuoy size={14} />
            Civilian SOS Drill
          </button>

          {/* Manual Incident Button */}
          <button
            onClick={() => setIsNewIncidentOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: tokens.accent,
              color: '#fff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            + New Incident
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              color: tokens.textSec,
              border: `1px solid ${tokens.border}`,
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {/* ─── Operational KPI Metric Cards ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '16px 20px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: tokens.textMuted, fontSize: 12, fontWeight: 600 }}>
            <span>ACTIVE INCIDENTS</span>
            <AlertTriangle size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: activeIncidents > 0 ? '#ef4444' : tokens.text }}>
            {activeIncidents} <span style={{ fontSize: 13, fontWeight: 500, color: tokens.textMuted }}>/ {totalIncidents} Total</span>
          </div>
          <div style={{ fontSize: 11, color: tokens.textSec, marginTop: 4 }}>
            Pending triage & active resolution
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '16px 20px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: tokens.textMuted, fontSize: 12, fontWeight: 600 }}>
            <span>P1 CRITICAL HAZARDS</span>
            <ShieldAlert size={16} color="#f97316" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: '#f97316' }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: 11, color: tokens.textSec, marginTop: 4 }}>
            Immediate life-safety threats
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '16px 20px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: tokens.textMuted, fontSize: 12, fontWeight: 600 }}>
            <span>REPORTED TRAPPED</span>
            <Users size={16} color="#eab308" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: totalTrapped > 0 ? '#eab308' : tokens.text }}>
            {totalTrapped} <span style={{ fontSize: 13, fontWeight: 500, color: tokens.textMuted }}>Persons</span>
          </div>
          <div style={{ fontSize: 11, color: tokens.textSec, marginTop: 4 }}>
            USAR & Evac priority targets
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: '16px 20px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: tokens.textMuted, fontSize: 12, fontWeight: 600 }}>
            <span>FIRST RESPONDER FLEET</span>
            <Truck size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: '#10b981' }}>
            {availableUnits} <span style={{ fontSize: 13, fontWeight: 500, color: tokens.textMuted }}>Avail / {deployedUnits} Deployed</span>
          </div>
          <div style={{ fontSize: 11, color: tokens.textSec, marginTop: 4 }}>
            {units.length} Tactical units assigned in scenario
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs & Filters ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20
      }}>
        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: isDark ? '#111827' : '#e2e8f0',
          padding: 3,
          borderRadius: 8,
          border: `1px solid ${tokens.border}`
        }}>
          <button
            onClick={() => setActiveTab('KANBAN')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: activeTab === 'KANBAN' ? tokens.accent : 'transparent',
              color: activeTab === 'KANBAN' ? '#fff' : tokens.textSec,
              cursor: 'pointer'
            }}
          >
            <ShieldAlert size={14} />
            FEMA ICS Incident Board ({filteredIncidents.length})
          </button>
          <button
            onClick={() => setActiveTab('FLEET')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: activeTab === 'FLEET' ? tokens.accent : 'transparent',
              color: activeTab === 'FLEET' ? '#fff' : tokens.textSec,
              cursor: 'pointer'
            }}
          >
            <Truck size={14} />
            Tactical Fleet Telemetry ({units.length} Units)
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDark ? '#111827' : '#ffffff',
            border: `1px solid ${tokens.border}`,
            borderRadius: 6,
            padding: '5px 10px',
            gap: 8,
            width: 240
          }}>
            <Search size={14} color={tokens.textMuted} />
            <input
              type="text"
              placeholder="Search incidents or callsigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: tokens.text,
                fontSize: 12,
                width: '100%'
              }}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              backgroundColor: isDark ? '#111827' : '#ffffff',
              color: tokens.text,
              border: `1px solid ${tokens.border}`,
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="P1_CRITICAL">P1 Critical Only</option>
            <option value="P2_HIGH">P2 High Only</option>
            <option value="P3_MEDIUM">P3 Medium Only</option>
            <option value="P4_LOW">P4 Low Only</option>
          </select>
        </div>
      </div>

      {/* ─── TAB 1: KANBAN BOARD ─── */}
      {activeTab === 'KANBAN' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(280px, 1fr))',
          gap: 16,
          alignItems: 'start',
          overflowX: 'auto',
          paddingBottom: 24
        }}>
          {STATUS_COLUMNS.map(col => {
            const colIncidents = filteredIncidents.filter(i => i.status === col.id);

            return (
              <div
                key={col.id}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 270px)',
                  minHeight: 400
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: '12px 14px',
                  borderBottom: `1px solid ${tokens.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isDark ? '#131d33' : '#f1f5f9',
                  borderTopLeftRadius: 9,
                  borderTopRightRadius: 9
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: col.color
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {col.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    color: tokens.textSec
                  }}>
                    {colIncidents.length}
                  </span>
                </div>

                {/* Subtitle */}
                <div style={{ padding: '6px 14px', fontSize: 11, color: tokens.textMuted, borderBottom: `1px solid ${tokens.border}22` }}>
                  {col.desc}
                </div>

                {/* Column Cards List */}
                <div style={{
                  padding: 10,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  flex: 1
                }}>
                  {colIncidents.length === 0 ? (
                    <div style={{
                      padding: '30px 10px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: tokens.textMuted,
                      border: `1px dashed ${tokens.border}`,
                      borderRadius: 6,
                      marginTop: 10
                    }}>
                      No incidents in {col.label}
                    </div>
                  ) : (
                    colIncidents.map(inc => {
                      const priority = PRIORITY_CONFIG[inc.priority] || PRIORITY_CONFIG.P3_MEDIUM;
                      const assignedUnit = units.find(u => u.id === inc.assignedTeamId);

                      return (
                        <div
                          key={inc.id}
                          style={{
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            border: `1px solid ${tokens.border}`,
                            borderRadius: 8,
                            padding: 12,
                            boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            position: 'relative'
                          }}
                        >
                          {/* Card Top: Code & Priority */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              color: tokens.accent
                            }}>
                              {inc.code || 'INCIDENT'}
                            </span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              color: priority.color,
                              backgroundColor: priority.bg,
                              border: `1px solid ${priority.border}`
                            }}>
                              {priority.label}
                            </span>
                          </div>

                          {/* Title */}
                          <div
                            onClick={() => setDetailsIncident(inc)}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              lineHeight: 1.3,
                              cursor: 'pointer',
                              color: tokens.text
                            }}
                          >
                            {inc.title}
                          </div>

                          {/* Address / Location */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: tokens.textMuted
                          }}>
                            <MapPin size={12} color={tokens.textMuted} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {inc.addressText || 'Operational coordinate'}
                            </span>
                          </div>

                          {/* Casualties / Trapped Pill */}
                          {(inc.trappedCount > 0 || inc.victimCount > 0) && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 11,
                              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                              padding: '4px 8px',
                              borderRadius: 4,
                              color: '#ef4444',
                              fontWeight: 600
                            }}>
                              <Users size={12} />
                              <span>{inc.trappedCount || 0} trapped · {inc.victimCount || 0} casualties</span>
                            </div>
                          )}

                          {/* Assigned Unit Status */}
                          <div style={{
                            fontSize: 11,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: 6,
                            borderTop: `1px solid ${tokens.border}44`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Truck size={12} color={assignedUnit ? '#10b981' : tokens.textMuted} />
                              <span style={{
                                fontWeight: assignedUnit ? 700 : 500,
                                color: assignedUnit ? '#10b981' : tokens.textMuted
                              }}>
                                {assignedUnit ? assignedUnit.callsign : 'Unassigned Unit'}
                              </span>
                            </div>

                            {/* Dispatch Unit Button */}
                            {(!inc.assignedTeamId || inc.status === 'REPORTED') && (
                              <button
                                onClick={() => {
                                  setDispatchModalIncident(inc);
                                  setSelectedUnitId(units.find(u => u.status === 'AVAILABLE')?.id || '');
                                }}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  background: tokens.accent,
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Dispatch
                              </button>
                            )}
                          </div>

                          {/* Quick Lifecycle Status Advance Bar */}
                          <div style={{
                            display: 'flex',
                            gap: 4,
                            marginTop: 4
                          }}>
                            {col.id === 'REPORTED' && (
                              <button
                                onClick={() => handleUpdateIncidentStatus(inc.id, 'DISPATCHED')}
                                style={{
                                  flex: 1,
                                  padding: '4px',
                                  background: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Mark En Route →
                              </button>
                            )}
                            {col.id === 'DISPATCHED' && (
                              <button
                                onClick={() => handleUpdateIncidentStatus(inc.id, 'ON_SCENE')}
                                style={{
                                  flex: 1,
                                  padding: '4px',
                                  background: '#f97316',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Mark On Scene →
                              </button>
                            )}
                            {col.id === 'ON_SCENE' && (
                              <button
                                onClick={() => handleUpdateIncidentStatus(inc.id, 'CONTAINED')}
                                style={{
                                  flex: 1,
                                  padding: '4px',
                                  background: '#8b5cf6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Mark Contained →
                              </button>
                            )}
                            {col.id === 'CONTAINED' && (
                              <button
                                onClick={() => handleUpdateIncidentStatus(inc.id, 'CLOSED')}
                                style={{
                                  flex: 1,
                                  padding: '4px',
                                  background: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Close & RTB ✓
                              </button>
                            )}
                            {col.id === 'CLOSED' && (
                              <button
                                onClick={() => handleUpdateIncidentStatus(inc.id, 'REPORTED')}
                                style={{
                                  flex: 1,
                                  padding: '4px',
                                  background: 'transparent',
                                  color: tokens.textMuted,
                                  border: `1px solid ${tokens.border}`,
                                  borderRadius: 4,
                                  fontSize: 10,
                                  cursor: 'pointer'
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
      )}

      {/* ─── TAB 2: TACTICAL FLEET TELEMETRY TRACKER ─── */}
      {activeTab === 'FLEET' && (
        <div style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${tokens.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                First Responder Fleet Units & Live Status
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: tokens.textSec }}>
                Manage unit readiness, active incident assignments, and real-time telemetry.
              </p>
            </div>
            <div style={{ fontSize: 12, color: tokens.textMuted }}>
              Active Fleet: {units.length} Units
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{
                  backgroundColor: isDark ? '#1a2234' : '#f8fafc',
                  borderBottom: `1px solid ${tokens.border}`,
                  color: tokens.textSec,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '12px 16px' }}>Callsign & Type</th>
                  <th style={{ padding: '12px 16px' }}>Current Status</th>
                  <th style={{ padding: '12px 16px' }}>Personnel</th>
                  <th style={{ padding: '12px 16px' }}>Home Station</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Mission</th>
                  <th style={{ padding: '12px 16px' }}>Telemetry</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {units.map(unit => {
                  const assignedInc = incidents.find(i => i.id === unit.activeIncidentId);
                  const isAvail = unit.status === 'AVAILABLE';
                  const isDisp = unit.status === 'DISPATCHED';
                  const isOnScene = unit.status === 'ON_SCENE';

                  return (
                    <tr
                      key={unit.id}
                      style={{
                        borderBottom: `1px solid ${tokens.border}44`,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Callsign & Type */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: isAvail ? 'rgba(16, 185, 129, 0.15)' : (isDisp ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isAvail ? '#10b981' : (isDisp ? '#3b82f6' : '#f97316')
                          }}>
                            <Truck size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: tokens.text }}>
                              {unit.callsign}
                            </div>
                            <div style={{ fontSize: 11, color: tokens.textMuted }}>
                              {unit.unitType}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={unit.status}
                          onChange={(e) => handleUpdateUnitStatus(unit.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            color: isAvail ? '#10b981' : (isDisp ? '#3b82f6' : (isOnScene ? '#f97316' : '#94a3b8')),
                            backgroundColor: isAvail ? 'rgba(16, 185, 129, 0.15)' : (isDisp ? 'rgba(59, 130, 246, 0.15)' : (isOnScene ? 'rgba(249, 115, 22, 0.15)' : 'rgba(148, 163, 184, 0.15)'))
                          }}
                        >
                          <option value="AVAILABLE">AVAILABLE (READY)</option>
                          <option value="DISPATCHED">DISPATCHED (EN ROUTE)</option>
                          <option value="ON_SCENE">ON_SCENE (WORKING)</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="OFF_DUTY">OFF_DUTY</option>
                        </select>
                      </td>

                      {/* Personnel */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={14} color={tokens.textMuted} />
                          <span style={{ fontWeight: 600 }}>{unit.personnelCount}</span>
                          <span style={{ fontSize: 11, color: tokens.textMuted }}>Crew</span>
                        </div>
                      </td>

                      {/* Station */}
                      <td style={{ padding: '12px 16px', color: tokens.textSec }}>
                        {unit.assignedStation || 'Regional Command Hub'}
                      </td>

                      {/* Mission */}
                      <td style={{ padding: '12px 16px' }}>
                        {assignedInc ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#ef4444',
                              color: '#fff'
                            }}>
                              {assignedInc.code}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: tokens.text }}>
                              {assignedInc.title.slice(0, 24)}...
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: tokens.textMuted, fontStyle: 'italic' }}>
                            Standby / Ready for Dispatch
                          </span>
                        )}
                      </td>

                      {/* Telemetry */}
                      <td style={{ padding: '12px 16px', fontSize: 11, color: tokens.textMuted }}>
                        <div>Spd: {unit.speedKmh ? `${unit.speedKmh} km/h` : '0 km/h (Stationary)'}</div>
                        <div>Hdg: {unit.heading ? `${unit.heading}°` : '0° N'}</div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            // If available, prompt dispatch to highest pending incident
                            const pendingInc = incidents.find(i => i.status === 'REPORTED');
                            if (pendingInc) {
                              setDispatchModalIncident(pendingInc);
                              setSelectedUnitId(unit.id);
                            } else {
                              alert(`Unit ${unit.callsign} is in ${unit.status} status.`);
                            }
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 4,
                            background: isAvail ? tokens.accent : 'transparent',
                            color: isAvail ? '#fff' : tokens.textSec,
                            border: isAvail ? 'none' : `1px solid ${tokens.border}`,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isAvail ? 'Deploy Unit' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: UNIT DISPATCH ─── */}
      {dispatchModalIncident && (
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
            maxWidth: 580,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={20} color={tokens.accent} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Dispatch Tactical Unit to Incident
                </h3>
              </div>
              <button
                onClick={() => setDispatchModalIncident(null)}
                style={{ background: 'transparent', border: 'none', color: tokens.textSec, cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Incident summary */}
            <div style={{
              backgroundColor: isDark ? '#1a2234' : '#f1f5f9',
              padding: 14,
              borderRadius: 8,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: tokens.accent }}>
                <span>{dispatchModalIncident.code}</span>
                <span style={{ color: PRIORITY_CONFIG[dispatchModalIncident.priority]?.color }}>
                  {dispatchModalIncident.priority}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {dispatchModalIncident.title}
              </div>
              <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 4 }}>
                Location: {dispatchModalIncident.addressText || 'Scenario coordinates'}
              </div>
            </div>

            {/* Available Units Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: tokens.textSec }}>
                SELECT AVAILABLE FIRST RESPONDER UNIT:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {units.map(unit => {
                  const isSelected = selectedUnitId === unit.id;
                  const isAvailable = unit.status === 'AVAILABLE';

                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: isSelected ? `2px solid ${tokens.accent}` : `1px solid ${tokens.border}`,
                        backgroundColor: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : (isDark ? '#1a2234' : '#fff'),
                        cursor: 'pointer',
                        opacity: isAvailable ? 1 : 0.7
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Truck size={16} color={isSelected ? tokens.accent : tokens.textMuted} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>
                            {unit.callsign} ({unit.unitType})
                          </div>
                          <div style={{ fontSize: 11, color: tokens.textMuted }}>
                            Crew: {unit.personnelCount} · Station: {unit.assignedStation || 'Regional Base'}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: isAvailable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: isAvailable ? '#10b981' : '#eab308'
                      }}>
                        {unit.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDispatchModalIncident(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: `1px solid ${tokens.border}`,
                  backgroundColor: 'transparent',
                  color: tokens.textSec,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={!selectedUnitId}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: tokens.accent,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: selectedUnitId ? 'pointer' : 'not-allowed',
                  opacity: selectedUnitId ? 1 : 0.5
                }}
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

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
            maxWidth: 540,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={20} color={tokens.accent} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Create CAD Incident Ticket
                </h3>
              </div>
              <button
                onClick={() => setIsNewIncidentOpen(false)}
                style={{ background: 'transparent', border: 'none', color: tokens.textSec, cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                  INCIDENT TITLE:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flash Flood Ingress / Structural Collapse"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#1a2234' : '#fff',
                    color: tokens.text,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                    DISASTER TYPE:
                  </label>
                  <select
                    value={newDisasterType}
                    onChange={(e) => setNewDisasterType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="FLOOD">FLOOD</option>
                    <option value="FIRE">WILDFIRE</option>
                    <option value="CYCLONE">CYCLONE</option>
                    <option value="LANDSLIDE">LANDSLIDE</option>
                    <option value="HAZMAT">HAZMAT / CHEMICAL</option>
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
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 13,
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 13,
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
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      backgroundColor: isDark ? '#1a2234' : '#fff',
                      color: tokens.text,
                      fontSize: 13,
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
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#1a2234' : '#fff',
                    color: tokens.text,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: tokens.textSec }}>
                  DESCRIPTION / HAZARDS:
                </label>
                <textarea
                  rows={3}
                  placeholder="Structural condition, access blockage, urgent medical needs..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#1a2234' : '#fff',
                    color: tokens.text,
                    fontSize: 13,
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsNewIncidentOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: 'transparent',
                    color: tokens.textSec,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: tokens.accent,
                    color: '#fff',
                    fontSize: 13,
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
            maxWidth: 540,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: tokens.accent }}>
                  {detailsIncident.code}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: 18, fontWeight: 700 }}>
                  {detailsIncident.title}
                </h3>
              </div>
              <button
                onClick={() => setDetailsIncident(null)}
                style={{ background: 'transparent', border: 'none', color: tokens.textSec, cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setDetailsIncident(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  backgroundColor: tokens.accent,
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
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
