import React, { useState } from 'react';
import { X, Server, Check, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { DEFAULT_API_URL, getActiveApiUrl, setCustomApiUrl, pingBackend } from '../lib/api';

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndpointChanged: () => void;
}

export const ConnectionSettingsModal: React.FC<ConnectionSettingsModalProps> = ({
  isOpen,
  onClose,
  onEndpointChanged,
}) => {
  const [urlInput, setUrlInput] = useState(getActiveApiUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; gpu?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await pingBackend(urlInput.trim());
      setTestResult(res);
    } catch {
      setTestResult({ ok: false, error: 'Koneksi gagal atau CORS diblokir.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setCustomApiUrl(urlInput.trim());
    onEndpointChanged();
    onClose();
  };

  const handleResetDefault = () => {
    setUrlInput(DEFAULT_API_URL);
    setCustomApiUrl(null);
    setTestResult(null);
    onEndpointChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-neutral-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Pengaturan Backend AI Engine</h3>
              <p className="text-xs text-neutral-500">FastAPI GPU Server OmniVoice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              URL Backend OmniVoice (VITE_API_URL)
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setTestResult(null);
              }}
              placeholder="Contoh: https://your-omnivoice-gpu.com atau http://localhost:8000"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Kosongkan atau gunakan default untuk dev mode / server proxy lokal.
            </p>
          </div>

          {/* Test Ping Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPing}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{testing ? 'Menguji...' : 'Uji Koneksi (Ping)'}</span>
            </button>
            <button
              onClick={handleResetDefault}
              className="text-xs text-neutral-500 hover:text-neutral-800 underline decoration-neutral-300 cursor-pointer"
            >
              Reset ke Default
            </button>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                testResult.ok
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-red-50/80 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.ok ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">
                    {testResult.ok ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                  </p>
                  {testResult.gpu && (
                    <p className="mt-0.5 font-mono text-[11px]">
                      GPU Terdeteksi: {testResult.gpu}
                    </p>
                  )}
                  {testResult.error && (
                    <p className="mt-0.5 text-[11px]">{testResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Backend Contract Notes */}
          <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200/70 text-xs text-neutral-600 space-y-1.5">
            <p className="font-semibold text-neutral-800 flex items-center gap-1">
              <span>Spesifikasi Backend OmniVoice:</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </p>
            <p className="font-mono text-[11px] text-neutral-700">
              • GET /api/ping → {"{ \"ok\": true, \"gpu\": \"...\" }"}
            </p>
            <p className="font-mono text-[11px] text-neutral-700">
              • POST /api/generate → multipart (text, speed, ref)
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-xs"
          >
            Simpan & Gunakan
          </button>
        </div>
      </div>
    </div>
  );
};
