# Rathinam Smart Bus Parking

**AI Immersion Task 01 (C29) · Rathinam Technical Campus**

A system that knows **which bus is inside the bus ground, where it is parked, and which buses
are boxed in by others**, then recommends a better parking order so early-departing buses are
never blocked.

- **RFID gate readers** say *which* bus entered or left.
- **A camera running YOLO** says *where* every bus is sitting.
- **Django** joins the two, stores everything, and runs the optimiser.
- **A React dashboard** shows the ground live and lets transport staff correct and act.

---

## 1. The problem

The campus bus ground is open ground with no painted slots. Buses park wherever there is space,
so a bus that must leave early is often boxed in behind buses that leave later. Drivers and staff
then spend time finding the owner of the blocking bus and shuffling vehicles.

> Fill this in from **your own field visit**. Do not use numbers you did not observe or source.
>
> **Problem statement:** [User group] at [specific location] currently [what they do today],
> which causes [measurable consequence] because [root cause]. Existing approaches such as
> [what is tried now] fall short because [gap].
>
> **My three numbers:** frequency ___ · magnitude ___ · reach ___
> (say which you counted and which you sourced)

---

## 2. Architecture

```mermaid
flowchart LR
  T["Bus RFID tag"] -->|"tag UID"| R["RFID reader + ESP32 (entrance / exit)"]
  R -->|"HTTP POST /api/sensors/rfid/ ENTRY or EXIT"| API
  C["Camera over the ground"] -->|"video frames, 2 fps"| Y["YOLO detector + ByteTrack"]
  Y -->|"HTTP POST /api/vision/positions/ ground x,y in metres"| API
  API["Django API: database, camera-RFID linking, optimiser"] -->|"slots, blocked flags, tracks"| D["React dashboard"]
  D --> S["Transport staff"]
  S -->|"assign unidentified bus / apply new layout"| API
```

| Layer | Technology |
|---|---|
| Identification | RC522 (demo) or UHF (production) RFID + ESP32 |
| Localisation | YOLO (Ultralytics) + ByteTrack, image-to-ground homography |
| Backend | Django, Django REST Framework, JWT auth, SQLite |
| Frontend | React + TypeScript + Vite |
| Optimisation | Rule-based departure-time ordering (see section 8) |

### How the camera and RFID are joined

Nothing physical connects them, so `vision/linking.py` does it:

1. Each detection (a point on the ground, in metres) is matched to the nearest slot,
   **one detection per slot**.
2. A vehicle must stay closest to the same slot for `VISION_STABLE_FRAMES` frames before it
   counts as parked there (stops flip-flopping between neighbouring slots).
3. A tracked vehicle learns which bus it is, in this order:
   1. **Inherit**: it settled in a slot the database already says holds a bus (this is why
      restarting the camera script is harmless).
   2. **First in, first matched**: the oldest recent RFID `ENTRY` nobody has claimed goes to
      the oldest unidentified vehicle (buses appear on camera in the order they tapped in).
   3. **Staff assign** it by hand in the dashboard (Sensors page, "Camera tracking").
4. Identified, settled vehicles are written into `ParkingSlot`; blocked flags are recomputed.
5. An RFID `EXIT` (or a new `ENTRY`) frees the bus's slot and forgets its old camera identity.

---

## 3. What works today

| Part | Status |
|---|---|
| Buses, slots, sensors, events, announcements, JWT roles (admin / staff / student) | Built and tested |
| Dashboard, 2D parking map, Find My Bus, announcements | Built |
| Camera-RFID linking server (`vision` app) | Built; **61 automated tests pass** (Django 4.2 and 6.1); exercised end to end over HTTP with simulated camera payloads |
| Staff "assign this vehicle to a bus" UI | Built; frontend type-checks and builds |
| `edge/vision_tracker.py` (YOLO + tracking + calibration + posting) | Written; geometry/calibration maths unit-tested. **YOLO itself has not been run on your ground yet** |
| ESP32 sketches in `hardware/` | Written; **not tested on real boards** |
| Accuracy of YOLO on your buses | **Unmeasured**. Measure it and report the real number |

