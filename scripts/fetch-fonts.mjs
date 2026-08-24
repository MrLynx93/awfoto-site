/**
 * Downloads the self-hosted webfonts into public/fonts/ and prints the
 * @font-face rules that belong in src/styles/global.css.
 *
 * Only needed when changing weights or adding a face — the woff2 files are
 * committed, so a normal checkout needs nothing. Run: node scripts/fetch-fonts.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@300;500&display=swap';

// Chrome UA, otherwise Google serves the legacy TTF stylesheet instead of woff2.
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/** Which faces we actually use, and the filename stem for each. */
const WANTED = new Map([
  ['Cormorant Garamond|300|normal', 'cormorant-garamond-300'],
  ['Cormorant Garamond|300|italic', 'cormorant-garamond-300-italic'],
  ['Cormorant Garamond|400|normal', 'cormorant-garamond-400'],
  ['Jost|300|normal', 'jost-300'],
  ['Jost|500|normal', 'jost-500'],
]);

// Polish diacritics live in latin-ext, so both subsets are required.
const SUBSETS = [
  ['latin', ''],
  ['latin-ext', '-ext'],
];

const outDir = path.join(process.cwd(), 'public', 'fonts');
await mkdir(outDir, { recursive: true });

const css = await fetch(CSS_URL, { headers: { 'User-Agent': UA } }).then((r) => {
  if (!r.ok) throw new Error(`Google Fonts zwróciło ${r.status}`);
  return r.text();
});

const faces = new Map();
for (const [, subset, body] of css.matchAll(
  /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{(.*?)\}/gs,
)) {
  if (!SUBSETS.some(([name]) => name === subset)) continue;
  const pick = (re) => body.match(re)?.[1];
  const key = [
    pick(/font-family:\s*'([^']+)'/),
    pick(/font-weight:\s*(\d+)/),
    pick(/font-style:\s*(\w+)/),
  ].join('|');
  if (!WANTED.has(key)) continue;
  faces.set(`${key}|${subset}`, {
    url: pick(/url\((https:\/\/[^)]+)\)/),
    unicodeRange: pick(/unicode-range:\s*([^;]+);/).trim(),
  });
}

const rules = [];
for (const [key, stem] of WANTED) {
  const [family, weight, style] = key.split('|');
  for (const [subset, suffix] of SUBSETS) {
    const face = faces.get(`${key}|${subset}`);
    if (!face) {
      console.warn(`Brak ${subset} dla ${key} — pomijam`);
      continue;
    }
    const fileName = `${stem}${suffix}.woff2`;
    const bytes = Buffer.from(await fetch(face.url).then((r) => r.arrayBuffer()));
    await writeFile(path.join(outDir, fileName), bytes);
    console.log(`${fileName}  ${(bytes.length / 1024).toFixed(1)} KB`);

    rules.push(
      `@font-face {\n` +
        `  font-family: '${family}';\n` +
        `  src: url('/fonts/${fileName}') format('woff2');\n` +
        `  font-weight: ${weight};\n` +
        `  font-style: ${style};\n` +
        `  font-display: swap;\n` +
        `  unicode-range: ${face.unicodeRange};\n` +
        `}`,
    );
  }
}

console.log(
  `\n${rules.length} reguł @font-face — wklej do src/styles/global.css:\n\n${rules.join('\n')}`,
);
