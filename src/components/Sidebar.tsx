import React from 'react';
import {
  Activity,
  Bell,
  Cpu,
  Database,
  HardDrive,
  Settings,
  X,
} from 'lucide-react';
import { AppView, FetchLiveStatus } from '../types/floodguard';
import { FloodGuardLogo } from './FloodGuardLogo';

interface SidebarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  unackAlertCount: number;
  fetchStatus: FetchLiveStatus;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  activeDeviceName: string;
  activeDeviceLocation: string;
}

const NAV_ITEMS: { id: AppView; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Command Monitor', icon: Activity },
  { id: 'alerts', label: 'Alert History', icon: Bell },
  { id: 'devices', label: 'Devices & Location', icon: HardDrive },
  { id: 'firebase', label: 'Firebase Setup', icon: Database },
  { id: 'hardware', label: 'ESP32 Hardware', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  unackAlertCount,
  fetchStatus,
  mobileOpen,
  onCloseMobile,
  activeDeviceName,
  activeDeviceLocation,
}) => {
  const handleSelect = (view: AppView) => {
    onNavigate(view);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between py-5 px-3">
      <div className="space-y-6">
        <div className="px-2.5 flex items-center justify-between lg:hidden">
          <FloodGuardLogo />
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'alerts' && unackAlertCount > 0 && (
                  <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                    {unackAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Node Summary */}
      <div className="px-3 pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
        <div className="text-slate-500 dark:text-slate-400 font-medium truncate">
          {activeDeviceName}
        </div>
        <div className="text-slate-400 dark:text-slate-500 truncate">
          {activeDeviceLocation}
        </div>
        <div className="pt-1 font-mono text-[11px] text-slate-500 dark:text-slate-500">
          Feed:{' '}
          {fetchStatus === 'live'
            ? 'Live (2s fetch)'
            : fetchStatus === 'waiting'
              ? 'Connected - Waiting'
              : fetchStatus === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090E1A]">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-[#090E1A] border-r border-slate-200 dark:border-slate-800 h-full shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
