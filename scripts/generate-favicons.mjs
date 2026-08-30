/**
 * Renders the browser-tab and home-screen icons from src/assets/logo.png.
 *
 * The mark is a pale wreath, which is most of the difficulty: at 32px its
 * strokes all but disappear, so the small sizes get a modest lift in contrast
 * and saturation — enough to hold the circle and the AW, short of the point
 * where the beige turns orange. The large one is left alone, since at 180px
 * the detail survives on its own.
 *
 * They sit on the site's cream rather than on transparency: a tab strip can be
 * any colour, and the mark has no dark outline to survive a dark one.
 *
 * Run after replacing the logo:  npm run icons
 */
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'src/assets/logo.png');
const outDir = path.join(root, 'public');

const KREMOWY = '#fdfbf7';

/** Almost no margin: at 32px every pixel spent on padding is one lost. */
const FILL = 0.96;

const icons = [
  { file: 'icon-32.png', size: 32, lift: true },
  { file: 'icon-48.png', size: 48, lift: true },
  { file: 'apple-touch-icon.png', size: 180, lift: false },
];

for (const { file, size, lift } of icons) {
  const inner = Math.round(size * FILL);
  let mark = sharp(source).resize({ width: inner, height: inner, fit: 'inside' });
  if (lift) mark = mark.modulate({ saturation: 1.2 }).linear(1.18, -24);
  const buffer = await mark.toBuffer();
  const { width, height } = await sharp(buffer).metadata();

  await sharp({
    create: { width: size, height: size, channels: 4, background: KREMOWY },
  })
    .composite([
      { input: buffer, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, file));

  console.log(`${file} (${size}×${size})`);
}
