# 🛰️ Disaster Management Decision-Support Platform (DM-DSS)

An end-to-end Geospatial AI platform combining multi-temporal satellite Computer Vision, Multi-Factor Explainable Priority Triage, and Hazard-Aware Evacuation Routing for disaster response operations.

---

## 📌 1. Problem Statement
During extreme natural hazards (wildfires, hurricanes, floods, earthquakes), emergency response agencies face critical information bottlenecks:
1. **Slow Damage Assessment**: Manual aerial/satellite photo interpretation takes days to weeks, delaying immediate search-and-rescue.
2. **Extreme Class Imbalance**: Undamaged background structures heavily outnumber severely damaged buildings in satellite tiles ($>38 : 1$), causing traditional single-stage deep learning models to fail.
3. **Black-Box Triage**: Existing prioritization models produce opaque scores without human-interpretable rationale for resource allocation.
4. **Impaired Evacuation Routing**: Standard road navigation engines (Google Maps, Waze) do not dynamically incorporate active wildfire hazard closures or debris blockages during disaster states.

---

## 💡 2. Proposed Solution
The **Disaster Management Decision-Support Platform (DM-DSS)** solves these challenges through a modular, four-layer architecture:
- **Two-Stage Decoupled Computer Vision Pipeline**: Decouples building boundary localization from damage severity classification to prevent background collapse.
- **PostGIS Spatial Data Layer**: Spatially indexes building footprints, road corridors, and emergency medical and shelter facilities in WGS84 coordinates.
- **Explainable Multi-Factor Priority Engine**: Calculates transparent triage scores across Damage Severity, Population Exposure, Infrastructure Proximity, and Road Accessibility.
- **Hazard-Aware Graph Router**: Computes Dijkstra shortest-path evacuation corridors that dynamically detour around active road closures to reach the closest operational hospital or relief shelter.

---

## 🏗️ 3. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER (React 19 + Vite)                   │
│  - Port 5173                                                                │
│  - 3-Column Operations Command Map (Damage, Priority & Routing Modes)       │
│  - Real-Time Leaflet Vector Polygons, Softmax Bars & Detour Overlays        │
│  - Executive Incident Dashboard & Empirical Research Benchmarks             │
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
│   SPATIAL DATABASE (PostgreSQL 17)   │  │   AI & ROUTING MICROSERVICE       │
│  - PostGIS 3.5 Spatial Extension     │  │   (FastAPI / Python 3.12)         │
│  - disaster_scenarios                │  │  - Port 8000                      │
│  - damage_predictions                │  │  - Stage 1: U-Net ResNet34        │
│  - buildings (ground-truth xBD)      │  │  - Stage 2: Siamese ResNet18      │
│  - roads (with blockage flags)       │  │  - Explainable Priority Engine    │
│  - hospitals & shelters              │  │  - NetworkX Dijkstra Router       │
│  - priority_assessments & routes     │  └───────────────────────────────────┘
└──────────────────────────────────────┘
```

### Main Data-Flow Diagram:
```
[Pre/Post Satellite Images] ──▶ [Stage 1: Binary U-Net] ──▶ [Localized Building Polygons]
                                                                     │
                                                                     ▼
[Extracted Crop Pairs]      ──▶ [Stage 2: Siamese ResNet18] ──▶ [4-Class Softmax Dist]
                                                                     │
                                                                     ▼
[Damage Predictions]        ──▶ [PostGIS Spatial Ingestion] ──▶ [Spring Boot REST API]
                                         │                           │
                                         ▼                           ▼
[Road Blockages + Hospitals]──▶ [Explainable Priority]      ──▶ [Leaflet Operations Map]
                                         │                           │
                                         ▼                           ▼
