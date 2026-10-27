"""
Wire Cesium 3D Engine and 2D/3D View Mode into DisasterMap.jsx
"""
import re

file_path = r'frontend\src\pages\DisasterMap.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import api from '../services/api';\nimport { useTheme } from '../context/ThemeContext';"
new_import = """import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import CesiumGlobe from '../components/globe/CesiumGlobe';
import { Layers, ChevronRight, X, Satellite, Globe, Map as MapIcon } from 'lucide-react';"""

if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print("1. Imports updated successfully")
else:
    print("1. WARNING: Import pattern not matched")

# 2. Add mapViewMode state
old_state = "// View Level: 'BUILDINGS' | 'ZONES' | 'BOTH'\n  const [viewLevel, setViewLevel] = useState('BOTH');"
new_state = """// 2D / 3D Globe Mode: '3D' (Cesium 3D Earth) | '2D' (Leaflet 2D Map)
  const [mapViewMode, setMapViewMode] = useState('3D');
  const [presentationMode, setPresentationMode] = useState(false);

  // View Level: 'BUILDINGS' | 'ZONES' | 'BOTH'
  const [viewLevel, setViewLevel] = useState('BOTH');"""

if old_state in content:
    content = content.replace(old_state, new_state, 1)
    print("2. State updated successfully")
else:
    print("2. WARNING: State pattern not matched")

# 3. Add invalidateSize on Leaflet init
old_init = "Object.values(layerGroupsRef.current).forEach(lg => lg.addTo(map));\n      mapInstanceRef.current = map;"
new_init = """Object.values(layerGroupsRef.current).forEach(lg => lg.addTo(map));
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);"""

if old_init in content:
    content = content.replace(old_init, new_init, 1)
    print("3. Leaflet init invalidateSize added")
else:
    print("3. WARNING: Leaflet init pattern not matched")

# 4. Update container height to calc(100vh - 88px) to avoid outer scrollbar
old_height = "height: 'calc(100vh - 52px)'"
new_height = "height: 'calc(100vh - 88px)'"
if old_height in content:
    content = content.replace(old_height, new_height, 1)
    print("4. Container height updated to calc(100vh - 88px)")
else:
    print("4. WARNING: Container height pattern not matched")

# 5. Add 2D/3D Mode toggle in Left Column
old_scenario_select = "{/* Spatial View Mode: [ Buildings ] [ Zones ] [ Both ] */}"
new_mode_toggle = """{/* Map Engine View: 3D Earth / 2D Map */}
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
                  setTimeout(() => mapInstanceRef.current.invalidateSize(), 150);
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

        {/* Spatial View Mode: [ Buildings ] [ Zones ] [ Both ] */}"""

if old_scenario_select in content:
    content = content.replace(old_scenario_select, new_mode_toggle, 1)
    print("5. Left Column 2D/3D toggle added")
else:
    print("5. WARNING: Left Column pattern not matched")

# 6. Update Center Column to render CesiumGlobe or Leaflet Map
old_center = """      {/* ============================================================ */}
      {/* CENTER COLUMN: Large Interactive Map Canvas (Flex-1)        */}
      {/* ============================================================ */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0' }} />"""

new_center = """      {/* ============================================================ */}
      {/* CENTER COLUMN: Large Interactive Map Canvas (Flex-1)        */}
      {/* ============================================================ */}
      <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
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
            mapViewMode={mapViewMode}
            setMapViewMode={(mode) => {
              setMapViewMode(mode);
              if (mode === '2D' && mapInstanceRef.current) {
                setTimeout(() => mapInstanceRef.current.invalidateSize(), 150);
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
            width: '100%',
            height: '100%',
            display: mapViewMode === '2D' ? 'block' : 'none',
            position: 'relative'
          }}
        >
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', backgroundColor: '#0f172a' }} />

          {/* Floating 2D / 3D Mode Switcher Header */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            border: `1.5px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            borderRadius: '24px',
            padding: '3px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              onClick={() => {
                setMapViewMode('2D');
                if (mapInstanceRef.current) setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MapIcon size={13} /> 2D MAP
            </button>
            <button
              onClick={() => {
                setMapViewMode('3D');
                if (window.__DRAS_CESIUM_VIEWER__ && !window.__DRAS_CESIUM_VIEWER__.isDestroyed()) {
                  window.__DRAS_CESIUM_VIEWER__.resize();
                }
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Globe size={13} /> 3D EARTH
            </button>
          </div>
        </div>"""

if old_center in content:
    content = content.replace(old_center, new_center, 1)
    print("6. Center Column updated to render CesiumGlobe & Leaflet")
else:
    print("6. WARNING: Center Column pattern not matched")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done wiring Cesium into DisasterMap.jsx!")
