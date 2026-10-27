import * as Cesium from 'cesium';

/**
 * DRAS v2.0 — Cesium 3D Geospatial Adapter
 * Converts DRAS PostGIS GeoJSON features into 3D Cesium entities.
 */

export const DAMAGE_COLORS = {
  'no-damage': '#10b981',     // Green / Emerald
  'minor-damage': '#f59e0b',  // Yellow / Amber
  'major-damage': '#f97316',  // Orange
  'destroyed': '#ef4444',     // Red / Crimson
  'unknown': '#94a3b8'        // Slate
};

export const PRIORITY_COLORS = {
  'CRITICAL': '#dc2626',
  'HIGH': '#ea580c',
  'MEDIUM': '#d97706',
  'LOW': '#059669'
};

/**
 * Returns Cesium.Color for a damage class
 */
export function getCesiumDamageColor(damageClass, alpha = 0.88) {
  const hex = DAMAGE_COLORS[damageClass] || DAMAGE_COLORS['unknown'];
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha);
}

/**
 * Returns Cesium.Color for a priority level
 */
export function getCesiumPriorityColor(priorityLevel, alpha = 0.88) {
  const hex = PRIORITY_COLORS[priorityLevel] || '#0284c7';
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha);
}

/**
 * Computes estimated extrusion height for 3D building.
 * Documented approximation: Base height estimated from footprint area + priority triage bonus.
 */
export function estimateBuildingHeight(properties = {}, priorityLevel = 'LOW') {
  if (properties.building_height && properties.building_height > 0) {
    return properties.building_height;
  }
  const area = properties.area || properties.footprint_area || 100;
  // Controlled baseline height between 8m and 22m
  const baseHeight = Math.max(8, Math.min(22, Math.sqrt(area) * 0.85));
  
  // Subtle triage bonus for immediate visual recognition in 3D
  let triageBonus = 0;
  if (priorityLevel === 'CRITICAL') triageBonus = 8.0;
  else if (priorityLevel === 'HIGH') triageBonus = 4.0;
  else if (priorityLevel === 'MEDIUM') triageBonus = 2.0;

  return Math.round((baseHeight + triageBonus) * 10) / 10;
}

/**
 * Extracts coordinate list from GeoJSON Geometry
 */
function getLinearRingCoordinates(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') {
    return geom.coordinates[0] || [];
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates[0]?.[0] || [];
  }
  return [];
}

/**
 * Converts GeoJSON damages / buildings to 3D extruded Cesium entities.
 */
