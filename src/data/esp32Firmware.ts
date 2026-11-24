import { ThresholdConfig } from '../types/floodguard';

export interface FirmwareParams {
  deviceId: string;
  deviceName: string;
  location: string;
  databaseUrl: string;
  reportingIntervalSec: number;
  thresholds: ThresholdConfig;
}

export function generateEsp32Firmware(params: FirmwareParams): string {
  const dbUrl = (params.databaseUrl || 'https://firebasedatabase.app').replace(/\/+$/, '');
  const intervalMs = Math.max(2, params.reportingIntervalSec || 2) * 1000;

  return `/*
 * FloodGuard — Hyperlocal Flood Intelligence ESP32 Firmware
 * Target Node: ${params.deviceId} (${params.deviceName})
 * Location:    ${params.location}
 *
 * Publishes JSON containing: distance, waterLevel, temperature, humidity, status
 * Status values: "SAFE", "WARNING", "DANGER", "CRITICAL"
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* FIREBASE_HOST = "${dbUrl}";

#define TRIG_PIN          5
#define ECHO_PIN          18
#define DHT_PIN           4
#define DHT_TYPE          DHT11
#define BUZZER_PIN        19
#define STATUS_LED_PIN    2

float sensorMountHeightCm = ${params.thresholds.sensorMountHeightCm.toFixed(1)};
float warningThresholdCm  = ${params.thresholds.warningCm.toFixed(2)};
float dangerThresholdCm   = ${params.thresholds.dangerCm.toFixed(2)};
float criticalThresholdCm = ${params.thresholds.criticalCm.toFixed(2)};

unsigned long reportIntervalMs  = ${intervalMs};
unsigned long lastReportMs      = 0;
unsigned long lastWifiAttemptMs = 0;
unsigned long lastBuzzerToggle  = 0;
bool buzzerPinState             = false;

float lastValidWaterLevel       = -1.0f;
String lastFloodStatus          = "SAFE";

DHT dht(DHT_PIN, DHT_TYPE);

float readUltrasonicDistanceCm(bool &ok) {
  float samples[5];
  int validCount = 0;

  for (int i = 0; i < 5; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long durationUs = pulseIn(ECHO_PIN, HIGH, 30000);
    if (durationUs > 100 && durationUs < 25000) {
      float dist = (durationUs * 0.0343f) / 2.0f;
      if (dist >= 2.0f && dist <= 400.0f) {
        samples[validCount++] = dist;
      }
    }
    delay(20);
  }

  if (validCount < 2) {
    ok = false;
    return -1.0f;
  }

  for (int i = 1; i < validCount; i++) {
    float key = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > key) {
      samples[j + 1] = samples[j];
      j--;
    }
    samples[j + 1] = key;
  }

  ok = true;
  return samples[validCount / 2];
}

String computeFloodStatus(float waterLevel) {
  if (waterLevel < 0) return "SAFE";
  if (waterLevel >= criticalThresholdCm) return "CRITICAL";
  if (waterLevel >= dangerThresholdCm && dangerThresholdCm < criticalThresholdCm) return "DANGER";
  if (waterLevel >= warningThresholdCm) return "WARNING";
  return "SAFE";
}

void updateLocalBuzzer(const String &status, bool sensorOk) {
  unsigned long now = millis();
  if (!sensorOk || status == "SAFE") {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerPinState = false;
    return;
  }

  unsigned long interval = (status == "CRITICAL") ? 200 : (status == "DANGER") ? 500 : 2000;
  if (now - lastBuzzerToggle >= interval) {
    lastBuzzerToggle = now;
    buzzerPinState = !buzzerPinState;
    digitalWrite(BUZZER_PIN, buzzerPinState ? HIGH : LOW);
  }
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    return;
  }
  digitalWrite(STATUS_LED_PIN, LOW);
  if (millis() - lastWifiAttemptMs >= 10000) {
    lastWifiAttemptMs = millis();
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

bool sendRootPayload(const String &jsonBody) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/.json";
  if (!http.begin(client, url)) return false;
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(jsonBody);
  http.end();
  return (code >= 200 && code < 300);
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  dht.begin();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void loop() {
  ensureWifiConnected();
  updateLocalBuzzer(lastFloodStatus, lastValidWaterLevel >= 0);

  unsigned long now = millis();
  if (now - lastReportMs >= reportIntervalMs) {
    lastReportMs = now;

    bool ultrasonicOk = false;
    float distanceCm = readUltrasonicDistanceCm(ultrasonicOk);
    float waterLevel = -1.0f;

    if (ultrasonicOk) {
      waterLevel = max(0.0f, sensorMountHeightCm - distanceCm);
      waterLevel = roundf(waterLevel * 100.0f) / 100.0f;
      lastValidWaterLevel = waterLevel;
    }

    float tempC = dht.readTemperature();
    float humidity = dht.readHumidity();
    bool dhtOk = (!isnan(tempC) && !isnan(humidity));

    String status = ultrasonicOk ? computeFloodStatus(waterLevel) : lastFloodStatus;
    lastFloodStatus = status;

    JsonDocument doc;
    doc["distance"] = ultrasonicOk ? roundf(distanceCm * 100.0f) / 100.0f : -1;
    doc["waterLevel"] = ultrasonicOk ? waterLevel : -1;
    doc["temperature"] = dhtOk ? roundf(tempC * 10.0f) / 10.0f : 0;
    doc["humidity"] = dhtOk ? roundf(humidity) : 0;
    doc["status"] = status;

    String jsonStr;
    serializeJson(doc, jsonStr);
    sendRootPayload(jsonStr);
  }
}
`;
}

export const FIREBASE_SECURITY_RULES_JSON = `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`;

export const FIREBASE_SCHEMA_JSON = `{
  "distance": 12.4,
  "waterLevel": 17.6,
  "temperature": 29.5,
  "humidity": 81,
  "status": "SAFE"
}`;
