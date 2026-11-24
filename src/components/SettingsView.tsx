import React, { useState } from 'react';
import {
  Bell,
  Database,
  Moon,
  RotateCcw,
  Sun,
  Volume2,
} from 'lucide-react';
import {
  AlertPreferences,
  AppView,
  DeviceMetadata,
  ThresholdConfig,
} from '../types/floodguard';
import { playAlertTone } from '../utils/telemetry';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: (next: 'dark' | 'light') => void;
  alertPrefs: AlertPreferences;
  onUpdateAlertPrefs: (next: AlertPreferences) => void;
  thresholds: ThresholdConfig;
  metadata: DeviceMetadata;
  onNavigate: (view: AppView) => void;
  onResetAllConfig: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  alertPrefs,
  onUpdateAlertPrefs,
  thresholds,
  metadata,
  onNavigate,
  onResetAllConfig,
}) => {
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  const handleToggleNotifications = async () => {
    if (!alertPrefs.enableBrowserNotifications && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setNotifStatus('Browser notification permission was denied.');
        return;
      }
      setNotifStatus('Browser notifications enabled for Danger and Critical transitions.');
    }
    onUpdateAlertPrefs({
      ...alertPrefs,
      enableBrowserNotifications: !alertPrefs.enableBrowserNotifications,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          System Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure appearance, browser alert notifications, and quick access to Firebase and threshold controls.
        </p>
      </div>

      {/* Theme Settings */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Interface Theme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Command Dark is optimized for low-light emergency monitoring; Crisp Light improves outdoor daylight legibility.
          </p>
        </div>

        <div
          className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0"
          role="group"
          aria-label="Theme selector"
        >
          <button
            type="button"
            onClick={() => onToggleTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Command Dark</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleTheme('light')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Crisp Light</span>
          </button>
        </div>
      </section>

      {/* Alert Preferences */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Bell className="w-4 h-4 text-cyan-500" />
          <span>Dashboard Alert Preferences</span>
        </div>

        {notifStatus && (
          <p className="text-xs text-cyan-600 dark:text-cyan-400">{notifStatus}</p>
        )}

        <div className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                Browser Push Notifications
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Notify when live status transitions into Danger or Critical flood status.
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap shrink-0 ${
                alertPrefs.enableBrowserNotifications
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {alertPrefs.enableBrowserNotifications ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                Web Audio Alert Chime
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Play an audible alert chime in the browser alongside the ESP32 hardware buzzer.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => playAlertTone('DANGER')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateAlertPrefs({
                    ...alertPrefs,
                    enableSoundAlert: !alertPrefs.enableSoundAlert,
                  })
                }
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
                  alertPrefs.enableSoundAlert
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {alertPrefs.enableSoundAlert ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                Alert Deduplication Cooldown (seconds)
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Prevents duplicate alert logs while water remains in the same risk state.
              </div>
            </div>
            <input
              type="number"
              min={15}
              max={3600}
              value={alertPrefs.dedupCooldownSec}
              onChange={(e) =>
                onUpdateAlertPrefs({
                  ...alertPrefs,
                  dedupCooldownSec: Math.max(15, Number(e.target.value) || 60),
                })
              }
              className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 font-mono text-right text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </section>

      {/* Active Configuration Summary & Quick Links */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Node & Threshold Configuration Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
          <div>Active Device: {metadata.deviceName} ({metadata.deviceId})</div>
          <div>Location: {metadata.location}</div>
          <div>
            Thresholds: {thresholds.warningCm} / {thresholds.dangerCm} / {thresholds.criticalCm} cm
          </div>
          <div>
            Poll / Offline Timeout: 2s / {metadata.offlineTimeoutSec}s
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('firebase')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40"
          >
            <Database className="w-3.5 h-3.5 text-cyan-500" />
            <span>Configure Firebase Endpoint</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('devices')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40"
          >
            <span>Edit Device & Thresholds</span>
          </button>
          <button
            type="button"
            onClick={onResetAllConfig}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Local Settings</span>
          </button>
        </div>
      </section>
    </div>
  );
};
