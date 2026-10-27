"""
AERS (Alert & Emergency Response System) Database Schema & Initial Data Seeding
Creates: alerts, incidents, response_units, alert_deliveries
Compliant with OASIS CAP v1.2, FEMA ICS-200/300, and Sendai Framework.
"""
import psycopg2
import json

DB_PARAMS = {
    "dbname": "disaster_db",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": 5432
}

SCHEMA_SQL = """
-- 1. CAP 1.2 Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(100) UNIQUE NOT NULL,
    sender VARCHAR(100) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL,                 -- Actual, Exercise, System, Test, Draft
    msg_type VARCHAR(20) NOT NULL,               -- Alert, Update, Cancel, Ack, Error
    scope VARCHAR(20) NOT NULL,                  -- Public, Restricted, Private
    
    category VARCHAR(50) NOT NULL,               -- Geo, Met, Safety, Security, Rescue, Fire, Health, Env, Transport, Infra
    event VARCHAR(100) NOT NULL,
    urgency VARCHAR(20) NOT NULL,                -- Immediate, Expected, Future, Past, Unknown
    severity VARCHAR(20) NOT NULL,               -- Extreme, Severe, Moderate, Minor, Unknown
    certainty VARCHAR(20) NOT NULL,              -- Observed, Likely, Possible, Unlikely, Unknown
    headline VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instruction TEXT NOT NULL,
    
    target_zone_id BIGINT REFERENCES operational_zones(id) ON DELETE SET NULL,
    geometry GEOMETRY(Geometry, 4326),
    
    scenario_id BIGINT REFERENCES disaster_scenarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_geom ON alerts USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_alerts_status_expires ON alerts (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_alerts_scenario ON alerts (scenario_id);

-- 2. CAD Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    scenario_id BIGINT REFERENCES disaster_scenarios(id) ON DELETE CASCADE,
    zone_id BIGINT REFERENCES operational_zones(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    disaster_type VARCHAR(50) NOT NULL,          -- FLOOD, EARTHQUAKE, FIRE, CYCLONE, LANDSLIDE, etc.
    priority VARCHAR(20) NOT NULL,               -- P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW
    status VARCHAR(30) NOT NULL,                 -- REPORTED, DISPATCHED, ON_SCENE, CONTAINED, CLOSED
    
    location GEOMETRY(Point, 4326) NOT NULL,
    address_text TEXT,
    reported_by VARCHAR(100),
    caller_phone VARCHAR(30),
    victim_count INT DEFAULT 0,
    trapped_count INT DEFAULT 0,
    hazards_present TEXT[],                      -- e.g. ARRAY['LIVE_WIRES', 'WATER_INGRESS']
    
    assigned_team_id UUID,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_priority_status ON incidents (priority, status);
CREATE INDEX IF NOT EXISTS idx_incidents_scenario ON incidents (scenario_id);

-- 3. Response Units Table
CREATE TABLE IF NOT EXISTS response_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callsign VARCHAR(60) UNIQUE NOT NULL,
    unit_type VARCHAR(40) NOT NULL,              -- USAR, MEDICAL, FIRE, POLICE, HAZMAT, AIR_EVAC
    status VARCHAR(30) NOT NULL,                 -- AVAILABLE, DISPATCHED, ON_SCENE, EN_ROUTE_HOSPITAL, OUT_OF_SERVICE
    personnel_count INT NOT NULL,
    equipment_manifest JSONB,
    current_location GEOMETRY(Point, 4326),
    heading FLOAT DEFAULT 0.0,
    speed_kmh FLOAT DEFAULT 0.0,
    active_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    scenario_id BIGINT REFERENCES disaster_scenarios(id) ON DELETE CASCADE,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_units_geom ON response_units USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_response_units_status ON response_units (status, unit_type);
CREATE INDEX IF NOT EXISTS idx_response_units_scenario ON response_units (scenario_id);

-- Add foreign key constraint for assigned_team_id on incidents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_incidents_response_unit'
    ) THEN
        ALTER TABLE incidents 
        ADD CONSTRAINT fk_incidents_response_unit 
        FOREIGN KEY (assigned_team_id) REFERENCES response_units(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Alert Deliveries Table
CREATE TABLE IF NOT EXISTS alert_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL,                -- WEBSOCKET, WEB_PUSH, SMS, EMAIL, CAP_RSS, SIREN, CELL_BROADCAST
    recipient_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    fail_count INT DEFAULT 0,
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latency_ms INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_alert_id ON alert_deliveries (alert_id);
"""

