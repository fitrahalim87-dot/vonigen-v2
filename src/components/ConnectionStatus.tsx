import React from 'react';
import { Cpu, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export type EngineStatus = 'online' | 'offline' | 'processing' | 'finished';

interface ConnectionStatusProps {
  status: EngineStatus;
  gpuName?: string;
  isChecking?: boolean;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  gpuName,
  isChecking = false,
  onRefresh,
  onOpenSettings,
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between gap-2">
        {/* Main Status Pill */}
        <div className="flex items-center gap-2">
          {status === 'online' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>🟢 AI Engine Online</span>
            </div>
          )}

          {status === 'offline' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-800 text-xs font-semibold shadow-2xs">
              <span className="inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              <span>🔴 AI Engine Offline</span>
            </div>
          )}

          {status === 'processing' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold shadow-2xs">
              <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
              <span>🟡 AI Engine Processing</span>
            </div>
          )}

          {status === 'finished' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>🟢 Generation Complete</span>
            </div>
          )}
        </div>

        {/* Action button to re-check ping */}
        <div className="flex items-center gap-1.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isChecking}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition disabled:opacity-40 cursor-pointer"
              title="Periksa ulang status koneksi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded-md hover:bg-neutral-100 transition cursor-pointer"
              title="Atur URL Backend FastAPI OmniVoice"
            >
              Endpoint
            </button>
          )}
        </div>
      </div>

      {/* GPU Information Banner */}
      {status === 'online' && gpuName && (
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200/60 w-fit">
          <Cpu className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="font-mono text-neutral-700 font-medium">GPU: {gpuName}</span>
        </div>
      )}

      {status === 'offline' && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50/70 px-2.5 py-1.5 rounded-lg border border-red-100">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
          <span>Server GPU OmniVoice tidak merespon pada endpoint saat ini. Tombol generate dinonaktifkan.</span>
        </div>
      )}
    </div>
  );
};
