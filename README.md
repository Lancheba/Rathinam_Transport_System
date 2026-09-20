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
| Announcements (staff/admin post, everyone reads) | ✅ Complete |
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

# 4. Create your own admin account
python manage.py createsuperuser

# 5. Define the parking ground and its slots (use your measured values)
python manage.py create_slots --name "<ground name>" --length <m> --width <m> \
    --entrance-width <m> --exit-width <m> --rows <n> --slots-per-row <n>

# 6. Start server
python manage.py runserver
```

The database starts empty. Nothing is pre-loaded: add buses, sensors and staff
accounts from the dashboard or the Django admin site.

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
| GET | `/api/buses/search/?q=<bus_number>` | Find bus by number |
| GET | `/api/parking/slots/` | All parking slots |
| GET | `/api/parking/summary/` | Occupancy stats |
| POST | `/api/sensors/rfid/` | Simulate RFID detection |
| POST | `/api/sensors/occupancy/` | Simulate ultrasonic sensor |
| GET | `/api/events/` | Parking event log |
| POST | `/api/optimization/run/` | Run optimization engine |
| POST | `/api/optimization/apply/` | Apply optimized layout |
| GET | `/api/announcements/` | List announcements (public) |
| POST | `/api/announcements/` | Post an announcement (admin / staff only) |
| DELETE | `/api/announcements/<id>/` | Delete one (its author, or an admin) |

### Simulate RFID Detection

```bash
curl -X POST http://localhost:8000/api/sensors/rfid/ \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid": "<rfid_uid of a registered bus>", "event_type": "PARKED"}'
```

**Response:**
```json
{"bus": "<bus_number>", "event_type": "PARKED", "slot": "<row><slot>"}
```

---

## 📢 Announcements

Admins and transport staff can post notices that every student sees.

- **Read:** anyone — open the 🔔 bell in the top bar → **Announcements** tab. A red dot on the bell means there is something new.
- **Post:** log in as admin or staff → bell → **New announcement**. Pick a priority (Info / Important / Urgent) so it stands out.
- **Delete:** the author can delete their own notice; admins can delete any. Students never see the post/delete controls, and the server enforces this too.
- The bell's **Activity** tab still shows live parking events.

---

## 🗄️ Database Models

```
ParkingGround (dimensions you provide)
    └── ParkingSlot (rows and slots per row set by create_slots)
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
{"rfid_uid": "<scanned-uid>", "sensor_id": "<sensor-id>", "event_type": "DETECTED"}
```

The dashboard will update in real time.

---

## 📁 Project Structure

```
Rathinam_Smart_Bus_Parking/
├── config/          # Django settings & main URLs
├── accounts/        # User auth + JWT + roles
├── buses/           # Bus model + CRUD API
├── parking/         # Parking ground, slots, create_slots command
├── sensors/         # RFID/ultrasonic event APIs
├── announcements/   # Staff/admin notices for students
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
