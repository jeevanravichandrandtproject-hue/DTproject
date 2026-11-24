import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BellOff,
  Check,
  CheckCheck,
  Flame,
  Info,
  Volume2,
} from 'lucide-react';
import { AlertRecord, ThresholdConfig } from '../types/floodguard';
import { formatTimestamp } from '../utils/telemetry';

interface AlertsViewProps {
  alerts: AlertRecord[];
  thresholds: ThresholdConfig;
  onAcknowledge: (alertId: string) => Promise<void>;
  onAcknowledgeAll: () => Promise<void>;
}

type AlertFilter = 'all' | 'unack' | 'critical' | 'anomaly';

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  thresholds,
  onAcknowledge,
  onAcknowledgeAll,
}) => {
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'unack') return !a.acknowledged;
      if (filter === 'critical') return a.severity === 'CRITICAL' || a.severity === 'DANGER';
      if (filter === 'anomaly')
        return (
          a.type === 'SENSOR_ANOMALY' ||
          a.type === 'DEVICE_OFFLINE' ||
          a.type === 'FIREBASE_ERROR'
        );
      return true;
    });
  }, [alerts, filter]);

  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  const handleAck = async (id: string) => {
    setBusyId(id);
    try {
      await onAcknowledge(id);
    } finally {
      setBusyId(null);
    }
  };

  const severityStyle = (sev: AlertRecord['severity']) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          text: 'text-rose-600 dark:text-rose-400',
          Icon: AlertOctagon,
        };
      case 'DANGER':
        return {
          text: 'text-orange-600 dark:text-orange-400',
          Icon: Flame,
        };
      case 'WARNING':
        return {
          text: 'text-yellow-600 dark:text-yellow-400',
          Icon: AlertTriangle,
        };
      default:
        return {
          text: 'text-cyan-600 dark:text-cyan-400',
          Icon: Info,
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Alert History & Threshold Events
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generated automatically from live fetched Firebase status transitions (WARNING, DANGER, CRITICAL) and offline/sensor events.
          </p>
        </div>

        {unackCount > 0 && (
          <button
            type="button"
            onClick={onAcknowledgeAll}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Acknowledge All ({unackCount})</span>
          </button>
        )}
      </div>

      {/* Autonomous Local Buzzer Info */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-3">
          <Volume2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">
              Autonomous ESP32 Buzzer Logic:
            </span>{' '}
            Local buzzer triggers on GPIO 19 independently of Wi-Fi/Firebase connectivity at Warning (
            {Number(thresholds?.warningCm ?? 2.0).toFixed(1)} cm), Danger (
            {Number(thresholds?.dangerCm ?? 2.5).toFixed(1)} cm), and Critical (
            {Number(thresholds?.criticalCm ?? 3.0).toFixed(1)} cm).
          </div>
        </div>
        <div className="text-slate-500 dark:text-slate-400 shrink-0">
          DHT11 temp/humidity provide context only.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          role="group"
          aria-label="Filter alert history"
        >
          {(
            [
              { id: 'all', label: `All (${alerts.length})` },
              { id: 'unack', label: `Unacknowledged (${unackCount})` },
              { id: 'critical', label: 'Danger & Critical' },
              { id: 'anomaly', label: 'Anomalies & Offline' },
            ] as { id: AlertFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List / Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] py-14 px-6 text-center">
          <BellOff className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No alerts match this filter
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Live status transitions into WARNING, DANGER, CRITICAL, or fetch failures will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4 text-right">Water Level</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filtered.map((alert) => {
                  const style = severityStyle(alert.severity);
                  const SevIcon = style.Icon;
                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-mono font-semibold ${style.text}`}>
                          <SevIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{alert.severity}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {alert.type}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 max-w-md">
                        {alert.message}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {alert.waterLevel !== null ? `${alert.waterLevel.toFixed(2)} cm` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatTimestamp(alert.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {alert.acknowledged ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Acknowledged</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === alert.id}
                            onClick={() => handleAck(alert.id)}
                            className="px-2.5 py-1 rounded-md border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10 transition-colors font-medium disabled:opacity-50"
                          >
                            {busyId === alert.id ? 'Saving...' : 'Acknowledge'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
