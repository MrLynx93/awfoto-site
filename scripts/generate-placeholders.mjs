/**
 * Generates warm placeholder photos for the seed content, so every page renders
 * before any real photograph exists. Run once: `node scripts/generate-placeholders.mjs`.
 * Delete the generated files (and this script) once real photos are in.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'content-template', 'images');

// Warm boho tones: cream highlight falling to a soft brown shadow.
const TONES = [
  ['#F3E4D4', '#DCC3AB', '#8E7460'],
  ['#FBF2E6', '#E4CDB6', '#94806C'],
  ['#F6EADC', '#D9C4B2', '#7E6C5C'],
  ['#FDF6EC', '#E7D6C0', '#9B8670'],
  ['#F2E7DA', '#D5C2AE', '#82705F'],
  ['#FAF0E4', '#E0CBB4', '#8A7663'],
  ['#F7EFE3', '#DFCDB9', '#877461'],
  ['#FBF4EA', '#E9D8C4', '#8F7B67'],
];

function svg(width, height, tone, seed) {
  const [light, mid, dark] = tone;
  // Offset the highlight per image so the set does not look uniform.
  const cx = 20 + ((seed * 37) % 60);
  const cy = 15 + ((seed * 53) % 60);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="g" cx="${cx}%" cy="${cy}%" r="95%">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="45%" stop-color="${mid}"/>
          <stop offset="100%" stop-color="${dark}"/>
        </radialGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect width="100%" height="100%" filter="url(#grain)" opacity="0.05"/>
    </svg>
  `);
}

const files = [
  // [relative path, width, height, tone index]
  ['sessions/hero.jpg', 1600, 2133, 0],
  ['sessions/plener-1.jpg', 2000, 1333, 1],
  ['sessions/plener-2.jpg', 1500, 2000, 2],
  ['sessions/plener-3.jpg', 1500, 2000, 3],
  ['sessions/plener-4.jpg', 2000, 1500, 4],
  ['sessions/roczek-1.jpg', 1600, 2000, 5],
  ['sessions/roczek-2.jpg', 2000, 1333, 6],
  ['sessions/roczek-3.jpg', 1500, 2000, 7],
  ['sessions/rodzinna-1.jpg', 1600, 2000, 2],
  ['sessions/rodzinna-2.jpg', 2000, 1333, 4],
  ['sessions/rodzinna-3.jpg', 1500, 2000, 1],
  ['offers/plener.jpg', 1400, 1750, 2],
  ['offers/rodzinna.jpg', 1400, 1750, 4],
  ['offers/swiateczna.jpg', 1400, 1750, 6],
  ['about/portret.jpg', 1400, 1750, 3],
];

await mkdir(OUT, { recursive: true });
for (const dir of ['sessions', 'offers', 'about']) {
  await mkdir(path.join(OUT, dir), { recursive: true });
}

for (const [rel, width, height, toneIndex] of files) {
  const target = path.join(OUT, rel);
  await sharp(svg(width, height, TONES[toneIndex], toneIndex + width))
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(target);
  console.log('napisano', rel);
}

console.log(`\n${files.length} plików w ${OUT}`);
