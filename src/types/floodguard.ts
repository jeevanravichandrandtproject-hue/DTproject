export type FloodRiskLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL';

export type WaterTrend = 'RISING' | 'FALLING' | 'STABLE';

export type FetchLiveStatus = 'connecting' | 'waiting' | 'live' | 'offline';

export type AppView =
  | 'dashboard'
  | 'alerts'
  | 'devices'
  | 'firebase'
  | 'hardware'
  | 'settings';

export type TimeRangeKey = '1H' | '6H' | '24H' | '7D';

export interface DeviceCoordinates {
  lat?: number | null;
  lng?: number | null;
}

export interface DeviceMetadata {
  deviceId: string;
  deviceName: string;
  location: string;
  coordinates?: DeviceCoordinates;
  installationDetails: string;
  reportingIntervalSec: number;
  offlineTimeoutSec: number;
  createdAt: number;
}

export interface ThresholdConfig {
  warningCm: number;
  dangerCm: number;
  criticalCm: number;
  sensorMountHeightCm: number;
}

export interface AlertPreferences {
  enableBrowserNotifications: boolean;
  enableSoundAlert: boolean;
  dedupCooldownSec: number;
}

export interface LiveTelemetry {
  distance: number | null;
  waterLevel: number | null;
  temperature: number | null;
  humidity: number | null;
  floodStatus: FloodRiskLevel;
  trend: WaterTrend;
  online: boolean;
  lastUpdated: number;
  ultrasonicOk: boolean;
  dhtOk: boolean;
  wifiRssi?: number | null;
  uptimeSec?: number | null;
  buzzerActive?: boolean;
  sensorError?: string | null;
}

export interface HistoricalReading {
  id: string;
  distance: number | null;
  waterLevel: number | null;
  temperature: number | null;
  humidity: number | null;
  floodStatus: FloodRiskLevel;
  timestamp: number;
}

export type AlertType =
  | 'THRESHOLD_BREACH'
  | 'SENSOR_ANOMALY'
  | 'DEVICE_OFFLINE'
  | 'FIREBASE_ERROR';

export type AlertSeverity = 'WARNING' | 'DANGER' | 'CRITICAL' | 'INFO';

export interface AlertRecord {
  id: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  waterLevel: number | null;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt?: number | null;
}

export interface TrendAnalysis {
  direction: WaterTrend;
  deltaFromPrevious: number | null;
  rateCmPerMin: number | null;
  rateCmPerHour: number | null;
  sufficientForRate: boolean;
  sampleCount: number;
  spanSeconds: number;
}
