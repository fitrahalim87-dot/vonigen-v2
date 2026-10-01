import { audioBufferToMp3Blob } from './mp3Encoder';

export const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ACCEPTED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.ogg', '.flac'];
export const ACCEPTED_AUDIO_MIMES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
];

// Lazy AudioContext singleton
let globalAudioCtx: AudioContext | null = null;
export function getAudioContext(): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    globalAudioCtx = new AudioCtxClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

/**
 * Checks if the file size and type comply with Vonigen requirements.
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum 25 MB.`,
    };
  }

  const name = file.name.toLowerCase();
  const hasValidExt = ACCEPTED_AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = ACCEPTED_AUDIO_MIMES.includes(file.type.toLowerCase()) || file.type.startsWith('audio/');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Format audio tidak didukung. Harap gunakan file WAV, MP3, M4A, OGG, atau FLAC.',
    };
  }

  return { valid: true };
}

/**
 * Reads an audio Blob or File and returns its duration in seconds and an AudioBuffer.
 */
export async function getAudioMetadata(blob: Blob): Promise<{ duration: number; sampleRate: number; channels: number; buffer: AudioBuffer }> {
  const ctx = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  // decodeAudioData consumes the arrayBuffer, so make a copy if needed
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  return {
    duration: decoded.duration,
    sampleRate: decoded.sampleRate,
    channels: decoded.numberOfChannels,
    buffer: decoded,
  };
}

/**
 * Preprocess audio into a standardized mono WAV (e.g. 24kHz) for backend OmniVoice compatibility.
 */
export async function preprocessToMonoWav(blob: Blob, targetSampleRate: number = 24000): Promise<Blob> {
  const ctx = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  // If already mono and close to sample rate, we can still re-render or convert
  const duration = audioBuffer.duration;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(duration * targetSampleRate), targetSampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // Mix down channels to mono
  if (audioBuffer.numberOfChannels > 1) {
    const merger = offlineCtx.createChannelMerger(1);
    source.connect(merger);
    merger.connect(offlineCtx.destination);
  } else {
    source.connect(offlineCtx.destination);
  }

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  // Encode rendered mono buffer to WAV Blob
  return audioBufferToWavBlob(renderedBuffer);
}

/**
 * Converts AudioBuffer to WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const channelData = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }

  const numSamples = buffer.length;
  const dataByteCount = numSamples * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataByteCount);
  const view = new DataView(wavBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + dataByteCount, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataByteCount, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * decodeAudioResponse()
 * Tangani response audio binary dari backend berdasarkan Content-Type.
 * Jika backend mengembalikan audio/mpeg, audio/wav, dsb.
 * Mengembalikan AudioBuffer untuk memungkinkan penggabungan audio multi-segmen.
 */
export async function decodeAudioResponse(response: Response): Promise<{
  audioBuffer: AudioBuffer;
  contentType: string;
  originalArrayBuffer: ArrayBuffer;
}> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const originalArrayBuffer = await response.arrayBuffer();

  const ctx = getAudioContext();
  // Clone buffer so original remains intact
  const copyBuffer = originalArrayBuffer.slice(0);
  const audioBuffer = await ctx.decodeAudioData(copyBuffer);

  return {
    audioBuffer,
    contentType,
    originalArrayBuffer,
  };
}

/**
 * Combines multiple AudioBuffers in sequential order, adding silence (default 0.25s) between segments.
 * Returns the merged AudioBuffer.
 */
export function combineAudioBuffers(buffers: AudioBuffer[], silenceDurationSec: number = 0.25): AudioBuffer {
  if (buffers.length === 0) {
    throw new Error('Tidak ada segmen audio untuk digabungkan.');
  }

  if (buffers.length === 1 && buffers[0]) {
    return buffers[0];
  }

  const sampleRate = buffers[0].sampleRate;
  const numberOfChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const silenceSamples = Math.floor(silenceDurationSec * sampleRate);

  let totalSamples = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalSamples += buffers[i].length;
    if (i < buffers.length - 1) {
      totalSamples += silenceSamples;
    }
  }

  const ctx = getAudioContext();
  const combinedBuffer = ctx.createBuffer(numberOfChannels, totalSamples, sampleRate);

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const combinedData = combinedBuffer.getChannelData(channel);
    let currentOffset = 0;

    for (let b = 0; b < buffers.length; b++) {
      const buf = buffers[b];
      const sourceChannel = channel < buf.numberOfChannels ? channel : 0;
      const data = buf.getChannelData(sourceChannel);

      combinedData.set(data, currentOffset);
      currentOffset += data.length;

      // Add silence between segments
      if (b < buffers.length - 1) {
        // Zeros are already initialized in getChannelData, just advance offset
        currentOffset += silenceSamples;
      }
    }
  }

  return combinedBuffer;
}

/**
 * Encodes combined segments into a final MP3 Blob.
 * Guaranteed to be MP3 format.
 */
export async function finalizeSegmentsToMp3(buffers: AudioBuffer[], silenceDurationSec: number = 0.25): Promise<{ mp3Blob: Blob; duration: number }> {
  const combinedBuffer = combineAudioBuffers(buffers, silenceDurationSec);
  const mp3Blob = await audioBufferToMp3Blob(combinedBuffer, 192);
  return {
    mp3Blob,
    duration: combinedBuffer.duration,
  };
}

/**
 * Generates formatted filename: vonigen-[timestamp].mp3
 */
export function generateMp3Filename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `vonigen-${year}${month}${day}-${hours}${minutes}${seconds}.mp3`;
}
