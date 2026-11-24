import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  AlertRecord,
  FetchLiveStatus,
  FloodRiskLevel,
  ThresholdConfig,
} from '../types/floodguard';
import { formatRelativeTime } from '../utils/telemetry';

interface FloodRiskBannerProps {
  status: FloodRiskLevel;
  hasLiveTelemetry: boolean;
  waterLevel: number | null;
  distance: number | null;
  thresholds: ThresholdConfig;
  fetchStatus: FetchLiveStatus;
  latestAlert: AlertRecord | null;
  nowMs: number;
  onViewAlerts: () => void;
}

const STATUS_META: Record<
  FloodRiskLevel,
  {
    label: string;
    summary: string;
    containerClass: string;
    textClass: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  SAFE: {
    label: 'SAFE',
    summary: 'Water level is within safe operating limits.',
    containerClass:
      'border-emerald-500/30 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.07]',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    Icon: CheckCircle2,
  },
  WARNING: {
    label: 'WARNING',
    summary: 'Water level entered warning zone. Monitor drainage flow closely.',
    containerClass:
      'border-yellow-500/40 bg-yellow-500/[0.08] dark:bg-yellow-500/[0.08]',
    textClass: 'text-yellow-700 dark:text-yellow-300',
    Icon: AlertTriangle,
  },
  DANGER: {
    label: 'DANGER',
    summary: 'High water level detected — approaching critical overflow stage.',
    containerClass:
      'border-orange-500/45 bg-orange-500/[0.10] dark:bg-orange-500/[0.11]',
    textClass: 'text-orange-700 dark:text-orange-300',
    Icon: Flame,
  },
  CRITICAL: {
    label: 'CRITICAL',
    summary: 'Critical flood threshold reached. Immediate attention required.',
    containerClass:
      'border-rose-500/50 bg-rose-500/[0.10] dark:bg-rose-500/[0.12]',
    textClass: 'text-rose-700 dark:text-rose-300',
    Icon: AlertOctagon,
  },
};

const TIERS: { level: FloodRiskLevel; color: string; dot: string }[] = [
  { level: 'SAFE', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { level: 'WARNING', color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
  { level: 'DANGER', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  { level: 'CRITICAL', color: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
];

export const FloodRiskBanner: React.FC<FloodRiskBannerProps> = ({
  status,
  hasLiveTelemetry,
  waterLevel,
  distance,
  thresholds,
  fetchStatus,
  latestAlert,
  nowMs,
  onViewAlerts,
}) => {
  const active = STATUS_META[status] || STATUS_META.SAFE;
  const StatusIcon = active.Icon;
  const warningCm = Number.isFinite(thresholds?.warningCm) ? thresholds.warningCm : 2.0;
  const dangerCm = Number.isFinite(thresholds?.dangerCm) ? thresholds.dangerCm : 2.5;
  const criticalCm = Number.isFinite(thresholds?.criticalCm) ? thresholds.criticalCm : 3.0;

  return (
    <section
      aria-label="Flood Risk Status"
      className={`rounded-xl border p-5 transition-colors ${
        !hasLiveTelemetry
          ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322]'
          : active.containerClass
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-lg border border-current/20 ${
              hasLiveTelemetry ? active.textClass : 'text-slate-400'
            } shrink-0`}
          >
            <StatusIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Flood Risk Status
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span
                className={`text-lg font-bold tracking-tight ${
                  hasLiveTelemetry
                    ? active.textClass
                    : fetchStatus === 'waiting'
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {hasLiveTelemetry
                  ? active.label
                  : fetchStatus === 'waiting'
                    ? 'Connected - Waiting for ESP32 data'
                    : fetchStatus === 'connecting'
                      ? 'CONNECTING'
                      : 'OFFLINE'}
              </span>
              {fetchStatus === 'offline' && hasLiveTelemetry && (
                <>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-mono text-rose-600 dark:text-rose-400">
                    Fetch Offline (showing last received state)
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {!hasLiveTelemetry
                ? fetchStatus === 'waiting'
                  ? 'Connected to Firebase endpoint. No sensor payload has been sent by the ESP32 yet.'
                  : 'Waiting for live JSON response from Firebase Realtime Database.'
                : waterLevel === null
                  ? 'Awaiting valid water-level measurement.'
                  : active.summary}
            </p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {hasLiveTelemetry && (
                <>
                  Water: {waterLevel !== null ? `${waterLevel.toFixed(2)} cm` : '—'} · Distance:{' '}
                  {distance !== null ? `${distance.toFixed(2)} cm` : '—'} ·{' '}
                </>
              )}
              Thresholds: Safe &lt; {warningCm.toFixed(1)} cm · Warning{' '}
              {warningCm.toFixed(1)} cm · Danger {dangerCm.toFixed(1)} cm ·
              Critical ≥ {criticalCm.toFixed(1)} cm
            </p>
          </div>
        </div>

        {/* 4-tier visual state scale + Latest Alert link */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
          <div
            className="grid grid-cols-4 gap-1.5 w-full sm:w-auto"
            role="list"
            aria-label="Four-level flood risk scale"
          >
            {TIERS.map((tier) => {
              const isCurrent = hasLiveTelemetry && tier.level === status;
              return (
                <div
                  key={tier.level}
                  role="listitem"
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-mono font-semibold transition-colors ${
                    isCurrent
                      ? `border-current bg-white/80 dark:bg-slate-900/90 ${tier.color}`
                      : 'border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-65'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} aria-hidden="true" />
                  <span>{tier.level}</span>
                </div>
              );
            })}
          </div>

          {latestAlert ? (
            <button
              type="button"
              onClick={onViewAlerts}
              className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate max-w-[260px]">
                Latest: {latestAlert.severity} ({formatRelativeTime(latestAlert.timestamp, nowMs)})
              </span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              No threshold breaches recorded
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
