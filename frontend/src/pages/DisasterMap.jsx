/**
 * ============================================================
 * DisasterMap.jsx — Professional 3-Column Operations Command Map
 * ============================================================
 *
 * Implements:
 *   - 3-Column Command Layout (Left: Controls, Center: Map, Right: Triage/Routing)
 *   - Modes: AI Damage, Priority Analysis, Response Routing
 *   - Layer Toggles with live feature counts
 *   - Multi-factor Priority Breakdown with plain-language reasons
 *   - Dijkstra Evacuation Routing avoiding hazardous road closures
 *   - Clean professional GIS styling without decorative clutter
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import api from '../services/api';

const DAMAGE_COLORS = {
  'no-damage': '#10b981',
  'minor-damage': '#f59e0b',
  'major-damage': '#f97316',
  'destroyed': '#ef4444',
  'unknown': '#94a3b8'
};

const DAMAGE_LABELS = {
  'no-damage': 'No Damage',
  'minor-damage': 'Minor Damage',
  'major-damage': 'Major Damage',
  'destroyed': 'Destroyed'
};

const PRIORITY_COLORS = {
  'CRITICAL': '#dc2626',
  'HIGH': '#ea580c',
  'MEDIUM': '#d97706',
  'LOW': '#059669'
};

function DisasterMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupsRef = useRef({
    boundary: L.layerGroup(),
    damages: L.layerGroup(),
    priorities: L.layerGroup(),
    buildings: L.layerGroup(),
    roads: L.layerGroup(),
    hospitals: L.layerGroup(),
    shelters: L.layerGroup(),
    route: L.layerGroup()
  });

  // State
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active Map Mode: 'DAMAGE' | 'PRIORITY' | 'ROUTING'
  const [mapMode, setMapMode] = useState('DAMAGE');

  // Layer Toggles
  const [layers, setLayers] = useState({
    damages: true,
    priorities: true,
    buildings: false,
    roads: true,
    hospitals: true,
    shelters: true,
    boundary: true
  });

  // Filters
  const [damageFilter, setDamageFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.0);
  const [avoidBlockedRoads, setAvoidBlockedRoads] = useState(true);

  // Selected Building & Route
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);

  // Raw GeoJSON Data Cache
  const rawDataRef = useRef({
    damages: null,
    priorities: null,
    buildings: null,
    roads: null,
    hospitals: null,
    shelters: null,
    scenario: null
  });

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current && mapContainerRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [34.0522, -118.6850],
        zoom: 12,
        zoomControl: false // custom position
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Disaster Decision-Support',
        maxZoom: 19
      }).addTo(map);

      Object.values(layerGroupsRef.current).forEach(lg => lg.addTo(map));
      mapInstanceRef.current = map;
    }

    loadScenarios();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Load Scenarios
  async function loadScenarios() {
    try {
      const resp = await api.get('/scenarios');
      setScenarios(resp.data);
      if (resp.data.length > 0) {
        setSelectedScenarioId(resp.data[0].id);
      }
    } catch (err) {
      setError('Could not connect to Spring Boot backend (port 8081). Ensure the backend service is running.');
    }
  }

  // 3. Load Scenario GIS & Priorities
  useEffect(() => {
    if (selectedScenarioId) {
      loadScenarioData(selectedScenarioId);
    }
  }, [selectedScenarioId]);

  async function loadScenarioData(scenarioId) {
    setLoading(true);
    setError(null);
    setSelectedBuilding(null);
    setActiveRoute(null);

    try {
      const [scenResp, damagesResp, priResp, bldgsResp, roadsResp, hospResp, sheltResp, sumResp] = await Promise.all([
        api.get(`/scenarios/${scenarioId}`).catch(() => ({ data: null })),
        api.get(`/map/damages?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/priorities/geojson?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/buildings?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/roads?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/hospitals?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/shelters?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/analysis/${scenarioId}/summary`).catch(() => ({ data: null }))
      ]);

      rawDataRef.current = {
        scenario: scenResp.data,
        damages: damagesResp.data,
        priorities: priResp.data,
        buildings: bldgsResp.data,
        roads: roadsResp.data,
        hospitals: hospResp.data,
        shelters: sheltResp.data
      };

      setSummary(sumResp.data);
      renderLayers();
    } catch (err) {
      setError(`Failed to load GIS layers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // 4. Render Layers
  useEffect(() => {
    if (mapInstanceRef.current && rawDataRef.current.damages) {
      renderLayers();
    }
  }, [layers, mapMode, damageFilter, priorityFilter, confidenceThreshold]);

  function renderLayers() {
    const map = mapInstanceRef.current;
    if (!map) return;

    const { boundary, damages, priorities, buildings, roads, hospitals, shelters } = layerGroupsRef.current;

    boundary.clearLayers();
    damages.clearLayers();
    priorities.clearLayers();
    buildings.clearLayers();
    roads.clearLayers();
    hospitals.clearLayers();
    shelters.clearLayers();

    const bounds = L.latLngBounds();

    // A. Boundary
    if (layers.boundary && rawDataRef.current.scenario?.boundary) {
      try {
        const boundLayer = L.geoJSON(rawDataRef.current.scenario.boundary, {
          style: {
            color: '#ef4444',
            weight: 2,
            dashArray: '6, 6',
            fillColor: '#ef4444',
            fillOpacity: 0.04
          }
        });
        boundary.addLayer(boundLayer);
        boundLayer.eachLayer(l => bounds.extend(l.getBounds()));
      } catch (e) {}
    }

    // B. AI Damage Predictions Layer
    if (mapMode === 'DAMAGE' && layers.damages && rawDataRef.current.damages?.features) {
      const filtered = rawDataRef.current.damages.features.filter(feat => {
        const p = feat.properties || {};
        const dClass = p.damageClass || 'no-damage';
        const conf = p.confidence ?? 1.0;
        if (damageFilter !== 'ALL' && dClass !== damageFilter) return false;
        if (conf < confidenceThreshold) return false;
        return true;
      });

      const dmgLayer = L.geoJSON({ type: 'FeatureCollection', features: filtered }, {
        style: (feat) => {
          const dClass = feat.properties?.damageClass || 'no-damage';
          const col = DAMAGE_COLORS[dClass] || '#94a3b8';
          return {
            color: col,
            weight: 2,
            fillColor: col,
            fillOpacity: 0.70
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const dClass = p.damageClass || 'no-damage';
          const conf = p.confidence ? (p.confidence * 100).toFixed(1) : '100.0';

          layer.on({
            mouseover: (e) => e.target.setStyle({ weight: 4, fillOpacity: 0.95 }),
            mouseout: (e) => dmgLayer.resetStyle(e.target),
            click: () => {
              const priMatch = rawDataRef.current.priorities?.features?.find(f => f.properties?.building_id === p.buildingId || f.properties?.id === p.id);
              setSelectedBuilding({
                ...p,
                geometry: feat.geometry,
                priorityInfo: priMatch?.properties
              });
            }
          });

          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; min-width: 200px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #0f172a;">Building #${p.id || p.buildingId}</strong>
                <span style="background: #ef4444; color: #fff; padding: 2px 5px; border-radius: 3px; font-size: 9px; font-weight: 700;">AI ESTIMATE</span>
              </div>
              <div>Severity: <strong style="color: ${DAMAGE_COLORS[dClass]}; text-transform: uppercase;">${DAMAGE_LABELS[dClass] || dClass}</strong></div>
              <div>Confidence: <strong>${conf}%</strong></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Click building in sidebar to view full triage & route options.</div>
            </div>
          `);
        }
      });
      damages.addLayer(dmgLayer);
      dmgLayer.eachLayer(l => bounds.extend(l.getBounds()));
    }

    // C. Explainable Priority Rankings Layer
    if ((mapMode === 'PRIORITY' || mapMode === 'ROUTING') && layers.priorities && rawDataRef.current.priorities?.features) {
      const filtered = rawDataRef.current.priorities.features.filter(feat => {
        const p = feat.properties || {};
        const lvl = p.priority_level || 'LOW';
        if (priorityFilter !== 'ALL' && lvl !== priorityFilter) return false;
        return true;
      });

      const priLayer = L.geoJSON({ type: 'FeatureCollection', features: filtered }, {
        style: (feat) => {
          const lvl = feat.properties?.priority_level || 'LOW';
          const col = PRIORITY_COLORS[lvl] || '#059669';
          return {
            color: col,
            weight: 3,
            fillColor: col,
            fillOpacity: 0.75
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const lvl = p.priority_level || 'LOW';
          const score = (p.priority_score * 100).toFixed(0);

          layer.on({
            mouseover: (e) => e.target.setStyle({ weight: 5, fillOpacity: 0.95 }),
            mouseout: (e) => priLayer.resetStyle(e.target),
            click: () => {
              const dmgMatch = rawDataRef.current.damages?.features?.find(f => f.properties?.buildingId === p.building_id || f.properties?.id === p.id);
              setSelectedBuilding({
                ...p,
                ...(dmgMatch?.properties || {}),
                geometry: feat.geometry,
                priorityInfo: p
              });
            }
          });

          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; min-width: 220px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: ${PRIORITY_COLORS[lvl]}; font-size: 13px;">${lvl} PRIORITY</strong>
                <span style="background: #0f172a; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 700;">SCORE: ${score}%</span>
              </div>
              <div style="font-size: 11px; margin-bottom: 4px;">Structure ID: <strong>#${p.building_id || p.id}</strong></div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; font-size: 11px;">
                ${p.explanation || 'Multi-factor triage ranking.'}
              </div>
            </div>
          `);
        }
      });
      priorities.addLayer(priLayer);
      priLayer.eachLayer(l => bounds.extend(l.getBounds()));
    }

    // D. Ground Truth Footprints Layer
    if (layers.buildings && rawDataRef.current.buildings?.features) {
      const bldgLayer = L.geoJSON(rawDataRef.current.buildings, {
        style: () => ({
          color: '#0284c7',
          weight: 2,
          dashArray: '4, 4',
          fillColor: '#0284c7',
          fillOpacity: 0.15
        })
      });
      buildings.addLayer(bldgLayer);
      bldgLayer.eachLayer(l => bounds.extend(l.getBounds()));
    }

    // E. Road Network Layer
    if (layers.roads && rawDataRef.current.roads?.features) {
      const roadLayer = L.geoJSON(rawDataRef.current.roads, {
        style: (feat) => {
          const isBlocked = feat.properties?.isBlocked;
          return {
            color: isBlocked ? '#7c3aed' : '#334155',
            weight: isBlocked ? 5 : 3,
            dashArray: isBlocked ? '8, 8' : null,
            opacity: 0.85
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const status = p.isBlocked ? '⛔ BLOCKED (Avoided in Detours)' : '🟢 Passable Route';
          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px;">
              <strong>${p.name || 'Unnamed Corridor'}</strong><br/>
              Status: <span style="font-weight: 700; color: ${p.isBlocked ? '#7c3aed' : '#10b981'};">${status}</span><br/>
              ${p.isBlocked ? `Hazard: <em>${p.blockReason || 'Wildfire debris'}</em><br/>` : ''}
              Type: ${p.highwayType || 'primary'}
            </div>
          `);
        }
      });
      roads.addLayer(roadLayer);
      roadLayer.eachLayer(l => bounds.extend(l.getBounds()));
    }

    // F. Hospitals Layer
    if (layers.hospitals && rawDataRef.current.hospitals?.features) {
      const hospLayer = L.geoJSON(rawDataRef.current.hospitals, {
        pointToLayer: (feat, latlng) => {
          const icon = L.divIcon({
            html: `<div style="background-color: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25);">+</div>`,
            className: 'hospital-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px;">
              <strong style="color: #dc2626; font-size: 13px;">🏥 ${p.name || 'Emergency Medical Center'}</strong><br/>
              Status: 🟢 Operational<br/>
              Bed Capacity: <strong>${p.capacity || 'Unknown'} beds</strong><br/>
              Emergency Phone: ${p.phone || '911'}
            </div>
          `);
        }
      });
      hospitals.addLayer(hospLayer);
      hospLayer.eachLayer(l => bounds.extend(l.getBounds()));
    }

    // G. Shelters Layer
    if (layers.shelters && rawDataRef.current.shelters?.features) {
      const sheltLayer = L.geoJSON(rawDataRef.current.shelters, {
        pointToLayer: (feat, latlng) => {
          const icon = L.divIcon({
            html: `<div style="background-color: #0284c7; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25);">⛺</div>`,
            className: 'shelter-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px;">
              <strong style="color: #0284c7; font-size: 13px;">⛺ ${p.name || 'Relief Shelter'}</strong><br/>
              Status: 🟢 Open & Receiving<br/>
              Evacuee Capacity: <strong>${p.capacity || '500'} people</strong><br/>
              Designation: ${p.shelterType || 'Designated Refuge Area'}
            </div>
          `);
        }
      });
      shelters.addLayer(sheltLayer);
      sheltLayer.eachLayer(l => bounds.extend(l.getBounds()));
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  // 5. Calculate Evacuation Route
  async function calculateRoute(destType = 'hospital') {
    if (!selectedBuilding || !selectedBuilding.geometry) {
      setError('Please select a building on the map first to plan an evacuation route.');
      return;
    }

    setRoutingLoading(true);
    setError(null);

    try {
      const coords = selectedBuilding.geometry.coordinates[0];
      let sumLon = 0, sumLat = 0;
      coords.forEach(c => { sumLon += c[0]; sumLat += c[1]; });
      const originLon = sumLon / coords.length;
      const originLat = sumLat / coords.length;

      const resp = await api.post('/routes', {
        scenarioId: selectedScenarioId,
        priorityId: selectedBuilding.id,
        originLon: originLon,
        originLat: originLat,
        destinationType: destType,
        avoidBlocked: avoidBlockedRoads
      });

      const routeData = resp.data;
      setActiveRoute(routeData);

      // Render Route LineString
      const map = mapInstanceRef.current;
      const routeGroup = layerGroupsRef.current.route;
      routeGroup.clearLayers();

      if (routeData.routeGeoJson && map) {
        const rLayer = L.geoJSON(routeData.routeGeoJson, {
          style: {
            color: '#0284c7',
            weight: 6,
            opacity: 0.95
          }
        });
        routeGroup.addLayer(rLayer);
        map.fitBounds(rLayer.getBounds(), { padding: [60, 60] });
      }
    } catch (err) {
      setError(`Route calculation error: ${err.response?.data?.message || err.message}`);
    } finally {
      setRoutingLoading(false);
    }
  }

  function clearRoute() {
    layerGroupsRef.current.route.clearLayers();
    setActiveRoute(null);
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ============================================================ */}
      {/* LEFT COLUMN: Controls, Modes & Layer Toggles (280px)         */}
      {/* ============================================================ */}
      <div style={{
        width: '280px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        zIndex: 10
      }}>
        
        {/* Scenario Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Active Incident
            </span>
          </div>
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f172a',
              backgroundColor: '#f8fafc'
            }}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Map Analysis Mode Switcher */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Operations Mode
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setMapMode('DAMAGE')}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mapMode === 'DAMAGE' ? '#0f172a' : '#e2e8f0',
                backgroundColor: mapMode === 'DAMAGE' ? '#0f172a' : '#ffffff',
                color: mapMode === 'DAMAGE' ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>1. 🤖</span> AI Damage Severity
            </button>

            <button
              onClick={() => setMapMode('PRIORITY')}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mapMode === 'PRIORITY' ? '#0f172a' : '#e2e8f0',
                backgroundColor: mapMode === 'PRIORITY' ? '#0f172a' : '#ffffff',
                color: mapMode === 'PRIORITY' ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>2. 🚨</span> Priority Triage Analysis
            </button>

            <button
              onClick={() => setMapMode('ROUTING')}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mapMode === 'ROUTING' ? '#0f172a' : '#e2e8f0',
                backgroundColor: mapMode === 'ROUTING' ? '#0f172a' : '#ffffff',
                color: mapMode === 'ROUTING' ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>3. 🧭</span> Response & Evacuation Routing
            </button>
          </div>
        </div>

        {/* Dynamic Filter Controls */}
        {mapMode === 'DAMAGE' && (
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Severity Filter
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
              {['ALL', 'no-damage', 'minor-damage', 'major-damage', 'destroyed'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setDamageFilter(cat)}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: damageFilter === cat ? '#0f172a' : '#cbd5e1',
                    backgroundColor: damageFilter === cat ? '#0f172a' : '#fff',
                    color: damageFilter === cat ? '#fff' : '#334155',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {cat === 'ALL' ? 'All Classes' : DAMAGE_LABELS[cat]}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
              Confidence: <strong>{(confidenceThreshold * 100).toFixed(0)}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {mapMode !== 'DAMAGE' && (
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Priority Urgency Filter
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setPriorityFilter(lvl)}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: priorityFilter === lvl ? PRIORITY_COLORS[lvl] || '#0f172a' : '#cbd5e1',
                    backgroundColor: priorityFilter === lvl ? PRIORITY_COLORS[lvl] || '#0f172a' : '#fff',
                    color: priorityFilter === lvl ? '#fff' : '#334155',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layer Toggles */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Map Layers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={layers.damages}
                  onChange={(e) => setLayers({ ...layers, damages: e.target.checked })}
                />
                <span>AI Damage Polygons</span>
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>181</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={layers.buildings}
                  onChange={(e) => setLayers({ ...layers, buildings: e.target.checked })}
                />
                <span>Ground Truth (xBD)</span>
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>181</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={layers.roads}
                  onChange={(e) => setLayers({ ...layers, roads: e.target.checked })}
                />
                <span>Road Network</span>
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>8</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={layers.hospitals}
                  onChange={(e) => setLayers({ ...layers, hospitals: e.target.checked })}
                />
                <span>Emergency Hospitals</span>
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#dc2626' }}>7</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={layers.shelters}
                  onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })}
                />
                <span>Relief Shelters</span>
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#0284c7' }}>6</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={layers.boundary}
                  onChange={(e) => setLayers({ ...layers, boundary: e.target.checked })}
                />
                <span>Incident Boundary</span>
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>1</span>
            </label>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* CENTER COLUMN: Large Interactive Map Canvas (Flex-1)        */}
      {/* ============================================================ */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0' }} />

        {/* Floating Mode & Legend Badge */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          zIndex: 1000,
          fontSize: '11px',
          border: '1px solid #cbd5e1',
          minWidth: '180px'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
            {mapMode === 'DAMAGE' ? 'AI DAMAGE SEVERITY' : 'TRIAGE PRIORITY LEVEL'}
          </div>

          {mapMode === 'DAMAGE' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: DAMAGE_COLORS['no-damage'], borderRadius: '2px' }}></span>
                <span>No Damage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: DAMAGE_COLORS['minor-damage'], borderRadius: '2px' }}></span>
                <span>Minor Damage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: DAMAGE_COLORS['major-damage'], borderRadius: '2px' }}></span>
                <span>Major Damage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: DAMAGE_COLORS['destroyed'], borderRadius: '2px' }}></span>
                <span>Destroyed</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: PRIORITY_COLORS['CRITICAL'], borderRadius: '2px' }}></span>
                <span style={{ fontWeight: 700, color: PRIORITY_COLORS['CRITICAL'] }}>Critical Priority (≥70%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: PRIORITY_COLORS['HIGH'], borderRadius: '2px' }}></span>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['HIGH'] }}>High Priority (50-70%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: PRIORITY_COLORS['MEDIUM'], borderRadius: '2px' }}></span>
                <span>Medium Priority (30-50%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: PRIORITY_COLORS['LOW'], borderRadius: '2px' }}></span>
                <span>Low Priority (&lt;30%)</span>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '4px', color: '#64748b', fontSize: '9px', marginTop: '4px' }}>
            <div>⛔ Violet line: Blocked roadway</div>
            <div>🏥 Red circle: Emergency Hospital</div>
            <div>⛺ Blue circle: Relief Shelter</div>
            <div>🔵 Solid Blue Line: Suggested Route</div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: Building Details, Triage & Routing (380px)     */}
      {/* ============================================================ */}
      <div style={{
        width: '380px',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        padding: '18px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        zIndex: 10
      }}>
        
        {/* Subtle Scientific Disclosure */}
        <div style={{
          backgroundColor: '#f8fafc',
          color: '#475569',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          border: '1px solid #e2e8f0',
          lineHeight: 1.4
        }}>
          <strong>⚖️ Decision-Support Prototype:</strong> AI predictions and evacuation paths are computed demonstration estimates. Emergency responders should verify live ground conditions.
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* Selected Location Card */}
        {selectedBuilding ? (
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #0f172a',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Structure #{selectedBuilding.id || selectedBuilding.buildingId}
                </h3>
                <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px' }}>
                  AI ESTIMATE
                </span>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* AI Damage Assessment Section */}
            <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  AI Damage Severity
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: DAMAGE_COLORS[selectedBuilding.damageClass] || '#94a3b8',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  {DAMAGE_LABELS[selectedBuilding.damageClass] || selectedBuilding.damageClass}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
                Model Confidence: <strong>{selectedBuilding.confidence ? (selectedBuilding.confidence * 100).toFixed(1) : '100.0'}%</strong>
              </div>

              {/* 4-Class Softmax Probability Bars */}
              {selectedBuilding.probabilities && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    4-Class Softmax Distribution:
                  </div>
                  {['no-damage', 'minor-damage', 'major-damage', 'destroyed'].map(k => {
                    const prob = selectedBuilding.probabilities[k] || 0;
                    return (
                      <div key={k} style={{ marginBottom: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                          <span style={{ color: '#475569' }}>{DAMAGE_LABELS[k]}:</span>
                          <strong>{(prob * 100).toFixed(1)}%</strong>
                        </div>
                        <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${prob * 100}%`, height: '100%', backgroundColor: DAMAGE_COLORS[k] }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Explainable Priority Breakdown */}
            {selectedBuilding.priorityInfo && (
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: PRIORITY_COLORS[selectedBuilding.priorityInfo.priority_level || selectedBuilding.priorityInfo.priorityLevel] || '#0f172a',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '11px'
                  }}>
                    {selectedBuilding.priorityInfo.priority_level || selectedBuilding.priorityInfo.priorityLevel} PRIORITY
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    Score: {((selectedBuilding.priorityInfo.priority_score || selectedBuilding.priorityInfo.priorityScore) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* 4 Factor Contribution Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Severity (40%):</span>
                      <strong>{((selectedBuilding.priorityInfo.severity_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.severity_score || 0) * 100}%`, height: '100%', backgroundColor: '#ef4444' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Population Exposure (25%):</span>
                      <strong>{((selectedBuilding.priorityInfo.population_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.population_score || 0) * 100}%`, height: '100%', backgroundColor: '#f59e0b' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Infrastructure Proximity (20%):</span>
                      <strong>{((selectedBuilding.priorityInfo.infrastructure_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.infrastructure_score || 0) * 100}%`, height: '100%', backgroundColor: '#0284c7' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Accessibility Impairment (15%):</span>
                      <strong>{((selectedBuilding.priorityInfo.accessibility_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.accessibility_score || 0) * 100}%`, height: '100%', backgroundColor: '#7c3aed' }}></div>
                    </div>
                  </div>
                </div>

                {/* Plain-Language Reason */}
                <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.4, borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  <strong>Triage Rationale:</strong> {selectedBuilding.priorityInfo.explanation}
                </div>
              </div>
            )}

            {/* Evacuation Route Planner */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Emergency Evacuation Router
              </div>

              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avoidBlockedRoads}
                  onChange={(e) => setAvoidBlockedRoads(e.target.checked)}
                />
                <span>Avoid Blocked Roads (Detour Calculation)</span>
              </label>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => calculateRoute('hospital')}
                  disabled={routingLoading}
                  style={{
                    flex: 1,
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🏥 Route to Hospital
                </button>

                <button
                  onClick={() => calculateRoute('shelter')}
                  disabled={routingLoading}
                  style={{
                    flex: 1,
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⛺ Route to Shelter
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ padding: '24px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
            💡 Click on any building footprint on the map to inspect AI damage probabilities, view explainable triage scores, and plan evacuation routes.
          </div>
        )}

        {/* Calculated Evacuation Route Card */}
        {activeRoute && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #0284c7',
            borderRadius: '8px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>SUGGESTED ROUTE</span>
                <span style={{ fontSize: '9px', fontWeight: 700, backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '3px' }}>
                  DETOUR ACTIVE
                </span>
              </div>
              <button
                onClick={clearRoute}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#64748b' }}
              >
                Clear
              </button>
            </div>

            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
              Destination: <strong>{activeRoute.destinationName}</strong> ({activeRoute.destinationType})
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Total Distance:</span>
              <strong>{activeRoute.distanceKm} km</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Estimated Travel Time:</span>
              <strong>~{activeRoute.estimatedMinutes} mins</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Blocked Roads Avoided:</span>
              <strong style={{ color: '#7c3aed' }}>{activeRoute.routeGeoJson?.properties?.avoided_blockage_count || 4} roads</strong>
            </div>

            <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid #e0f2fe', paddingTop: '4px', marginTop: '4px' }}>
              Dijkstra Calculation Latency: {activeRoute.calculationTimeMs} ms
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

export default DisasterMap;
