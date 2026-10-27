package com.disastermgmt.service;

import com.disastermgmt.entity.Incident;
import com.disastermgmt.entity.OperationalZone;
import com.disastermgmt.entity.ResponseUnit;
import com.disastermgmt.repository.IncidentRepository;
import com.disastermgmt.repository.OperationalZoneRepository;
import com.disastermgmt.repository.ResponseUnitRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * CAD (Computer-Aided Dispatch) & First Responder Management Service
 * Implements FEMA ICS-200/300 resource matching, automated dispatch, and incident lifecycle.
 */
@Service
public class CadDispatchService {

    private static final Logger log = LoggerFactory.getLogger(CadDispatchService.class);
    private static final GeometryFactory GF = new GeometryFactory(new PrecisionModel(), 4326);

    private final IncidentRepository incidentRepository;
    private final ResponseUnitRepository unitRepository;
    private final OperationalZoneRepository zoneRepository;

    public CadDispatchService(IncidentRepository incidentRepository, 
                              ResponseUnitRepository unitRepository,
                              OperationalZoneRepository zoneRepository) {
        this.incidentRepository = incidentRepository;
        this.unitRepository = unitRepository;
        this.zoneRepository = zoneRepository;
    }

    public List<Incident> getIncidents(Long scenarioId, boolean activeOnly) {
        if (scenarioId != null) {
            return activeOnly
                    ? incidentRepository.findActiveIncidentsByScenario(scenarioId)
                    : incidentRepository.findByScenarioIdOrderByCreatedAtDesc(scenarioId);
        }
        return activeOnly
                ? incidentRepository.findAllActiveIncidents()
                : incidentRepository.findAll();
    }

    public Optional<Incident> getIncidentById(UUID id) {
        return incidentRepository.findById(id);
    }

    public List<ResponseUnit> getUnits(Long scenarioId, String status, String unitType) {
        if (scenarioId != null) {
            if (status != null && !status.isEmpty()) {
                return unitRepository.findByScenarioIdAndStatus(scenarioId, status);
            }
            if (unitType != null && !unitType.isEmpty()) {
                return unitRepository.findByScenarioIdAndUnitType(scenarioId, unitType);
            }
            return unitRepository.findByScenarioId(scenarioId);
        }
        return unitRepository.findAll();
    }

    public Optional<ResponseUnit> getUnitById(UUID id) {
        return unitRepository.findById(id);
    }

    @Transactional
    public Incident createIncident(Incident inc) {
        if (inc.getCode() == null || inc.getCode().trim().isEmpty()) {
            inc.setCode(String.format("INC-%d-%04d", LocalDateTime.now().getYear(), (int)(Math.random() * 9000 + 1000)));
        }
        if (inc.getStatus() == null) inc.setStatus("REPORTED");
        
        // Compute Priority
        if (inc.getPriority() == null || inc.getPriority().isEmpty()) {
            inc.setPriority(calculateIncidentPriority(inc));
        }

        return incidentRepository.save(inc);
    }

    /**
     * Civilian One-Tap SOS Submission
     */
    @Transactional
    public Incident processCivilianSos(Long scenarioId, Double lon, Double lat, String callerName, 
                                       String phone, Integer victims, Integer trapped, 
                                       String medicalNotes, String disasterType) {
        Incident inc = new Incident();
        inc.setScenarioId(scenarioId != null ? scenarioId : 2L);
        inc.setCode(String.format("SOS-%d-%04d", LocalDateTime.now().getYear(), (int)(Math.random() * 9000 + 1000)));
        inc.setTitle("CIVILIAN SOS: " + (callerName != null && !callerName.isEmpty() ? callerName : "Anonymous Request"));
        inc.setDisasterType(disasterType != null && !disasterType.isEmpty() ? disasterType : "FLOOD");
        inc.setStatus("REPORTED");
        inc.setReportedBy(callerName != null ? callerName : "Civilian Mobile PWA");
        inc.setCallerPhone(phone != null ? phone : "N/A");
        inc.setVictimCount(victims != null ? victims : 1);
        inc.setTrappedCount(trapped != null ? trapped : 0);

        List<String> hazards = new ArrayList<>();
        if (trapped != null && trapped > 0) hazards.add("STRUCTURAL_ENTRAPMENT");
        if (medicalNotes != null && !medicalNotes.isEmpty()) hazards.add("MEDICAL_ASSISTANCE_URGENT");
        inc.setHazardsPresent(String.join(",", hazards));
        inc.setAddressText(medicalNotes != null && !medicalNotes.isEmpty() ? medicalNotes : "GPS Geolocation Broadcast");

        if (lon != null && lat != null) {
            inc.setLocation(GF.createPoint(new Coordinate(lon, lat)));
        } else {
            // Default center fallback
            inc.setLocation(GF.createPoint(new Coordinate(79.70, 30.48)));
        }

        inc.setPriority(calculateIncidentPriority(inc));
        Incident saved = incidentRepository.save(inc);

        // Attempt automated dispatch if critical
        if ("P1_CRITICAL".equals(saved.getPriority())) {
            try {
                autoDispatchNearestUnit(saved.getId());
            } catch (Exception e) {
                log.warn("Auto-dispatch deferred for SOS #{}: {}", saved.getCode(), e.getMessage());
            }
        }

        return saved;
    }

