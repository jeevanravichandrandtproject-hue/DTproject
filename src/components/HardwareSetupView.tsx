import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Radio,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { generateEsp32Firmware } from '../data/esp32Firmware';
import {
  DeviceMetadata,
  FetchLiveStatus,
  LiveTelemetry,
  ThresholdConfig,
} from '../types/floodguard';
import { formatRelativeTime, formatTimestamp } from '../utils/telemetry';

interface HardwareSetupViewProps {
  metadata: DeviceMetadata;
  telemetry: LiveTelemetry | null;
  thresholds: ThresholdConfig;
  endpointUrl: string;
  fetchStatus: FetchLiveStatus;
  nowMs: number;
}

export const HardwareSetupView: React.FC<HardwareSetupViewProps> = ({
  metadata,
  telemetry,
  thresholds,
  endpointUrl,
  fetchStatus,
  nowMs,
}) => {
  const [copied, setCopied] = useState(false);

  const firmwareCode = useMemo(
    () =>
      generateEsp32Firmware({
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        location: metadata.location,
        databaseUrl: endpointUrl.replace(/\/\.json(\?.*)?$/i, ''),
        reportingIntervalSec: metadata.reportingIntervalSec,
        thresholds,
      }),
    [metadata, endpointUrl, thresholds]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(firmwareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadIno = () => {
    const blob = new Blob([firmwareCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floodguard_${metadata.deviceId}.ino`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ultrasonicOk = telemetry ? telemetry.ultrasonicOk : null;
  const dhtOk = telemetry ? telemetry.dhtOk : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          ESP32 Hardware, Wiring & Firmware
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Live sensor diagnostics, HC-SR04 + DHT11 wiring schematic, and Arduino IDE firmware.
        </p>
      </div>

      {/* Hardware Diagnostics Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-500" />
            <span>Feed Status</span>
          </div>
          <div className="font-mono text-sm font-semibold flex items-center gap-1.5">
            {fetchStatus === 'live' ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">LIVE</span>
              </>
            ) : fetchStatus === 'waiting' ? (
              <>
                <Wifi className="w-4 h-4 text-cyan-500" />
                <span className="text-cyan-600 dark:text-cyan-400">CONNECTED</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">
                  {fetchStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
                </span>
              </>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {fetchStatus === 'waiting' ? 'Waiting for ESP32 data' : `ID: ${metadata.deviceId}`}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">Ultrasonic (HC-SR04)</div>
          <div className="font-mono text-sm font-semibold flex items-center gap-1.5">
            {ultrasonicOk === null ? (
              <span className="text-slate-400">NO DATA</span>
            ) : ultrasonicOk ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">HEALTHY</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">FAULT</span>
              </>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {telemetry?.distance !== null && telemetry?.distance !== undefined
              ? `Dist: ${telemetry.distance.toFixed(2)} cm`
              : 'TRIG GPIO 5 · ECHO GPIO 18'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">DHT11 Temp/Humidity</div>
          <div className="font-mono text-sm font-semibold flex items-center gap-1.5">
            {dhtOk === null ? (
              <span className="text-slate-400">NO DATA</span>
            ) : dhtOk ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">HEALTHY</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">READ ERROR</span>
              </>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400">DATA GPIO 4</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            <span>Last Fetch</span>
          </div>
          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
            {telemetry?.lastUpdated ? formatRelativeTime(telemetry.lastUpdated, nowMs) : 'Never'}
          </div>
          <div className="text-[11px] font-mono text-slate-400 truncate" title={formatTimestamp(telemetry?.lastUpdated)}>
            Poll: 2s · Node: {metadata.reportingIntervalSec}s
          </div>
        </div>
      </section>

      {/* Wiring Schematic + Pinout Table */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Hardware Wiring Schematic
            </h2>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
              3.3V Logic Safe
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 overflow-x-auto">
            <svg
              viewBox="0 0 540 250"
              className="w-full min-w-[460px] h-auto"
              role="img"
              aria-label="ESP32 wiring diagram with HC-SR04 ultrasonic sensor, DHT11, and buzzer"
            >
              <rect x="200" y="25" width="140" height="200" rx="10" className="fill-slate-900 stroke-cyan-500/60" strokeWidth="2" />
              <text x="270" y="55" textAnchor="middle" className="fill-cyan-400 text-[13px] font-mono font-bold">
                ESP32 DevKit
              </text>
              <text x="270" y="73" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
                Wi-Fi + RTDB Node
              </text>

              <text x="210" y="102" className="fill-slate-200 text-[10px] font-mono">GPIO 5 (TRIG)</text>
              <text x="210" y="132" className="fill-slate-200 text-[10px] font-mono">GPIO 18 (ECHO)</text>
              <text x="210" y="162" className="fill-amber-300 text-[10px] font-mono">VIN / 5V</text>
              <text x="210" y="192" className="fill-slate-400 text-[10px] font-mono">GND</text>

              <text x="330" y="102" textAnchor="end" className="fill-slate-200 text-[10px] font-mono">GPIO 4 (DHT)</text>
              <text x="330" y="142" textAnchor="end" className="fill-slate-200 text-[10px] font-mono">GPIO 19 (BUZ)</text>
              <text x="330" y="182" textAnchor="end" className="fill-cyan-300 text-[10px] font-mono">3.3V OUT</text>

              <rect x="15" y="65" width="115" height="140" rx="8" className="fill-slate-800 stroke-blue-500/50" strokeWidth="1.5" />
              <text x="72" y="88" textAnchor="middle" className="fill-white text-[11px] font-mono font-semibold">
                HC-SR04
              </text>
              <text x="72" y="102" textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
                Ultrasonic 5V
              </text>
              <text x="120" y="122" textAnchor="end" className="fill-slate-300 text-[9px] font-mono">TRIG</text>
              <text x="120" y="142" textAnchor="end" className="fill-slate-300 text-[9px] font-mono">ECHO</text>
              <text x="120" y="162" textAnchor="end" className="fill-amber-300 text-[9px] font-mono">VCC 5V</text>
              <text x="120" y="188" textAnchor="end" className="fill-slate-400 text-[9px] font-mono">GND</text>

              <path d="M130 119 L165 119 L165 98 L200 98" fill="none" stroke="#06B6D4" strokeWidth="1.6" />
              <path d="M130 139 L152 139 L152 128 L200 128" fill="none" stroke="#3B82F6" strokeWidth="1.6" />
              <rect x="140" y="124" width="38" height="14" rx="3" className="fill-amber-950 stroke-amber-500" strokeWidth="1" />
              <text x="159" y="134" textAnchor="middle" className="fill-amber-300 text-[8px] font-mono">1k/2kΩ</text>

              <path d="M130 159 L200 159" fill="none" stroke="#F59E0B" strokeWidth="1.6" />
              <path d="M130 185 L200 185" fill="none" stroke="#64748B" strokeWidth="1.6" />

              <rect x="410" y="50" width="115" height="80" rx="8" className="fill-slate-800 stroke-emerald-500/50" strokeWidth="1.5" />
              <text x="467" y="72" textAnchor="middle" className="fill-white text-[11px] font-mono font-semibold">
                DHT11
              </text>
              <text x="420" y="98" className="fill-slate-300 text-[9px] font-mono">DATA</text>
              <text x="420" y="116" className="fill-cyan-300 text-[9px] font-mono">VCC 3.3V</text>

              <path d="M340 98 L410 98" fill="none" stroke="#10B981" strokeWidth="1.6" />
              <path d="M340 178 L375 178 L375 113 L410 113" fill="none" stroke="#22D3EE" strokeWidth="1.4" strokeDasharray="3 2" />

              <rect x="410" y="145" width="115" height="75" rx="8" className="fill-slate-800 stroke-rose-500/50" strokeWidth="1.5" />
              <text x="467" y="167" textAnchor="middle" className="fill-white text-[11px] font-mono font-semibold">
                Active Buzzer
              </text>
              <text x="467" y="180" textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
                Offline-capable
              </text>
              <text x="420" y="198" className="fill-slate-300 text-[9px] font-mono">SIG (+)</text>

              <path d="M340 138 L388 138 L388 195 L410 195" fill="none" stroke="#F43F5E" strokeWidth="1.6" />
            </svg>
          </div>

          <p className="text-xs text-amber-600 dark:text-amber-400">
            Important: HC-SR04 outputs 5V on ECHO. Use a 1kΩ + 2kΩ resistor divider on GPIO 18 to step ECHO down to ~3.3V so the ESP32 pin is protected.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Pin Mapping & Buzzer Pattern Reference
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3">Component</th>
                  <th className="py-2 pr-3">Module Pin</th>
                  <th className="py-2 pr-3">ESP32 Pin</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono">
                <tr>
                  <td className="py-2.5 pr-3 font-sans text-slate-900 dark:text-white">HC-SR04</td>
                  <td className="py-2.5 pr-3 text-cyan-600 dark:text-cyan-400">TRIG</td>
                  <td className="py-2.5 pr-3">GPIO 5</td>
                  <td className="py-2.5 font-sans text-slate-500">10µs trigger pulse</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans text-slate-900 dark:text-white">HC-SR04</td>
                  <td className="py-2.5 pr-3 text-blue-600 dark:text-blue-400">ECHO</td>
                  <td className="py-2.5 pr-3">GPIO 18</td>
                  <td className="py-2.5 font-sans text-slate-500">Via 1kΩ/2kΩ 3.3V divider</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans text-slate-900 dark:text-white">DHT11</td>
                  <td className="py-2.5 pr-3 text-emerald-600 dark:text-emerald-400">DATA</td>
                  <td className="py-2.5 pr-3">GPIO 4</td>
                  <td className="py-2.5 font-sans text-slate-500">3.3V VCC + 10kΩ pull-up</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans text-slate-900 dark:text-white">Piezo Buzzer</td>
                  <td className="py-2.5 pr-3 text-rose-600 dark:text-rose-400">I/O (+)</td>
                  <td className="py-2.5 pr-3">GPIO 19</td>
                  <td className="py-2.5 font-sans text-slate-500">Works without Wi-Fi</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Volume2 className="w-4 h-4 text-rose-500" />
              <span>Local Autonomous Buzzer State</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Current Buzzer Telemetry:{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {telemetry?.buzzerActive ? 'ACTIVE' : 'STANDBY'}
              </span>{' '}
              · Warning: 2s pulse · Danger: 0.5s pulse · Critical: rapid 200ms alarm.
            </p>
          </div>
        </div>
      </section>

      {/* Arduino IDE Firmware Code Viewer */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              ESP32 Arduino IDE Firmware (<span className="font-mono">floodguard_{metadata.deviceId}.ino</span>)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Publishes <code className="font-mono">distance</code>, <code className="font-mono">waterLevel</code>, <code className="font-mono">temperature</code>, <code className="font-mono">humidity</code>, and <code className="font-mono">status</code> every {metadata.reportingIntervalSec}s.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadIno}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .ino</span>
            </button>
          </div>
        </div>

        <pre className="rounded-lg bg-slate-950 text-slate-100 p-4 text-[11px] font-mono overflow-auto max-h-[460px] border border-slate-800 leading-relaxed">
          {firmwareCode}
        </pre>
      </section>
    </div>
  );
};
