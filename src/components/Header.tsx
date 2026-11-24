import React from 'react';
import {
  Menu,
  Radio,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AppView, FetchLiveStatus } from '../types/floodguard';
import { formatRelativeTime, formatTimestamp } from '../utils/telemetry';
import { FloodGuardLogo } from './FloodGuardLogo';

interface HeaderProps {
  fetchStatus: FetchLiveStatus;
  endpointUrl: string;
  lastUpdated: number;
  nowMs: number;
  onNavigate: (view: AppView) => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fetchStatus,
  endpointUrl,
  lastUpdated,
  nowMs,
  onNavigate,
  onOpenMobileMenu,
}) => {
  const isLive = fetchStatus === 'live';
  const isWaiting = fetchStatus === 'waiting';
  const isConnecting = fetchStatus === 'connecting';

  const statusText = isLive
    ? 'Live'
    : isWaiting
      ? 'Connected - Waiting for ESP32 data'
      : isConnecting
        ? 'Connecting'
        : 'Offline';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#070B14]/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-14">
        {/* Zone 1: Brand + Mobile Menu */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md"
          >
            <FloodGuardLogo />
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>
            <span className="hidden sm:inline text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[220px]">
              Hyperlocal Flood Intelligence
            </span>
          </button>
        </div>

        {/* Zone 2: Live / Waiting / Offline Fetch Telemetry Indicator */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('firebase')}
            title={`Polling ${endpointUrl} every 2 seconds`}
            className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap truncate max-w-[260px] sm:max-w-none hover:underline ${
              isLive
                ? 'text-emerald-600 dark:text-emerald-400'
                : isWaiting
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : isConnecting
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isLive
                  ? 'bg-emerald-500'
                  : isWaiting
                    ? 'bg-cyan-500'
                    : isConnecting
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
              }`}
              aria-hidden="true"
            />
            {isLive || isWaiting ? (
              <Wifi className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{statusText}</span>
          </button>

          <span className="hidden md:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>

          <span
            className="hidden md:inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0"
            title={lastUpdated > 0 ? formatTimestamp(lastUpdated) : 'No ESP32 reading yet'}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-500" />
            <span>
              {lastUpdated > 0 ? `Updated: ${formatRelativeTime(lastUpdated, nowMs)}` : 'Waiting for data'}
            </span>
          </span>
        </div>

        {/* Zone 3: Settings Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