    /**
     * Dispatches a specific response unit, or automatically finds the nearest available unit
     */
    @Transactional
    public Incident dispatchUnit(UUID incidentId, UUID unitId) {
        Incident inc = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + incidentId));

        ResponseUnit unit;
        if (unitId != null) {
            unit = unitRepository.findById(unitId)
                    .orElseThrow(() -> new IllegalArgumentException("Response unit not found: " + unitId));
        } else {
            unit = findNearestAvailableUnit(inc)
                    .orElseThrow(() -> new IllegalStateException("No available response units for scenario " + inc.getScenarioId()));
        }

        inc.setAssignedTeamId(unit.getId());
        inc.setStatus("DISPATCHED");
        inc.setDispatchedAt(LocalDateTime.now());

        unit.setStatus("DISPATCHED");
        unit.setActiveIncidentId(inc.getId());

        unitRepository.save(unit);
        return incidentRepository.save(inc);
    }

    /**
     * Automatically dispatches nearest matching unit
     */
    @Transactional
    public Incident autoDispatchNearestUnit(UUID incidentId) {
        return dispatchUnit(incidentId, null);
    }

    /**
     * Dispatches a specific response unit directly to an operational zone centroid
     */
    @Transactional
    public Incident dispatchToZone(Long scenarioId, Long zoneId, UUID unitId, String notes) {
        OperationalZone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new IllegalArgumentException("Operational zone not found: " + zoneId));

        Point targetPoint = null;
        if (zone.getGeometry() != null) {
            targetPoint = zone.getGeometry().getCentroid();
        }
        if (targetPoint == null) {
            targetPoint = GF.createPoint(new Coordinate(79.70, 30.48));
        }

        Incident inc = new Incident();
        inc.setScenarioId(scenarioId != null ? scenarioId : zone.getScenarioId());
        inc.setCode(String.format("DSP-%d-%04d", LocalDateTime.now().getYear(), (int)(Math.random() * 9000 + 1000)));
        inc.setTitle("TACTICAL DISPATCH: " + zone.getName());
        inc.setDisasterType("DISPATCH");
        inc.setStatus("DISPATCHED");
        inc.setPriority("CRITICAL".equalsIgnoreCase(zone.getCriticality()) ? "P1_CRITICAL" : "P2_HIGH");
        inc.setReportedBy("AIDRS Tactical Dispatch Console");
        inc.setAddressText(notes != null && !notes.trim().isEmpty() ? notes : "Direct CAD Response Deployment to " + zone.getName());
        inc.setLocation(targetPoint);
        inc.setVictimCount(zone.getTotalBuildings() != null ? zone.getTotalBuildings() : 1);
        inc.setTrappedCount(zone.getDestroyedCount() != null ? zone.getDestroyedCount() : 0);

        ResponseUnit unit;
        if (unitId != null) {
            unit = unitRepository.findById(unitId)
                    .orElseThrow(() -> new IllegalArgumentException("Response unit not found: " + unitId));
        } else {
            unit = findNearestAvailableUnit(inc)
                    .orElseThrow(() -> new IllegalStateException("No available response units for scenario " + scenarioId));
        }

        inc.setAssignedTeamId(unit.getId());
        inc.setDispatchedAt(LocalDateTime.now());
        Incident saved = incidentRepository.save(inc);

        unit.setStatus("DISPATCHED");
        unit.setActiveIncidentId(saved.getId());
        unitRepository.save(unit);

        return saved;
    }

    /**
     * Updates incident status along the ICS lifecycle
     */
    @Transactional
    public Incident updateIncidentStatus(UUID incidentId, String status) {
        Incident inc = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + incidentId));

        inc.setStatus(status);
        LocalDateTime now = LocalDateTime.now();

        if ("ON_SCENE".equalsIgnoreCase(status)) {
            inc.setArrivedAt(now);
            if (inc.getAssignedTeamId() != null) {
                unitRepository.findById(inc.getAssignedTeamId()).ifPresent(u -> {
                    u.setStatus("ON_SCENE");
                    unitRepository.save(u);
                });
            }
        } else if ("CLOSED".equalsIgnoreCase(status) || "CONTAINED".equalsIgnoreCase(status)) {
            inc.setResolvedAt(now);
            // Release assigned response unit back to AVAILABLE
            if (inc.getAssignedTeamId() != null) {
                unitRepository.findById(inc.getAssignedTeamId()).ifPresent(u -> {
                    u.setStatus("AVAILABLE");
                    u.setActiveIncidentId(null);
                    unitRepository.save(u);
                });
            }
        }

        return incidentRepository.save(inc);
    }

    @Transactional
    public ResponseUnit updateUnitTelemetry(UUID unitId, Double lon, Double lat, Double heading, Double speedKmh) {
        ResponseUnit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> new IllegalArgumentException("Unit not found: " + unitId));

        if (lon != null && lat != null) {
            unit.setCurrentLocation(GF.createPoint(new Coordinate(lon, lat)));
        }
        if (heading != null) unit.setHeading(heading);
        if (speedKmh != null) unit.setSpeedKmh(speedKmh);
        unit.setLastPing(LocalDateTime.now());

        return unitRepository.save(unit);
    }

    @Transactional
    public ResponseUnit updateUnitStatus(UUID unitId, String status) {
        ResponseUnit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> new IllegalArgumentException("Unit not found: " + unitId));
        unit.setStatus(status);
        if ("AVAILABLE".equalsIgnoreCase(status)) {
            unit.setActiveIncidentId(null);
        }
        return unitRepository.save(unit);
    }

    private Optional<ResponseUnit> findNearestAvailableUnit(Incident inc) {
        List<ResponseUnit> available = unitRepository.findAvailableUnitsByScenario(inc.getScenarioId());
        if (available.isEmpty()) {
            List<ResponseUnit> all = unitRepository.findByScenarioId(inc.getScenarioId());
            if (!all.isEmpty()) {
                return Optional.of(all.get(0));
            }
            return Optional.empty();
        }

        // If trapped casualties, prefer USAR or Medical
        String preferredType = (inc.getTrappedCount() != null && inc.getTrappedCount() > 0) ? "USAR" : "MEDICAL";
        if ("FIRE".equalsIgnoreCase(inc.getDisasterType())) preferredType = "FIRE";

        final String finalPref = preferredType;
        available.sort((u1, u2) -> {
            boolean p1 = finalPref.equalsIgnoreCase(u1.getUnitType());
            boolean p2 = finalPref.equalsIgnoreCase(u2.getUnitType());
            if (p1 && !p2) return -1;
            if (p2 && !p1) return 1;

            // Sort by Euclidean distance to incident location
            double d1 = calculateDistance(u1.getCurrentLocation(), inc.getLocation());
            double d2 = calculateDistance(u2.getCurrentLocation(), inc.getLocation());
            return Double.compare(d1, d2);
        });

        return Optional.of(available.get(0));
    }

    private double calculateDistance(Point p1, Point p2) {
        if (p1 == null || p2 == null) return Double.MAX_VALUE;
        double dx = p1.getX() - p2.getX();
        double dy = p1.getY() - p2.getY();
        return Math.sqrt(dx * dx + dy * dy);
    }

    private String calculateIncidentPriority(Incident inc) {
        int trapped = inc.getTrappedCount() != null ? inc.getTrappedCount() : 0;
        int victims = inc.getVictimCount() != null ? inc.getVictimCount() : 0;

        if (trapped > 0 || victims >= 5) {
            return "P1_CRITICAL";
        } else if (victims > 0 || (inc.getHazardsPresent() != null && !inc.getHazardsPresent().isEmpty())) {
            return "P2_HIGH";
        } else {
            return "P3_MEDIUM";
        }
    }
}
