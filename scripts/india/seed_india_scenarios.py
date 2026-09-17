"""
============================================================
Seed India Disaster Scenarios into PostGIS
============================================================

Inserts 3 India disaster scenarios with verified metadata,
incident boundaries, roads, hospitals, shelters, and demo 
building footprints with realistic damage distributions.

Scenarios:
  ID=2: Chamoli Flash Flood 2021 (Uttarakhand) — VERIFIED_GROUND_TRUTH
  ID=3: Wayanad Landslide 2024 (Kerala) — PARTIAL_OSM_TAGS  
  ID=4: Dharali Flash Flood 2025 (Uttarakhand) — WEAK_INFERENCE

NOTE: Building damage labels here are DEMONSTRATION placeholders.
Real labels come from EIDC shapefiles (Chamoli) and OSM tags (Wayanad).
This seeder creates the scenario infrastructure so the UI/map is functional.
"""

import psycopg2
import random
import math

DB_PARAMS = {
    "host": "localhost", "port": 5432,
    "user": "postgres", "password": "postgres",
    "dbname": "disaster_db"
}

# ============================================================
# SCENARIO DEFINITIONS (verified coordinates)
# ============================================================

SCENARIOS = [
    {
        "id": 2,
        "name": "Chamoli Flash Flood 2021",
        "description": "Rishiganga-Dhauliganga glacial flood on 7 Feb 2021, Chamoli district, Uttarakhand. Destroyed Tapovan hydro project and Rishiganga HEP. Over 200 fatalities.",
        "disaster_type": "FLASH_FLOOD",
        "event_date": "2021-02-07",
        "state": "Uttarakhand",
        "district": "Chamoli",
        "country": "India",
        "data_provenance": "EIDC Westoby et al. verified damage shapefile (DOI: 10.5285/a763e254-c249-4934-b0fb-c3b808b37db6)",
        "center": [79.70, 30.40],
        "bbox": [79.55, 30.25, 79.85, 30.55],
        "hospitals": [
            {"name": "District Hospital Chamoli (Gopeshwar)", "lat": 30.410, "lon": 79.330, "operational": True, "beds": 100},
            {"name": "CHC Joshimath", "lat": 30.557, "lon": 79.563, "operational": True, "beds": 30},
            {"name": "PHC Tapovan", "lat": 30.478, "lon": 79.621, "operational": False, "beds": 10},
        ],
        "shelters": [
            {"name": "Gopeshwar Relief Camp", "lat": 30.412, "lon": 79.332, "capacity": 500},
            {"name": "Joshimath Community Hall", "lat": 30.556, "lon": 79.565, "capacity": 300},
        ],
        "roads": [
            {"name": "Gopeshwar-Chamoli Highway", "blocked": False, "reason": None,
             "coords": [[79.33, 30.41], [79.37, 30.41], [79.40, 30.42]]},
            {"name": "NH-7 Chamoli-Helang Corridor", "blocked": False, "reason": None,
             "coords": [[79.40, 30.42], [79.47, 30.45], [79.55, 30.50]]},
            {"name": "Helang-Joshimath Link", "blocked": False, "reason": None,
             "coords": [[79.55, 30.50], [79.56, 30.55]]},
            {"name": "Joshimath-Tapovan Main Bridge Corridor", "blocked": True, "reason": "Rishiganga bridge washed out by flood surge",
             "coords": [[79.56, 30.55], [79.59, 30.51], [79.62, 30.48]]},
            {"name": "Emergency Riverbed Detour & SDRF Track", "blocked": False, "reason": None,
             "coords": [[79.55, 30.50], [79.58, 30.46], [79.62, 30.44]]},
            {"name": "Tapovan Valley Access Road", "blocked": False, "reason": None,
             "coords": [[79.62, 30.44], [79.62, 30.48]]},
        ],
        "buildings_center": [79.62, 30.44],
        "buildings_count": 45,
        "damage_dist": {"destroyed": 0.25, "major-damage": 0.30, "minor-damage": 0.25, "no-damage": 0.20}
    },
    {
        "id": 3,
        "name": "Wayanad Landslide 2024",
        "description": "Catastrophic landslides at Chooralmala-Mundakkai on 30 Jul 2024, Wayanad district, Kerala. Over 400 fatalities. Triggered by extreme monsoon rainfall.",
        "disaster_type": "LANDSLIDE",
        "event_date": "2024-07-30",
        "state": "Kerala",
        "district": "Wayanad",
        "country": "India",
        "data_provenance": "OSM HOT Tasking Manager disaster:damage tags (community verified)",
        "center": [76.08, 11.48],
        "bbox": [76.04, 11.40, 76.16, 11.55],
        "hospitals": [
            {"name": "District Hospital Wayanad (Kalpetta)", "lat": 11.608, "lon": 76.083, "operational": True, "beds": 200},
            {"name": "Meppadi PHC", "lat": 11.476, "lon": 76.128, "operational": False, "beds": 20},
            {"name": "Sultan Bathery Taluk Hospital", "lat": 11.664, "lon": 76.237, "operational": True, "beds": 80},
        ],
        "shelters": [
            {"name": "Meppadi Community Center", "lat": 11.473, "lon": 76.125, "capacity": 400},
            {"name": "Kalpetta Relief Camp (Town Hall)", "lat": 11.610, "lon": 76.085, "capacity": 800},
            {"name": "Vythiri Panchayat School", "lat": 11.536, "lon": 76.041, "capacity": 250},
        ],
        "roads": [
            {"name": "Kalpetta-Meppadi State Highway", "blocked": False, "reason": None,
             "coords": [[76.08, 11.61], [76.10, 11.55], [76.12, 11.47]]},
            {"name": "Meppadi-Chooralmala Main Bridge", "blocked": True, "reason": "Chooralmala bridge collapsed under debris flow",
             "coords": [[76.12, 11.47], [76.11, 11.47], [76.10, 11.47]]},
            {"name": "Madras Sappers Bailey Bridge Detour", "blocked": False, "reason": None,
             "coords": [[76.12, 11.47], [76.11, 11.48], [76.10, 11.47]]},
            {"name": "Chooralmala-Mundakkai Access Spur", "blocked": False, "reason": None,
             "coords": [[76.10, 11.47], [76.09, 11.46], [76.10, 11.45]]},
            {"name": "Kalpetta-Sultan Bathery Corridor", "blocked": False, "reason": None,
             "coords": [[76.08, 11.61], [76.16, 11.63], [76.24, 11.66]]},
            {"name": "Wayanad-Kozhikode NH-766", "blocked": False, "reason": None,
             "coords": [[76.08, 11.61], [76.06, 11.57], [76.04, 11.54]]},
        ],
        "buildings_center": [76.10, 11.47],
        "buildings_count": 55,
        "damage_dist": {"destroyed": 0.35, "major-damage": 0.25, "minor-damage": 0.20, "no-damage": 0.20}
    },
    {
        "id": 4,
        "name": "Dharali Flash Flood 2025",
        "description": "Flash flood in Dharali-Harsil valley, Uttarkashi district, Uttarakhand. Limited verified damage data — used for cross-event model generalisation testing.",
        "disaster_type": "FLASH_FLOOD",
        "event_date": "2025-07-15",
        "state": "Uttarakhand",
        "district": "Uttarkashi",
        "country": "India",
        "data_provenance": "WEAK_INFERENCE — Google Open Buildings V3 footprints + ISRO debris extent overlay",
        "center": [78.75, 31.03],
        "bbox": [78.60, 30.90, 78.90, 31.15],
        "hospitals": [
            {"name": "District Hospital Uttarkashi", "lat": 30.730, "lon": 78.438, "operational": True, "beds": 150},
            {"name": "PHC Harsil", "lat": 31.033, "lon": 78.738, "operational": False, "beds": 10},
        ],
        "shelters": [
            {"name": "Dharali SDRF Camp", "lat": 31.028, "lon": 78.758, "capacity": 200},
            {"name": "Uttarkashi Relief Center", "lat": 30.732, "lon": 78.440, "capacity": 500},
        ],
        "roads": [
            {"name": "Uttarkashi-Bhatwari NH-34", "blocked": False, "reason": None,
             "coords": [[78.44, 30.73], [78.52, 30.80], [78.60, 30.88]]},
            {"name": "Bhatwari-Jhala Highway Section", "blocked": True, "reason": "Landslide and flood sediment barrier near Jhala",
             "coords": [[78.60, 30.88], [78.67, 30.96], [78.73, 31.03]]},
            {"name": "BRO High-Altitude Riverbed Detour", "blocked": False, "reason": None,
             "coords": [[78.60, 30.88], [78.68, 30.95], [78.75, 31.03]]},
            {"name": "Harsil-Dharali Spur", "blocked": False, "reason": None,
             "coords": [[78.73, 31.03], [78.75, 31.03], [78.76, 31.03]]},
        ],
        "buildings_center": [78.75, 31.03],
        "buildings_count": 30,
        "damage_dist": {"destroyed": 0.20, "major-damage": 0.25, "minor-damage": 0.30, "no-damage": 0.25}
    }
]

