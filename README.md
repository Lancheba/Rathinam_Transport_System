# 🚍 Smart College Bus Parking & Retrieval System

**Rathinam College of Engineering** | C29 Final Project

A full-stack IoT-enabled smart parking system that eliminates blocked-bus problems at college bus yards using RFID detection, real-time tracking, and constraint-based optimization.

---

## 🏗️ Current Build Status

| Component | Status |
|---|---|
| Django REST API | ✅ Complete |
| JWT Authentication (Admin / Staff / Student roles) | ✅ Complete |
| Bus CRUD API | ✅ Complete |
| Parking Ground + Slot API | ✅ Complete |
| RFID Sensor Event API | ✅ Complete |
| Ultrasonic Sensor API | ✅ Complete |
| Parking Event Log API | ✅ Complete |
| Optimization Engine | ✅ Complete |
| Swagger API Docs | ✅ Complete (`/api/docs/`) |
| React + TypeScript Dashboard | ✅ Complete |
| 2D Interactive Parking Map | ✅ Complete |
| Student Bus Finder | ✅ Complete |
| Sensor Monitoring Page | ✅ Complete |
| Optimization Comparison UI | ✅ Complete |
| ESP32 + RFID Hardware | ⬜ Phase 2 |
| 3D Parking Visualization | ⬜ Phase 2 |
| PostgreSQL + Deployment | ⬜ Phase 2 |

---

## 🚀 Quick Start

### Backend (Django)

```bash
# 1. Create & activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# 2. Install packages
pip install -r requirements.txt

# 3. Run migrations
python manage.py migrate

# 4. Seed demo data (32 slots + 8 buses + sensors + users)
python manage.py seed_demo_data

# 5. Start server
python manage.py runserver
```

**Demo credentials:**
- Admin: `admin` / `admin123`
- Staff: `staff` / `staff123`

### Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm run dev      # → http://localhost:3000
```

---

## 📡 API Reference

Once the server is running, visit **http://localhost:8000/api/docs/** for interactive Swagger documentation.

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Get JWT tokens |
| GET | `/api/buses/` | List all buses |
| GET | `/api/buses/search/?q=B04` | Find bus by number |
| GET | `/api/parking/slots/` | All parking slots |
| GET | `/api/parking/summary/` | Occupancy stats |
| POST | `/api/sensors/rfid/` | Simulate RFID detection |
| POST | `/api/sensors/occupancy/` | Simulate ultrasonic sensor |
| GET | `/api/events/` | Parking event log |
| POST | `/api/optimization/run/` | Run optimization engine |
| POST | `/api/optimization/apply/` | Apply optimized layout |

### Simulate RFID Detection

```bash
curl -X POST http://localhost:8000/api/sensors/rfid/ \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid": "DEMO-RFID-004", "event_type": "PARKED"}'
```

**Response:**
```json
{"bus": "B04", "event_type": "PARKED", "slot": "A5"}
```

---

## 🗄️ Database Models

```
ParkingGround (60m × 35m demo)
    └── ParkingSlot (rows A–D, slots 1–8 each = 32 total)
            └── Bus (FK — which bus occupies this slot)

Bus ─── ParkingEvent (history log)
Sensor ─┘
```

---

## 🤖 Optimization Algorithm

**Strategy:** Sort all parked buses by departure time (earliest first), then assign them to slots starting from slot 1 (closest to the exit) within each row.

**Effect:** The bus that leaves earliest is always in the front slot — it is never blocked by a bus that leaves later.

**Input:**
- Current slot assignments
- Bus departure times

**Output:**
- Recommended layout (zero blocked buses)
- Number of movements required
- Current vs. optimised comparison

---

## 🖥️ Dashboard Pages

| Page | URL | Description |
|---|---|---|
| Dashboard | `/` | Stats + live parking map + recent events |
| Parking Map | `/parking` | Full 2D color-coded slot grid |
| Buses | `/buses` | All buses with parking info |
| Optimise | `/optimize` | Run & apply optimization |
| Sensors | `/sensors` | Live sensor status |
| Find Bus | `/find` | Student-facing bus search (no login) |

---

## 🔌 ESP32 Integration (Phase 2)

The sensor API is ready. When the ESP32 + RC522 RFID reader is wired:

```cpp
// ESP32 Arduino sketch will POST to:
POST http://<your-server>/api/sensors/rfid/
{"rfid_uid": "<scanned-uid>", "sensor_id": "RFID-001", "event_type": "DETECTED"}
```

The dashboard will update in real time.

---

## 📁 Project Structure

```
Rathinam_Smart_Bus_Parking/
├── config/          # Django settings & main URLs
├── accounts/        # User auth + JWT + roles
├── buses/           # Bus model + CRUD API
├── parking/         # Parking ground, slots, seed commands
├── sensors/         # RFID/ultrasonic event APIs
├── optimization/    # Optimization engine + API
├── frontend/        # React + TypeScript dashboard
│   └── src/
│       ├── api/     # Axios client + endpoints
│       ├── pages/   # Dashboard, ParkingPage, BusFinder, etc.
│       ├── components/ # ParkingMap2D
│       ├── context/ # AuthContext (JWT)
│       └── types/   # TypeScript interfaces
├── manage.py
└── requirements.txt
```

---

## 🗓️ Roadmap

- [ ] ESP32 + RFID hardware integration
- [ ] Three.js 3D parking visualization
- [ ] Real-time WebSocket updates
- [ ] PostgreSQL migration for production
- [ ] Vercel (frontend) + Railway (backend) deployment
- [ ] C29 poster, presentation, and demo video

---

*Ground dimensions (60m × 35m) are placeholders. Replace with your measured field data.*