export function convertBuildingsTo3DEntities(features = [], options = {}) {
  const {
    colorMode = 'DAMAGE', // 'DAMAGE' or 'PRIORITY'
    damageFilter = 'ALL',
    priorityFilter = 'ALL',
    confidenceThreshold = 0.0,
    selectedBuildingId = null,
    isFani = false
  } = options;

  const entities = [];

  for (const feat of features) {
    if (!feat || !feat.geometry) continue;

    const props = feat.properties || {};
    const bldgId = props.buildingId || props.building_id || props.id;
    const dClass = props.damageClass || props.damage_class || 'no-damage';
    const conf = props.confidence ?? 1.0;
    const priorityLevel = props.priorityLevel || props.priority_level || 'LOW';
    const isSelected = selectedBuildingId !== null && String(bldgId) === String(selectedBuildingId);

    // Apply Damage Filter
    if (damageFilter !== 'ALL' && dClass !== damageFilter) continue;
    // Apply Priority Filter
    if (priorityFilter !== 'ALL' && priorityLevel !== priorityFilter) continue;
    // Apply Confidence Threshold
    if (conf < confidenceThreshold) continue;

    // Color Determination
    const baseColor = colorMode === 'PRIORITY' 
      ? getCesiumPriorityColor(priorityLevel, isSelected ? 0.98 : 0.85)
      : getCesiumDamageColor(dClass, isSelected ? 0.98 : 0.85);

    const height = estimateBuildingHeight(props, priorityLevel);

    // Case A: Point Observations (geometry type Point)
    if (feat.geometry.type === 'Point') {
      const coords = feat.geometry.coordinates;
      const lon = coords[0];
      const lat = coords[1];

      entities.push({
        id: `building-${bldgId}`,
        name: `Structure #${bldgId} (Observation Point)`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: isSelected ? 16 : 10,
          color: isSelected ? Cesium.Color.fromCssColorString('#ffffff') : baseColor,
          outlineColor: isSelected ? Cesium.Color.RED : Cesium.Color.BLACK,
          outlineWidth: isSelected ? 3 : 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        properties: {
          ...props,
          _drasType: 'building',
          rawFeature: feat,
          estimatedHeightMeters: height
        }
      });
      continue;
    }

    // Case B: Polygonal Building Footprints (Woolsey, Chamoli, Fani, Dharali)
    const ring = getLinearRingCoordinates(feat.geometry);
    if (!ring || ring.length < 3) continue;

    // Flatten coords into [lon, lat, lon, lat, ...]
    const flatPositions = [];
    for (const pt of ring) {
      flatPositions.push(pt[0], pt[1]);
    }

    try {
      const positions = Cesium.Cartesian3.fromDegreesArray(flatPositions);
      if (positions.length < 3) continue;

      entities.push({
        id: `building-${bldgId}`,
        name: `Structure #${bldgId}`,
        polygon: {
          hierarchy: positions,
          height: 0,
          extrudedHeight: isSelected ? height + 6 : height,
          material: isSelected 
            ? new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.95))
            : new Cesium.ColorMaterialProperty(baseColor),
          outline: true,
          outlineColor: isSelected ? Cesium.Color.RED : Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.85),
          closeTop: true,
          closeBottom: true
        },
        properties: {
          ...props,
          _drasType: 'building',
          rawFeature: feat,
          estimatedHeightMeters: height
        }
      });
    } catch (e) {
      console.warn(`Failed to parse building polygon #${bldgId}`, e);
    }
  }

  return entities;
}

/**
 * Converts GeoJSON Roads to 3D Cesium entities.
 * Blocked corridors are styled in bold purple with a 3D billboard indicator.
 */
export function convertRoadsTo3DEntities(roadFeatures = []) {
  const entities = [];

  for (let i = 0; i < roadFeatures.length; i++) {
    const feat = roadFeatures[i];
    if (!feat || !feat.geometry) continue;

    const props = feat.properties || {};
    const roadId = props.id || props.roadId || i;
    const isBlocked = props.isBlocked || props.is_blocked;
    const reason = props.blockageReason || props.blockage_reason || 'Road Blocked';

    const coords = feat.geometry.coordinates;
    if (!coords || coords.length < 2) continue;

    const flatCoords = [];
    for (const pt of coords) {
      flatCoords.push(pt[0], pt[1]);
    }

    try {
      const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);
      const entityId = `road-${roadId}`;

      // Road line
      entities.push({
        id: entityId,
        name: isBlocked ? `⛔ BLOCKED ROAD: ${props.name || 'Unnamed'}` : (props.name || 'Road Corridor'),
        polyline: {
          positions,
          width: isBlocked ? 5.5 : 2.5,
          clampToGround: true,
          material: isBlocked
            ? new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('#a855f7'),
                dashLength: 16.0
              })
            : Cesium.Color.fromCssColorString('#64748b').withAlpha(0.75)
        },
        properties: {
          ...props,
          _drasType: 'road'
        }
      });

      // If road is blocked, add a prominent 3D label badge at the midpoint
      if (isBlocked && coords.length > 0) {
        const midIdx = Math.floor(coords.length / 2);
        const midPt = coords[midIdx];
        entities.push({
          id: `road-blocked-badge-${roadId}`,
          name: `Roadblock Indicator`,
          position: Cesium.Cartesian3.fromDegrees(midPt[0], midPt[1]),
          label: {
            text: `⛔ BLOCKED: ${reason}`,
            font: 'bold 11px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString('#581c87'),
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            backgroundColor: Cesium.Color.fromCssColorString('rgba(88, 28, 135, 0.9)'),
            showBackground: true,
            backgroundPadding: new Cesium.Cartesian2(7, 4),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -22),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: {
            ...props,
            _drasType: 'roadblock_badge'
          }
        });
      }
    } catch (e) {
      console.warn(`Failed to parse road line #${roadId}`, e);
    }
  }

  return entities;
}

