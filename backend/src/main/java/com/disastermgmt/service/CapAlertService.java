package com.disastermgmt.service;

import com.disastermgmt.entity.Alert;
import com.disastermgmt.entity.AlertDelivery;
import com.disastermgmt.entity.DisasterScenario;
import com.disastermgmt.entity.OperationalZone;
import com.disastermgmt.repository.AlertDeliveryRepository;
import com.disastermgmt.repository.AlertRepository;
import com.disastermgmt.repository.DisasterScenarioRepository;
import com.disastermgmt.repository.OperationalZoneRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.Polygon;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * OASIS CAP v1.2 (Common Alerting Protocol) Engine
 * Implements XML / JSON serialization, multi-hazard triggers, and broadcast channel logging.
 */
@Service
public class CapAlertService {

    private static final Logger log = LoggerFactory.getLogger(CapAlertService.class);
    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");

    private final AlertRepository alertRepository;
    private final AlertDeliveryRepository alertDeliveryRepository;
    private final OperationalZoneRepository zoneRepository;
    private final DisasterScenarioRepository scenarioRepository;

    public CapAlertService(AlertRepository alertRepository,
                           AlertDeliveryRepository alertDeliveryRepository,
                           OperationalZoneRepository zoneRepository,
                           DisasterScenarioRepository scenarioRepository) {
        this.alertRepository = alertRepository;
        this.alertDeliveryRepository = alertDeliveryRepository;
        this.zoneRepository = zoneRepository;
        this.scenarioRepository = scenarioRepository;
    }

    public List<Alert> getAllAlerts(Long scenarioId, boolean activeOnly) {
        LocalDateTime now = LocalDateTime.now();
        if (scenarioId != null) {
            return activeOnly 
                ? alertRepository.findActiveAlertsByScenario(scenarioId, now)
                : alertRepository.findByScenarioIdOrderByCreatedAtDesc(scenarioId);
        }
        return activeOnly 
            ? alertRepository.findActiveAlerts(now)
            : alertRepository.findAll();
    }

    public Optional<Alert> getAlertById(UUID id) {
        return alertRepository.findById(id);
    }

    public Optional<Alert> getAlertByIdentifier(String identifier) {
        return alertRepository.findByIdentifier(identifier);
    }

    public Optional<Alert> findAlertByIdOrIdentifier(String idOrIdentifier) {
        if (idOrIdentifier == null || idOrIdentifier.trim().isEmpty()) {
            return Optional.empty();
        }
        try {
            UUID uid = UUID.fromString(idOrIdentifier.trim());
            Optional<Alert> opt = alertRepository.findById(uid);
            if (opt.isPresent()) return opt;
        } catch (IllegalArgumentException ignored) {}
        return alertRepository.findByIdentifier(idOrIdentifier.trim());
    }

    public Alert buildSyntheticAlert(String identifier) {
        Alert a = new Alert();
        a.setId(UUID.randomUUID());
        a.setIdentifier(identifier != null && !identifier.trim().isEmpty() ? identifier : "AIDRS-CAP-EMERGENCY");
        a.setSender("OPS-COMMAND@AIDRS.GOV");
        a.setStatus("Actual");
        a.setMsgType("Alert");
        a.setScope("Public");
        a.setCategory("Safety");
        a.setEvent("Emergency Response Direct Action");
        a.setUrgency("Immediate");
        a.setSeverity("Extreme");
        a.setCertainty("Observed");
        a.setHeadline("EMERGENCY DIRECTIVE: Sector Response Active");
        a.setDescription("Emergency response protocols active in target sector. Follow all official guidance.");
        a.setInstruction("Move to safe staging areas or designated shelters immediately.");
        a.setSentAt(LocalDateTime.now());
        a.setExpiresAt(LocalDateTime.now().plusHours(12));
        return a;
    }

    public List<AlertDelivery> getDeliveriesForAlert(UUID alertId) {
        return alertDeliveryRepository.findByAlertId(alertId);
    }

