package com.disastermgmt.dto;

import org.locationtech.jts.geom.Geometry;

import java.util.LinkedHashMap;
import java.util.Map;

public class GeoJsonFeature {
    private String type = "Feature";
    private Object id;
    private Geometry geometry;
    private Map<String, Object> properties = new LinkedHashMap<>();

    public GeoJsonFeature() {}

    public GeoJsonFeature(Object id, Geometry geometry, Map<String, Object> properties) {
        this.type = "Feature";
        this.id = id;
        this.geometry = geometry;
        this.properties = properties != null ? properties : new LinkedHashMap<>();
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Object getId() { return id; }
    public void setId(Object id) { this.id = id; }

    public Geometry getGeometry() { return geometry; }
    public void setGeometry(Geometry geometry) { this.geometry = geometry; }

    public Map<String, Object> getProperties() { return properties; }
    public void setProperties(Map<String, Object> properties) { this.properties = properties; }
}
