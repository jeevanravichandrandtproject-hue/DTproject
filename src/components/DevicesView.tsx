import React, { useEffect, useState } from 'react';
import {
  Check,
  HardDrive,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  DeviceMetadata,
  FetchLiveStatus,
  LiveTelemetry,
  ThresholdConfig,
} from '../types/floodguard';
import { DEFAULT_THRESHOLDS, formatTimestamp } from '../utils/telemetry';

interface DevicesViewProps {
  devices: DeviceMetadata[];
  activeDeviceId: string;
  metadata: DeviceMetadata;
  thresholds: ThresholdConfig;
  telemetry: LiveTelemetry | null;
  fetchStatus: FetchLiveStatus;
  onSelectDevice: (deviceId: string) => void;
  onSaveMetadata: (meta: DeviceMetadata) => Promise<void>;
  onSaveThresholds: (thresholds: ThresholdConfig) => Promise<void>;
  onRegisterDevice: (newMeta: DeviceMetadata) => Promise<void>;
  onResetConfig: () => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  activeDeviceId,
  metadata,
  thresholds,
  telemetry,
  fetchStatus,
  onSelectDevice,
  onSaveMetadata,
  onSaveThresholds,
  onRegisterDevice,
  onResetConfig,
}) => {
  const [deviceName, setDeviceName] = useState(metadata.deviceName);
  const [location, setLocation] = useState(metadata.location);
  const [latStr, setLatStr] = useState(
    typeof metadata.coordinates?.lat === 'number' ? String(metadata.coordinates.lat) : ''
  );
  const [lngStr, setLngStr] = useState(
    typeof metadata.coordinates?.lng === 'number' ? String(metadata.coordinates.lng) : ''
  );
  const [installationDetails, setInstallationDetails] = useState(metadata.installationDetails);
  const [intervalSec, setIntervalSec] = useState(String(metadata.reportingIntervalSec));
  const [timeoutSec, setTimeoutSec] = useState(String(metadata.offlineTimeoutSec));

  const [warningCm, setWarningCm] = useState(String(thresholds.warningCm));
  const [dangerCm, setDangerCm] = useState(String(thresholds.dangerCm));
  const [criticalCm, setCriticalCm] = useState(String(thresholds.criticalCm));
  const [mountHeightCm, setMountHeightCm] = useState(String(thresholds.sensorMountHeightCm));

  const [showNewForm, setShowNewForm] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('device_002');
  const [newDeviceName, setNewDeviceName] = useState('Tiruvallur Culvert Node 02');
  const [newDeviceLocation, setNewDeviceLocation] = useState('Tiruvallur, Tamil Nadu, India');

  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDeviceName(metadata.deviceName);
    setLocation(metadata.location);
    setLatStr(typeof metadata.coordinates?.lat === 'number' ? String(metadata.coordinates.lat) : '');
    setLngStr(typeof metadata.coordinates?.lng === 'number' ? String(metadata.coordinates.lng) : '');
    setInstallationDetails(metadata.installationDetails);
    setIntervalSec(String(metadata.reportingIntervalSec));
    setTimeoutSec(String(metadata.offlineTimeoutSec));
  }, [metadata]);

  useEffect(() => {
    setWarningCm(String(thresholds.warningCm));
    setDangerCm(String(thresholds.dangerCm));
    setCriticalCm(String(thresholds.criticalCm));
    setMountHeightCm(String(thresholds.sensorMountHeightCm));
  }, [thresholds]);

  const handleSaveDeviceAndThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const parsedInterval = Math.max(2, Number(intervalSec) || 2);
    const parsedTimeout = Math.max(5, Number(timeoutSec) || 15);
    const w = Number(warningCm);
    const d = Number(dangerCm);
    const cr = Number(criticalCm);
    const mh = Number(mountHeightCm);

    if (!Number.isFinite(w) || !Number.isFinite(d) || !Number.isFinite(cr) || !Number.isFinite(mh)) {
      setStatusMsg({ type: 'err', text: 'All threshold values must be valid numbers.' });
      return;
    }
    if (w <= 0 || d < w || cr < d) {
      setStatusMsg({
        type: 'err',
        text: 'Thresholds must satisfy: 0 < Warning ≤ Danger ≤ Critical.',
      });
      return;
    }

    const latVal = latStr.trim() === '' ? null : Number(latStr);
    const lngVal = lngStr.trim() === '' ? null : Number(lngStr);
    if ((latVal !== null && !Number.isFinite(latVal)) || (lngVal !== null && !Number.isFinite(lngVal))) {
      setStatusMsg({ type: 'err', text: 'Coordinates must be valid decimal degrees or left empty.' });
      return;
    }

    setSaving(true);
    try {
      await onSaveMetadata({
        ...metadata,
        deviceName: deviceName.trim() || metadata.deviceId,
        location: location.trim() || 'Tiruvallur, Tamil Nadu, India',
        coordinates: latVal !== null && lngVal !== null ? { lat: latVal, lng: lngVal } : undefined,
        installationDetails: installationDetails.trim() || 'ESP32 Ultrasonic + DHT11 Node',
        reportingIntervalSec: parsedInterval,
        offlineTimeoutSec: parsedTimeout,
      });

      await onSaveThresholds({
        warningCm: w,
        dangerCm: d,
        criticalCm: cr,
        sensorMountHeightCm: Math.max(5, mh),
      });

      setStatusMsg({
        type: 'ok',
        text: 'Device metadata and thresholds saved.',
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save configuration.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newDeviceId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!cleanId) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await onRegisterDevice({
        deviceId: cleanId,
        deviceName: newDeviceName.trim() || cleanId,
        location: newDeviceLocation.trim() || 'Tiruvallur, Tamil Nadu, India',
        installationDetails: 'ESP32 Ultrasonic + DHT11 Node',
        reportingIntervalSec: 2,
        offlineTimeoutSec: 15,
        createdAt: Date.now(),
      });
      setShowNewForm(false);
      setStatusMsg({ type: 'ok', text: `Device ${cleanId} registered and selected.` });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to register device.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Device Management & Thresholds
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage ESP32 node metadata, Tiruvallur location, and flood-level thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register Device</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setWarningCm(String(DEFAULT_THRESHOLDS.warningCm));
              setDangerCm(String(DEFAULT_THRESHOLDS.dangerCm));
              setCriticalCm(String(DEFAULT_THRESHOLDS.criticalCm));
              setMountHeightCm(String(DEFAULT_THRESHOLDS.sensorMountHeightCm));
              onResetConfig();
              setStatusMsg({ type: 'ok', text: 'Configuration reset to default values.' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`rounded-lg border px-4 py-3 text-xs ${
            statusMsg.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {showNewForm && (
        <form
          onSubmit={handleRegister}
          className="rounded-xl border border-cyan-500/30 bg-white dark:bg-[#0D1322] p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Register New ESP32 Device
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <label className="space-y-1.5">
              <span className="block text-slate-600 dark:text-slate-400">Device ID</span>
              <input
                type="text"
                required
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="device_002"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-slate-600 dark:text-slate-400">Device Name</span>
              <input
                type="text"
                required
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-slate-600 dark:text-slate-400">Location</span>
              <input
                type="text"
                required
                value={newDeviceLocation}
                onChange={(e) => setNewDeviceLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
            >
              Create Device
            </button>
          </div>
        </form>
      )}

      {/* Multi-device Switcher */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-500" />
            <span>Registered Nodes ({devices.length})</span>
          </h2>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Active: {activeDeviceId}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {devices.map((dev) => {
            const isSelected = dev.deviceId === activeDeviceId;
            return (
              <button
                key={dev.deviceId}
                type="button"
                onClick={() => onSelectDevice(dev.deviceId)}
                className={`text-left rounded-lg border p-3.5 transition-colors ${
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-500/[0.08]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {dev.deviceId}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white truncate">
                  {dev.deviceName}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {dev.location}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSaveDeviceAndThresholds}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>Node Identity & Location</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="block text-slate-500 dark:text-slate-400">Device ID</span>
                <input
                  type="text"
                  disabled
                  value={metadata.deviceId}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 font-mono text-slate-500 cursor-not-allowed"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-slate-500 dark:text-slate-400">Live Feed Status</span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono">
                  {fetchStatus === 'live' ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">LIVE</span>
                    </>
                  ) : fetchStatus === 'waiting' ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-cyan-500" />
                      <span className="text-cyan-600 dark:text-cyan-400">WAITING FOR DATA</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400">
                        {fetchStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="block text-slate-500 dark:text-slate-400">Device Name</span>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="block text-slate-500 dark:text-slate-400">Location Name</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Tiruvallur, Tamil Nadu, India"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="block text-slate-500 dark:text-slate-400">
                  Latitude (optional)
                </span>
                <input
                  type="text"
                  value={latStr}
                  onChange={(e) => setLatStr(e.target.value)}
                  placeholder="Leave blank if unset"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-slate-500 dark:text-slate-400">
                  Longitude (optional)
                </span>
                <input
                  type="text"
                  value={lngStr}
                  onChange={(e) => setLngStr(e.target.value)}
                  placeholder="Leave blank if unset"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="block text-slate-500 dark:text-slate-400">
                Installation Details
              </span>
              <input
                type="text"
                value={installationDetails}
                onChange={(e) => setInstallationDetails(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="block text-slate-500 dark:text-slate-400">
                  Reporting Interval (sec)
                </span>
                <input
                  type="number"
                  min={2}
                  max={3600}
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-slate-500 dark:text-slate-400">
                  Offline Timeout (sec)
                </span>
                <input
                  type="number"
                  min={5}
                  max={7200}
                  value={timeoutSec}
                  onChange={(e) => setTimeoutSec(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Sliders className="w-4 h-4 text-cyan-500" />
              <span>Flood-Level Thresholds (cm)</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Used when JSON payload omits <code className="font-mono">status</code> and for chart threshold markers.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="block text-yellow-600 dark:text-yellow-400 font-medium">
                  Warning Threshold (cm)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={warningCm}
                  onChange={(e) => setWarningCm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>

              <label className="space-y-1">
                <span className="block text-orange-600 dark:text-orange-400 font-medium">
                  Danger Threshold (cm)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={dangerCm}
                  onChange={(e) => setDangerCm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>

              <label className="space-y-1">
                <span className="block text-rose-600 dark:text-rose-400 font-medium">
                  Critical Threshold (cm)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={criticalCm}
                  onChange={(e) => setCriticalCm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>

              <label className="space-y-1">
                <span className="block text-slate-500 dark:text-slate-400 font-medium">
                  Sensor Mount Height (cm)
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  value={mountHeightCm}
                  onChange={(e) => setMountHeightCm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Device & Thresholds'}</span>
              </button>
            </div>
          </div>

          {/* Last Received Reading Snapshot */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Last Received Reading
            </h3>
            {telemetry ? (
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Water Level:</span>{' '}
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {telemetry.waterLevel !== null ? `${telemetry.waterLevel.toFixed(2)} cm` : 'Invalid'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Distance:</span>{' '}
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {telemetry.distance !== null ? `${telemetry.distance.toFixed(2)} cm` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Temperature:</span>{' '}
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {telemetry.temperature !== null ? `${telemetry.temperature.toFixed(1)} °C` : 'Invalid'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Humidity:</span>{' '}
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {telemetry.humidity !== null ? `${Math.round(telemetry.humidity)}%` : 'Invalid'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Status:</span>{' '}
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {telemetry.floodStatus}
                  </span>
                </div>
                <div className="col-span-2 text-slate-500 dark:text-slate-400">
                  Timestamp: {formatTimestamp(telemetry.lastUpdated)}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No telemetry packet has been received from Firebase yet.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
