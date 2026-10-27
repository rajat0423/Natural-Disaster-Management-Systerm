package com.disastermgmt.controller;

import com.disastermgmt.dto.GeoJsonFeature;
import com.disastermgmt.dto.GeoJsonFeatureCollection;
import com.disastermgmt.entity.ResponseUnit;
import com.disastermgmt.service.CadDispatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Tactical First Responder Fleet Tracking Controller
 */
@RestController
@RequestMapping("/api/units")
@CrossOrigin(origins = "*")
public class ResponseUnitController {

    private final CadDispatchService cadService;

    public ResponseUnitController(CadDispatchService cadService) {
        this.cadService = cadService;
    }

    public static class LocationUpdateDto {
        private Double lon;
        private Double lat;
        private Double heading;
        private Double speedKmh;

        public Double getLon() { return lon; }
        public void setLon(Double lon) { this.lon = lon; }
        public Double getLat() { return lat; }
        public void setLat(Double lat) { this.lat = lat; }
        public Double getHeading() { return heading; }
        public void setHeading(Double heading) { this.heading = heading; }
        public Double getSpeedKmh() { return speedKmh; }
        public void setSpeedKmh(Double speedKmh) { this.speedKmh = speedKmh; }
    }

    @GetMapping
    public ResponseEntity<List<ResponseUnit>> getUnits(
            @RequestParam(required = false) Long scenarioId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String unitType) {
        return ResponseEntity.ok(cadService.getUnits(scenarioId, status, unitType));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseUnit> getUnitById(@PathVariable UUID id) {
        return cadService.getUnitById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/geojson")
    public ResponseEntity<GeoJsonFeatureCollection> getUnitsGeoJson(
            @RequestParam(required = false) Long scenarioId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String unitType) {
        List<ResponseUnit> units = cadService.getUnits(scenarioId, status, unitType);
        List<GeoJsonFeature> features = new ArrayList<>();

        for (ResponseUnit u : units) {
            if (u.getCurrentLocation() == null) continue;
            Map<String, Object> props = new LinkedHashMap<>();
            props.put("id", u.getId().toString());
            props.put("callsign", u.getCallsign());
            props.put("unitType", u.getUnitType());
            props.put("status", u.getStatus());
            props.put("personnelCount", u.getPersonnelCount());
            props.put("heading", u.getHeading());
            props.put("speedKmh", u.getSpeedKmh());
            props.put("activeIncidentId", u.getActiveIncidentId());
            props.put("lastPing", u.getLastPing());

            features.add(new GeoJsonFeature(u.getId(), u.getCurrentLocation(), props));
        }

        return ResponseEntity.ok(new GeoJsonFeatureCollection(features));
    }

    @PutMapping("/{id}/location")
    public ResponseEntity<ResponseUnit> updateLocation(
            @PathVariable UUID id,
            @RequestBody LocationUpdateDto loc) {
        return ResponseEntity.ok(cadService.updateUnitTelemetry(
                id, loc.getLon(), loc.getLat(), loc.getHeading(), loc.getSpeedKmh()
        ));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ResponseUnit> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        return ResponseEntity.ok(cadService.updateUnitStatus(id, status));
    }
}
