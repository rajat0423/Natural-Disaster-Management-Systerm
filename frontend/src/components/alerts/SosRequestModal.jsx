import React, { useState, useEffect } from 'react';
import { LifeBuoy, X, MapPin, Users, AlertCircle, Phone, User, CheckCircle2, ShieldCheck, Flame, Droplets, Mountain } from 'lucide-react';
import api from '../../services/api';

/**
 * Civilian One-Tap SOS Request Modal
 * Captures GPS coordinates, casualty counts, hazards, and submits directly to CAD dispatch engine.
 */
export default function SosRequestModal({ isOpen, onClose, scenarioId = 2 }) {
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [victimCount, setVictimCount] = useState(1);
  const [trappedCount, setTrappedCount] = useState(0);
  const [disasterType, setDisasterType] = useState('FLOOD');
  const [medicalNotes, setMedicalNotes] = useState('');
  
  // Geolocation state
  const [coords, setCoords] = useState({ lon: 79.715, lat: 30.490 });
  const [geoStatus, setGeoStatus] = useState('FETCHING'); // FETCHING, ACQUIRED, FALLBACK
  
  // Submission & Receipt state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sosReceipt, setSosReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Scenario default GPS coordinates fallback
  useEffect(() => {
    const defaults = {
      1: { lon: -118.795, lat: 34.035, type: 'FIRE' },     // Woolsey Fire (Malibu)
      2: { lon: 79.715, lat: 30.490, type: 'FLOOD' },       // Chamoli (Raini/Tapovan)
      3: { lon: 85.831, lat: 19.814, type: 'CYCLONE' },     // Cyclone Fani (Puri)
      4: { lon: 78.684, lat: 31.036, type: 'LANDSLIDE' }    // Dharali (Harsil)
    };
    const def = defaults[scenarioId] || defaults[2];
    setCoords({ lon: def.lon, lat: def.lat });
    setDisasterType(def.type);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // If browser has valid GPS
          setCoords({ lon: pos.coords.longitude, lat: pos.coords.latitude });
          setGeoStatus('ACQUIRED');
        },
        () => {
          setGeoStatus('FALLBACK');
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      setGeoStatus('FALLBACK');
    }
  }, [scenarioId, isOpen]);

  if (!isOpen) return null;

  const handleSubmitSos = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        scenarioId: scenarioId || 2,
        lon: coords.lon,
        lat: coords.lat,
        callerName: callerName.trim() || 'Anonymous SOS Broadcast',
        callerPhone: callerPhone.trim() || 'N/A',
        victimCount: parseInt(victimCount, 10) || 1,
        trappedCount: parseInt(trappedCount, 10) || 0,
        medicalNotes: medicalNotes.trim() || 'Immediate rescue needed at GPS location',
        disasterType: disasterType || 'FLOOD'
      };

      const res = await api.post('/incidents/sos', payload);
      setSosReceipt(res.data);
    } catch (err) {
      console.error('SOS dispatch error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to transmit SOS signal. Please re-try.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSosReceipt(null);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#0f172a',
        border: '2px solid #ef4444',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(239, 68, 68, 0.35)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 22px',
          background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)',
          borderBottom: '1px solid #b91c1c'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#ffffff',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LifeBuoy size={22} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                ONE-TAP CIVILIAN SOS
              </div>
              <div style={{ fontSize: '11px', color: '#fca5a5' }}>
                FEMA IPAWS / NDRF CAD Emergency Dispatch Signal
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, color: '#f8fafc' }}>
          {sosReceipt ? (
            // Success Dispatch Receipt
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle2 size={36} color="#10b981" />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginBottom: '6px' }}>
                SOS SIGNAL TRANSMITTED
              </h3>
              <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '20px' }}>
                Your emergency distress ticket has been routed to the Incident Command Center.
              </p>

              {/* Receipt Details Box */}
              <div style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'left',
                fontSize: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Incident Tracking Code:</span>
                  <strong style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: '13px' }}>{sosReceipt.code}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>CAD Priority Tier:</span>
                  <span style={{
                    color: '#ef4444',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {sosReceipt.priority}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Dispatch Status:</span>
                  <strong style={{ color: '#38bdf8' }}>{sosReceipt.status}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Assigned Unit:</span>
                  <strong style={{ color: '#f59e0b' }}>
                    {sosReceipt.assignedTeamId ? `TEAM ACTIVE [ID: ${sosReceipt.assignedTeamId.substring(0, 8)}...]` : 'ASSIGNING NEAREST USAR UNIT...'}
                  </strong>
                </div>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#fbbf24',
                textAlign: 'left',
                marginBottom: '20px'
              }}>
                <strong>⚠️ Responder Extrication Instructions:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', lineHeight: 1.45 }}>
                  <li>Stay clear of compromised masonry, power lines, and flood channels.</li>
                  <li>Keep mobile phone charged and audible for responder incoming radio pings.</li>
                  <li>Signal rescuers using a whistle, reflective light, or bright cloth.</li>
                </ul>
              </div>

              <button
                onClick={handleReset}
                style={{
                  width: '100%',
                  background: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Acknowledge & Return to Operations Map
              </button>
            </div>
          ) : (
            // Form Submission View
            <form onSubmit={handleSubmitSos}>
              {/* GPS Geolocation Banner */}
              <div style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} color="#38bdf8" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                      GPS Coordinates: {coords.lat.toFixed(5)}°N, {coords.lon.toFixed(5)}°E
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {geoStatus === 'ACQUIRED' ? '🛰️ Precision HTML5 Geolocation Acquired' : '📍 Linked to Active Disaster Locus'}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: geoStatus === 'ACQUIRED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                  color: geoStatus === 'ACQUIRED' ? '#10b981' : '#38bdf8'
                }}>
                  {geoStatus}
                </span>
              </div>

              {/* Threat Archetype */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Emergency Hazard Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'FLOOD', label: 'Flood / Surge', icon: Droplets },
                    { id: 'FIRE', label: 'Wildfire', icon: Flame },
                    { id: 'LANDSLIDE', label: 'Landslide', icon: Mountain },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSel = disasterType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDisasterType(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: isSel ? '1px solid #ef4444' : '1px solid #334155',
                          background: isSel ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
                          color: isSel ? '#fca5a5' : '#cbd5e1',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Icon size={14} /> {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Victims & Trapped Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                    Persons Injured / In Need
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setVictimCount(Math.max(1, victimCount - 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '4px', background: '#334155', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >-</button>
                    <span style={{ fontSize: '16px', fontWeight: 800, minWidth: '24px', textAlign: 'center' }}>{victimCount}</span>
                    <button
                      type="button"
                      onClick={() => setVictimCount(victimCount + 1)}
                      style={{ width: '28px', height: '28px', borderRadius: '4px', background: '#334155', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >+</button>
                  </div>
                </div>

                <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>
                    Trapped / Under Debris
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setTrappedCount(Math.max(0, trappedCount - 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '4px', background: '#334155', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >-</button>
                    <span style={{ fontSize: '16px', fontWeight: 800, minWidth: '24px', textAlign: 'center', color: trappedCount > 0 ? '#ef4444' : '#fff' }}>
                      {trappedCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTrappedCount(trappedCount + 1)}
                      style={{ width: '28px', height: '28px', borderRadius: '4px', background: '#334155', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >+</button>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Your Name / ID</label>
                  <input
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    placeholder="e.g. John Doe (Optional)"
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Callback Phone #</label>
                  <input
                    type="text"
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    placeholder="+91-XXXXX-XXXXX"
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {/* Medical / Situation Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Situation Details & Medical Urgency
                </label>
                <textarea
                  rows={3}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="e.g. Water entering first floor, elderly patient requiring oxygen, building structural shaking..."
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              {errorMsg && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '14px'
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: '1 1 30%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    padding: '11px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: '1 1 70%',
                    background: '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    padding: '11px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <LifeBuoy size={16} />
                  {isSubmitting ? 'TRANSMITTING SOS SIGNAL...' : 'TRANSMIT RESCUE SOS NOW'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
