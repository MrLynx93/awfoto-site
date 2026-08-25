// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

// Set this to the real domain once it is bought — it drives the sitemap and
// canonical URLs.
const site = process.env.SITE_URL || 'https://aw-foto.pl';

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
});
