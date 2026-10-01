import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Upload,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Music,
  Square,
  Sparkles,
} from 'lucide-react';
import {
  validateAudioFile,
  getAudioMetadata,
  preprocessToMonoWav,
  getAudioContext,
} from '../lib/audio';

export interface AudioReferenceData {
  blob: Blob;
  name: string;
  duration: number;
  sampleRate: number;
  channels: number;
  size: number;
  url: string;
  isMonoPreprocessed?: boolean;
}

interface AudioReferenceProps {
  reference: AudioReferenceData | null;
  onReferenceChange: (ref: AudioReferenceData | null) => void;
  disabled?: boolean;
}

export const AudioReference: React.FC<AudioReferenceProps> = ({
  reference,
  onReferenceChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);

  // Audio playback preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URLs on unmount or replace
  useEffect(() => {
    return () => {
      if (reference?.url) {
        URL.revokeObjectURL(reference.url);
      }
    };
  }, [reference?.url]);

  // Handle preview audio playback events
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [reference?.url]);

  const togglePlayPreview = () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const audio = audioElementRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Process uploaded or recorded file
  const handleProcessBlob = async (blob: Blob, fileName: string) => {
    setErrorMsg(null);
    setIsProcessingFile(true);

    try {
      const meta = await getAudioMetadata(blob);
      const url = URL.createObjectURL(blob);

      onReferenceChange({
        blob,
        name: fileName,
        duration: meta.duration,
        sampleRate: meta.sampleRate,
        channels: meta.channels,
        size: blob.size,
        url,
        isMonoPreprocessed: false,
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Gagal memproses file audio. Pastikan file audio tidak rusak.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'File audio tidak valid.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    handleProcessBlob(file, file.name);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'File audio tidak valid.');
      return;
    }

    handleProcessBlob(file, file.name);
  };

  // Microphone recording
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      // Ensure AudioContext is ready for browser audio
      getAudioContext();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });

      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        await handleProcessBlob(audioBlob, `rekaman-suara-${timestamp}.wav`);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Izin mikrofon ditolak atau mikrofon tidak tersedia pada perangkat Anda.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
    }
  };

  // Preprocess reference audio to 24kHz mono WAV
  const handlePreprocessMonoWav = async () => {
    if (!reference) return;
    setIsProcessingFile(true);
    try {
      const monoWavBlob = await preprocessToMonoWav(reference.blob, 24000);
      const url = URL.createObjectURL(monoWavBlob);
      const meta = await getAudioMetadata(monoWavBlob);

      onReferenceChange({
        blob: monoWavBlob,
        name: reference.name.replace(/\.[^/.]+$/, '') + '-mono24k.wav',
        duration: meta.duration,
        sampleRate: meta.sampleRate,
        channels: meta.channels,
        size: monoWavBlob.size,
        url,
        isMonoPreprocessed: true,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal melakukan normalisasi WAV mono.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDelete = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    onReferenceChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col gap-3">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Audio Referensi</h2>
            <p className="text-[11px] text-neutral-500">
              Gunakan suara referensi 3–10 detik.
            </p>
          </div>
        </div>

        {reference && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Siap Digunakan
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.m4a,.ogg,.flac,audio/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isRecording || isProcessingFile}
      />

      {/* Error notification */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Perhatian</p>
            <p>{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-700 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content: Recording, Empty Upload Area, or Reference Preview */}
      {isRecording ? (
        /* ACTIVE RECORDING STATE */
        <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-300 flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg animate-pulse">
              <Mic className="w-8 h-8" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </span>
          </div>

          <div>
            <div className="text-2xl font-mono font-black text-neutral-900">
              00:{recordingSeconds.toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Bicaralah dengan jelas dan natural (rekomendasi 3–10 detik)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Selesai Merekam</span>
            </button>
          </div>
        </div>
      ) : reference ? (
        /* REFERENCE AUDIO IS LOADED (PREVIEW & CONTROLS) */
        <div className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200 flex flex-col gap-3">
          <audio ref={audioElementRef} src={reference.url} preload="metadata" />

          {/* Top metadata row */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900 truncate" title={reference.name}>
                {reference.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                <span>{(reference.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>•</span>
                <span>{reference.sampleRate} Hz</span>
                <span>•</span>
                <span>{reference.channels === 1 ? 'Mono' : 'Stereo'}</span>
              </div>
            </div>

            {/* Duration Indicator Pill */}
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                reference.duration >= 3 && reference.duration <= 10
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {reference.duration.toFixed(1)} detik
              {reference.duration >= 3 && reference.duration <= 10 ? ' (Ideal)' : ''}
            </div>
          </div>

          {/* Duration recommendation notice if out of bounds */}
          {(reference.duration < 3 || reference.duration > 10) && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/70">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {reference.duration < 3
                  ? 'Durasi < 3 detik. Disarankan minimal 3 detik untuk akurasi timbre kloning.'
                  : 'Durasi > 10 detik. OmniVoice bekerja paling optimal pada segmen vokal 3–10 detik.'}
              </span>
            </div>
          )}

          {/* Mini Audio Player */}
          <div className="bg-white p-3 rounded-xl border border-neutral-200/80 flex items-center gap-3 shadow-2xs">
            <button
              type="button"
              onClick={togglePlayPreview}
              className="w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer shadow-xs"
              title={isPlaying ? 'Jeda' : 'Putar Audio Referensi'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Timeline Slider */}
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min={0}
                max={reference.duration || 1}
                step={0.01}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(reference.duration)}</span>
              </div>
            </div>
          </div>

          {/* Action Row: Ganti Audio, Hapus, Normalisasi */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled || isProcessingFile}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Ganti Audio</span>
              </button>

              <button
                type="button"
                disabled={disabled || isProcessingFile}
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>

            {/* Mono Preprocessing Indicator or Trigger */}
            {reference.isMonoPreprocessed ? (
              <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Normalisasi Mono 24k Aktif
              </span>
            ) : (
              <button
                type="button"
                disabled={disabled || isProcessingFile}
                onClick={handlePreprocessMonoWav}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 underline decoration-emerald-300 transition cursor-pointer"
                title="Konversi ke WAV Mono 24kHz untuk performa OmniVoice maksimal"
              >
                {isProcessingFile ? 'Memproses...' : 'Normalisasi WAV Mono'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* EMPTY STATE: UPLOAD OR RECORD */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 text-center ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-neutral-200/90 hover:border-emerald-400 bg-neutral-50/40 hover:bg-neutral-50'
          }`}
        >
          {isProcessingFile ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-xs font-medium text-neutral-600">
                Memproses dan memeriksa audio...
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload Audio</span>
                </button>

                <span className="text-xs text-neutral-400 font-medium">atau</span>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Rekam Suara</span>
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-neutral-500">
                  Tarik & lepas file audio ke area ini
                </p>
                <p className="text-[11px] text-neutral-400">
                  Format: WAV, MP3, M4A, OGG, FLAC (Maks. 25 MB · Durasi 3–10 detik)
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
