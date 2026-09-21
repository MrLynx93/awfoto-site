import type { APIRoute } from 'astro';

/**
 * Generated rather than dropped in public/ so the sitemap line follows
 * SITE_URL, the same as the canonical links — a hardcoded domain here would
 * point a staging build at the live site.
 *
 * The panel subdomain serves this same build, so it never reaches Google: see
 * the PANEL_ONLY branch in app.js, which answers /robots.txt with a blanket
 * disallow before this one is served.
 */
export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      // The admin and its API: nothing behind them is public, and a login
      // screen in the results helps nobody.
      'Disallow: /keystatic',
      'Disallow: /api/',
      '',
      `Sitemap: ${new URL('sitemap-index.xml', site).href}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
