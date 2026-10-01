import { decodeAudioResponse } from './audio';

// Base backend URL from environment variable as mandated by spec
export const DEFAULT_API_URL = import.meta.env.VITE_API_URL || '';

const STORAGE_CUSTOM_URL_KEY = 'vonigen_custom_api_url';

/**
 * Gets effective backend URL. Checks localStorage override if user configured one,
 * otherwise falls back to VITE_API_URL.
 */
export function getActiveApiUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_CUSTOM_URL_KEY);
    if (saved !== null && saved.trim() !== '') {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  return (DEFAULT_API_URL || '').replace(/\/+$/, '');
}

/**
 * Saves or clears custom backend API URL (useful for testing RunPod/Colab GPU servers).
 */
export function setCustomApiUrl(url: string | null): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_CUSTOM_URL_KEY, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
    }
  }
}

export interface PingResponse {
  ok: boolean;
  gpu?: string;
  sample_rate?: number;
  error?: string;
}

/**
 * Calls GET /api/ping to check backend status and retrieve GPU information.
 * Follows the spec:
 * Response: { "ok": true, "gpu": "NVIDIA Tesla T4" }
 */
export async function pingBackend(overrideUrl?: string): Promise<PingResponse> {
  const baseUrl = overrideUrl !== undefined ? overrideUrl.replace(/\/+$/, '') : getActiveApiUrl();
  const endpoint = `${baseUrl}/api/ping`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for ping

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        error: `Server merespon dengan status ${response.status} (${response.statusText})`,
      };
    }

    const data = await response.json();
    return {
      ok: Boolean(data.ok),
      gpu: data.gpu || undefined,
      sample_rate: data.sample_rate || undefined,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    let errorMsg = 'AI Engine OmniVoice sedang offline.';
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errorMsg = 'Koneksi ke backend timeout (tidak ada respon dalam 6 detik).';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMsg = 'Gagal menghubungi AI Engine. Pastikan server aktif dan CORS diizinkan.';
      }
    }
    return {
      ok: false,
      error: errorMsg,
    };
  }
}

/**
 * Calls GET /api/rate to query sample rate if provided by backend.
 */
export async function fetchSampleRate(overrideUrl?: string): Promise<number | null> {
  const baseUrl = overrideUrl !== undefined ? overrideUrl.replace(/\/+$/, '') : getActiveApiUrl();
  const endpoint = `${baseUrl}/api/rate`;

  try {
    const response = await fetch(endpoint, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.sample_rate || data.rate || null;
  } catch {
    return null;
  }
}

/**
 * Calls POST /api/generate for a single segment of text.
 * FormData:
 * - text: string
 * - speed: float (string)
 * - ref: audio file/blob
 *
 * Returns decoded audio buffer using decodeAudioResponse()
 */
export async function generateVoiceSegment(
  text: string,
  speed: number,
  refAudioBlob: Blob,
  refFilename: string = 'reference.wav',
  signal?: AbortSignal,
  overrideUrl?: string
): Promise<{ audioBuffer: AudioBuffer; contentType: string }> {
  const baseUrl = overrideUrl !== undefined ? overrideUrl.replace(/\/+$/, '') : getActiveApiUrl();
  const endpoint = `${baseUrl}/api/generate`;

  const formData = new FormData();
  formData.append('text', text);
  formData.append('speed', speed.toFixed(2));
  formData.append('ref', refAudioBlob, refFilename);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Proses generate dibatalkan.');
    }
    throw new Error('Gagal terhubung ke AI Engine server. Periksa jaringan Anda atau pastikan GPU server aktif.');
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        errorDetail = response.statusText;
      }
    }

    if (response.status === 422) {
      throw new Error(`Parameter tidak valid (422): ${errorDetail}`);
    } else if (response.status === 500) {
      throw new Error(`Server GPU mengalami kendala internal (500): ${errorDetail || 'OmniVoice engine error'}`);
    } else if (response.status === 503) {
      throw new Error('Server GPU sibuk atau model sedang dimuat. Coba lagi dalam beberapa saat.');
    } else {
      throw new Error(`Gagal memproses audio (HTTP ${response.status}): ${errorDetail || response.statusText}`);
    }
  }

  // Use decodeAudioResponse() as required by backend contract
  const decoded = await decodeAudioResponse(response);
  return {
    audioBuffer: decoded.audioBuffer,
    contentType: decoded.contentType,
  };
}
