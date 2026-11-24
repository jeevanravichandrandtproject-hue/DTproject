import {
  AlertRecord,
  FloodRiskLevel,
  HistoricalReading,
  LiveTelemetry,
  ThresholdConfig,
  TrendAnalysis,
  WaterTrend,
} from '../types/floodguard';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  warningCm: 2.0,
  dangerCm: 2.5,
  criticalCm: 3.0,
  sensorMountHeightCm: 30.0,
};

export const DEFAULT_DEVICE_ID = 'device_001';

export function normalizeTimestamp(rawTs: unknown): number {
  if (typeof rawTs !== 'number' || !Number.isFinite(rawTs) || rawTs <= 0) {
    return 0;
  }
  // If ESP32 sends seconds (10 digits), convert to milliseconds
  if (rawTs < 1_000_000_000_000) {
    return Math.round(rawTs * 1000);
  }
  return Math.round(rawTs);
}

export function normalizeFloodStatus(rawStatus: unknown): FloodRiskLevel | null {
  if (typeof rawStatus !== 'string') return null;
  const upper = rawStatus.trim().toUpperCase();
  if (upper === 'SAFE' || upper === 'NORMAL') return 'SAFE';
  if (upper === 'WARNING' || upper === 'CAUTION') return 'WARNING';
  if (upper === 'DANGER') return 'DANGER';
  if (upper === 'CRITICAL') return 'CRITICAL';
  return null;
}

export function calculateFloodStatus(
  waterLevel: number | null | undefined,
  thresholds: ThresholdConfig
): FloodRiskLevel {
  if (
    waterLevel === null ||
    waterLevel === undefined ||
    !Number.isFinite(waterLevel) ||
    waterLevel < 0
  ) {
    return 'SAFE';
  }
  if (waterLevel >= thresholds.criticalCm) {
    return 'CRITICAL';
  }
  if (waterLevel >= thresholds.dangerCm && thresholds.dangerCm < thresholds.criticalCm) {
    return 'DANGER';
  }
  if (waterLevel >= thresholds.warningCm) {
    return 'WARNING';
  }
  return 'SAFE';
}

/**
 * Extracts flat sensor object from either root JSON or nested RTDB node.
 */
export function extractSensorObject(
  raw: unknown
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  if (
    'waterLevel' in obj ||
    'distance' in obj ||
    'temperature' in obj ||
    'humidity' in obj ||
    'status' in obj
  ) {
    return obj;
  }

  // Fallback for nested RTDB root dumps (e.g., devices/device_001/live or sensor)
  if (obj.live && typeof obj.live === 'object') {
    return extractSensorObject(obj.live);
  }
  if (obj.sensor && typeof obj.sensor === 'object') {
    return extractSensorObject(obj.sensor);
  }
  if (obj.devices && typeof obj.devices === 'object') {
    const firstDevice = Object.values(obj.devices as Record<string, unknown>)[0];
    if (firstDevice && typeof firstDevice === 'object') {
      const devObj = firstDevice as Record<string, unknown>;
      if (devObj.live) return extractSensorObject(devObj.live);
      return extractSensorObject(devObj);
    }
  }
  return null;
}

