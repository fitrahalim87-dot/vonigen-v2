import React from 'react';
import { Loader2, XCircle, AlertTriangle, Layers } from 'lucide-react';

interface ProgressPanelProps {
  currentSegment: number;
  totalSegments: number;
  currentSnippet?: string;
  onCancel: () => void;
  error: string | null;
  onDismissError: () => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  currentSegment,
  totalSegments,
  currentSnippet,
  onCancel,
  error,
  onDismissError,
}) => {
  // If there's an error, display error alert
  if (error) {
    return (
      <div className="rounded-2xl bg-red-50/90 border border-red-200 p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-900">
              Proses Generate Gagal
            </h3>
            <p className="mt-1 text-xs text-red-700 leading-relaxed font-sans">
              {error}
            </p>
            <p className="mt-1.5 text-[11px] text-red-500">
              Proses dihentikan secara otomatis untuk mencegah pembuatan file audio yang rusak.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-red-200/60">
          <button
            type="button"
            onClick={onDismissError}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition cursor-pointer"
          >
            Tutup & Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // Calculate percentage
  const percentage = Math.min(
    100,
    Math.round(((currentSegment - 1) / Math.max(1, totalSegments)) * 100)
  );

  return (
    <div className="rounded-2xl bg-white border border-neutral-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
      {/* Title & Cancel button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Memproses segmen {currentSegment} dari {totalSegments}...
            </h3>
            <p className="text-[11px] text-neutral-500">
              Mengirim batch teks ke GPU OmniVoice
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Batal</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(8, percentage)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <span>{percentage}% selesai</span>
          <span>
            {currentSegment} / {totalSegments} segmen
          </span>
        </div>
      </div>

      {/* Snippet of currently processed text */}
      {currentSnippet && (
        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 mb-1">
            <Layers className="w-3 h-3 text-emerald-600" />
            <span>Naskah Segmen Saat Ini:</span>
          </div>
          <p className="text-neutral-700 italic line-clamp-2 text-[11px]">
            "{currentSnippet}"
          </p>
        </div>
      )}
    </div>
  );
};