---

## 4. Quick start

### Backend

```bash
python -m venv venv
venv\Scripts\activate            # Windows PowerShell   (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser

# Nothing is pre-loaded: describe YOUR ground (metres) and how many slots to create.
python manage.py create_slots --name "Rathinam Bus Ground" --length 60 --width 35 \
    --entrance-width 8 --exit-width 8 --rows 3 --slots-per-row 8

# Devices must send this secret. Change it, and use the same value on every device.
$env:DEVICE_API_KEY = "my-long-random-secret"   # PowerShell (Linux/Mac: export DEVICE_API_KEY=...)

python manage.py runserver 0.0.0.0:8000         # 0.0.0.0 so the ESP32 / camera PC can reach it
```

`create_slots` makes a **virtual grid** of slots (the real ground has no painted lines). The
camera places each bus at the nearest grid slot. Coordinates: **x runs along the ground length
starting at the slot-1 end (nearest the exit), y runs across the rows.** Each slot's exact
position is in `/api/parking/slots/`.

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000 (proxies /api to Django)
# or: npm run build   -> Django serves the built app at http://localhost:8000
```

Register each bus in the dashboard with its **RFID UID** (see `hardware/HARDWARE.md`).

---

## 5. Camera (YOLO) setup

Runs on a laptop or small GPU box on the same network as the server.

```bash
cd edge
pip install -r requirements.txt          # ultralytics pulls in PyTorch (large download)
```

**1. Calibrate once.** Take one frame from the camera, click 4 points on the ground whose
positions you can measure, then type each point's ground `x,y` in metres:

```bash
python vision_tracker.py --calibrate --source frame.jpg      # writes calibration.json
```

Use four well-spread points (for example the four corners of the ground, or cones you place).
Re-calibrate if the camera moves. See `calibration.example.json`.

**2. Try it on a photo, sending nothing:**

```bash
python vision_tracker.py --source bus_ground.jpg --dry-run --save annotated.jpg
```

Check `annotated.jpg`: does it box every bus? How many did it miss? **Write that number down.**

**3. Run live:**

```bash
python vision_tracker.py --source rtsp://user:pass@CAMERA_IP/stream \
    --server http://SERVER_IP:8000 --key my-long-random-secret --show
```

`--source 0` uses a USB webcam; a video file also works.

**If detection is poor** (buses at angles, partly hidden, dust, evening light): the pretrained
model knows the generic COCO "bus" class. Fine-tune it on 50-200 labelled photos of *your* buses
and pass `--model your_best.pt --classes 0`. Fine-tuning and honest accuracy reporting are the
real AI work in this project.

Server settings (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `DEVICE_API_KEY` | `dev-device-key` | Shared secret for all devices. **Change it.** |
| `VISION_MAX_SLOT_DISTANCE_M` | 4.0 | A detection farther than this from every slot is ignored |
| `VISION_STABLE_FRAMES` | 3 | Frames before a vehicle counts as parked in a slot |
| `VISION_LINK_MIN_FRAMES` | 5 | Frames a vehicle must be tracked before it is matched to an ENTRY |
| `VISION_ENTRY_WINDOW_MIN` | 15 | How long an RFID ENTRY waits to be matched |
| `VISION_TRACK_TIMEOUT_S` | 30 | Vehicle unseen this long is marked inactive (its slot is kept until EXIT) |

---

## 6. API reference

Base URL `http://localhost:8000/api/`. Interactive docs: `/api/docs/`.

**Device endpoints** need the header `X-Device-Key: <DEVICE_API_KEY>` (no login):

