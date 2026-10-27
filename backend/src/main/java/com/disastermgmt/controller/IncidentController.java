package com.disastermgmt.controller;

import com.disastermgmt.dto.GeoJsonFeature;
import com.disastermgmt.dto.GeoJsonFeatureCollection;
import com.disastermgmt.entity.Incident;
import com.disastermgmt.service.CadDispatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * CAD Incident Management & Civilian SOS Controller
 */
@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "*")
public class IncidentController {

    private final CadDispatchService cadService;

    public IncidentController(CadDispatchService cadService) {
        this.cadService = cadService;
    }

    public static class SosRequestDto {
        private Long scenarioId = 2L;
        private Double lon;
        private Double lat;
        private String callerName;
        private String callerPhone;
        private Integer victimCount = 1;
        private Integer trappedCount = 0;
        private String medicalNotes;
        private String disasterType = "FLOOD";

        public Long getScenarioId() { return scenarioId; }
        public void setScenarioId(Long scenarioId) { this.scenarioId = scenarioId; }
        public Double getLon() { return lon; }
        public void setLon(Double lon) { this.lon = lon; }
        public Double getLat() { return lat; }
        public void setLat(Double lat) { this.lat = lat; }
        public String getCallerName() { return callerName; }
        public void setCallerName(String callerName) { this.callerName = callerName; }
        public String getCallerPhone() { return callerPhone; }
        public void setCallerPhone(String callerPhone) { this.callerPhone = callerPhone; }
        public Integer getVictimCount() { return victimCount; }
        public void setVictimCount(Integer victimCount) { this.victimCount = victimCount; }
        public Integer getTrappedCount() { return trappedCount; }
        public void setTrappedCount(Integer trappedCount) { this.trappedCount = trappedCount; }
        public String getMedicalNotes() { return medicalNotes; }
        public void setMedicalNotes(String medicalNotes) { this.medicalNotes = medicalNotes; }
        public String getDisasterType() { return disasterType; }
        public void setDisasterType(String disasterType) { this.disasterType = disasterType; }
    }

    @GetMapping
    public ResponseEntity<List<Incident>> getIncidents(
            @RequestParam(required = false) Long scenarioId,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(cadService.getIncidents(scenarioId, activeOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Incident> getIncidentById(@PathVariable UUID id) {
        return cadService.getIncidentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/geojson")
    public ResponseEntity<GeoJsonFeatureCollection> getIncidentsGeoJson(
            @RequestParam(required = false) Long scenarioId,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {
        List<Incident> incidents = cadService.getIncidents(scenarioId, activeOnly);
        List<GeoJsonFeature> features = new ArrayList<>();

        for (Incident inc : incidents) {
            if (inc.getLocation() == null) continue;
            Map<String, Object> props = new LinkedHashMap<>();
            props.put("id", inc.getId().toString());
            props.put("code", inc.getCode());
            props.put("title", inc.getTitle());
            props.put("disasterType", inc.getDisasterType());
            props.put("priority", inc.getPriority());
            props.put("status", inc.getStatus());
            props.put("victimCount", inc.getVictimCount());
            props.put("trappedCount", inc.getTrappedCount());
            props.put("addressText", inc.getAddressText());
            props.put("assignedTeamId", inc.getAssignedTeamId());
            props.put("createdAt", inc.getCreatedAt());

            features.add(new GeoJsonFeature(inc.getId(), inc.getLocation(), props));
        }

        return ResponseEntity.ok(new GeoJsonFeatureCollection(features));
    }

    @PostMapping
    public ResponseEntity<Incident> createIncident(@RequestBody Incident incident) {
        return ResponseEntity.ok(cadService.createIncident(incident));
    }

    @PostMapping("/sos")
    public ResponseEntity<Incident> submitSos(@RequestBody SosRequestDto sos) {
        Incident inc = cadService.processCivilianSos(
                sos.getScenarioId(), sos.getLon(), sos.getLat(),
                sos.getCallerName(), sos.getCallerPhone(),
                sos.getVictimCount(), sos.getTrappedCount(),
                sos.getMedicalNotes(), sos.getDisasterType()
        );
        return ResponseEntity.ok(inc);
    }

    @PostMapping("/{id}/dispatch")
    public ResponseEntity<Incident> dispatchUnit(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID unitId) {
        return ResponseEntity.ok(cadService.dispatchUnit(id, unitId));
    }

    @PostMapping("/dispatch-to-zone")
    public ResponseEntity<Incident> dispatchToZone(
            @RequestParam Long scenarioId,
            @RequestParam Long zoneId,
            @RequestParam(required = false) UUID unitId,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(cadService.dispatchToZone(scenarioId, zoneId, unitId, notes));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Incident> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        return ResponseEntity.ok(cadService.updateIncidentStatus(id, status));
    }
}
