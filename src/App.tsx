import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  Radio,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { AlertsView } from './components/AlertsView';
import { DevicesView } from './components/DevicesView';
import { FirebaseSetupView } from './components/FirebaseSetupView';
import { FloodRiskBanner } from './components/FloodRiskBanner';
import { HardwareSetupView } from './components/HardwareSetupView';
import { Header } from './components/Header';
import { SensorCards } from './components/SensorCards';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TelemetryChart } from './components/TelemetryChart';
import { TrendAndLocationPanel } from './components/TrendAndLocationPanel';
import { createDefaultDeviceMetadata } from './services/demoData';
import {
  POLL_INTERVAL_MS,
  clearStoredRestHistory,
  fetchLiveSensorData,
  loadRestEndpointUrl,
  loadStoredRestAlerts,
  loadStoredRestHistory,
  saveRestEndpointUrl,
  saveStoredRestAlerts,
  saveStoredRestHistory,
} from './services/firebaseRestService';
import {
  AlertPreferences,
  AlertRecord,
  AppView,
  DeviceMetadata,
  FetchLiveStatus,
  FloodRiskLevel,
  HistoricalReading,
  LiveTelemetry,
  ThresholdConfig,
} from './types/floodguard';
import {
  loadActiveDeviceId,
  loadLocalSettings,
  saveActiveDeviceId,
  saveLocalSettings,
} from './utils/storage';
import {
  DEFAULT_THRESHOLDS,
  analyzeWaterTrend,
  playAlertTone,
} from './utils/telemetry';

interface LocalAppSettings {
  theme: 'dark' | 'light';
  alertPrefs: AlertPreferences;
  thresholds: ThresholdConfig;
  metadata: DeviceMetadata;
}

const INITIAL_LOCAL_SETTINGS: LocalAppSettings = {
  theme: 'dark',
  alertPrefs: {
    enableBrowserNotifications: false,
    enableSoundAlert: true,
    dedupCooldownSec: 60,
  },
  thresholds: DEFAULT_THRESHOLDS,
  metadata: createDefaultDeviceMetadata(loadActiveDeviceId()),
};