| Method | Path | Body |
|---|---|---|
| POST | `/sensors/rfid/` | `{"rfid_uid": "A1B2C3D4", "sensor_id": "RFID-GATE-IN", "event_type": "ENTRY"}` (`ENTRY`, `EXIT`, `PARKED`, `DETECTED`) |
| POST | `/sensors/occupancy/` | `{"sensor_id": "US-A1", "is_occupied": true, "slot_id": 1}` |
| POST | `/vision/positions/` | `{"camera_id": "CAM-1", "session": "20260920101500", "detections": [{"track_id": 3, "x_m": 12.4, "y_m": 8.1, "confidence": 0.91}]}` |

```bash
curl -X POST http://localhost:8000/api/sensors/rfid/ \
  -H "Content-Type: application/json" -H "X-Device-Key: my-long-random-secret" \
  -d '{"rfid_uid":"A1B2C3D4","sensor_id":"RFID-GATE-IN","event_type":"ENTRY"}'
```

**Dashboard endpoints** (JWT; reading is public, changing needs admin or transport staff):

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login/`, `/auth/refresh/` (GET `/auth/me/`) | JWT login |
| GET/POST/PUT/DELETE | `/buses/`, `/buses/<id>/` (GET `/buses/search/?q=`) | Buses |
| GET | `/parking/ground/`, `/parking/slots/`, `/parking/summary/` | Ground, slots, counts |
| GET/POST/DELETE | `/sensors/`, `/sensors/<id>/` | Sensor registry (RFID, ULTRASONIC, CAMERA) |
| GET | `/events/` | Event log (ENTRY, EXIT, PARKED, DETECTED, ...) |
| GET | `/vision/tracks/` | Vehicles the camera currently follows |
| POST | `/vision/tracks/<id>/assign/` | Staff: `{"bus_id": 3}` says which bus a track really is |
| POST | `/optimization/run/`, `/optimization/apply/` | Recommend / apply a new layout |
| GET/POST | `/announcements/` | Notices |

---

## 7. Data model

| Model | Key fields |
|---|---|
| `Bus` | `bus_number`, `rfid_uid` (unique), `route`, `departure_time`, `length_m`, `width_m` |
| `ParkingGround` | `length_m`, `width_m`, `entrance_width_m`, `exit_width_m`, `total_slots` |
| `ParkingSlot` | `row`, `slot_number`, `x_position_m`, `y_position_m`, `bus` (one-to-one), `is_occupied`, `is_blocked` |
| `Sensor` | `sensor_id`, `sensor_type` (RFID / ULTRASONIC / CAMERA), `location`, `last_seen` |
| `ParkingEvent` | `bus`, `sensor`, `parking_slot`, `event_type`, `message`, `timestamp` |
| `VisionTrack` | `camera_id`, `session`, `track_id`, `bus`, `slot`, `x_m`, `y_m`, `confidence`, `is_active` |
| `OptimizationResult` | current vs recommended layout, blocked before/after, movements |

Within a row, **slot 1 is nearest the exit**. A bus is *blocked* when a bus in a lower-numbered
slot of the same row would have to move for it to leave.

---

## 8. The optimiser (what it really does)

`optimization/engine.py` sorts buses by departure time (earliest first) and gives the earliest
departures the slots nearest the exit, row by row. It reports blocked buses **before and after**
the recommended layout. Staff review the result and click **Apply**.

This is **rule-based**, not learned, and it does not guarantee zero blocked buses: a row that
holds more than one bus still has an order to respect, and the engine fills row A first rather
than spreading buses across rows. Known limits are in section 12.

---

## 9. Testing

```bash
python manage.py test                          # backend: 61 tests (buses, parking, sensors, vision, security)
cd edge && python -m unittest test_geometry    # calibration / coordinate maths
cd frontend && npm run build                   # type-check + production build
```

---

## 10. Deployment

`python manage.py runserver` is for development only. Before real use, work through this list.

**Settings are controlled by environment variables** (development defaults keep `runserver` working):

| Variable | Set to | Why |
|---|---|---|
| `DJANGO_DEBUG` | `0` | Debug mode shows source code and settings on errors. Default is on (development). |
| `DJANGO_SECRET_KEY` | long random string | Signs login tokens. The app **refuses to start** with `DJANGO_DEBUG=0` if this is missing. |
| `DEVICE_API_KEY` | long random string | Shared secret for ESP32 readers and the camera. Also required when `DJANGO_DEBUG=0`. |
| `DJANGO_ALLOWED_HOSTS` | `192.168.1.50,busparking.college.edu` | Hostnames/IPs users type in the browser. Others get HTTP 400. |
| `DJANGO_CORS_ORIGINS` | usually leave empty | The dashboard is served by Django itself, so no CORS is needed. |
| `DJANGO_HTTPS` | `1` only when served over HTTPS | Turns on SSL redirect, secure cookies and HSTS. Leave off on plain HTTP. |
| `DJANGO_BEHIND_PROXY` | `1` only behind a TLS proxy that sets `X-Forwarded-Proto` | Prevents a redirect loop behind a proxy. |

Generate a secret: `python -c "import secrets; print(secrets.token_urlsafe(60))"`

**Windows (PowerShell) run-through:**

```powershell
pip install -r requirements.txt waitress
$env:DJANGO_DEBUG = "0"
$env:DJANGO_SECRET_KEY = "<paste a long random string>"
$env:DEVICE_API_KEY = "<paste another long random string>"
$env:DJANGO_ALLOWED_HOSTS = "192.168.1.50,localhost"     # your server's IP / hostname

