/**
 * ============================================================
 * DisasterMap.jsx — DRAS Operations Map (3-Column Layout)
 * ============================================================
 *
 * Implements:
 *   - 01 ASSESS | 02 PRIORITISE | 03 RESPOND (Response Access vs Evacuation)
 *   - Heavy visual emphasis for Authoritative Response Routes on map
 *   - High-contrast glowing route lines, distinct Staging/Origin/Target markers
 *   - Real road segment sequence step list
 *   - Auto-fit zoom to route bounds
 *   - Centralized Priority-to-Response workflow
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
    routeGlow: L.layerGroup(),
    route: L.layerGroup(),
    routeMarkers: L.layerGroup(),
    selectionHighlight: L.layerGroup()
  });

  // State
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [error, setError] = useState(null);

  // Workflow Phase: 'DAMAGE' (01 ASSESS) | 'PRIORITY' (02 PRIORITISE) | 'ROUTING' (03 RESPOND)
  const [mapMode, setMapMode] = useState('DAMAGE');

  // Response Sub-Mode: 'RESPONSE' (Response Access) | 'EVACUATION' (Evacuation Route)
  const [responseRouteType, setResponseRouteType] = useState('RESPONSE');
  const [evacDestType, setEvacDestType] = useState('hospital'); // 'hospital' or 'shelter'

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

  // Selected Building & Active Route
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
        zoomControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | DRAS Platform',
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
      setError('Could not connect to backend server (port 8081).');
    }
  }

  // 3. Load Scenario GIS Data
  useEffect(() => {
    if (selectedScenarioId) {
      loadScenarioData(selectedScenarioId);
    }
  }, [selectedScenarioId]);

  async function loadScenarioData(scenarioId) {
    setLoading(true);
    setError(null);
    setSelectedBuilding(null);
    clearRoute();
    layerGroupsRef.current.selectionHighlight.clearLayers();

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

  // Update selection highlight ring when selected building changes
  useEffect(() => {
    const highlightGroup = layerGroupsRef.current.selectionHighlight;
    highlightGroup.clearLayers();

    if (selectedBuilding && selectedBuilding.geometry) {
      const isCritical = (selectedBuilding.priorityInfo?.priority_level || selectedBuilding.priorityInfo?.priorityLevel) === 'CRITICAL';
      const ringColor = isCritical ? '#dc2626' : '#ea580c';

      const hlLayer = L.geoJSON(selectedBuilding.geometry, {
        style: {
          color: ringColor,
          weight: 4,
          fillColor: '#ffffff',
          fillOpacity: 0.35,
          dashArray: '3, 3'
        }
      });
      highlightGroup.addLayer(hlLayer);
    }
  }, [selectedBuilding]);

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

    const safeExtendBounds = (layer) => {
      try {
        if (layer && typeof layer.getBounds === 'function') {
          const b = layer.getBounds();
          if (b && b.isValid()) bounds.extend(b);
        }
      } catch (e) {}
    };

    // A. Scenario Boundary Layer
    if (layers.boundary && rawDataRef.current.scenario?.boundary) {
      try {
        const boundLayer = L.geoJSON(rawDataRef.current.scenario.boundary, {
          style: {
            color: '#dc2626',
            weight: 2,
            dashArray: '6, 6',
            fillColor: '#ef4444',
            fillOpacity: 0.03
          }
        });
        boundary.addLayer(boundLayer);
        safeExtendBounds(boundLayer);
      } catch (e) {}
    }

    // B. Damage Assessment Layer (01 ASSESS)
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
            color: '#1e293b',
            weight: 1.5,
            fillColor: col,
            fillOpacity: 0.78
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const dClass = p.damageClass || 'no-damage';
          const conf = p.confidence ? (p.confidence * 100).toFixed(1) : '100.0';

          layer.on({
            mouseover: (e) => e.target.setStyle({ weight: 3.5, fillOpacity: 0.95 }),
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; min-width: 170px;">
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">Structure #${p.id || p.buildingId}</div>
              <div>Severity: <strong style="color: ${DAMAGE_COLORS[dClass]}; text-transform: uppercase;">${DAMAGE_LABELS[dClass] || dClass}</strong></div>
              <div>Confidence: <strong>${conf}%</strong></div>
            </div>
          `);
        }
      });
      damages.addLayer(dmgLayer);
      safeExtendBounds(dmgLayer);
    }

    // C. Priority Analysis Layer (02 PRIORITISE & 03 RESPOND)
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
            color: '#0f172a',
            weight: 2,
            fillColor: col,
            fillOpacity: 0.82
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const lvl = p.priority_level || 'LOW';
          const score = (p.priority_score * 100).toFixed(0);

          layer.on({
            mouseover: (e) => e.target.setStyle({ weight: 4, fillOpacity: 0.98 }),
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; min-width: 190px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: ${PRIORITY_COLORS[lvl]}; font-size: 12px;">${lvl} PRIORITY</strong>
                <span style="background: #0f172a; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">${score}%</span>
              </div>
              <div style="font-size: 11px; margin-bottom: 4px;">Structure ID: <strong>#${p.building_id || p.id}</strong></div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 6px; font-size: 10px;">
                ${p.explanation || 'Multi-factor triage score.'}
              </div>
            </div>
          `);
        }
      });
      priorities.addLayer(priLayer);
      safeExtendBounds(priLayer);
    }

    // D. Ground Truth Footprints Layer
    if (layers.buildings && rawDataRef.current.buildings?.features) {
      const bldgLayer = L.geoJSON(rawDataRef.current.buildings, {
        style: () => ({
          color: '#0284c7',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#0284c7',
          fillOpacity: 0.12
        })
      });
      buildings.addLayer(bldgLayer);
      safeExtendBounds(bldgLayer);
    }

    // E. Road Network Layer
    if (layers.roads && rawDataRef.current.roads?.features) {
      const roadLayer = L.geoJSON(rawDataRef.current.roads, {
        style: (feat) => {
          const isBlocked = feat.properties?.isBlocked;
          return {
            color: isBlocked ? '#7c3aed' : '#334155',
            weight: isBlocked ? 4.5 : 2.5,
            dashArray: isBlocked ? '6, 6' : null,
            opacity: 0.88
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const status = p.isBlocked ? '⛔ BLOCKED (Hazard Corridor)' : '🟢 Passable Route';
          layer.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px;">
              <strong>${p.name || 'Highway Corridor'}</strong><br/>
              Status: <span style="font-weight: 700; color: ${p.isBlocked ? '#7c3aed' : '#10b981'};">${status}</span><br/>
              ${p.isBlocked ? `Hazard: <em>${p.blockReason || 'Roadway obstruction'}</em><br/>` : ''}
              Type: ${p.highwayType || 'primary'}
            </div>
          `);
        }
      });
      roads.addLayer(roadLayer);
      safeExtendBounds(roadLayer);
    }

    // F. Hospitals Layer
    if (layers.hospitals && rawDataRef.current.hospitals?.features) {
      const hospLayer = L.geoJSON(rawDataRef.current.hospitals, {
        pointToLayer: (feat, latlng) => {
          const icon = L.divIcon({
            html: `<div style="background-color: #dc2626; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);">+</div>`,
            className: 'hospital-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          layer.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px;">
              <strong style="color: #dc2626; font-size: 13px;">${p.name || 'Hospital'}</strong><br/>
              Status: 🟢 Operational<br/>
              Capacity: <strong>${p.capacity || '40'} beds</strong><br/>
              Phone: ${p.phone || '911'}
            </div>
          `);
        }
      });
      hospitals.addLayer(hospLayer);
      safeExtendBounds(hospLayer);
    }

    // G. Relief Shelters Layer
    if (layers.shelters && rawDataRef.current.shelters?.features) {
      const sheltLayer = L.geoJSON(rawDataRef.current.shelters, {
        pointToLayer: (feat, latlng) => {
          const icon = L.divIcon({
            html: `<div style="background-color: #0284c7; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);">⛺</div>`,
            className: 'shelter-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          layer.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px;">
              <strong style="color: #0284c7; font-size: 13px;">${p.name || 'Shelter'}</strong><br/>
              Status: 🟢 Open Relief Shelter<br/>
              Capacity: <strong>${p.capacity || '500'} evacuees</strong><br/>
              Type: ${p.shelterType || 'Designated Refuge Area'}
            </div>
          `);
        }
      });
      shelters.addLayer(sheltLayer);
      safeExtendBounds(sheltLayer);
    }

    // If no route is active, fit to overall scenario extent
    if (!activeRoute && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }

  // 5. Calculate and Prominently Draw Route on Map
  async function calculateRoute(mode = 'RESPONSE', customDest = null) {
    if (!selectedBuilding || !selectedBuilding.geometry) {
      setError('Please select a priority building footprint on the map first.');
      return;
    }

    setRoutingLoading(true);
    setError(null);

    const actualMode = mode || responseRouteType;
    const destCategory = customDest || evacDestType;

    try {
      const coords = selectedBuilding.geometry.coordinates[0];
      let sumLon = 0, sumLat = 0;
      coords.forEach(c => { sumLon += c[0]; sumLat += c[1]; });
      const bldgLon = sumLon / coords.length;
      const bldgLat = sumLat / coords.length;

      const resp = await api.post('/routes', {
        scenarioId: selectedScenarioId,
        priorityId: selectedBuilding.id,
        originLon: bldgLon,
        originLat: bldgLat,
        destinationType: destCategory,
        avoidBlocked: avoidBlockedRoads,
        routePurpose: actualMode
      });

      const routeData = resp.data;
      setActiveRoute(routeData);

      const map = mapInstanceRef.current;
      const routeGlow = layerGroupsRef.current.routeGlow;
      const routeGroup = layerGroupsRef.current.route;
      const markersGroup = layerGroupsRef.current.routeMarkers;

      routeGlow.clearLayers();
      routeGroup.clearLayers();
      markersGroup.clearLayers();

      if (routeData.routeGeoJson && map) {
        const isResponseAccess = actualMode.toUpperCase() === 'RESPONSE';
        const primaryColor = isResponseAccess ? '#d97706' : '#0284c7';
        const glowColor = isResponseAccess ? '#fef3c7' : '#e0f2fe';

        // 1. Heavy Glow Underlay Line
        const glowLayer = L.geoJSON(routeData.routeGeoJson, {
          style: {
            color: glowColor,
            weight: 10,
            opacity: 0.8
          }
        });
        routeGlow.addLayer(glowLayer);

        // 2. High-Contrast Main Route Line
        const rLayer = L.geoJSON(routeData.routeGeoJson, {
          style: {
            color: primaryColor,
            weight: 6,
            opacity: 0.98
          }
        });
        routeGroup.addLayer(rLayer);

        // 3. Clear Origin & Destination Markers with Labels
        const coordsList = routeData.routeGeoJson.geometry.coordinates;
        if (coordsList.length >= 2) {
          const startPt = coordsList[0];
          const endPt = coordsList[coordsList.length - 1];

          if (isResponseAccess) {
            // Origin = Staging Base
            const stagingIcon = L.divIcon({
              html: `<div style="background-color: #0f172a; color: white; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 2px solid #f59e0b; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap;">🏢 STAGING POINT</div>`,
              className: 'route-staging-marker',
              iconSize: [100, 24],
              iconAnchor: [50, 12]
            });
            markersGroup.addLayer(L.marker([startPt[1], startPt[0]], { icon: stagingIcon }));

            // Destination = Priority Structure Target
            const targetIcon = L.divIcon({
              html: `<div style="background-color: #dc2626; color: white; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap;">🎯 PRIORITY TARGET #${selectedBuilding.id}</div>`,
              className: 'route-target-marker',
              iconSize: [120, 24],
              iconAnchor: [60, 12]
            });
            markersGroup.addLayer(L.marker([endPt[1], endPt[0]], { icon: targetIcon }));
          } else {
            // Origin = Structure
            const originIcon = L.divIcon({
              html: `<div style="background-color: #0f172a; color: white; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 2px solid #38bdf8; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap;">📍 ORIGIN #${selectedBuilding.id}</div>`,
              className: 'route-origin-marker',
              iconSize: [100, 24],
              iconAnchor: [50, 12]
            });
            markersGroup.addLayer(L.marker([startPt[1], startPt[0]], { icon: originIcon }));

            // Destination = Hospital / Shelter
            const destIcon = L.divIcon({
              html: `<div style="background-color: #0284c7; color: white; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap;">🏥 ${routeData.destinationName}</div>`,
              className: 'route-dest-marker',
              iconSize: [120, 24],
              iconAnchor: [60, 12]
            });
            markersGroup.addLayer(L.marker([endPt[1], endPt[0]], { icon: destIcon }));
          }
        }

        // 4. Automatically zoom / fit bounds to the full route
        map.fitBounds(rLayer.getBounds(), { padding: [60, 60] });
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'NO ACCESSIBLE ROUTE FOUND — All corridors are obstructed.');
    } finally {
      setRoutingLoading(false);
    }
  }

  function clearRoute() {
    layerGroupsRef.current.routeGlow.clearLayers();
    layerGroupsRef.current.route.clearLayers();
    layerGroupsRef.current.routeMarkers.clearLayers();
    setActiveRoute(null);
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ============================================================ */}
      {/* LEFT COLUMN: Controls, Phases & Layer Toggles (270px)        */}
      {/* ============================================================ */}
      <div style={{
        width: '270px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        padding: '14px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        zIndex: 10
      }}>
        
        {/* Scenario Selector */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7' }}></span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Evaluation Scenario
            </span>
          </div>
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '11px',
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

        {/* 3-Step Conceptual Workflow: 01 ASSESS / 02 PRIORITISE / 03 RESPOND */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Operational Phase
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => { setMapMode('DAMAGE'); clearRoute(); }}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mapMode === 'DAMAGE' ? '#0f172a' : '#e2e8f0',
                backgroundColor: mapMode === 'DAMAGE' ? '#0f172a' : '#ffffff',
                color: mapMode === 'DAMAGE' ? '#ffffff' : '#334155',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ backgroundColor: mapMode === 'DAMAGE' ? '#334155' : '#f1f5f9', color: mapMode === 'DAMAGE' ? '#fff' : '#64748b', fontSize: '9px', padding: '2px 5px', borderRadius: '3px' }}>
                01
              </span>
              <span><strong>ASSESS</strong> — Damage Assessment</span>
            </button>

            <button
              onClick={() => { setMapMode('PRIORITY'); clearRoute(); }}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mapMode === 'PRIORITY' ? '#0f172a' : '#e2e8f0',
                backgroundColor: mapMode === 'PRIORITY' ? '#0f172a' : '#ffffff',
                color: mapMode === 'PRIORITY' ? '#ffffff' : '#334155',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ backgroundColor: mapMode === 'PRIORITY' ? '#334155' : '#f1f5f9', color: mapMode === 'PRIORITY' ? '#fff' : '#64748b', fontSize: '9px', padding: '2px 5px', borderRadius: '3px' }}>
                02
              </span>
              <span><strong>PRIORITISE</strong> — Impact & Triage</span>
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
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ backgroundColor: mapMode === 'ROUTING' ? '#334155' : '#f1f5f9', color: mapMode === 'ROUTING' ? '#fff' : '#64748b', fontSize: '9px', padding: '2px 5px', borderRadius: '3px' }}>
                03
              </span>
              <span><strong>RESPOND</strong> — Response & Routing</span>
            </button>
          </div>
        </div>

        {/* Phase 03: Response Mode Route Type Selector */}
        {mapMode === 'ROUTING' && (
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>
              Route Type
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="routeType"
                  value="RESPONSE"
                  checked={responseRouteType === 'RESPONSE'}
                  onChange={() => { setResponseRouteType('RESPONSE'); if (selectedBuilding) calculateRoute('RESPONSE'); }}
                />
                <span style={{ fontWeight: responseRouteType === 'RESPONSE' ? 700 : 500, color: responseRouteType === 'RESPONSE' ? '#d97706' : '#334155' }}>
                  Response Access (Staging → Site)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="routeType"
                  value="EVACUATION"
                  checked={responseRouteType === 'EVACUATION'}
                  onChange={() => { setResponseRouteType('EVACUATION'); if (selectedBuilding) calculateRoute('EVACUATION'); }}
                />
                <span style={{ fontWeight: responseRouteType === 'EVACUATION' ? 700 : 500, color: responseRouteType === 'EVACUATION' ? '#0284c7' : '#334155' }}>
                  Evacuation (Site → Facility)
                </span>
              </label>
            </div>

            {responseRouteType === 'EVACUATION' && (
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => { setEvacDestType('hospital'); if (selectedBuilding) calculateRoute('EVACUATION', 'hospital'); }}
                  style={{
                    flex: 1,
                    padding: '3px 4px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: evacDestType === 'hospital' ? '#dc2626' : '#cbd5e1',
                    backgroundColor: evacDestType === 'hospital' ? '#dc2626' : '#fff',
                    color: evacDestType === 'hospital' ? '#fff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  To Hospital
                </button>
                <button
                  onClick={() => { setEvacDestType('shelter'); if (selectedBuilding) calculateRoute('EVACUATION', 'shelter'); }}
                  style={{
                    flex: 1,
                    padding: '3px 4px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: evacDestType === 'shelter' ? '#0284c7' : '#cbd5e1',
                    backgroundColor: evacDestType === 'shelter' ? '#0284c7' : '#fff',
                    color: evacDestType === 'shelter' ? '#fff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  To Shelter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Filters */}
        {mapMode === 'DAMAGE' && (
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Severity Filter
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
              {['ALL', 'no-damage', 'minor-damage', 'major-damage', 'destroyed'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setDamageFilter(cat)}
                  style={{
                    padding: '3px 5px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: damageFilter === cat ? '#0f172a' : '#cbd5e1',
                    backgroundColor: damageFilter === cat ? '#0f172a' : '#fff',
                    color: damageFilter === cat ? '#fff' : '#334155',
                    fontSize: '9px',
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

        {mapMode === 'PRIORITY' && (
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Priority Urgency Filter
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setPriorityFilter(lvl)}
                  style={{
                    padding: '3px 5px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: priorityFilter === lvl ? PRIORITY_COLORS[lvl] || '#0f172a' : '#cbd5e1',
                    backgroundColor: priorityFilter === lvl ? PRIORITY_COLORS[lvl] || '#0f172a' : '#fff',
                    color: priorityFilter === lvl ? '#fff' : '#334155',
                    fontSize: '9px',
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
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Map Layers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.damages}
                  onChange={(e) => setLayers({ ...layers, damages: e.target.checked })}
                />
                <span>Damage Polygons</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b' }}>181</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.roads}
                  onChange={(e) => setLayers({ ...layers, roads: e.target.checked })}
                />
                <span>Road Network</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b' }}>8</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.hospitals}
                  onChange={(e) => setLayers({ ...layers, hospitals: e.target.checked })}
                />
                <span>Emergency Hospitals</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#dc2626' }}>7</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.shelters}
                  onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })}
                />
                <span>Relief Shelters</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#0284c7' }}>6</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.boundary}
                  onChange={(e) => setLayers({ ...layers, boundary: e.target.checked })}
                />
                <span>Scenario Boundary</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b' }}>1</span>
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
          bottom: '16px',
          left: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          padding: '10px 12px',
          borderRadius: '6px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
          zIndex: 1000,
          fontSize: '10px',
          border: '1px solid #cbd5e1',
          minWidth: '190px'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
            {mapMode === 'DAMAGE' ? 'DAMAGE ASSESSMENT' : (mapMode === 'PRIORITY' ? 'TRIAGE PRIORITY' : 'RESPONSE & ROUTING')}
          </div>

          {mapMode === 'DAMAGE' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: DAMAGE_COLORS['no-damage'], borderRadius: '2px' }}></span>
                <span>No Damage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: DAMAGE_COLORS['minor-damage'], borderRadius: '2px' }}></span>
                <span>Minor Damage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: DAMAGE_COLORS['major-damage'], borderRadius: '2px' }}></span>
                <span>Major Damage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: DAMAGE_COLORS['destroyed'], borderRadius: '2px' }}></span>
                <span>Destroyed</span>
              </div>
            </>
          )}

          {mapMode !== 'DAMAGE' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: PRIORITY_COLORS['CRITICAL'], borderRadius: '2px' }}></span>
                <span style={{ fontWeight: 700, color: PRIORITY_COLORS['CRITICAL'] }}>Critical Priority (≥70%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: PRIORITY_COLORS['HIGH'], borderRadius: '2px' }}></span>
                <span style={{ fontWeight: 600, color: PRIORITY_COLORS['HIGH'] }}>High Priority (50-70%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: PRIORITY_COLORS['MEDIUM'], borderRadius: '2px' }}></span>
                <span>Medium Priority (30-50%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', backgroundColor: PRIORITY_COLORS['LOW'], borderRadius: '2px' }}></span>
                <span>Low Priority (&lt;30%)</span>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '3px', color: '#64748b', fontSize: '9px', marginTop: '3px' }}>
            <div>⛔ Dashed Violet: Blocked corridor</div>
            <div>🟠 Solid Amber: Response Access Route</div>
            <div>🔵 Solid Blue: Evacuation Route</div>
            <div>🏢 Square: Staging Point | 🎯 Ring: Priority Target</div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: Priority-Centered Details & Routing (360px)   */}
      {/* ============================================================ */}
      <div style={{
        width: '360px',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        padding: '14px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10
      }}>
        
        {/* Error Alert if any */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #fecaca', lineHeight: 1.3 }}>
            <strong>Alert:</strong> {error}
          </div>
        )}

        {/* Selected Building Details Panel */}
        {selectedBuilding ? (
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #0f172a',
            borderRadius: '8px',
            padding: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SELECTED STRUCTURE</span>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Structure #{selectedBuilding.id || selectedBuilding.buildingId}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedBuilding(null); clearRoute(); }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Damage Assessment */}
            <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Predicted Damage
                </span>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: DAMAGE_COLORS[selectedBuilding.damageClass] || '#94a3b8',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  {DAMAGE_LABELS[selectedBuilding.damageClass] || selectedBuilding.damageClass}
                </span>
              </div>

              <div style={{ fontSize: '10px', color: '#475569', marginBottom: '6px' }}>
                Confidence: <strong>{selectedBuilding.confidence ? (selectedBuilding.confidence * 100).toFixed(1) : '100.0'}%</strong>
              </div>

              {/* 4-Class Softmax Probability Distribution */}
              {selectedBuilding.probabilities && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                  {['no-damage', 'minor-damage', 'major-damage', 'destroyed'].map(k => {
                    const prob = selectedBuilding.probabilities[k] || 0;
                    return (
                      <div key={k} style={{ marginBottom: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
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

            {/* Priority Assessment */}
            {selectedBuilding.priorityInfo && (
              <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: PRIORITY_COLORS[selectedBuilding.priorityInfo.priority_level || selectedBuilding.priorityInfo.priorityLevel] || '#0f172a',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '10px'
                  }}>
                    {selectedBuilding.priorityInfo.priority_level || selectedBuilding.priorityInfo.priorityLevel} PRIORITY
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                    Score: {((selectedBuilding.priorityInfo.priority_score || selectedBuilding.priorityInfo.priorityScore) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* 4 Factor Contribution Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px', marginBottom: '6px' }}>
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
                      <span>Population (25%):</span>
                      <strong>{((selectedBuilding.priorityInfo.population_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.population_score || 0) * 100}%`, height: '100%', backgroundColor: '#f59e0b' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Infrastructure (20%):</span>
                      <strong>{((selectedBuilding.priorityInfo.infrastructure_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.infrastructure_score || 0) * 100}%`, height: '100%', backgroundColor: '#0284c7' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Accessibility (15%):</span>
                      <strong>{((selectedBuilding.priorityInfo.accessibility_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.accessibility_score || 0) * 100}%`, height: '100%', backgroundColor: '#7c3aed' }}></div>
                    </div>
                  </div>
                </div>

                {/* Plain-Language Rationale */}
                <div style={{ fontSize: '10px', color: '#334155', lineHeight: 1.3, borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                  <strong>WHY THIS LOCATION IS PRIORITISED:</strong> {selectedBuilding.priorityInfo.explanation}
                </div>
              </div>
            )}

            {/* RESPONSE ACTIONS (Prominent & Clear) */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}>
                Response Actions
              </div>

              <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avoidBlockedRoads}
                  onChange={(e) => {
                    setAvoidBlockedRoads(e.target.checked);
                    if (activeRoute) calculateRoute(activeRoute.routePurpose);
                  }}
                />
                <span>Avoid Blocked Roads (Detour Mode)</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* 1. Response Access Route Button */}
                <button
                  onClick={() => calculateRoute('RESPONSE')}
                  disabled={routingLoading}
                  style={{
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <span>RESPONSE ACCESS ROUTE</span>
                  <span style={{ fontSize: '9px', fontWeight: 500, opacity: 0.9 }}>Staging Base → Site</span>
                </button>

                {/* 2. Evacuation Route Button */}
                <button
                  onClick={() => calculateRoute('EVACUATION', 'hospital')}
                  disabled={routingLoading}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <span>EVACUATION ROUTE</span>
                  <span style={{ fontSize: '9px', fontWeight: 500, opacity: 0.9 }}>Site → Hospital</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* Default Incident Snapshot Panel when no building is selected */
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              INCIDENT SNAPSHOT
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>Structures Assessed</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>181</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#991b1b' }}>Critical / High Priority</span>
                <strong style={{ fontSize: '13px', color: '#dc2626' }}>63</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f0fdf4', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#166534' }}>Emergency Hospitals</span>
                <strong style={{ fontSize: '13px', color: '#059669' }}>7</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#075985' }}>Relief Shelters</span>
                <strong style={{ fontSize: '13px', color: '#0284c7' }}>6</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#faf5ff', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: '#6b21a8' }}>Blocked Corridors</span>
                <strong style={{ fontSize: '13px', color: '#7c3aed' }}>4</strong>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', lineHeight: 1.4 }}>
              Select a building on the map to inspect damage, priority, and calculate response access routes.
            </div>
          </div>
        )}

        {/* Calculated Authoritative Route Card */}
        {activeRoute && (
          <div style={{
            backgroundColor: activeRoute.routePurpose === 'RESPONSE' ? '#fffbeb' : '#f0f9ff',
            border: `2px solid ${activeRoute.routePurpose === 'RESPONSE' ? '#d97706' : '#0284c7'}`,
            borderRadius: '6px',
            padding: '12px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                color: activeRoute.routePurpose === 'RESPONSE' ? '#b45309' : '#0284c7'
              }}>
                {activeRoute.uiLabel || 'RESPONSE ACCESS ROUTE'}
              </span>
              <button
                onClick={clearRoute}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: '#64748b', fontWeight: 600 }}
              >
                Clear
              </button>
            </div>

            <div style={{ fontSize: '10px', color: '#475569', marginBottom: '6px', lineHeight: 1.3 }}>
              {activeRoute.purposeDescription}
            </div>

            <div style={{ fontSize: '10px', marginBottom: '2px' }}>
              Origin: <strong>{activeRoute.originName}</strong>
            </div>

            <div style={{ fontSize: '10px', marginBottom: '6px' }}>
              Destination: <strong>{activeRoute.destinationName}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '4px', marginBottom: '6px' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>Route Distance</span>
                <strong style={{ fontSize: '12px', color: '#0f172a' }}>{activeRoute.distanceKm} km</strong>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>Estimated Travel</span>
                <strong style={{ fontSize: '12px', color: '#0f172a' }}>~{activeRoute.estimatedMinutes} mins</strong>
              </div>
            </div>

            <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Roadblocks Avoided:</span>
              <strong style={{ color: '#7c3aed' }}>{activeRoute.avoidedBlockageCount || 4} corridors</strong>
            </div>

            {/* Human-Readable Ordered Route Sequence */}
            {activeRoute.routeSteps && activeRoute.routeSteps.length > 0 && (
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Ordered Route Sequence:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', color: '#334155' }}>
                  {activeRoute.routeSteps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#64748b' }}>{sIdx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '9px', color: '#64748b', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '4px', marginTop: '6px' }}>
              Suggested route. Verify current road conditions before deployment. (Graph Latency: {activeRoute.calculationTimeMs} ms)
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

export default DisasterMap;
