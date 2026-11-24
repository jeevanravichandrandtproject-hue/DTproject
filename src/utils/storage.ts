import { DEFAULT_DEVICE_ID } from './telemetry';

const STORAGE_ACTIVE_DEVICE_KEY = 'floodguard_active_device_v1';
const STORAGE_LOCAL_SETTINGS_KEY = 'floodguard_local_settings_v1';

export function loadActiveDeviceId(): string {
  try {
    return localStorage.getItem(STORAGE_ACTIVE_DEVICE_KEY)?.trim() || DEFAULT_DEVICE_ID;
  } catch {
    return DEFAULT_DEVICE_ID;
  }
}

export function saveActiveDeviceId(deviceId: string): void {
  try {
    localStorage.setItem(STORAGE_ACTIVE_DEVICE_KEY, deviceId.trim() || DEFAULT_DEVICE_ID);
  } catch {
    // Ignore storage errors
  }
}

export function loadLocalSettings<T extends Record<string, any>>(fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, any>;
    if (!parsed || typeof parsed !== 'object') return fallback;

    const merged: Record<string, any> = { ...fallback, ...parsed };
    for (const key of Object.keys(fallback)) {
      const fbVal = fallback[key];
      const pVal = parsed[key];
      if (
        fbVal &&
        typeof fbVal === 'object' &&
        !Array.isArray(fbVal) &&
        pVal &&
        typeof pVal === 'object' &&
        !Array.isArray(pVal)
      ) {
        const sub: Record<string, any> = { ...fbVal };
        for (const subKey of Object.keys(fbVal)) {
          const candidate = pVal[subKey];
          if (candidate !== undefined && candidate !== null) {
            if (typeof fbVal[subKey] === 'number') {
              if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                sub[subKey] = candidate;
              }
            } else {
              sub[subKey] = candidate;
            }
          }
        }
        merged[key] = sub;
      }
    }
    return merged as T;
  } catch {
    return fallback;
  }
}

export function saveLocalSettings<T>(settings: T): void {
  try {
    localStorage.setItem(STORAGE_LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
