import React from 'react';
import { Gauge } from 'lucide-react';

interface SpeedControlProps {
  speed: number;
  onChange: (newSpeed: number) => void;
  disabled?: boolean;
}

export const SpeedControl: React.FC<SpeedControlProps> = ({
  speed,
  onChange,
  disabled = false,
}) => {
  const getSpeedLabel = (val: number) => {
    if (val === 1.0) return 'Normal (1.00x)';
    if (val < 1.0) return `Lebih Lambat (${val.toFixed(2)}x)`;
    return `Lebih Cepat (${val.toFixed(2)}x)`;
  };

  const PRESETS = [0.75, 1.0, 1.25];

  return (
    <section className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col gap-3">
      {/* Title & Realtime Value */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Kecepatan Bicara</h2>
            <p className="text-[11px] text-neutral-500">
              Rentang tempo suara 0.50x – 1.50x
            </p>
          </div>
        </div>

        {/* Realtime Badge */}
        <div className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-lg">
          {speed.toFixed(2)}x
        </div>
      </div>

      {/* Slider input */}
      <div className="space-y-2 pt-1">
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={speed}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50"
        />

        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>0.50x</span>
          <span className="text-neutral-700 font-sans font-medium text-xs">
            {getSpeedLabel(speed)}
          </span>
          <span>1.50x</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
        <span className="text-[11px] text-neutral-500 font-medium">Preset:</span>
        <div className="flex items-center gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                Math.abs(speed - preset) < 0.01
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
              }`}
            >
              {preset.toFixed(2)}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
