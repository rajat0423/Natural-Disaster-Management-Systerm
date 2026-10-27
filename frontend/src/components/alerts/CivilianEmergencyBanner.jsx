import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle, Volume2, VolumeX, ShieldAlert, LifeBuoy, X,
  ExternalLink, ChevronDown, ChevronUp, BellOff, Radio, Eye, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';

/**
 * World-Class Civilian Emergency Alert Banner & Warning Capsule
 * Compliant with OASIS CAP v1.2 and FEMA IPAWS.
 * Features Web Audio API emergency siren oscillator with prominent turn-off controls.
 */
export default function CivilianEmergencyBanner({ scenarioId = 2, onOpenSos = null }) {
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [capModalAlert, setCapModalAlert] = useState(null);
  const [capXml, setCapXml] = useState('');
  const [loadingCap, setLoadingCap] = useState(false);

  // Web Audio API context ref
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const timerRef = useRef(null);

  // Check sessionStorage for dismissed status
  useEffect(() => {
    const dismissed = sessionStorage.getItem(`aidrs_alert_dismissed_${scenarioId}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }
  }, [scenarioId]);

  // 1. Fetch active alerts periodically
  useEffect(() => {
    let isMounted = true;

    const fetchAlerts = async () => {
      try {
        const res = await api.get(`/alerts?activeOnly=true${scenarioId ? `&scenarioId=${scenarioId}` : ''}`);
        if (isMounted) {
          const list = Array.isArray(res.data) ? res.data : [];
          setAlerts(list);
          if (list.length === 0 && !isMuted) {
            stopSiren();
          }
        }
      } catch (err) {
        console.warn('Failed to load active CAP alerts:', err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      stopSiren();
    };
  }, [scenarioId]);

  // Siren Audio Synthesis using Web Audio API
  const startSiren = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      stopSiren();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;

      let high = false;
      timerRef.current = setInterval(() => {
        if (!oscRef.current || !ctx) return;
        high = !high;
        const targetFreq = high ? 850 : 520;
        oscRef.current.frequency.cancelScheduledValues(ctx.currentTime);
        oscRef.current.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.35);
      }, 500);

      setIsMuted(false);
    } catch (e) {
      console.warn('Web Audio Siren unavailable:', e);
    }
  };

  const stopSiren = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    if (gainRef.current) {
      try {
        gainRef.current.disconnect();
      } catch (e) {}
      gainRef.current = null;
    }
    setIsMuted(true);
  };

  const toggleSiren = () => {
    if (isMuted) {
      startSiren();
    } else {
      stopSiren();
    }
  };

  // Turn Off Alert (Mutes Siren & Hides Banner)
  const handleTurnOffAlert = () => {
    stopSiren();
    setIsDismissed(true);
    sessionStorage.setItem(`aidrs_alert_dismissed_${scenarioId}`, 'true');
  };

  // Turn off alert system-wide (Cancel in backend)
  const handleSystemCancelAlert = async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/cancel`);
      stopSiren();
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      if (capModalAlert?.id === alertId) {
        setCapModalAlert(null);
      }
    } catch (err) {
      alert('Failed to cancel alert: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenCapModal = async (alert) => {
    setCapModalAlert(alert);
    setLoadingCap(true);
    try {
      const res = await api.get(`/alerts/${alert.id}/cap.xml`, { responseType: 'text' });
      setCapXml(res.data);
    } catch (e) {
      setCapXml('<!-- Failed to load CAP 1.2 XML -->');
    } finally {
      setLoadingCap(false);
    }
  };

  const currentAlert = alerts[activeIdx] || alerts[0];

  if (location.pathname.includes('/map') || location.pathname.includes('/emergency')) {
    return null;
  }

  if (!alerts || alerts.length === 0 || !currentAlert) {
    return null;
  }

  // If user dismissed the alert, show a small discreet pill to re-open if needed
  if (isDismissed) {
    return (
      <div style={{
        position: 'fixed',
        top: 60,
        right: 18,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#f8fafc',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer'
      }}
      onClick={() => {
        setIsDismissed(false);
        sessionStorage.removeItem(`aidrs_alert_dismissed_${scenarioId}`);
      }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
        <span>Alert Silenced ({alerts.length}) — Click to view</span>
      </div>
    );
  }

  const isExtreme = currentAlert.severity === 'Extreme';
  const isSevere = currentAlert.severity === 'Severe';
  const borderColor = isExtreme ? '#ef4444' : isSevere ? '#f97316' : '#10b981';

  return (
    <>
      {/* ─── Floating Emergency Warning Capsule (Upper Right, non-blocking) ─── */}
      <div style={{
        position: 'fixed',
        top: 60,
        right: 20,
        zIndex: 1100,
        maxWidth: 580,
        width: 'calc(100vw - 40px)',
        backgroundColor: '#0f172a',
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        color: '#ffffff',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.25s ease'
      }}>
        {/* Banner Top Header */}
        <div style={{
          padding: '8px 14px',
          background: isExtreme
            ? 'linear-gradient(90deg, #991b1b 0%, #7f1d1d 100%)'
            : 'linear-gradient(90deg, #c2410c 0%, #9a3412 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${borderColor}55`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block',
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: '#fff',
              boxShadow: '0 0 8px #fff'
            }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              🚨 OASIS CAP 1.2 PUBLIC EMERGENCY ALERT
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.3)',
              color: '#fff'
            }}>
              {currentAlert.severity}
            </span>
          </div>

          {/* Action Buttons: Siren, Turn Off, Collapse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Siren Toggle */}
            <button
              onClick={toggleSiren}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 4,
                backgroundColor: isMuted ? 'rgba(0,0,0,0.35)' : '#ffffff',
                color: isMuted ? '#f8fafc' : '#b91c1c',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title={isMuted ? 'Turn on emergency siren sound' : 'Mute emergency siren'}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              {isMuted ? 'Unmute' : 'Siren ON'}
            </button>

            {/* Turn Off Alert Button */}
            <button
              onClick={handleTurnOffAlert}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 4,
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Turn off this alert banner"
            >
              <BellOff size={13} />
              Turn Off Alert
            </button>

            {/* Collapse toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title={isCollapsed ? 'Expand details' : 'Collapse'}
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>

        {/* Banner Body (if not collapsed) */}
        {!isCollapsed && (
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 6, color: '#f8fafc' }}>
              {currentAlert.headline}
            </div>

            <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.45, marginBottom: 10 }}>
              {currentAlert.description}
            </div>

            {currentAlert.instruction && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderLeft: '3px solid #ef4444',
                padding: '6px 10px',
                borderRadius: '0 4px 4px 0',
                fontSize: 11,
                color: '#fca5a5',
                marginBottom: 10
              }}>
                <strong>Instruction:</strong> {currentAlert.instruction}
              </div>
            )}

            {/* Bottom Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 11
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{currentAlert.identifier}</span>
                <span>·</span>
                <span>Urgency: <strong>{currentAlert.urgency}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Civilian SOS Trigger */}
                {onOpenSos && (
                  <button
                    onClick={onOpenSos}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 4,
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <LifeBuoy size={12} />
                    Report SOS
                  </button>
                )}

                {/* Inspect CAP 1.2 XML */}
                <button
                  onClick={() => handleOpenCapModal(currentAlert)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={12} />
                  CAP XML
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: CAP 1.2 INSPECTOR ─── */}
      {capModalAlert && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 12,
            width: '100%',
            maxWidth: 720,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                  OASIS CAP v1.2 Protocol Inspector
                </h3>
              </div>
              <button
                onClick={() => setCapModalAlert(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* XML Document */}
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <pre style={{
                margin: 0,
                padding: 14,
                backgroundColor: '#020617',
                border: '1px solid #1e293b',
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.5,
                color: '#38bdf8',
                fontFamily: 'Consolas, Monaco, monospace',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {loadingCap ? 'Loading OASIS CAP v1.2 XML from backend...' : capXml}
              </pre>
            </div>

            {/* Modal Actions */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#131d33'
            }}>
              <button
                onClick={() => handleSystemCancelAlert(capModalAlert.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  backgroundColor: '#7f1d1d',
                  color: '#fca5a5',
                  border: '1px solid #991b1b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <BellOff size={14} />
                Cancel Alert System-wide
              </button>

              <button
                onClick={() => setCapModalAlert(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  backgroundColor: '#3b82f6',
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
    </>
  );
}
