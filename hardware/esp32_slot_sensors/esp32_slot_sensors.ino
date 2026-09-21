/*
  Slot occupancy node  ->  POST /api/sensors/occupancy/
  One ESP32 reads several HC-SR04 / JSN-SR04T ultrasonic sensors, one per slot.

  IMPORTANT: HC-SR04 ECHO outputs 5 V. ESP32 pins tolerate 3.3 V only.
  Put a divider on every ECHO line:
     ECHO --[1 kΩ]--+--[2 kΩ]-- GND
                    +--> ESP32 echo pin
  Sensor VCC -> 5 V (VIN pin), GND -> GND (common with ESP32).

  slotId is the ParkingSlot database id: open /api/parking/slots/ and copy "id".
*/
#include <WiFi.h>
#include <HTTPClient.h>

// ---------- EDIT THESE ----------
const char* WIFI_SSID  = "YOUR_WIFI";
const char* WIFI_PASS  = "YOUR_PASSWORD";
const char* SERVER_URL = "http://192.168.1.50:8000/api/sensors/occupancy/";
const char* DEVICE_KEY = "change-me-long-random-string";

const int OCCUPIED_BELOW_CM = 200;  // closer than this => a bus is in the slot.
                                    // Measure your mounting and tune this.
// --------------------------------

struct Slot {
  const char* sensorId;
  int slotId;         // ParkingSlot.id in the database
  uint8_t trigPin;
  uint8_t echoPin;    // use input-capable pins (34, 35, 32, 33 are fine)
  bool state;         // last CONFIRMED state
  uint8_t streak;     // consecutive readings that disagree with `state`
  unsigned long lastPostAt;
};

Slot slots[] = {
  {"US-A1", 1, 25, 34, false, 0, 0},
  {"US-A2", 2, 26, 35, false, 0, 0},
  {"US-A3", 3, 27, 32, false, 0, 0},
  {"US-A4", 4, 14, 33, false, 0, 0},
};
const int N = sizeof(slots) / sizeof(slots[0]);

const uint8_t CONFIRM_READINGS = 3;           // debounce: 3 x 1 s in a row
const unsigned long SCAN_EVERY_MS = 1000;
const unsigned long HEARTBEAT_MS  = 60000;    // re-post state so dashboard shows sensor "online"

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) delay(400);
}

// Returns distance in cm, or -1 if no echo (nothing within range = slot empty)
float measureOnce(uint8_t trig, uint8_t echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  unsigned long us = pulseIn(echo, HIGH, 30000UL);   // 30 ms ~ 5 m
  if (us == 0) return -1;
  return us * 0.0343f / 2.0f;
}

// Median of 5 readings removes spikes from rain, birds, wind, etc.
float measureMedian(uint8_t trig, uint8_t echo) {
  float v[5];
  for (int i = 0; i < 5; i++) {
    float d = measureOnce(trig, echo);
    v[i] = (d < 0) ? 999.0f : d;
    delay(30);
  }
  for (int i = 0; i < 4; i++)
    for (int j = i + 1; j < 5; j++)
      if (v[j] < v[i]) { float t = v[i]; v[i] = v[j]; v[j] = t; }
  return v[2];
}

bool post(const Slot& s) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(6000);
  String body = String("{\"sensor_id\":\"") + s.sensorId +
                "\",\"is_occupied\":" + (s.state ? "true" : "false") +
                ",\"slot_id\":" + s.slotId + "}";
  int code = http.POST(body);
  Serial.printf("%s -> HTTP %d\n", body.c_str(), code);
  http.end();
  return code == 200;
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < N; i++) {
    pinMode(slots[i].trigPin, OUTPUT);
    pinMode(slots[i].echoPin, INPUT);
  }
  connectWifi();
}

void loop() {
  connectWifi();
  for (int i = 0; i < N; i++) {
    Slot& s = slots[i];
    float d = measureMedian(s.trigPin, s.echoPin);
    bool reading = (d < OCCUPIED_BELOW_CM);
    Serial.printf("%s: %.0f cm -> %s\n", s.sensorId, d, reading ? "occupied" : "free");

    if (reading != s.state) {
      if (++s.streak >= CONFIRM_READINGS) {      // change confirmed
        s.state = reading;
        s.streak = 0;
        if (post(s)) s.lastPostAt = millis();
      }
    } else {
      s.streak = 0;
      if (millis() - s.lastPostAt > HEARTBEAT_MS && post(s)) s.lastPostAt = millis();
    }
  }
  delay(SCAN_EVERY_MS);
}
