import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

export const ModeSelector: React.FC = () => {
  return (
    <section className="bg-white rounded-2xl p-2 border border-neutral-200/80 shadow-xs">
      <div className="grid grid-cols-2 gap-2">
        {/* Voice Clone (Active) */}
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-neutral-900 text-white font-semibold text-xs shadow-xs cursor-default transition"
        >
          <Mic className="w-4 h-4 text-emerald-400" />
          <span>Voice Clone</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </button>

        {/* Voice Design (Coming Soon / Disabled) */}
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-50 text-neutral-400 font-medium text-xs border border-neutral-200/50 cursor-not-allowed select-none opacity-80"
          title="Voice Design fitur akan segera hadir pada update berikutnya"
        >
          <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
          <span>Voice Design</span>
          <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded-sm font-semibold">
            Coming Soon
          </span>
        </button>
      </div>
    </section>
  );
};
