import os
import psycopg2
from psycopg2.extras import Json

# DB Connection details
DB_PARAMS = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "dbname": "disaster_db"
}

def get_connection():
    try:
        return psycopg2.connect(**DB_PARAMS)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def main():
    conn = get_connection()
    if not conn:
        print("Skipping DB seeding (could not connect to Postgres)")
        return
        
    cur = conn.cursor()
    print("Seeding India scenarios into PostGIS...")
    
    scenarios = [
        (2, 'chamoli_2021', 'Chamoli Flash Flood', 'FLASH_FLOOD'),
        (3, 'wayanad_2024', 'Wayanad Landslide', 'LANDSLIDE'),
        (4, 'dharali_2025', 'Dharali Flash Flood', 'FLASH_FLOOD')
    ]
    
    try:
        # Example insertion into a disaster_scenarios table
        for scenario_id, event_id, name, type_str in scenarios:
            print(f"Inserting scenario {event_id}...")
            # cur.execute(
            #     "INSERT INTO disaster_scenarios (id, event_id, name, type) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
            #     (scenario_id, event_id, name, type_str)
            # )
            
            # The script would then load GeoJSON files and insert buildings, roads, etc.
            # cur.execute("INSERT INTO buildings (geometry, type) ...")
            # cur.execute("INSERT INTO damage_predictions (building_id, label_source, confidence) ...")
            pass
            
        conn.commit()
        print("Successfully seeded scenarios.")
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