python manage.py migrate
python manage.py collectstatic --noinput                  # admin page styling
cd frontend; npm install; npm run build; cd ..            # dashboard
waitress-serve --listen=0.0.0.0:8000 config.wsgi:application
```

On Linux use `gunicorn config.wsgi:application --bind 0.0.0.0:8000` instead of waitress.
These variables last only for the current PowerShell window; set them in your service or
startup script for a permanent setup.

**Checklist**

- [ ] `DJANGO_DEBUG=0`, a new `DJANGO_SECRET_KEY`, and a new `DEVICE_API_KEY` are set (the old
      development key was published inside earlier zips; never reuse it).
- [ ] The same `DEVICE_API_KEY` is in the ESP32 sketches and passed as `--key` to the camera script.
- [ ] Created an admin with a strong password (`createsuperuser`); `/admin/` is reachable by anyone
      who can reach the server, so restrict it to the campus network if you can.
- [ ] Windows Firewall allows port 8000 from the campus network only.
- [ ] `python manage.py check --deploy` shows only warnings you understand
      (with plain HTTP expect the four SSL/cookie ones).
- [ ] `db.sqlite3` is backed up regularly (copy the file while the server is stopped or idle).
- [ ] The server PC does not sleep, and the ESP32s and camera can reach its IP.
- [ ] Tried the whole flow once: ENTRY tap, camera sees the bus, slot fills, EXIT tap, slot frees.

**Security measures already built in**

- Static-file serving cannot read outside `frontend/dist` (an earlier version could download
  `settings.py` and the database with a crafted URL).
- Device endpoints need `X-Device-Key`; login is limited to 10 attempts a minute per IP,
  sign-up to 10 an hour, and the public optimiser preview to 30 a minute (it keeps only its
  latest 50 results).
- New accounts are always `STUDENT`; admin and staff roles are granted only from the admin site.
- Unknown `/api/...` URLs return a JSON 404; errors are logged to the console.

---

## 11. Project structure

```
config/          Django settings and URLs (also serves the built frontend)
accounts/        JWT auth, roles, permissions (incl. device-key permission)
buses/           Bus model + API
parking/         Ground, slots, blocked-slot logic, create_slots command
sensors/         Sensor registry, RFID + occupancy endpoints, event log
vision/          Camera tracking: models, API, camera-RFID linking, tests
optimization/    Departure-time optimiser
announcements/   Notices
edge/            vision_tracker.py (YOLO), calibration, geometry tests
hardware/        ESP32 sketches + HARDWARE.md (wiring, parts, tag registration)
frontend/        React + TypeScript dashboard
```

---

## 12. Known limitations and next steps

- **YOLO on the real ground is untested.** Buses at odd angles, occlusion, dust and evening
  light will cause misses. Measure and report real accuracy; fine-tune if needed.
- **Identity matching is by order.** Two buses entering together and parking in a different order
  can be swapped; staff can correct them from the dashboard. Reading the bus number painted on
  each bus (OCR) would remove the guess.
- **A bus that leaves without tapping EXIT stays on the map** until it taps ENTRY again or staff
  fix it.
- **RC522 reads only about 3-5 cm.** Use a UHF reader for buses driving through a gate.
- **The slot grid is virtual.** It approximates where buses stand; it is not painted bays.
- **Optimiser:** fills row A first, ignores bus length versus slot size and the cost of moving a
  bus. Spreading buses across rows and minimising moves is the obvious improvement, and a model
  that predicts *actual* departure times from past `EXIT` events would replace the timetable
  assumption with something learned.
- **Deployment hardening is basic.** Follow section 10. SQLite allows one writer at a time, which is
  fine for one camera, a few readers and a small dashboard audience, but move to PostgreSQL if usage
  grows. Login tokens are kept in the browser's `localStorage`, sign-up only enforces a 6-character
  password, and the dashboard updates by polling rather than WebSockets.

---

## 13. C29 submission map

| Brief item | Where it lives |
|---|---|
| Block diagram (technique named, arrows labelled, feedback loop, human in it) | Section 2: YOLO + ByteTrack (localisation), departure-time ordering (optimiser), staff corrections closing the loop |
| Data acquisition | RFID UID events, camera frames at 2 fps |
| Pre-processing | Homography to ground metres, nearest-slot matching, 3-frame debounce |
| Human in the loop | Staff assign unidentified vehicles and approve layouts |
| Feasibility, cost, risk | `hardware/HARDWARE.md`, section 12 |
| Evidence still to record | E1 field video, E2 AI analysis, E3 peer discussion, E4 ideation and scoring, D1 poster, D2 deck, D3 video |

**AI usage declaration** (complete honestly for your final slide and video description):

| Tool | Purpose | One sample prompt |
|---|---|---|
| _e.g. Claude_ | _e.g. helped design and write the camera-RFID linking code_ | _your real prompt_ |

---

## 14. Change log for this update

- **Added** the `vision` app, `edge/vision_tracker.py`, the Camera tracking panel, and the
  `CAMERA` sensor type.
- **Fixed** a routing bug: `POST /api/sensors/rfid/` and `/api/sensors/occupancy/` were caught by
  the sensor router (`sensors/<pk>/`) and returned 401, so hardware could never reach them. The
  device routes now come first.
- **Secured** the device endpoints with `X-Device-Key` (they were open to anyone).
- **Fixed** a model/migration mismatch: `ParkingGround` in `models.py` still had default sizes
  that migration `0002` had removed.
- **Relaxed** the Django pin to `>=4.2,<7.0` (your migrations were generated on Django 6.1).
- **Security fix (critical):** the frontend file server accepted `../` paths, so anyone could download
  `config/settings.py` (the secret key) and `db.sqlite3` (all users and data) with one request.
  Fixed and covered by tests. If an older version was ever reachable by others, treat the old
  secret key as leaked and have users sign in again after you set a new one.
- **Hardened** settings: environment-driven `DEBUG`/`SECRET_KEY`/`ALLOWED_HOSTS`, CORS closed
  outside development, optional HTTPS flags, refusal to start in production on default keys,
  WhiteNoise for admin static files, production error logging, throttling on login, sign-up and the
  optimiser preview, and a JSON 404 for unknown API URLs.
- **Rewrote** this README, including correcting the earlier "zero blocked buses" claim.
