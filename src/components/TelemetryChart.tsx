import React, { useMemo, useState } from 'react';
import {
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Download, RotateCcw } from 'lucide-react';
import {
  HistoricalReading,
  ThresholdConfig,
  TimeRangeKey,
} from '../types/floodguard';
import {
  exportReadingsToCsv,
  formatShortTime,
  formatTimestamp,
} from '../utils/telemetry';

interface TelemetryChartProps {
  readings: HistoricalReading[];
  thresholds: ThresholdConfig;
  deviceName: string;
  nowMs: number;
  endpointUrl: string;
}

const RANGE_MS: Record<TimeRangeKey, number> = {
  '1H': 60 * 60 * 1000,
  '6H': 6 * 60 * 60 * 1000,
  '24H': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
};

const RANGE_LABELS: { key: TimeRangeKey; label: string }[] = [
  { key: '1H', label: '1 Hour' },
  { key: '6H', label: '6 Hours' },
  { key: '24H', label: '24 Hours' },
  { key: '7D', label: '7 Days' },
];

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  readings,
  thresholds,
  deviceName,
  nowMs,
  endpointUrl,
}) => {
  const [range, setRange] = useState<TimeRangeKey>('1H');
  const [showWater, setShowWater] = useState(true);
  const [showDistance, setShowDistance] = useState(false);
  const [showTemp, setShowTemp] = useState(true);
  const [showHumidity, setShowHumidity] = useState(true);
  const [brushKey, setBrushKey] = useState(0);

  const filteredData = useMemo(() => {
    const cutoff = nowMs - RANGE_MS[range];
    return readings
      .filter((r) => r.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((r) => ({
        ...r,
        timeLabel: formatShortTime(r.timestamp, range === '7D' || range === '24H'),
      }));
  }, [readings, range, nowMs]);

  const hasData = filteredData.length > 0;
  const hasLeftAxis = showWater || showDistance;
  const hasSecondary = showTemp || showHumidity;

  return (
    <section
      aria-label="Historical Sensor Telemetry Graph"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Live Sensor Telemetry Chart
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredData.length} live polled samples in {range} window · Polling every 2s
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Series toggles */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chart series toggles">
            <button
              type="button"
              onClick={() => setShowWater((v) => !v)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                showWater
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Water (cm)
            </button>
            <button
              type="button"
              onClick={() => setShowDistance((v) => !v)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                showDistance
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Distance (cm)
            </button>
            <button
              type="button"
              onClick={() => setShowTemp((v) => !v)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                showTemp
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Temp (°C)
            </button>
            <button
              type="button"
              onClick={() => setShowHumidity((v) => !v)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                showHumidity
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Humidity (%)
            </button>
          </div>

          {/* Time Range Selector */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            role="group"
            aria-label="Time range selector"
          >
            {RANGE_LABELS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setRange(item.key);
                  setBrushKey((k) => k + 1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  range === item.key
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Zoom reset + CSV Export */}
          {hasData && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBrushKey((k) => k + 1)}
                title="Reset zoom window"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => exportReadingsToCsv(filteredData, deviceName)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Area or Empty State */}
      {!hasData ? (
        <div className="h-72 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center px-6">
          <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No live readings recorded yet in the {range} window
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
            Polling{' '}
            <code className="font-mono text-cyan-600 dark:text-cyan-400">{endpointUrl}</code>{' '}
            every 2 seconds. As soon as valid JSON telemetry is fetched, live curves will plot here automatically.
          </p>
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredData}
              margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.14)"
                vertical={false}
              />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'IBM Plex Mono' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                minTickGap={28}
              />
              {hasLeftAxis && (
                <YAxis
                  yAxisId="water"
                  tick={{ fontSize: 11, fill: '#22D3EE', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[
                    0,
                    (dataMax: number) =>
                      Math.max(4, Math.ceil(Math.max(dataMax, thresholds.criticalCm) + 0.8)),
                  ]}
                  unit=" cm"
                />
              )}
              {hasSecondary && (
                <YAxis
                  yAxisId="env"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const pt = payload[0].payload as HistoricalReading;
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#090E1A]/95 px-3 py-2.5 shadow-lg text-xs space-y-1.5 backdrop-blur-sm">
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {formatTimestamp(pt.timestamp)}
                      </div>
                      <div className="space-y-1 font-mono tabular-nums">
                        {typeof pt.waterLevel === 'number' && (
                          <div className="flex items-center justify-between gap-4 text-cyan-600 dark:text-cyan-400">
                            <span>Water Level</span>
                            <span className="font-semibold">{pt.waterLevel.toFixed(2)} cm</span>
                          </div>
                        )}
                        {typeof pt.distance === 'number' && (
                          <div className="flex items-center justify-between gap-4 text-indigo-500 dark:text-indigo-400">
                            <span>Distance</span>
                            <span className="font-semibold">{pt.distance.toFixed(2)} cm</span>
                          </div>
                        )}
                        {typeof pt.temperature === 'number' && (
                          <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400">
                            <span>Temperature</span>
                            <span className="font-semibold">{pt.temperature.toFixed(1)} °C</span>
                          </div>
                        )}
                        {typeof pt.humidity === 'number' && (
                          <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                            <span>Humidity</span>
                            <span className="font-semibold">{Math.round(pt.humidity)} %</span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                          <span>Status</span>
                          <span className="font-semibold">{pt.floodStatus}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {showWater && (
                <>
                  <ReferenceLine
                    yAxisId="water"
                    y={thresholds.warningCm}
                    stroke="#EAB308"
                    strokeDasharray="4 4"
                    strokeOpacity={0.75}
                  />
                  <ReferenceLine
                    yAxisId="water"
                    y={thresholds.criticalCm}
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    strokeOpacity={0.8}
                  />
                  <Line
                    yAxisId="water"
                    type="monotone"
                    dataKey="waterLevel"
                    name="Water Level (cm)"
                    stroke="#06B6D4"
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#06B6D4' }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </>
              )}

              {showDistance && (
                <Line
                  yAxisId="water"
                  type="monotone"
                  dataKey="distance"
                  name="Distance (cm)"
                  stroke="#818CF8"
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 3.5, fill: '#818CF8' }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {showTemp && (
                <Line
                  yAxisId="env"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#3B82F6"
                  strokeWidth={1.6}
                  dot={false}
                  activeDot={{ r: 3.5, fill: '#3B82F6' }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {showHumidity && (
                <Line
                  yAxisId="env"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity (%)"
                  stroke="#10B981"
                  strokeWidth={1.4}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 3.5, fill: '#10B981' }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {filteredData.length > 8 && (
                <Brush
                  key={brushKey}
                  dataKey="timeLabel"
                  height={22}
                  stroke="#06B6D4"
                  fill="rgba(15, 23, 42, 0.4)"
                  travellerWidth={8}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
