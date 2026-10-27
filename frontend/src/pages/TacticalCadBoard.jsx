import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Truck, Radio, FileCode, Flame, AlertCircle, AlertTriangle,
  RefreshCw, Volume2, VolumeX, ArrowRight, CheckCircle2, ChevronRight, X,
  Clock, MapPin, Users, Send, ExternalLink, Download, Copy, LifeBuoy, BellOff,
  Search, Filter, Plus, Zap, Navigation, Award, Check, PhoneCall, Activity
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const PRIORITY_CONFIG = {
  P1_CRITICAL: { label: 'P1 CRITICAL', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
  P2_HIGH:     { label: 'P2 HIGH',     color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)' },
  P3_MEDIUM:   { label: 'P3 MEDIUM',   color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)',  border: 'rgba(234, 179, 8, 0.35)' },
  P4_LOW:      { label: 'P4 LOW',      color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
};

const STATUS_CONFIG = {
  REPORTED:   { label: 'REPORTED',   color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#fca5a5' },
  DISPATCHED: { label: 'DISPATCHED', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)', border: '#93c5fd' },
  ON_SCENE:   { label: 'ON SCENE',   color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: '#fdba74' },
  CONTAINED:  { label: 'CONTAINED',  color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: '#c4b5fd' },
  CLOSED:     { label: 'RESOLVED',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: '#6ee7b7' },
  RESOLVED:   { label: 'RESOLVED',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: '#6ee7b7' }
};

const SERVICES = [
  { id: 'ALL',    label: 'All Services',            icon: LifeBuoy,     color: '#3b82f6', types: [] },
  { id: 'FIRE',   label: 'Fire & Suppression',      icon: Flame,        color: '#ef4444', types: ['FIRE_ENGINE', 'LADDER_TRUCK', 'WATER_TENDER'] },
  { id: 'EMS',    label: 'Medical EMS',             icon: LifeBuoy,     color: '#10b981', types: ['AMBULANCE', 'MOBILE_ICU', 'PARAMEDIC_SQUAD'] },
  { id: 'SAR',    label: 'Search & Rescue (USAR)',  icon: Users,        color: '#f59e0b', types: ['RESCUE_SQUAD', 'USAR_TEAM', 'K9_SEARCH'] },
  { id: 'POLICE', label: 'Police & Evac Patrol',    icon: ShieldAlert,  color: '#6366f1', types: ['TACTICAL_PATROL', 'TRAFFIC_ESCORT', 'PERIMETER_SECURITY'] },
  { id: 'HAZMAT', label: 'Hazmat Decon',            icon: AlertTriangle,color: '#a855f7', types: ['HAZMAT_TRUCK', 'DECON_UNIT'] },
  { id: 'EVAC',   label: 'Civilian Transport',      icon: Truck,        color: '#06b6d4', types: ['EVAC_BUS', 'HIGH_WATER_TRANSPORT', 'RELIEF_SHUTTLE'] }
];

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

  // Interactive Selection State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('ALL');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [unitStatusFilter, setUnitStatusFilter] = useState('ALL');

  // Interactive Dispatch Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchModalTarget, setDispatchModalTarget] = useState({ type: 'INCIDENT', item: null });
  const [dispatchModalService, setDispatchModalService] = useState('ALL');
  const [dispatchModalUnitId, setDispatchModalUnitId] = useState('');
  const [dispatchModalNotes, setDispatchModalNotes] = useState('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);

  // New CAD Incident Modal State
  const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    title: '',
    priority: 'P1_CRITICAL',
    category: 'FIRE',
    addressText: '',
    victimCount: 1,
    trappedCount: 0,
    hazardsPresent: 'STRUCTURAL_COMPROMISE'
  });

  // Action Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  // Live CAD Operational Activity Log
  const [dispatchLogs, setDispatchLogs] = useState([
    { id: 1, time: 'Initial Sync', text: 'CAD Central synchronized with FEMA ICS Operational Sector Command', type: 'system' }
  ]);

  // Alert Broadcast Composer State
  const [broadcastHeadline, setBroadcastHeadline] = useState('');
  const [broadcastDesc, setBroadcastDesc] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState('Extreme');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Siren Audio Context ref
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const addLog = (text, type = 'dispatch') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setDispatchLogs(prev => [{ id: Date.now(), time: timeStr, text, type }, ...prev.slice(0, 24)]);
  };

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
      addLog('Acoustic distress siren activated across command frequency', 'warning');
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
      const targetInc = incidents.find(i => i.id === incidentId);
      const title = targetInc ? targetInc.title : `INC-${incidentId}`;
      addLog(`Status of ${title} updated to ${newStatus}`, 'status');
      showToast(`Incident status updated to ${newStatus}!`);
      fetchData();
    } catch (e) {
      alert('Failed to update status: ' + (e.response?.data?.message || e.message));
    }
  };

  // Unit Readiness Toggle
  const handleToggleUnitStatus = async (unitId, currentStatus) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await api.put(`/units/${unitId}/status?status=${nextStatus}`);
      const u = units.find(unit => unit.id === unitId);
      const name = u ? u.callsign : `Unit-${unitId}`;
      addLog(`${name} status toggled to ${nextStatus}`, 'unit');
      showToast(`${name} is now ${nextStatus}!`);
      fetchData();
    } catch (e) {
      alert('Failed to update unit readiness: ' + (e.response?.data?.message || e.message));
    }
  };

  // Open Interactive Dispatch Modal
  const openDispatchModal = (type, item, preselectedService = 'ALL') => {
    setDispatchModalTarget({ type, item });
    setDispatchModalService(preselectedService);
    
    // Auto-select first available unit
    const avail = units.filter(u => u.status === 'AVAILABLE');
    setDispatchModalUnitId(avail.length > 0 ? avail[0].id : (units.length > 0 ? units[0].id : ''));
    
    const targetName = type === 'INCIDENT' 
      ? (item?.title || `Incident #${item?.id}`) 
      : (item?.name || 'Operational Sector');
    setDispatchModalNotes(`Emergency first responder assignment to ${targetName}. Deploy priority rescue equipment.`);
    setIsDispatchModalOpen(true);
  };

  // 1-Click Fast Dispatch
  const handleFastDispatch = async (incident) => {
    // Find matching available unit
    const avail = units.filter(u => u.status === 'AVAILABLE');
    const unitToDispatch = avail.length > 0 ? avail[0] : (units.length > 0 ? units[0] : null);

    if (!unitToDispatch) {
      alert('No tactical units available for immediate dispatch.');
      return;
    }

    try {
      await api.post(`/incidents/${incident.id}/dispatch?unitId=${unitToDispatch.id}`);
      addLog(`🚀 Fast Dispatch: ${unitToDispatch.callsign} (${unitToDispatch.unitType}) deployed to ${incident.title}`, 'dispatch');
      showToast(`Unit ${unitToDispatch.callsign} dispatched to ${incident.title}! Status: EN ROUTE`);
      fetchData();
    } catch (e) {
      alert('Fast dispatch failed: ' + (e.response?.data?.message || e.message));
    }
  };

  // Submit Modal Dispatch
  const handleExecuteDispatch = async () => {
    if (!dispatchModalUnitId) {
      alert('Please select a first responder unit to dispatch.');
      return;
    }

    setIsSubmittingDispatch(true);
    const chosenUnit = units.find(u => u.id == dispatchModalUnitId);
    const unitName = chosenUnit ? chosenUnit.callsign : 'Tactical Unit';

    try {
      if (dispatchModalTarget.type === 'INCIDENT' && dispatchModalTarget.item) {
        await api.post(`/incidents/${dispatchModalTarget.item.id}/dispatch?unitId=${dispatchModalUnitId}`);
        addLog(`🚒 Dispatched ${unitName} to Incident "${dispatchModalTarget.item.title}"`, 'dispatch');
        showToast(`${unitName} successfully dispatched! Status: EN ROUTE`);
      } else if (dispatchModalTarget.type === 'ZONE' && dispatchModalTarget.item) {
        const zoneId = dispatchModalTarget.item.id;
        const notes = encodeURIComponent(dispatchModalNotes);
        await api.post(`/incidents/dispatch-to-zone?scenarioId=${scenarioId}&zoneId=${zoneId}&unitId=${dispatchModalUnitId}&notes=${notes}`);
        addLog(`🚒 Dispatched ${unitName} to Sector Apex "${dispatchModalTarget.item.name}"`, 'dispatch');
        showToast(`${unitName} deployed to ${dispatchModalTarget.item.name}! Status: EN ROUTE`);
      }
      setIsDispatchModalOpen(false);
      fetchData();
    } catch (e) {
      alert('Dispatch failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Submit New Incident / 911 Call
  const handleCreateNewIncident = async (e) => {
    e.preventDefault();
    if (!newIncidentForm.title.trim()) return;

    try {
      const payload = {
        scenarioId,
        title: newIncidentForm.title,
        priority: newIncidentForm.priority,
        status: 'REPORTED',
        category: newIncidentForm.category,
        addressText: newIncidentForm.addressText || `Operational Sector Alpha, Block ${Math.floor(Math.random() * 50) + 1}`,
        victimCount: parseInt(newIncidentForm.victimCount) || 1,
        trappedCount: parseInt(newIncidentForm.trappedCount) || 0,
        hazardsPresent: newIncidentForm.hazardsPresent || 'DEBRIS_COLLAPSE'
      };

      const res = await api.post('/incidents', payload);
      addLog(`🚨 New 911 Call Logged: "${payload.title}" (${payload.priority})`, 'incident');
      showToast(`New Incident logged into CAD queue!`);
      setIsNewIncidentModalOpen(false);
      setNewIncidentForm({
        title: '',
        priority: 'P1_CRITICAL',
        category: 'FIRE',
        addressText: '',
        victimCount: 1,
        trappedCount: 0,
        hazardsPresent: 'STRUCTURAL_COMPROMISE'
      });
      fetchData();

      // Offer immediate dispatch
      if (res.data) {
        setSelectedIncident(res.data);
      }
    } catch (e) {
      alert('Failed to create incident: ' + (e.response?.data?.message || e.message));
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
      addLog(`📢 Public CAP 1.2 Alert Broadcast: "${broadcastHeadline}"`, 'broadcast');
      showToast('OASIS CAP 1.2 Alert successfully broadcasted across all emergency channels.');
      fetchData();
    } catch (err) {
      alert('Failed to broadcast alert: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (incidentStatusFilter === 'OPEN' && (inc.status === 'CLOSED' || inc.status === 'RESOLVED')) return false;
      if (incidentStatusFilter !== 'ALL' && incidentStatusFilter !== 'OPEN' && inc.status !== incidentStatusFilter) return false;
      if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = inc.title && inc.title.toLowerCase().includes(q);
        const matchesAddr = inc.addressText && inc.addressText.toLowerCase().includes(q);
        const matchesCode = inc.code && inc.code.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAddr && !matchesCode) return false;
      }
      return true;
    });
  }, [incidents, incidentStatusFilter, priorityFilter, searchQuery]);

  // Filtered Units based on service & status
  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      if (unitStatusFilter === 'AVAILABLE' && u.status !== 'AVAILABLE') return false;
      if (unitStatusFilter === 'DEPLOYED' && !['DISPATCHED', 'ON_SCENE'].includes(u.status)) return false;
      if (selectedServiceFilter !== 'ALL') {
        const sDef = SERVICES.find(s => s.id === selectedServiceFilter);
        if (sDef && sDef.types.length > 0 && !sDef.types.includes(u.unitType)) return false;
      }
      return true;
    });
  }, [units, unitStatusFilter, selectedServiceFilter]);

  // Stat Calculations
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

      {/* ─── 0. Toast Notification ─── */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 70,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 18px',
          borderRadius: 8,
          backgroundColor: isDark ? 'rgba(6, 78, 59, 0.98)' : '#ecfdf5',
          border: `1.5px solid ${isDark ? '#059669' : '#10b981'}`,
          color: isDark ? '#a7f3d0' : '#065f46',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          fontWeight: 700,
          fontSize: 12,
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* ─── 1. Header Hero Banner ─── */}
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
        marginBottom: 18,
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 2px 10px rgba(239, 68, 68, 0.08)'
      }}>
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
              Scenario #{scenarioId} • Interactive First Responder Telemetry, CAD Service Dispatch & 911 Triage
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsNewIncidentModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)'
            }}
          >
            <Plus size={14} />
            <span>+ Log 911 Call</span>
          </button>

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
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)'
            }}
          >
            <span>View Live GIS Map</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ─── 2. Four Stat Cards ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 14,
        marginBottom: 18
      }}>
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              ACTIVE CAP ALERTS
            </span>
            <Radio size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>
            {activeAlertsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Multi-channel broadcast active
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              CAD OPEN INCIDENTS
            </span>
            <AlertCircle size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
            {openIncidentsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {criticalCount} Critical P1 Priority
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              DEPLOYED UNITS
            </span>
            <Truck size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
            {deployedUnitsCount} / {totalUnitsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            First responder fleet deployed
          </div>
        </div>

        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
              CRITICAL SECTORS
            </span>
            <Flame size={16} color="#ec4899" />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#ec4899', lineHeight: 1 }}>
            {criticalSectorsCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Sectors requiring mandatory orders
          </div>
        </div>
      </div>

      {/* ─── 3. Navigation Sub-Tabs ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        marginBottom: 16
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
          <span>Computer Aided Dispatch (CAD) Console</span>
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

      {/* ─── 4. Sub-Tab Content: TAB 1: CAD CONSOLE ─── */}
      {activeTab === 'CAD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 4A. INTERACTIVE SERVICE DISPATCH SELECTOR BAR (Select & Dispatch Services) */}
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color="#f59e0b" />
                <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  TACTICAL SERVICE SELECTION & RAPID DISPATCH DOCK
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Select service category to filter fleet and dispatch responders
                </span>
              </div>

              {/* Quick Action: Dispatch Service directly to Sector */}
              <button
                onClick={() => openDispatchModal('ZONE', zones[0] || null, selectedServiceFilter)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                }}
              >
                <Navigation size={13} />
                <span>⚡ Dispatch Service to Zone Apex</span>
              </button>
            </div>

            {/* Service Category Buttons */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {SERVICES.map(svc => {
                const IconComponent = svc.icon;
                const isSelected = selectedServiceFilter === svc.id;
                // Count available units for this service
                const availCount = svc.id === 'ALL'
                  ? units.filter(u => u.status === 'AVAILABLE').length
                  : units.filter(u => u.status === 'AVAILABLE' && svc.types.includes(u.unitType)).length;

                return (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedServiceFilter(svc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${isSelected ? svc.color : (isDark ? '#334155' : '#e2e8f0')}`,
                      backgroundColor: isSelected 
                        ? (isDark ? `${svc.color}25` : `${svc.color}15`)
                        : (isDark ? '#0f172a' : '#f8fafc'),
                      color: isSelected ? svc.color : (isDark ? '#cbd5e1' : '#475569'),
                      fontSize: 11.5,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <IconComponent size={14} color={svc.color} />
                    <span>{svc.label}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 10,
                      backgroundColor: availCount > 0 ? '#dcfce7' : '#fee2e2',
                      color: availCount > 0 ? '#166534' : '#991b1b'
                    }}>
                      {availCount} avail
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4B. CAD INTERACTIVE FILTER & SEARCH BAR */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: 8,
            padding: '10px 14px'
          }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
              borderRadius: 6,
              padding: '6px 12px',
              minWidth: 260,
              flex: 1
            }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Filter incidents by title, code, address, hazard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: tokens.text,
                  fontSize: 11.5,
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Incident Status Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginRight: 4 }}>Status:</span>
              {['ALL', 'OPEN', 'REPORTED', 'DISPATCHED', 'ON_SCENE', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  onClick={() => setIncidentStatusFilter(st)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 10.5,
                    fontWeight: incidentStatusFilter === st ? 800 : 600,
                    border: 'none',
                    backgroundColor: incidentStatusFilter === st ? '#2563eb' : (isDark ? '#0f172a' : '#f1f5f9'),
                    color: incidentStatusFilter === st ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginRight: 4 }}>Priority:</span>
              {['ALL', 'P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM'].map(p => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 10.5,
                    fontWeight: priorityFilter === p ? 800 : 600,
                    border: 'none',
                    backgroundColor: priorityFilter === p ? '#d97706' : (isDark ? '#0f172a' : '#f1f5f9'),
                    color: priorityFilter === p ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                    cursor: 'pointer'
                  }}
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* 4C. MAIN CAD SPLIT: INCIDENT QUEUE & FIRST RESPONDER UNITS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: 18 }}>

            {/* LEFT COLUMN: LIVE INCIDENT QUEUE */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                    Live Incident Dispatch Queue ({filteredIncidents.length})
                  </h2>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Click an incident to select & dispatch
                  </span>
                </div>

                <button
                  onClick={() => setIsNewIncidentModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 5,
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                    color: tokens.text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={12} color="#ef4444" />
                  <span>+ New 911 Call</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredIncidents.length === 0 ? (
                  <div style={{
                    padding: 30,
                    textAlign: 'center',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: 8,
                    color: '#64748b'
                  }}>
                    No incidents match current filter criteria.
                  </div>
                ) : (
                  filteredIncidents.map(inc => {
                    const pri = PRIORITY_CONFIG[inc.priority] || PRIORITY_CONFIG.P1_CRITICAL;
                    const st = STATUS_CONFIG[inc.status] || STATUS_CONFIG.REPORTED;
                    const assignedUnit = units.find(u => u.id === inc.assignedUnitId);
                    const isSelected = selectedIncident?.id === inc.id;

                    return (
                      <div
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        style={{
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0')}`,
                          borderLeft: `5px solid ${pri.color}`,
                          borderRadius: 8,
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          boxShadow: isSelected 
                            ? '0 0 0 2px rgba(37, 99, 235, 0.25), 0 4px 12px rgba(0,0,0,0.1)' 
                            : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Top Row */}
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

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: st.bg,
                              color: st.color,
                              border: `1px solid ${st.border || 'transparent'}`
                            }}>
                              {st.label}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                          {inc.title}
                        </div>

                        {/* Location & Casualty Metrics */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, color: isDark ? '#cbd5e1' : '#475569' }}>
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
                        {inc.hazardsPresent && (
                          <div style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <span>⚠️ Hazards:</span>
                            <span>{inc.hazardsPresent}</span>
                          </div>
                        )}

                        {/* Assigned Responder Unit Info */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 8,
                          borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#2563eb' }}>
                            <Truck size={14} color="#2563eb" />
                            <span>
                              Assigned: {assignedUnit ? `${assignedUnit.callsign} (${assignedUnit.unitType})` : 'UNASSIGNED - PENDING DISPATCH'}
                            </span>
                          </div>

                          {/* Interactive Dispatch & Status Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            {/* Fast Dispatch Button */}
                            {(!assignedUnit || inc.status === 'REPORTED') && (
                              <>
                                <button
                                  onClick={() => handleFastDispatch(inc)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 9px',
                                    borderRadius: 4,
                                    backgroundColor: '#059669',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                  title="Instantly dispatch nearest available tactical unit"
                                >
                                  <Zap size={11} />
                                  <span>Fast Dispatch</span>
                                </button>

                                <button
                                  onClick={() => openDispatchModal('INCIDENT', inc, selectedServiceFilter)}
                                  style={{
                                    padding: '4px 9px',
                                    borderRadius: 4,
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Select Unit...
                                </button>
                              </>
                            )}

                            {/* Status Progression Buttons */}
                            {inc.status === 'DISPATCHED' && (
                              <button
                                onClick={() => handleUpdateStatus(inc.id, 'ON_SCENE')}
                                style={{
                                  padding: '4px 9px',
                                  borderRadius: 4,
                                  backgroundColor: '#ea580c',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Mark On-Scene 📍
                              </button>
                            )}

                            {inc.status === 'ON_SCENE' && (
                              <button
                                onClick={() => handleUpdateStatus(inc.id, 'CONTAINED')}
                                style={{
                                  padding: '4px 9px',
                                  borderRadius: 4,
                                  backgroundColor: '#8b5cf6',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Mark Contained 🛡️
                              </button>
                            )}

                            {inc.status === 'CONTAINED' && (
                              <button
                                onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                                style={{
                                  padding: '4px 9px',
                                  borderRadius: 4,
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Resolve & Close ✅
                              </button>
                            )}

                            {/* View on Live GIS Map */}
                            <button
                              onClick={() => navigate(`/scenario/${scenarioId}/map`)}
                              style={{
                                padding: '4px 6px',
                                borderRadius: 4,
                                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Inspect on GIS Operations Map"
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: FIRST RESPONDER FLEET & LIVE TELEMETRY */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  First Responder Units ({filteredUnits.length})
                </h2>

                {/* Unit filter buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {['ALL', 'AVAILABLE', 'DEPLOYED'].map(uf => (
                    <button
                      key={uf}
                      onClick={() => setUnitStatusFilter(uf)}
                      style={{
                        padding: '3px 7px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: unitStatusFilter === uf ? 800 : 600,
                        border: 'none',
                        backgroundColor: unitStatusFilter === uf ? '#2563eb' : (isDark ? '#1e293b' : '#f1f5f9'),
                        color: unitStatusFilter === uf ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                        cursor: 'pointer'
                      }}
                    >
                      {uf}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredUnits.length === 0 ? (
                  <div style={{
                    padding: 24,
                    textAlign: 'center',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: 8,
                    color: '#64748b',
                    fontSize: 12
                  }}>
                    No units matching selected service filter ({selectedServiceFilter}).
                  </div>
                ) : (
                  filteredUnits.map(unit => {
                    const isAvail = unit.status === 'AVAILABLE';
                    const isDisp = unit.status === 'DISPATCHED';
                    const isOnScene = unit.status === 'ON_SCENE';
                    const isSelected = selectedUnit?.id === unit.id;

                    return (
                      <div
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit)}
                        style={{
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#3b82f6' : (isDark ? '#334155' : '#e2e8f0')}`,
                          borderRadius: 8,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: isSelected 
                            ? '0 0 0 2px rgba(59, 130, 246, 0.25)' 
                            : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.03)'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Truck size={14} color={isAvail ? '#10b981' : (isDisp ? '#3b82f6' : '#f97316')} />
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                              {unit.callsign} • {unit.unitType}
                            </span>
                          </div>

                          {/* Readiness Toggle Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleUnitStatus(unit.id, unit.status);
                            }}
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: isAvail ? 'rgba(16, 185, 129, 0.15)' : (isDisp ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)'),
                              color: isAvail ? '#059669' : (isDisp ? '#2563eb' : '#ea580c'),
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Click to toggle unit operational readiness"
                          >
                            {unit.status}
                          </button>
                        </div>

                        {/* Crew & Equipment Telemetry */}
                        <div style={{ fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Crew: <strong>{unit.personnelCount || 6}</strong> | Speed: <strong>{unit.speedKmh || 45} km/h</strong></span>
                          <span>ETA to Apex: <strong>~{Math.floor(Math.random() * 5) + 3} min</strong></span>
                        </div>

                        <div style={{ fontSize: 10.5, color: isDark ? '#94a3b8' : '#64748b' }}>
                          Equip: {unit.equipmentSummary || 'Hydraulic Cutters, Life-Detectors, FLIR Thermal, Medical Kit'}
                        </div>

                        {/* Interactive Unit Actions */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 6,
                          marginTop: 4,
                          paddingTop: 6,
                          borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`
                        }} onClick={(e) => e.stopPropagation()}>
                          {isAvail ? (
                            <button
                              onClick={() => {
                                const targetInc = incidents.find(i => i.status === 'REPORTED') || incidents[0];
                                openDispatchModal('INCIDENT', targetInc);
                                setDispatchModalUnitId(unit.id);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 4,
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Send size={10} />
                              <span>Dispatch to Incident...</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleUnitStatus(unit.id, 'MAINTENANCE')}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                backgroundColor: isDark ? '#334155' : '#e2e8f0',
                                color: tokens.text,
                                border: 'none',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Recall / Reset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 4D. LIVE CAD DISPATCH ACTIVITY FEED (Real-Time Operations Ticker) */}
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: 8,
            padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#10b981" />
                <span style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Live First Responder Dispatch Activity Stream
                </span>
              </div>
              <span style={{ fontSize: 10.5, color: '#64748b' }}>
                FEMA NIMS / ICS Event Log (Auto-Updated)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
              {dispatchLogs.map(log => (
                <div key={log.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  color: isDark ? '#cbd5e1' : '#475569',
                  fontFamily: 'monospace',
                  padding: '2px 0'
                }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
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
                  showToast('CAP XML copied to clipboard.');
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

      {/* ─── 7. INTERACTIVE DISPATCH SERVICE MODAL ─── */}
      {isDispatchModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            borderRadius: 12,
            width: '100%',
            maxWidth: 580,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: 22
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Tactical CAD Dispatch Console
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    FEMA ICS Resource Assignment Directive
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDispatchModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {/* Target Summary Card */}
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Target Destination:
                </span>
                <div style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', marginTop: 2 }}>
                  {dispatchModalTarget.type === 'INCIDENT' 
                    ? (dispatchModalTarget.item?.title || 'Reported CAD Incident')
                    : (dispatchModalTarget.item?.name || 'Operational Sector Apex')}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {dispatchModalTarget.type === 'INCIDENT' 
                    ? `Priority: ${dispatchModalTarget.item?.priority || 'P1'} • ${dispatchModalTarget.item?.addressText || 'Sector Alpha'}`
                    : `Criticality: ${dispatchModalTarget.item?.criticality || 'CRITICAL'} • Evaluated Structures: ${dispatchModalTarget.item?.totalBuildings || 0}`}
                </div>
              </div>

              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 4,
                backgroundColor: dispatchModalTarget.type === 'INCIDENT' ? '#fee2e2' : '#e0f2fe',
                color: dispatchModalTarget.type === 'INCIDENT' ? '#dc2626' : '#0284c7'
              }}>
                {dispatchModalTarget.type === 'INCIDENT' ? 'INCIDENT' : 'ZONE APEX'}
              </span>
            </div>

            {/* Service Filter Tabs Inside Modal */}
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Filter Service Specialization:
              </label>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {SERVICES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDispatchModalService(s.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: `1px solid ${dispatchModalService === s.id ? s.color : (isDark ? '#334155' : '#cbd5e1')}`,
                      backgroundColor: dispatchModalService === s.id ? `${s.color}20` : 'transparent',
                      color: dispatchModalService === s.id ? s.color : (isDark ? '#94a3b8' : '#64748b'),
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit Selection Radio List */}
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Select Tactical Response Unit to Deploy:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {units
                  .filter(u => {
                    if (dispatchModalService === 'ALL') return true;
                    const sDef = SERVICES.find(s => s.id === dispatchModalService);
                    return sDef ? sDef.types.includes(u.unitType) : true;
                  })
                  .map(unit => {
                    const isAvail = unit.status === 'AVAILABLE';
                    const isSelected = dispatchModalUnitId == unit.id;

                    return (
                      <div
                        key={unit.id}
                        onClick={() => setDispatchModalUnitId(unit.id)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: `1.5px solid ${isSelected ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0')}`,
                          backgroundColor: isSelected 
                            ? (isDark ? '#1e3a8a' : '#eff6ff') 
                            : (isDark ? '#1e293b' : '#ffffff'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            name="cadDispatchUnit"
                            checked={isSelected}
                            onChange={() => setDispatchModalUnitId(unit.id)}
                            style={{ accentColor: '#2563eb' }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                              {unit.callsign} • {unit.unitType}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              Crew: {unit.personnelCount || 4} | Speed: {unit.speedKmh || 45} km/h | ETA: ~{Math.floor(Math.random() * 4) + 3} min
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 3,
                          backgroundColor: isAvail ? '#dcfce7' : '#fee2e2',
                          color: isAvail ? '#166534' : '#991b1b'
                        }}>
                          {unit.status}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Directives & Notes */}
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Tactical Directives & Access Notes:
              </label>
              <input
                type="text"
                value={dispatchModalNotes}
                onChange={(e) => setDispatchModalNotes(e.target.value)}
                placeholder="Tactical instructions for response unit..."
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: 11.5
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: 'transparent',
                  color: tokens.text,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteDispatch}
                disabled={isSubmittingDispatch}
                style={{
                  padding: '7px 18px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Send size={13} />
                <span>{isSubmittingDispatch ? 'Deploying...' : 'CONFIRM CAD DISPATCH'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. NEW CAD INCIDENT / 911 CALL MODAL ─── */}
      {isNewIncidentModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            borderRadius: 12,
            width: '100%',
            maxWidth: 520,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 22
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PhoneCall size={18} color="#dc2626" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Log 911 Emergency Call / CAD Incident
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Ingest new emergency event into CAD queue
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsNewIncidentModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewIncident} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  INCIDENT TITLE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flash flood trapped family on rooftop"
                  value={newIncidentForm.title}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: tokens.text,
                    fontSize: 11.5
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    PRIORITY
                  </label>
                  <select
                    value={newIncidentForm.priority}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: tokens.text,
                      fontSize: 11.5
                    }}
                  >
                    <option value="P1_CRITICAL">P1 CRITICAL (Life Safety)</option>
                    <option value="P2_HIGH">P2 HIGH (Severe Threat)</option>
                    <option value="P3_MEDIUM">P3 MEDIUM (Moderate Hazard)</option>
                    <option value="P4_LOW">P4 LOW (Routine/Advisory)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    CATEGORY
                  </label>
                  <select
                    value={newIncidentForm.category}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: tokens.text,
                      fontSize: 11.5
                    }}
                  >
                    <option value="FIRE">Fire & Suppression</option>
                    <option value="FLOOD_RESCUE">Flood & Water Rescue</option>
                    <option value="STRUCTURAL_COLLAPSE">Structural Collapse</option>
                    <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
                    <option value="HAZMAT">Hazmat Spill</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  LOCATION / ADDRESS
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104 Malibu Canyon Road, Sector Alpha"
                  value={newIncidentForm.addressText}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, addressText: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: tokens.text,
                    fontSize: 11.5
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    VICTIMS AT LOCATION
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newIncidentForm.victimCount}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, victimCount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: tokens.text,
                      fontSize: 11.5
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    TRAPPED COUNT
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newIncidentForm.trappedCount}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, trappedCount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: tokens.text,
                      fontSize: 11.5
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsNewIncidentModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                    backgroundColor: 'transparent',
                    color: tokens.text,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '7px 18px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Plus size={13} />
                  <span>LOG CAD INCIDENT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
