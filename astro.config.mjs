// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

// Set this to the real domain once it is bought — it drives the sitemap and
// canonical URLs.
const site = process.env.SITE_URL || 'https://awfotografia.pl';

export default defineConfig({
  site,

  // The whole public site is prerendered to static HTML. Only the Keystatic
  // admin routes opt out via `export const prerender = false`, because its API
  // routes need a Node runtime.
  output: 'static',
  adapter: node({ mode: 'middleware' }),

  integrations: [react(), markdoc(), keystatic(), sitemap()],

  image: {
    // Photos are the whole point of this site, so allow generous widths.
    responsiveStyles: true,
  },

  redirects: {
    // Portfolio and blog used to be separate ideas; they are one now. Only the
    // index paths are redirected — Astro requires a dynamic redirect to carry
    // its params through, and there are no old per-post URLs to preserve since
    // neither section was ever published. Deeper paths fall through to 404.
    '/blog': '/moje-sesje',
    '/posty': '/moje-sesje',
    '/portfolio': '/moje-sesje',
  },
});
