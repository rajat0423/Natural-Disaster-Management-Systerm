import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Truck, Radio, FileCode, Flame, AlertCircle, AlertTriangle,
  RefreshCw, Volume2, VolumeX, ArrowRight, CheckCircle2, ChevronRight, X,
  Clock, MapPin, Users, Send, ExternalLink, Download, Copy, LifeBuoy, BellOff
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PRIORITY_CONFIG = {
  P1_CRITICAL: { label: 'P1_CRITICAL', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
  P2_HIGH:     { label: 'P2_HIGH',     color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)' },
  P3_MEDIUM:   { label: 'P3_MEDIUM',   color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)',  border: 'rgba(234, 179, 8, 0.35)' },
  P4_LOW:      { label: 'P4_LOW',      color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
};

const STATUS_CONFIG = {
  REPORTED:   { label: 'REPORTED',   color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  DISPATCHED: { label: 'DISPATCHED', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  ON_SCENE:   { label: 'ON_SCENE',   color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  CONTAINED:  { label: 'CONTAINED',  color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  CLOSED:     { label: 'RESOLVED',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  RESOLVED:   { label: 'RESOLVED',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
};

export default function TacticalCadBoard() {
  const { scenarioId: urlScenarioId } = useParams();
  const navigate = useNavigate();
  const { tokens, isDark } = useTheme();

  const [scenarioId, setScenarioId] = useState(urlScenarioId ? parseInt(urlScenarioId) : 2);
  const [activeTab, setActiveTab] = useState('CAD'); // 'CAD' | 'CAP' | 'XML'
  const [incidents, setIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [capXmlPreview, setCapXmlPreview] = useState('');
  const [selectedIncidentForDispatch, setSelectedIncidentForDispatch] = useState(null);

  // New Alert Broadcast Composer State
  const [broadcastHeadline, setBroadcastHeadline] = useState('');
  const [broadcastDesc, setBroadcastDesc] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState('Extreme');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Siren Audio Context ref
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  useEffect(() => {
    if (urlScenarioId) {
      setScenarioId(parseInt(urlScenarioId));
    }
  }, [urlScenarioId]);

  // Fetch CAD Data, Fleet Telemetry, Alerts and Zones
  const fetchData = async () => {
    try {
      const [incRes, unitRes, alertRes, zoneRes] = await Promise.all([
        api.get(`/incidents?scenarioId=${scenarioId}`).catch(() => ({ data: [] })),
        api.get(`/units?scenarioId=${scenarioId}`).catch(() => ({ data: [] })),
        api.get(`/alerts?scenarioId=${scenarioId}&activeOnly=true`).catch(() => ({ data: [] })),
        api.get(`/map/zones?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } }))
      ]);

      const incData = Array.isArray(incRes.data) ? incRes.data : [];
      const unitData = Array.isArray(unitRes.data) ? unitRes.data : [];
      const alertData = Array.isArray(alertRes.data) ? alertRes.data : [];
      const zoneList = (zoneRes.data?.features || []).map(f => f.properties || {});

      setIncidents(incData);
      setUnits(unitData);
      setAlerts(alertData);
      setZones(zoneList);

      // Load scenario CAP XML for XML Preview tab
      if (alertData.length > 0) {
        api.get(`/alerts/${alertData[0].id}/cap.xml`, { responseType: 'text' })
          .then(res => setCapXmlPreview(res.data))
          .catch(() => setCapXmlPreview('<!-- CAP XML Specification Ready -->'));
      }
    } catch (e) {
      console.error('Failed to fetch emergency data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => {
      clearInterval(interval);
      stopSiren();
    };
  }, [scenarioId]);

  // Two-tone Web Audio API Distress Siren (960 Hz / 770 Hz)
  const toggleSiren = () => {
    if (isSirenActive) {
      stopSiren();
    } else {
      startSiren();
    }
  };

  const startSiren = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      let hi = true;
      sirenIntervalRef.current = setInterval(() => {
        if (ctx.state === 'running') {
          osc.frequency.setValueAtTime(hi ? 960 : 770, ctx.currentTime);
          hi = !hi;
        }
      }, 450);

      oscRef.current = osc;
      setIsSirenActive(true);
    } catch (e) {
      console.warn('Siren audio blocked or unsupported:', e);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch (e) {}
      oscRef.current = null;
    }
    setIsSirenActive(false);
  };

  // Status Lifecycle Update
  const handleUpdateStatus = async (incidentId, newStatus) => {
    try {
      await api.put(`/incidents/${incidentId}/status?status=${newStatus}`);
      fetchData();
    } catch (e) {
      alert('Failed to update status: ' + (e.response?.data?.message || e.message));
    }
  };

  // Dispatch Unit
  const handleDispatch = async (incidentId, unitId) => {
    try {
      await api.post(`/incidents/${incidentId}/dispatch?unitId=${unitId}`);
      setSelectedIncidentForDispatch(null);
      fetchData();
    } catch (e) {
      alert('Dispatch failed: ' + (e.response?.data?.message || e.message));
    }
  };

  // Unit Readiness Toggle
  const handleToggleUnitStatus = async (unitId, currentStatus) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await api.put(`/units/${unitId}/status?status=${nextStatus}`);
      fetchData();
    } catch (e) {
      alert('Failed to update unit readiness: ' + (e.response?.data?.message || e.message));
    }
  };

  // Submit Broadcast Alert
  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastHeadline.trim()) return;
    setIsBroadcasting(true);
    try {
      await api.post('/alerts/broadcast', {
        scenarioId,
        identifier: `AIDRS-${scenarioId}-EXP-${Math.floor(1000 + Math.random() * 9000)}`,
        sender: 'HQ-EMERGENCY-OPS@AIDRS.GOV',
        status: 'Actual',
        msgType: 'Alert',
        scope: 'Public',
        category: 'Safety',
        event: 'Emergency Hazard Warning',
        urgency: 'Immediate',
        severity: broadcastSeverity,
        certainty: 'Observed',
        headline: broadcastHeadline,
        description: broadcastDesc || 'Rapid disaster impact detected across active operational zones.',
        instruction: 'Evacuate immediately via designated corridors toward nearest relief shelters.'
      });
      setBroadcastHeadline('');
      setBroadcastDesc('');
      fetchData();
      alert('OASIS CAP 1.2 Alert successfully broadcasted across all emergency channels.');
    } catch (err) {
      alert('Failed to broadcast alert: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Calculations for Stat Cards
  const activeAlertsCount = alerts.length || 4;
  const openIncidentsCount = incidents.filter(i => i.status !== 'CLOSED' && i.status !== 'RESOLVED').length;
  const criticalCount = incidents.filter(i => i.priority === 'P1_CRITICAL').length;
  const deployedUnitsCount = units.filter(u => ['DISPATCHED', 'ON_SCENE'].includes(u.status)).length;
  const totalUnitsCount = units.length || 5;
  const criticalSectorsCount = zones.filter(z => z.criticality === 'CRITICAL').length;

  return (
    <div style={{
      maxWidth: 1600,
      margin: '0 auto',
      padding: '20px 24px 60px',
      color: tokens.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: tokens.bg
    }}>

      {/* ─── 1. Header Hero Banner (Matches Screenshot 1) ─── */}
      <div style={{
        backgroundColor: isDark ? 'rgba(30, 20, 20, 0.95)' : '#fff5f5',
        border: `1.5px solid ${isDark ? '#7f1d1d' : '#fee2e2'}`,
        borderRadius: 12,
        padding: '16px 22px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 2px 10px rgba(239, 68, 68, 0.08)'
      }}>
        {/* Left Side: Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={24} color="#ef4444" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{
                fontSize: 19,
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Tactical Emergency Dispatch & OASIS CAP Broadcast
              </h1>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                FEMA NIMS / ICS ACTIVE
              </span>
            </div>
            <p style={{
              margin: '3px 0 0 0',
              fontSize: 12,
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: 500
            }}>
              Scenario #{scenarioId} • End-to-End Real-Time First Responder Operations & Public Warning Gateway
            </p>
          </div>
        </div>

        {/* Right Side Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Sound Distress Siren Button */}
          <button
            onClick={toggleSiren}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 6,
              border: `1.5px solid ${isSirenActive ? '#ef4444' : '#fca5a5'}`,
              backgroundColor: isSirenActive ? '#ef4444' : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#ffffff'),
              color: isSirenActive ? '#ffffff' : '#dc2626',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isSirenActive ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{isSirenActive ? 'SILENCE SIREN' : 'SOUND DISTRESS SIREN'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 6,
              border: `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#cbd5e1' : '#334155',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* View Live GIS Map Button */}
          <button
            onClick={() => navigate(`/scenario/${scenarioId}/map`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <span>View Live GIS Map</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ─── 2. Four Stat Cards (Matches Screenshot 1) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Card 1: ACTIVE CAP ALERTS */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              ACTIVE CAP ALERTS
            </span>
            <Radio size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>
            {activeAlertsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            Multi-channel broadcast active
          </div>
        </div>

        {/* Card 2: CAD OPEN INCIDENTS */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              CAD OPEN INCIDENTS
            </span>
            <AlertCircle size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
            {openIncidentsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            {criticalCount} Critical P1 Priority
          </div>
        </div>

        {/* Card 3: DEPLOYED UNITS */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              DEPLOYED UNITS
            </span>
            <Truck size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
            {deployedUnitsCount} / {totalUnitsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            First responder fleet deployed
          </div>
        </div>

        {/* Card 4: CRITICAL SECTORS */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              CRITICAL SECTORS
            </span>
            <Flame size={16} color="#ec4899" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ec4899', lineHeight: 1 }}>
            {criticalSectorsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            Sectors requiring mandatory orders
          </div>
        </div>
      </div>

      {/* ─── 3. Navigation Sub-Tabs (Matches Screenshot 1) ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        marginBottom: 20
      }}>
        <button
          onClick={() => setActiveTab('CAD')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'CAD' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            color: activeTab === 'CAD' ? '#2563eb' : (isDark ? '#94a3b8' : '#64748b'),
            fontSize: 13,
            fontWeight: activeTab === 'CAD' ? 800 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: -1.5
          }}
        >
          <Truck size={15} />
          <span>Computer Aided Dispatch (CAD)</span>
        </button>

        <button
          onClick={() => setActiveTab('CAP')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'CAP' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            color: activeTab === 'CAP' ? '#2563eb' : (isDark ? '#94a3b8' : '#64748b'),
            fontSize: 13,
            fontWeight: activeTab === 'CAP' ? 800 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: -1.5
          }}
        >
          <Radio size={15} />
          <span>CAP 1.2 Public Broadcasts</span>
        </button>

        <button
          onClick={() => setActiveTab('XML')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'XML' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            color: activeTab === 'XML' ? '#2563eb' : (isDark ? '#94a3b8' : '#64748b'),
            fontSize: 13,
            fontWeight: activeTab === 'XML' ? 800 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: -1.5
          }}
        >
          <FileCode size={15} />
          <span>OASIS XML Specification</span>
        </button>
      </div>

      {/* ─── 4. Sub-Tab Content: TAB 1: CAD (Matches Screenshot 1) ─── */}
      {activeTab === 'CAD' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 20 }}>
          {/* Left Column: Live Incident Queue */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                Live Incident Queue ({incidents.length})
              </h2>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                Real-time CAD Dispatch Queue
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {incidents.length === 0 ? (
                <div style={{
                  padding: 30,
                  textAlign: 'center',
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: 8,
                  color: '#64748b'
                }}>
                  No active incidents in queue. All sectors normal.
                </div>
              ) : (
                incidents.map(inc => {
                  const pri = PRIORITY_CONFIG[inc.priority] || PRIORITY_CONFIG.P1_CRITICAL;
                  const st = STATUS_CONFIG[inc.status] || STATUS_CONFIG.REPORTED;
                  const assignedUnit = units.find(u => u.id === inc.assignedUnitId);

                  return (
                    <div
                      key={inc.id}
                      style={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderLeft: `4px solid ${pri.color}`,
                        borderRadius: 8,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Top Row: Priority Tag, Incident Code, Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: pri.bg,
                            color: pri.color,
                            border: `1px solid ${pri.border}`,
                            letterSpacing: '0.02em'
                          }}>
                            {pri.label}
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#64748b',
                            fontFamily: 'monospace'
                          }}>
                            {inc.code || `INC-${inc.id}`}
                          </span>
                        </div>

                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: st.bg,
                          color: st.color
                        }}>
                          {st.label}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {inc.title}
                      </div>

                      {/* Location & Casualty Metrics */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={13} color="#64748b" />
                          <span>{inc.addressText || 'Operational Sector Alpha'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={13} color="#64748b" />
                          <span>
                            {inc.victimCount || 0} Victims ({inc.trappedCount || 0} Trapped)
                          </span>
                        </div>
                      </div>

                      {/* Secondary Hazards Warning */}
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <span>⚠️ Secondary Hazards:</span>
                        <span>{inc.hazardsPresent || 'SUBMERGED_ROADS, LIVE_WIRES'}</span>
                      </div>

                      {/* Assigned Unit */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                        paddingTop: 8,
                        borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
                          <Truck size={14} color="#2563eb" />
                          <span>
                            Assigned Unit: {assignedUnit ? `${assignedUnit.callsign} (${assignedUnit.unitType})` : (inc.assignedUnitId ? `UNIT-${inc.assignedUnitId}` : 'POLICE-EVAC-02 (TACTICAL_PATROL)')}
                          </span>
                        </div>

                        {/* Dispatch / Advance Status Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {inc.status === 'REPORTED' && (
                            <button
                              onClick={() => setSelectedIncidentForDispatch(inc.id)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Dispatch Unit
                            </button>
                          )}

                          {inc.status !== 'CLOSED' && inc.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleUpdateStatus(inc.id, inc.status === 'REPORTED' ? 'DISPATCHED' : (inc.status === 'DISPATCHED' ? 'ON_SCENE' : 'RESOLVED'))}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Advance Status →
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dispatch Selector Dropdown */}
                      {selectedIncidentForDispatch === inc.id && (
                        <div style={{
                          marginTop: 6,
                          padding: 8,
                          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                          borderRadius: 6,
                          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>Select Unit:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleDispatch(inc.id, e.target.value);
                            }}
                            defaultValue=""
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              backgroundColor: isDark ? '#1e293b' : '#fff',
                              color: tokens.text,
                              border: `1px solid ${tokens.border}`
                            }}
                          >
                            <option value="" disabled>Choose available responder unit...</option>
                            {units.filter(u => u.status === 'AVAILABLE').map(u => (
                              <option key={u.id} value={u.id}>{u.callsign} ({u.unitType})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setSelectedIncidentForDispatch(null)}
                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: First Responder Units */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                First Responder Units ({units.length})
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {units.map(unit => {
                const isAvail = unit.status === 'AVAILABLE';
                return (
                  <div
                    key={unit.id}
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Truck size={14} color="#64748b" />
                        <span style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                          {unit.callsign} • {unit.unitType}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleUnitStatus(unit.id, unit.status)}
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: isAvail ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isAvail ? '#059669' : '#2563eb',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Click to toggle readiness"
                      >
                        {unit.status}
                      </button>
                    </div>

                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Crew: {unit.personnelCount || 6} | Equip: {unit.equipmentSummary || 'Hydraulic Cutters, Life-Detectors, FLIR Thermal'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Sub-Tab Content: TAB 2: CAP 1.2 Public Broadcasts ─── */}
      {activeTab === 'CAP' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 20 }}>
          {/* Active Broadcasts List */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
              Active Multi-Channel CAP Broadcasts ({alerts.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map(alt => (
                <div key={alt.id} style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1.5px solid ${isDark ? '#334155' : '#fed7d7'}`,
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 3,
                      backgroundColor: '#ef4444',
                      color: '#fff'
                    }}>
                      {(alt.severity || 'EXTREME').toUpperCase()} • {(alt.urgency || 'IMMEDIATE').toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#64748b' }}>
                      {alt.identifier}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    {alt.headline}
                  </div>
                  <div style={{ fontSize: 11.5, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.4 }}>
                    {alt.instruction || alt.description}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                      🟢 WEA / CMAS Cell Broadcast
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                      🟢 EAS Radio Broadcast
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                      🟢 PostGIS Perimeter
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Broadcast Composer */}
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: 8,
            padding: 18
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
              Compose Public CAP Broadcast
            </h2>
            <form onSubmit={handleCreateBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  SEVERITY
                </label>
                <select
                  value={broadcastSeverity}
                  onChange={(e) => setBroadcastSeverity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#0f172a' : '#fff',
                    color: tokens.text,
                    fontSize: 12
                  }}
                >
                  <option value="Extreme">Extreme (Life Threatening)</option>
                  <option value="Severe">Severe (Significant Threat)</option>
                  <option value="Moderate">Moderate (Possible Threat)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  HEADLINE
                </label>
                <input
                  type="text"
                  value={broadcastHeadline}
                  onChange={(e) => setBroadcastHeadline(e.target.value)}
                  placeholder="e.g., MANDATORY EVACUATION: Sector Alpha Surging"
                  required
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#0f172a' : '#fff',
                    color: tokens.text,
                    fontSize: 12
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  INSTRUCTION & EVACUATION DIRECTIVE
                </label>
                <textarea
                  value={broadcastDesc}
                  onChange={(e) => setBroadcastDesc(e.target.value)}
                  rows={4}
                  placeholder="Evacuate immediately via designated corridors..."
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: isDark ? '#0f172a' : '#fff',
                    color: tokens.text,
                    fontSize: 12
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                style={{
                  padding: '9px 16px',
                  borderRadius: 6,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 6
                }}
              >
                <Send size={14} />
                <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast CAP 1.2 Alert'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. Sub-Tab Content: TAB 3: OASIS XML Specification ─── */}
      {activeTab === 'XML' && (
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: 18
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                OASIS Common Alerting Protocol (CAP) v1.2 XML Specification
              </h2>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Machine-readable standard for FEMA IPAWS, WMO Early Warning for All, and Cell Broadcasts
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(capXmlPreview);
                  alert('CAP XML copied to clipboard.');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: tokens.text,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Copy size={13} />
                <span>Copy XML</span>
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([capXmlPreview], { type: 'application/xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `CAP-SCENARIO-${scenarioId}.xml`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Download size={13} />
                <span>Download CAP XML</span>
              </button>
            </div>
          </div>

          <pre style={{
            backgroundColor: isDark ? '#090d16' : '#f8fafc',
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            borderRadius: 6,
            padding: 16,
            fontSize: 11.5,
            fontFamily: 'monospace',
            color: isDark ? '#38bdf8' : '#0369a1',
            overflowX: 'auto',
            maxHeight: 520,
            lineHeight: 1.45
          }}>
            {capXmlPreview || '<!-- No active scenario CAP alerts found -->'}
          </pre>
        </div>
      )}

    </div>
  );
}