def setup_and_seed():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()
    print("Creating AERS database schema...")
    cur.execute(SCHEMA_SQL)
    conn.commit()

    # Clear existing initial data to ensure clean idempotency
    cur.execute("DELETE FROM alert_deliveries;")
    cur.execute("UPDATE incidents SET assigned_team_id = NULL;")
    cur.execute("UPDATE response_units SET active_incident_id = NULL;")
    cur.execute("DELETE FROM response_units;")
    cur.execute("DELETE FROM incidents;")
    cur.execute("DELETE FROM alerts;")
    conn.commit()
    print("Cleared existing test records.")

    # 1. Fetch zone information for each scenario to bind alerts and geometries
    cur.execute("""
        SELECT scenario_id, id, zone_code, name, criticality, ST_AsText(geometry), 
               ST_X(ST_Centroid(geometry)), ST_Y(ST_Centroid(geometry))
        FROM operational_zones 
        ORDER BY scenario_id, criticality_score DESC;
    """)
    zones = cur.fetchall()

    scenario_zones = {}
    for z in zones:
        scen_id = z[0]
        if scen_id not in scenario_zones:
            scenario_zones[scen_id] = []
        scenario_zones[scen_id].append({
            "id": z[1], "code": z[2], "name": z[3], "criticality": z[4],
            "geom_wkt": z[5], "centroid_x": z[6], "centroid_y": z[7]
        })

    # 2. Seed Response Units
    units_data = [
        # Scenario 1: Woolsey Fire (Malibu / Calabasas)
        (1, "CALFIRE-STRIKE-01", "FIRE", "AVAILABLE", 6, 
         {"truck": "Type 3 Wildland Engine", "water_gal": 500, "foam": True, "chainsaws": 4},
         -118.8050, 34.0320, 45.0, 0.0),
        (1, "LAC-USAR-TASKFORCE-02", "USAR", "DISPATCHED", 8,
         {"extrication": "Holmatro hydraulic", "thermal_imaging": True, "k9": 1},
         -118.7900, 34.0280, 180.0, 24.5),
        (1, "MERCY-MEDIC-AMB-09", "MEDICAL", "AVAILABLE", 3,
         {"paramedics": 2, "trauma_kits": 4, "oxygen_tanks": 6, "defibrillator": True},
         -118.7750, 34.0380, 270.0, 0.0),

        # Scenario 2: Chamoli Flash Flood (Raini / Tapovan)
        (2, "NDRF-8BN-ALPHA", "USAR", "DISPATCHED", 12,
         {"rafts": 2, "drones": 2, "life_jackets": 20, "concrete_cutters": 2},
         79.6950, 30.4850, 90.0, 18.0),
        (2, "ITBP-DISASTER-OPS-03", "USAR", "ON_SCENE", 10,
         {"high_altitude_gear": True, "satellite_comm": True, "stretcher": 4},
         79.7210, 30.4910, 120.0, 0.0),
        (2, "UTTARAKHAND-EMS-04", "MEDICAL", "AVAILABLE", 4,
         {"oxygen_concentrators": 4, "trauma_kit": 6, "suction_unit": 2},
         79.6800, 30.4780, 0.0, 0.0),
        (2, "IAF-SAR-CHOPPER-01", "AIR_EVAC", "AVAILABLE", 4,
         {"helicopter": "Mi-17 V5", "winch_cable": True, "medevac_litters": 6},
         79.6500, 30.5100, 45.0, 0.0),

        # Scenario 3: Cyclone Fani (Puri, Odisha)
        (3, "ODRAF-COASTAL-05", "USAR", "DISPATCHED", 10,
         {"inflatable_boats": 4, "tree_clearing_saws": 8, "generator": 2},
         85.8280, 19.8050, 15.0, 32.0),
        (3, "PURI-DISTRICT-MED-02", "MEDICAL", "ON_SCENE", 4,
         {"mobile_icu": True, "blood_units": 8, "triage_tags": 100},
         85.8320, 19.8120, 180.0, 0.0),
        (3, "ODISHA-FIRE-RESCUE-01", "FIRE", "AVAILABLE", 6,
         {"heavy_pump": True, "high_voltage_detector": True, "floodlights": 4},
         85.8150, 19.8220, 270.0, 0.0),
        (3, "INDIAN-NAVY-CHETAK-02", "AIR_EVAC", "AVAILABLE", 3,
         {"helicopter": "HAL Chetak", "life_rafts": 4, "food_packets": 250},
         85.8450, 19.8350, 210.0, 0.0),

        # Scenario 4: Dharali Flash Flood (Uttarkashi)
        (4, "SDRF-UTTARAKHASHI-01", "USAR", "ON_SCENE", 8,
         {"mud_rescue_boards": 4, "rope_traverse": True, "sat_phone": True},
         78.6880, 31.0340, 110.0, 0.0),
        (4, "HARSIL-EMS-AMB-01", "MEDICAL", "AVAILABLE", 3,
         {"portable_defib": True, "hypothermia_blankets": 30, "splints": 12},
         78.6720, 31.0390, 0.0, 0.0),
        (4, "ARMY-CORPS-ENG-09", "HAZMAT", "DISPATCHED", 14,
         {"heavy_earthmover": True, "debris_trenchers": 2, "pontoon_bridge": True},
         78.6650, 31.0280, 85.0, 22.0)
    ]

    unit_id_map = {}
    for u in units_data:
        scen_id, callsign, u_type, status, personnel, manifest, lon, lat, heading, speed = u
        cur.execute("""
            INSERT INTO response_units (
                scenario_id, callsign, unit_type, status, personnel_count,
                equipment_manifest, current_location, heading, speed_kmh, last_ping
            ) VALUES (
                %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, NOW()
            ) RETURNING id, callsign;
        """, (scen_id, callsign, u_type, status, personnel, json.dumps(manifest), lon, lat, heading, speed))
        uid, csign = cur.fetchone()
        unit_id_map[csign] = uid

    print(f"Seeded {len(unit_id_map)} tactical response units.")

    # 3. Seed Incidents (CAD)
    incidents_data = [
        # Scenario 1 (Woolsey Fire)
        (1, "INC-2018-WLS-01", "Malibu Canyon Ridge Brush Fire & Entrapment", "FIRE", "P1_CRITICAL", "DISPATCHED",
         -118.7950, 34.0350, "Canyon Ridge Ln & Kanan Rd, Malibu", "Emergency 911 Dispatch", "+1-310-555-0192",
         6, 3, ["RAPID_FIRE_SPREAD", "SINGLE_INGRESS_ROAD", "DENSE_SMOKE"],
         unit_id_map["LAC-USAR-TASKFORCE-02"]),
        (1, "INC-2018-WLS-02", "Downed High Voltage Transformer with Wildfire Sparking", "FIRE", "P2_HIGH", "REPORTED",
         -118.8100, 34.0250, "Pacific Rim Trail & Coastal View, Malibu", "Malibu Fire Patrol", "+1-310-555-0144",
         0, 0, ["LIVE_WIRES", "HIGH_WIND_GUSTS"],
         None),

        # Scenario 2 (Chamoli Disaster)
        (2, "INC-2021-CHM-01", "Raini Headworks Structural Breach & Labor Entrapment", "FLOOD", "P1_CRITICAL", "ON_SCENE",
         79.7280, 30.4930, "Rishiganga Hydropower Intake, Raini Village", "Project Safety Officer", "+91-1372-252110",
         18, 11, ["DEBRIS_FAN_ACTIVE", "RAPID_WATER_CURRENT", "COLLAPSED_CONCRETE"],
         unit_id_map["ITBP-DISASTER-OPS-03"]),
        (2, "INC-2021-CHM-02", "Tapovan Barrage Ingress Corridor Blockade", "LANDSLIDE", "P2_HIGH", "DISPATCHED",
         79.7020, 30.4870, "Tapovan Dhauliganga Confluence Rd", "Joshimath Police Post", "+91-1372-252204",
         4, 0, ["MUD_SLURRY_2M", "HEAVY_BOULDERS"],
         unit_id_map["NDRF-8BN-ALPHA"]),

        # Scenario 3 (Cyclone Fani)
        (3, "INC-2019-FAN-01", "Grand Road Commercial Arcade Structural Roof Failure", "CYCLONE", "P1_CRITICAL", "ON_SCENE",
         85.8310, 19.8140, "Grand Road Market Complex, Puri", "OSDMA Triage Hotline", "+91-6752-222034",
         14, 5, ["SHREDDED_CORRUGATED_TIN", "FLOODED_BASEMENT", "POWER_GRID_OUTAGE"],
         unit_id_map["PURI-DISTRICT-MED-02"]),
        (3, "INC-2019-FAN-02", "Station Road Uprooted Ancient Banyan Tree Ingress Choke", "CYCLONE", "P2_HIGH", "DISPATCHED",
         85.8240, 19.8210, "Station Road Junction near Puri Railway Station", "Traffic Control", "+91-6752-223100",
         0, 0, ["BLOCKS_EVACUATION_CORRIDOR", "EXPOSED_TELECOM_WIRES"],
         unit_id_map["ODRAF-COASTAL-05"]),

        # Scenario 4 (Dharali Disaster)
        (4, "INC-2025-DHR-01", "Kheer Ganga Flash Surge Silt Entrapment at Core Dwellings", "FLOOD", "P1_CRITICAL", "ON_SCENE",
         78.6840, 31.0360, "Kheer Ganga Confluence, Dharali Village", "Gram Pradhan", "+91-1377-224012",
         9, 4, ["20_4_HA_DEBRIS_FAN", "ACTIVE_TALUS_SLOPE", "EROSION_UNDERCUTTING"],
         unit_id_map["SDRF-UTTARAKHASHI-01"]),
        (4, "INC-2025-DHR-02", "Bhagirathi Riverfront Retaining Wall Impending Failure", "LANDSLIDE", "P2_HIGH", "DISPATCHED",
         78.6750, 31.0310, "NH-134 Riverfront Pier, Lower Dharali", "BRO Highway Inspector", "+91-1377-224108",
         2, 0, ["RIVER_EROSION", "HIGHWAY_CRACKING"],
         unit_id_map["ARMY-CORPS-ENG-09"])
    ]

    for inc in incidents_data:
        scen_id, code, title, dtype, pri, status, lon, lat, addr, rep, phone, victims, trapped, hazards, team_id = inc
        cur.execute("""
            INSERT INTO incidents (
                scenario_id, code, title, disaster_type, priority, status,
                location, address_text, reported_by, caller_phone,
                victim_count, trapped_count, hazards_present, assigned_team_id,
                dispatched_at, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s,
                %s, %s, %s, %s,
                NOW(), NOW()
            ) RETURNING id;
        """, (scen_id, code, title, dtype, pri, status, lon, lat, addr, rep, phone, victims, trapped, hazards, team_id))
        inc_id = cur.fetchone()[0]
        if team_id:
            cur.execute("UPDATE response_units SET active_incident_id = %s WHERE id = %s;", (inc_id, team_id))

    print(f"Seeded {len(incidents_data)} high-priority CAD emergency incidents.")

    # 4. Seed Standard-Compliant OASIS CAP 1.2 Alerts
    alerts_data = [
        # Scenario 1 (Woolsey Fire)
        (1, "AIDRS-2018-WF-001", "HQ-CALFIRE-OPS@AIDRS.GOV", "Actual", "Alert", "Public",
         "Fire", "Extreme Wildfire Conflagration & Rapid Flame Spread", "Immediate", "Extreme", "Observed",
         "RED FLAG EMERGENCY: Mandatory Evacuation for Malibu Canyon Ridge",
         "Dangerous fast-moving wildfire cresting canyon ridge driven by 45 mph Santa Ana winds. Zero containment. Extreme threat to life and structures.",
         "Evacuate immediately south toward Pacific Coast Highway. Use Westlake Approach staging zone. Do not attempt to shelter in vehicles on canyon roads.",
         scenario_zones.get(1, [{}])[0].get("id"),
         scenario_zones.get(1, [{}])[0].get("geom_wkt")),

        # Scenario 2 (Chamoli Flash Flood)
        (2, "AIDRS-2021-FL-0042", "HQ-NDMA-OPS@AIDRS.GOV", "Actual", "Alert", "Public",
         "Safety", "Catastrophic Glacial Surge & Debris Flow Emergency", "Immediate", "Extreme", "Observed",
         "FLASH FLOOD EMERGENCY: Evacuate Raini Ground Zero & Tapovan Corridor Immediately",
         "High-velocity glacial surge detected upstream with complete barrage overtopping. Extreme debris slurry inundating riverbanks. Critical structural destruction across valley.",
         "Move to higher ground immediately (minimum 30m above riverbed). Proceed to Joshimath Logistics Base. Avoid bridges, riverbanks, and low-lying arterial roads.",
         scenario_zones.get(2, [{}])[0].get("id"),
         scenario_zones.get(2, [{}])[0].get("geom_wkt")),

        # Scenario 3 (Cyclone Fani)
        (3, "AIDRS-2019-CYC-0104", "HQ-OSDMA-OPS@AIDRS.GOV", "Actual", "Alert", "Public",
         "Met", "Super Cyclonic Storm & Extreme Storm Surge Hazard", "Immediate", "Extreme", "Observed",
         "CYCLONE EMERGENCY: Immediate Inundation Evacuation for Grand Road & Coastal Sectors",
         "Category 5 Cyclone Fani making landfall with 215 km/h sustained wind gusts and 4m tidal surge. Massive structural roof tearing and flying debris hazard.",
         "Seek immediate shelter in designated concrete cyclone shelters or Grand Road multi-story relief centers. Stay clear of windows, electrical poles, and unreinforced masonry.",
         scenario_zones.get(3, [{}])[0].get("id"),
         scenario_zones.get(3, [{}])[0].get("geom_wkt")),

        # Scenario 4 (Dharali Cloudburst)
        (4, "AIDRS-2025-CLB-0089", "HQ-SDMA-UK-OPS@AIDRS.GOV", "Actual", "Alert", "Public",
         "Geo", "High-Volume Cloudburst Flash Flood & Mudflow Inundation", "Immediate", "Extreme", "Observed",
         "CATASTROPHIC CLOUDBURST ALERT: Evacuate Kheer Ganga Confluence Sector",
         "Intense cloudburst trigger has released a 20.4 hectare active debris fan down Kheer Ganga gorge. Severe damage and structural submersion reported.",
         "Evacuate east toward Dharali Settlement Core safe staging area and Upper Harsil medical station. Do not cross the riverfront pier or obstructed drainage gullies.",
         scenario_zones.get(4, [{}])[0].get("id"),
         scenario_zones.get(4, [{}])[0].get("geom_wkt"))
    ]

    for a in alerts_data:
        scen_id, ident, sender, status, mtype, scope, cat, event, urg, sev, cert, headline, desc, inst, zid, geom_wkt = a
        cur.execute("""
            INSERT INTO alerts (
                scenario_id, identifier, sender, status, msg_type, scope,
                category, event, urgency, severity, certainty, headline, description, instruction,
                target_zone_id, geometry, created_at, expires_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s,
                %s, ST_GeomFromText(%s, 4326), NOW(), NOW() + INTERVAL '12 hours'
            ) RETURNING id;
        """, (scen_id, ident, sender, status, mtype, scope, cat, event, urg, sev, cert, headline, desc, inst, zid, geom_wkt))
        alert_id = cur.fetchone()[0]

        # Seed deliveries for this alert
        deliveries = [
            (alert_id, "CELL_BROADCAST", 12500, 12480, 20, 1420),
            (alert_id, "WEBSOCKET", 480, 480, 0, 18),
            (alert_id, "SIREN", 4, 4, 0, 850),
            (alert_id, "CAP_RSS", 120, 120, 0, 45)
        ]
        for d in deliveries:
            cur.execute("""
                INSERT INTO alert_deliveries (
                    alert_id, channel, recipient_count, success_count, fail_count, dispatched_at, latency_ms
                ) VALUES (%s, %s, %s, %s, %s, NOW(), %s);
            """, d)

    conn.commit()
    print(f"Seeded {len(alerts_data)} official OASIS CAP 1.2 alerts with multi-channel delivery logs.")
    cur.close()
    conn.close()
    print("AERS database setup completed successfully!")

if __name__ == "__main__":
    setup_and_seed()
