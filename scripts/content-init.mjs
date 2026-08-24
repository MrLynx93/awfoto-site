/**
 * Offline fallback: copies content-template/ into site-content/ so the site
 * builds without access to the private content repo.
 *
 * The real content lives in lynx-soft/awfotografia-site-content — use
 * `npm run content:pull` for that. This is only for working without it, and it
 * refuses to overwrite an existing site-content/.
 */
import { cp, access, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const template = path.join(root, 'content-template');
const target = path.join(root, 'site-content');

const exists = await access(target).then(
  () => true,
  () => false,
);

if (exists) {
  console.log(
    'site-content/ już istnieje — nie nadpisuję.\n' +
      'Użyj `npm run content:pull`, żeby pobrać najnowszą treść.',
  );
  process.exit(0);
}

await mkdir(target, { recursive: true });
await cp(template, target, { recursive: true });

console.log(
  'Skopiowano content-template/ → site-content/\n' +
    'To treść zastępcza. Prawdziwa jest w lynx-soft/awfotografia-site-content —\n' +
    'pobierz ją przez `npm run content:pull`.',
);
