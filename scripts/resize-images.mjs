/**
 * Shrinks oversized photos in the content repo to web size, in place.
 *
 * Why this exists: Keystatic's image field has no upload transform, and in
 * GitHub storage mode the browser commits the file straight to GitHub — no
 * server ever sees it. So the only place to intervene is after the commit, in
 * CI. This runs on every push to the content repo, resizes anything too big,
 * and commits the result, which means photos can be uploaded straight from the
 * camera with no export step.
 *
 * Usage:  node scripts/resize-images.mjs [katalog]   (default: .)
 *         node scripts/resize-images.mjs . --check   (report only, exit 1 if work needed)
 */
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Long edge, in pixels. Indistinguishable from the original on any screen. */
const MAX_EDGE = 2400;
/** Anything above this gets re-encoded even if its dimensions are fine. */
const MAX_BYTES = 900 * 1024;
const JPEG_QUALITY = 82;

/**
 * A sanity ceiling, not a quality rule: a RAW or huge TIFF would stall CI and
 * is never what someone meant to publish.
 */
const REFUSE_BYTES = 40 * 1024 * 1024;

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const root = path.resolve(process.argv[2] || '.');
const checkOnly = process.argv.includes('--check');

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

const resized = [];
const refused = [];

for await (const file of walk(root)) {
  const rel = path.relative(root, file);
  const { size } = await stat(file);

  if (size > REFUSE_BYTES) {
    refused.push(`${rel} — ${(size / 1024 / 1024).toFixed(0)} MB`);
    continue;
  }

  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    refused.push(`${rel} — nie udało się odczytać, czy to na pewno zdjęcie?`);
    continue;
  }

  const edge = Math.max(meta.width || 0, meta.height || 0);
  if (edge <= MAX_EDGE && size <= MAX_BYTES) continue;

  if (checkOnly) {
    resized.push(rel);
    continue;
  }

  // Write beside the original, then swap: sharp cannot read and write the same
  // path in one pass.
  const tmp = `${file}.tmp`;
  const isPng = path.extname(file).toLowerCase() === '.png';
  await sharp(file)
    .rotate() // honour EXIF orientation before it is stripped
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    [isPng ? 'png' : 'jpeg'](isPng ? { compressionLevel: 9 } : { quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(tmp);

  const after = (await stat(tmp)).size;
  if (after >= size) {
    // Already well optimised — keep the original rather than churn the repo.
    await unlink(tmp);
    continue;
  }

  await rename(tmp, file);
  resized.push(
    `${rel} — ${(size / 1024 / 1024).toFixed(1)} MB → ${(after / 1024).toFixed(0)} KB`,
  );
}

if (refused.length) {
  console.error(
    ['', 'Te pliki są za duże nawet jak na zdjęcia z aparatu:', '',
     ...refused.map((l) => `  • ${l}`), '',
     'Wygląda to na plik RAW albo TIFF. Wgraj zwykły JPEG.', ''].join('\n'),
  );
  process.exit(1);
}

if (resized.length === 0) {
  console.log('Wszystkie zdjęcia mają już dobry rozmiar.');
  process.exit(0);
}

if (checkOnly) {
  console.log(`${resized.length} zdjęć wymaga zmniejszenia:\n  ${resized.join('\n  ')}`);
  process.exit(1);
}

console.log(`Zmniejszono ${resized.length} zdjęć:\n  ${resized.join('\n  ')}`);
