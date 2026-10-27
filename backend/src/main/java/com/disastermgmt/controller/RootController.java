package com.disastermgmt.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * ROOT & API CONTROLLER
 * Provides system info and redirects users to the React frontend UI on port 5173.
 */
@RestController
@CrossOrigin(origins = "*")
public class RootController {

    @GetMapping({"/", "/api"})
    public ResponseEntity<Map<String, Object>> getApiRoot() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("service", "AIDRS Microservices Backend API");
        info.put("status", "ONLINE");
        info.put("frontendUrl", "http://localhost:5173");
        info.put("mapUrl", "http://localhost:5173/map");
        info.put("message", "This is the REST API backend. To view the interactive Disaster Map, please navigate to http://localhost:5173/map");
        return ResponseEntity.ok(info);
    }
}
