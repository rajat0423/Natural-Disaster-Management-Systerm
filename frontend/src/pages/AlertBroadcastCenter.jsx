import React, { useState, useEffect } from 'react';
import {
  Radio, AlertTriangle, Send, ShieldAlert, CheckCircle2, Download, Copy,
  RefreshCw, Volume2, Globe, Clock, Layers, Filter, Eye, XCircle, Zap
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function AlertBroadcastCenter() {
  const { tokens, isDark } = useTheme();

  const [scenarioId, setScenarioId] = useState(2);
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [capXmlPreview, setCapXmlPreview] = useState('');
  const [activeTab, setActiveTab] = useState('FORM'); // FORM, XML_PREVIEW

  // Composer Form State
  const [category, setCategory] = useState('Safety');
  const [event, setEvent] = useState('Catastrophic Flash Flood Emergency');
  const [urgency, setUrgency] = useState('Immediate');
  const [severity, setSeverity] = useState('Extreme');
  const [certainty, setCertainty] = useState('Observed');
  const [targetZoneId, setTargetZoneId] = useState('');
  const [headline, setHeadline] = useState('MANDATORY EVACUATION: Immediate High Ground Relocation Required');
  const [description, setDescription] = useState('Rapid surge and structural debris ingress detected across the river corridor. Severe danger to life.');
  const [instruction, setInstruction] = useState('Move to designated high-ground staging zones immediately. Avoid bridges and low-lying arterial roads.');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  // 1. Fetch alerts & scenario zones
  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, zonesRes] = await Promise.all([
        api.get(`/alerts?scenarioId=${scenarioId}`),
        api.get(`/map/zones?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } }))
      ]);

      const alertList = Array.isArray(alertsRes.data) ? alertsRes.data : [];
      setAlerts(alertList);
      if (alertList.length > 0 && !selectedAlert) {
        setSelectedAlert(alertList[0]);
      }

      const zoneFeats = zonesRes.data?.features || [];
      const zList = zoneFeats.map(f => f.properties || {});
      setZones(zList);
      if (zList.length > 0 && !targetZoneId) {
        setTargetZoneId(zList[0].id || '');
      }
    } catch (e) {
      console.error('Failed to load alert center data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scenarioId]);

  // Update XML Preview when selected alert changes
  useEffect(() => {
    if (selectedAlert?.id) {
      api.get(`/alerts/${selectedAlert.id}/cap.xml`, { responseType: 'text' })
        .then(res => setCapXmlPreview(res.data))
        .catch(() => setCapXmlPreview('<!-- Failed to generate CAP XML -->'));
    }
  }, [selectedAlert]);

  // Multilingual Template Applicator
  const applyTemplate = (lang) => {
    if (lang === 'HI') {
      setHeadline('आपातकालीन चेतावनी: तत्काल सुरक्षित स्थान पर जाएं');
      setDescription('अत्यधिक बाढ़ और मलबे का बहाव दर्ज किया गया है। जीवन के लिए गंभीर खतरा है।');
      setInstruction('तत्काल उच्च भूमि या निकटतम राहत शिविर की ओर प्रस्थान करें। नदी किनारों से दूर रहें।');
    } else if (lang === 'ES') {
      setHeadline('ALERTA DE EMERGENCIA: Evacuación Inmediata Obligatoria');
      setDescription('Peligro inminente de inundación y desprendimiento estructural. Riesgo crítico.');
      setInstruction('Evacue inmediatamente hacia terrenos altos y zonas seguras designadas.');
    } else {
      setHeadline('MANDATORY EVACUATION: Immediate High Ground Relocation Required');
      setDescription('Rapid surge and structural debris ingress detected across the river corridor. Severe danger to life.');
      setInstruction('Move to designated high-ground staging zones immediately. Avoid bridges and low-lying arterial roads.');
    }
  };

  // Submit manual broadcast
  const handleBroadcast = async (e) => {
    e.preventDefault();
    setIsBroadcasting(true);
    setBroadcastMsg('');

    try {
      const payload = {
        scenarioId,
        identifier: `AIDRS-${scenarioId}-EXP-${Math.floor(1000 + Math.random() * 9000)}`,
        sender: 'COMMAND-HQ@AIDRS.DISASTERMGMT.GOV',
        status: 'Actual',
        msgType: 'Alert',
        scope: 'Public',
        category,
        event,
        urgency,
        severity,
        certainty,
        headline,
        description,
        instruction,
        targetZoneId: targetZoneId ? parseInt(targetZoneId, 10) : null
      };

      const res = await api.post('/alerts', payload);
      setBroadcastMsg(`Broadcast dispatched successfully! CAP ID: ${res.data.identifier}`);
      fetchData();
    } catch (err) {
      setBroadcastMsg('Broadcast failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Trigger automated zone alerts
  const handleAutoGenerate = async () => {
    setIsBroadcasting(true);
    setBroadcastMsg('');
    try {
      const res = await api.post(`/alerts/auto-generate?scenarioId=${scenarioId}`);
      setBroadcastMsg(res.data.message || 'Auto-generated CAP alerts from operational damage zones.');
      fetchData();
    } catch (err) {
      setBroadcastMsg('Auto-generation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Cancel alert
  const handleCancelAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to broadcast a CAP cancellation for this emergency?')) return;
    try {
      await api.post(`/alerts/${alertId}/cancel`);
      fetchData();
    } catch (e) {
      alert('Failed to cancel alert: ' + e.message);
    }
  };

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '24px 20px 60px',
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: tokens.text
    }}>
      {/* ─── Hero Header & Compliance Badges ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              background: '#dc2626',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)'
            }}>
              <Radio size={22} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              OASIS CAP v1.2 Alert Broadcast Center
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: tokens.textMuted }}>
            Multi-Hazard Threat-to-Broadcast Engine &bull; WMO EW4All &bull; FEMA IPAWS &bull; Cellular / Web Push / Audio Siren
          </p>
        </div>

        {/* Scenario Selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(parseInt(e.target.value, 10))}
            style={{
              background: isDark ? '#1e293b' : '#f1f5f9',
              color: tokens.text,
              border: `1px solid ${tokens.border}`,
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <option value={1}>Scenario 1: Woolsey Fire (CA, USA)</option>
            <option value={2}>Scenario 2: Chamoli Disaster (Uttarakhand)</option>
            <option value={3}>Scenario 3: Cyclone Fani (Odisha)</option>
            <option value={4}>Scenario 4: Dharali Disaster (Uttarkashi)</option>
          </select>

          <button
            onClick={fetchData}
            style={{
              background: isDark ? '#1e293b' : '#f1f5f9',
              border: `1px solid ${tokens.border}`,
              color: tokens.text,
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ─── Metric Strip ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Active CAP Broadcasts', val: alerts.length, icon: Radio, col: '#ef4444' },
          { label: 'Multi-Channel Deliveries', val: '45,280 Units', icon: Send, col: '#38bdf8' },
          { label: 'Broadcast Latency', val: '1.24 Seconds', icon: Clock, col: '#10b981' },
          { label: 'Targeting Precision', val: '100% Polygon Clamped', icon: Layers, col: '#f59e0b' }
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: `1px solid ${tokens.border}`,
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                background: `${m.col}18`,
                padding: '10px',
                borderRadius: '8px',
                color: m.col
              }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: tokens.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
                  {m.val}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Two-Column Operations Layout ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 1fr) minmax(360px, 1fr)',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Left Column: Interactive CAP Alert Composer */}
        <div style={{
          background: isDark ? '#0f172a' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: `1px solid ${tokens.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#ef4444" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                CAP v1.2 Broadcast Composer
              </h2>
            </div>

            {/* Template Selector */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => applyTemplate('EN')}
                style={{ padding: '3px 7px', fontSize: '11px', background: isDark ? '#1e293b' : '#f1f5f9', border: `1px solid ${tokens.border}`, borderRadius: '4px', cursor: 'pointer', color: tokens.text }}
              >EN</button>
              <button
                type="button"
                onClick={() => applyTemplate('HI')}
                style={{ padding: '3px 7px', fontSize: '11px', background: isDark ? '#1e293b' : '#f1f5f9', border: `1px solid ${tokens.border}`, borderRadius: '4px', cursor: 'pointer', color: tokens.text }}
              >हिंदी</button>
              <button
                type="button"
                onClick={() => applyTemplate('ES')}
                style={{ padding: '3px 7px', fontSize: '11px', background: isDark ? '#1e293b' : '#f1f5f9', border: `1px solid ${tokens.border}`, borderRadius: '4px', cursor: 'pointer', color: tokens.text }}
              >ES</button>
            </div>
          </div>

          <form onSubmit={handleBroadcast}>
            {/* Event & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                  CAP Event Type
                </label>
                <input
                  type="text"
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  style={{
                    width: '100%',
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: tokens.text,
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: '6px',
                    padding: '8px',
                    color: tokens.text,
                    fontSize: '12px'
                  }}
                >
                  <option value="Safety">Safety</option>
                  <option value="Rescue">Rescue</option>
                  <option value="Fire">Fire</option>
                  <option value="Met">Met</option>
                  <option value="Geo">Geo</option>
                  <option value="Health">Health</option>
                  <option value="Infra">Infra</option>
                </select>
              </div>
            </div>

            {/* Urgency, Severity, Certainty */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  style={{ width: '100%', background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '8px', color: tokens.text, fontSize: '12px' }}
                >
                  <option value="Immediate">Immediate</option>
                  <option value="Expected">Expected</option>
                  <option value="Future">Future</option>
                  <option value="Past">Past</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={{ width: '100%', background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '8px', color: tokens.text, fontSize: '12px' }}
                >
                  <option value="Extreme">Extreme</option>
                  <option value="Severe">Severe</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>Certainty</label>
                <select
                  value={certainty}
                  onChange={(e) => setCertainty(e.target.value)}
                  style={{ width: '100%', background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${tokens.border}`, borderRadius: '6px', padding: '8px', color: tokens.text, fontSize: '12px' }}
                >
                  <option value="Observed">Observed</option>
                  <option value="Likely">Likely</option>
                  <option value="Possible">Possible</option>
                </select>
              </div>
            </div>

            {/* Target Operational Zone */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                Target Geographic Zone (Bound to Polygon)
              </label>
              <select
                value={targetZoneId}
                onChange={(e) => setTargetZoneId(e.target.value)}
                style={{
                  width: '100%',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: tokens.text,
                  fontSize: '12px'
                }}
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name || z.zoneCode} [{z.criticality}] — {z.totalBuildings || 0} Structures
                  </option>
                ))}
              </select>
            </div>

            {/* Headline */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                Broadcast Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                style={{
                  width: '100%',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: tokens.text,
                  fontSize: '12px',
                  fontWeight: 600
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                Threat Rationale & Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: tokens.text,
                  fontSize: '12px',
                  resize: 'none'
                }}
              />
            </div>

            {/* Instruction */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: tokens.textMuted, fontWeight: 600, marginBottom: '4px' }}>
                Civilian Action & Evacuation Instruction
              </label>
              <textarea
                rows={2}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                style={{
                  width: '100%',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: tokens.text,
                  fontSize: '12px',
                  resize: 'none'
                }}
              />
            </div>

            {broadcastMsg && (
              <div style={{
                background: broadcastMsg.includes('failed') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${broadcastMsg.includes('failed') ? '#ef4444' : '#10b981'}`,
                color: broadcastMsg.includes('failed') ? '#fca5a5' : '#6ee7b7',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '14px'
              }}>
                {broadcastMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={isBroadcasting}
                style={{
                  flex: 1,
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isBroadcasting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
                }}
              >
                <Send size={15} />
                {isBroadcasting ? 'Transmitting...' : 'Issue CAP 1.2 Broadcast'}
              </button>

              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={isBroadcasting}
                style={{
                  background: isDark ? '#1e293b' : '#f1f5f9',
                  border: `1px solid ${tokens.border}`,
                  color: tokens.text,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isBroadcasting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={14} color="#f59e0b" /> Auto-Trigger
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Active Broadcast Stream & CAP Inspector */}
        <div style={{
          background: isDark ? '#0f172a' : '#ffffff',
          border: `1px solid ${tokens.border}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          {/* Header & Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: `1px solid ${tokens.border}`
          }}>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>
              Active Broadcast Stream ({alerts.length})
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setActiveTab('LIST')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: activeTab === 'LIST' ? '#0284c7' : (isDark ? '#1e293b' : '#e2e8f0'),
                  color: activeTab === 'LIST' ? '#fff' : tokens.text,
                  cursor: 'pointer'
                }}
              >
                Alert List
              </button>
              <button
                onClick={() => setActiveTab('XML_PREVIEW')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: activeTab === 'XML_PREVIEW' ? '#0284c7' : (isDark ? '#1e293b' : '#e2e8f0'),
                  color: activeTab === 'XML_PREVIEW' ? '#fff' : tokens.text,
                  cursor: 'pointer'
                }}
              >
                CAP 1.2 XML
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: tokens.textMuted }}>
              Loading broadcast feeds...
            </div>
          ) : activeTab === 'XML_PREVIEW' ? (
            // XML Document View
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '11px',
                color: tokens.textMuted
              }}>
                <span>Identifier: {selectedAlert?.identifier || 'None Selected'}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(capXmlPreview);
                    alert('CAP 1.2 XML copied to clipboard.');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Copy size={13} /> Copy Spec
                </button>
              </div>
              <pre style={{
                background: isDark ? '#020617' : '#f8fafc',
                border: `1px solid ${tokens.border}`,
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'Consolas, monospace',
                color: '#38bdf8',
                maxHeight: '420px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45
              }}>
                {capXmlPreview}
              </pre>
            </div>
          ) : (
            // Alert List View
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '460px', overflowY: 'auto' }}>
              {alerts.map(a => {
                const isSel = selectedAlert?.id === a.id;
                const isCrit = a.severity === 'Extreme';
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAlert(a)}
                    style={{
                      background: isSel ? (isDark ? '#1e293b' : '#e0f2fe') : (isDark ? '#090d16' : '#f8fafc'),
                      border: isSel ? '1px solid #38bdf8' : `1px solid ${tokens.border}`,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isCrit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isCrit ? '#ef4444' : '#f59e0b'
                      }}>
                        {a.severity} &bull; {a.urgency}
                      </span>
                      <span style={{ fontSize: '11px', color: tokens.textMuted, fontFamily: 'monospace' }}>
                        {a.identifier}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                      {a.headline}
                    </div>

                    <div style={{ fontSize: '11px', color: tokens.textMuted, marginBottom: '8px', lineHeight: 1.35 }}>
                      {a.instruction}
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                      paddingTop: '8px',
                      fontSize: '11px'
                    }}>
                      <span style={{ color: tokens.textMuted }}>
                        Expires: {new Date(a.expiresAt).toLocaleTimeString()}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(api.defaults.baseURL + `/alerts/${a.id}/cap.xml`, '_blank');
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#0284c7',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelAlert(a.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <XCircle size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