[OpenStreetMap Graph]       ──▶ [Dijkstra Hazard Router]    ──▶ [Suggested Route Detour]
```

---

## ✨ 4. Main Features

- **Decoupled 2-Stage Damage Assessment**: Stage 1 detects structural footprints ($79.04\%$ recall); Stage 2 classifies 4 damage tiers (`no-damage`, `minor-damage`, `major-damage`, `destroyed`).
- **Interactive Operations Command Map**: 3-column command layout with layer toggles, confidence filtering ($0\% - 100\%$), and dynamic mode switching.
- **Explainable Triage Scoring**: Transparent 4-factor scoring breakdown with plain-language rationale.
- **Hazard-Aware Evacuation Routing**: Dijkstra routing dynamically penalizes blocked roads ($10^6\times\text{cost}$) to navigate safely to the nearest hospital or relief shelter ($<200\text{ ms}$ latency).
- **Incident Commander Executive Dashboard**: Aggregate damage proportions, priority urgency distributions, and medical bed / shelter capacity tracking.
- **Empirical Research Benchmarks**: Transparent model metrics on held-out xBD disaster partitions.

---

## 💻 5. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Leaflet.js, React-Leaflet, Axios, Vanilla CSS (Command Design System) |
| **Backend API** | Spring Boot 3.4.2, Java 24, Spring Data JPA, Hibernate Spatial, JTS Topology Suite |
| **AI & Routing Microservice** | FastAPI, Uvicorn, PyTorch 2.6 (CPU-Optimized FP32), Segmentation Models PyTorch, OpenCV, NetworkX 3.4, Shapely |
| **Spatial Database** | PostgreSQL 17, PostGIS 3.5 Spatial Extension |
| **Dataset Benchmark** | Maxar xBD Multi-Hazard Satellite Imagery Benchmark |

---

## 🧠 6. Computer Vision Pipeline

```
[Pre-Disaster RGB] ──┐
                     ├──▶ [U-Net + ResNet34 Encoder] ──▶ [Binary Building Mask] ──▶ [Polygonizer]
[Post-Disaster RGB] ─┘          (6-Channel Input)             (Pixel IoU: 43.08%)          │
                                                                                           ▼
                                                                                 [Building Crops]
                                                                                           │
[Pre Crop]  ──▶ [ResNet18 Backbone] ──▶ f_pre  (512-d) ┐                                   ▼
                                                       ├──▶ [f_pre, f_post, f_diff] ──▶ [Softmax]
