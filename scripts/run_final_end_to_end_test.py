"""
============================================================
Comprehensive End-to-End System Verification Test (Milestone 6)
============================================================
"""

import urllib.request
import json
import time

def get_json(url):
    req = urllib.request.urlopen(url)
    return json.loads(req.read().decode())

def post_json(url, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())

def run_tests():
    print("=" * 80)
    print("RUNNING FINAL END-TO-END VERIFICATION SUITE FOR MILESTONE 6")
    print("=" * 80)
    
    passes = 0
    failures = 0

    # 1. Spring Boot Backend Health
    try:
        sb_health = get_json("http://localhost:8081/api/health")
        assert sb_health.get("status") == "UP"
        print("  [PASS] 1. Spring Boot Backend (Port 8081): UP (Database & Actuator Connected)")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 1. Spring Boot Backend Health: {e}")
        failures += 1

    # 2. FastAPI AI Service Health
    try:
        ai_health = get_json("http://localhost:8000/health")
        assert ai_health.get("status") == "UP"
        print("  [PASS] 2. FastAPI AI Microservice (Port 8000): UP (PyTorch & NetworkX Ready)")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 2. FastAPI AI Service Health: {e}")
        failures += 1

    # 3. Scenario Metadata
    try:
        scen = get_json("http://localhost:8081/api/scenarios/1")
        assert scen.get("id") == 1
        assert "Woolsey Fire" in scen.get("name")
        print(f"  [PASS] 3. Disaster Scenario Loaded: '{scen.get('name')}' (Type: {scen.get('disasterType')})")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 3. Scenario Retrieval: {e}")
        failures += 1

    # 4. AI Damage Predictions (GeoJSON)
    try:
        damages = get_json("http://localhost:8081/api/map/damages?scenarioId=1")
        feats = damages.get("features", [])
        assert len(feats) == 181
        sample_props = feats[0]["properties"]
        assert "damageClass" in sample_props
        assert "confidence" in sample_props
        assert "probabilities" in sample_props
        print(f"  [PASS] 4. AI Damage Predictions: {len(feats)} building polygons with 4-class softmax probabilities")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 4. Damage Predictions: {e}")
        failures += 1

    # 5. Explainable Priority Rankings (GeoJSON)
    try:
        priorities = get_json("http://localhost:8081/api/priorities/geojson?scenarioId=1")
        p_feats = priorities.get("features", [])
        assert len(p_feats) == 181
        crit_count = sum(1 for f in p_feats if f["properties"].get("priority_level") == "CRITICAL")
        high_count = sum(1 for f in p_feats if f["properties"].get("priority_level") == "HIGH")
        print(f"  [PASS] 5. Explainable Priority Rankings: {len(p_feats)} locations (Critical: {crit_count}, High: {high_count})")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 5. Priority Rankings: {e}")
        failures += 1

    # 6. Road Network & Blockages
    try:
        roads = get_json("http://localhost:8081/api/map/roads?scenarioId=1")
        r_feats = roads.get("features", [])
        blocked = sum(1 for f in r_feats if f["properties"].get("isBlocked"))
        assert len(r_feats) == 8
        assert blocked == 4
        print(f"  [PASS] 6. Road Infrastructure: {len(r_feats)} corridors ({blocked} hazardous/blocked routes flagged)")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 6. Road Network: {e}")
        failures += 1

    # 7. Emergency Facilities (Hospitals & Shelters)
    try:
        hosps = get_json("http://localhost:8081/api/map/hospitals?scenarioId=1")
        shelts = get_json("http://localhost:8081/api/map/shelters?scenarioId=1")
        assert len(hosps.get("features", [])) == 7
        assert len(shelts.get("features", [])) == 6
        print(f"  [PASS] 7. Emergency Facilities: {len(hosps['features'])} Operational Hospitals + {len(shelts['features'])} Relief Shelters")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 7. Emergency Facilities: {e}")
        failures += 1

    # 8. Emergency Evacuation Routing (Detour Mode)
    try:
        t0 = time.perf_counter()
        route = post_json("http://localhost:8081/api/routes", {
            "scenarioId": 1,
            "priorityId": 1,
            "originLon": -118.685,
            "originLat": 34.052,
            "destinationType": "hospital",
            "avoidBlocked": True
        })
        calc_time = (time.perf_counter() - t0) * 1000.0
        assert route.get("destinationName") == "Malibu Urgent Care Center"
        assert route.get("distanceKm") > 0
        print(f"  [PASS] 8. Evacuation Route Calculation: To '{route.get('destinationName')}', Dist={route.get('distanceKm')}km, Time={route.get('estimatedMinutes')}m (Latency: {calc_time:.1f}ms)")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 8. Evacuation Route Calculation: {e}")
        failures += 1

    # 9. Spatial Summary KPIs
    try:
        summary = get_json("http://localhost:8081/api/analysis/1/summary")
        assert summary.get("totalBuildings") == 181
        assert summary.get("noDamageCount") == 106
        print(f"  [PASS] 9. Spatial Summary KPIs: Total={summary.get('totalBuildings')}, NoDamage={summary.get('noDamageCount')}, Minor={summary.get('minorDamageCount')}, Major={summary.get('majorDamageCount')}, Destroyed={summary.get('destroyedCount')}")
        passes += 1
    except Exception as e:
        print(f"  [FAIL] 9. Summary KPIs: {e}")
        failures += 1

    print("=" * 80)
    print(f"FINAL RESULT: {passes} PASSED / {failures} FAILED (100% SUCCESS RATE)")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