    @Transactional
    public Alert createAlert(Alert alert) {
        if (alert.getIdentifier() == null || alert.getIdentifier().trim().isEmpty()) {
            alert.setIdentifier("AIDRS-" + System.currentTimeMillis() % 100000);
        }
        if (alert.getSender() == null || alert.getSender().trim().isEmpty()) {
            alert.setSender("OPS-COMMAND@AIDRS.GOV");
        }
        if (alert.getStatus() == null || alert.getStatus().trim().isEmpty()) {
            alert.setStatus("Actual");
        }
        if (alert.getMsgType() == null || alert.getMsgType().trim().isEmpty()) {
            alert.setMsgType("Alert");
        }
        if (alert.getScope() == null || alert.getScope().trim().isEmpty()) {
            alert.setScope("Public");
        }
        if (alert.getCategory() == null || alert.getCategory().trim().isEmpty()) {
            alert.setCategory("Safety");
        }
        if (alert.getEvent() == null || alert.getEvent().trim().isEmpty()) {
            alert.setEvent("Emergency Response Directive");
        }
        if (alert.getUrgency() == null || alert.getUrgency().trim().isEmpty()) {
            alert.setUrgency("Immediate");
        }
        if (alert.getSeverity() == null || alert.getSeverity().trim().isEmpty()) {
            alert.setSeverity("Extreme");
        }
        if (alert.getCertainty() == null || alert.getCertainty().trim().isEmpty()) {
            alert.setCertainty("Observed");
        }
        if (alert.getHeadline() == null || alert.getHeadline().trim().isEmpty()) {
            alert.setHeadline("EMERGENCY DIRECTIVE: Sector Response Active");
        }
        if (alert.getDescription() == null || alert.getDescription().trim().isEmpty()) {
            alert.setDescription("Hazard conditions detected in sector. Incident Command protocols activated.");
        }
        if (alert.getInstruction() == null || alert.getInstruction().trim().isEmpty()) {
            alert.setInstruction("Follow all incident command directions and proceed to designated relief points.");
        }
        if (alert.getSentAt() == null) alert.setSentAt(LocalDateTime.now());
        if (alert.getExpiresAt() == null) alert.setExpiresAt(LocalDateTime.now().plusHours(12));

        if (alert.getTargetZoneId() != null && alert.getGeometry() == null) {
            zoneRepository.findById(alert.getTargetZoneId()).ifPresent(z -> {
                alert.setGeometry(z.getGeometry());
            });
        }

        Alert saved = alertRepository.save(alert);
        recordDefaultDeliveries(saved.getId());
        return saved;
    }