export function validateLivePayload(
  raw: Record<string, unknown> | null | undefined,
  thresholds: ThresholdConfig,
  fallbackTimestamp: number = Date.now()
): { telemetry: LiveTelemetry | null; anomalies: string[] } {
  const sensorObj = extractSensorObject(raw);
  if (!sensorObj) {
    return { telemetry: null, anomalies: [] };
  }

  const anomalies: string[] = [];

  const toNum = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      return Number(v);
    }
    return null;
  };

  const rawDistance = toNum(sensorObj.distance);
  const rawWater = toNum(sensorObj.waterLevel);
  const rawTemp = toNum(sensorObj.temperature);
  const rawHum = toNum(sensorObj.humidity);

  const ultrasonicExplicit =
    typeof sensorObj.ultrasonicOk === 'boolean' ? sensorObj.ultrasonicOk : null;
  const dhtExplicit = typeof sensorObj.dhtOk === 'boolean' ? sensorObj.dhtOk : null;

  let ultrasonicOk = ultrasonicExplicit ?? true;
  if (rawWater === null || rawWater < 0 || rawWater > 400) {
    ultrasonicOk = false;
    anomalies.push('Water-level reading invalid or out of sensor range (0–400 cm).');
  }
  if (rawDistance !== null && (rawDistance < 0 || rawDistance > 500)) {
    anomalies.push('Ultrasonic distance reading out of range (0–500 cm).');
  }

  let dhtOk = dhtExplicit ?? true;
  if (rawTemp === null || rawTemp < -20 || rawTemp > 70) {
    dhtOk = false;
    anomalies.push('DHT11 temperature reading invalid or missing.');
  }
  if (rawHum === null || rawHum < 0 || rawHum > 100) {
    dhtOk = false;
    anomalies.push('DHT11 humidity reading invalid or out of range (0–100%).');
  }

  if (typeof sensorObj.sensorError === 'string' && sensorObj.sensorError.trim().length > 0) {
    anomalies.push(sensorObj.sensorError.trim());
  }

  const parsedTs = normalizeTimestamp(sensorObj.lastUpdated ?? sensorObj.timestamp);
  const lastUpdated = parsedTs > 0 ? parsedTs : fallbackTimestamp;
  const validWater = ultrasonicOk ? rawWater : null;
  const validDistance =
    rawDistance !== null && rawDistance >= 0 && rawDistance <= 500 ? rawDistance : null;

  // Prefer explicit `status` field from Firebase JSON, fallback to threshold calculation
  const explicitStatus = normalizeFloodStatus(sensorObj.status ?? sensorObj.floodStatus);
  const computedStatus = explicitStatus ?? calculateFloodStatus(validWater, thresholds);

  const rawTrend = sensorObj.trend;
  const trend: WaterTrend =
    rawTrend === 'RISING' || rawTrend === 'FALLING' || rawTrend === 'STABLE'
      ? rawTrend
      : 'STABLE';

  const telemetry: LiveTelemetry = {
    distance: validDistance,
    waterLevel: validWater,
    temperature: dhtOk ? rawTemp : null,
    humidity: dhtOk ? rawHum : null,
    floodStatus: computedStatus,
    trend,
    online: typeof sensorObj.online === 'boolean' ? sensorObj.online : true,
    lastUpdated,
    ultrasonicOk,
    dhtOk,
    wifiRssi: toNum(sensorObj.wifiRssi),
    uptimeSec: toNum(sensorObj.uptimeSec),
    buzzerActive:
      typeof sensorObj.buzzerActive === 'boolean'
        ? sensorObj.buzzerActive
        : computedStatus === 'DANGER' || computedStatus === 'CRITICAL',
    sensorError: typeof sensorObj.sensorError === 'string' ? sensorObj.sensorError : null,
  };

  return { telemetry, anomalies };
}

export function isDeviceOnline(
  lastUpdatedMs: number,
  offlineTimeoutSec: number,
  nowMs: number = Date.now()
): boolean {
  if (!lastUpdatedMs || lastUpdatedMs <= 0) return false;
  const ageMs = nowMs - lastUpdatedMs;
  return ageMs <= offlineTimeoutSec * 1000;
}

/**
 * Computes water-level direction, delta from previous valid reading, and
 * linear-regression rate of change ONLY when sufficient timestamped readings exist.
 */
