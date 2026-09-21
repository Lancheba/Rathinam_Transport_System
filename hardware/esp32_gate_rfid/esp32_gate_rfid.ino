/*
  Gate RFID node  ->  POST /api/sensors/rfid/
  Board  : ESP32 DevKit (3.3 V logic)
  Reader : MFRC522 / RC522  (library: "MFRC522" by GithubCommunity / miguelbalboa)

  Wiring (ESP32 VSPI):
    RC522 SDA(SS) -> GPIO 5      RC522 SCK  -> GPIO 18
    RC522 MOSI    -> GPIO 23     RC522 MISO -> GPIO 19
    RC522 RST     -> GPIO 22     RC522 3.3V -> 3V3   (NEVER 5V)
    RC522 GND     -> GND
    Buzzer (+)    -> GPIO 4  (optional)
*/
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// ---------- EDIT THESE ----------
const char* WIFI_SSID  = "YOUR_WIFI";
const char* WIFI_PASS  = "YOUR_PASSWORD";
const char* SERVER_URL = "http://192.168.1.50:8000/api/sensors/rfid/"; // PC running Django
const char* DEVICE_KEY = "change-me-long-random-string";               // must match server
const char* SENSOR_ID  = "RFID-GATE-IN";
const char* EVENT_TYPE = "ENTRY";   // use "EXIT" on the exit-gate reader
// --------------------------------

#define SS_PIN     5
#define RST_PIN    22
#define BUZZER_PIN 4
const unsigned long SAME_TAG_COOLDOWN_MS = 5000;  // ignore same tag re-read

MFRC522 rfid(SS_PIN, RST_PIN);
String lastUid = "";
unsigned long lastSentAt = 0;

void beep(int times, int ms = 80) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(ms);
    digitalWrite(BUZZER_PIN, LOW);  delay(ms);
  }
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(400); Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " FAILED");
}

// UID as upper-case hex with no separators, e.g. "A1B2C3D4".
// Register the SAME string in the dashboard as the bus's rfid_uid.
String readUid() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

int postEvent(const String& uid) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(6000);
  String body = String("{\"rfid_uid\":\"") + uid +
                "\",\"sensor_id\":\"" + SENSOR_ID +
                "\",\"event_type\":\"" + EVENT_TYPE + "\"}";
  int code = http.POST(body);
  Serial.printf("POST %s -> HTTP %d\n", body.c_str(), code);
  if (code > 0) Serial.println(http.getString());
  http.end();
  return code;
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  SPI.begin();
  rfid.PCD_Init();
  connectWifi();
  Serial.println("Ready - tap a bus tag");
}

void loop() {
  connectWifi();
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = readUid();
  bool duplicate = (uid == lastUid) && (millis() - lastSentAt < SAME_TAG_COOLDOWN_MS);
  if (!duplicate) {
    int code = postEvent(uid);
    if (code == 200)      beep(1);        // accepted
    else if (code == 404) beep(3);        // tag not registered to any bus
    else                  beep(2, 300);   // network / server error
    lastUid = uid;
    lastSentAt = millis();
  }
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}
