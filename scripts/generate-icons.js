import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Write SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#090d16" />
  <!-- Soundwave / V monogram in vibrant emerald -->
  <path d="M128 200v112" stroke="#10b981" stroke-width="28" stroke-linecap="round"/>
  <path d="M192 144v224" stroke="#10b981" stroke-width="28" stroke-linecap="round"/>
  <path d="M256 96v320" stroke="#34d399" stroke-width="32" stroke-linecap="round"/>
  <path d="M320 144v224" stroke="#10b981" stroke-width="28" stroke-linecap="round"/>
  <path d="M384 200v112" stroke="#10b981" stroke-width="28" stroke-linecap="round"/>
  <!-- Subtly intersecting dynamic clone arc -->
  <circle cx="256" cy="256" r="210" stroke="#10b981" stroke-width="12" stroke-dasharray="24 16" opacity="0.35"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// Helper to draw clean soundwave V on PNG
function createIconPNG(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  
  // Background
  const bgR = 10, bgG = 15, bgB = 26; // deep dark obsidian #0a0f1a
  // Wave color: emerald #10b981
  const waveR = 16, waveG = 185, waveB = 129;
  const centerR = 52, centerG = 211, centerB = 153; // #34d399

  const scale = size / 512;
  const safeMargin = isMaskable ? 0.15 : 0.05;
  const usable = 1 - 2 * safeMargin;
  const factor = usable * scale;
  const offset = size * safeMargin;

  // Fill background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      
      // If not maskable, we can do slightly rounded corners or solid background
      png.data[idx] = bgR;
      png.data[idx + 1] = bgG;
      png.data[idx + 2] = bgB;
      png.data[idx + 3] = 255;
    }
  }

  // Draw vertical wave bars: 5 bars
  const bars = [
    { x: 128, y1: 200, y2: 312, w: 26, color: [waveR, waveG, waveB] },
    { x: 192, y1: 144, y2: 368, w: 26, color: [waveR, waveG, waveB] },
    { x: 256, y1: 96,  y2: 416, w: 30, color: [centerR, centerG, centerB] },
    { x: 320, y1: 144, y2: 368, w: 26, color: [waveR, waveG, waveB] },
    { x: 384, y1: 200, y2: 312, w: 26, color: [waveR, waveG, waveB] },
  ];

  for (const bar of bars) {
    const bx = offset + bar.x * factor;
    const by1 = offset + bar.y1 * factor;
    const by2 = offset + bar.y2 * factor;
    const bw = bar.w * factor;
    const radius = bw / 2;

    for (let y = Math.floor(by1 - radius); y <= Math.ceil(by2 + radius); y++) {
      if (y < 0 || y >= size) continue;
      for (let x = Math.floor(bx - radius); x <= Math.ceil(bx + radius); x++) {
        if (x < 0 || x >= size) continue;
        
        let dist = 0;
        if (y < by1) {
          dist = Math.hypot(x - bx, y - by1);
        } else if (y > by2) {
          dist = Math.hypot(x - bx, y - by2);
        } else {
          dist = Math.abs(x - bx);
        }

        if (dist <= radius) {
          const alpha = Math.min(1, Math.max(0, radius - dist + 0.5));
          const idx = (size * y + x) << 2;
          png.data[idx] = Math.round(bar.color[0] * alpha + png.data[idx] * (1 - alpha));
          png.data[idx + 1] = Math.round(bar.color[1] * alpha + png.data[idx + 1] * (1 - alpha));
          png.data[idx + 2] = Math.round(bar.color[2] * alpha + png.data[idx + 2] * (1 - alpha));
        }
      }
    }
  }

  return png;
}

// Generate files
const pwa192 = createIconPNG(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), PNG.sync.write(pwa192));

const pwa512 = createIconPNG(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), PNG.sync.write(pwa512));

const pwaMaskable512 = createIconPNG(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), PNG.sync.write(pwaMaskable512));

const appleTouch = createIconPNG(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), PNG.sync.write(appleTouch));

// Favicon ico: can copy 192 as favicon.ico or 32x32
const fav32 = createIconPNG(32, false);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), PNG.sync.write(fav32));

console.log('Icons generated successfully in public/');