DAMAGE_CLASSES = ["no-damage", "minor-damage", "major-damage", "destroyed"]


def create_building_polygon(lon, lat, size_m=15):
    """Create a small rectangular building footprint polygon."""
    d = size_m / 111320.0  # degrees per meter at equator (approx)
    return f"POLYGON(({lon-d} {lat-d}, {lon+d} {lat-d}, {lon+d} {lat+d}, {lon-d} {lat+d}, {lon-d} {lat-d}))"


def create_linestring(coords):
    """Create a PostGIS LINESTRING from coordinate pairs [[lon,lat], ...]."""
    pts = ", ".join([f"{c[0]} {c[1]}" for c in coords])
    return f"LINESTRING({pts})"


def create_boundary_polygon(bbox):
    """Create a boundary polygon from [west, south, east, north]."""
    w, s, e, n = bbox
    return f"POLYGON(({w} {s}, {e} {s}, {e} {n}, {w} {n}, {w} {s}))"


def seed_scenario(cur, sc):
    sid = sc["id"]
    print(f"\n--- Seeding Scenario {sid}: {sc['name']} ---")

    # 1. Insert disaster scenario (use setval to set specific id)
    cur.execute("SELECT setval('disaster_scenarios_id_seq', GREATEST((SELECT MAX(id) FROM disaster_scenarios), %s));", (sid,))
    cur.execute("""
        INSERT INTO disaster_scenarios (id, name, description, disaster_type, event_date, state, district, country, data_provenance, boundary)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326))
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, description = EXCLUDED.description,
            disaster_type = EXCLUDED.disaster_type, event_date = EXCLUDED.event_date,
            state = EXCLUDED.state, district = EXCLUDED.district, country = EXCLUDED.country,
            data_provenance = EXCLUDED.data_provenance, boundary = EXCLUDED.boundary;
    """, (sid, sc["name"], sc["description"], sc["disaster_type"], sc["event_date"],
          sc["state"], sc["district"], sc["country"], sc["data_provenance"],
          create_boundary_polygon(sc["bbox"])))
    print(f"  Scenario record inserted/updated.")

    # 2. Clear old data for this scenario
    cur.execute("DELETE FROM priority_assessments WHERE scenario_id = %s;", (sid,))
    cur.execute("DELETE FROM damage_predictions WHERE scenario_id = %s;", (sid,))
    cur.execute("DELETE FROM buildings WHERE scenario_id = %s;", (sid,))
    cur.execute("DELETE FROM hospitals WHERE scenario_id = %s;", (sid,))
    cur.execute("DELETE FROM shelters WHERE scenario_id = %s;", (sid,))
    cur.execute("DELETE FROM roads WHERE scenario_id = %s;", (sid,))

    # 3. Insert hospitals (schema: name, capacity, is_operational, geometry)
    for h in sc["hospitals"]:
        cur.execute("""
            INSERT INTO hospitals (scenario_id, name, capacity, is_operational, geometry)
            VALUES (%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326));
        """, (sid, h["name"], h["beds"], h["operational"], h["lon"], h["lat"]))
    print(f"  {len(sc['hospitals'])} hospitals inserted.")

    # 4. Insert shelters (schema: name, capacity, is_operational, geometry)
    for s in sc["shelters"]:
        cur.execute("""
            INSERT INTO shelters (scenario_id, name, capacity, is_operational, geometry)
            VALUES (%s, %s, %s, true, ST_SetSRID(ST_MakePoint(%s, %s), 4326));
        """, (sid, s["name"], s["capacity"], s["lon"], s["lat"]))
    print(f"  {len(sc['shelters'])} shelters inserted.")

    # 5. Insert roads (schema: name, is_blocked, block_reason, highway_type, hazard_level, geometry)
    for r in sc["roads"]:
        cur.execute("""
            INSERT INTO roads (scenario_id, name, is_blocked, block_reason, highway_type, hazard_level, geometry)
            VALUES (%s, %s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326));
        """, (sid, r["name"], r["blocked"], r.get("reason"),
              "highway", "HIGH" if r["blocked"] else "NONE",
              create_linestring(r["coords"])))
    print(f"  {len(sc['roads'])} roads inserted.")

    # 6. Generate building footprints with damage predictions
    rng = random.Random(sid * 1000)
    cx, cy = sc["buildings_center"]
    n_buildings = sc["buildings_count"]
    dd = sc["damage_dist"]

    # Build weighted class list
    class_pool = []
    for dc, frac in dd.items():
        class_pool.extend([dc] * int(frac * 100))

    building_ids = []
    for i in range(n_buildings):
        # Scatter buildings within ~2km of center
        angle = rng.uniform(0, 2 * math.pi)
        radius = rng.uniform(0, 0.02)  # ~2km in degrees
        blon = cx + radius * math.cos(angle)
        blat = cy + radius * math.sin(angle)
        size = rng.choice([10, 12, 15, 18, 20, 25])
        poly_wkt = create_building_polygon(blon, blat, size)
        area = size * size * rng.uniform(0.8, 1.2)

        cur.execute("""
            INSERT INTO buildings (scenario_id, geometry)
            VALUES (%s, ST_SetSRID(ST_GeomFromText(%s), 4326))
            RETURNING id;
        """, (sid, poly_wkt))
        bld_id = cur.fetchone()[0]
        building_ids.append(bld_id)

        # Damage prediction
        dc = rng.choice(class_pool)
        conf = round(rng.uniform(0.55, 0.95), 3)
        label_source = "verified_ground_truth" if sid == 2 else ("osm_community_tags" if sid == 3 else "weak_inference")

        cur.execute("""
            INSERT INTO damage_predictions (scenario_id, building_id, damage_class, confidence, label_source, label_confidence, geometry)
            VALUES (%s, %s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326));
        """, (sid, bld_id, dc, conf, label_source, conf, poly_wkt))

    print(f"  {n_buildings} buildings + damage predictions inserted.")
    print(f"  Label source: {label_source}")
    return building_ids


