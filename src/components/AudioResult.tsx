import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Share2,
  Sparkles,
} from 'lucide-react';

export interface FinalAudioResult {
  blob: Blob;
  url: string;
  filename: string;
  duration: number;
  segmentsCount: number;
  timestamp: string;
}

interface AudioResultProps {
  result: FinalAudioResult;
  onReset: () => void;
}

export const AudioResult: React.FC<AudioResultProps> = ({ result, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(result.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync duration once loaded
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [result.url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.url;
    // Strictly ensure .mp3 extension as mandated by requirement
    a.download = result.filename.endsWith('.mp3') ? result.filename : `${result.filename}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([result.blob], result.filename, { type: 'audio/mpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Vonigen Audio Voice Clone',
            text: 'Hasil audio AI Voice Clone dari Vonigen',
            files: [file],
          });
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
    // Fallback: copy file info or download
    handleDownload();
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-md shadow-emerald-500/5 flex flex-col gap-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={result.url} preload="metadata" />

      {/* Header status */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
              <span>Voice Clone Selesai</span>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </h2>
            <p className="text-xs text-neutral-500 font-mono truncate max-w-[200px] sm:max-w-xs">
              {result.filename}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800 p-1.5 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
          title="Mulai naskah baru"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Naskah Baru</span>
        </button>
      </div>

      {/* Audio Player Card */}
      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 flex flex-col gap-3">
        {/* Main Controls & Progress */}
        <div className="flex items-center gap-3">
          {/* Big Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
            title={isPlaying ? 'Jeda' : 'Putar Audio'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Timeline slider */}
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
              <span className="font-semibold text-emerald-800">
                {formatTime(currentTime)}
              </span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Volume & Audio Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200/50 text-xs">
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-neutral-500 hover:text-neutral-800 p-1 cursor-pointer"
              title={isMuted ? 'Nyalakan Suara' : 'Bisukan'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-700"
            />
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
            <span className="bg-white px-2 py-0.5 rounded-md border border-neutral-200/80 font-semibold text-neutral-700">
              MP3 · 192 kbps
            </span>
            <span className="bg-white px-2 py-0.5 rounded-md border border-neutral-200/80">
              {(result.blob.size / 1024 / 1024).toFixed(2)} MB
            </span>
            {result.segmentsCount > 1 && (
              <span className="hidden sm:inline bg-white px-2 py-0.5 rounded-md border border-neutral-200/80">
                {result.segmentsCount} segmen (+0.25s jeda)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Download and Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
        {/* Primary Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>⬇ Download MP3</span>
        </button>

        {/* Share Button (Mobile-first friendly) */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full sm:w-auto py-3.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>{hasCopied ? 'Tersalin!' : 'Bagikan'}</span>
        </button>
      </div>
    </section>
  );
};
