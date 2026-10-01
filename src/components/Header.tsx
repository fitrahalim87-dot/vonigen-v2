import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { ConnectionStatus, EngineStatus } from './ConnectionStatus';

interface HeaderProps {
  status: EngineStatus;
  gpuName?: string;
  isChecking?: boolean;
  onRefreshPing: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  gpuName,
  isChecking,
  onRefreshPing,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3 shadow-2xs">
      <div className="max-w-2xl mx-auto flex flex-col gap-2.5">
        {/* Top bar with Brand & PWA Install */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Minimalist Emerald Wave Icon */}
            <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center shadow-xs shrink-0">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="9" width="2" height="6" rx="1" />
                <rect x="6" y="5" width="2" height="14" rx="1" />
                <rect x="10" y="2" width="2" height="20" rx="1" fill="#34d399" />
                <rect x="14" y="5" width="2" height="14" rx="1" />
                <rect x="18" y="9" width="2" height="6" rx="1" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-extrabold tracking-tight text-neutral-950 font-['Plus_Jakarta_Sans',sans-serif]">
                  Vonigen
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  GPU Engine
                </span>
              </div>
              <p className="text-[11px] font-medium text-neutral-500">
                by Aniki · Studio Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />
          </div>
        </div>

        {/* Status Line with GPU badge and Ping controls */}
        <div className="pt-1 border-t border-neutral-100">
          <ConnectionStatus
            status={status}
            gpuName={gpuName}
            isChecking={isChecking}
            onRefresh={onRefreshPing}
            onOpenSettings={onOpenSettings}
          />
        </div>
      </div>
    </header>
  );
};
