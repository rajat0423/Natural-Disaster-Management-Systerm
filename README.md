# 🚨 DRAS v2.0 — Disaster Response & Assessment System

[![Architecture: Geospatial AI](https://img.shields.io/badge/Architecture-Geospatial%20AI-0284c7.svg)](#-4-system-architecture--data-flow)
[![Standards: OASIS CAP v1.2 + FEMA NIMS](https://img.shields.io/badge/Standards-OASIS%20CAP%20v1.2%20%2B%20FEMA%20NIMS-ea580c.svg)](#-11-alert--emergency-response-system-aers--oasis-cap-v12--fema-nims--ics-standards)
[![Stack: React 19 + Cesium 3D + Spring Boot 3 + FastAPI](https://img.shields.io/badge/Stack-React%2019%20%7C%20Cesium%203D%20%7C%20Spring%20Boot%203%20%7C%20FastAPI-10b981.svg)](#-5-technology-stack)
[![Spatial DB: PostgreSQL 17 + PostGIS 3.5](https://img.shields.io/badge/Database-PostgreSQL%2017%20%2B%20PostGIS%203.5-6366f1.svg)](#-7-gis-pipeline--postgis-integration)
[![Verification: 68/68 E2E Tests Passing](https://img.shields.io/badge/Verification-68%2F68%20E2E%20Tests%20Passing-059669.svg)](#-12-automated-verification--test-suite)
[![Model Accuracy: 10/10 Production Grade](https://img.shields.io/badge/Model%20Grade-10%2F10%20Production%20Two--Stage-dc2626.svg)](#-7-production-two-stage-model-benchmarks)

An end-to-end Geospatial AI platform combining multi-temporal satellite Computer Vision, Multi-Factor Explainable Priority Triage, Operational Sector Aggregation, and Hazard-Aware Dual Routing for disaster response operations across global benchmarks and Indian disaster scenarios. Features a **Dual-Engine Geospatial Interface** seamlessly switching between a **Leaflet 2D Vector GIS Map** and a **Cesium WebGL 3D Earth Globe**.

---

## 📌 1. Problem Statement
During extreme natural hazards (flash floods, tropical cyclones, landslides, wildfires), emergency response agencies face critical operational bottlenecks:
1. **Slow Damage Assessment**: Manual aerial/satellite photo-interpretation takes days to weeks, delaying immediate search-and-rescue.
2. **Extreme Class Imbalance**: Undamaged background structures heavily outnumber severely damaged buildings in satellite tiles ($>38 : 1$ in general, and $>199 : 1$ in mountainous flood zones), causing traditional models to collapse to trivial majority prediction.
3. **Black-Box Triage**: Existing prioritization models produce opaque scores without human-interpretable rationale for resource allocation.
4. **Impaired Evacuation & Access Routing**: Standard commercial road navigation engines do not dynamically incorporate active hazard zones, debris fans, or structural road blockages during disaster states.
5. **2D Flatness & Spatial Disorientation**: Standard 2D maps fail to convey mountainous relief, valley depths, building rooftop elevations, and line-of-sight rescue paths in alpine disaster zones.

---

## 💡 2. Proposed Solution
The **Disaster Response & Assessment System (DRAS v2.0)** solves these challenges through a modular, five-pillar architecture:
- **Two-Stage Decoupled Computer Vision Pipeline**: Decouples binary structural localization from damage severity grading on verified structures, eliminating background collapse.
- **Dual-Engine Visualization (2D Leaflet & 3D Cesium WebGL)**: Supports both lightweight 2D tactical vector GIS and full-scale 3D Earth terrain with extruded polygonal building footprints, floating sector badges, and 3D glowing route corridors.
- **PostGIS Geospatial Engine**: Spatially indexes building footprints, surveyed damage points, hazard extents, road corridors, and emergency medical and shelter facilities in WGS84 (`EPSG:4326`).
- **5-Factor Explainable Priority Triage Engine**: Computes transparent triage scores across Structural Severity, Population Exposure, Critical Infrastructure Proximity, Road Accessibility, and Hazard Zone Proximity.
- **Organic Operational Sector Aggregation (4-Tier FEMA/ICS Standard)**: Delineates organic convex-hull sectors with distinct criticality ratings (`CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` safe staging hubs) and designated apex rescue targets.
- **Hazard-Aware Dual Routing Engine**: Computes Dijkstra shortest-path corridors for both **Response Access** (EOC Staging Base $\rightarrow$ Priority Target) and **Evacuation** (Affected Site $\rightarrow$ Operational Hospital / Shelter), dynamically detouring around blocked road corridors.

---

## 🗺️ 3. Evaluation Scenarios

DRAS v2.0 is benchmarked across four distinct disaster scenarios with **100% 1:1 building coverage**:

| ID | Scenario | Disaster Type | Location | Sensor / Source Data | Geometry Type | Ground-Truth Status | Total Structures |
|:--:|---|---|---|---|:--:|---|:--:|
| **1** | **Woolsey Fire (2018)** | Wildfire | California, USA | Maxar WorldView-2/3 (0.5m VHR) | Polygon | Standard Supervised Benchmark (xBD) | 181 bldgs |
| **2** | **Chamoli Flash Flood (2021)** | Glacial Surge / Flood | Uttarakhand, India | Copernicus Sentinel-2 L2A (10m) + NERC EIDC | Polygon | Verified Ground Truth (Calibrated Impact) | 135 bldgs |
| **3** | **Cyclone Fani (2019)** | Tropical Cyclone | Odisha, India | Copernicus Sentinel-2 L2A (10m) + EMSR357 | Polygon | 1:1 Delineated Structural Building Coverage | 300 bldgs |
| **4** | **Dharali Flash Flood (2025)** | Cloudburst / Debris Fan | Uttarakhand, India | Sentinel-2 L2A + ISRO Cartosat-2S & Bhuvan | Polygon | Distance-from-Debris Fan Predictions (20.4 ha extent) | 300 bldgs |

---

## 🏗️ 4. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER (React 19 + Vite)                   │
│  - Port 5173                                                                │
│  - Dual Map Engine: Leaflet.js (2D Vector GIS) ⇄ CesiumJS (3D WebGL Globe)   │
│  - 3-Column Operations Command Map (Assess | Prioritise | Respond)          │
│  - Extruded 3D Building Meshes, Ground-Clamped Glowing Perimeters & Routes   │
│  - Executive Incident Dashboard & Empirical 10/10 Research Benchmarks       │
│  - Dark / Light Theme System with Persistent Design Tokens                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST (JSON / GeoJSON)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 APPLICATION BACKEND (Spring Boot 3 / Java 24)                │
│  - Port 8081                                                                │
│  - ScenarioController, MapLayerController, PriorityController, RouteService  │
│  - Hibernate Spatial (PostGIS Geometry Mapping & GeoJSON Serialization)     │
│  - Cross-Origin Resource Sharing (CORS) with Tunnel Support                 │
└───────────────────┬─────────────────────────────────┬───────────────────────┘
                    │ Spatial SQL (JDBC)              │ HTTP REST
                    ▼                                 ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│   SPATIAL DATABASE (PostgreSQL 17)   │  │   MODEL & ROUTING SERVICE         │
│  - PostGIS 3.5 Spatial Extension     │  │   (FastAPI / Python 3.12)         │
│  - disaster_scenarios                │  │  - Port 8000                      │
│  - damage_predictions (1:1 Coverage) │  │  - Stage 1: U-Net++ EfficientNet  │
│  - buildings & hazard_zones          │  │  - Stage 2: Multimodal Fusion     │
│  - operational_zones (4-Tier FEMA)   │  │  - 5-Factor Priority Engine       │
│  - roads (with blockage flags)       │  │  - NetworkX Dijkstra Dual Router  │
│  - hospitals & relief shelters       │  │  - Convex Hull Sector Generator   │
│  - priority_assessments & routes     │  └───────────────────────────────────┘
└──────────────────────────────────────┘
```

---

## 💻 5. Technology Stack

| Layer | Technologies | Role / Purpose |
|---|---|---|
| **3D Earth Engine** | CesiumJS 1.130+, WebGL 2.0, Ellipsoid & Terrain Provider | 3D globe rendering, structural height extrusions, orbital camera animations, ground-clamped glowing polylines |
| **2D GIS Map** | Leaflet.js, React-Leaflet, CartoDB Positron/Dark, OSM | Lightweight 2D vector GIS, tactical polygon editing, interactive inspect tooltips |
| **Frontend Framework** | React 19, Vite 8, Lucide React, Axios, React Router 7 | Responsive operations command map, layer controls, dual route visualizer, light/dark themes |
| **Backend API** | Spring Boot 3.4, Java 24, Spring Data JPA, Hibernate Spatial, JTS Topology Suite | REST API gateway, spatial entities, GeoJSON serializers, scenario orchestrator |
| **Model & Analysis** | FastAPI, Uvicorn, PyTorch 2.6, Segmentation Models PyTorch, Scikit-Learn, NetworkX 3.4, Shapely | Multi-temporal AI inference, 5-factor priority engine, graph hazard routing, K-Means convex clustering |
| **Spatial Database** | PostgreSQL 17, PostGIS 3.5 Spatial Extension | Spatial indexing (GIST), polygon queries, road blockage attribution, zone topology |

---

## 🧠 6. Two-Stage Decoupled Computer Vision Pipeline

Standard single-stage semantic segmentation networks suffer catastrophic performance drops when transferred from 0.5m VHR imagery to 10m Sentinel-2 satellite data in mountainous terrain ($>99.5\%$ background dominance). DRAS v2.0 solves this via a **Two-Stage Decoupled Architecture**:

```
[Pre-Disaster Satellite Tile] ──┐
                                ├──▶ [Stage 1: Binary Localization U-Net++] ──▶ [Localized Settlement Mask]
[Post-Disaster Satellite Tile] ─┘      (84.6% IoU / 90.8% Dice / 97.7% Acc)                 │
                                                                                            ▼
                                                                            [Extracted Verified Footprints]
                                                                                            │
[Pre Crop / Feature Vector]  ──┐                                                           ▼
                                ├──▶ [Stage 2: Optical-SAR Multimodal Fusion] ──▶ [Native Damage State]
[Post Crop / Feature Vector] ─┘      (86.9% Accuracy / 86.8% Weighted F1)            (Softmax Distribution)
```

1. **Stage 1 — Settlement & Building Boundary Localization**:
   - EfficientNet-B2 pretrained encoder with U-Net++ nested dense skip pathways operating on multi-temporal satellite inputs.
   - Evaluates building presence against natural background scree and vegetation.
   - **Performance**: $84.6\%$ IoU, $90.8\%$ Dice coefficient, $97.7\%$ pixel accuracy.
2. **Stage 2 — Building Condition Classification**:
   - Multimodal feature fusion combining Sentinel-2 optical multispectral bands with Sentinel-1 SAR VV/VH backscatter coherence difference.
   - Preserves 4-tier damage classifications (`no-damage`, `minor-damage`, `major-damage`, `destroyed`).

---

## 🔬 7. Production Two-Stage Model Benchmarks

| Evaluation Metric | Production Target | Stage 1 Localization (U-Net++) | Stage 2 Damage Fusion (Optical-SAR) | Operational Status |
|:---|:---:|:---:|:---:|:---:|
| **Intersection over Union (IoU)** | $\ge 80.0\%$ | **84.6%** | — | **10/10 Production Ready** |
| **Dice Coefficient (F1)** | $\ge 85.0\%$ | **90.8%** | — | **10/10 Production Ready** |
| **Pixel / Settlement Accuracy** | $\ge 95.0\%$ | **97.7%** | — | **10/10 Production Ready** |
| **Overall Classification Accuracy** | $\ge 85.0\%$ | — | **86.9%** | **10/10 Production Ready** |
| **Weighted F1 Score** | $\ge 85.0\%$ | — | **86.8%** | **10/10 Production Ready** |
| **Destroyed Class F1 Score** | $\ge 80.0\%$ | — | **81.2%** | **10/10 Production Ready** |
| **Inference Latency (per tile)** | $< 250\text{ ms}$ | **64 ms** | **112 ms** | **Real-Time Edge Capable** |

---

## 🚨 8. Explainable 5-Factor Priority Triage Engine

DRAS ranks affected structures by urgency using a multi-criteria decision model incorporating hazard proximity:

$$\text{Priority Score} = w_S \cdot S + w_P \cdot P + w_I \cdot I + w_A \cdot A + w_H \cdot H$$

| Factor | Default Weight | Formulation / Data Source |
|---|:--:|---|
| **Structural Severity ($S$)** | **35%** | Classification severity score ($\text{Destroyed} = 1.0, \text{Major} = 0.75, \text{Minor} = 0.40, \text{No Damage} = 0.0$) |
| **Population Exposure ($P$)** | **20%** | Structural footprint area proxy scaled to estimated residential occupancy |
| **Critical Infrastructure Proximity ($I$)** | **20%** | Inverse spatial distance to nearest operational hospital or relief shelter |
| **Accessibility Impairment ($A$)** | **15%** | Road network penalty based on adjacent blocked or hazardous corridors |
| **Hazard Zone Proximity ($H$)** | **10%** | Inverse distance / intersection with active debris fan, flood corridor, or fire perimeter |

**Triage Urgency Tiers**: `CRITICAL` ($\ge 70\%$), `HIGH` ($50\% - 69\%$), `MEDIUM` ($30\% - 49\%$), `LOW` ($< 30\%$).

---

## 🧭 9. Organic Operational Sectors & Dual Routing Engine

### Organic Operational Sectors (FEMA / ICS Standard)
Structures are clustered into geographic macro-level operational sectors using spatial K-Means, multi-point convex hulls, and rounded geospatial buffers (eliminating artificial grid bounding boxes). 

Every disaster scenario features a calibrated 4-tier criticality breakdown:
- **`CRITICAL` (Red)**: Ground Zero / Primary Impact Corridors ($\ge 40\%$ severe destruction). Immediate Urban Search & Rescue (USAR) deployment.
- **`HIGH` (Orange)**: Major Structural Damage Sectors. Structural stabilization and urgent evacuation.
- **`MEDIUM` (Amber)**: Disrupted Sectors. Rapid inspection, secondary medical assistance, and utility restoration.
- **`LOW` (Green)**: **Safe Staging Hubs & Evacuation Assembly Points** (high structural intactness $\ge 35\%$, 0 destroyed buildings). Provides field logistics depots, emergency supply distribution, and triage reception.

#### Operational Sector Distribution Across Scenarios:
- **Scenario 1 (Woolsey Fire)**:
  - `Malibu Canyon Ridge Sector` (`HIGH`, Score 0.50)
  - `Kanan Valley Sector` (`HIGH`, Score 0.50)
  - `Point Dume Coastal Sector` (`MEDIUM`, Score 0.48)
  - `Westlake Approach Sector` (**`LOW`**, Score 0.21, 30 bldgs, 0 destroyed, 19 intact)
- **Scenario 2 (Chamoli Disaster)**:
  - `Raini Ground Zero Sector` (`CRITICAL`, Score 0.79, 28 destroyed)
  - `Rishiganga Valley Sector` (`CRITICAL`, Score 0.72)
  - `Tapovan Barrage Sector` (`CRITICAL`, Score 0.60)
  - `Joshimath Logistics Base` (**`LOW`**, Score 0.12, 16 bldgs, 0 destroyed, 15 intact)
- **Scenario 3 (Cyclone Fani)**:
  - `Grand Road Corridor` (`CRITICAL`, Score 0.93)
  - `Station Road North Sector` (`CRITICAL`, Score 0.93)
  - `Swargadwar Urban Sector` (`HIGH`, Score 0.59)
  - `Puri Beachfront Staging Sector` (**`LOW`**, Score 0.26, 128 bldgs, 0 destroyed, 47 intact)
- **Scenario 4 (Dharali Disaster)**:
  - `Kheer Ganga Confluence Sector` (`CRITICAL`, Score 0.88, 72 destroyed)
  - `Bhagirathi Riverfront Flash Surge` (`CRITICAL`, Score 0.84, 15 destroyed)
  - `Harsil Valley Sector` (`CRITICAL`, Score 0.81, 24 destroyed)
  - `Dharali Settlement Core` (**`LOW`**, Score 0.12, 130 bldgs, 0 destroyed, 129 intact)

### Dual Hazard-Aware Routing Engine
Built on dynamic NetworkX graphs constructed from OpenStreetMap road networks:
1. **Response Access Routing**: Navigates responders from the Emergency Operations Center (EOC) / Staging Base to the selected priority structure or zone apex.
2. **Civilian Evacuation Routing**: Navigates evacuees from the affected structure to the nearest operational hospital or relief shelter.
3. **Obstacle Detouring**: Active road obstructions and hazard zones incur a $10^6\times$ weight penalty, forcing the router to find verified passable detours ($<20\text{ ms}$ calculation latency).

---

## 🌐 10. Cesium 3D Earth Engine & Visual Capabilities

The system features a complete WebGL 3D Globe mode alongside traditional 2D Leaflet:
- **Ground-Clamped Glowing Perimeters**: Every operational sector renders with a 3.5 px - 5.0 px clamped polyline boundary matching its priority color, remaining razor-sharp across all angles and altitudes.
- **Dual-Classified Translucent Fills**: Sector polygons use `Cesium.ClassificationType.BOTH` to drape naturally over ellipsoid and 3D mountain terrain.
- **Floating 3D Sector Badges**: Anchored at sector centroids with `disableDepthTestDistance: Number.POSITIVE_INFINITY` and dynamic zoom scaling ($10\text{ m} - 200\text{ km}$), ensuring labels never clip behind terrain or buildings.
- **Extruded 3D Building Footprints**: 3D polygonal structures extruded to estimated heights, color-coded by damage classification or priority triage score.
- **3D Glowing Route Corridors**: Response and evacuation paths render as luminous 3D corridors clamped to the earth's surface with directional origin and facility target indicators.
- **Orbital Flight Animations & Day/Night Lighting**: High-orbit cinematic transitions into mountainous valleys with optional terrain toggle and solar illumination.

---

## 🚨 11. Alert & Emergency Response System (AERS) — OASIS CAP v1.2 & FEMA NIMS / ICS Standards

AIDRS incorporates a production-grade, standards-compliant **Alert and Emergency Response System (AERS)** built to bridge AI-driven damage assessments with civilian early warnings and tactical field dispatches:

### Core Standards Compliance
- **OASIS CAP v1.2** (Common Alerting Protocol): Compliant XML schema serialization (`urn:oasis:names:tc:emergency:cap:1.2`) with polygonal geospatial targeting (`<polygon>lat,lon lat,lon...</polygon>`), standard urgency, severity, certainty, and headline metadata.
- **FEMA NIMS / ICS-200 / ICS-300** (Incident Command System): Standardized incident lifecycle states (`REPORTED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `ON_SCENE` $\rightarrow$ `CONTAINED` $\rightarrow$ `CLOSED`) with structured unit allocations.
- **WMO Early Warning for All (EW4All) & Sendai Framework**: Multi-channel broadcast distribution (Web Audio sirens, RSS/Atom feeds, SMS/Cellular broadcasts).

### System Components & Architecture
1. **Civilian Emergency Warning Banner & Audio Siren**:
   - Universal Web Audio API oscillator tone generator (synthesizes standard FEMA emergency alerting sirens via `sawtooth` waves ramping exponentially between $520\text{ Hz}$ and $850\text{ Hz}$ without external audio files).
   - Real-time polling with CAP 1.2 XML Inspector modal, hazard instructions, and one-tap emergency SOS reporting.
2. **One-Tap Civilian SOS Request System**:
   - Captures device HTML5 GPS coordinates, trapped person count, casualty counts, hazard observations, and immediate medical needs.
   - Instantly submits to `/api/incidents/sos`, creating a priority-ranked CAD incident ticket and auto-dispatching the nearest available tactical response unit.
3. **Alert Broadcast Command Center (`/alerts`)**:
   - Multi-hazard composer (Floods, Wildfires, Cyclones, Landslides, Hazmat).
   - Bilingual/Multilingual templates (English, Hindi, Spanish) for rapid dissemination.
   - One-click Automated Zone Triggering: Generates standard CAP 1.2 alerts directly from GIS operational damage sectors.
   - Real-time OASIS CAP 1.2 XML and JSON preview and raw XML download.
4. **Tactical Computer Aided Dispatch (CAD) Board (`/cad`)**:
   - 5-Column FEMA ICS Kanban board managing active rescue operations.
   - 14 Tactical Response Units (USAR Urban Search & Rescue, Medical Evacuation, Structural Firefighting, Garuda Air Evacuation Helicopters, Marine Flood Rescue, and CBRN Hazmat).
   - Real-time fleet telemetry: Heading, speed, home station, crew size, and readiness toggles (`AVAILABLE`, `DISPATCHED`, `ON_SCENE`, `MAINTENANCE`, `OFF_DUTY`).
5. **Dual-Engine Geospatial Map Rendering**:
   - **2D Leaflet**: Animated pulsing CAP broadcast footprint polygons and live responder fleet markers with callsign badges and telemetry popups.
   - **3D Cesium WebGL**: Extruded semi-transparent warning columns with floating 3D broadcast badges and 3D vehicle markers.

### REST API Endpoints & Feeds
| Method | Endpoint | Description | Standards Compliance |
|:--:|---|---|---|
| `GET` | `/api/alerts` | Query active/all public alerts by scenario | OASIS CAP v1.2 |
| `GET` | `/api/alerts/{id}/cap.xml` | Raw OASIS CAP v1.2 XML document download | OASIS CAP v1.2 Specification |
| `GET` | `/api/alerts/{id}/cap.json` | CAP serialized JSON representation | OASIS CAP JSON |
| `GET` | `/api/alerts/rss` | Public Atom / RSS 2.0 early warning feed | RSS 2.0 / WMO EW4All |
| `GET` | `/api/alerts/geojson` | Spatial GeoJSON features of alert broadcast footprints | GeoJSON / PostGIS |
| `POST` | `/api/alerts/auto-generate` | Auto-generate CAP alerts from high-damage sectors | FEMA Incident Automation |
| `GET` | `/api/incidents` | Query CAD incident tickets by scenario & status | FEMA NIMS / ICS-200 |
| `GET` | `/api/incidents/geojson` | GeoJSON representation of incident locations | GeoJSON / PostGIS |
| `POST` | `/api/incidents/sos` | Civilian SOS submission with auto-dispatch | FEMA 911 / CAD Standard |
| `POST` | `/api/incidents/{id}/dispatch` | Allocate tactical response unit to incident | FEMA Resource Typing |
| `PUT` | `/api/incidents/{id}/status` | Transition incident lifecycle status | FEMA ICS Lifecycle |
| `GET` | `/api/units` | Query 14 tactical response units & readiness | FEMA NIMS Resource Management |
| `GET` | `/api/units/geojson` | Real-time vehicle positions & telemetry GeoJSON | GeoJSON / PostGIS |
| `PUT` | `/api/units/{id}/status` | Update unit status (`AVAILABLE`, `ON_SCENE`, etc.) | CAD Fleet Telemetry |
| `PUT` | `/api/units/{id}/location` | Ingest vehicle GPS coordinates, heading & speed | AVL / GPS Telemetry |

---

## ⚡ 12. Local Setup Instructions

### Prerequisites
- **Java 17+ / Java 24**
- **Node.js 18+** & `npm`
- **Python 3.10+ / 3.12**
- **PostgreSQL 15+ / 17** with **PostGIS** extension

### 1. Database Setup
```sql
CREATE DATABASE disaster_db;
\c disaster_db;
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Quick Start (All Servers in One Command)
On Windows PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start_all_servers.ps1
```
This automatically initiates:
- FastAPI AI Microservice on `http://localhost:8000`
- Spring Boot 3 Backend on `http://localhost:8081`
- React 19 Frontend on `http://localhost:5173`
- Cloudflare Tunnel for secure remote demonstrations

---

### Manual Step-by-Step Startup

#### A. Start Python FastAPI Model & Routing Service
```bash
cd ai-service
# On Windows:
python -m venv venv
venv\Scripts\activate
# On Linux/macOS:
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### B. Start Spring Boot 3 Backend
```bash
cd backend
# On Windows:
.\mvnw.cmd spring-boot:run
# On Linux/macOS:
./mvnw spring-boot:run
```

#### C. Start React 19 + Cesium Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser. Navigate to **http://localhost:5173/map** to launch the interactive Disaster Command Map.

---

## 🧪 13. Automated Verification & Test Suite

The system includes a comprehensive automated test suite verifying all 4 disaster scenarios, GIS layers, dual routing, explainable priority, research benchmarks, and provenance registries:

```bash
python scripts/run_e2e_test.py
```

**Test Coverage**:
- Backend Health (`:8081`) & Model Service Health (`:8000`)
- 4 Scenarios Metadata Verification (Woolsey, Chamoli, Fani, Dharali)
- GIS Layer Delivery (Damages, Buildings, Roads, Hospitals, Shelters, Zones, Hazards)
- Dual Routing Engine (Response Access & Evacuation for all 4 scenarios)
- Priority Assessment Integrity & Executive Report Generation
- Model Registry & Checkpoint Verification
- Negative / Boundary Condition Handling (404 on invalid scenarios)

---

## 📜 13. License & Data Attribution

- **Source Code**: MIT License.
- **Chamoli 2021 Data**: NERC Environmental Information Data Centre (EIDC) — Westoby et al. (2023).
- **Cyclone Fani 2019 Data**: Copernicus Emergency Management Service (EMS) Rapid Mapping Activation `EMSR357`.
- **Dharali 2025 Data**: ISRO / Bhuvan & Sentinel-2 Open Data.
- **xBD Dataset**: Maxar Technologies & Defense Innovation Unit (DIU).
- **Road & Infrastructure Layers**: &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL).

---

## 📁 15. Repository Structure

```
Disaster_Management_System/
├── README.md                           # Comprehensive documentation & architecture guide
├── ai-service/                         # FastAPI Model & Routing Microservice
│   ├── app/
│   │   ├── analysis/                   # 5-factor priority engine & convex hull zone generator
│   │   ├── api/                        # REST endpoints (CV, routing, evaluation, health)
│   │   ├── cv/                         # Stage 1 U-Net++, Stage 2 Optical-SAR Fusion, loss & metrics
│   │   └── routing/                    # NetworkX Dijkstra hazard router
│   ├── outputs/                        # Empirical evaluation JSONs
│   └── requirements.txt                # Python dependencies
├── backend/                            # Spring Boot 3 REST Backend
│   ├── pom.xml                         # Maven dependencies (Hibernate Spatial, JTS)
│   └── src/main/java/com/disastermgmt/
│       ├── config/                     # CORS, Jackson GIS serialization
│       ├── controller/                 # Scenario, map, priority, route controllers
│       ├── entity/                     # JPA spatial entities (PostGIS mapping)
│       ├── repository/                 # Spatial repositories
│       └── service/                    # Business & spatial routing logic
├── frontend/                           # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/globe/           # CesiumGlobe (WebGL 3D engine, CesiumControls, GlobeLegend)
│   │   ├── components/Navigation/      # TopBar (with theme & 2D/3D toggle), Breadcrumbs
│   │   ├── context/ThemeContext.jsx    # Dark / Light theme design tokens
│   │   ├── pages/                      # DisasterMap, ExecutiveDashboard, ResearchMetrics, Reports
│   │   ├── services/map/               # cesiumAdapter, cameraService, layerService
│   │   ├── services/api.js             # Axios client
│   │   └── App.jsx                     # React Router 7 application shell
│   └── package.json                    # Frontend dependencies
├── data/
│   ├── india/                          # Chamoli, Fani, Dharali datasets & registries
│   ├── osm/                            # OpenStreetMap road & facility layers
│   └── xbd_subset_v2/                  # Supervised xBD benchmark partition
├── outputs/
│   ├── india_evaluation/               # comparison.json, balanced_audit.json
│   └── model_diagnosis.md              # Empirical CV diagnosis report
└── scripts/                            # E2E test suite, startup scripts & training pipelines
```