/**
 * Converts Hospitals and Relief Shelters to 3D Cesium billboard/label entities.
 */
export function convertFacilitiesTo3DEntities(hospitals = [], shelters = []) {
  const entities = [];

  // 1. Emergency Hospitals
  for (const h of hospitals) {
    if (!h.geometry?.coordinates) continue;
    const [lon, lat] = h.geometry.coordinates;
    const p = h.properties || {};
    const hid = p.id || p.hospitalId || `h-${lon}-${lat}`;

    entities.push({
      id: `hospital-${hid}`,
      name: p.name || 'Emergency Hospital',
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      point: {
        pixelSize: 14,
        color: Cesium.Color.fromCssColorString('#dc2626'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: `🏥 ${p.name || 'Hospital'}\n(${p.availableBeds || p.capacity || 'Active'} Beds)`,
        font: 'bold 11px sans-serif',
        fillColor: Cesium.Color.WHITE,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(153, 27, 27, 0.88)'),
        showBackground: true,
        backgroundPadding: new Cesium.Cartesian2(6, 4),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      properties: {
        ...p,
        _drasType: 'hospital'
      }
    });
  }

  // 2. Relief Shelters
  for (const s of shelters) {
    if (!s.geometry?.coordinates) continue;
    const [lon, lat] = s.geometry.coordinates;
    const p = s.properties || {};
    const sid = p.id || p.shelterId || `s-${lon}-${lat}`;

    entities.push({
      id: `shelter-${sid}`,
      name: p.name || 'Relief Shelter',
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      point: {
        pixelSize: 14,
        color: Cesium.Color.fromCssColorString('#0284c7'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: `⛺ ${p.name || 'Shelter'}\n(${p.capacity || '100'} Evacuees)`,
        font: 'bold 11px sans-serif',
        fillColor: Cesium.Color.WHITE,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(3, 105, 161, 0.88)'),
        showBackground: true,
        backgroundPadding: new Cesium.Cartesian2(6, 4),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      properties: {
        ...p,
        _drasType: 'shelter'
      }
    });
  }

  return entities;
}

/**
 * Converts Hazard Zones (e.g. 20.4 ha Dharali debris fan, Chamoli surge) to 3D entities.
 */
export function convertHazardsTo3DEntities(hazardFeatures = [], scenarioId = 1) {
  const entities = [];

  for (let i = 0; i < hazardFeatures.length; i++) {
    const feat = hazardFeatures[i];
    if (!feat || !feat.geometry) continue;

    const p = feat.properties || {};
    const isDharali = scenarioId === 4;

    const ring = getLinearRingCoordinates(feat.geometry);
    if (!ring || ring.length < 3) continue;

    const flatCoords = [];
    let sumLon = 0, sumLat = 0;
    for (const pt of ring) {
      flatCoords.push(pt[0], pt[1]);
      sumLon += pt[0];
      sumLat += pt[1];
    }
    const centerLon = sumLon / ring.length;
    const centerLat = sumLat / ring.length;

    try {
      const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);
      const color = isDharali ? Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.38) : Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.32);
      const outlineColor = isDharali ? Cesium.Color.fromCssColorString('#dc2626') : Cesium.Color.fromCssColorString('#d97706');

      entities.push({
        id: `hazard-${p.id || i}`,
        name: isDharali ? 'Dharali 2025 Debris / Impact Extent (20.4 ha)' : (p.name || 'Hazard Extent'),
        polygon: {
          hierarchy: positions,
          height: 0,
          material: new Cesium.ColorMaterialProperty(color),
          classificationType: Cesium.ClassificationType.TERRAIN
        },
        properties: {
          ...p,
          _drasType: 'hazard'
        }
      });

      // 3D Centroid Hazard Warning Beacon
      entities.push({
        id: `hazard-beacon-${p.id || i}`,
        position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 60),
        label: {
          text: `⚠️ HAZARD ZONE: ${(p.hazardType || p.hazard_type || 'HAZARD EXTENT').replace(/_/g, ' ')}`,
          font: 'bold 12px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          backgroundColor: Cesium.Color.fromCssColorString(isDharali ? 'rgba(220, 38, 38, 0.92)' : 'rgba(217, 119, 6, 0.92)'),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(8, 4),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        point: {
          pixelSize: 18,
          color: Cesium.Color.fromCssColorString(isDharali ? '#ef4444' : '#f59e0b'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    } catch (e) {
      console.warn('Failed to parse hazard polygon', e);
    }
  }

  return entities;
}

/**
 * Converts Operational Zones (4-tier macro sectors: CRITICAL, HIGH, MEDIUM, LOW) to 3D Cesium entities.
 */
export function convertZonesTo3DEntities(zoneFeatures = [], options = {}) {
  const { selectedZone = null } = options;
  const entities = [];

  for (let i = 0; i < zoneFeatures.length; i++) {
    const feat = zoneFeatures[i];
    if (!feat || !feat.geometry) continue;

    const p = feat.properties || {};
    const zid = p.id || p.zoneCode || i;
    const crit = (p.criticality || 'LOW').toUpperCase();
    const isSelected = selectedZone?.id === p.id;
    const hex = p.color || PRIORITY_COLORS[crit] || '#10b981';
    const fillAlpha = isSelected ? 0.42 : 0.28;
    const fillColor = Cesium.Color.fromCssColorString(hex).withAlpha(fillAlpha);
    const outlineCol = Cesium.Color.fromCssColorString(hex).withAlpha(0.98);

    const ring = getLinearRingCoordinates(feat.geometry);
    if (!ring || ring.length < 3) continue;

    const flatCoords = [];
    let sumLon = 0, sumLat = 0;
    for (const pt of ring) {
      flatCoords.push(pt[0], pt[1]);
      sumLon += pt[0];
      sumLat += pt[1];
    }
    const centroidLon = sumLon / ring.length;
    const centroidLat = sumLat / ring.length;

    try {
      const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);
      if (positions.length < 3) continue;

      // 1. Clamped Perimeter Polyline (Bold crisp outline so boundaries are 100% visible in 3D)
      const perimeterPositions = [...positions];
      if (flatCoords.length >= 4 && (flatCoords[0] !== flatCoords[flatCoords.length - 2] || flatCoords[1] !== flatCoords[flatCoords.length - 1])) {
        perimeterPositions.push(positions[0]);
      }

      entities.push({
        id: `operational-zone-outline-${zid}`,
        name: `Sector Boundary: ${p.name || p.zoneCode}`,
        polyline: {
          positions: perimeterPositions,
          width: isSelected ? 5.0 : 3.5,
          clampToGround: true,
          material: new Cesium.ColorMaterialProperty(outlineCol)
        },
        properties: {
          ...p,
          _drasType: 'operational_zone_outline',
          rawFeature: feat
        }
      });

      // 2. Clamped Sector Polygon (Vivid translucent color fill on Ellipsoid & 3D Terrain)
      entities.push({
        id: `operational-zone-${zid}`,
        name: `Operational Sector: ${p.name || p.zoneCode}`,
        polygon: {
          hierarchy: positions,
          material: new Cesium.ColorMaterialProperty(fillColor),
          classificationType: Cesium.ClassificationType.BOTH
        },
        properties: {
          ...p,
          _drasType: 'operational_zone',
          rawFeature: feat
        }
      });

      // 3. Ground-clamped Centroid Pin Anchor
      entities.push({
        id: `zone-pin-${zid}`,
        name: `Sector Anchor: ${p.name || p.zoneCode}`,
        position: Cesium.Cartesian3.fromDegrees(centroidLon, centroidLat),
        point: {
          pixelSize: isSelected ? 12 : 8,
          color: Cesium.Color.fromCssColorString(hex),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        properties: {
          ...p,
          _drasType: 'zone_pin',
          rawFeature: feat
        }
      });

      // 4. 3D Floating Sector Badge at Zone Centroid with wide distance visibility
      const offsets = [
        new Cesium.Cartesian2(0, -36),
        new Cesium.Cartesian2(-60, -22),
        new Cesium.Cartesian2(60, -22),
        new Cesium.Cartesian2(0, -56),
        new Cesium.Cartesian2(-50, -45),
        new Cesium.Cartesian2(50, -45)
      ];
      const pixelOffset = isSelected ? new Cesium.Cartesian2(0, -45) : offsets[i % offsets.length];
      const labelText = isSelected
        ? `${p.name || p.zoneCode}\n${p.totalBuildings || p.total_buildings || 0} Structures • ${p.destroyedCount || p.destroyed_count || 0} Destroyed [${crit}]`
        : `${p.name || p.zoneCode} [${crit}]`;

      entities.push({
        id: `zone-badge-${zid}`,
        name: `Sector Indicator: ${p.name || p.zoneCode}`,
        position: Cesium.Cartesian3.fromDegrees(centroidLon, centroidLat),
        label: {
          text: labelText,
          font: isSelected ? 'bold 13px Inter, -apple-system, sans-serif' : 'bold 11px Inter, -apple-system, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString('#0a0f1d'),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          backgroundColor: Cesium.Color.fromCssColorString(hex).withAlpha(isSelected ? 0.95 : 0.88),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(8, 4),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: pixelOffset,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1000, 1.0, 60000, 0.75),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(10, 200000)
        },
        properties: {
          ...p,
          _drasType: 'zone_badge',
          rawFeature: feat
        }
      });
    } catch (e) {
      console.warn(`Failed to parse zone polygon #${zid}`, e);
    }
  }

  return entities;
}

/**
 * Converts Active Route GeoJSON into a glowing 3D clamped corridor.
 */
export function convertRouteTo3DEntities(activeRoute) {
  if (!activeRoute) return [];

  const coords = activeRoute.routeGeoJson?.geometry?.coordinates 
    || activeRoute.routeGeoJson?.coordinates 
    || activeRoute.geometry?.coordinates;
  if (!coords || coords.length < 2) return [];

  const entities = [];
  const flatCoords = [];
  for (const pt of coords) {
    flatCoords.push(pt[0], pt[1]);
  }

  const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);
  const isResponse = activeRoute.routeType === 'RESPONSE' || activeRoute.routePurpose === 'RESPONSE_ACCESS';

  // 1. Glowing 3D Clamped Polyline
  entities.push({
    id: 'dras-active-3d-route',
    name: isResponse ? 'Response Access Route Corridor' : 'Evacuation Route Corridor',
    polyline: {
      positions,
      width: 8.0,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.35,
        color: isResponse ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#0284c7')
      }),
      clampToGround: true
    },
    properties: {
      ...activeRoute,
      _drasType: 'route'
    }
  });

  // 2. Origin Marker Badge
  const startPt = coords[0];
  entities.push({
    id: 'dras-route-origin-badge',
    position: Cesium.Cartesian3.fromDegrees(startPt[0], startPt[1]),
    label: {
      text: isResponse ? '🏢 EOC STAGING BASE' : '📍 EVACUATION ORIGIN',
      font: 'bold 12px sans-serif',
      fillColor: Cesium.Color.WHITE,
      backgroundColor: isResponse ? Cesium.Color.fromCssColorString('rgba(180, 83, 9, 0.95)') : Cesium.Color.fromCssColorString('rgba(15, 23, 42, 0.95)'),
      showBackground: true,
      backgroundPadding: new Cesium.Cartesian2(8, 5),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -28),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  // 3. Destination Marker Badge
  const endPt = coords[coords.length - 1];
  entities.push({
    id: 'dras-route-dest-badge',
    position: Cesium.Cartesian3.fromDegrees(endPt[0], endPt[1]),
    label: {
      text: isResponse 
        ? `🎯 PRIORITY TARGET #${activeRoute.targetBuildingId || ''}` 
        : `🏥 ${activeRoute.destinationName || 'FACILITY'}`,
      font: 'bold 12px sans-serif',
      fillColor: Cesium.Color.WHITE,
      backgroundColor: isResponse ? Cesium.Color.fromCssColorString('rgba(220, 38, 38, 0.95)') : Cesium.Color.fromCssColorString('rgba(2, 132, 199, 0.95)'),
      showBackground: true,
      backgroundPadding: new Cesium.Cartesian2(8, 5),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -28),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  return entities;
}

/**
 * Converts OASIS CAP v1.2 Alerts to 3D Cesium broadcast zone entities.
 */
export function convertAlertsTo3DEntities(alerts = []) {
  const entities = [];
  for (const alt of alerts) {
    if (!alt.geometry) continue;
    const props = alt.properties || {};
    const coords = getLinearRingCoordinates(alt.geometry);
    if (!coords || coords.length < 3) continue;

    const flatCoords = [];
    let sumLon = 0, sumLat = 0;
    for (const pt of coords) {
      flatCoords.push(pt[0], pt[1]);
      sumLon += pt[0];
      sumLat += pt[1];
    }
    const centerLon = sumLon / coords.length;
    const centerLat = sumLat / coords.length;

    try {
      const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);
      const isExtreme = props.severity === 'Extreme';
      const color = isExtreme
        ? Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.25)
        : Cesium.Color.fromCssColorString('#f97316').withAlpha(0.22);
      const outlineColor = isExtreme
        ? Cesium.Color.fromCssColorString('#ef4444')
        : Cesium.Color.fromCssColorString('#f97316');

      entities.push({
        id: `cap-alert-${props.id || props.identifier}`,
        name: `CAP Alert: ${props.event || 'Emergency Warning'}`,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: color,
          outline: true,
          outlineColor: outlineColor,
          outlineWidth: 3.0,
          height: 10.0,
          extrudedHeight: 70.0
        },
        properties: { ...props, _drasType: 'cap_alert' }
      });

      // 3D Centroid Warning Badge
      entities.push({
        id: `cap-alert-badge-${props.id || props.identifier}`,
        position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 100),
        label: {
          text: `🚨 EVACUATE IMMEDIATELY\n${props.event || 'EMERGENCY ALERT'} • ${(props.headline || '').slice(0, 42)}`,
          font: 'bold 12px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(220, 38, 38, 0.95)'),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(10, 5),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        point: {
          pixelSize: 20,
          color: Cesium.Color.fromCssColorString('#ef4444'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    } catch (e) {
      console.warn('Failed to parse alert 3D polygon', e);
    }
  }
  return entities;
}

/**
 * Converts Tactical Response Units to 3D Cesium entities.
 */
export function convertUnitsTo3DEntities(units = []) {
  const entities = [];
  for (const u of units) {
    if (!u.geometry?.coordinates) continue;
    const [lon, lat] = u.geometry.coordinates;
    const p = u.properties || {};
    const isAvail = p.status === 'AVAILABLE';

    entities.push({
      id: `unit-${p.id || p.callsign}`,
      name: `Tactical Unit: ${p.callsign}`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 20),
      point: {
        pixelSize: 15,
        color: isAvail ? Cesium.Color.fromCssColorString('#10b981') : Cesium.Color.fromCssColorString('#3b82f6'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2.5,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: `🚒 ${p.callsign}\n[${p.status}] ${p.unitType || ''}`,
        font: 'bold 11px sans-serif',
        fillColor: Cesium.Color.WHITE,
        backgroundColor: isAvail
          ? Cesium.Color.fromCssColorString('rgba(6, 78, 59, 0.92)')
          : Cesium.Color.fromCssColorString('rgba(30, 58, 138, 0.92)'),
        showBackground: true,
        backgroundPadding: new Cesium.Cartesian2(6, 3),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -22),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      properties: { ...p, _drasType: 'unit' }
    });
  }
  return entities;
}