[Post Crop] ──▶ [ResNet18 Backbone] ──▶ f_post (512-d) ┘         (1,536-dim)          (4 Classes)
```

1. **Stage 1 (Building Localization)**:
   - ResNet34 ImageNet-pretrained backbone with U-Net decoder taking concatenated 6-channel Pre+Post imagery.
   - Combined Weighted $\text{BCE} (\text{pos\_weight}=5.0) + \text{Soft Dice Loss}$.
2. **Stage 2 (Building Damage Classification)**:
   - Siamese ResNet18 feature extractor sharing weights between multi-temporal crops.
   - Computes absolute difference vector $f_{\text{diff}} = |f_{\text{pre}} - f_{\text{post}}|$ and concatenates $[f_{\text{pre}}, f_{\text{post}}, f_{\text{diff}}] \in \mathbb{R}^{1536}$.
   - Evaluates a 3-layer MLP classification head with Dropout and Class-Weighted Cross-Entropy.

---

## 🗺️ 7. GIS Pipeline & PostGIS Integration

- **Coordinate System**: WGS84 (`EPSG:4326`) for global geospatial compatibility.
- **Database Tables**:
  - `disaster_scenarios`: Incident metadata and convex hull boundary polygons.
  - `damage_predictions`: Individual building polygons, damage classes, confidences, and 4-class softmax vectors.
  - `buildings`: Ground-truth benchmark polygons from xBD annotations.
  - `roads`: OpenStreetMap road centerlines with `is_blocked` status flags and blockage reasons.
  - `hospitals` & `shelters`: Point geometries with capacities and emergency contacts.
  - `priority_assessments` & `evacuation_routes`: Computed decision-support results and route LineStrings.
- **Spatial Queries**: Native PostGIS geometry operations (`ST_Within`, `ST_Distance`, `ST_AsGeoJSON`).

---

## 🚨 8. Explainable Priority Triage Engine

The priority engine ranks structures by urgent response need using a 4-factor multi-criteria model:

$$\text{Priority Score} = 0.40 \cdot S + 0.25 \cdot P + 0.20 \cdot I + 0.15 \cdot A$$

| Factor | Weight | Formulation / Data Source |
|---|---|---|
| **Damage Severity ($S$)** | **40%** | $\text{Destroyed} = 1.0, \text{Major} = 0.75, \text{Minor} = 0.40, \text{No Damage} = 0.0$ |
| **Population Exposure ($P$)** | **25%** | Scaled structural footprint proxy ($0.0 - 1.0$) |
| **Infrastructure Proximity ($I$)** | **20%** | Inverse spatial distance to nearest operational hospital or relief shelter |
| **Accessibility Impairment ($A$)** | **15%** | Road network penalty based on adjacent blocked or hazardous corridors |

**Urgency Tiers**: `CRITICAL` ($\ge 70\%$), `HIGH` ($50\% - 69\%$), `MEDIUM` ($30\% - 49\%$), `LOW` ($< 30\%$).

---

## 🧭 9. Hazard-Aware Routing Engine

- **Road Graph Construction**: Built dynamically from OpenStreetMap highway segments via NetworkX.
- **Hazard Penalty Formulation**:
  $$W(e) = \begin{cases} \text{length}(e), & \text{if } e \text{ is passable} \\ 10^6 \cdot \text{length}(e), & \text{if } e \text{ is blocked} \end{cases}$$
- **Routing Algorithms**: Dijkstra and A* shortest paths with automatic obstacle avoidance.
- **Performance**: Sub-$200\text{ ms}$ calculation latency on single-thread CPU.

---

## 📊 10. Dataset & Evaluation Benchmark

Evaluated across **68 disaster-stratified pre/post satellite image pairs** (71.3M total pixels, 3,495 annotated buildings) from the xBD dataset:

| Split | Image Pairs | Building Count | No Damage | Minor Damage | Major Damage | Destroyed |
|---|---|---|---|---|---|---|
| **Training (70.6%)** | **48** | **2,179** | 1,096 (50.3%) | 351 (16.1%) | 339 (15.6%) | 393 (18.0%) |
| **Validation (14.7%)** | **10** | **622** | 338 (54.3%) | 114 (18.3%) | 85 (13.7%) | 85 (13.7%) |
| **Testing (14.7%)** | **10** | **694** | 583 (84.0%) | 75 (10.8%) | 15 (2.2%) | 21 (3.0%) |

---

## 🔬 11. Empirical Research & Reconciled Benchmark Results

### Stage 1: Building Localization (Held-Out Test Set, 2.62M Pixels)
| Metric Name | Mathematical Definition | Evaluation Level | Value |
|---|---|---|---|
| **Building IoU (Jaccard Index) [PRIMARY]** | $\frac{TP}{TP + FP + FN} = \frac{235,025}{545,534}$ | Dense Pixel Level | **43.08%** |
| **Sørensen–Dice Coefficient (F1-Score)** | $\frac{2 \cdot TP}{2 \cdot TP + FP + FN} = \frac{470,050}{780,559}$ | Dense Pixel Level | **60.22%** |
| **Pixel Precision** | $\frac{TP}{TP + FP} = \frac{235,025}{483,212}$ | Dense Pixel Level | **48.64%** |
| **Pixel Recall (Sensitivity)** | $\frac{TP}{TP + FN} = \frac{235,025}{297,347}$ | Dense Pixel Level | **79.04%** |
| **Overall Pixel Accuracy** | $\frac{TP + TN}{\text{Total Pixels}} = \frac{2,310,931}{2,621,440}$ | Dense Pixel Level | **88.16%** |
| **Instance Building Recovery Rate** | $\frac{\text{GT Buildings Overlapping} \ge 1\text{ px}}{\text{Total GT Buildings}}$ | Object / Instance Level | **84.04%** |
| **Full Image Pair CPU Latency** | Mean wall-clock inference per $1024 \times 1024$ pair | Intel i5-1335U CPU | **660.4 ms** |

### Stage 2: Damage Classification (Siamese ResNet18)
| Evaluation Protocol | Overall Accuracy | Macro F1 | Minor Damage F1 | Destroyed F1 | CPU Throughput |
|---|---|---|---|---|---|
| **Oracle (Ground-Truth Polygons)** | **50.58%** | **31.99%** | **43.43%** | **12.16%** | **150.3 bldgs/sec** |
| **End-to-End (Stage 1 $\rightarrow$ Stage 2)** | **41.58%** | **28.45%** | **38.20%** | **10.85%** | **2.84 s / full tile** |

---

## 📸 12. UI & Operations Previews

| Subsystem | View Description |
|---|---|
| **Operations Command Map** | 3-Column GIS layout with vector damage footprints, priority triage breakdown, and blue evacuation route detouring around blocked canyon roads. |
| **Executive Dashboard** | Incident Commander KPI summary, damage severity distribution bars, priority breakdown, and medical/shelter inventories. |
| **AI Model Evaluation** | Academic research metrics table, confusion matrix, per-class metrics, and CPU latency profiles. |

---

## ⚡ 13. Local Setup Instructions

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

### 2. Environment Variables Configuration
Copy the environment template:
```bash
cp .env.example .env
```

### 3. Start Python FastAPI AI & Routing Service
```bash
cd ai-service
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. Start Spring Boot 3 Backend
```bash
cd backend
# On Windows:
.\mvnw.ps1 spring-boot:run
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

## 🧪 14. Automated Demonstration & Verification
To run the automated 9-step end-to-end verification test suite:
```bash
python scripts/run_final_end_to_end_test.py
```

---

## ⚠️ 15. Limitations & Scientific Disclosures

- **Decision Support Only**: This platform provides decision-support estimates and does not replace official emergency command decisions.
- **Population Exposure**: Occupancy densities are derived from structural footprint areas as *Controlled Demonstration Proxies*.
- **Road Blockages**: Road blockage inputs represent controlled incident scenarios and require physical field verification during active emergencies.
- **Rare Class Challenge**: Severe damage classes (Major Damage / Destroyed) suffer from extreme natural class rarity in satellite datasets.

---

## 🔮 16. Future Work

- Integration with multi-spectral satellite sensors (Sentinel-2, PlanetScope).
- Synthetic Aperture Radar (SAR) fusion for cloud-penetrating flood and storm damage assessment.
- Dynamic mobile field agent telemetry and real-time roadblock reporting.
- Hierarchical multi-scale vision transformers (Swin / SegFormer) on GPU clusters.

---

## 📜 17. License & Data Attribution

- **Source Code**: MIT License.
- **Dataset Attribution**: Satellite imagery and building annotations provided by the **xBD Multi-Hazard Dataset** (Maxar Technologies / Defense Innovation Unit).
- **Base Maps**: &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

---

## 📁 18. Project Structure

```
Disaster_Management_System/
├── .env.example                # Template for environment configuration
├── .gitignore                  # Root Git ignore rules
├── README.md                   # Comprehensive project documentation
├── ai-service/                 # FastAPI AI & Routing Microservice
│   ├── app/
│   │   ├── analysis/           # Priority ranking engine
│   │   ├── api/                # REST endpoints (CV, Routing, Health)
│   │   ├── cv/                 # Stage 1 U-Net & Stage 2 Siamese Classifier
│   │   └── routing/            # NetworkX Dijkstra hazard router
│   ├── outputs/                # Empirical JSON evaluation benchmarks
│   └── requirements.txt        # Python dependencies
├── backend/                    # Spring Boot 3 REST Backend
│   ├── pom.xml                 # Maven dependencies (Hibernate Spatial, JTS)
│   └── src/main/java/com/disastermgmt/
│       ├── config/             # CORS, Jackson GIS serialization
│       ├── controller/         # Scenario, MapLayer, Priority, Route controllers
│       ├── entity/             # JPA entities with PostGIS Geometry mapping
│       ├── repository/         # Spatial repositories
│       └── service/            # Business & Spatial routing logic
├── frontend/                   # React 19 + Vite Frontend
│   ├── src/
│   │   ├── pages/              # Landing, DisasterMap, Dashboard, Metrics, Health
│   │   ├── services/           # Axios API client
│   │   └── App.jsx             # Top navigation & command shell
│   └── package.json            # Frontend dependencies (Leaflet, React-Leaflet)
├── docs/                       # Technical Documentation
│   ├── ARCHITECTURE.md         # Full-stack system architecture
│   ├── DATA.md                 # Dataset specifications & schema
│   ├── DEMO.md                 # 10-Minute faculty demonstration script
│   └── MODEL.md                # Detailed CV model equations & metrics
└── scripts/                    # Ingestion, training & automated test suites
```