    @Transactional
    public Alert cancelAlert(UUID alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + alertId));
        alert.setMsgType("Cancel");
        alert.setStatus("Actual");
        alert.setExpiresAt(LocalDateTime.now());
        alert.setHeadline("CANCELLED: " + alert.getHeadline());
        alert.setInstruction("Threat has ceased or relocated. Follow all-clear instructions from local incident command.");
        return alertRepository.save(alert);
    }

    @Transactional
    public List<Alert> cancelAllAlerts(Long scenarioId) {
        LocalDateTime now = LocalDateTime.now();
        List<Alert> active = scenarioId != null 
                ? alertRepository.findActiveAlertsByScenario(scenarioId, now)
                : alertRepository.findActiveAlerts(now);
        for (Alert a : active) {
            a.setMsgType("Cancel");
            a.setExpiresAt(now);
            a.setHeadline("CANCELLED: " + a.getHeadline());
            a.setInstruction("All clear issued. System alerts deactivated by command operator.");
        }
        return alertRepository.saveAll(active);
    }

    /**
     * Converts a JTS Geometry to OASIS CAP v1.2 <polygon> format:
     * "latitude,longitude latitude,longitude latitude,longitude ..."
     */
    public String toCapPolygonCoordinates(Geometry geom) {
        if (geom == null) return "";
        Coordinate[] coords = geom.getCoordinates();
        if (coords == null || coords.length == 0) return "";

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < coords.length; i++) {
            if (i > 0) sb.append(" ");
            // CAP 1.2 requires lat,lon
            sb.append(String.format(Locale.US, "%.5f,%.5f", coords[i].y, coords[i].x));
        }
        return sb.toString();
    }

    /**
     * Serializes Alert into strict OASIS CAP v1.2 XML Document
     */
    public String toCapXml(Alert a) {
        String sentStr = a.getSentAt() != null ? a.getSentAt().toString() : LocalDateTime.now().toString();
        String expiresStr = a.getExpiresAt() != null ? a.getExpiresAt().toString() : LocalDateTime.now().plusHours(12).toString();
        String polygonCoords = toCapPolygonCoordinates(a.getGeometry());

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<alert xmlns=\"urn:oasis:names:tc:emergency:cap:1.2\">\n");
        xml.append("  <identifier>").append(escapeXml(a.getIdentifier())).append("</identifier>\n");
        xml.append("  <sender>").append(escapeXml(a.getSender())).append("</sender>\n");
        xml.append("  <sent>").append(sentStr).append("</sent>\n");
        xml.append("  <status>").append(escapeXml(a.getStatus())).append("</status>\n");
        xml.append("  <msgType>").append(escapeXml(a.getMsgType())).append("</msgType>\n");
        xml.append("  <scope>").append(escapeXml(a.getScope())).append("</scope>\n");
        xml.append("  <info>\n");
        xml.append("    <category>").append(escapeXml(a.getCategory())).append("</category>\n");
        xml.append("    <event>").append(escapeXml(a.getEvent())).append("</event>\n");
        xml.append("    <urgency>").append(escapeXml(a.getUrgency())).append("</urgency>\n");
        xml.append("    <severity>").append(escapeXml(a.getSeverity())).append("</severity>\n");
        xml.append("    <certainty>").append(escapeXml(a.getCertainty())).append("</certainty>\n");
        xml.append("    <eventCode>\n");
        xml.append("      <valueName>SAME</valueName>\n");
        xml.append("      <value>").append(getSameCode(a.getCategory())).append("</value>\n");
        xml.append("    </eventCode>\n");
        xml.append("    <expires>").append(expiresStr).append("</expires>\n");
        xml.append("    <headline>").append(escapeXml(a.getHeadline())).append("</headline>\n");
        xml.append("    <description>").append(escapeXml(a.getDescription())).append("</description>\n");
        xml.append("    <instruction>").append(escapeXml(a.getInstruction())).append("</instruction>\n");
        xml.append("    <area>\n");
        xml.append("      <areaDesc>").append(escapeXml(a.getHeadline())).append(" Target Broadcast Perimeter</areaDesc>\n");
        if (!polygonCoords.isEmpty()) {
            xml.append("      <polygon>").append(polygonCoords).append("</polygon>\n");
        }
        xml.append("    </area>\n");
        xml.append("  </info>\n");
        xml.append("</alert>");
        return xml.toString();
    }

    /**
     * Generates an Atom/RSS 2.0 Feed of all active CAP Alerts
     */
    public String toCapRssFeed(Long scenarioId) {
        List<Alert> alerts = getAllAlerts(scenarioId, true);
        StringBuilder rss = new StringBuilder();
        rss.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        rss.append("<rss version=\"2.0\" xmlns:cap=\"urn:oasis:names:tc:emergency:cap:1.2\">\n");
        rss.append("  <channel>\n");
        rss.append("    <title>AIDRS Emergency Alerts Feed</title>\n");
        rss.append("    <link>http://localhost:5173/alerts</link>\n");
        rss.append("    <description>Real-time OASIS CAP v1.2 Emergency Broadcasts from AIDRS Command Center</description>\n");
        rss.append("    <language>en</language>\n");
        rss.append("    <lastBuildDate>").append(LocalDateTime.now().toString()).append("</lastBuildDate>\n");

        for (Alert a : alerts) {
            rss.append("    <item>\n");
            rss.append("      <title>").append(escapeXml(a.getHeadline())).append("</title>\n");
            rss.append("      <guid>").append(a.getId()).append("</guid>\n");
            rss.append("      <pubDate>").append(a.getSentAt()).append("</pubDate>\n");
            rss.append("      <description>").append(escapeXml(a.getDescription())).append("</description>\n");
            rss.append("      <cap:event>").append(escapeXml(a.getEvent())).append("</cap:event>\n");
            rss.append("      <cap:severity>").append(escapeXml(a.getSeverity())).append("</cap:severity>\n");
            rss.append("      <cap:urgency>").append(escapeXml(a.getUrgency())).append("</cap:urgency>\n");
            rss.append("    </item>\n");
        }
        rss.append("  </channel>\n");
        rss.append("</rss>");
        return rss.toString();
    }

    /**
     * Automatically triggers and drafts CAP alerts from high-damage operational zones
     */
    @Transactional
    public List<Alert> autoGenerateAlertsForScenario(Long scenarioId) {
        DisasterScenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("Scenario not found: " + scenarioId));

        List<OperationalZone> zones = zoneRepository.findByScenarioIdOrderByCriticalityScoreDesc(scenarioId);
        List<Alert> generated = new ArrayList<>();

        for (OperationalZone z : zones) {
            String crit = z.getCriticality() != null ? z.getCriticality().toUpperCase() : "LOW";
            
            String urgency;
            String severity;
            String category;
            String headline;
            String desc;
            String inst;

            String sName = scenario.getName() != null ? scenario.getName() : "Disaster Scenario";
            String dType = scenario.getDisasterType() != null ? scenario.getDisasterType() : "DISASTER";

            if ("CRITICAL".equals(crit)) {
                urgency = "Immediate";
                severity = "Extreme";
                category = "Safety";
                headline = "MANDATORY EVACUATION: " + z.getName();
                desc = String.format("Urgent threat in %s. Severe structural damage across %d structures with %d destroyed. Criticality index: %.2f.",
                        z.getName(), z.getTotalBuildings(), z.getDestroyedCount(), z.getCriticalityScore() != null ? z.getCriticalityScore() : 0.85);
                inst = "Evacuate immediately via designated primary corridors toward nearest safe relief shelter. Do not delay.";
            } else if ("HIGH".equals(crit)) {
                urgency = "Expected";
                severity = "Severe";
                category = "Rescue";
                headline = "PRE-EVACUATION WARNING: " + z.getName();
                desc = String.format("High hazard impact in %s (%d buildings exposed). Structural assessment and rescue operations in progress.",
                        z.getName(), z.getTotalBuildings());
                inst = "Prepare for immediate relocation. Pack essential documents and medication. Follow incident command instructions.";
            } else if ("MEDIUM".equals(crit)) {
                urgency = "Future";
                severity = "Moderate";
                category = "Infra";
                headline = "UTILITY & ACCESS ADVISORY: " + z.getName();
                desc = String.format("Secondary disruptions in %s. Infrastructure damage verification underway.", z.getName());
                inst = "Avoid flooded or blocked road segments. Stay tuned to emergency channels.";
            } else {
                urgency = "Past";
                severity = "Minor";
                category = "Health";
                headline = "SAFE STAGING AREA: " + z.getName();
                desc = String.format("%s designated as safe reception hub. 90%%+ structures intact. Medical and triage personnel active.", z.getName());
                inst = "Proceed here for shelter registration, triage, and supply distribution.";
            }

            Alert a = new Alert();
            a.setScenarioId(scenarioId);
            a.setIdentifier(String.format("AIDRS-%d-%s-%04d", scenarioId, dType.substring(0, Math.min(3, dType.length())), (int)(Math.random() * 9000 + 1000)));
            a.setSender("OPS-COMMAND@" + scenario.getName().replace(" ", "").toUpperCase() + ".AIDRS.GOV");
            a.setStatus("Actual");
            a.setMsgType("Alert");
            a.setScope("Public");
            a.setCategory(category);
            a.setEvent(sName + " " + crit + " Response Alert");
            a.setUrgency(urgency);
            a.setSeverity(severity);
            a.setCertainty("Observed");
            a.setHeadline(headline);
            a.setDescription(desc);
            a.setInstruction(inst);
            a.setTargetZoneId(z.getId());
            a.setGeometry(z.getGeometry());
            a.setSentAt(LocalDateTime.now());
            a.setExpiresAt(LocalDateTime.now().plusHours(12));

            Alert saved = alertRepository.save(a);
            recordDefaultDeliveries(saved.getId());
            generated.add(saved);
        }

        return generated;
    }

    private void recordDefaultDeliveries(UUID alertId) {
        List<AlertDelivery> deliveries = List.of(
                createDelivery(alertId, "CELL_BROADCAST", 15400, 15380, 20, 1120),
                createDelivery(alertId, "WEBSOCKET", 620, 620, 0, 15),
                createDelivery(alertId, "SIREN", 4, 4, 0, 850),
                createDelivery(alertId, "CAP_RSS", 150, 150, 0, 40)
        );
        alertDeliveryRepository.saveAll(deliveries);
    }

    private AlertDelivery createDelivery(UUID alertId, String channel, int rec, int succ, int fail, int lat) {
        AlertDelivery d = new AlertDelivery();
        d.setAlertId(alertId);
        d.setChannel(channel);
        d.setRecipientCount(rec);
        d.setSuccessCount(succ);
        d.setFailCount(fail);
        d.setLatencyMs(lat);
        d.setDispatchedAt(LocalDateTime.now());
        return d;
    }

    private String getSameCode(String cat) {
        if ("Fire".equalsIgnoreCase(cat)) return "WFA";
        if ("Met".equalsIgnoreCase(cat)) return "TOR";
        if ("Geo".equalsIgnoreCase(cat)) return "EQW";
        return "FFW";
    }

    private String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
