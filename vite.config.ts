import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Dev Mock API Plugin:
 * Catatan penting: Ini adalah Mock API untuk mode development lokal / preview jika
 * GPU server OmniVoice belum dihubungkan.
 * Ganti dengan FastAPI OmniVoice asli di GPU server Anda via environment variable VITE_API_URL.
 */
function omniVoiceDevMockPlugin(): Plugin {
  return {
    name: 'omnivoice-dev-mock',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';

        // GET /api/ping
        if (req.method === 'GET' && url === '/api/ping') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(
            JSON.stringify({
              ok: true,
              gpu: 'NVIDIA Tesla T4 (OmniVoice Dev Engine)',
              sample_rate: 24000,
            })
          );
          return;
        }

        // GET /api/rate
        if (req.method === 'GET' && url === '/api/rate') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ sample_rate: 24000 }));
          return;
        }

        // POST /api/generate (Dev fallback when no external GPU is configured)
        if (req.method === 'POST' && url === '/api/generate') {
          const sendMockAudio = () => {
            try {
              // Generate standard 16-bit PCM WAV (1.5s voice waveform)
              const sampleRate = 24000;
              const durationSec = 1.5;
              const numSamples = Math.floor(sampleRate * durationSec);
              const dataByteCount = numSamples * 2;
              const buffer = Buffer.alloc(44 + dataByteCount);

              // RIFF chunk descriptor
              buffer.write('RIFF', 0);
              buffer.writeUInt32LE(36 + dataByteCount, 4);
              buffer.write('WAVE', 8);

              // fmt sub-chunk
              buffer.write('fmt ', 12);
              buffer.writeUInt32LE(16, 16); // Subchunk1Size
              buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
              buffer.writeUInt16LE(1, 22); // NumChannels = 1 (Mono)
              buffer.writeUInt32LE(sampleRate, 24); // SampleRate
              buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
              buffer.writeUInt16LE(2, 32); // BlockAlign
              buffer.writeUInt16LE(16, 34); // BitsPerSample

              // data sub-chunk
              buffer.write('data', 36);
              buffer.writeUInt32LE(dataByteCount, 40);

              let offset = 44;
              for (let i = 0; i < numSamples; i++) {
                const t = i / sampleRate;
                const env = Math.sin((Math.PI * i) / numSamples);
                const vibrato = Math.sin(2 * Math.PI * 5 * t) * 6;
                const f0 = 160 + vibrato;
                const wave =
                  0.45 * Math.sin(2 * Math.PI * f0 * t) +
                  0.28 * Math.sin(2 * Math.PI * f0 * 2 * t) +
                  0.18 * Math.sin(2 * Math.PI * f0 * 3 * t);

                const sample = Math.max(-1, Math.min(1, wave * env * 0.7));
                const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                buffer.writeInt16LE(intSample, offset);
                offset += 2;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'audio/wav');
              res.setHeader('Content-Length', buffer.length.toString());
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(buffer);
            } catch (err: unknown) {
              res.statusCode = 500;
              res.end(String(err));
            }
          };

          if (req.readableEnded) {
            sendMockAudio();
          } else {
            req.on('data', () => {});
            req.on('end', sendMockAudio);
            req.on('error', () => {
              res.statusCode = 500;
              res.end('Request stream error');
            });
            req.resume();
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      omniVoiceDevMockPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Vonigen · Studio Engine',
          short_name: 'Vonigen',
          description: 'Studio Engine untuk AI Voice Cloning - by Aniki',
          theme_color: '#10b981',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
