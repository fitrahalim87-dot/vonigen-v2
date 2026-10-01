import React, { useState } from 'react';
import { FileText, Wand2, Layers, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { cleanScript } from '../lib/textSplitter';

interface TextEditorProps {
  text: string;
  onChange: (newText: string) => void;
  segments: string[];
  disabled?: boolean;
}

const MAX_CHARS = 30000;

const SAMPLE_SCRIPTS = [
  {
    title: 'Narasi Studio',
    text: 'Halo dan selamat datang di Vonigen Studio Engine. Sistem ini menggunakan teknologi AI OmniVoice generasi terbaru yang berjalan di GPU server untuk merekonstruksi karakteristik vokal Anda secara presisi. Mulai dari intonasi kalimat, dinamika pernapasan, hingga tekstur vokal unik Anda dapat dihasilkan kembali dengan kejernihan audio tinggi.',
  },
  {
    title: 'Customer Assistant',
    text: 'Selamat pagi! Terima kasih telah menghubungi pusat layanan kami. Saya asisten virtual yang siap membantu seluruh kebutuhan informasi akun, pengecekan status pesanan, serta panduan teknis operasional Anda hari ini. Ada yang bisa saya bantu lebih lanjut?',
  },
  {
    title: 'Audiobook Cerita',
    text: 'Malam itu, hembusan angin dingin menyapu lembah sunyi di lereng bukit. Gemerisik dedaunan pinus berbisik pelan, seakan menyiratkan sebuah rahasia kuno yang telah lama terkubur di bawah bayang-bayang pepohonan tua. Langkah demi langkah, ia terus menyusuri jalan setapak tanpa sedikit pun menoleh ke belakang.',
  },
];

export const TextEditor: React.FC<TextEditorProps> = ({
  text,
  onChange,
  segments,
  disabled = false,
}) => {
  const [showSegmentPreview, setShowSegmentPreview] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;

  const handleClean = () => {
    const cleaned = cleanScript(text);
    onChange(cleaned);
  };

  const handleCopySegment = (idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <section className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col gap-3">
      {/* Header of Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Naskah Suara</h2>
            <p className="text-[11px] text-neutral-500">
              Teks yang akan diucapkan oleh AI Voice Clone
            </p>
          </div>
        </div>

        {/* Quick Format Action */}
        {text.length > 0 && (
          <button
            type="button"
            onClick={handleClean}
            disabled={disabled}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2.5 py-1 rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Rapikan spasi dan spasi ganda"
          >
            <Wand2 className="w-3 h-3 text-emerald-600" />
            <span>Rapikan</span>
          </button>
        )}
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          rows={6}
          disabled={disabled}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tempel atau ketik naskah di sini (hingga 30.000 karakter). Naskah panjang akan otomatis dipecah menjadi beberapa segmen ~2.500 karakter dengan pemotongan batas kalimat yang rapi..."
          className={`w-full p-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 bg-neutral-50/50 rounded-xl border focus:outline-none transition resize-y min-h-[140px] leading-relaxed font-sans ${
            isOverLimit
              ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
              : 'border-neutral-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white'
          }`}
        />
      </div>

      {/* Footer bar: Character count & Segment Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-100 text-xs">
        {/* Counter */}
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-medium ${
              isOverLimit
                ? 'text-red-600 font-bold'
                : charCount > 25000
                ? 'text-amber-600'
                : 'text-neutral-500'
            }`}
          >
            {charCount.toLocaleString('id-ID')} / {MAX_CHARS.toLocaleString('id-ID')} karakter
          </span>
          {isOverLimit && (
            <span className="text-[11px] text-red-600 font-medium">
              (Melebihi batas maksimal!)
            </span>
          )}
        </div>

        {/* Segment indicator */}
        <div className="flex items-center gap-2">
          {charCount > 0 && (
            <div className="flex items-center gap-1.5 bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg text-xs font-medium">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                <strong>{segments.length}</strong> segmen (~2.500 char/segmen)
              </span>
            </div>
          )}

          {segments.length > 1 && (
            <button
              type="button"
              onClick={() => setShowSegmentPreview(!showSegmentPreview)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
            >
              <span>{showSegmentPreview ? 'Tutup' : 'Lihat Segmen'}</span>
              {showSegmentPreview ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Segment Breakdown Preview */}
      {showSegmentPreview && segments.length > 1 && (
        <div className="mt-2 space-y-2 rounded-xl bg-neutral-50 p-3 border border-neutral-200/70 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-200/60">
            <span className="font-semibold text-neutral-800">
              Pratinjau {segments.length} Segmen OmniVoice
            </span>
            <span className="text-[10px] text-neutral-500">
              Setiap segmen diproses bertahap ke GPU
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {segments.map((seg, idx) => (
              <div
                key={idx}
                className="bg-white p-2.5 rounded-lg border border-neutral-200/80 shadow-2xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-800">
                    Segmen #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-500">
                      {seg.length} karakter
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySegment(idx, seg)}
                      className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                      title="Salin segmen ini"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-neutral-600 font-sans line-clamp-2 text-[11px]">
                  {seg}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick sample script pill buttons if textarea is empty */}
      {charCount === 0 && (
        <div className="pt-1">
          <p className="text-[11px] font-medium text-neutral-500 mb-1.5">
            Contoh Naskah Cepat:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_SCRIPTS.map((sample, i) => (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onChange(sample.text)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer active:scale-95"
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
