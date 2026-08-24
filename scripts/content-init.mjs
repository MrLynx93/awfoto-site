/**
 * First-run helper: copies content-template/ into blog-content/ so the site
 * builds before the private content repo exists.
 *
 * Once awfotografia/blog-content is created, seed it from content-template/
 * once and use `npm run content:pull` from then on. This script refuses to
 * overwrite an existing blog-content/.
 */
import { cp, access, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const template = path.join(root, 'content-template');
const target = path.join(root, 'blog-content');

const exists = await access(target).then(
  () => true,
  () => false,
);

if (exists) {
  console.log(
    'blog-content/ już istnieje — nie nadpisuję.\n' +
      'Użyj `npm run content:pull`, żeby pobrać najnowszą treść.',
  );
  process.exit(0);
}

await mkdir(target, { recursive: true });
await cp(template, target, { recursive: true });

console.log(
  'Skopiowano content-template/ → blog-content/\n' +
    'To jest treść startowa. Docelowo trzyma ją prywatne repo awfotografia/blog-content.',
);