export function analyzeWaterTrend(readings: HistoricalReading[]): TrendAnalysis {
  const valid = readings
    .filter((r) => r.waterLevel !== null && Number.isFinite(r.waterLevel) && r.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (valid.length < 2) {
    return {
      direction: 'STABLE',
      deltaFromPrevious: null,
      rateCmPerMin: null,
      rateCmPerHour: null,
      sufficientForRate: false,
      sampleCount: valid.length,
      spanSeconds: 0,
    };
  }

  const latest = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  const delta = Number(((latest.waterLevel as number) - (prev.waterLevel as number)).toFixed(2));

  let direction: WaterTrend = 'STABLE';
  if (delta >= 0.05) direction = 'RISING';
  else if (delta <= -0.05) direction = 'FALLING';

  const window = valid.slice(-10);
  const spanMs = window[window.length - 1].timestamp - window[0].timestamp;
  const spanSeconds = Math.round(spanMs / 1000);

  if (window.length < 3 || spanSeconds < 10) {
    return {
      direction,
      deltaFromPrevious: delta,
      rateCmPerMin: null,
      rateCmPerHour: null,
      sufficientForRate: false,
      sampleCount: window.length,
      spanSeconds,
    };
  }

  const t0 = window[0].timestamp;
  const n = window.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const pt of window) {
    const xMin = (pt.timestamp - t0) / 60000;
    const y = pt.waterLevel as number;
    sumX += xMin;
    sumY += y;
    sumXY += xMin * y;
    sumXX += xMin * xMin;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) {
    return {
      direction,
      deltaFromPrevious: delta,
      rateCmPerMin: null,
      rateCmPerHour: null,
      sufficientForRate: false,
      sampleCount: window.length,
      spanSeconds,
    };
  }

  const slopePerMin = (n * sumXY - sumX * sumY) / denom;
  const rateCmPerMin = Number(slopePerMin.toFixed(3));
  const rateCmPerHour = Number((slopePerMin * 60).toFixed(2));

  let regressionDir: WaterTrend = direction;
  if (rateCmPerMin >= 0.02) regressionDir = 'RISING';
  else if (rateCmPerMin <= -0.02) regressionDir = 'FALLING';
  else if (Math.abs(delta) < 0.05) regressionDir = 'STABLE';

  return {
    direction: regressionDir,
    deltaFromPrevious: delta,
    rateCmPerMin,
    rateCmPerHour,
    sufficientForRate: true,
    sampleCount: window.length,
    spanSeconds,
  };
}

export function formatTimestamp(ts: number | null | undefined): string {
  if (!ts || ts <= 0) return 'No timestamp';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(ts));
}

export function formatShortTime(ts: number, showDate: boolean = false): string {
  if (!ts || ts <= 0) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    ...(showDate ? { month: 'short', day: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ts));
}

export function formatRelativeTime(ts: number | null | undefined, nowMs: number = Date.now()): string {
  if (!ts || ts <= 0) return 'Never';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function exportReadingsToCsv(readings: HistoricalReading[], deviceName: string): void {
  const header =
    'Timestamp (ISO),Local Time,Distance (cm),Water Level (cm),Temperature (C),Humidity (%),Status\n';
  const rows = readings
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => {
      const iso = new Date(r.timestamp).toISOString();
      const local = formatTimestamp(r.timestamp).replace(/,/g, '');
      const dist = r.distance !== null ? r.distance.toFixed(2) : '';
      const wl = r.waterLevel !== null ? r.waterLevel.toFixed(2) : '';
      const temp = r.temperature !== null ? r.temperature.toFixed(1) : '';
      const hum = r.humidity !== null ? r.humidity.toFixed(0) : '';
      return `${iso},${local},${dist},${wl},${temp},${hum},${r.floodStatus}`;
    })
    .join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = deviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.href = url;
  link.setAttribute('download', `floodguard-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function playAlertTone(severity: AlertRecord['severity']): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const pulses = severity === 'CRITICAL' ? 3 : severity === 'DANGER' ? 2 : 1;
    const freq = severity === 'CRITICAL' ? 880 : severity === 'DANGER' ? 660 : 520;

    for (let i = 0; i < pulses; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.22);
      gain.gain.setValueAtTime(0.001, now + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.22 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.22);
      osc.stop(now + i * 0.22 + 0.18);
    }
  } catch {
    // Ignore audio context restrictions
  }
}
