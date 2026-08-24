/**
 * Node entry point.
 *
 * Lives at the repo root because mydevil's Passenger looks for `app.js` at the
 * top of the domain's `public_nodejs/` directory, and deployment rsyncs this
 * repo there. Locally it doubles as a way to run the real production path:
 *
 *   npm run build && npm run serve
 *
 * In production this only needs to serve the Keystatic panel — the public site
 * is served straight off disk by nginx from a separate static www entry, so no
 * photo request ever touches Node. It still serves dist/client as a fallback so
 * a single-domain setup (or a local check) works without extra configuration.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler as astroHandler } from './dist/server/entry.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(root, 'dist', 'client');

const app = express();

app.disable('x-powered-by');

// PANEL_ONLY=true on the panel subdomain: keep the admin out of Google and
// send anyone who lands on a content URL to the real site instead of serving
// a duplicate copy of it.
const panelOnly = process.env.PANEL_ONLY === 'true';
const siteUrl = process.env.SITE_URL || 'https://awfotografia.pl';

if (panelOnly) {
  app.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');

    // Land people straight in the panel when they type the bare domain.
    //
    // The panel cannot actually be *served* at "/": Keystatic hardcodes
    // /keystatic and /api/keystatic throughout its client bundle — router
    // pushes, fetch calls, the OAuth redirect URL — so mounting it elsewhere
    // would mean patching vendored code that changes on every release. A
    // redirect gets the same practical result: nobody has to type /keystatic,
    // it just shows up in the address bar afterwards.
    if (req.path === '/') {
      return res.redirect(302, '/keystatic');
    }

    const isPanel =
      req.path.startsWith('/keystatic') || req.path.startsWith('/api/keystatic');
    // Astro's own assets must still load for the panel to render.
    const isAsset = req.path.startsWith('/_astro') || req.path.startsWith('/fonts');
    if (!isPanel && !isAsset) {
      return res.redirect(308, new URL(req.originalUrl, siteUrl).href);
    }
    next();
  });
}

// Hashed build assets never change under the same name, so they can be cached
// hard. Everything else stays short-lived.
app.use(
  '/_astro',
  express.static(path.join(clientDir, '_astro'), {
    immutable: true,
    maxAge: '1y',
  }),
);
app.use(
  '/fonts',
  express.static(path.join(clientDir, 'fonts'), {
    immutable: true,
    maxAge: '1y',
  }),
);
app.use(express.static(clientDir, { maxAge: '1h' }));

app.use(astroHandler);

// Passenger supplies the socket, so the port is only used when running locally.
const port = Number(process.env.PORT) || 4321;
app.listen(port, () => {
  console.log(`AW Fotografia — http://localhost:${port}`);
});
