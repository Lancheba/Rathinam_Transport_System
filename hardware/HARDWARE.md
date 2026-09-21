# Hardware guide

The system uses two kinds of hardware. Everything talks to the Django server over WiFi.

| Hardware | Answers | Server endpoint |
|---|---|---|
| RFID reader at the ground entrance (and one at the exit) | **Which** bus came in / left | `POST /api/sensors/rfid/` |
| One camera looking over the ground, running `edge/vision_tracker.py` | **Where** every bus is parked | `POST /api/vision/positions/` |
| *(optional)* ultrasonic sensor per slot, only if the slots are marked and have a post to mount on | Is this slot occupied | `POST /api/sensors/occupancy/` |

The Rathinam bus ground is open dirt with no painted slots, so per-slot ultrasonic
sensors are optional. RFID gates plus the camera are the main design.

Every device request must send the header `X-Device-Key: <DEVICE_API_KEY>`.

## Parts (prototype)

| Item | Qty |
|---|---|
| ESP32 DevKit | 2 (entrance node, exit node) |
| RC522 RFID reader + tags | 2 readers, 1 tag per bus |
| Buzzer | 2 (optional) |
| Jumper wires, breadboard, 5 V USB supply or power bank | 1 set |
| IP camera with RTSP, or a 1080p USB webcam | 1 |
| Tripod / pole / building mount for the camera | 1 |
| Laptop or PC (runs Django, the dashboard and YOLO) | 1 |

Production upgrade: a UHF RFID reader (860-960 MHz) with windscreen tags, weatherproof
enclosures, an outdoor PoE camera, and a small GPU box for YOLO.

## Entrance / exit RFID node

Sketch: `esp32_gate_rfid/esp32_gate_rfid.ino` (Arduino IDE, ESP32 board package,
library **MFRC522**). Flash the same sketch to both nodes; set `EVENT_TYPE` to `"ENTRY"`
on the entrance node and `"EXIT"` on the exit node, and a different `SENSOR_ID` on each.

| RC522 | ESP32 |
|---|---|
| SDA (SS) | GPIO 5 |
| SCK | GPIO 18 |
| MOSI | GPIO 23 |
| MISO | GPIO 19 |
| RST | GPIO 22 |
| 3.3V | 3V3 (**never 5 V**) |
| GND | GND |
| Buzzer + | GPIO 4 (optional) |

Set in the sketch: `WIFI_SSID`, `WIFI_PASS`, `SERVER_URL` (your PC's LAN IP, port 8000),
`DEVICE_KEY` (same as the server's `DEVICE_API_KEY`).

Beeps: 1 = accepted, 3 = tag not registered to any bus, 2 long = network/server error.

### Registering a bus tag

1. Tap the tag and read the UID in the Arduino Serial Monitor (115200 baud). It is printed as
   upper-case hex with no separators, for example `A1B2C3D4`.
2. Add (or edit) the bus in the dashboard and type exactly that string into **RFID UID**.

The tag stores only its UID. The database maps UID -> bus.

### Range warning

The RC522 reads at roughly 3-5 cm. That is fine for a demo where the driver taps a tag on the
reader, but not for a moving bus. For real gate use, switch to a UHF reader; the server does
not change, because it only receives `rfid_uid`.

## Camera

Mount the camera high (building or pole) so the whole ground is in view, and run
`edge/vision_tracker.py`. Setup and calibration are in the main README, section
"Camera (YOLO) setup".

## Optional: per-slot ultrasonic sensors

Only useful where slots are marked and there is a fixed post to mount on.
Sketch: `esp32_slot_sensors/esp32_slot_sensors.ino`.

- HC-SR04 **ECHO is 5 V**; the ESP32 tolerates 3.3 V. Put a divider on every echo line:
  `ECHO -[1k]-+-[2k]- GND`, with the ESP32 pin on the junction.
- Power the sensors from VIN (5 V). Use the waterproof JSN-SR04T outdoors.
- `slotId` in the sketch is the `ParkingSlot` database id (see `/api/parking/slots/`).
- Tune `OCCUPIED_BELOW_CM` by measuring an empty slot and an occupied one.

Note: ultrasonic events mark a slot occupied/free. They do not identify which bus is there;
the camera and RFID do that.

## Bring-up order

1. Test the API with curl (no hardware), see the main README, "API reference".
2. Flash the entrance node, tap a registered tag, check the event appears in the dashboard bell.
3. Run `vision_tracker.py --dry-run` on a photo, then live.
4. Do a full run: tap ENTRY, drive/park (or walk a bus-sized object) in view of the camera,
   watch the bus appear in its slot, tap EXIT, watch the slot free.

Nothing in `hardware/` has been tested on physical boards yet: expect to adjust pins,
thresholds and WiFi settings.
