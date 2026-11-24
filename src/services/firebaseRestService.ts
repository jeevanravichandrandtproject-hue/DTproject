import {
  HistoricalReading,
  LiveTelemetry,
  ThresholdConfig,
} from '../types/floodguard';
import { validateLivePayload } from '../utils/telemetry';

export const DEFAULT_RTDB_REST_URL = 'https://firebasedatabase.app/.json';
export const POLL_INTERVAL_MS = 2000;

const STORAGE_REST_URL_KEY = 'floodguard_rtdb_rest_url_v1';
const STORAGE_REST_HISTORY_KEY = 'floodguard_rtdb_rest_history_v1';
const STORAGE_REST_ALERTS_KEY = 'floodguard_rtdb_rest_alerts_v1';
const MAX_STORED_HISTORY = 1200;

export function buildRtdbFetchUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return DEFAULT_RTDB_REST_URL;
  if (/\.json(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  const [base, query] = trimmed.split('?');
  const cleanBase = base.replace(/\/+$/, '');
  return query ? `${cleanBase}/.json?${query}` : `${cleanBase}/.json`;
}

export function loadRestEndpointUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_REST_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_RTDB_REST_URL;
}

export function saveRestEndpointUrl(url: string): string {
  const normalized = buildRtdbFetchUrl(url);
  try {
    localStorage.setItem(STORAGE_REST_URL_KEY, normalized);
  } catch {
    // Ignore storage errors
  }
  return normalized;
}

export function loadStoredRestHistory(): HistoricalReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_REST_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HistoricalReading =>
        item &&
        typeof item === 'object' &&
        typeof item.timestamp === 'number' &&
        item.timestamp > 0
    );
  } catch {
    return [];
  }
}

export function saveStoredRestHistory(readings: HistoricalReading[]): void {
  try {
    const sliced = readings.slice(-MAX_STORED_HISTORY);
    localStorage.setItem(STORAGE_REST_HISTORY_KEY, JSON.stringify(sliced));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredRestHistory(): void {
  try {
    localStorage.removeItem(STORAGE_REST_HISTORY_KEY);
    localStorage.removeItem(STORAGE_REST_ALERTS_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function loadStoredRestAlerts<T>(): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_REST_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredRestAlerts<T>(alerts: T[]): void {
  try {
    localStorage.setItem(STORAGE_REST_ALERTS_KEY, JSON.stringify(alerts.slice(0, 200)));
  } catch {
    // Ignore storage errors
  }
}

export interface FetchSensorResult {
  waiting: boolean;
  telemetry: LiveTelemetry | null;
  anomalies: string[];
  raw: Record<string, unknown> | null;
}

export async function fetchLiveSensorData(
  endpointUrl: string,
  thresholds: ThresholdConfig,
  signal?: AbortSignal
): Promise<FetchSensorResult> {
  const targetUrl = buildRtdbFetchUrl(endpointUrl);

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText || 'Error'} from ${targetUrl}`);
  }

  const text = (await response.text()).trim();
  if (!text || text === 'null') {
    return {
      waiting: true,
      telemetry: null,
      anomalies: [],
      raw: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response from ${targetUrl}`);
  }

  if (parsed === null) {
    return {
      waiting: true,
      telemetry: null,
      anomalies: [],
      raw: null,
    };
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Firebase response is not a JSON sensor object.');
  }

  const raw = parsed as Record<string, unknown>;
  if (Object.keys(raw).length === 0) {
    return {
      waiting: true,
      telemetry: null,
      anomalies: [],
      raw: null,
    };
  }

  const { telemetry, anomalies } = validateLivePayload(raw, thresholds, Date.now());

  if (!telemetry) {
    return {
      waiting: true,
      telemetry: null,
      anomalies: [],
      raw,
    };
  }

  return {
    waiting: false,
    telemetry,
    anomalies,
    raw,
  };
}