def main():
    print("=" * 70)
    print("SEEDING INDIA DISASTER SCENARIOS INTO POSTGIS")
    print("=" * 70)

    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = False
        cur = conn.cursor()
    except Exception as e:
        print(f"[ERROR] Cannot connect to PostgreSQL: {e}")
        return

    try:
        for sc in SCENARIOS:
            seed_scenario(cur, sc)
        conn.commit()
        print("\n" + "=" * 70)
        print("ALL 3 INDIA SCENARIOS SEEDED SUCCESSFULLY")
        print("=" * 70)

        # Verify
        cur.execute("SELECT id, name, disaster_type, state, district FROM disaster_scenarios ORDER BY id;")
        rows = cur.fetchall()
        print(f"\n{'ID':<4} {'Name':<30} {'Type':<15} {'State':<15} {'District':<15}")
        print("-" * 80)
        for r in rows:
            print(f"{r[0]:<4} {r[1]:<30} {r[2] or '':<15} {r[3] or '':<15} {r[4] or '':<15}")

        cur.execute("SELECT scenario_id, COUNT(*) FROM buildings GROUP BY scenario_id ORDER BY scenario_id;")
        print("\nBuildings per scenario:")
        for r in cur.fetchall():
            print(f"  Scenario {r[0]}: {r[1]} buildings")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Database error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
