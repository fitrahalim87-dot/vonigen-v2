import React from 'react';
import { Loader2, Rocket, AlertCircle } from 'lucide-react';

interface GenerateButtonProps {
  isProcessing: boolean;
  isBackendOnline: boolean;
  hasScript: boolean;
  isScriptOverLimit: boolean;
  hasAudioReference: boolean;
  segmentCount: number;
  onGenerate: () => void;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  isProcessing,
  isBackendOnline,
  hasScript,
  isScriptOverLimit,
  hasAudioReference,
  segmentCount,
  onGenerate,
}) => {
  // Determine if disabled
  const isDisabled =
    !isBackendOnline ||
    !hasScript ||
    isScriptOverLimit ||
    !hasAudioReference ||
    isProcessing;

  // Determine hint message for disabled state
  let disabledReason: string | null = null;
  if (!isBackendOnline) {
    disabledReason = 'Menunggu AI Engine Online (periksa status server di atas)';
  } else if (!hasScript) {
    disabledReason = 'Masukkan naskah suara terlebih dahulu';
  } else if (isScriptOverLimit) {
    disabledReason = 'Naskah melebihi batas 30.000 karakter';
  } else if (!hasAudioReference) {
    disabledReason = 'Pilih atau rekam audio referensi 3–10 detik';
  } else if (isProcessing) {
    disabledReason = 'Sedang memproses segmen... Mohon tunggu';
  }

  return (
    <section className="flex flex-col gap-2 w-full">
      <button
        type="button"
        disabled={isDisabled}
        onClick={onGenerate}
        className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-sm transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.99] select-none ${
          isDisabled
            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md hover:shadow-emerald-600/20'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>Memproses Voice Clone...</span>
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            <span>
              Generate Voice Clone
              {hasScript && segmentCount > 1 ? ` (${segmentCount} Segmen)` : ''}
            </span>
          </>
        )}
      </button>

      {/* Disabled reason hint for user clarity */}
      {isDisabled && disabledReason && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 text-center px-2">
          <AlertCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}
    </section>
  );
};
