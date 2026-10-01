/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { TextEditor } from './components/TextEditor';
import { AudioReference, AudioReferenceData } from './components/AudioReference';
import { SpeedControl } from './components/SpeedControl';
import { GenerateButton } from './components/GenerateButton';
import { ProgressPanel } from './components/ProgressPanel';
import { AudioResult, FinalAudioResult } from './components/AudioResult';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import { EngineStatus } from './components/ConnectionStatus';

import { splitScript, cleanScript } from './lib/textSplitter';
import { finalizeSegmentsToMp3, generateMp3Filename } from './lib/audio';
import { pingBackend, generateVoiceSegment } from './lib/api';

export default function App() {
  // Backend Engine connection state
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('offline');
  const [gpuName, setGpuName] = useState<string | undefined>(undefined);
  const [isCheckingPing, setIsCheckingPing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Workflow states
  const [scriptText, setScriptText] = useState('');
  const [audioReference, setAudioReference] = useState<AudioReferenceData | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);

  // Generation & Progress states
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentSnippet, setCurrentSnippet] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Final Result state
  const [finalResult, setFinalResult] = useState<FinalAudioResult | null>(null);

  // Calculate segments in realtime
  const segments = React.useMemo(() => {
    return splitScript(scriptText, 2500);
  }, [scriptText]);

  // Ping backend function
  const checkBackendHealth = useCallback(async () => {
    setIsCheckingPing(true);
    try {
      const res = await pingBackend();
      if (res.ok) {
        setEngineStatus((prev) => (prev === 'processing' ? 'processing' : 'online'));
        setGpuName(res.gpu || 'NVIDIA GPU Server');
      } else {
        setEngineStatus((prev) => (prev === 'processing' ? 'processing' : 'offline'));
        setGpuName(undefined);
      }
    } catch {
      setEngineStatus((prev) => (prev === 'processing' ? 'processing' : 'offline'));
      setGpuName(undefined);
    } finally {
      setIsCheckingPing(false);
    }
  }, []);

  // Initial ping and 15-second polling interval
  useEffect(() => {
    checkBackendHealth();

    const interval = setInterval(() => {
      checkBackendHealth();
    }, 15000);

    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Start Voice Clone Generation Workflow
  const handleGenerate = async () => {
    if (isProcessing) return;
    if (!audioReference) return;
    if (segments.length === 0) return;
    if (scriptText.length > 30000) return;

    // Clean text once more before processing
    const cleanedFullText = cleanScript(scriptText);
    const activeSegments = splitScript(cleanedFullText, 2500);
    if (activeSegments.length === 0) return;

    setIsProcessing(true);
    setEngineStatus('processing');
    setGenerationError(null);
    setFinalResult(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const gatheredAudioBuffers: AudioBuffer[] = [];

    try {
      for (let i = 0; i < activeSegments.length; i++) {
        if (abortController.signal.aborted) {
          throw new Error('Proses generate dibatalkan oleh pengguna.');
        }

        const segmentText = activeSegments[i];
        setCurrentSegmentIndex(i + 1);
        setCurrentSnippet(segmentText);

        // Call backend API for this segment: POST /api/generate
        const { audioBuffer } = await generateVoiceSegment(
          segmentText,
          speed,
          audioReference.blob,
          audioReference.name || 'ref.wav',
          abortController.signal
        );

        gatheredAudioBuffers.push(audioBuffer);
      }

      // All segments succeeded: combine with 0.25s silence and convert to MP3
      setCurrentSnippet('Menggabungkan audio dan mengonversi ke format MP3...');
      const { mp3Blob, duration } = await finalizeSegmentsToMp3(gatheredAudioBuffers, 0.25);
      const filename = generateMp3Filename();
      const url = URL.createObjectURL(mp3Blob);

      setFinalResult({
        blob: mp3Blob,
        url,
        filename,
        duration,
        segmentsCount: activeSegments.length,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });

      setEngineStatus('finished');
      // Scroll to result smoothly
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err: unknown) {
      console.error(err);
      let errorMsg = 'Terjadi kesalahan saat memproses voice clone.';
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setGenerationError(errorMsg);
      setEngineStatus('online');
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setEngineStatus('online');
    setGenerationError('Proses voice cloning telah dibatalkan.');
  };

  const handleResetForNewScript = () => {
    if (finalResult?.url) {
      URL.revokeObjectURL(finalResult.url);
    }
    setFinalResult(null);
    setGenerationError(null);
    setEngineStatus('online');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-900 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Header with logo, subtitle, status & GPU */}
      <Header
        status={engineStatus}
        gpuName={gpuName}
        isChecking={isCheckingPing}
        onRefreshPing={checkBackendHealth}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container: Mobile-First, padded */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Section 1: Mode Selector */}
        <ModeSelector />

        {/* Section 2: Text / Naskah Editor */}
        <TextEditor
          text={scriptText}
          onChange={setScriptText}
          segments={segments}
          disabled={isProcessing}
        />

        {/* Section 3: Audio Referensi (Upload / Record 3–10s) */}
        <AudioReference
          reference={audioReference}
          onReferenceChange={setAudioReference}
          disabled={isProcessing}
        />

        {/* Section 4: Speed Control (0.50x - 1.50x) */}
        <SpeedControl
          speed={speed}
          onChange={setSpeed}
          disabled={isProcessing}
        />

        {/* Progress or Error Panel during/after generation */}
        {(isProcessing || generationError) && (
          <ProgressPanel
            currentSegment={currentSegmentIndex}
            totalSegments={segments.length}
            currentSnippet={currentSnippet}
            onCancel={handleCancelGenerate}
            error={generationError}
            onDismissError={() => setGenerationError(null)}
          />
        )}

        {/* Section 5: Big Generate Button */}
        {!finalResult && (
          <GenerateButton
            isProcessing={isProcessing}
            isBackendOnline={engineStatus !== 'offline'}
            hasScript={scriptText.trim().length > 0}
            isScriptOverLimit={scriptText.length > 30000}
            hasAudioReference={audioReference !== null}
            segmentCount={segments.length}
            onGenerate={handleGenerate}
          />
        )}

        {/* Section 6: Audio Result (MP3 Player & Download) */}
        {finalResult && (
          <AudioResult
            result={finalResult}
            onReset={handleResetForNewScript}
          />
        )}

        {/* Studio Info Footnote */}
        <footer className="pt-6 pb-8 text-center text-xs text-neutral-400 space-y-1">
          <p className="font-semibold text-neutral-500">Vonigen Studio Engine</p>
          <p>Powered by OmniVoice · GPU Cluster Infrastructure</p>
        </footer>
      </main>

      {/* Backend Settings Modal */}
      <ConnectionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onEndpointChanged={checkBackendHealth}
      />
    </div>
  );
}
