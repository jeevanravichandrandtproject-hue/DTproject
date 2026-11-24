import React, { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  FIREBASE_SCHEMA_JSON,
  FIREBASE_SECURITY_RULES_JSON,
} from '../data/esp32Firmware';
import { DEFAULT_RTDB_REST_URL } from '../services/firebaseRestService';
import { FetchLiveStatus } from '../types/floodguard';

interface FirebaseSetupViewProps {
  endpointUrl: string;
  fetchStatus: FetchLiveStatus;
  fetchError: string | null;
  lastSuccessfulFetch: number;
  rawPayload: Record<string, unknown> | null;
  onUpdateEndpointUrl: (nextUrl: string) => void;
  onPollNow: () => Promise<void>;
  onClearHistory: () => void;
}

type DocTab = 'schema' | 'rules' | 'guide';

export const FirebaseSetupView: React.FC<FirebaseSetupViewProps> = ({
  endpointUrl,
  fetchStatus,
  fetchError,
  lastSuccessfulFetch,
  rawPayload,
  onUpdateEndpointUrl,
  onPollNow,
  onClearHistory,
}) => {
  const [urlInput, setUrlInput] = useState(endpointUrl);
  const [activeDocTab, setActiveDocTab] = useState<DocTab>('schema');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSaveEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEndpointUrl(urlInput);
  };

  const handleTestNow = async () => {
    setTesting(true);
    try {
      if (urlInput.trim() !== endpointUrl) {
        onUpdateEndpointUrl(urlInput);
      } else {
        await onPollNow();
      }
    } finally {
      setTesting(false);
    }
  };

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Firebase Realtime Database Connection
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Polls your Firebase Realtime Database JSON endpoint every 2 seconds via{' '}
            <code className="font-mono text-cyan-600 dark:text-cyan-400">fetch()</code>.
          </p>
        </div>

        <span
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold self-start sm:self-auto ${
            fetchStatus === 'live'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : fetchStatus === 'waiting'
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                : fetchStatus === 'connecting'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}
        >
          {fetchStatus === 'live'
            ? 'STATUS: LIVE (2s POLL)'
            : fetchStatus === 'waiting'
              ? 'STATUS: CONNECTED - WAITING FOR ESP32 DATA'
              : fetchStatus === 'connecting'
                ? 'STATUS: CONNECTING...'
                : 'STATUS: OFFLINE'}
        </span>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          <strong>Fetch Error:</strong> {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Live REST Endpoint Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSaveEndpoint}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Database className="w-4 h-4 text-cyan-500" />
              <span>Firebase RTDB REST JSON Endpoint</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enter your Firebase Realtime Database URL (e.g.{' '}
              <code className="font-mono">https://firebasedatabase.app/.json</code> or{' '}
              <code className="font-mono">https://your-project-default-rtdb.firebasedatabase.app/.json</code>).
              If <code className="font-mono">.json</code> is omitted, it is appended automatically for the Firebase REST API.
            </p>

            <label className="block space-y-1.5 text-xs">
              <span className="block text-slate-500 dark:text-slate-400">
                Realtime Database REST URL
              </span>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://firebasedatabase.app/.json"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 font-mono text-slate-900 dark:text-white"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Save & Poll Every 2s</span>
                </button>
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestNow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>Test Fetch Now</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput(DEFAULT_RTDB_REST_URL);
                    onUpdateEndpointUrl(DEFAULT_RTDB_REST_URL);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Default URL</span>
                </button>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Chart Cache</span>
                </button>
              </div>
            </div>
          </form>

          {/* Latest Raw JSON Payload Inspector */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Latest Fetched JSON Payload
              </h2>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                {lastSuccessfulFetch > 0
                  ? `Received ${new Date(lastSuccessfulFetch).toLocaleTimeString()}`
                  : 'No payload received yet'}
              </span>
            </div>
            <pre className="rounded-lg bg-slate-950 text-cyan-200 p-3.5 text-[11px] font-mono overflow-auto max-h-56 border border-slate-800">
              {rawPayload
                ? JSON.stringify(rawPayload, null, 2)
                : '// Awaiting valid JSON response from ' + endpointUrl}
            </pre>
          </div>
        </div>

        {/* Right: Expected Schema, Rules & Guide */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col gap-4">
          <div
            className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            role="group"
            aria-label="Firebase documentation tabs"
          >
            {(
              [
                { id: 'schema', label: 'Expected JSON' },
                { id: 'rules', label: 'Security Rules' },
                { id: 'guide', label: 'Setup Guide' },
              ] as { id: DocTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDocTab(tab.id)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeDocTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDocTab === 'schema' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Live Sensor JSON Structure
                </span>
                <button
                  type="button"
                  onClick={() => copyText('schema', FIREBASE_SCHEMA_JSON)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {copiedKey === 'schema' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'schema' ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="flex-1 rounded-lg bg-slate-950 text-slate-200 p-3.5 text-[11px] font-mono overflow-auto max-h-[320px] border border-slate-800">
                {FIREBASE_SCHEMA_JSON}
              </pre>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supported <code className="font-mono">status</code> values: <code className="font-mono">SAFE</code>,{' '}
                <code className="font-mono">WARNING</code>, <code className="font-mono">DANGER</code>,{' '}
                <code className="font-mono">CRITICAL</code>.
              </p>
            </div>
          )}

          {activeDocTab === 'rules' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Firebase RTDB Rules Template
                </span>
                <button
                  type="button"
                  onClick={() => copyText('rules', FIREBASE_SECURITY_RULES_JSON)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {copiedKey === 'rules' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'rules' ? 'Copied' : 'Copy Rules'}</span>
                </button>
              </div>
              <pre className="flex-1 rounded-lg bg-slate-950 text-cyan-200 p-3.5 text-[11px] font-mono overflow-auto max-h-[320px] border border-slate-800">
                {FIREBASE_SECURITY_RULES_JSON}
              </pre>
            </div>
          )}

          {activeDocTab === 'guide' && (
            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                Ensure your ESP32 writes JSON containing <code className="font-mono">distance</code>,{' '}
                <code className="font-mono">waterLevel</code>, <code className="font-mono">temperature</code>,{' '}
                <code className="font-mono">humidity</code>, and <code className="font-mono">status</code> to your Firebase Realtime Database.
              </li>
              <li>
                The dashboard automatically polls your configured RTDB URL every <strong>2 seconds</strong> using{' '}
                <code className="font-mono">fetch()</code>.
              </li>
              <li>
                When the fetch succeeds and returns valid JSON, the top bar displays <strong>Live</strong> and all gauges, cards, charts, and alert badges update in real time.
              </li>
              <li>
                If the endpoint is unreachable, returns an HTTP error, or returns invalid data, the indicator switches to <strong>Offline</strong> without displaying dummy data.
              </li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};
