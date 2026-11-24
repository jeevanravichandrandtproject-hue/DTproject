import React from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Droplets,
  Ruler,
  Thermometer,
  Waves,
} from 'lucide-react';
import {
  HistoricalReading,
  LiveTelemetry,
  ThresholdConfig,
  TrendAnalysis,
} from '../types/floodguard';

interface SensorCardsProps {
  telemetry: LiveTelemetry | null;
  thresholds: ThresholdConfig;
  trendAnalysis: TrendAnalysis;
  history: HistoricalReading[];
}

function getDelta(
  history: HistoricalReading[],
  selector: (r: HistoricalReading) => number | null
): number | null {
  const valid = history
    .map((r) => selector(r))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length < 2) return null;
  return Number((valid[valid.length - 1] - valid[valid.length - 2]).toFixed(2));
}

export const SensorCards: React.FC<SensorCardsProps> = ({
  telemetry,
  thresholds,
  trendAnalysis,
  history,
}) => {
  const waterLevel = telemetry?.waterLevel ?? null;
  const distance = telemetry?.distance ?? null;
  const temperature = telemetry?.temperature ?? null;
  const humidity = telemetry?.humidity ?? null;

  const tempDelta = getDelta(history, (r) => r.temperature);
  const humDelta = getDelta(history, (r) => r.humidity);

  const visualMaxCm = Math.max(thresholds.criticalCm * 1.6, waterLevel ? waterLevel * 1.2 : 5, 5);
  const fillPercent =
    waterLevel !== null ? Math.min(100, Math.max(3, (waterLevel / visualMaxCm) * 100)) : 0;

  const warningPct = Math.min(98, (thresholds.warningCm / visualMaxCm) * 100);
  const criticalPct = Math.min(98, (thresholds.criticalCm / visualMaxCm) * 100);

  const waterFillColor =
    telemetry?.floodStatus === 'CRITICAL'
      ? 'from-rose-600/90 to-rose-400/80'
      : telemetry?.floodStatus === 'DANGER'
        ? 'from-orange-600/90 to-orange-400/80'
        : telemetry?.floodStatus === 'WARNING'
          ? 'from-amber-500/90 to-yellow-400/80'
          : 'from-blue-600/85 to-cyan-400/80';

  const TrendIcon =
    trendAnalysis.direction === 'RISING'
      ? ArrowUpRight
      : trendAnalysis.direction === 'FALLING'
        ? ArrowDownRight
        : ArrowRight;

  const trendColor =
    trendAnalysis.direction === 'RISING'
      ? 'text-amber-600 dark:text-amber-400'
      : trendAnalysis.direction === 'FALLING'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-500 dark:text-slate-400';

  const tempPercent =
    temperature !== null ? Math.min(100, Math.max(0, (temperature / 50) * 100)) : 0;
  const humPercent =
    humidity !== null ? Math.min(100, Math.max(0, humidity)) : 0;

  return (
    <section
      aria-label="Primary Sensor Telemetry"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {/* 1. WATER LEVEL CARD */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex justify-between gap-4">
        <div className="flex flex-col justify-between min-w-0 flex-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Waves className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>Water Level</span>
            </div>

            {telemetry && !telemetry.ultrasonicOk ? (
              <div className="pt-2 flex items-center gap-2 text-rose-500 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Sensor fault</span>
              </div>
            ) : (
              <div className="pt-2 flex items-baseline">
                <span className="text-3xl font-mono font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {waterLevel !== null ? waterLevel.toFixed(2) : '—'}
                </span>
                <span className="ml-1.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                  cm
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-1 text-xs">
            <div className={`flex items-center gap-1.5 font-mono font-medium ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{trendAnalysis.direction}</span>
              {trendAnalysis.deltaFromPrevious !== null && (
                <span>
                  ({trendAnalysis.deltaFromPrevious >= 0 ? '+' : ''}
                  {trendAnalysis.deltaFromPrevious.toFixed(2)})
                </span>
              )}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              Status: {telemetry ? telemetry.floodStatus : '—'}
            </div>
          </div>
        </div>

        {/* Animated Vertical Water Column Visualizer */}
        <div
          className="relative w-12 h-32 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-950/80 overflow-hidden shrink-0"
          aria-label={
            waterLevel !== null
              ? `Water level gauge at ${waterLevel.toFixed(2)} cm`
              : 'Water level gauge awaiting data'
          }
        >
          <div
            className="absolute inset-x-0 border-t border-dashed border-rose-500/70 z-10 pointer-events-none"
            style={{ bottom: `${criticalPct}%` }}
            title={`Critical: ${thresholds.criticalCm} cm`}
          />
          <div
            className="absolute inset-x-0 border-t border-dashed border-yellow-500/70 z-10 pointer-events-none"
            style={{ bottom: `${warningPct}%` }}
            title={`Warning: ${thresholds.warningCm} cm`}
          />

          <div
            className="absolute inset-0 flex items-end transition-transform duration-500 ease-out"
            style={{ transform: `translateY(${100 - fillPercent}%)` }}
          >
            <div className={`w-full h-full bg-gradient-to-t ${waterFillColor} relative`}>
              <svg
                viewBox="0 0 120 14"
                preserveAspectRatio="none"
                className="w-[180%] h-3 -mt-2 animate-wave-slow opacity-90"
                aria-hidden="true"
              >
                <path
                  d="M0 7 Q 15 0 30 7 T 60 7 T 90 7 T 120 7 V 14 H 0 Z"
                  className="fill-cyan-300/60 dark:fill-cyan-200/40"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ULTRASONIC DISTANCE CARD */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Ruler className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Sensor Distance</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              HC-SR04
            </span>
          </div>

          <div className="pt-2 flex items-baseline">
            <span className="text-3xl font-mono font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {distance !== null ? distance.toFixed(2) : '—'}
            </span>
            <span className="ml-1.5 text-xs font-mono text-slate-400 dark:text-slate-500">
              cm
            </span>
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
              style={{
                width: `${
                  distance !== null
                    ? Math.min(100, Math.max(4, (distance / Math.max(thresholds.sensorMountHeightCm, distance, 30)) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>Clearance to water</span>
            <span>Mount: {thresholds.sensorMountHeightCm.toFixed(0)} cm</span>
          </div>
        </div>
      </div>

      {/* 3. TEMPERATURE CARD */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Thermometer className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Temperature</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              DHT11
            </span>
          </div>

          {telemetry && !telemetry.dhtOk ? (
            <div className="pt-2 flex items-center gap-2 text-rose-500 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>DHT11 read error</span>
            </div>
          ) : (
            <div className="pt-2 flex items-baseline">
              <span className="text-3xl font-mono font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {temperature !== null ? temperature.toFixed(1) : '—'}
              </span>
              <span className="ml-1.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                °C
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 space-y-2">
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500 transition-all duration-500"
              style={{ width: `${tempPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>
              {tempDelta === null
                ? 'Delta: —'
                : `Delta: ${tempDelta >= 0 ? '+' : ''}${tempDelta.toFixed(1)} °C`}
            </span>
            <span>Ambient context</span>
          </div>
        </div>
      </div>

      {/* 4. HUMIDITY CARD */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Humidity</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              DHT11
            </span>
          </div>

          {telemetry && !telemetry.dhtOk ? (
            <div className="pt-2 flex items-center gap-2 text-rose-500 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>DHT11 read error</span>
            </div>
          ) : (
            <div className="pt-2 flex items-baseline">
              <span className="text-3xl font-mono font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {humidity !== null ? Math.round(humidity) : '—'}
              </span>
              <span className="ml-1.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                %
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 space-y-2">
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${humPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>
              {humDelta === null
                ? 'Delta: —'
                : `Delta: ${humDelta >= 0 ? '+' : ''}${humDelta.toFixed(0)} %`}
            </span>
            <span>0–100 % RH</span>
          </div>
        </div>
      </div>
    </section>
  );
};
