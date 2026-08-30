/**
 * Renders public/og-default.jpg — the link preview shown when a page with no
 * photograph of its own is shared (the homepage, /oferta, /cennik, /o-mnie,
 * /kontakt, /sesje). Session and offer pages send their own cover instead.
 *
 * The card is just the logo on the site's cream: the mark already carries the
 * name, the discipline and the photographer's signature, so nothing has to be
 * typeset over it — which also keeps this script free of any font handling.
 *
 * Run after replacing src/assets/logo.png:  node scripts/generate-og-card.mjs
 */
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'src/assets/logo.png');
const target = path.join(root, 'public/og-default.jpg');

// Facebook, Messenger and WhatsApp all crop toward 1.91:1, so the card is
// built at the size they ask for rather than letting them choose one.
const WIDTH = 1200;
const HEIGHT = 630;
const KREMOWY = '#fdfbf7';

// The mark keeps a wide margin: previews are often shown small, and the
// wreath's pale fronds are the first thing a tight crop would eat.
const MARK_HEIGHT = Math.round(HEIGHT * 0.74);

const mark = await sharp(source).resize({ height: MARK_HEIGHT }).toBuffer();
const { width: markWidth, height: markHeight } = await sharp(mark).metadata();

await sharp({
  create: { width: WIDTH, height: HEIGHT, channels: 4, background: KREMOWY },
})
  .composite([
    {
      input: mark,
      left: Math.round((WIDTH - markWidth) / 2),
      top: Math.round((HEIGHT - markHeight) / 2),
    },
  ])
  .flatten({ background: KREMOWY })
  .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
  .toFile(target);

console.log(`og-default.jpg written (${WIDTH}×${HEIGHT}, mark ${markWidth}×${markHeight})`);
