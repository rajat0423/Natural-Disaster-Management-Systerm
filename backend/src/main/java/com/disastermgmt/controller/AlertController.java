package com.disastermgmt.controller;

import com.disastermgmt.dto.GeoJsonFeature;
import com.disastermgmt.dto.GeoJsonFeatureCollection;
import com.disastermgmt.entity.Alert;
import com.disastermgmt.entity.AlertDelivery;
import com.disastermgmt.service.CapAlertService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * OASIS CAP v1.2 Alert Controller
 * REST endpoints for alert broadcasting, CAP XML/JSON export, RSS feed, and automated scenario triggers.
 */
@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    private final CapAlertService alertService;

    public AlertController(CapAlertService alertService) {
        this.alertService = alertService;
    }

    /**
     * List alerts with optional scenarioId and activeOnly filters
     */
    @GetMapping
    public ResponseEntity<List<Alert>> getAlerts(
            @RequestParam(required = false) Long scenarioId,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(alertService.getAllAlerts(scenarioId, activeOnly));
    }

    /**
     * Get single alert details
     */
    @GetMapping("/{id}")
    public ResponseEntity<Alert> getAlertById(@PathVariable String id) {
        return alertService.findAlertByIdOrIdentifier(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Export Alert as official OASIS CAP v1.2 XML Document
     */
    @GetMapping(value = "/{id}/cap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getCapXml(@PathVariable String id) {
        Alert alert = alertService.findAlertByIdOrIdentifier(id)
                .orElseGet(() -> alertService.buildSyntheticAlert(id));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"CAP-" + alert.getIdentifier() + ".xml\"")
                .body(alertService.toCapXml(alert));
    }

    /**
     * Export Alert as CAP JSON
     */
    @GetMapping(value = "/{id}/cap.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getCapJson(@PathVariable String id) {
        Alert alert = alertService.findAlertByIdOrIdentifier(id)
                .orElseGet(() -> alertService.buildSyntheticAlert(id));

        Map<String, Object> cap = new LinkedHashMap<>();
        cap.put("identifier", alert.getIdentifier());
        cap.put("sender", alert.getSender());
        cap.put("sent", alert.getSentAt());
        cap.put("status", alert.getStatus());
        cap.put("msgType", alert.getMsgType());
        cap.put("scope", alert.getScope());
        
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("category", alert.getCategory());
        info.put("event", alert.getEvent());
        info.put("urgency", alert.getUrgency());
        info.put("severity", alert.getSeverity());
        info.put("certainty", alert.getCertainty());
        info.put("headline", alert.getHeadline());
        info.put("description", alert.getDescription());
        info.put("instruction", alert.getInstruction());
        info.put("expires", alert.getExpiresAt());
        info.put("polygon", alertService.toCapPolygonCoordinates(alert.getGeometry()));
        
        cap.put("info", info);
        return ResponseEntity.ok(cap);
    }

    /**
     * Public Atom / RSS 2.0 CAP feed
     */
    @GetMapping(value = "/rss", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getCapRssFeed(@RequestParam(required = false) Long scenarioId) {
        return ResponseEntity.ok(alertService.toCapRssFeed(scenarioId));
    }

    /**
     * GeoJSON FeatureCollection of alerts for direct rendering in 2D Leaflet and 3D Cesium
     */
    @GetMapping("/geojson")
    public ResponseEntity<GeoJsonFeatureCollection> getAlertsGeoJson(
            @RequestParam(required = false) Long scenarioId,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {
        List<Alert> alerts = alertService.getAllAlerts(scenarioId, activeOnly);
        List<GeoJsonFeature> features = new ArrayList<>();

        for (Alert a : alerts) {
            if (a.getGeometry() == null) continue;
            Map<String, Object> props = new LinkedHashMap<>();
            props.put("id", a.getId().toString());
            props.put("identifier", a.getIdentifier());
            props.put("headline", a.getHeadline());
            props.put("event", a.getEvent());
            props.put("category", a.getCategory());
            props.put("urgency", a.getUrgency());
            props.put("severity", a.getSeverity());
            props.put("certainty", a.getCertainty());
            props.put("description", a.getDescription());
            props.put("instruction", a.getInstruction());
            props.put("scenarioId", a.getScenarioId());
            props.put("targetZoneId", a.getTargetZoneId());
            props.put("expiresAt", a.getExpiresAt());

            features.add(new GeoJsonFeature(a.getId(), a.getGeometry(), props));
        }

        return ResponseEntity.ok(new GeoJsonFeatureCollection(features));
    }

    /**
     * Create / Broadcast a new CAP Alert
     */
    @PostMapping
    public ResponseEntity<Alert> createAlert(@RequestBody Alert alert) {
        Alert created = alertService.createAlert(alert);
        return ResponseEntity.ok(created);
    }

    /**
     * Automated Trigger Hub: Auto-generate CAP alerts for high-damage scenario zones
     */
    @PostMapping("/auto-generate")
    public ResponseEntity<Map<String, Object>> autoGenerateAlerts(@RequestParam Long scenarioId) {
        List<Alert> generated = alertService.autoGenerateAlertsForScenario(scenarioId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("scenarioId", scenarioId);
        res.put("alertsGeneratedCount", generated.size());
        res.put("alerts", generated);
        res.put("message", "Generated " + generated.size() + " CAP v1.2 alerts from operational damage zones.");
        return ResponseEntity.ok(res);
    }

    /**
     * Cancel / Expire an active alert
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<Alert> cancelAlert(@PathVariable UUID id) {
        return ResponseEntity.ok(alertService.cancelAlert(id));
    }

    /**
     * Master Switch: Turn off and cancel all active alerts for scenario
     */
    @PostMapping("/cancel-all")
    public ResponseEntity<Map<String, Object>> cancelAllAlerts(@RequestParam(required = false) Long scenarioId) {
        List<Alert> cancelled = alertService.cancelAllAlerts(scenarioId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("cancelledCount", cancelled.size());
        res.put("message", "All active alerts have been deactivated and silenced.");
        return ResponseEntity.ok(res);
    }

    /**
     * Get multi-channel delivery metrics for an alert
     */
    @GetMapping("/{id}/deliveries")
    public ResponseEntity<List<AlertDelivery>> getDeliveries(@PathVariable String id) {
        try {
            UUID uid = UUID.fromString(id);
            return ResponseEntity.ok(alertService.getDeliveriesForAlert(uid));
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
}
