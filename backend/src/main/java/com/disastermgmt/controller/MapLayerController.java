package com.disastermgmt.controller;

import com.disastermgmt.dto.GeoJsonFeatureCollection;
import com.disastermgmt.service.MapLayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * MAP LAYER CONTROLLER
 *
 * REST Endpoints returning GeoJSON FeatureCollections for GIS visualization:
 *   GET /api/map/buildings?scenarioId={id}
 *   GET /api/map/roads?scenarioId={id}
 *   GET /api/map/hospitals?scenarioId={id}
 *   GET /api/map/shelters?scenarioId={id}
 *   GET /api/map/damages?scenarioId={id}
 */
@RestController
@RequestMapping("/api/map")
public class MapLayerController {

    @Autowired
    private MapLayerService mapLayerService;

    @GetMapping("/buildings")
    public ResponseEntity<GeoJsonFeatureCollection> getBuildings(@RequestParam Long scenarioId) {
        return ResponseEntity.ok(mapLayerService.getBuildingsGeoJson(scenarioId));
    }

    @GetMapping("/roads")
    public ResponseEntity<GeoJsonFeatureCollection> getRoads(@RequestParam Long scenarioId) {
        return ResponseEntity.ok(mapLayerService.getRoadsGeoJson(scenarioId));
    }

    @GetMapping("/hospitals")
    public ResponseEntity<GeoJsonFeatureCollection> getHospitals(@RequestParam Long scenarioId) {
        return ResponseEntity.ok(mapLayerService.getHospitalsGeoJson(scenarioId));
    }

    @GetMapping("/shelters")
    public ResponseEntity<GeoJsonFeatureCollection> getShelters(@RequestParam Long scenarioId) {
        return ResponseEntity.ok(mapLayerService.getSheltersGeoJson(scenarioId));
    }

    @GetMapping("/damages")
    public ResponseEntity<GeoJsonFeatureCollection> getDamages(@RequestParam Long scenarioId) {
        return ResponseEntity.ok(mapLayerService.getDamageGeoJson(scenarioId));
    }
}
