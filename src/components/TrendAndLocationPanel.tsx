import React from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Edit3,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import {
  DeviceMetadata,
  FetchLiveStatus,
  HistoricalReading,
  TrendAnalysis,
} from '../types/floodguard';

interface TrendAndLocationPanelProps {
  trend: TrendAnalysis;
  history: HistoricalReading[];
  metadata: DeviceMetadata;
  fetchStatus: FetchLiveStatus;
  onEditLocation: () => void;
}

export const TrendAndLocationPanel: React.FC<TrendAndLocationPanelProps> = ({
  trend,
  history,
  metadata,
  fetchStatus,
  onEditLocation,
}) => {
  const recentPoints = history
    .filter((r) => r.waterLevel !== null)
    .slice(-16)
    .map((r) => r.waterLevel as number);

  const sparklinePath = React.useMemo(() => {
    if (recentPoints.length < 2) return '';
    const min = Math.min(...recentPoints);
    const max = Math.max(...recentPoints);
    const range = max - min || 0.5;
    const width = 220;
    const height = 48;

    return recentPoints
      .map((val, idx) => {
        const x = (idx / (recentPoints.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [recentPoints]);

  const DirIcon =
    trend.direction === 'RISING'
      ? ArrowUpRight
      : trend.direction === 'FALLING'
        ? ArrowDownRight
        : ArrowRight;

  const dirColor =
    trend.direction === 'RISING'
      ? 'text-amber-600 dark:text-amber-400'
      : trend.direction === 'FALLING'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-cyan-600 dark:text-cyan-400';

  const hasCoords =
    typeof metadata.coordinates?.lat === 'number' &&
    typeof metadata.coordinates?.lng === 'number';

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Water Level Trend Analysis */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <TrendingUp className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>Water Level Trend</span>
            </div>
            <div className={`flex items-center gap-2 text-2xl font-bold ${dirColor}`}>
              <DirIcon className="w-6 h-6" />
              <span>{trend.direction}</span>
            </div>
          </div>

          <div className="w-[220px] h-12 shrink-0 flex items-center justify-end">
            {sparklinePath ? (
              <svg width="220" height="48" viewBox="0 0 220 48" className="overflow-visible">
                <path
                  d={sparklinePath}
                  fill="none"
                  className="stroke-cyan-500"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Awaiting trend samples
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400">Delta vs Previous</div>
            <div className="mt-1 font-mono font-semibold text-sm text-slate-900 dark:text-white tabular-nums">
              {trend.deltaFromPrevious !== null
                ? `${trend.deltaFromPrevious >= 0 ? '+' : ''}${trend.deltaFromPrevious.toFixed(2)} cm`
                : 'Insufficient data'}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400">Rate of Change</div>
            <div className="mt-1 font-mono font-semibold text-sm text-slate-900 dark:text-white tabular-nums">
              {trend.sufficientForRate && trend.rateCmPerMin !== null
                ? `${trend.rateCmPerMin >= 0 ? '+' : ''}${trend.rateCmPerMin.toFixed(3)} cm/min`
                : 'Insufficient readings'}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400">Hourly Equivalent</div>
            <div className="mt-1 font-mono font-semibold text-sm text-slate-900 dark:text-white tabular-nums">
              {trend.sufficientForRate && trend.rateCmPerHour !== null
                ? `${trend.rateCmPerHour >= 0 ? '+' : ''}${trend.rateCmPerHour.toFixed(2)} cm/hr`
                : `${trend.sampleCount}/3 samples`}
            </div>
          </div>
        </div>
      </div>

      {/* Tiruvallur Field Location Panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Monitoring Location</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {metadata.location}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {metadata.deviceName} · <span className="font-mono">{metadata.deviceId}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onEditLocation}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-cyan-500/40 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Node</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400">Coordinates</div>
            <div className="mt-1 font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              {hasCoords
                ? `${metadata.coordinates!.lat!.toFixed(4)}, ${metadata.coordinates!.lng!.toFixed(4)}`
                : 'Not configured'}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400">Installation</div>
            <div className="mt-1 text-slate-800 dark:text-slate-200 truncate" title={metadata.installationDetails}>
              {metadata.installationDetails}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400">Local Monitoring</div>
            <div className="mt-1 font-mono font-medium text-slate-800 dark:text-slate-200">
              {fetchStatus === 'live'
                ? 'Live (2s REST fetch)'
                : fetchStatus === 'waiting'
                  ? 'Connected - Waiting for ESP32 data'
                  : fetchStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Offline'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
