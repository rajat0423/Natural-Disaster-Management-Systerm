# 🚨 DRAS v2.0 — Disaster Response & Assessment System

[![Architecture: Geospatial AI](https://img.shields.io/badge/Architecture-Geospatial%20AI-0284c7.svg)](#-3-system-architecture--data-flow)
[![Stack: React 19 + Spring Boot 3 + FastAPI](https://img.shields.io/badge/Stack-React%2019%20%7C%20Spring%20Boot%203%20%7C%20FastAPI-10b981.svg)](#-5-technology-stack)
[![Spatial DB: PostgreSQL 17 + PostGIS 3.5](https://img.shields.io/badge/Database-PostgreSQL%2017%20%2B%20PostGIS%203.5-6366f1.svg)](#-7-gis-pipeline--postgis-integration)
[![Verification: 68/68 E2E Tests Passing](https://img.shields.io/badge/Verification-68%2F68%20E2E%20Tests%20Passing-059669.svg)](#-12-automated-verification--test-suite)

An end-to-end Geospatial AI platform combining multi-temporal satellite Computer Vision, Multi-Factor Explainable Priority Triage, Operational Sector Aggregation, and Hazard-Aware Dual Routing for disaster response operations across global benchmarks and Indian disaster scenarios.

---

## 📌 1. Problem Statement
During extreme natural hazards (flash floods, tropical cyclones, landslides, wildfires), emergency response agencies face critical operational bottlenecks:
1. **Slow Damage Assessment**: Manual aerial/satellite photo-interpretation takes days to weeks, delaying immediate search-and-rescue.
2. **Extreme Class Imbalance**: Undamaged background structures heavily outnumber severely damaged buildings in satellite tiles ($>38 : 1$ in general, and $>199 : 1$ in mountainous flood zones), causing traditional models to collapse to trivial majority prediction.
3. **Black-Box Triage**: Existing prioritization models produce opaque scores without human-interpretable rationale for resource allocation.
4. **Impaired Evacuation & Access Routing**: Standard commercial road navigation engines do not dynamically incorporate active hazard zones, debris fans, or structural road blockages during disaster states.

---

## 💡 2. Proposed Solution
The **Disaster Response & Assessment System (DRAS v2.0)** solves these challenges through a modular, five-pillar architecture:
- **Two-Stage Decoupled Computer Vision Pipeline**: Decouples binary structural localization from damage severity grading on verified structures, eliminating background collapse.
- **PostGIS Geospatial Engine**: Spatially indexes building footprints, surveyed damage points, hazard extents, road corridors, and emergency medical and shelter facilities in WGS84 (`EPSG:4326`).
- **5-Factor Explainable Priority Triage Engine**: Computes transparent triage scores across Structural Severity, Population Exposure, Critical Infrastructure Proximity, Road Accessibility, and Hazard Zone Proximity.
- **Operational Zone Aggregation**: Groups affected structures into command sectors with criticality scores and apex rescue targets for incident commanders.
- **Hazard-Aware Dual Routing Engine**: Computes Dijkstra shortest-path corridors for both **Response Access** (EOC Staging Base $\rightarrow$ Priority Target) and **Evacuation** (Affected Site $\rightarrow$ Operational Hospital / Shelter), dynamically detouring around blocked road corridors.

---

## 🗺️ 3. Evaluation Scenarios

DRAS v2.0 is benchmarked across four distinct disaster scenarios, spanning supervised benchmarks, verified ground truth, surveyed points, and zero-shot generalisation:

| ID | Scenario | Disaster Type | Location | Sensor / Source Data | Geometry Type | Ground-Truth Status |
|:--:|---|---|---|---|:--:|---|
| **1** | **Woolsey Fire (2018)** | Wildfire | California, USA | Maxar WorldView-2/3 (0.5m VHR) | Polygon | Standard Supervised Benchmark (xBD) |
| **2** | **Chamoli Flash Flood (2021)** | Glacial Surge / Flood | Uttarakhand, India | Copernicus Sentinel-2 L2A (10m) + NERC EIDC | Polygon | Verified Ground Truth (6,455 native footprints) |
| **3** | **Cyclone Fani (2019)** | Tropical Cyclone | Odisha, India | Copernicus Sentinel-2 L2A (10m) + EMSR357 | Point | Expert Point Grading (9,777 surveyed points) |
| **4** | **Dharali Flash Flood (2025)** | Cloudburst / Debris Fan | Uttarakhand, India | Sentinel-2 L2A + ISRO Cartosat-2S & Bhuvan | Polygon | Qualitative Zero-Shot Transfer (20.4 ha debris extent) |

---

## 🏗️ 4. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER (React 19 + Vite)                   │
│  - Port 5173                                                                │
│  - 3-Column Operations Command Map (Assess | Prioritise | Respond)          │
│  - Real-Time Leaflet GIS Vector Layers, Softmax Bars & Glow Route Overlays   │
│  - Executive Incident Dashboard & Empirical Research Benchmarks             │
│  - Dark / Light Theme System with Persistent Design Tokens                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST (JSON / GeoJSON)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 APPLICATION BACKEND (Spring Boot 3 / Java 24)                │
│  - Port 8081                                                                │
│  - ScenarioController, MapLayerController, PriorityController, RouteService  │
│  - Hibernate Spatial (PostGIS Geometry Mapping & GeoJSON Serialization)     │
│  - Spring WebClient Microservice Orchestration                              │
└───────────────────┬─────────────────────────────────┬───────────────────────┘
                    │ Spatial SQL (JDBC)              │ HTTP REST
                    ▼                                 ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│   SPATIAL DATABASE (PostgreSQL 17)   │  │   MODEL & ROUTING SERVICE         │
│  - PostGIS 3.5 Spatial Extension     │  │   (FastAPI / Python 3.12)         │
│  - disaster_scenarios                │  │  - Port 8000                      │
│  - damage_predictions                │  │  - Stage 1: U-Net ResNet34        │
│  - buildings & hazard_zones          │  │  - Stage 2: Siamese Damage Class  │
│  - operational_zones                 │  │  - 5-Factor Priority Engine       │
│  - roads (with blockage flags)       │  │  - NetworkX Dijkstra Dual Router  │
│  - hospitals & relief shelters       │  │  - Model Version Registry         │
│  - priority_assessments & routes     │  └───────────────────────────────────┘
└──────────────────────────────────────┘
```

---

## 💻 5. Technology Stack

| Layer | Technologies | Role / Purpose |
|---|---|---|
| **Frontend** | React 19, Vite, Leaflet.js, React-Leaflet, Axios, React Router 7 | Responsive GIS command map, layer controls, dual route visualizer, light/dark themes |
| **Backend API** | Spring Boot 3.4, Java 24, Spring Data JPA, Hibernate Spatial, JTS Topology Suite | REST API gateway, spatial entities, GeoJSON serializers, scenario orchestrator |
| **Model Service** | FastAPI, Uvicorn, PyTorch 2.6, Segmentation Models PyTorch, OpenCV, NetworkX 3.4, Shapely | Multi-temporal U-Net inference, 5-factor priority engine, graph hazard routing |
| **Spatial Database** | PostgreSQL 17, PostGIS 3.5 Spatial Extension | Spatial indexing (GIST), polygon queries, road blockage attribution, zone topology |
| **Base Maps** | OpenStreetMap, CartoDB Positron/Dark | Free tile services (no proprietary API keys required) |

---

## 🧠 6. Two-Stage Decoupled Computer Vision Pipeline

Standard single-stage semantic segmentation networks suffer catastrophic performance drops when transferred from 0.5m VHR imagery to 10m Sentinel-2 satellite data in mountainous terrain (initial experiments yielded $\approx 15\%$ pixel accuracy and $<3\%$ building mIoU due to $>99.5\%$ background dominance). 

DRAS v2.0 solves this via a **Two-Stage Decoupled Architecture**:

```
[Pre-Disaster Satellite Tile] ──┐
                                ├──▶ [Stage 1: Binary Localization U-Net] ──▶ [Localized Settlement Mask]
[Post-Disaster Satellite Tile] ─┘      (97.70% Pixel Acc / 83.13% Bal Acc)                 │
                                                                                           ▼
                                                                           [Extracted Verified Footprints]
                                                                                           │
[Pre Crop / Feature Vector]  ──┐                                                           ▼
                               ├──▶ [Stage 2: Structural Condition Classifier] ──▶ [Native Damage State]
[Post Crop / Feature Vector] ─┘      (Evaluated on Verified Footprints)               (Softmax Distribution)
```

1. **Stage 1 — Settlement & Building Boundary Localization**:
   - ResNet34 ImageNet-pretrained backbone with U-Net decoder operating on multi-temporal 6-channel inputs.
   - Evaluates building presence against natural background scree and vegetation.
   - **Performance**: $97.70\%$ pixel accuracy, $83.13\%$ balanced accuracy, $>99.9\%$ background specificity.
2. **Stage 2 — Building Condition Classification**:
   - Evaluated strictly on verified structural footprints (or expert surveyed points).
   - Preserves native annotation protocols (binary grading for Chamoli, point damage grading for Fani).

---

## 🔬 7. Empirical Research & Model Evaluation Benchmarks

DRAS v2.0 conducted a 5-experiment progressive fine-tuning and evaluation campaign:

| Experiment | Configuration / Model Architecture | Raw Accuracy | Balanced Accuracy | Macro F1 | Damaged-Class Recall | Minority F1 | Operational Status |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| **Exp 0** | Baseline (xBD Pretrained Weights, U-Net ResNet34) | 15.91% | 27.39% | 9.45% | 0.08% | 0.10% | Zero-shot baseline on Indian Sentinel-2 tiles |
| **Exp 1** | India-Tuned v1 (Unweighted Cross-Entropy) | 15.39% | 26.60% | 8.54% | 0.19% | 0.10% | Collapsed to background due to 99.55% background pixels |
| **Exp 2** | India-Tuned v2 (Class-Weighted Loss `[0.15, 1.0, 3.5, 3.0, 5.0]`) | 19.21% | 26.77% | 7.94% | 0.71% | 0.14% | Selected operational checkpoint (+3.30 pp pixel gain) |
| **Exp 3a** | Stage 1 Decoupled Building Localization | **97.70%** | **83.13%** | **59.95%** | **68.42%** | **21.07%** | Settlement cluster segmentation against terrain |
| **Exp 3b** | Stage 2 Chamoli Native Footprints (6,455 polygons) | **92.03%** | **83.56%** | **52.20%** | **75.00% (24/32)** | **8.58%** | Native binary condition (Intact vs Damaged) |
| **Exp 3c** | Stage 2 Chamoli Manual Subset (166 buildings) | **94.58%** | **91.18%** | **90.81%** | **100.00%** | **86.21%** | 3 represented classes (Minor Damage = 0 support) |
| **Exp 3d** | Stage 2 Cyclone Fani Point Grading (9,777 points) | **82.35%** | **59.00%** | **60.26%** | **92.90%** | **45.05%** | Surveyed damage points (OSDMA / EMSR357) |
| **Exp 4** | Controlled Focal+Dice Pass ($\gamma=2.0$, weights `[0.10, 1.2, 4.0, 3.5, 6.0]`) | 26.32% | — | — | — | — | Benchmarked; v2 retained due to 10m GSD limit |

### ⚠️ Critical Scientific Disclosures & The Accuracy Paradox
- **The Chamoli 98.98% Metric**: In the NERC EIDC Chamoli ground truth, $6,389$ of $6,455$ buildings ($98.98\%$) are intact. A trivial classifier predicting "intact" for every building achieves **98.98% raw accuracy while detecting ZERO (0/32) damaged structures (0% recall, 0% F1)**. DRAS reports empirical model performance: **92.03% raw accuracy, 83.56% balanced accuracy, and 75.00% damaged recall (24 of 32 damaged buildings detected)**.
- **Cyclone Fani**: Evaluated strictly as point observations from Copernicus EMSR357 rapid mapping ($9,777$ surveyed points). Points are **NOT** buffered into synthetic building polygons.
- **Dharali 2025**: Zero verified building-level damage ground truth exists for this event. Quantitative damage accuracy is honestly reported as **N/A**, while qualitative zero-shot operational sectoring and routing are fully supported using the $20.4\text{ ha}$ ISRO debris fan polygon.

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

### Dynamic Disaster Weight Profiles:
- **Flash Flood**: Severity $30\%$, Population $20\%$, Infrastructure $15\%$, Accessibility $25\%$, Hazard $10\%$
- **Landslide**: Severity $35\%$, Population $20\%$, Infrastructure $15\%$, Accessibility $15\%$, Hazard $15\%$
- **Flood**: Severity $30\%$, Population $25\%$, Infrastructure $20\%$, Accessibility $10\%,$ Hazard $15\%$
- **Wildfire**: Severity $40\%$, Population $25\%$, Infrastructure $20\%$, Accessibility $15\%$, Hazard $0\%$

**Triage Urgency Tiers**: `CRITICAL` ($\ge 70\%$), `HIGH` ($50\% - 69\%$), `MEDIUM` ($30\% - 49\%$), `LOW` ($< 30\%$).

---

## 🧭 9. Operational Sectors & Dual Routing Engine

### Operational Command Sectors
Structures are clustered into macro-level command zones. Each zone computes:
- Aggregated building counts (total, major damage, destroyed)
- Estimated affected population
- Number of blocked roadway corridors
- Overall **Zone Criticality Index** and **Apex Priority Building ID** for immediate dispatch

### Dual Hazard-Aware Routing Engine
Built on dynamic NetworkX graphs constructed from OpenStreetMap road networks. Implements two distinct operational workflows:
1. **Response Access Routing**: Navigates responders from the Emergency Operations Center (EOC) / Staging Base to the selected priority structure or zone apex.
2. **Civilian Evacuation Routing**: Navigates evacuees from the affected structure to the nearest operational hospital or relief shelter.
3. **Obstacle Detouring**: Active road obstructions and hazard zones incur a $10^6\times$ weight penalty, forcing the router to find verified passable detours ($<20\text{ ms}$ calculation latency).

---

## 📸 10. User Interface & Operations Previews

| Subsystem | View Description |
|---|---|
| **Operations Command Map** | 3-Column GIS layout with spatial view toggles (Buildings / Zones / Both), 3-step operational workflow (Assess, Prioritise, Respond), multi-factor triage breakdown, and authoritative route rendering with glow lines and directional badges. |
| **Incident Executive Dashboard** | High-level situational awareness: KPI cards, damage distribution bars, priority breakdown, and medical / shelter resource capacity gauges. |
| **Research Metrics Dashboard** | Academic benchmarks: Baseline evaluation, India-tuned progression (Exp 0–4), confusion matrices, balanced accuracy audits, and dataset provenance registries. |
| **Incident Reports** | Printable and exportable (JSON/CSV) civil defence situation reports with building-level damage and triage records. |

---

## ⚡ 11. Local Setup Instructions

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

### 3. Start Python FastAPI Model & Routing Service
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

### 4. Start Spring Boot 3 Backend
```bash
cd backend
# On Windows:
.\mvnw.cmd spring-boot:run
# On Linux/macOS:
./mvnw spring-boot:run
```

### 5. Start React 19 Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 🧪 12. Automated Verification & Test Suite

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

## ⚠️ 13. Limitations & Scientific Disclosures

- **Decision-Support Classification**: DRAS v2.0 provides empirical decision-support estimates. It does not supersede statutory emergency management protocols or certified structural engineering inspections.
- **Resolution Constraints**: Free $10\text{m}$ Sentinel-2 surface reflectance provides rapid revisit times during disasters, but individual Himalayan dwellings ($8\text{m}\times 8\text{m}$) occupy $1-2$ pixels. Decoupling localization from damage grading mitigates boundary blur but does not replace high-resolution drone reconnaissance.
- **Population Density Proxies**: Occupancy estimates are derived from building footprint area heuristics and require local census calibration for operational deployment.

---

## 📜 14. License & Data Attribution

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
├── README.md                           # Comprehensive documentation
├── ai-service/                         # FastAPI Model & Routing Microservice
│   ├── app/
│   │   ├── analysis/                   # 5-factor priority engine & zone generator
│   │   ├── api/                        # REST endpoints (CV, routing, evaluation, health)
│   │   ├── cv/                         # Stage 1 U-Net, Stage 2 Siamese, loss & metrics
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
│   │   ├── components/Navigation/      # TopBar (with theme toggle), Breadcrumbs
│   │   ├── context/ThemeContext.jsx    # Dark / Light theme design tokens
│   │   ├── pages/                      # DisasterMap, ExecutiveDashboard, Research, Reports
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
└── scripts/                            # E2E test suite & training pipelines
```\n