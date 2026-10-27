import * as Cesium from 'cesium';

/**
 * DRAS v2.0 — Cesium Layer & Environment Service
 * Handles base map switching, terrain loading, day/night lighting, and layer visibility.
 */

export const BASEMAP_PROVIDERS = {
  SATELLITE: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxLevel: 19,
    credit: 'Esri World Imagery'
  },
  STANDARD: {
    name: 'Standard (OSM)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxLevel: 19,
    credit: '© OpenStreetMap contributors'
  },
  DARK: {
    name: 'Dark Matter',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maxLevel: 19,
    credit: '© CartoDB Dark Matter'
  }
};

let currentBaseLayer = null;

export const layerService = {
  /**
   * Switches base imagery layer between Satellite, Standard, and Dark
   */
  setBaseMap: (viewer, baseMapType = 'SATELLITE') => {
    if (!viewer || !viewer.imageryLayers) return;

    const config = BASEMAP_PROVIDERS[baseMapType] || BASEMAP_PROVIDERS.SATELLITE;
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: config.url,
      maximumLevel: config.maxLevel,
      credit: config.credit
    });

    try {
      if (currentBaseLayer) {
        viewer.imageryLayers.remove(currentBaseLayer, true);
      }
      currentBaseLayer = viewer.imageryLayers.addImageryProvider(provider, 0);
    } catch (e) {
      console.warn('Failed to switch base map provider, maintaining fallback', e);
    }
  },

  /**
   * Toggles 3D terrain support. Gracefully falls back to WGS84 Ellipsoid if ion token is absent.
   */
  setTerrain: async (viewer, enableTerrain = true, ionToken = '') => {
    if (!viewer) return { active: false, type: 'ellipsoid' };

    if (!enableTerrain) {
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      return { active: false, type: 'ellipsoid' };
    }

    if (ionToken && ionToken.trim().length > 10) {
      try {
        Cesium.Ion.defaultAccessToken = ionToken.trim();
        const terrain = await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true
        });
        viewer.terrainProvider = terrain;
        return { active: true, type: 'cesium_world_terrain' };
      } catch (err) {
        console.warn('Cesium World Terrain unavailable with provided token, using WGS84 Ellipsoid', err);
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        return { active: false, type: 'ellipsoid_fallback' };
      }
    } else {
      // Free default: standard WGS84 Ellipsoid terrain
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      return { active: false, type: 'ellipsoid' };
    }
  },

  /**
   * Configures Earth solar lighting (Day / Night / Automatic)
   */
  setEarthLighting: (viewer, lightingMode = 'DAY') => {
    if (!viewer || !viewer.scene || !viewer.scene.globe) return;

    const globe = viewer.scene.globe;

    if (lightingMode === 'DAY') {
      globe.enableLighting = false;
    } else if (lightingMode === 'NIGHT') {
      globe.enableLighting = true;
      // Set clock to night-time illumination
      const nightUtc = Cesium.JulianDate.fromDate(new Date('2026-09-20T00:00:00Z'));
      viewer.clock.currentTime = nightUtc;
      viewer.clock.shouldAnimate = false;
    } else if (lightingMode === 'AUTO') {
      globe.enableLighting = true;
      viewer.clock.currentTime = Cesium.JulianDate.now();
      viewer.clock.shouldAnimate = true;
    }
  }
};
