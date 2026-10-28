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
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import * as Cesium from 'cesium';
import CesiumGlobe from '../components/globe/CesiumGlobe';
import { Layers, ChevronRight, ChevronDown, ChevronUp, ShieldAlert, BellOff, X, Satellite, Globe, Map as MapIcon, Volume2, VolumeX, ExternalLink, FileCode, Truck, Radio, AlertTriangle, CheckCircle, Crosshair, Send } from 'lucide-react';

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
  const { scenarioId: urlScenarioId } = useParams();
  const navigate = useNavigate();
  const { theme, isDark, tokens } = useTheme();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupsRef = useRef({
    boundary: L.layerGroup(),
    zones: L.layerGroup(),
    hazardZones: L.layerGroup(),
    damages: L.layerGroup(),
    priorities: L.layerGroup(),
    buildings: L.layerGroup(),
    roads: L.layerGroup(),
    hospitals: L.layerGroup(),
    shelters: L.layerGroup(),
    alerts: L.layerGroup(),
    units: L.layerGroup(),
    routeGlow: L.layerGroup(),
    route: L.layerGroup(),
    routeMarkers: L.layerGroup(),
    selectionHighlight: L.layerGroup()
  });

  // State
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(urlScenarioId ? parseInt(urlScenarioId) : 1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  // 2D / 3D Globe Mode: '3D' (Cesium 3D Earth) | '2D' (Leaflet 2D Map)
  const [mapViewMode, setMapViewMode] = useState('3D');
  const [presentationMode, setPresentationMode] = useState(false);

  // View Level: 'BUILDINGS' | 'ZONES' | 'BOTH'
  const [viewLevel, setViewLevel] = useState('BOTH');

  // Workflow Phase: 'DAMAGE' (01 ASSESS) | 'PRIORITY' (02 PRIORITISE) | 'ROUTING' (03 RESPOND)
  const [mapMode, setMapMode] = useState('DAMAGE');

  // Response Sub-Mode: 'RESPONSE' (Response Access) | 'EVACUATION' (Evacuation Route)
  const [responseRouteType, setResponseRouteType] = useState('RESPONSE');
  const [evacDestType, setEvacDestType] = useState('hospital'); // 'hospital' or 'shelter'

  // Layer Toggles
  const [layers, setLayers] = useState({
    zones: true,
    hazards: true,
    damages: true,
    priorities: true,
    buildings: false,
    roads: true,
    hospitals: true,
    shelters: true,
    alerts: true,
    units: true,
    boundary: true
  });

  // Filters
  const [damageFilter, setDamageFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.0);
  const [avoidBlockedRoads, setAvoidBlockedRoads] = useState(true);

  // Selected Building, Zone & Active Route
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [activeAlertsList, setActiveAlertsList] = useState([]);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [isAlertMinimized, setIsAlertMinimized] = useState(false);
  const [isAlertsSilenced, setIsAlertsSilenced] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Zone Alert Broadcast & CAD Service Dispatch State
  const [isZoneAlertModalOpen, setIsZoneAlertModalOpen] = useState(false);
  const [zoneAlertForm, setZoneAlertForm] = useState({
    zoneId: '',
    zoneName: '',
    headline: '',
    description: '',
    instruction: '',
    urgency: 'Immediate',
    severity: 'Extreme',
    category: 'Safety'
  });
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchTargetZone, setDispatchTargetZone] = useState(null);
  const [selectedUnitForDispatch, setSelectedUnitForDispatch] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [availableUnitsList, setAvailableUnitsList] = useState([]);
  const [dispatchServiceFilter, setDispatchServiceFilter] = useState('ALL');
  const [actionSuccessNotice, setActionSuccessNotice] = useState(null);

  // Raw GeoJSON Data Cache
  const rawDataRef = useRef({
    damages: null,
    priorities: null,
    buildings: null,
    roads: null,
    hospitals: null,
    shelters: null,
    zones: null,
    hazards: null,
    alerts: null,
    units: null,
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
      setTimeout(() => {
        try {
          if (mapInstanceRef.current && mapContainerRef.current) {
            map.invalidateSize();
          }
        } catch (e) {}
      }, 200);
    }

    loadScenarios();

    return () => {
      stopSiren();
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
        if (!urlScenarioId) {
          setSelectedScenarioId(resp.data[0].id);
        }
      }
    } catch (err) {
      setError('Could not connect to backend server (port 8081).');
    }
  }

  // Sync with URL param if it changes
  useEffect(() => {
    if (urlScenarioId) {
      setSelectedScenarioId(parseInt(urlScenarioId));
    }
  }, [urlScenarioId]);

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
    setSelectedZone(null);
    clearRoute();
    layerGroupsRef.current.selectionHighlight.clearLayers();

    try {
      const [scenResp, damagesResp, priResp, bldgsResp, roadsResp, hospResp, sheltResp, sumResp, zonesResp, hazardsResp, alertsResp, unitsResp, alertsListResp] = await Promise.all([
        api.get(`/scenarios/${scenarioId}`).catch(() => ({ data: null })),
        api.get(`/map/damages?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/priorities/geojson?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/buildings?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/roads?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/hospitals?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/shelters?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/analysis/${scenarioId}/summary`).catch(() => ({ data: null })),
        api.get(`/map/zones?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/map/hazards?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/alerts/geojson?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/units/geojson?scenarioId=${scenarioId}`).catch(() => ({ data: { features: [] } })),
        api.get(`/alerts?activeOnly=true&scenarioId=${scenarioId}`).catch(() => ({ data: [] }))
      ]);

      rawDataRef.current = {
        scenario: scenResp.data,
        damages: damagesResp.data,
        priorities: priResp.data,
        buildings: bldgsResp.data,
        roads: roadsResp.data,
        hospitals: hospResp.data,
        shelters: sheltResp.data,
        zones: zonesResp.data,
        hazards: hazardsResp.data,
        alerts: alertsResp.data,
        units: unitsResp.data
      };

      setSummary(sumResp.data);
      const rawAlertList = Array.isArray(alertsListResp.data) ? alertsListResp.data : [];
      let finalAlertList = [];
      if (rawAlertList.length > 0) {
        finalAlertList = rawAlertList;
      } else {
        const zFeatures = zonesResp.data?.features || [];
        const fallbackAlerts = zFeatures.slice(0, 3).map((zf, idx) => {
          const zp = zf.properties || {};
          const isCrit = zp.criticality === 'CRITICAL';
          return {
            id: `00000000-0000-0000-0000-00000000000${idx + 1}`,
            identifier: `AIDRS-${scenarioId}-SEC-${zp.id || idx + 1}`,
            scenarioId: scenarioId,
            targetZoneId: zp.id,
            geometry: zf.geometry,
            event: `${zp.criticality || 'HIGH'} Response Directive`,
            severity: isCrit ? 'Extreme' : 'Severe',
            urgency: isCrit ? 'Immediate' : 'Expected',
            headline: `${isCrit ? 'MANDATORY EVACUATION' : 'PRE-EVACUATION WARNING'}: ${zp.name || 'Operational Sector'}`,
            description: `Active threat escalation in ${zp.name || 'sector'}. ${zp.totalBuildings || 0} structures assessed. Criticality index: ${zp.criticalityScore || 0.85}.`,
            instruction: 'Evacuate immediately via designated primary corridors toward nearest safe relief shelter.'
          };
        });
        finalAlertList = fallbackAlerts.length > 0 ? fallbackAlerts : [
          {
            id: '00000000-0000-0000-0000-000000000001',
            identifier: `AIDRS-CAP-SEC-S${scenarioId}-01`,
            scenarioId: scenarioId,
            event: 'Mandatory Evacuation Warning',
            severity: 'Extreme',
            urgency: 'Immediate',
            headline: `MANDATORY EVACUATION: Scenario ${scenarioId} High Risk Sector`,
            description: 'Hazard escalation detected across operational sector.',
            instruction: 'Evacuate immediately via designated corridors toward nearest relief shelter.'
          }
        ];
      }
      setActiveAlertsList(finalAlertList);
      rawDataRef.current.alertList = finalAlertList;
      setDataVersion(v => v + 1);
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
  }, [layers, mapMode, viewLevel, selectedZone, damageFilter, priorityFilter, confidenceThreshold, activeAlertsList, isAlertsSilenced]);

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

    const { boundary, zones, hazardZones, damages, priorities, buildings, roads, hospitals, shelters, alerts, units } = layerGroupsRef.current;

    boundary.clearLayers();
    zones.clearLayers();
    hazardZones.clearLayers();
    damages.clearLayers();
    priorities.clearLayers();
    buildings.clearLayers();
    roads.clearLayers();
    hospitals.clearLayers();
    shelters.clearLayers();
    if (alerts) alerts.clearLayers();
    if (units) units.clearLayers();

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

    // A1. Hazard Zones & Impact Extents (Dharali Debris Fan, Chamoli Glacial Surge, Fani Wind Swath, Woolsey Burn Scar)
    if (layers.hazards && rawDataRef.current.hazards?.features) {
      const isDharali = selectedScenarioId === 4;
      const hzLayer = L.geoJSON(rawDataRef.current.hazards, {
        style: (feat) => {
          const p = feat.properties || {};
          const hType = p.hazard_type || p.hazardType || '';
          if (isDharali || hType === 'DEBRIS_FAN_EXTENT') {
            return {
              color: '#dc2626',
              weight: 4,
              dashArray: '8, 4',
              fillColor: '#ef4444',
              fillOpacity: 0.38
            };
          }
          if (hType === 'GLACIAL_SURGE_CORRIDOR') {
            return {
              color: '#d97706',
              weight: 4,
              dashArray: '7, 4',
              fillColor: '#f59e0b',
              fillOpacity: 0.34
            };
          }
          if (hType === 'STORM_SURGE_SWATH') {
            return {
              color: '#0284c7',
              weight: 4,
              dashArray: '7, 4',
              fillColor: '#0ea5e9',
              fillOpacity: 0.32
            };
          }
          return {
            color: '#ea580c',
            weight: 4,
            dashArray: '6, 4',
            fillColor: '#f97316',
            fillOpacity: 0.34
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const title = isDharali 
            ? 'Dharali 2025 Debris / Impact Extent (20.4 ha)' 
            : (p.description || p.hazard_type || p.hazardType || 'Disaster Hazard Corridor');

          layer.bindTooltip(`
            <div style="font-family: Inter, sans-serif; font-size: 11px; padding: 2px;">
              <strong style="color: #b91c1c; font-weight: 800;">⚠️ [HAZARD] ${title}</strong><br/>
              <span style="font-size: 10px; color: #475569;">${p.source || 'Satellite Sensor Analysis'}</span>
            </div>
          `, { sticky: false, direction: 'center', opacity: 0.95 });

          layer.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; min-width: 240px;">
              <div style="font-weight: 800; color: #b91c1c; margin-bottom: 4px; font-size: 13px;">
                ⚠️ ${title}
              </div>
              <div style="font-size: 11px; color: #334155; margin-bottom: 6px; line-height: 1.35;">
                ${p.description || 'Primary delineated impact / hazard corridor'}
              </div>
              <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 4px; padding: 5px 8px; font-size: 10.5px; color: #991b1b;">
                <strong>Severity:</strong> ${p.severity || 'CRITICAL'} &bull; <strong>Source:</strong> ${p.source || 'Geospatial Analysis'}
              </div>
            </div>
          `);
        }
      });
      hazardZones.addLayer(hzLayer);
      safeExtendBounds(hzLayer);
    }

    // A2. Operational Zones Layer (Macro / Sector Overview)
    if ((viewLevel === 'ZONES' || viewLevel === 'BOTH') && layers.zones && rawDataRef.current.zones?.features) {
      const zoneLayer = L.geoJSON(rawDataRef.current.zones, {
        style: (feat) => {
          const crit = feat.properties?.criticality || 'LOW';
          const isSelected = selectedZone?.id === feat.properties?.id;
          const col = PRIORITY_COLORS[crit] || '#059669';
          return {
            color: isSelected ? '#ffffff' : col,
            weight: isSelected ? 4 : 2.5,
            dashArray: crit === 'CRITICAL' ? '4, 4' : null,
            fillColor: col,
            fillOpacity: isSelected ? 0.38 : 0.20
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const crit = p.criticality || 'LOW';
          const col = PRIORITY_COLORS[crit] || '#059669';

          layer.on({
            mouseover: (e) => e.target.setStyle({ weight: 4, fillOpacity: 0.40 }),
            mouseout: (e) => {
              if (selectedZone?.id !== p.id) {
                zoneLayer.resetStyle(e.target);
              }
            },
            click: () => {
              setSelectedZone(p);
              setSelectedBuilding(null);
              if (layer.getBounds && layer.getBounds().isValid()) {
                map.fitBounds(layer.getBounds(), { padding: [40, 40] });
              }
            }
          });

          layer.bindTooltip(`
            <div style="font-family: Inter, sans-serif; font-size: 11px;">
              <strong style="color: ${col}; font-weight: 800;">[${crit}] ${p.zoneCode || ''}</strong><br/>
              <strong>${p.name}</strong><br/>
              Evaluated: <strong>${p.totalBuildings}</strong> | Destroyed: <strong>${p.destroyedCount}</strong><br/>
              Criticality Index: <strong>${((p.criticalityScore || 0) * 100).toFixed(0)}%</strong>
            </div>
          `, { sticky: false, direction: 'center' });

          // Visible centroid badge marker on map
          if (layer.getBounds && layer.getBounds().isValid()) {
            const center = layer.getBounds().getCenter();
            const badgeHtml = `
              <div style="
                background: ${isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)'};
                border: 2px solid ${col};
                color: ${isDark ? '#f8fafc' : '#0f172a'};
                padding: 3px 8px;
                border-radius: 6px;
                font-family: Inter, sans-serif;
                font-size: 11px;
                font-weight: 800;
                white-space: nowrap;
                box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                cursor: pointer;
                text-align: center;
                pointer-events: auto;
                line-height: 1.2;
              ">
                <span style="color: ${col}; font-weight: 900;">${p.zoneCode || ''}</span>
                <span style="font-size: 9px; margin-left: 4px; padding: 1px 4px; background: ${col}25; color: ${col}; border-radius: 3px; text-transform: uppercase;">${crit}</span>
                <div style="font-size: 10px; font-weight: 600; color: ${isDark ? '#94a3b8' : '#475569'}; margin-top: 1px;">
                  ${p.name ? p.name.split(' ')[0] : ''}
                </div>
              </div>
            `;
            const icon = L.divIcon({
              html: badgeHtml,
              className: 'zone-centroid-badge',
              iconSize: [110, 36],
              iconAnchor: [55, 18]
            });
            const marker = L.marker(center, { icon, interactive: true });
            marker.on('click', () => {
              setSelectedZone(p);
              setSelectedBuilding(null);
              if (layer.getBounds && layer.getBounds().isValid()) {
                map.fitBounds(layer.getBounds(), { padding: [40, 40] });
              }
            });
            zones.addLayer(marker);
          }
        }
      });
      zones.addLayer(zoneLayer);
      safeExtendBounds(zoneLayer);
    }

    // Helper: Determine building visibility based on viewLevel
    const isBuildingVisible = (bldgId) => {
      if (viewLevel === 'BUILDINGS' || viewLevel === 'BOTH') return true;
      if (viewLevel === 'ZONES') {
        if (!selectedZone) return false;
        const cIds = selectedZone.constituentBuildingIds || [];
        return cIds.includes(bldgId);
      }
      return false;
    };

    // Helper: compute centroid point for polygon
    const getPolygonCentroid = (geometry) => {
      if (!geometry) return [0, 0];
      if (geometry.type === 'Point') return geometry.coordinates;
      if (geometry.coordinates && geometry.coordinates[0]) {
        const ring = geometry.coordinates[0];
        let sLon = 0, sLat = 0;
        ring.forEach(c => { sLon += c[0]; sLat += c[1]; });
        return [sLon / ring.length, sLat / ring.length];
      }
      return [0, 0];
    };

    const isFani = selectedScenarioId === 3;
    const isChamoli = selectedScenarioId === 2;
    const isDharali = selectedScenarioId === 4;

    // B. Damage Assessment Layer (01 ASSESS)
    if (mapMode === 'DAMAGE' && layers.damages && rawDataRef.current.damages?.features) {
      const filtered = rawDataRef.current.damages.features.filter(feat => {
        const p = feat.properties || {};
        const bId = p.buildingId || p.id;
        if (!isBuildingVisible(bId)) return false;
        const dClass = p.damageClass || 'no-damage';
        const conf = p.confidence ?? 1.0;
        if (damageFilter !== 'ALL' && dClass !== damageFilter) return false;
        if (conf < confidenceThreshold) return false;
        return true;
      });

      // For Fani, convert polygon geometries to point centroids so they are strictly rendered as point observations
      const processedFeatures = filtered.map(feat => {
        if (isFani && feat.geometry && feat.geometry.type !== 'Point') {
          const pt = getPolygonCentroid(feat.geometry);
          return {
            ...feat,
            geometry: { type: 'Point', coordinates: pt },
            properties: { ...feat.properties, originalGeometry: feat.geometry, isPointObservation: true }
          };
        }
        return feat;
      });

      const dmgLayer = L.geoJSON({ type: 'FeatureCollection', features: processedFeatures }, {
        pointToLayer: (feat, latlng) => {
          const dClass = feat.properties?.damageClass || 'no-damage';
          const col = DAMAGE_COLORS[dClass] || '#94a3b8';
          return L.circleMarker(latlng, {
            radius: 7,
            color: '#0f172a',
            weight: 2,
            fillColor: col,
            fillOpacity: 0.88
          });
        },
        style: (feat) => {
          const dClass = feat.properties?.damageClass || 'no-damage';
          const col = DAMAGE_COLORS[dClass] || '#94a3b8';
          return {
            color: '#1e293b',
            weight: 1.6,
            fillColor: col,
            fillOpacity: 0.65 // translucent so satellite imagery is never occluded
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const dClass = p.damageClass || 'no-damage';
          const conf = p.confidence ? (p.confidence * 100).toFixed(1) : '100.0';
          const geomToSave = p.originalGeometry || feat.geometry;

          layer.on({
            mouseover: (e) => {
              if (layer.setStyle) layer.setStyle({ weight: 3.5, fillOpacity: 0.90 });
            },
            mouseout: (e) => {
              if (dmgLayer.resetStyle) dmgLayer.resetStyle(e.target);
            },
            click: () => {
              const priMatch = rawDataRef.current.priorities?.features?.find(f => f.properties?.building_id === p.buildingId || f.properties?.id === p.id);
              setSelectedBuilding({
                ...p,
                geometry: geomToSave,
                priorityInfo: priMatch?.properties
              });
            }
          });

          const evidenceLabel = isChamoli 
            ? 'Verified Reference Footprint (EIDC)'
            : isFani 
              ? 'Point-Based Damage Grading (EMSR357 / OSDMA)'
              : isDharali 
                ? 'Qualitative Zero-Shot Footprint (Open Buildings)'
                : 'xBD Supervised Benchmark';

          layer.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; min-width: 190px;">
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">
                Structure #${p.id || p.buildingId}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-bottom: 4px;">
                ${evidenceLabel}
              </div>
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
        const bId = p.building_id || p.id;
        if (!isBuildingVisible(bId)) return false;
        const lvl = p.priority_level || 'LOW';
        if (priorityFilter !== 'ALL' && lvl !== priorityFilter) return false;
        return true;
      });

      const processedPriFeatures = filtered.map(feat => {
        if (isFani && feat.geometry && feat.geometry.type !== 'Point') {
          const pt = getPolygonCentroid(feat.geometry);
          return {
            ...feat,
            geometry: { type: 'Point', coordinates: pt },
            properties: { ...feat.properties, originalGeometry: feat.geometry, isPointObservation: true }
          };
        }
        return feat;
      });

      const priLayer = L.geoJSON({ type: 'FeatureCollection', features: processedPriFeatures }, {
        pointToLayer: (feat, latlng) => {
          const lvl = feat.properties?.priority_level || 'LOW';
          const col = PRIORITY_COLORS[lvl] || '#059669';
          return L.circleMarker(latlng, {
            radius: 8,
            color: '#0f172a',
            weight: 2,
            fillColor: col,
            fillOpacity: 0.90
          });
        },
        style: (feat) => {
          const lvl = feat.properties?.priority_level || 'LOW';
          const col = PRIORITY_COLORS[lvl] || '#059669';
          return {
            color: '#0f172a',
            weight: 2,
            fillColor: col,
            fillOpacity: 0.70
          };
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const lvl = p.priority_level || 'LOW';
          const score = (p.priority_score * 100).toFixed(0);
          const geomToSave = p.originalGeometry || feat.geometry;

          layer.on({
            mouseover: (e) => {
              if (layer.setStyle) layer.setStyle({ weight: 4, fillOpacity: 0.95 });
            },
            mouseout: (e) => {
              if (priLayer.resetStyle) priLayer.resetStyle(e.target);
            },
            click: () => {
              const dmgMatch = rawDataRef.current.damages?.features?.find(f => f.properties?.buildingId === p.building_id || f.properties?.id === p.id);
              setSelectedBuilding({
                ...p,
                ...(dmgMatch?.properties || {}),
                geometry: geomToSave,
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

    // H. OASIS CAP v1.2 Public Alert Broadcast Polygons
    // As requested: Do NOT plot CAP polygon geometry or blinking beacons on map — show alerts in UI only
    if (alerts) {
      alerts.clearLayers();
    }

    // I. Tactical First Responder Fleet Units Layer
    if (layers.units && units && rawDataRef.current.units?.features) {
      const unitLayer = L.geoJSON(rawDataRef.current.units, {
        pointToLayer: (feat, latlng) => {
          const p = feat.properties || {};
          const isAvail = p.status === 'AVAILABLE';
          const isDisp = p.status === 'DISPATCHED';
          const badgeColor = isAvail ? '#10b981' : (isDisp ? '#3b82f6' : '#f97316');

          const icon = L.divIcon({
            html: `
              <div style="
                background: ${badgeColor};
                color: #ffffff;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 10px;
                font-weight: 800;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span>🚒</span>
                <span>${p.callsign || 'UNIT'}</span>
              </div>
            `,
            className: 'tactical-unit-marker',
            iconSize: [90, 22],
            iconAnchor: [45, 11]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          layer.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px;">
              <strong style="color: #0284c7; font-size: 13px;">🚒 ${p.callsign}</strong><br/>
              Type: <strong>${p.unitType || 'Tactical Unit'}</strong><br/>
              Status: <span style="font-weight: 700; color: ${p.status === 'AVAILABLE' ? '#10b981' : '#f97316'};">${p.status}</span><br/>
              Crew: <strong>${p.personnelCount || 4} Responders</strong><br/>
              Speed: ${p.speedKmh ? `${p.speedKmh} km/h` : 'Stationary'}
            </div>
          `);
        }
      });
      units.addLayer(unitLayer);
      safeExtendBounds(unitLayer);
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

  
  // Two-Tone Acoustic Distress Siren (960 Hz / 770 Hz)
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
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

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
      console.warn('Audio siren blocked or unsupported:', e);
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

  const handleDownloadCapXml = async (alertId, identifier) => {
    try {
      const res = await api.get(`/alerts/${alertId}/cap.xml`, { responseType: 'text' });
      const blob = new Blob([res.data], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CAP-${identifier || alertId}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('API XML fetch deferred, building client-side OASIS CAP 1.2 document:', e);
      const matched = activeAlertsList.find(a => a.id === alertId || a.identifier === identifier) || {
        identifier: identifier || alertId,
        headline: 'EMERGENCY DIRECTIVE: Sector Response Active',
        description: 'Emergency response protocols active in target sector. Follow all official guidance.',
        instruction: 'Move to safe staging areas or designated shelters immediately.',
        severity: 'Extreme',
        urgency: 'Immediate',
        category: 'Safety',
        event: 'Emergency Response Direct Action'
      };
      const clientXml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${matched.identifier || alertId}</identifier>
  <sender>OPS-COMMAND@AIDRS.GOV</sender>
  <sent>${matched.sentAt || new Date().toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>${matched.category || 'Safety'}</category>
    <event>${matched.event || 'Emergency Response Direct Action'}</event>
    <urgency>${matched.urgency || 'Immediate'}</urgency>
    <severity>${matched.severity || 'Extreme'}</severity>
    <certainty>Observed</certainty>
    <expires>${matched.expiresAt || new Date(Date.now() + 43200000).toISOString()}</expires>
    <headline>${matched.headline || 'EMERGENCY DIRECTIVE'}</headline>
    <description>${matched.description || 'Active hazard emergency.'}</description>
    <instruction>${matched.instruction || 'Follow all incident command directives.'}</instruction>
  </info>
</alert>`;
      const blob = new Blob([clientXml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CAP-${identifier || alertId}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleToggleAlertOverlays = () => {
    setLayers(prev => ({ ...prev, alerts: !prev.alerts }));
  };

  // Center / Fly to Alert on Map (2D or 3D)
  const centerMapOnAlert = (alert) => {
    if (!alert) return;
    let lat = null, lon = null;
    let targetZone = null;

    // 1. Resolve target zone by targetZoneId
    const zoneId = alert.targetZoneId || alert.target_zone_id;
    if (zoneId && rawDataRef.current.zones?.features) {
      targetZone = rawDataRef.current.zones.features.find(f => 
        (f.properties?.id == zoneId) || (f.id == zoneId)
      );
    }

    // 2. Resolve by headline keyword if not found
    if (!targetZone && alert.headline && rawDataRef.current.zones?.features) {
      targetZone = rawDataRef.current.zones.features.find(f => 
        f.properties?.name && alert.headline.toLowerCase().includes(f.properties.name.toLowerCase())
      );
    }

    // 3. Extract coordinates
    const geom = alert.geometry || targetZone?.geometry;
    if (geom && geom.coordinates) {
      if (geom.type === 'Point') {
        lon = geom.coordinates[0];
        lat = geom.coordinates[1];
      } else if (geom.type === 'Polygon') {
        const ring = geom.coordinates[0];
        if (ring && ring.length > 0) {
          let sumX = 0, sumY = 0;
          ring.forEach(pt => { sumX += pt[0]; sumY += pt[1]; });
          lon = sumX / ring.length;
          lat = sumY / ring.length;
        }
      } else if (geom.type === 'MultiPolygon') {
        const ring = geom.coordinates[0]?.[0];
        if (ring && ring.length > 0) {
          let sumX = 0, sumY = 0;
          ring.forEach(pt => { sumX += pt[0]; sumY += pt[1]; });
          lon = sumX / ring.length;
          lat = sumY / ring.length;
        }
      }
    }

    // 4. Fallback to scenario center
    if (!lat || !lon) {
      const SCENARIO_CENTERS = {
        1: { lat: 34.0259, lon: -118.7798 },
        2: { lat: 30.485, lon: 79.695 },
        3: { lat: 19.8135, lon: 85.8312 },
        4: { lat: 31.036, lon: 78.685 }
      };
      const center = SCENARIO_CENTERS[selectedScenarioId] || { lat: 30.485, lon: 79.695 };
      lat = center.lat;
      lon = center.lon;
    }

    // 5. Select target zone in state so inspector reflects it
    if (targetZone) {
      setSelectedZone(targetZone.properties || targetZone);
      setSelectedBuilding(null);
    }

    // 6. Fly 2D Leaflet
    if (mapViewMode === '2D' && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 14, { duration: 1.2 });
    }

    // 7. Fly 3D Cesium
    if (mapViewMode === '3D' && window.__DRAS_CESIUM_VIEWER__) {
      const viewer = window.__DRAS_CESIUM_VIEWER__;
      const CesiumObj = window.Cesium || Cesium;
      if (CesiumObj && viewer.camera) {
        viewer.camera.flyTo({
          destination: CesiumObj.Cartesian3.fromDegrees(lon, lat, 2600),
          orientation: {
            heading: CesiumObj.Math.toRadians(0),
            pitch: CesiumObj.Math.toRadians(-45),
            roll: 0.0
          },
          duration: 1.5
        });
      }
    }

    // 8. Flash a visual beacon marker in selection highlight layer
    if (layerGroupsRef.current?.selectionHighlight && mapInstanceRef.current) {
      layerGroupsRef.current.selectionHighlight.clearLayers();
      L.circleMarker([lat, lon], {
        radius: 20,
        color: '#ef4444',
        weight: 3,
        fillColor: '#ef4444',
        fillOpacity: 0.35
      }).addTo(layerGroupsRef.current.selectionHighlight);
      
      setTimeout(() => {
        if (layerGroupsRef.current?.selectionHighlight) {
          layerGroupsRef.current.selectionHighlight.clearLayers();
        }
      }, 6000);
    }
  };// Turn off single alert on map
  const handleTurnOffAlertOnMap = async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/cancel`);
      setActiveAlertsList(prev => prev.filter(a => a.id !== alertId));
      loadScenarioData(selectedScenarioId);
    } catch (e) {
      alert('Failed to turn off alert: ' + (e.response?.data?.message || e.message));
    }
  };

  // Turn off all alerts on map — minimize, silence siren, do not completely remove
  // Open Zone Alert Modal pre-filled with the zone details
  const handleOpenZoneAlertModal = (zone) => {
    if (!zone) {
      const firstZ = rawDataRef.current.zones?.features?.[0]?.properties;
      zone = firstZ || { id: 1, name: 'Target Operational Sector', criticality: 'CRITICAL' };
    }
    const isCrit = zone.criticality === 'CRITICAL';
    setZoneAlertForm({
      zoneId: zone.id,
      zoneName: zone.name,
      headline: `${isCrit ? 'MANDATORY EVACUATION' : 'PRE-EVACUATION WARNING'}: ${zone.name}`,
      description: `Active threat escalation detected across ${zone.name} (${zone.totalBuildings || 'multiple'} structures assessed). Life safety protocol active.`,
      instruction: 'Evacuate immediately via designated primary corridors toward nearest safe relief shelter.',
      urgency: isCrit ? 'Immediate' : 'Expected',
      severity: isCrit ? 'Extreme' : 'Severe',
      category: 'Safety'
    });
    setIsZoneAlertModalOpen(true);
  };

  // Submit Zone-Specific Alert
  const handleSendZoneAlert = async () => {
    try {
      const res = await api.post('/alerts', {
        scenarioId: selectedScenarioId,
        targetZoneId: zoneAlertForm.zoneId,
        headline: zoneAlertForm.headline,
        description: zoneAlertForm.description,
        instruction: zoneAlertForm.instruction,
        urgency: zoneAlertForm.urgency,
        severity: zoneAlertForm.severity,
        category: zoneAlertForm.category,
        event: 'Zone Emergency Directive',
        msgType: 'Alert',
        scope: 'Public',
        status: 'Actual'
      });

      const newAlert = res.data;
      setActiveAlertsList(prev => [newAlert, ...prev]);
      setIsAlertMinimized(false);
      setIsAlertsSilenced(false);
      setIsZoneAlertModalOpen(false);
      setActionSuccessNotice(`📢 Alert broadcasted to ${zoneAlertForm.zoneName} via Cell Broadcast, WebSockets & Siren!`);
      setTimeout(() => setActionSuccessNotice(null), 5000);
    } catch (e) {
      alert('Failed to broadcast zone alert: ' + (e.response?.data?.message || e.message));
    }
  };

  // Open Dispatch Modal
  const handleOpenDispatchModal = async (zone) => {
    if (!zone) {
      const firstZ = rawDataRef.current.zones?.features?.[0]?.properties;
      zone = firstZ || { id: 1, name: 'Target Operational Sector' };
    }
    setDispatchTargetZone(zone);
    setDispatchNotes(`Tactical first responder deployment to ${zone.name}`);
    setIsDispatchModalOpen(true);

    try {
      const res = await api.get(`/units?scenarioId=${selectedScenarioId}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAvailableUnitsList(res.data);
        const avail = res.data.find(u => u.status === 'AVAILABLE');
        setSelectedUnitForDispatch(avail ? avail.id : res.data[0].id);
      }
    } catch (e) {
      console.warn('Could not fetch unit fleet:', e);
    }
  };

  // Confirm Tactical Dispatch
  const handleDispatchService = async () => {
    if (!dispatchTargetZone) return;
    try {
      let url = `/incidents/dispatch-to-zone?scenarioId=${selectedScenarioId}&zoneId=${dispatchTargetZone.id}`;
      if (selectedUnitForDispatch) {
        url += `&unitId=${selectedUnitForDispatch}`;
      }
      if (dispatchNotes) {
        url += `&notes=${encodeURIComponent(dispatchNotes)}`;
      }

      const res = await api.post(url);
      const inc = res.data;
      setIsDispatchModalOpen(false);

      // Refresh units and map
      const [uRes, incRes] = await Promise.all([
        api.get(`/units/geojson?scenarioId=${selectedScenarioId}`).catch(() => null),
        api.get(`/incidents/geojson?scenarioId=${selectedScenarioId}`).catch(() => null)
      ]);
      if (uRes?.data) rawDataRef.current.units = uRes.data;
      renderLayers();

      const assignedUnit = availableUnitsList.find(u => u.id === inc.assignedTeamId);
      const callsign = assignedUnit ? assignedUnit.callsign : 'Tactical Unit';
      setActionSuccessNotice(`🚒 Unit ${callsign} dispatched to ${dispatchTargetZone.name}! Status: EN ROUTE`);
      setTimeout(() => setActionSuccessNotice(null), 5000);

      // Flash target zone on map
      const zoneFeat = rawDataRef.current.zones?.features?.find(f => (f.properties?.id == dispatchTargetZone.id) || (f.id == dispatchTargetZone.id));
      if (zoneFeat && mapInstanceRef.current) {
        const b = L.geoJSON(zoneFeat).getBounds();
        if (b.isValid()) mapInstanceRef.current.fitBounds(b, { padding: [50, 50], maxZoom: 15 });
      }
    } catch (e) {
      alert('Failed to dispatch service: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleTurnOffAllAlertsOnMap = async () => {
    stopSiren();
    setIsAlertsSilenced(true);
    setIsAlertMinimized(true);
    try {
      await api.post(`/alerts/cancel-all?scenarioId=${selectedScenarioId}`);
    } catch (e) {
      console.warn('Alert silence notice:', e);
    }
  };

  function clearRoute() {
    layerGroupsRef.current.routeGlow.clearLayers();
    layerGroupsRef.current.route.clearLayers();
    layerGroupsRef.current.routeMarkers.clearLayers();
    setActiveRoute(null);
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 88px)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: tokens.bgPrimary, color: tokens.textPrimary, overflow: 'hidden' }}>
      
      {/* ============================================================ */}
      {/* LEFT COLUMN: Controls, Phases & Layer Toggles (270px)        */}
      {/* ============================================================ */}
      <div style={{
        width: '270px',
        backgroundColor: tokens.bgSecondary,
        borderRight: `1px solid ${tokens.border}`,
        padding: '14px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        zIndex: 10,
        color: tokens.textPrimary
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
              border: `1px solid ${tokens.inputBorder || tokens.border}`,
              fontSize: '11px',
              fontWeight: 600,
              color: tokens.textPrimary,
              backgroundColor: tokens.inputBg || tokens.bgTertiary
            }}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Map Engine View: 3D Earth / 2D Map */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Map Engine
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: tokens.bgTertiary, padding: '3px', borderRadius: '6px', border: `1px solid ${tokens.border}` }}>
            <button
              onClick={() => {
                setMapViewMode('3D');
                if (window.__DRAS_CESIUM_VIEWER__ && !window.__DRAS_CESIUM_VIEWER__.isDestroyed()) {
                  window.__DRAS_CESIUM_VIEWER__.resize();
                }
              }}
              style={{
                padding: '6px 4px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: mapViewMode === '3D' ? '#0284c7' : 'transparent',
                color: mapViewMode === '3D' ? '#ffffff' : tokens.textSecondary,
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <Globe size={13} /> 3D Earth
            </button>
            <button
              onClick={() => {
                setMapViewMode('2D');
                if (mapInstanceRef.current) {
                  setTimeout(() => { try { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); } catch (e) {} }, 150);
                }
              }}
              style={{
                padding: '6px 4px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: mapViewMode === '2D' ? '#0284c7' : 'transparent',
                color: mapViewMode === '2D' ? '#ffffff' : tokens.textSecondary,
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <MapIcon size={13} /> 2D Map
            </button>
          </div>
        </div>

        {/* Spatial View Mode: [ Buildings ] [ Zones ] [ Both ] */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Spatial View Mode
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px', backgroundColor: tokens.bgTertiary, padding: '3px', borderRadius: '6px', border: `1px solid ${tokens.border}` }}>
            <button
              onClick={() => setViewLevel('BUILDINGS')}
              style={{
                padding: '6px 2px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: viewLevel === 'BUILDINGS' ? (isDark ? '#0284c7' : '#0f172a') : 'transparent',
                color: viewLevel === 'BUILDINGS' ? '#ffffff' : tokens.textSecondary,
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Buildings
            </button>
            <button
              onClick={() => setViewLevel('ZONES')}
              style={{
                padding: '6px 2px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: viewLevel === 'ZONES' ? (isDark ? '#0284c7' : '#0f172a') : 'transparent',
                color: viewLevel === 'ZONES' ? '#ffffff' : tokens.textSecondary,
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Zones
            </button>
            <button
              onClick={() => setViewLevel('BOTH')}
              style={{
                padding: '6px 2px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: viewLevel === 'BOTH' ? (isDark ? '#0284c7' : '#0f172a') : 'transparent',
                color: viewLevel === 'BOTH' ? '#ffffff' : tokens.textSecondary,
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Both
            </button>
          </div>
        </div>

        {/* 3-Step Conceptual Workflow: 01 ASSESS / 02 PRIORITISE / 03 RESPOND */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Operational Phase
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => { setMapMode('DAMAGE'); clearRoute(); }}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: mapMode === 'DAMAGE' ? (isDark ? '#38bdf8' : '#0f172a') : tokens.border,
                backgroundColor: mapMode === 'DAMAGE' ? (isDark ? '#1e3a8a' : '#0f172a') : tokens.bgCard,
                color: mapMode === 'DAMAGE' ? '#ffffff' : tokens.textPrimary,
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ backgroundColor: mapMode === 'DAMAGE' ? (isDark ? '#2563eb' : '#334155') : tokens.bgTertiary, color: mapMode === 'DAMAGE' ? '#fff' : tokens.textSecondary, fontSize: '9px', padding: '2px 5px', borderRadius: '3px' }}>
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
                borderColor: mapMode === 'PRIORITY' ? (isDark ? '#38bdf8' : '#0f172a') : tokens.border,
                backgroundColor: mapMode === 'PRIORITY' ? (isDark ? '#1e3a8a' : '#0f172a') : tokens.bgCard,
                color: mapMode === 'PRIORITY' ? '#ffffff' : tokens.textPrimary,
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ backgroundColor: mapMode === 'PRIORITY' ? (isDark ? '#2563eb' : '#334155') : tokens.bgTertiary, color: mapMode === 'PRIORITY' ? '#fff' : tokens.textSecondary, fontSize: '9px', padding: '2px 5px', borderRadius: '3px' }}>
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
                borderColor: mapMode === 'ROUTING' ? (isDark ? '#38bdf8' : '#0f172a') : tokens.border,
                backgroundColor: mapMode === 'ROUTING' ? (isDark ? '#1e3a8a' : '#0f172a') : tokens.bgCard,
                color: mapMode === 'ROUTING' ? '#ffffff' : tokens.textPrimary,
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ backgroundColor: mapMode === 'ROUTING' ? (isDark ? '#2563eb' : '#334155') : tokens.bgTertiary, color: mapMode === 'ROUTING' ? '#fff' : tokens.textSecondary, fontSize: '9px', padding: '2px 5px', borderRadius: '3px' }}>
                03
              </span>
              <span><strong>RESPOND</strong> — Response & Routing</span>
            </button>
          </div>
        </div>

        {/* Phase 03: Response Mode Route Type Selector */}
        {mapMode === 'ROUTING' && (
          <div style={{ backgroundColor: tokens.bgTertiary, padding: '10px', borderRadius: '6px', border: `1px solid ${tokens.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textPrimary, textTransform: 'uppercase', marginBottom: '6px' }}>
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
                <span style={{ fontWeight: responseRouteType === 'RESPONSE' ? 700 : 500, color: responseRouteType === 'RESPONSE' ? '#d97706' : tokens.textSecondary }}>
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
                <span style={{ fontWeight: responseRouteType === 'EVACUATION' ? 700 : 500, color: responseRouteType === 'EVACUATION' ? '#0284c7' : tokens.textSecondary }}>
                  Evacuation (Site → Facility)
                </span>
              </label>
            </div>

            {responseRouteType === 'EVACUATION' && (
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: `1px solid ${tokens.border}`, display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => { setEvacDestType('hospital'); if (selectedBuilding) calculateRoute('EVACUATION', 'hospital'); }}
                  style={{
                    flex: 1,
                    padding: '3px 4px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: evacDestType === 'hospital' ? '#dc2626' : tokens.border,
                    backgroundColor: evacDestType === 'hospital' ? '#dc2626' : tokens.bgCard,
                    color: evacDestType === 'hospital' ? '#fff' : tokens.textPrimary,
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
                    borderColor: evacDestType === 'shelter' ? '#0284c7' : tokens.border,
                    backgroundColor: evacDestType === 'shelter' ? '#0284c7' : tokens.bgCard,
                    color: evacDestType === 'shelter' ? '#fff' : tokens.textPrimary,
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
          <div style={{ backgroundColor: tokens.bgTertiary, padding: '10px', borderRadius: '6px', border: `1px solid ${tokens.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', marginBottom: '6px' }}>
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
                    borderColor: damageFilter === cat ? (isDark ? '#38bdf8' : '#0f172a') : tokens.border,
                    backgroundColor: damageFilter === cat ? (isDark ? '#0284c7' : '#0f172a') : tokens.bgCard,
                    color: damageFilter === cat ? '#fff' : tokens.textPrimary,
                    fontSize: '9px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {cat === 'ALL' ? 'All Classes' : DAMAGE_LABELS[cat]}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '10px', fontWeight: 600, color: tokens.textSecondary, marginBottom: '2px' }}>
              Confidence: <strong style={{ color: tokens.textPrimary }}>{(confidenceThreshold * 100).toFixed(0)}%</strong>
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
          <div style={{ backgroundColor: tokens.bgTertiary, padding: '10px', borderRadius: '6px', border: `1px solid ${tokens.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', marginBottom: '6px' }}>
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
                    borderColor: priorityFilter === lvl ? PRIORITY_COLORS[lvl] || '#0f172a' : tokens.border,
                    backgroundColor: priorityFilter === lvl ? PRIORITY_COLORS[lvl] || '#0f172a' : tokens.bgCard,
                    color: priorityFilter === lvl ? '#fff' : tokens.textPrimary,
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Map Layers
            </span>
            {activeAlertsList.length > 0 && (
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '10px',
                letterSpacing: '0.02em'
              }}>
                ALERTS ({activeAlertsList.length})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
            {/* Emergency Alerts (CAP) Layer at Top */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#ef4444',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fff5f5',
              padding: '4px 6px',
              borderRadius: '5px',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fee2e2'}`
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.alerts}
                  onChange={(e) => setLayers({ ...layers, alerts: e.target.checked })}
                />
                <span style={{ fontWeight: 700 }}>🚨 Emergency Alerts (CAP)</span>
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                padding: '1px 5px',
                borderRadius: '3px'
              }}>
                {rawDataRef.current.alerts?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.zones}
                  onChange={(e) => setLayers({ ...layers, zones: e.target.checked })}
                />
                <span style={{ fontWeight: 600 }}>Operational Zones</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#0284c7' }}>
                {rawDataRef.current.zones?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.hazards}
                  onChange={(e) => setLayers({ ...layers, hazards: e.target.checked })}
                />
                <span style={{ fontWeight: 600, color: '#dc2626' }}>⚠️ Hazard / Debris Extent</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#dc2626' }}>
                {rawDataRef.current.hazards?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.damages}
                  onChange={(e) => setLayers({ ...layers, damages: e.target.checked })}
                />
                <span>{selectedScenarioId === 3 ? 'Point Damage Grading' : 'Damage Assessment'}</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: tokens.textSecondary }}>
                {rawDataRef.current.damages?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.roads}
                  onChange={(e) => setLayers({ ...layers, roads: e.target.checked })}
                />
                <span>Road Network</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: tokens.textSecondary }}>
                {rawDataRef.current.roads?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.hospitals}
                  onChange={(e) => setLayers({ ...layers, hospitals: e.target.checked })}
                />
                <span>Emergency Hospitals</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#dc2626' }}>
                {rawDataRef.current.hospitals?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.shelters}
                  onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })}
                />
                <span>Relief Shelters</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#0284c7' }}>
                {rawDataRef.current.shelters?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.alerts}
                  onChange={(e) => setLayers({ ...layers, alerts: e.target.checked })}
                />
                <span style={{ fontWeight: 600, color: '#ef4444' }}>🚨 CAP Alerts (CAP 1.2)</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444' }}>
                {rawDataRef.current.alerts?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.units}
                  onChange={(e) => setLayers({ ...layers, units: e.target.checked })}
                />
                <span style={{ fontWeight: 600, color: '#10b981' }}>🚒 First Responder Fleet</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981' }}>
                {rawDataRef.current.units?.features?.length || 0}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: tokens.textPrimary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={layers.boundary}
                  onChange={(e) => setLayers({ ...layers, boundary: e.target.checked })}
                />
                <span>Scenario Perimeter</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: tokens.textSecondary }}>1</span>
            </label>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* CENTER COLUMN: Large Interactive Map Canvas (Flex-1)        */}
      {/* ============================================================ */}
      <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>

        {/* 1. Minimized Alert Capsule (When turned off, gets minimized not completely removed) */}
        {isAlertMinimized && (
          <div
            onClick={() => setIsAlertMinimized(false)}
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1050,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              border: `1.5px solid ${isDark ? '#475569' : '#cbd5e1'}`,
              borderRadius: '20px',
              padding: '4px 12px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              transition: 'all 0.2s ease'
            }}
            title="Alerts silenced & minimized — Click to expand"
          >
            <BellOff size={13} color={isDark ? '#94a3b8' : '#64748b'} />
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: isDark ? '#cbd5e1' : '#475569',
              letterSpacing: '0.01em'
            }}>
              Alerts Silenced & Minimized ({activeAlertsList.length || 4})
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAlertMinimized(false);
              }}
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Expand
            </button>
          </div>
        )}

        {/* 1b. Expanded Floating Alert Capsule (Matches Screenshot 3) */}
        {!isAlertMinimized && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: isDark ? 'rgba(30, 20, 20, 0.95)' : 'rgba(254, 242, 242, 0.96)',
            border: `1.5px solid ${isDark ? '#ef4444' : '#f87171'}`,
            borderRadius: '24px',
            padding: '4px 12px',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.22)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            maxWidth: '92%'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: isDark ? '#fca5a5' : '#991b1b',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 320
            }}>
              ALERT ACTIVE ({activeAlertsList.length || 4}) {activeAlertsList[0]?.headline || 'MANDATORY EVACUATION: Raini Ground Zero Core (Upper)'}
            </span>

            <button
              onClick={() => centerMapOnAlert(activeAlertsList[0])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                flexShrink: 0
              }}
              title="Locate alert zone on map"
            >
              <span>🎯</span> LOCATE
            </button>

            <button
              onClick={() => handleOpenDispatchModal(selectedZone || rawDataRef.current.zones?.features?.[0]?.properties)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                flexShrink: 0
              }}
              title="Dispatch emergency response services"
            >
              <span>🚒</span> DISPATCH
            </button>

            <button
              onClick={() => setIsAlertCenterOpen(!isAlertCenterOpen)}
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                flexShrink: 0
              }}
              title="Open OASIS CAP 1.2 Alert Center briefing"
            >
              BRIEFING {activeAlertsList.length || 4}
            </button>

            <button
              onClick={toggleSiren}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #fca5a5',
                backgroundColor: isSirenActive ? '#ef4444' : 'transparent',
                color: isSirenActive ? '#ffffff' : '#b91c1c',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Toggle acoustic siren"
            >
              {isSirenActive ? <VolumeX size={11} /> : <Volume2 size={11} />}
              <span>SIREN</span>
            </button>

            <button
              onClick={() => navigate(`/scenario/${selectedScenarioId}/emergency`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #93c5fd',
                backgroundColor: 'transparent',
                color: '#1d4ed8',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Go to CAD & Dispatch operations console"
            >
              <span>CAD</span>
              <ExternalLink size={10} />
            </button>

            <button
              onClick={handleTurnOffAllAlertsOnMap}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #fca5a5',
                backgroundColor: 'transparent',
                color: '#dc2626',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Turn off alerts and minimize"
            >
              <BellOff size={11} />
              <span>Turn Off</span>
            </button>

            <button
              onClick={() => setIsAlertMinimized(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '0 2px',
                lineHeight: 1
              }}
              title="Minimize alert banner"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. OASIS CAP 1.2 Alert Center Modal (Matches Screenshot 2) */}
        {isAlertCenterOpen && (
          <div style={{
            position: 'absolute',
            top: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `1.5px solid ${isDark ? '#334155' : '#fecaca'}`,
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
            zIndex: 2000,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '12px',
              borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={18} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    OASIS CAP 1.2 Alert Center
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                    Common Alerting Protocol Broadcast Subsystem
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    setIsAlertCenterOpen(false);
                    handleOpenZoneAlertModal(selectedZone || rawDataRef.current.zones?.features?.[0]?.properties);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>📢</span> Broadcast Zone Alert
                </button>
                <button
                  onClick={() => setIsAlertCenterOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Acoustic Siren Array Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Acoustic Siren Array: <span style={{ color: isSirenActive ? '#ef4444' : '#64748b' }}>{isSirenActive ? 'ACTIVE' : 'IDLE'}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Coverage: 115 dB Omni-Directional Alert Horns
                </div>
              </div>
              <button
                onClick={toggleSiren}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isSirenActive ? '🔊 STOP SIREN' : '🔊 TEST SIREN'}
              </button>
            </div>

            {/* Alert Warning Status Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '8px'
            }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Alert Warning Status: <span style={{ color: !isAlertsSilenced ? '#ef4444' : '#64748b' }}>{!isAlertsSilenced ? '🔴 ACTIVE' : '⚪ SILENCED & MINIMIZED'}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Multi-channel emergency broadcast and acoustic sirens
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isAlertsSilenced) {
                    handleTurnOffAllAlertsOnMap();
                  } else {
                    setIsAlertsSilenced(false);
                    setIsAlertMinimized(false);
                  }
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fff5f5',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {!isAlertsSilenced ? '🚫 Turn Off Alert' : 'Reactivate Alert'}
              </button>
            </div>

            {/* Active Broadcast Alerts Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '14px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>
                ACTIVE BROADCAST ALERTS ({activeAlertsList.length})
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
                EOC DISPATCH SYNCED
              </span>
            </div>

            {/* List of Alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeAlertsList.map(alt => (
                <div key={alt.id} style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#fed7d7'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      letterSpacing: '0.04em'
                    }}>
                      {(alt.severity || 'EXTREME').toUpperCase()} • {(alt.urgency || 'IMMEDIATE').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>
                      {alt.identifier}
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.3 }}>
                    {alt.headline}
                  </div>

                  <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.4 }}>
                    {alt.instruction || alt.description}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '10px' }}>
                      🟢 WEA / CMAS Cell Broadcast
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '10px' }}>
                      🟢 EAS Radio Broadcast
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '10px' }}>
                      🟢 PostGIS Perimeter
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        centerMapOnAlert(alt);
                        setIsAlertCenterOpen(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        borderRadius: '4px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>🎯</span> Locate on Map
                    </button>
                    <button
                      onClick={() => handleDownloadCapXml(alt.id, alt.identifier)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>📄</span> CAP XML
                    </button>
                    <button
                      onClick={() => {
                        const zoneId = alt.targetZoneId || alt.target_zone_id;
                        let targetZone = null;
                        if (zoneId && rawDataRef.current.zones?.features) {
                          targetZone = rawDataRef.current.zones.features.find(f => (f.properties?.id == zoneId) || (f.id == zoneId))?.properties;
                        }
                        if (!targetZone && rawDataRef.current.zones?.features) {
                          targetZone = rawDataRef.current.zones.features[0]?.properties;
                        }
                        setIsAlertCenterOpen(false);
                        handleOpenDispatchModal(targetZone || { id: zoneId, name: alt.headline });
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>🚒</span> Dispatch Unit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Floating 2D / 3D Switcher at Top Right (Active in 2D mode; CesiumControls handles 3D HUD) */}
        {mapViewMode === '2D' && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            zIndex: 1040,
            display: 'flex',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            borderRadius: '20px',
            padding: '2px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              onClick={() => {
                setMapViewMode('2D');
                if (mapInstanceRef.current) {
                  setTimeout(() => { try { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); } catch (e) {} }, 100);
                }
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: mapViewMode === '2D' ? '#0284c7' : 'transparent',
                color: mapViewMode === '2D' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <MapIcon size={12} /> 2D Map
            </button>
            <button
              onClick={() => {
                setMapViewMode('3D');
                if (window.__DRAS_CESIUM_VIEWER__ && !window.__DRAS_CESIUM_VIEWER__.isDestroyed()) {
                  window.__DRAS_CESIUM_VIEWER__.resize();
                }
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: mapViewMode === '3D' ? '#0284c7' : 'transparent',
                color: mapViewMode === '3D' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Globe size={12} /> 3D Globe
            </button>
          </div>
        )}
{/* 3D Cesium Earth Engine View */}
        {mapViewMode === '3D' && (
          <CesiumGlobe
            selectedScenarioId={selectedScenarioId}
            scenarios={scenarios}
            onSelectScenario={(sId) => setSelectedScenarioId(sId)}
            mapMode={mapMode}
            setMapMode={setMapMode}
            viewLevel={viewLevel}
            layers={layers}
            damageFilter={damageFilter}
            priorityFilter={priorityFilter}
            confidenceThreshold={confidenceThreshold}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={(bldg) => setSelectedBuilding(bldg)}
            selectedZone={selectedZone}
            onSelectZone={(zone) => setSelectedZone(zone)}
            activeRoute={activeRoute}
            rawDataRef={rawDataRef}
            dataVersion={dataVersion}
            mapViewMode={mapViewMode}
            setMapViewMode={(mode) => {
              setMapViewMode(mode);
              if (mode === '2D' && mapInstanceRef.current) {
                setTimeout(() => { try { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); } catch (e) {} }, 150);
              }
            }}
            presentationMode={presentationMode}
            setPresentationMode={setPresentationMode}
            isDark={isDark}
            tokens={tokens}
          />
        )}

        {/* 2D Leaflet Map View */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: mapViewMode === '2D' ? 10 : 0,
            pointerEvents: mapViewMode === '2D' ? 'auto' : 'none',
            visibility: mapViewMode === '2D' ? 'visible' : 'hidden'
          }}
        >
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', backgroundColor: '#0f172a' }} />
        </div>

        {/* Dharali 2025 Compact Status Banner */}
        {selectedScenarioId === 4 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: isDark ? 'rgba(30, 20, 20, 0.95)' : 'rgba(254, 242, 242, 0.96)',
            border: `1.5px solid ${isDark ? '#b91c1c' : '#f87171'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            borderRadius: '8px',
            padding: '8px 16px',
            maxWidth: '680px',
            width: '90%',
            textAlign: 'center',
            fontSize: '11px',
            color: isDark ? '#fca5a5' : '#991b1b',
            backdropFilter: 'blur(4px)'
          }}>
            <strong style={{ color: isDark ? '#f87171' : '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>⚠️</span> DHARALI 2025: QUALITATIVE ZERO-SHOT CROSS-EVENT GENERALISATION SCENARIO
            </strong>
            <div style={{ fontSize: '10px', marginTop: '3px', color: isDark ? '#cbd5e1' : '#7f1d1d', lineHeight: 1.35 }}>
              Quantitative building damage metrics are <strong>N/A</strong> (no verified ground truth annotations). Operational priority sectors are derived from the 20.4 ha debris fan overlay at Kheer Ganga-Bhagirathi confluence & Cartosat-2S.
            </div>
          </div>
        )}

        {/* Collapsible Floating Mode & Legend Badge */}
        {isLegendCollapsed && (
          <button
            onClick={() => setIsLegendCollapsed(false)}
            title="Expand Map Legend"
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              backgroundColor: tokens.mapOverlayBg,
              padding: '7px 12px',
              borderRadius: '8px',
              boxShadow: tokens.shadow,
              zIndex: 1000,
              fontSize: '11px',
              fontWeight: 700,
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(6px)'
            }}
          >
            <Layers size={13} color={tokens.accent} />
            <span>Map Legend</span>
            <ChevronRight size={13} />
          </button>
        )}

        {!isLegendCollapsed && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: tokens.mapOverlayBg,
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: tokens.shadow,
            zIndex: 1000,
            fontSize: '10px',
            border: `1px solid ${tokens.border}`,
            color: tokens.textPrimary,
            minWidth: '220px',
            maxWidth: '280px',
            maxHeight: '260px',
            overflowY: 'auto',
            backdropFilter: 'blur(6px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: `1px solid ${tokens.border}`, paddingBottom: '3px' }}>
              <div style={{ fontWeight: 800, color: tokens.textPrimary, textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Layers size={12} color={tokens.accent} />
                {mapMode === 'DAMAGE' ? 'DAMAGE ASSESSMENT' : (mapMode === 'PRIORITY' ? 'TRIAGE PRIORITY' : 'RESPONSE & ROUTING')}
              </div>
              <button
                onClick={() => setIsLegendCollapsed(true)}
                title="Collapse Legend"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: tokens.textSecondary,
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Scenario-Specific Semantic Legend */}
            {selectedScenarioId === 2 && (
              <div style={{ marginBottom: '6px', padding: '4px 6px', backgroundColor: isDark ? '#162033' : '#f1f5f9', borderRadius: '4px', fontSize: '9px', color: tokens.textSecondary }}>
                <strong>CHAMOLI 2021 PROTOCOL:</strong> Native EIDC binary grading (Intact vs Damaged/Obstructed).
              </div>
            )}

            {selectedScenarioId === 3 && (
              <div style={{ marginBottom: '6px', padding: '4px 6px', backgroundColor: isDark ? '#162033' : '#f1f5f9', borderRadius: '4px', fontSize: '9px', color: tokens.textSecondary }}>
                <strong>CYCLONE FANI PROTOCOL:</strong> Copernicus EMS EMSR357 point grading.
              </div>
            )}

            {selectedScenarioId === 4 && (
              <div style={{ marginBottom: '6px', padding: '4px 6px', backgroundColor: isDark ? '#2a1a1a' : '#fff1f2', borderRadius: '4px', fontSize: '9px', color: '#b91c1c' }}>
                <strong>DHARALI 2025 PROTOCOL:</strong> Qualitative Zero-Shot. 20.4 ha debris extent.
              </div>
            )}

            {mapMode === 'DAMAGE' && (
              <>
                {selectedScenarioId === 2 ? (
                  // Chamoli Binary Legend
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: DAMAGE_COLORS['destroyed'], borderRadius: '2px' }}></span>
                      <span style={{ fontWeight: 600 }}>Damaged / Obstructed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: DAMAGE_COLORS['no-damage'], borderRadius: '2px' }}></span>
                      <span style={{ fontWeight: 600 }}>Intact / Undamaged</span>
                    </div>
                  </>
                ) : selectedScenarioId === 3 ? (
                  // Fani Point Legend
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: DAMAGE_COLORS['destroyed'], borderRadius: '50%', border: '1px solid #000' }}></span>
                      <span>Destroyed (EMSR357)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: DAMAGE_COLORS['major-damage'], borderRadius: '50%', border: '1px solid #000' }}></span>
                      <span>Damaged (EMSR357)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: DAMAGE_COLORS['minor-damage'], borderRadius: '50%', border: '1px solid #000' }}></span>
                      <span>Possibly damaged</span>
                    </div>
                  </>
                ) : (
                  // Standard 4-Class Scale
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
                )}
              </>
            )}

            {mapMode !== 'DAMAGE' && (
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

            <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: '5px', color: tokens.textSecondary, fontSize: '10px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: 12, height: 0, borderTop: '2px dashed #dc2626' }} />
                <span><strong style={{ color: '#dc2626' }}>Red Dashed:</strong> Hazard / Debris Extent</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: 12, height: 0, borderTop: '2px dashed #7c3aed' }} />
                <span><strong style={{ color: '#7c3aed' }}>Violet Dashed:</strong> Blocked road corridor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: 12, height: 3, backgroundColor: '#d97706', borderRadius: 1 }} />
                <span><strong style={{ color: '#d97706' }}>Amber Glow:</strong> Response Access Route</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: 12, height: 3, backgroundColor: '#0284c7', borderRadius: 1 }} />
                <span><strong style={{ color: '#0284c7' }}>Cyan Glow:</strong> Evacuation Route</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: Priority-Centered Details & Routing (360px)   */}
      {/* ============================================================ */}
      <div style={{
        width: '360px',
        backgroundColor: tokens.bgSecondary,
        borderLeft: `1px solid ${tokens.border}`,
        padding: '14px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10,
        color: tokens.textPrimary
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
            backgroundColor: tokens.bgCard,
            border: `2px solid ${isDark ? tokens.border : '#0f172a'}`,
            borderRadius: '8px',
            padding: '14px',
            boxShadow: tokens.shadow
          }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {selectedScenarioId === 3 || selectedBuilding.geometry?.type === 'Point' 
                    ? 'COPERNICUS EMSR357 POINT OBSERVATION' 
                    : (selectedScenarioId === 4 ? 'QUALITATIVE ZERO-SHOT REFERENCE' : 'SELECTED STRUCTURE FOOTPRINT')}
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: tokens.textPrimary, margin: 0 }}>
                  {selectedScenarioId === 3 || selectedBuilding.geometry?.type === 'Point'
                    ? `Observation Point #${selectedBuilding.id || selectedBuilding.buildingId}`
                    : `Structure #${selectedBuilding.id || selectedBuilding.buildingId}`}
                </h3>
                <span style={{ fontSize: '10px', color: tokens.textSecondary }}>
                  Scenario: <strong>{scenarios.find(s => s.id === selectedScenarioId)?.name || `Scenario ${selectedScenarioId}`}</strong>
                </span>
              </div>
              <button
                onClick={() => { setSelectedBuilding(null); clearRoute(); }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: tokens.textSecondary }}
              >
                ✕
              </button>
            </div>

            {/* Evidence Type Badge */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: selectedScenarioId === 2 ? '#dcfce7' : (selectedScenarioId === 3 ? '#e0f2fe' : (selectedScenarioId === 4 ? '#fef3c7' : '#f1f5f9')),
                color: selectedScenarioId === 2 ? '#15803d' : (selectedScenarioId === 3 ? '#0369a1' : (selectedScenarioId === 4 ? '#b45309' : '#334155')),
                border: `1px solid ${selectedScenarioId === 2 ? '#86efac' : (selectedScenarioId === 3 ? '#7dd3fc' : (selectedScenarioId === 4 ? '#fcd34d' : '#cbd5e1'))}`,
                display: 'inline-block'
              }}>
                EVIDENCE: {selectedScenarioId === 2 ? 'VERIFIED GROUND TRUTH (EIDC)' : (selectedScenarioId === 3 ? 'POINT OBSERVATION (EMSR357)' : (selectedScenarioId === 4 ? 'QUALITATIVE / ZERO-SHOT OVERLAY' : 'SUPERVISED BENCHMARK (xBD)'))}
              </span>
            </div>

            {/* AI SATELLITE EVIDENCE (BEFORE / AFTER COMPARISON OR SENSOR CONTEXT) */}
            <div style={{ backgroundColor: tokens.bgTertiary, padding: '8px', borderRadius: '6px', border: `1px solid ${tokens.border}`, marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Satellite size={12} color={tokens.accent} /> AI SATELLITE EVIDENCE
                </span>
                <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', backgroundColor: '#38bdf820', color: '#0284c7', fontWeight: 700 }}>
                  {selectedScenarioId === 1 ? 'Bi-Temporal Optical Chips (xBD)' : (selectedScenarioId === 3 ? 'Copernicus EMS Rapid Mapping' : (selectedScenarioId === 2 ? 'EIDC Orthomosaic Sensor' : 'Cartosat-2S / PlanetScope'))}
                </span>
              </div>

              {selectedScenarioId === 1 ? (
                /* Dual Before / After Frames for xBD Benchmark */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ border: `1px solid ${tokens.border}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#020617' }}>
                    <div style={{ padding: '2px 5px', backgroundColor: '#0284c7', color: '#fff', fontSize: '10px', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                      <span>PRE-DISASTER</span>
                      <span>Reference</span>
                    </div>
                    <div style={{ height: '88px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={`/satellite_evidence/crops/scen1_${selectedBuilding.damageClass || 'no-damage'}_pre.png`}
                        alt="Pre-disaster satellite crop"
                        onError={(e) => { e.target.src = '/satellite_evidence/scenario_1_pre.png'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>

                  <div style={{ border: `1px solid ${tokens.border}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#020617' }}>
                    <div style={{ padding: '2px 5px', backgroundColor: DAMAGE_COLORS[selectedBuilding.damageClass] || '#dc2626', color: '#fff', fontSize: '10px', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                      <span>POST-DISASTER</span>
                      <span>Impact</span>
                    </div>
                    <div style={{ height: '88px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={`/satellite_evidence/crops/scen1_${selectedBuilding.damageClass || 'no-damage'}_post.png`}
                        alt="Post-disaster satellite crop"
                        onError={(e) => { e.target.src = '/satellite_evidence/scenario_1_post.png'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Honest Regional Sensor Context without fake identical chips */
                <div style={{ border: `1px solid ${tokens.border}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#020617', marginBottom: '6px' }}>
                  <div style={{ padding: '3px 6px', backgroundColor: isDark ? '#1e293b' : '#334155', color: '#fff', fontSize: '10px', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>SENSOR SCENE CONTEXT</span>
                    <span style={{ fontSize: '9px', opacity: 0.85 }}>
                      {selectedScenarioId === 3 ? 'Copernicus AOI08 Puri' : (selectedScenarioId === 2 ? 'EIDC Rishiganga Scour' : 'Cartosat-2S Debris Fan')}
                    </span>
                  </div>
                  <div style={{ height: '96px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={`/satellite_evidence/scenario_${selectedScenarioId}_post.png`}
                      alt="Sensor scene context"
                      onError={(e) => { e.target.src = `/satellite_evidence/scenario_${selectedScenarioId}_pre.png`; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', bottom: '4px', right: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontSize: '9px' }}>
                      {selectedScenarioId === 3 ? 'EMSR357 High-Res Photo-Interpretation' : (selectedScenarioId === 2 ? 'EIDC Westoby Orthomosaic' : 'Zero-Shot Hazard Extent')}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '10px', color: tokens.textSecondary, lineHeight: 1.35, backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)', padding: '5px 7px', borderRadius: '4px' }}>
                <strong style={{ color: tokens.textPrimary }}>Detection Rationale: </strong>
                {selectedBuilding.priorityInfo?.explanation || (
                  selectedScenarioId === 3
                    ? `Copernicus EMS EMSR357 rapid mapping point grade: ${(selectedBuilding.damageClass || 'Damaged').toUpperCase()}. Photo-interpreted satellite assessment across coastal Puri.`
                    : selectedScenarioId === 2
                      ? `EIDC Westoby et al. (2023) survey condition: ${(selectedBuilding.damageClass === 'no-damage' ? 'Intact Structure' : 'Damaged / Obstructed')}. Post-flood avalanche scour corridor.`
                      : selectedScenarioId === 4
                        ? `Qualitative Zero-Shot Protocol: Building exposure derived relative to 20.4 ha Kheer Ganga debris fan. No verified ground truth labels exist.`
                        : (selectedBuilding.damageClass === 'destroyed'
                            ? 'Structural collapse detected. Complete obliteration of roof plane and dispersed rubble scatter.'
                            : selectedBuilding.damageClass === 'major-damage'
                              ? 'Major structural trauma. Severe roof shearing and foundation breach detected via high-res spectral delta.'
                              : selectedBuilding.damageClass === 'minor-damage'
                                ? 'Minor exterior shingle displacement and perimeter flooding/smoke staining; frame intact.'
                                : 'Structure intact. Clean geometric roof boundaries and no detectable physical disruption.')
                )}
              </div>
            </div>

            {/* Damage Assessment */}
            <div style={{ backgroundColor: tokens.bgTertiary, padding: '8px', borderRadius: '6px', border: `1px solid ${tokens.border}`, marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase' }}>
                  Damage Classification
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

              <div style={{ fontSize: '10px', color: tokens.textSecondary, marginBottom: '6px' }}>
                Confidence: <strong style={{ color: tokens.textPrimary }}>{selectedBuilding.confidence ? (selectedBuilding.confidence * 100).toFixed(1) : '100.0'}%</strong>
                {selectedScenarioId === 4 && <span style={{ color: '#d97706', marginLeft: '6px', fontWeight: 600 }}>(Inferred / Zero-Shot)</span>}
              </div>

              {/* Exposure and Access Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', borderTop: `1px solid ${tokens.border}`, paddingTop: '5px', fontSize: '10px' }}>
                <div>
                  <span style={{ color: tokens.textSecondary }}>Estimated Exposure:</span>
                  <strong style={{ display: 'block', color: tokens.textPrimary }}>
                    {selectedScenarioId === 3 
                      ? 'Unspecified (Point Observation)' 
                      : (selectedScenarioId === 4 ? 'Unverified (Zero-Shot Exposure)' : '~4-8 occupants (cadastral footprint)')}
                  </strong>
                </div>
                <div>
                  <span style={{ color: tokens.textSecondary }}>Road Accessibility:</span>
                  <strong style={{ display: 'block', color: avoidBlockedRoads ? '#10b981' : '#f59e0b' }}>
                    {avoidBlockedRoads ? 'Detour Route Clear' : 'Direct Corridor'}
                  </strong>
                </div>
              </div>

              {/* 4-Class Softmax Probability Distribution */}
              {selectedBuilding.probabilities && (
                <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: '4px', marginTop: '5px' }}>
                  {['no-damage', 'minor-damage', 'major-damage', 'destroyed'].map(k => {
                    const prob = selectedBuilding.probabilities[k] || 0;
                    return (
                      <div key={k} style={{ marginBottom: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                          <span style={{ color: tokens.textSecondary }}>{DAMAGE_LABELS[k]}:</span>
                          <strong style={{ color: tokens.textPrimary }}>{(prob * 100).toFixed(1)}%</strong>
                        </div>
                        <div style={{ height: '3px', backgroundColor: tokens.border, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${prob * 100}%`, height: '100%', backgroundColor: DAMAGE_COLORS[k] }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Priority Assessment & 5-Factor Breakdown */}
            {selectedBuilding.priorityInfo && (
              <div style={{ backgroundColor: tokens.bgTertiary, padding: '8px', borderRadius: '6px', border: `1px solid ${tokens.border}`, marginBottom: '10px' }}>
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
                  <span style={{ fontSize: '11px', fontWeight: 800, color: tokens.textPrimary }}>
                    Score: {((selectedBuilding.priorityInfo.priority_score || selectedBuilding.priorityInfo.priorityScore) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* 5 Heuristic Factor Contribution Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', marginBottom: '6px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: tokens.textSecondary }}>Structural Severity (40%):</span>
                      <strong style={{ color: tokens.textPrimary }}>{((selectedBuilding.priorityInfo.severity_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: tokens.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.severity_score || 0) * 100}%`, height: '100%', backgroundColor: '#ef4444' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: tokens.textSecondary }}>Population Exposure (20%):</span>
                      <strong style={{ color: tokens.textPrimary }}>{((selectedBuilding.priorityInfo.population_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: tokens.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.population_score || 0) * 100}%`, height: '100%', backgroundColor: '#f59e0b' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: tokens.textSecondary }}>Critical Infrastructure (15%):</span>
                      <strong style={{ color: tokens.textPrimary }}>{((selectedBuilding.priorityInfo.infrastructure_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: tokens.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.infrastructure_score || 0) * 100}%`, height: '100%', backgroundColor: '#0284c7' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: tokens.textSecondary }}>Road Accessibility (15%):</span>
                      <strong style={{ color: tokens.textPrimary }}>{((selectedBuilding.priorityInfo.accessibility_score || 0) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: tokens.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.accessibility_score || 0) * 100}%`, height: '100%', backgroundColor: '#7c3aed' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: tokens.textSecondary }}>Hazard Zone Proximity (10%):</span>
                      <strong style={{ color: tokens.textPrimary }}>
                        {((selectedBuilding.priorityInfo.hazard_proximity_score || (selectedScenarioId === 4 ? 0.85 : 0.70)) * 100).toFixed(0)}%
                      </strong>
                    </div>
                    <div style={{ height: '3px', backgroundColor: tokens.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(selectedBuilding.priorityInfo.hazard_proximity_score || (selectedScenarioId === 4 ? 0.85 : 0.70)) * 100}%`, height: '100%', backgroundColor: '#dc2626' }}></div>
                    </div>
                  </div>
                </div>

                {/* Plain-Language Rationale */}
                <div style={{ fontSize: '10px', color: tokens.textPrimary, lineHeight: 1.3, borderTop: `1px solid ${tokens.border}`, paddingTop: '4px' }}>
                  <strong>WHY PRIORITISED:</strong> {selectedBuilding.priorityInfo.explanation}
                </div>
              </div>
            )}

            {/* RESPONSE ACTIONS */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textPrimary, textTransform: 'uppercase', marginBottom: '4px' }}>
                Response Actions
              </div>

              <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', cursor: 'pointer', color: tokens.textSecondary }}>
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
                  <span style={{ fontSize: '9px', fontWeight: 500, opacity: 0.9 }}>EOC Staging → Site</span>
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
        ) : selectedZone ? (
          /* Operational Zone Details Panel */
          <div style={{
            backgroundColor: tokens.bgCard,
            border: `2px solid ${PRIORITY_COLORS[selectedZone.criticality] || (isDark ? tokens.border : '#0f172a')}`,
            borderRadius: '8px',
            padding: '14px',
            boxShadow: tokens.shadow
          }}>
            {/* Zone Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  backgroundColor: PRIORITY_COLORS[selectedZone.criticality] || '#0f172a',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  textTransform: 'uppercase'
                }}>
                  {selectedZone.criticality} SECTOR
                </span>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: tokens.textPrimary, margin: '4px 0 0 0' }}>
                  {selectedZone.name}
                </h3>
                <span style={{ fontSize: '10px', color: tokens.textSecondary, fontWeight: 600 }}>
                  {selectedZone.zoneCode}
                </span>
              </div>
              <button
                onClick={() => { setSelectedZone(null); clearRoute(); }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: tokens.textSecondary }}
              >
                ✕
              </button>
            </div>

            {/* Zone Evidence Explanation Card */}
            <div style={{
              backgroundColor: selectedScenarioId === 4 ? (isDark ? '#2a1a1a' : '#fffbeb') : (isDark ? tokens.bgTertiary : '#f8fafc'),
              border: `1px solid ${selectedScenarioId === 4 ? '#fcd34d' : tokens.border}`,
              borderRadius: '6px',
              padding: '8px',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: selectedScenarioId === 4 ? '#b45309' : (selectedScenarioId === 2 ? '#15803d' : '#0369a1'),
                  color: '#fff'
                }}>
                  {selectedScenarioId === 4 ? 'QUALITATIVE / ZERO-SHOT' : (selectedScenarioId === 2 ? 'VERIFIED GROUND TRUTH' : 'POINT-BASED OBSERVATION')}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: tokens.textPrimary, lineHeight: 1.3 }}>
                {selectedScenarioId === 4 && 'Zone perimeter delineated from 20.4-ha debris fan overlay at Kheer Ganga-Bhagirathi confluence. Structural building damage is unverified.'}
                {selectedScenarioId === 2 && 'Zone delineated from field-surveyed building damage polygons by EIDC Westoby et al. and post-flood avalanche scour corridor.'}
                {selectedScenarioId === 3 && 'Zone delineated from Copernicus EMS EMSR357 point grading and OSDMA cyclone shelter records across coastal Puri.'}
                {selectedScenarioId === 1 && 'Zone delineated from supervised xBD cadastral building footprints across Malibu fire corridor.'}
              </div>
            </div>

            {/* Criticality Score Bar */}
            <div style={{ backgroundColor: tokens.bgTertiary, padding: '8px', borderRadius: '6px', border: `1px solid ${tokens.border}`, marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                <span style={{ color: tokens.textSecondary }}>Criticality Score Index</span>
                <strong style={{ color: PRIORITY_COLORS[selectedZone.criticality] || tokens.textPrimary }}>
                  {((selectedZone.criticalityScore || 0) * 100).toFixed(0)}%
                </strong>
              </div>
              <div style={{ height: '4px', backgroundColor: tokens.border, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${(selectedZone.criticalityScore || 0) * 100}%`, height: '100%', backgroundColor: PRIORITY_COLORS[selectedZone.criticality] || '#0f172a' }}></div>
              </div>
            </div>

            {/* Aggregated Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              <div style={{ padding: '6px 8px', backgroundColor: tokens.bgTertiary, borderRadius: '4px', border: `1px solid ${tokens.border}` }}>
                <span style={{ fontSize: '9px', color: tokens.textSecondary, display: 'block' }}>Total Evaluated</span>
                <strong style={{ fontSize: '12px', color: tokens.textPrimary }}>{selectedZone.totalBuildings} Buildings</strong>
              </div>
              <div style={{ padding: '6px 8px', backgroundColor: isDark ? '#2a1a1a' : '#fef2f2', borderRadius: '4px', border: `1px solid ${isDark ? '#7f1d1d' : '#fee2e2'}` }}>
                <span style={{ fontSize: '9px', color: isDark ? '#fca5a5' : '#991b1b', display: 'block' }}>Severe Impact</span>
                <strong style={{ fontSize: '12px', color: '#dc2626' }}>
                  {(selectedZone.destroyedCount || 0) + (selectedZone.majorDamageCount || 0)} Structures
                </strong>
              </div>
              <div style={{ padding: '6px 8px', backgroundColor: isDark ? '#162438' : '#f0f9ff', borderRadius: '4px', border: `1px solid ${isDark ? '#1e3a8a' : '#e0f2fe'}` }}>
                <span style={{ fontSize: '9px', color: isDark ? '#93c5fd' : '#0369a1', display: 'block' }}>Exposed Population</span>
                <strong style={{ fontSize: '12px', color: '#0284c7' }}>~{selectedZone.estimatedPopulation} Residents</strong>
              </div>
              <div style={{ padding: '6px 8px', backgroundColor: isDark ? '#221c35' : '#faf5ff', borderRadius: '4px', border: `1px solid ${isDark ? '#581c87' : '#f3e8ff'}` }}>
                <span style={{ fontSize: '9px', color: isDark ? '#d8b4fe' : '#7e22ce', display: 'block' }}>Blocked Corridors</span>
                <strong style={{ fontSize: '12px', color: '#7c3aed' }}>{selectedZone.blockedRoadsCount} Roadblocks</strong>
              </div>
            </div>

            {/* Civil Defence Recommendation */}
            <div style={{ backgroundColor: isDark ? '#2a2216' : '#fffbeb', border: `1px solid ${isDark ? '#78350f' : '#fde68a'}`, borderRadius: '6px', padding: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: isDark ? '#fbbf24' : '#92400e', textTransform: 'uppercase', marginBottom: '2px' }}>
                CIVIL DEFENCE DIRECTIVE
              </div>
              <div style={{ fontSize: '10px', color: isDark ? '#fde68a' : '#78350f', lineHeight: 1.35, fontWeight: 500 }}>
                {selectedZone.recommendedAction}
              </div>
            </div>

            {/* Explainable Rationale */}
            <div style={{ fontSize: '10px', color: tokens.textSecondary, lineHeight: 1.35, marginBottom: '12px' }}>
              {selectedZone.explanation}
            </div>

            {/* Zone Apex Routing Actions */}
            <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textPrimary, textTransform: 'uppercase', marginBottom: '6px' }}>
                Zone Command Routing (Apex Target #{selectedZone.highestPriorityBuildingId})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => {
                    const bMatch = rawDataRef.current.damages?.features?.find(f => (f.properties?.buildingId || f.properties?.id) === selectedZone.highestPriorityBuildingId);
                    const priMatch = rawDataRef.current.priorities?.features?.find(f => (f.properties?.building_id || f.properties?.id) === selectedZone.highestPriorityBuildingId);
                    if (bMatch) {
                      setSelectedBuilding({
                        ...bMatch.properties,
                        geometry: bMatch.geometry,
                        priorityInfo: priMatch?.properties
                      });
                    }
                    calculateRoute('RESPONSE');
                  }}
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
                  <span>DISPATCH TO ZONE APEX</span>
                  <span style={{ fontSize: '9px', fontWeight: 500, opacity: 0.9 }}>EOC Staging → Target</span>
                </button>

                <button
                  onClick={() => {
                    const bMatch = rawDataRef.current.damages?.features?.find(f => (f.properties?.buildingId || f.properties?.id) === selectedZone.highestPriorityBuildingId);
                    const priMatch = rawDataRef.current.priorities?.features?.find(f => (f.properties?.building_id || f.properties?.id) === selectedZone.highestPriorityBuildingId);
                    if (bMatch) {
                      setSelectedBuilding({
                        ...bMatch.properties,
                        geometry: bMatch.geometry,
                        priorityInfo: priMatch?.properties
                      });
                    }
                    calculateRoute('EVACUATION', 'hospital');
                  }}
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
                  <span>EVACUATE ZONE APEX</span>
                  <span style={{ fontSize: '9px', fontWeight: 500, opacity: 0.9 }}>Target → Hospital</span>
                </button>

                <button
                  onClick={() => handleOpenZoneAlertModal(selectedZone)}
                  style={{
                    backgroundColor: '#dc2626',
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>📢</span> SEND ZONE ALERT
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.9 }}>CAP 1.2 Broadcast</span>
                </button>

                <button
                  onClick={() => handleOpenDispatchModal(selectedZone)}
                  style={{
                    backgroundColor: '#059669',
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>🚒</span> DISPATCH SERVICES
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.9 }}>Deploy Unit</span>
                </button>
              </div>
            </div>

            {/* Constituent Buildings Drill-down */}
            {selectedZone.constituentBuildingIds && selectedZone.constituentBuildingIds.length > 0 && (
              <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Constituent Structures ({selectedZone.constituentBuildingIds.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                  {selectedZone.constituentBuildingIds.map(bId => {
                    const bMatch = rawDataRef.current.damages?.features?.find(f => (f.properties?.buildingId || f.properties?.id) === bId);
                    const dClass = bMatch?.properties?.damageClass || 'no-damage';
                    return (
                      <button
                        key={bId}
                        onClick={() => {
                          const priMatch = rawDataRef.current.priorities?.features?.find(f => (f.properties?.building_id || f.properties?.id) === bId);
                          if (bMatch) {
                            setSelectedBuilding({
                              ...bMatch.properties,
                              geometry: bMatch.geometry,
                              priorityInfo: priMatch?.properties
                            });
                          }
                        }}
                        style={{
                          padding: '2px 5px',
                          fontSize: '9px',
                          fontWeight: 700,
                          borderRadius: '3px',
                          border: `1px solid ${DAMAGE_COLORS[dClass] || tokens.border}`,
                          backgroundColor: DAMAGE_COLORS[dClass] ? `${DAMAGE_COLORS[dClass]}22` : tokens.bgTertiary,
                          color: tokens.textPrimary,
                          cursor: 'pointer'
                        }}
                      >
                        #{bId}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Default Incident Snapshot & Operational Zones List */
          <div style={{
            backgroundColor: tokens.bgCard,
            border: `1px solid ${tokens.border}`,
            borderRadius: '8px',
            padding: '14px',
            boxShadow: tokens.shadow
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: tokens.textPrimary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', borderBottom: `1px solid ${tokens.border}`, paddingBottom: '6px' }}>
              INCIDENT SNAPSHOT & SECTOR OVERVIEW
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', backgroundColor: tokens.bgTertiary, borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: tokens.textSecondary }}>Structures Assessed</span>
                <strong style={{ fontSize: '12px', color: tokens.textPrimary }}>{rawDataRef.current.damages?.features?.length || 0}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', backgroundColor: isDark ? '#2a1a1a' : '#fef2f2', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: isDark ? '#fca5a5' : '#991b1b' }}>Operational Sectors</span>
                <strong style={{ fontSize: '12px', color: '#dc2626' }}>{rawDataRef.current.zones?.features?.length || 0} Zones</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', backgroundColor: isDark ? '#13281c' : '#f0fdf4', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: isDark ? '#86efac' : '#166534' }}>Emergency Hospitals</span>
                <strong style={{ fontSize: '12px', color: '#059669' }}>{rawDataRef.current.hospitals?.features?.length || 0}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', backgroundColor: isDark ? '#162438' : '#f0f9ff', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: isDark ? '#93c5fd' : '#075985' }}>Relief Shelters</span>
                <strong style={{ fontSize: '12px', color: '#0284c7' }}>{rawDataRef.current.shelters?.features?.length || 0}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', backgroundColor: isDark ? '#221c35' : '#faf5ff', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: isDark ? '#d8b4fe' : '#6b21a8' }}>Blocked Corridors</span>
                <strong style={{ fontSize: '12px', color: '#7c3aed' }}>{rawDataRef.current.roads?.features?.filter(r => r.properties?.isBlocked)?.length || 0}</strong>
              </div>
            </div>

            {/* Operational Zones Quick Select Cards */}
            {rawDataRef.current.zones?.features && rawDataRef.current.zones.features.length > 0 && (
              <div style={{ marginTop: '10px', borderTop: `1px solid ${tokens.border}`, paddingTop: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: tokens.textSecondary, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Operational Sectors (Click to Inspect)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rawDataRef.current.zones.features.map(feat => {
                    const zp = feat.properties;
                    const col = PRIORITY_COLORS[zp.criticality] || tokens.textPrimary;
                    return (
                      <div
                        key={zp.id}
                        onClick={() => {
                          setSelectedZone(zp);
                          const map = mapInstanceRef.current;
                          if (map) {
                            const bLayer = L.geoJSON(feat);
                            if (bLayer.getBounds().isValid()) {
                              map.fitBounds(bLayer.getBounds(), { padding: [40, 40] });
                            }
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${tokens.border}`,
                          borderLeft: `4px solid ${col}`,
                          backgroundColor: tokens.bgTertiary,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: tokens.textPrimary }}>
                            {zp.name}
                          </div>
                          <div style={{ fontSize: '9px', color: tokens.textSecondary }}>
                            {zp.totalBuildings} bldgs • {zp.destroyedCount} destroyed • ~{zp.estimatedPopulation} pop
                          </div>
                        </div>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 800,
                          backgroundColor: col,
                          color: '#fff',
                          padding: '2px 5px',
                          borderRadius: '3px'
                        }}>
                          {zp.criticality}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calculated Authoritative Route Card */}
        {activeRoute && (
          <div style={{
            backgroundColor: activeRoute.routePurpose === 'RESPONSE' ? (isDark ? '#2a2216' : '#fffbeb') : (isDark ? '#162438' : '#f0f9ff'),
            border: `2px solid ${activeRoute.routePurpose === 'RESPONSE' ? '#d97706' : '#0284c7'}`,
            borderRadius: '8px',
            padding: '12px',
            boxShadow: tokens.shadow
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                color: activeRoute.routePurpose === 'RESPONSE' ? (isDark ? '#f59e0b' : '#b45309') : (isDark ? '#38bdf8' : '#0284c7')
              }}>
                {activeRoute.routePurpose === 'RESPONSE'
                  ? `RESPONDER ROUTE: EOC → Structure #${selectedBuilding?.id || activeRoute.priorityId}`
                  : `EVACUATION ROUTE: Structure #${selectedBuilding?.id || activeRoute.priorityId} → ${activeRoute.destinationName}`
                }
              </span>
              <button
                onClick={clearRoute}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: tokens.textSecondary, fontWeight: 600 }}
              >
                ✕ Clear
              </button>
            </div>

            <div style={{ fontSize: '10px', color: tokens.textSecondary, marginBottom: '6px', lineHeight: 1.3 }}>
              {activeRoute.purposeDescription}
            </div>

            <div style={{ fontSize: '10px', marginBottom: '2px', color: tokens.textPrimary }}>
              Origin: <strong>{activeRoute.originName}</strong>
            </div>

            <div style={{ fontSize: '10px', marginBottom: '6px', color: tokens.textPrimary }}>
              Destination: <strong>{activeRoute.destinationName}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '4px', marginBottom: '6px' }}>
              <div>
                <span style={{ fontSize: '9px', color: tokens.textSecondary, display: 'block' }}>Route Distance</span>
                <strong style={{ fontSize: '12px', color: tokens.textPrimary }}>{activeRoute.distanceKm} km</strong>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: tokens.textSecondary, display: 'block' }}>Estimated Travel</span>
                <strong style={{ fontSize: '12px', color: tokens.textPrimary }}>~{activeRoute.estimatedMinutes} mins</strong>
              </div>
            </div>

            <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: tokens.textPrimary }}>
              <span>Roadblocks Avoided:</span>
              <strong style={{ color: '#7c3aed' }}>{activeRoute.avoidedBlockageCount || 4} corridors</strong>
            </div>

            {/* Human-Readable Ordered Route Sequence */}
            {activeRoute.routeSteps && activeRoute.routeSteps.length > 0 && (
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${tokens.border}` }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: tokens.textPrimary, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Ordered Route Sequence:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', color: tokens.textSecondary }}>
                  {activeRoute.routeSteps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ fontWeight: 700, color: tokens.accent }}>{sIdx + 1}.</span>
                      <span style={{ color: tokens.textPrimary }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '9px', color: tokens.textSecondary, borderTop: `1px solid ${tokens.border}`, paddingTop: '4px', marginTop: '6px' }}>
              Suggested route. Verify current road conditions before deployment. (Graph Latency: {activeRoute.calculationTimeMs} ms)
            </div>
          </div>
        )}

      </div>

      {/* ============================================================ */}
      {/* 4. MODALS & TOASTS: ZONE ALERT BROADCAST & CAD DISPATCH       */}
      {/* ============================================================ */}

      {/* 4a. Broadcast Zone Alert Modal */}
      {isZoneAlertModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          <div style={{
            width: '480px',
            maxWidth: '92vw',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={18} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Broadcast Zone-Specific Alert
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    OASIS CAP v1.2 Deterministic Sector Targeting
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsZoneAlertModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Target Sector Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                Target Operational Sector
              </label>
              <select
                value={zoneAlertForm.zoneId}
                onChange={(e) => {
                  const zId = parseInt(e.target.value);
                  const zFeat = rawDataRef.current.zones?.features?.find(f => (f.properties?.id == zId) || (f.id == zId));
                  const zp = zFeat?.properties || {};
                  setZoneAlertForm(prev => ({
                    ...prev,
                    zoneId: zId,
                    zoneName: zp.name || 'Sector',
                    headline: `MANDATORY EVACUATION: ${zp.name || 'Target Sector'}`,
                    description: `Urgent threat in ${zp.name || 'sector'}. ${zp.totalBuildings || 0} structures in danger perimeter.`
                  }));
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                {rawDataRef.current.zones?.features?.map(zf => {
                  const zp = zf.properties || {};
                  return (
                    <option key={zp.id} value={zp.id}>
                      {zp.name} ({zp.criticality || 'HIGH'}) — {zp.totalBuildings || 0} bldgs
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Urgency & Severity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                  Severity
                </label>
                <select
                  value={zoneAlertForm.severity}
                  onChange={(e) => setZoneAlertForm(prev => ({ ...prev, severity: e.target.value }))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: '11px'
                  }}
                >
                  <option value="Extreme">Extreme (Life Threat)</option>
                  <option value="Severe">Severe (Structural Damage)</option>
                  <option value="Moderate">Moderate (Advisory)</option>
                  <option value="Minor">Minor (Informational)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                  Urgency
                </label>
                <select
                  value={zoneAlertForm.urgency}
                  onChange={(e) => setZoneAlertForm(prev => ({ ...prev, urgency: e.target.value }))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: '11px'
                  }}
                >
                  <option value="Immediate">Immediate (Take Action Now)</option>
                  <option value="Expected">Expected (Prepare Now)</option>
                  <option value="Future">Future (Monitor)</option>
                </select>
              </div>
            </div>

            {/* Alert Headline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                Alert Headline
              </label>
              <input
                type="text"
                value={zoneAlertForm.headline}
                onChange={(e) => setZoneAlertForm(prev => ({ ...prev, headline: e.target.value }))}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              />
            </div>

            {/* Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                Directive & Evacuation Instruction
              </label>
              <textarea
                rows={3}
                value={zoneAlertForm.instruction}
                onChange={(e) => setZoneAlertForm(prev => ({ ...prev, instruction: e.target.value }))}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '11px',
                  resize: 'none'
                }}
              />
            </div>

            {/* Delivery Channels Badge Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px' }}>
                ✓ WEA Cell Broadcast
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px' }}>
                ✓ Civilian Web Push
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px' }}>
                ✓ CAD Fleet Stream
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px' }}>
                ✓ Acoustic Siren
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => setIsZoneAlertModalOpen(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendZoneAlert}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>📢</span> Broadcast CAP 1.2 Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4b. Dispatch Services Modal */}
      {isDispatchModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          <div style={{
            width: '520px',
            maxWidth: '92vw',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Dispatch Emergency Services
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    FEMA ICS-200 Resource Assignment • Target: {dispatchTargetZone?.name || 'Operational Sector'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Target Sector Info Box */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Destination: {dispatchTargetZone?.name}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Criticality: <span style={{ fontWeight: 700, color: dispatchTargetZone?.criticality === 'CRITICAL' ? '#ef4444' : '#f97316' }}>{dispatchTargetZone?.criticality || 'HIGH'}</span> • {dispatchTargetZone?.totalBuildings || 0} structures • {dispatchTargetZone?.destroyedCount || 0} destroyed
                </div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px' }}>
                SECTOR APEX
              </span>
            </div>

            {/* Service Category Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                Select Service Category
              </label>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { id: 'ALL', label: 'All Services' },
                  { id: 'FIRE', label: '🚒 Fire & Rescue' },
                  { id: 'EMS', label: '🚑 Medical EMS' },
                  { id: 'SAR', label: '🦺 Urban SAR' },
                  { id: 'POLICE', label: '🚓 Police Evac' }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDispatchServiceFilter(s.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: `1.5px solid ${dispatchServiceFilter === s.id ? '#059669' : (isDark ? '#334155' : '#cbd5e1')}`,
                      backgroundColor: dispatchServiceFilter === s.id ? (isDark ? '#064e3b' : '#ecfdf5') : 'transparent',
                      color: dispatchServiceFilter === s.id ? '#059669' : (isDark ? '#94a3b8' : '#64748b'),
                      fontSize: '10px',
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

            {/* Available Units Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                Select Tactical Response Unit
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {availableUnitsList.filter(unit => {
                  if (dispatchServiceFilter === 'ALL') return true;
                  if (dispatchServiceFilter === 'FIRE') return ['FIRE_ENGINE', 'LADDER_TRUCK', 'WATER_TENDER'].includes(unit.unitType);
                  if (dispatchServiceFilter === 'EMS') return ['AMBULANCE', 'MOBILE_ICU'].includes(unit.unitType);
                  if (dispatchServiceFilter === 'SAR') return ['RESCUE_SQUAD', 'USAR_TEAM'].includes(unit.unitType);
                  if (dispatchServiceFilter === 'POLICE') return ['TACTICAL_PATROL', 'TRAFFIC_ESCORT'].includes(unit.unitType);
                  return true;
                }).map(unit => {
                  const isAvail = unit.status === 'AVAILABLE';
                  const isSelected = selectedUnitForDispatch === unit.id;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnitForDispatch(unit.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1.5px solid ${isSelected ? '#059669' : (isDark ? '#334155' : '#e2e8f0')}`,
                        backgroundColor: isSelected 
                          ? (isDark ? '#064e3b' : '#f0fdf4') 
                          : (isDark ? '#1e293b' : '#ffffff'),
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="dispatchUnit"
                          checked={isSelected}
                          onChange={() => setSelectedUnitForDispatch(unit.id)}
                          style={{ accentColor: '#059669' }}
                        />
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {unit.callsign}
                          </div>
                          <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                            {unit.unitType} • {unit.personnelCount || 4} Personnel • Speed: {unit.speedKmh || 0} km/h
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '3px',
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

            {/* Directives / Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', textTransform: 'uppercase' }}>
                Tactical Directives & Access Notes
              </label>
              <input
                type="text"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="e.g. Deploy immediately for search and rescue triage at sector perimeter"
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '11px'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  backgroundColor: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchService}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>🚒</span> Confirm Tactical Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4c. Global Action Confirmation Toast */}
      {actionSuccessNotice && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2500,
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '24px',
          fontSize: '12px',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #10b981',
          pointerEvents: 'none'
        }}>
          <span>✓</span> {actionSuccessNotice}
        </div>
      )}

    </div>
  );
}

export default DisasterMap;