export function App() {
  const [localSettings, setLocalSettings] = useState<LocalAppSettings>(() =>
    loadLocalSettings<LocalAppSettings>(INITIAL_LOCAL_SETTINGS)
  );
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => loadActiveDeviceId());
  const [deviceRegistry, setDeviceRegistry] = useState<DeviceMetadata[]>(() => [
    loadLocalSettings<LocalAppSettings>(INITIAL_LOCAL_SETTINGS).metadata,
  ]);

  // Standard browser fetch() polling every 2 seconds (no Firebase SDK or env vars)
  const [endpointUrl, setEndpointUrl] = useState<string>(() => loadRestEndpointUrl());
  const [fetchStatus, setFetchStatus] = useState<FetchLiveStatus>('connecting');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<number>(0);
  const [rawPayload, setRawPayload] = useState<Record<string, unknown> | null>(null);
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [sensorAnomalies, setSensorAnomalies] = useState<string[]>([]);

  const [history, setHistory] = useState<HistoricalReading[]>(() => loadStoredRestHistory());
  const [alerts, setAlerts] = useState<AlertRecord[]>(() =>
    loadStoredRestAlerts<AlertRecord>()
  );

  // 1-second clock for relative timestamps
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme DOM sync
  useEffect(() => {
    const root = document.documentElement;
    if (localSettings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveLocalSettings(localSettings);
  }, [localSettings]);

  // Persist history & alerts locally
  useEffect(() => {
    saveStoredRestHistory(history);
  }, [history]);

  useEffect(() => {
    saveStoredRestAlerts(alerts);
  }, [alerts]);

  const activeThresholds = localSettings.thresholds;
  const activeMetadata = useMemo(
    () => ({ ...localSettings.metadata, deviceId: activeDeviceId }),
    [localSettings.metadata, activeDeviceId]
  );

  const lastAlertRiskRef = useRef<FloodRiskLevel>('SAFE');
  const lastAlertTimestampRef = useRef<number>(0);
  const lastAnomalySigRef = useRef<string>('');
  const wasLiveRef = useRef<boolean>(false);

  const pollOnce = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await fetchLiveSensorData(endpointUrl, activeThresholds, signal);
        const now = Date.now();

        if (result.waiting || !result.telemetry) {
          setFetchStatus('waiting');
          setFetchError(null);
          setRawPayload(result.raw);
          setSensorAnomalies([]);
          return;
        }

        const liveTelemetry = result.telemetry;

        setFetchStatus('live');
        setFetchError(null);
        setLastSuccessfulFetch(now);
        setRawPayload(result.raw);
        setTelemetry({ ...liveTelemetry, lastUpdated: now });
        setSensorAnomalies(result.anomalies);
        wasLiveRef.current = true;

        const point: HistoricalReading = {
          id: `live_${now}`,
          distance: liveTelemetry.distance,
          waterLevel: liveTelemetry.waterLevel,
          temperature: liveTelemetry.temperature,
          humidity: liveTelemetry.humidity,
          floodStatus: liveTelemetry.floodStatus,
          timestamp: now,
        };
        setHistory((prev) => [...prev.slice(-1199), point]);

        const status = liveTelemetry.floodStatus;
        const cooldownMs = localSettings.alertPrefs.dedupCooldownSec * 1000;

        if (
          status !== 'SAFE' &&
          status !== lastAlertRiskRef.current &&
          now - lastAlertTimestampRef.current >= Math.min(cooldownMs, 4000)
        ) {
          lastAlertRiskRef.current = status;
          lastAlertTimestampRef.current = now;

          const wlText =
            liveTelemetry.waterLevel !== null
              ? `${liveTelemetry.waterLevel.toFixed(2)} cm`
              : 'unknown level';
          const msg = `Live status changed to ${status} (waterLevel: ${wlText}).`;

          const newAlert: AlertRecord = {
            id: `alert_${now}`,
            deviceId: activeDeviceId,
            type: 'THRESHOLD_BREACH',
            severity: status,
            message: msg,
            waterLevel: liveTelemetry.waterLevel,
            timestamp: now,
            acknowledged: false,
            acknowledgedAt: null,
          };
          setAlerts((prev) => [newAlert, ...prev.slice(0, 199)]);

          if (localSettings.alertPrefs.enableSoundAlert) {
            playAlertTone(status);
          }
          if (
            localSettings.alertPrefs.enableBrowserNotifications &&
            'Notification' in window &&
            Notification.permission === 'granted' &&
            (status === 'DANGER' || status === 'CRITICAL')
          ) {
            new Notification(`FloodGuard ${status} Alert`, { body: msg });
          }
        } else if (status === 'SAFE') {
          lastAlertRiskRef.current = 'SAFE';
        }

        const anomalySig = result.anomalies.join('|');
        if (anomalySig && anomalySig !== lastAnomalySigRef.current) {
          lastAnomalySigRef.current = anomalySig;
          setAlerts((prev) => [
            {
              id: `anom_${now}`,
              deviceId: activeDeviceId,
              type: 'SENSOR_ANOMALY',
              severity: 'WARNING',
              message: anomalySig,
              waterLevel: liveTelemetry.waterLevel,
              timestamp: now,
              acknowledged: false,
              acknowledgedAt: null,
            },
            ...prev.slice(0, 199),
          ]);
        } else if (!anomalySig) {
          lastAnomalySigRef.current = '';
        }
      } catch (err) {
        if (signal?.aborted) return;
        const message =
          err instanceof Error ? err.message : 'Unable to reach Firebase endpoint.';
        setFetchStatus('offline');
        setFetchError(message);

        if (wasLiveRef.current) {
          wasLiveRef.current = false;
          setAlerts((prev) => [
            {
              id: `offline_${Date.now()}`,
              deviceId: activeDeviceId,
              type: 'DEVICE_OFFLINE',
              severity: 'INFO',
              message: `Firebase fetch went Offline: ${message}`,
              waterLevel: null,
              timestamp: Date.now(),
              acknowledged: false,
              acknowledgedAt: null,
            },
            ...prev.slice(0, 199),
          ]);
        }
      }
    },
    [endpointUrl, activeThresholds, activeDeviceId, localSettings.alertPrefs]
  );

  // Every 2 seconds, call standard browser fetch()
  useEffect(() => {
    const controller = new AbortController();
    setFetchStatus((prev) => (prev === 'live' ? 'live' : 'connecting'));

    void pollOnce(controller.signal);
    const intervalId = setInterval(() => {
      void pollOnce(controller.signal);
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [pollOnce]);

  const trendAnalysis = useMemo(() => analyzeWaterTrend(history), [history]);

  const handleUpdateEndpointUrl = useCallback((nextUrl: string) => {
    const normalized = saveRestEndpointUrl(nextUrl);
    setEndpointUrl(normalized);
    setFetchStatus('connecting');
    setFetchError(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearStoredRestHistory();
    setHistory([]);
    setAlerts([]);
  }, []);

  const handleSaveMetadata = useCallback(async (meta: DeviceMetadata) => {
    setLocalSettings((prev) => ({ ...prev, metadata: meta }));
    setDeviceRegistry((prev) => {
      const exists = prev.some((d) => d.deviceId === meta.deviceId);
      return exists
        ? prev.map((d) => (d.deviceId === meta.deviceId ? meta : d))
        : [...prev, meta];
    });
  }, []);

  const handleSaveThresholds = useCallback(async (th: ThresholdConfig) => {
    setLocalSettings((prev) => ({ ...prev, thresholds: th }));
  }, []);

  const handleRegisterDevice = useCallback(async (newMeta: DeviceMetadata) => {
    saveActiveDeviceId(newMeta.deviceId);
    setActiveDeviceId(newMeta.deviceId);
    setLocalSettings((prev) => ({ ...prev, metadata: newMeta }));
    setDeviceRegistry((prev) => [...prev, newMeta]);
  }, []);

  const handleSelectDevice = useCallback((id: string) => {
    saveActiveDeviceId(id);
    setActiveDeviceId(id);
  }, []);

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true, acknowledgedAt: Date.now() } : a
      )
    );
  }, []);

  const handleAcknowledgeAllAlerts = useCallback(async () => {
    const now = Date.now();
    setAlerts((prev) =>
      prev.map((a) => (a.acknowledged ? a : { ...a, acknowledged: true, acknowledgedAt: now }))
    );
  }, []);

  const handleResetConfig = useCallback(() => {
    setLocalSettings(INITIAL_LOCAL_SETTINGS);
  }, []);

  const unackAlertCount = alerts.filter((a) => !a.acknowledged).length;
  const currentStatus: FloodRiskLevel = telemetry?.floodStatus ?? 'SAFE';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100">
      <Header
        fetchStatus={fetchStatus}
        endpointUrl={endpointUrl}
        lastUpdated={lastSuccessfulFetch || telemetry?.lastUpdated || 0}
        nowMs={nowMs}
        onNavigate={setActiveView}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          activeView={activeView}
          onNavigate={setActiveView}
          unackAlertCount={unackAlertCount}
          fetchStatus={fetchStatus}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          activeDeviceName={activeMetadata.deviceName}
          activeDeviceLocation={activeMetadata.location}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Connected but null response -> Waiting for ESP32 data */}
          {fetchStatus === 'waiting' && (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 text-cyan-800 dark:text-cyan-200">
                <Radio className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Connected - Waiting for ESP32 data:</strong> Endpoint{' '}
                  <code className="font-mono">{endpointUrl}</code> responded with{' '}
                  <code className="font-mono">null</code>. Polling every 2 seconds until your ESP32 publishes telemetry.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('hardware')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10 whitespace-nowrap shrink-0"
              >
                <span>ESP32 Setup</span>
              </button>
            </div>
          )}

          {/* Offline / Fetch Error Banner */}
          {fetchStatus === 'offline' && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 text-rose-700 dark:text-rose-300">
                <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Offline:</strong>{' '}
                  {fetchError || `Could not read JSON from ${endpointUrl}`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void pollOnce()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 whitespace-nowrap"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('firebase')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white whitespace-nowrap"
                >
                  <Database className="w-3 h-3" />
                  <span>Endpoint Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Sensor Anomaly Banner */}
          {fetchStatus === 'live' && sensorAnomalies.length > 0 && (
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Sensor Anomaly Detected:</strong> {sensorAnomalies.join(' ')}
              </div>
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <FloodRiskBanner
                status={currentStatus}
                hasLiveTelemetry={telemetry !== null}
                waterLevel={telemetry?.waterLevel ?? null}
                distance={telemetry?.distance ?? null}
                thresholds={activeThresholds}
                fetchStatus={fetchStatus}
                latestAlert={alerts[0] || null}
                nowMs={nowMs}
                onViewAlerts={() => setActiveView('alerts')}
              />

              <SensorCards
                telemetry={telemetry}
                thresholds={activeThresholds}
                trendAnalysis={trendAnalysis}
                history={history}
              />

              <TrendAndLocationPanel
                trend={trendAnalysis}
                history={history}
                metadata={activeMetadata}
                fetchStatus={fetchStatus}
                onEditLocation={() => setActiveView('devices')}
              />

              <TelemetryChart
                readings={history}
                thresholds={activeThresholds}
                deviceName={activeMetadata.deviceName}
                nowMs={nowMs}
                endpointUrl={endpointUrl}
              />
            </div>
          )}

          {activeView === 'alerts' && (
            <AlertsView
              alerts={alerts}
              thresholds={activeThresholds}
              onAcknowledge={handleAcknowledgeAlert}
              onAcknowledgeAll={handleAcknowledgeAllAlerts}
            />
          )}

          {activeView === 'devices' && (
            <DevicesView
              devices={deviceRegistry}
              activeDeviceId={activeDeviceId}
              metadata={activeMetadata}
              thresholds={activeThresholds}
              telemetry={telemetry}
              fetchStatus={fetchStatus}
              onSelectDevice={handleSelectDevice}
              onSaveMetadata={handleSaveMetadata}
              onSaveThresholds={handleSaveThresholds}
              onRegisterDevice={handleRegisterDevice}
              onResetConfig={handleResetConfig}
            />
          )}

          {activeView === 'firebase' && (
            <FirebaseSetupView
              endpointUrl={endpointUrl}
              fetchStatus={fetchStatus}
              fetchError={fetchError}
              lastSuccessfulFetch={lastSuccessfulFetch}
              rawPayload={rawPayload}
              onUpdateEndpointUrl={handleUpdateEndpointUrl}
              onPollNow={() => pollOnce()}
              onClearHistory={handleClearHistory}
            />
          )}

          {activeView === 'hardware' && (
            <HardwareSetupView
              metadata={activeMetadata}
              telemetry={telemetry}
              thresholds={activeThresholds}
              endpointUrl={endpointUrl}
              fetchStatus={fetchStatus}
              nowMs={nowMs}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              theme={localSettings.theme}
              onToggleTheme={(theme) => setLocalSettings((prev) => ({ ...prev, theme }))}
              alertPrefs={localSettings.alertPrefs}
              onUpdateAlertPrefs={(alertPrefs) =>
                setLocalSettings((prev) => ({ ...prev, alertPrefs }))
              }
              thresholds={activeThresholds}
              metadata={activeMetadata}
              onNavigate={setActiveView}
              onResetAllConfig={handleResetConfig}
            />
          )}

          {/* Grounded Official Disclaimer Footer */}
          <footer className="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              FloodGuard · Hyperlocal Drainage & Water-Level Telemetry ({activeMetadata.location})
            </span>
            <span>
              Threshold alerts monitor local sensor depth only and do not predict floods or replace official IMD / NDMA / TNSDMA emergency advisories.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
