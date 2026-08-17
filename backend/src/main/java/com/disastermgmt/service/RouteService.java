package com.disastermgmt.service;

import com.disastermgmt.dto.GeoJsonFeature;
import com.disastermgmt.entity.EvacuationRoute;
import com.disastermgmt.repository.EvacuationRouteRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class RouteService {

    @Autowired
    private EvacuationRouteRepository evacuationRouteRepository;

    @Value("${ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    public Map<String, Object> calculateAndSaveRoute(Long scenarioId, Long priorityId, Double originLon, Double originLat, String destinationType, Boolean avoidBlocked) {
        String url = aiServiceUrl + "/api/routing/route";

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("scenario_id", scenarioId);
        reqBody.put("origin_lon", originLon);
        reqBody.put("origin_lat", originLat);
        reqBody.put("destination_type", destinationType != null ? destinationType : "hospital");
        reqBody.put("avoid_blocked", avoidBlocked != null ? avoidBlocked : true);

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(url, reqBody, Map.class);
            Map<String, Object> body = resp.getBody();

            if (body == null || !Boolean.TRUE.equals(body.get("success"))) {
                throw new RuntimeException("Routing failed: " + (body != null ? body.get("error") : "empty response"));
            }

            Map<String, Object> routeGeoJson = (Map<String, Object>) body.get("route_geojson");
            Map<String, Object> geomMap = (Map<String, Object>) routeGeoJson.get("geometry");
            List<List<Number>> coords = (List<List<Number>>) geomMap.get("coordinates");

            Coordinate[] jtsCoords = new Coordinate[coords.size()];
            for (int i = 0; i < coords.size(); i++) {
                jtsCoords[i] = new Coordinate(coords.get(i).get(0).doubleValue(), coords.get(i).get(1).doubleValue());
            }

            LineString lineString = geometryFactory.createLineString(jtsCoords);
            Map<String, Object> props = (Map<String, Object>) routeGeoJson.get("properties");
            Map<String, Object> dest = (Map<String, Object>) props.get("destination");

            EvacuationRoute entity = new EvacuationRoute();
            entity.setScenarioId(scenarioId);
            entity.setPriorityAssessmentId(priorityId);
            entity.setOriginLon(originLon);
            entity.setOriginLat(originLat);
            entity.setDestinationId(dest.get("id") != null ? Long.parseLong(String.valueOf(dest.get("id"))) : null);
            entity.setDestinationName(String.valueOf(dest.get("name")));
            entity.setDestinationType(String.valueOf(dest.get("type")));
            entity.setDistanceKm(Double.parseDouble(String.valueOf(props.get("distance_km"))));
            entity.setEstimatedMinutes(Double.parseDouble(String.valueOf(props.get("estimated_minutes"))));
            entity.setBlockedRoadsAvoidedCount((Integer) props.get("avoided_blockage_count"));
            entity.setRouteType(String.valueOf(props.get("route_type")));
            entity.setGeometry(lineString);

            EvacuationRoute saved = evacuationRouteRepository.save(entity);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", saved.getId());
            result.put("scenarioId", scenarioId);
            result.put("priorityAssessmentId", priorityId);
            result.put("distanceKm", saved.getDistanceKm());
            result.put("estimatedMinutes", saved.getEstimatedMinutes());
            result.put("destinationName", saved.getDestinationName());
            result.put("destinationType", saved.getDestinationType());
            result.put("routeType", saved.getRouteType());
            result.put("routeGeoJson", routeGeoJson);
            result.put("calculationTimeMs", props.get("calculation_time_ms"));

            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate route via AI service: " + e.getMessage(), e);
        }
    }

    public List<EvacuationRoute> getRoutesByScenario(Long scenarioId) {
        return evacuationRouteRepository.findByScenarioIdOrderByCreatedAtDesc(scenarioId);
    }

    public Optional<EvacuationRoute> getRouteById(Long id) {
        return evacuationRouteRepository.findById(id);
    }

    public Optional<GeoJsonFeature> getRouteGeoJson(Long id) {
        return evacuationRouteRepository.findById(id).map(r -> {
            Map<String, Object> props = new LinkedHashMap<>();
            props.put("id", r.getId());
            props.put("scenarioId", r.getScenarioId());
            props.put("priorityAssessmentId", r.getPriorityAssessmentId());
            props.put("destinationName", r.getDestinationName());
            props.put("destinationType", r.getDestinationType());
            props.put("distanceKm", r.getDistanceKm());
            props.put("estimatedMinutes", r.getEstimatedMinutes());
            props.put("routeType", r.getRouteType());

            return new GeoJsonFeature(r.getId(), r.getGeometry(), props);
        });
    }
}
