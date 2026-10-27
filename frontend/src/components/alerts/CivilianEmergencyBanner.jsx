import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Volume2, VolumeX, ShieldAlert, LifeBuoy, X, ExternalLink, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import api from '../../services/api';

/**
 * World-Class Civilian Emergency Alert Banner
 * Compliant with OASIS CAP v1.2 specifications and FEMA Integrated Public Alert & Warning System (IPAWS).
 * Features Web Audio API emergency tone synthesis (no external MP3 required).
 */
export default function CivilianEmergencyBanner({ scenarioId = 2, onOpenSos = null }) {
  const [alerts, setAlerts] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [capModalAlert, setCapModalAlert] = useState(null);
  const [capXml, setCapXml] = useState('');
  const [loadingCap, setLoadingCap] = useState(false);

  // Web Audio API context ref
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const timerRef = useRef(null);

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
    const interval = setInterval(fetchAlerts, 10000);

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

      // Stop existing if any
      stopSiren();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);

      // Low volume baseline
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;

      // Oscillate frequency (European Hi-Lo Emergency Tone)
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

  const currentAlert = alerts[activeIdx] || alerts[0];

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

  if (!alerts || alerts.length === 0 || !currentAlert) {
    return null;
  }

  const isExtreme = currentAlert.severity === 'Extreme';
  const isSevere = currentAlert.severity === 'Severe';
  const bgGrad = isExtreme
    ? 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)'
    : isSevere
    ? 'linear-gradient(90deg, #9a3412 0%, #c2410c 50%, #9a3412 100%)'
    : 'linear-gradient(90deg, #065f46 0%, #047857 50%, #065f46 100%)';

  const borderColor = isExtreme ? '#ef4444' : isSevere ? '#f97316' : '#10b981';

  return (
    <>
      {/* ─── Global Floating Alert Banner ─── */}
      <div style={{
        position: 'fixed',
        top: 52, // Directly beneath TopBar (height: 52px)
        left: 0,
        right: 0,
        zIndex: 998,
        background: bgGrad,
        borderBottom: `2px solid ${borderColor}`,
        color: '#ffffff',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
        fontFamily: 'Inter, -apple-system, sans-serif',
        transition: 'all 0.3s ease',
      }}>
        {isCollapsed ? (
          // Compact Minimized Bar
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 20px',
            fontSize: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                animation: 'pulse 1.2s infinite'
              }} />
              <strong style={{ letterSpacing: '0.04em' }}>[CAP 1.2 ALERT ACTIVE]</strong>
              <span>{currentAlert.headline}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setIsCollapsed(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Expand <ChevronDown size={13} />
              </button>
            </div>
          </div>
        ) : (
          // Full Emergency Command Banner
          <div style={{
            padding: '10px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            {/* Left: Icon & Core Alert Message */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 500px' }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={24} color="#fef08a" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.25)'
                  }}>
                    {currentAlert.severity} &bull; {currentAlert.urgency}
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.9 }}>
                    {currentAlert.identifier} &bull; Sender: {currentAlert.sender}
                  </span>
                  {alerts.length > 1 && (
                    <span style={{ fontSize: '10px', opacity: 0.8, background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '10px' }}>
                      Alert {activeIdx + 1} of {alerts.length}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '2px' }}>
                  🚨 {currentAlert.headline}
                </div>

                <div style={{ fontSize: '12px', opacity: 0.95, lineHeight: 1.35 }}>
                  {currentAlert.instruction || currentAlert.description}
                </div>
              </div>
            </div>

            {/* Right: Quick Actions & Siren Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* Audio Siren Toggle */}
              <button
                onClick={toggleSiren}
                title={isMuted ? 'Sound Audible Emergency Siren' : 'Mute Emergency Siren'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isMuted ? 'rgba(0, 0, 0, 0.35)' : '#ef4444',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                  boxShadow: isMuted ? 'none' : '0 0 12px #ef4444'
                }}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isMuted ? 'Sound Siren' : 'MUTE SIREN'}</span>
              </button>

              {/* View Official CAP 1.2 XML */}
              <button
                onClick={() => handleOpenCapModal(currentAlert)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  padding: '6px 11px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                <Radio size={14} /> CAP 1.2 Spec
              </button>

              {/* One-Tap SOS Modal Button */}
              {onOpenSos && (
                <button
                  onClick={onOpenSos}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#dc2626',
                    border: '1px solid #f87171',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.5)'
                  }}
                >
                  <LifeBuoy size={14} /> ONE-TAP SOS
                </button>
              )}

              {/* Next Alert cycle if multiple */}
              {alerts.length > 1 && (
                <button
                  onClick={() => setActiveIdx((activeIdx + 1) % alerts.length)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: '#fff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  Next &rarr;
                </button>
              )}

              {/* Minimize */}
              <button
                onClick={() => setIsCollapsed(true)}
                title="Minimize banner"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── OASIS CAP v1.2 XML / JSON Inspector Modal ─── */}
      {capModalAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid #1e293b',
              background: '#0a0f1d'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  OASIS CAP v1.2 Standard Protocol Document
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Identifier: {capModalAlert.identifier} &bull; Compliant with ITU-T X.1303 & FEMA IPAWS
                </div>
              </div>
              <button
                onClick={() => setCapModalAlert(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: XML Viewer */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {loadingCap ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>Loading CAP 1.2 XML...</div>
              ) : (
                <pre style={{
                  background: '#020617',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '14px',
                  fontSize: '11px',
                  fontFamily: 'Consolas, monospace',
                  color: '#38bdf8',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto',
                  lineHeight: 1.45
                }}>
                  {capXml}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0a0f1d'
            }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Broadcast Footprint: {capModalAlert.targetZoneId ? `Linked to Operational Zone #${capModalAlert.targetZoneId}` : 'Regional Corridor'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(capXml);
                    alert('CAP 1.2 XML copied to clipboard.');
                  }}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Copy XML
                </button>
                <button
                  onClick={() => setCapModalAlert(null)}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
