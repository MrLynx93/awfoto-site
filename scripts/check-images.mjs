/**
 * Fails if any photo in the content repo is too large.
 *
 * This is the guard that keeps the content repo usable for years. Git keeps
 * every version of every binary forever, so one batch of straight-from-camera
 * JPEGs bloats the repo permanently and cannot easily be undone. Web-sized
 * masters look identical on screen and keep the repo small.
 *
 * Usage:  node scripts/check-images.mjs [katalog]   (default: ./blog-content)
 */
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAX_BYTES = 1.5 * 1024 * 1024; // 1,5 MB
const MAX_EDGE = 3000; // px
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const root = path.resolve(process.argv[2] || 'blog-content');

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

const problems = [];
let checked = 0;

for await (const file of walk(root)) {
  checked += 1;
  const rel = path.relative(root, file);
  const { size } = await stat(file);

  if (size > MAX_BYTES) {
    problems.push(`${rel} — waży ${(size / 1024 / 1024).toFixed(1)} MB (limit 1,5 MB)`);
    continue;
  }

  try {
    const { width = 0, height = 0 } = await sharp(file).metadata();
    const edge = Math.max(width, height);
    if (edge > MAX_EDGE) {
      problems.push(`${rel} — ma ${width}×${height} px (limit ${MAX_EDGE} px dłuższego boku)`);
    }
  } catch {
    problems.push(`${rel} — nie udało się odczytać pliku, czy to na pewno zdjęcie?`);
  }
}

if (problems.length === 0) {
  console.log(`Sprawdzono ${checked} zdjęć — wszystkie w porządku.`);
  process.exit(0);
}

console.error(
  [
    '',
    'ZDJĘCIA ZA DUŻE — nie mogę ich dodać do repozytorium:',
    '',
    ...problems.map((line) => `  • ${line}`),
    '',
    'Jak to naprawić:',
    '',
    '  Wyeksportuj zdjęcia jeszcze raz w mniejszym rozmiarze:',
    '    • dłuższy bok: 2400 px',
    '    • jakość JPEG: 80',
    '    • rozmiar pliku: poniżej 500 KB',
    '',
    '  W Lightroomie: Eksport → Rozmiar obrazu → Zmień rozmiar tak, aby zmieścił się:',
    '  Dłuższy bok 2400 px, Jakość 80.',
    '',
    '  Na takich zdjęciach strona wygląda identycznie (sama robi z nich jeszcze',
    '  mniejsze wersje na telefony), a repozytorium nie puchnie z każdą sesją.',
    '',
  ].join('\n'),
);
process.exit(1);
