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
  // These paths mirror exactly what Keystatic writes, so seed content and
  // panel-created content are identical: a collection entry's images live under
  // images/<collection>/<slug>/, the cover named after its field and each array
  // item under photos/<index>/image.jpg. Deviate and the panel shows empty
  // image fields, then silently rewrites the paths on first save.
  // [relative path, width, height, tone index]
  ['sessions/plener-jesienny-zuzia-marek/coverImage.jpg', 2000, 1333, 1],
  ['sessions/plener-jesienny-zuzia-marek/photos/0/image.jpg', 1500, 2000, 2],
  ['sessions/plener-jesienny-zuzia-marek/photos/1/image.jpg', 1500, 2000, 3],
  ['sessions/plener-jesienny-zuzia-marek/photos/2/image.jpg', 2000, 1500, 4],
  ['sessions/roczek-antosia/coverImage.jpg', 1600, 2000, 5],
  ['sessions/roczek-antosia/photos/0/image.jpg', 2000, 1333, 6],
  ['sessions/roczek-antosia/photos/1/image.jpg', 1500, 2000, 7],
  ['sessions/rodzina-k-sesja-w-domu/coverImage.jpg', 1600, 2000, 2],
  ['sessions/rodzina-k-sesja-w-domu/photos/0/image.jpg', 2000, 1333, 4],
  ['sessions/rodzina-k-sesja-w-domu/photos/1/image.jpg', 1500, 2000, 1],
  ['offers/plenerowa/image.jpg', 1400, 1750, 2],
  ['offers/rodzinna/image.jpg', 1400, 1750, 4],
  ['offers/swiateczna/image.jpg', 1400, 1750, 6],
  // The offers' `gallery` array, same layout Keystatic writes for any array of
  // images: gallery/<index>/image.jpg under the entry's own folder.
  ['offers/swiateczna/gallery/0/image.jpg', 2000, 1333, 5],
  ['offers/swiateczna/gallery/1/image.jpg', 1500, 2000, 7],
  ['offers/swiateczna/gallery/2/image.jpg', 1800, 1350, 1],
  ['offers/swiateczna/gallery/3/image.jpg', 1800, 1350, 3],
  ['offers/swiateczna/gallery/4/image.jpg', 1600, 1600, 6],
  ['offers/swiateczna/gallery/5/image.jpg', 1600, 1600, 0],
  // Not a collection image — imported directly by the pages, so it can live anywhere.
  ['about/portret.jpg', 1400, 1750, 3],
];

await mkdir(OUT, { recursive: true });


for (const [rel, width, height, toneIndex] of files) {
  const target = path.join(OUT, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(svg(width, height, TONES[toneIndex], toneIndex + width))
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(target);
  console.log('napisano', rel);
}

console.log(`\n${files.length} plików w ${OUT}`);
