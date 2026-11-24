import React from 'react';

interface FloodGuardLogoProps {
  compact?: boolean;
}

export const FloodGuardLogo: React.FC<FloodGuardLogoProps> = ({ compact = false }) => {
  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      <svg
        width="32"
        height="32"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1.5"
          y="1.5"
          width="33"
          height="33"
          rx="8"
          className="fill-slate-900 dark:fill-[#0B1221] stroke-cyan-500/40"
          strokeWidth="1.5"
        />
        {/* Hydrological shield & wave vector */}
        <path
          d="M18 6.5L27 10.5V17.8C27 23.4 23.15 28.4 18 29.8C12.85 28.4 9 23.4 9 17.8V10.5L18 6.5Z"
          className="stroke-cyan-400"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M11.5 18.2C13.2 16.6 15.1 16.6 16.8 18.2C18.5 19.8 20.4 19.8 22.1 18.2C23.1 17.3 24.1 16.9 24.8 17.1"
          className="stroke-blue-400"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12.2 22.2C13.7 20.9 15.4 20.9 16.9 22.2C18.4 23.5 20.1 23.5 21.6 22.2C22.4 21.5 23.2 21.2 23.9 21.3"
          className="stroke-cyan-300"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="18" cy="12.5" r="1.5" className="fill-cyan-300" />
      </svg>
      {!compact && (
        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
          Flood<span className="text-cyan-600 dark:text-cyan-400">Guard</span>
        </span>
      )}
    </div>
  );
};
