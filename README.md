# Rathinam Smart Bus Parking & Transport System

**AI Immersion Task 01 (C29) · Rathinam Technical Campus**

A full-stack campus transport platform that combines **bus-ground parking intelligence**
(RFID gates, camera tracking, departure-time optimisation) with **QR + face-recognition
attendance** for the cab fleet, all behind a role-based web dashboard.

🚌 **Live demo:** [rathinam-transport-system.vercel.app](https://rathinam-transport-system.vercel.app)

| Part | Stack | Hosted on |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Vercel (auto-deploys from `main`) |
| Backend | Django + Django REST Framework + JWT | Railway (Gunicorn) |
| Database | PostgreSQL (SQLite locally) | Railway |
| Attendance clock | Django management command | Railway (second process, see `Procfile`) |

> **Note:** `/admin` and `/api/docs/` are served by the **Railway backend**, not by Vercel.
> Use your Railway URL, e.g. `https://<your-app>.up.railway.app/admin/`.
>
> The backend is **API-only**: it never serves the React app, and any unknown URL returns a JSON 404.
> Vercel builds and serves the frontend.

---

## Table of contents

1. [What it does](#what-it-does)
2. [The two problems it solves](#the-two-problems-it-solves)
3. [Roles and permissions](#roles-and-permissions)
4. [Architecture](#architecture)
5. [Attendance system](#attendance-system)
6. [Parking system](#parking-system)
7. [Project structure](#project-structure)
8. [Local setup](#local-setup)
9. [Deployment](#deployment)
10. [Environment variables](#environment-variables)
11. [API overview](#api-overview)
12. [Data model](#data-model)
13. [Management commands](#management-commands)
14. [Hardware and edge camera](#hardware-and-edge-camera)
15. [Testing](#testing)
16. [Troubleshooting](#troubleshooting)
17. [Known limitations](#known-limitations)
18. [AI usage declaration](#ai-usage-declaration)

---

## What it does

**Parking**
- 2D parking map with live slot status and blocked-bus detection
- Bus information: route, departure time, dimensions, RFID tag, current slot
- Optimisation engine that recommends a departure-time-sorted layout, which staff can apply
- Sensor monitoring (RFID gates, camera, optional ultrasonic slot sensors)
- Parking analytics and reports
- Student **Bus Finder**: search by bus number to see where a bus is parked

**Attendance**
- Cab in-charge generates a short-lived **QR code**; students scan it and verify with a **face match**
- Morning and evening sessions with an automatic close-out that marks non-scanners absent
- Per-student and cohort analytics, holiday marking, admin corrections
- Export to **Excel / PDF / CSV**

**Transport management**
- Student and teacher rosters linked to buses, with boarding points
- Driver "My Bus" page with maintenance and fuel logs
- Announcements (Info / Important / Urgent) posted by staff
- Complaints, feedback and suggestions (optionally anonymous, admin-only inbox)
- Light / dark / system theme, mobile bottom navigation

---

## The two problems it solves

1. **Blocked buses.** The bus ground has no painted slots. Buses park wherever there is space, so a
   bus that must leave early often gets boxed in behind later ones. Drivers then waste time finding
   whoever owns the blocking bus.
2. **Manual, fakeable attendance.** Paper or driver-ticked attendance is slow and easy to game.
   Here a student must scan a rotating QR *and* pass a face check, and records lock once marked.

---

## Roles and permissions

Public sign-up always creates a **Student** account. Every other role is assigned by an admin.

| Role | Can do |
|---|---|
| **Admin** (superuser / `ADMIN`) | Everything: manage buses, students, announcements, corrections, read complaints, apply optimiser layouts |
| **Transport Staff** (`STAFF`) | Manage buses/students, post announcements, view analytics and sensors, apply optimisation. Cannot read the complaints inbox |
| **Driver** (`DRIVER`) | See their own bus, roster and maintenance log; view attendance for their bus. Login also requires the **cab number** to match their assigned bus |
| **Cab In-Charge** (`INCHARGE`) | Generate QR codes and run attendance for their own bus; export their bus's report |
| **Student** (`STUDENT`) | Find buses, enrol their face, scan QR for attendance, view their own attendance, send feedback |

Devices (ESP32 readers, camera script) have no user account and authenticate with the
`X-Device-Key` header instead.

Permissions are enforced by the API; hidden menu links are only for a cleaner UI.

---

## Architecture

```mermaid
flowchart LR
  T["Bus RFID tag"] --> R["ESP32 + RFID reader (entry / exit)"]
  R -->|"POST /api/sensors/rfid/"| API
  C["Camera over the ground"] --> Y["YOLO + ByteTrack (edge/vision_tracker.py)"]
  Y -->|"POST /api/vision/positions/"| API
  API["Django REST API<br/>PostgreSQL · optimiser · attendance"] --> D["React dashboard (Vercel)"]
  D --> U["Admin · Staff · Driver · In-charge · Student"]
  Q["In-charge phone: QR"] --> API
  S["Student phone: scan + face-api.js"] -->|"POST /api/attendance/qr/scan/"| API
  K["run_attendance_clock (09:31 / 19:31)"] --> API
```

| Layer | Technology |
|---|---|
| Identification | RC522 (demo) or UHF (production) RFID + ESP32 |
| Localisation | YOLO (Ultralytics) + ByteTrack, image-to-ground homography |
| Backend | Django 4.2–6, DRF, SimpleJWT, drf-spectacular, WhiteNoise |
| Frontend | React 19, TypeScript, Vite, React Router 7, Axios, lucide-react |
| Face recognition | `face-api.js` in the browser (128-d embeddings, models in `frontend/public/models`) |
| QR | `qrcode` (server generation), `jsQR` (browser scanning) |
| Exports | `openpyxl` (Excel), `reportlab` (PDF), CSV |

---

## Attendance system

### Flow

1. **Enrolment (once).** A student links their roll number, then enrols their face on
   *Face Enrolment*. Explicit consent is required. The browser computes a 128-value embedding and
   only that embedding is stored, not a photo. Students get **3 enrolments** (first + retakes);
   after that an admin must reset it.
2. **QR.** During an open window, the bus's cab in-charge taps *Generate QR*. The token is valid for
   **60 seconds** (`QR_TOKEN_TTL_SECONDS`) and is tied to one bus, date and slot.
3. **Scan.** The student scans the QR, and their face is compared with the enrolled embedding
   (cosine distance, threshold `FACE_MATCH_THRESHOLD = 0.6`). A match creates a `PRESENT` record with
   source `QR_FACE`. The scan endpoint is throttled to 12 requests/min per user.
4. **Close-out.** The in-charge can stop the session, or the clock closes it automatically and marks
   every unmarked student `ABSENT` (source `AUTO_ABSENT`).
5. **Corrections.** Marked records lock. `PRESENT` can't be flipped by the driver, and `ABSENT`→`PRESENT`
   can only be done by an admin/staff **correction**, which is recorded with who and when.

### Attendance windows (Asia/Kolkata)

| Slot | QR window | Auto-finalise |
|---|---|---|
| Morning | 05:00 – 09:30 | 09:31 |
| Evening | 16:30 – 19:30 | 19:31 |

Outside these windows no QR can be generated. The auto-finalise job is
`python manage.py run_attendance_clock`, which runs as the `clock` process in the `Procfile`.
Alternatively, schedule `finalize_attendance --slot=MORNING|EVENING` with a Railway Cron Job.

### Reports and analytics

- Export attendance as Excel / PDF (`/api/attendance/export/`) or CSV report (`/api/attendance/report/`)
  with roll no., name, department, year, bus, route, boarding point, sessions, present, absent, %
- Analytics overview (cohort trend by month) and a per-student drill-down (staff/admin)
- Students see their own morning/evening history on *My Attendance*

---

## Parking system

The default ground is a grid of rows **A–D** with 10 slots each. **Slot 1 is at the gate.**

```
GATE  ←  Row A  [A1][A2] ... [A10]      bus slots
         Row B  [ reserved 1-3 ][B4] ... [B10]
         Row C  [ reserved 1-3 ][C4] ... [C10]
         Row D  [D1][D2] ... [D10]      bus slots
```

- `B1–B3` and `C1–C3` are **reserved for cars and bikes** and never count as blockers.
- A bus is **blocked** when another bus is parked in a lower-numbered slot of the same row
  (closer to the gate) and must leave later.
- The **optimiser** sorts buses by departure time and assigns earliest departures to the slots
  nearest the gate. It only *previews* a layout until staff press **Apply**.
- Ground size, row count and slots per row are set by `create_slots` (see below), so the layout is
  not hard-coded to 40 slots.

### How a bus is identified and located

- **Who:** an RFID reader at the entrance/exit posts the tag UID (`ENTRY` / `EXIT`).
- **Where:** the camera script detects buses, converts pixel positions to ground metres, and posts
  them. The server matches each track to the most recent unclaimed `ENTRY` (within
  `VISION_ENTRY_WINDOW_MIN`) and settles it into a slot after `VISION_STABLE_FRAMES` frames.
- Staff can manually assign an unidentified track to a bus from the dashboard.

---

## Project structure

```
config/          Django settings, URLs, throttles, JSON 404 handler
accounts/        Auth, roles, permissions, identity (student/teacher)
buses/           Bus model + API (driver / in-charge links, capacities)
students/        Students, face profiles, roster and face-enrolment APIs
attendance/      Sessions, records, QR tokens, teachers, exports, analytics, clock
parking/         Ground, slots, blocked-slot logic
sensors/         Sensor registry, RFID + occupancy endpoints, parking events
vision/          Camera tracks, linking to RFID entries
optimization/    Departure-time optimiser
announcements/   Staff notices
feedback/        Complaints / feedback / suggestions
maintenance/     Service and fuel logs per bus
edge/            vision_tracker.py (YOLO), calibration, geometry tests
hardware/        ESP32 sketches + HARDWARE.md
frontend/        React + TypeScript dashboard (Vite)
Procfile         web + clock processes for Railway
```

`patch_*.py`, `add_buses.py`, `park_buses.py` and `reset_buses.py` in the repo root are one-off
helper scripts used during development and are not needed to run the app.

---

## Local setup

**Requirements:** Python 3.12, Node.js 20+ (the Vercel build uses a current Node), npm.

### Backend

```powershell
python -m venv venv
venv\Scripts\activate                  # Windows PowerShell
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py create_slots --name "Rathinam Bus Ground" --length 60 --width 35 `
    --entrance-width 8 --exit-width 8 --rows 4 --slots-per-row 10
$env:DEVICE_API_KEY = "my-long-random-secret"
python manage.py runserver 0.0.0.0:8000
```

On macOS/Linux use `source venv/bin/activate` and `export DEVICE_API_KEY=...`.

To test attendance locally, run the clock in a second terminal:

```powershell
python manage.py run_attendance_clock
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000, proxies /api to http://127.0.0.1:8000
```

### Optional demo data

```bash
python manage.py seed_sensors
python manage.py seed_attendance_history --days 45
python manage.py seed_cab_attendance
```

---

## Deployment

**Deployment model:** frontend and backend deploy separately. Vercel builds and serves the React app;
Railway runs the Django API only. `frontend/dist` is build output: it is gitignored and never committed,
so Vercel builds it fresh on every deploy.

### Backend on Railway

1. Create a Railway project from this repo and add the **PostgreSQL** add-on
   (`DATABASE_URL` is set automatically).
2. Set the environment variables below.
3. The `web` process runs migrations, collects static files and starts Gunicorn:
   `python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
4. Add a second service (or process) for the `clock` entry so attendance closes automatically:
   `python manage.py run_attendance_clock`
5. Create the admin and the ground once (Railway shell):
   `python manage.py createsuperuser` and `python manage.py create_slots ...`

### Frontend on Vercel

1. Import the repo and set **Root Directory** to `frontend`.
2. Add the environment variable `VITE_API_BASE_URL=https://<your-app>.up.railway.app/api`.
3. Build command `npm run build` (runs `tsc -b && vite build`); `vercel.json` rewrites all routes to
   `index.html` for client-side routing.
4. On Railway, allow the Vercel domain: set `DJANGO_CORS_ORIGINS` and `DJANGO_CSRF_TRUSTED_ORIGINS`
   to `https://rathinam-transport-system.vercel.app`.

> **File encoding:** all source files must be saved as **UTF-8**. A file saved as Windows-1252
> (for example an em dash pasted from Word) makes the Vite/Rolldown build fail with
> `stream did not contain valid UTF-8`.

---

## Environment variables

### Backend (Railway / local shell)

| Variable | Purpose | Default |
|---|---|---|
| `DJANGO_DEBUG` | `1` for development, `0` in production | dev-friendly |
| `DJANGO_SECRET_KEY` | Long random string | insecure dev key |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames | `localhost,127.0.0.1` |
| `DJANGO_CORS_ORIGINS` | Allowed frontend origins (comma-separated) | none |
| `DJANGO_CORS_ORIGIN_REGEXES` | Optional regexes, e.g. Vercel preview URLs | none |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Trusted origins for CSRF | none |
| `DATABASE_URL` | Postgres URL (auto-set on Railway) | local SQLite |
| `DEVICE_API_KEY` | Shared secret for ESP32 and camera script | `dev-device-key` |
| `VISION_MAX_SLOT_DISTANCE_M` | Max detection-to-slot distance | `4.0` |
| `VISION_STABLE_FRAMES` | Frames before "parked here" | `3` |
| `VISION_LINK_MIN_FRAMES` | Frames before matching to an ENTRY | `5` |
| `VISION_ENTRY_WINDOW_MIN` | How long an ENTRY stays claimable (min) | `15` |
| `VISION_TRACK_TIMEOUT_S` | Unseen this long marks a track inactive | `30` |
| `LOGIN_LOCKOUT_MAX_FAILURES` | Failed login attempts before a username is locked | `5` |
| `LOGIN_LOCKOUT_WINDOW_SECONDS` | Sliding window (seconds) for counting failures | `900` |
| `LOGIN_LOCKOUT_SECONDS` | How long the lockout lasts (seconds) | `900` |
Set `DEVICE_API_KEY` and `DJANGO_SECRET_KEY` to real secrets before going live.

### Frontend (Vercel)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend API base, e.g. `https://<app>.up.railway.app/api`. Leave unset locally |

---

## API overview

Interactive docs: `/api/docs/` (Swagger) on the backend. JWT access tokens last 8 hours, refresh
tokens 7 days. Rate limits: login 10/min, register 10/hour, optimise 30/min, face scan 12/min,
feedback 20/hour.

**Auth**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login/` | JWT login (drivers must also send `cab_number`) |
| POST | `/api/auth/refresh/` | Refresh token |
| POST | `/api/auth/register/` | Student sign-up |
| GET | `/api/auth/me/` | Current user and role |
| PATCH | `/api/auth/me/identity/` | Set student / teacher identity |

**Core**

| Path | Purpose |
|---|---|
| `/api/buses/` (+ `search/`) | Bus CRUD and lookup |
| `/api/students/` (+ `summary/`, `roster/`, `me/`, `me/face-enrollment/`) | Students and face enrolment |
| `/api/parking/ground/`, `/slots/`, `/summary/` | Ground, slots, counts |
| `/api/optimization/run/`, `/apply/`, `/results/` | Optimiser |
| `/api/announcements/` | Notices |
| `/api/feedback/` | Complaints / feedback |
| `/api/maintenance/logs/` | Service and fuel logs |
| `/api/sensors/`, `/api/events/` | Sensor registry and parking events |
| `/api/vision/` (`positions/`, tracks, assign) | Camera tracking |

**Attendance** (`/api/attendance/`)

| Path | Purpose |
|---|---|
| `my-bus/`, `teachers/` | Driver's bus; teacher roster |
| `roster/`, `submit/`, `sessions/` | Roster, submissions, session history |
| `records/<id>/correct/` | Admin/staff correction |
| `qr/generate/`, `qr/status/`, `qr/tally/`, `qr/stop/` | In-charge QR session control |
| `qr/scan/` | Student QR + face scan |
| `my/` | Student's own attendance |
| `export/`, `report/` | Excel / PDF / CSV exports |
| `analytics/overview/`, `analytics/student/<id>/` | Analytics |

**Device endpoints** (header `X-Device-Key: <DEVICE_API_KEY>`)

| Method | Path | Body |
|---|---|---|
| POST | `/api/sensors/rfid/` | `{"rfid_uid": "RFID-CAB-01", "sensor_id": "RFID-GATE-IN", "event_type": "ENTRY"}` |
| POST | `/api/sensors/occupancy/` | `{"sensor_id": "US-A1", "is_occupied": true, "slot_id": 1}` |
| POST | `/api/vision/positions/` | `{"camera_id": "CAM-1", "detections": [...]}` |

---

## Data model

| Model | Key fields |
|---|---|
| `UserProfile` | `user`, `role` (ADMIN / STAFF / DRIVER / STUDENT / INCHARGE), `identity`, `phone` |
| `Bus` | `bus_number`, `rfid_uid`, `route`, `departure_time`, `length_m`, `width_m`, `driver`, `incharge`, `student_capacity`, `teacher_capacity` |
| `Student` | `roll_number`, `name`, `department`, `year`, `bus`, `boarding_point`, `linked_user` |
| `FaceProfile` | `student`, `embedding` (128-d), `consent_given`, `retake_count` |
| `Teacher` | `staff_id`, `name`, `department`, `bus`, `boarding_point` |
| `AttendanceSession` | `bus`, `date`, `slot`, `is_holiday`, `auto_finalized`, `opened_at`, `closed_at` |
| `AttendanceRecord` | `session`, `student` / `teacher`, `status`, `source` (MANUAL / QR_FACE / AUTO_ABSENT), `face_match_score`, `locked_at`, correction fields |
| `AttendanceQRToken` | `bus`, `date`, `slot`, `token`, `expires_at` |
| `ParkingGround` / `ParkingSlot` | dimensions; `row`, `slot_number`, `x/y_position_m`, `bus`, `is_occupied`, `is_blocked` |
| `Sensor` / `ParkingEvent` | `sensor_id`, `sensor_type`, `last_seen`; `event_type` (ENTRY / EXIT / DETECTED / MOVED / PARKED) |
| `VisionTrack` | `camera_id`, `track_id`, `bus`, `slot`, `x_m`, `y_m`, `confidence`, `is_active` |
| `OptimizationResult` | current vs recommended layout, blocked before/after |
| `Announcement` | `title`, `message`, `priority`, `author` |
| `Feedback` | `kind`, `category`, `subject`, `message`, `bus`, `is_anonymous`, `status` |
| `MaintenanceLog` | `bus`, `log_type` (SERVICE / FUEL), `date`, `odometer_km`, `cost`, `fuel_liters` |

---

## Management commands

| Command | Purpose |
|---|---|
| `create_slots --name ... --length ... --width ... --entrance-width ... --exit-width ... --rows N --slots-per-row N` | Create a ground and its slot grid (safe to re-run) |
| `run_attendance_clock` | Long-running scheduler: finalises attendance at 09:31 and 19:31 IST |
| `finalize_attendance --slot MORNING\|EVENING` | Close open sessions and mark non-scanners absent |
| `seed_sensors [--cameras N --offline N --clear]` | Demo sensors |
| `seed_attendance_history [--days 45 --present-rate 0.85]` | Demo attendance history |
| `seed_cab_attendance` | Demo cab attendance |

---

## Hardware and edge camera

Full wiring and parts list: [`hardware/HARDWARE.md`](hardware/HARDWARE.md).

- **Gate nodes:** ESP32 + RC522, sketch in `hardware/esp32_gate_rfid/`. Flash the same sketch to both
  nodes, setting `EVENT_TYPE` to `"ENTRY"` or `"EXIT"` and a unique `SENSOR_ID`.
- **Slot sensors (optional):** ultrasonic per slot, `hardware/esp32_slot_sensors/`.
- **Camera:** `edge/vision_tracker.py`

```bash
cd edge
pip install -r requirements.txt
python vision_tracker.py --calibrate --source frame.jpg                  # once: click 4 ground points
python vision_tracker.py --source ground.jpg --dry-run --save out.jpg   # try without sending
python vision_tracker.py --source rtsp://user:pass@CAMERA/stream \
    --server https://<your-backend> --key <DEVICE_API_KEY>              # live
```

---

## Testing

```bash
python manage.py test                        # backend suite (~130 tests)
cd edge && python -m unittest test_geometry  # calibration maths
cd frontend && npm run build                 # type-check + production build
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Vercel build: `stream did not contain valid UTF-8` | A source file isn't UTF-8. Re-save it as UTF-8 (VS Code: status bar → *Save with Encoding* → UTF-8) |
| Vercel build: `Module "fs" has been externalized` warning | From `face-api.js`; harmless |
| Login works locally but not on Vercel | `VITE_API_BASE_URL` missing, or Vercel domain not in `DJANGO_CORS_ORIGINS` |
| Driver can't log in | Needs the exact assigned cab number, and a bus must be linked to their account |
| "No attendance window is open" | QR only works 05:00–09:30 and 16:30–19:30 IST |
| Students never auto-marked absent | The `clock` process isn't running on Railway |
| "Face did not match" | Retry in better light, or have the driver/admin correct the record |
| Data disappears after a Railway deploy | Running on SQLite; make sure `DATABASE_URL` points to Postgres |

---

## Known limitations

- YOLO on the real ground is untested: measure real-world accuracy before relying on it
- Camera-to-RFID matching is by arrival order, so two buses entering together can be swapped
- RC522 reads only ~3–5 cm; use UHF RFID for buses driving through a gate
- Face matching runs on browser-computed embeddings without a liveness check, so a photo of a
  student could in principle fool it. Treat it as a convenience layer over the QR, not high security
- Optimiser fills row A first; spreading across rows is a known improvement
- The attendance clock is a single always-on process; if it is down, sessions aren't auto-closed

---

## AI usage declaration

| Tool | Purpose |
|---|---|
| Claude (Anthropic) | System design, backend logic, frontend components, debugging, documentation |
| YOLO (Ultralytics) | Bus detection from camera frames |
| face-api.js | In-browser face embeddings for attendance |

---

*Rathinam Technical Campus · C29 · AI Immersion Task 01*
