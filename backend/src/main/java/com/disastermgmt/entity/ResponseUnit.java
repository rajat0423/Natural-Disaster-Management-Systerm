package com.disastermgmt.entity;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tactical First Responder Unit (USAR, Medical, Fire, Police, Hazmat, Air Evac)
 */
@Entity
@Table(name = "response_units")
public class ResponseUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true, length = 60)
    private String callsign;

    @Column(name = "unit_type", nullable = false, length = 40)
    private String unitType; // USAR, MEDICAL, FIRE, POLICE, HAZMAT, AIR_EVAC

    @Column(nullable = false, length = 30)
    private String status; // AVAILABLE, DISPATCHED, ON_SCENE, EN_ROUTE_HOSPITAL, OUT_OF_SERVICE

    @Column(name = "personnel_count", nullable = false)
    private Integer personnelCount = 1;

    @Column(name = "equipment_manifest", columnDefinition = "TEXT")
    private String equipmentManifest;

    @Column(name = "current_location", columnDefinition = "geometry(Point, 4326)")
    private Point currentLocation;

    private Double heading = 0.0;

    @Column(name = "speed_kmh")
    private Double speedKmh = 0.0;

    @Column(name = "active_incident_id")
    private UUID activeIncidentId;

    @Column(name = "scenario_id")
    private Long scenarioId;

    @Column(name = "last_ping")
    private LocalDateTime lastPing;

    public ResponseUnit() {}

    @PrePersist
    protected void onCreate() {
        if (this.lastPing == null) this.lastPing = LocalDateTime.now();
        if (this.status == null) this.status = "AVAILABLE";
        if (this.heading == null) this.heading = 0.0;
        if (this.speedKmh == null) this.speedKmh = 0.0;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCallsign() { return callsign; }
    public void setCallsign(String callsign) { this.callsign = callsign; }

    public String getUnitType() { return unitType; }
    public void setUnitType(String unitType) { this.unitType = unitType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getPersonnelCount() { return personnelCount; }
    public void setPersonnelCount(Integer personnelCount) { this.personnelCount = personnelCount; }

    public String getEquipmentManifest() { return equipmentManifest; }
    public void setEquipmentManifest(String equipmentManifest) { this.equipmentManifest = equipmentManifest; }

    public Point getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(Point currentLocation) { this.currentLocation = currentLocation; }

    public Double getHeading() { return heading; }
    public void setHeading(Double heading) { this.heading = heading; }

    public Double getSpeedKmh() { return speedKmh; }
    public void setSpeedKmh(Double speedKmh) { this.speedKmh = speedKmh; }

    public UUID getActiveIncidentId() { return activeIncidentId; }
    public void setActiveIncidentId(UUID activeIncidentId) { this.activeIncidentId = activeIncidentId; }

    public Long getScenarioId() { return scenarioId; }
    public void setScenarioId(Long scenarioId) { this.scenarioId = scenarioId; }

    public LocalDateTime getLastPing() { return lastPing; }
    public void setLastPing(LocalDateTime lastPing) { this.lastPing = lastPing; }
}
