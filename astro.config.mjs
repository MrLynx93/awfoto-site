// @ts-check
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

// Set this to the real domain once it is bought — it drives the sitemap and
// canonical URLs.
const site = process.env.SITE_URL || 'https://aw-foto.pl';

// Behind Passenger/nginx the app sees a plain HTTP socket, so Astro reports
// http:// unless it is told which forwarded hosts to trust: validateForwardedHost
// returns false whenever security.allowedDomains is empty, and x-forwarded-proto
// is then discarded. Keystatic builds its OAuth redirect_uri from that origin,
// so without this it sends http://panel.<domain>/… and GitHub rejects it as not
// associated with the application.
const { hostname } = new URL(site);

/**
 * /swieta answers all year — links to it live on Instagram and in inboxes long
 * after the season — but out of season it shrinks to a short note carrying
 * `noindex`. Keep it out of the sitemap then too, rather than advertising a
 * page we ask Google to ignore.
 *
 * Missing content is not an error here: the build fails a moment later with a
 * far clearer message from src/lib/siteContent.ts.
 */
function christmasSeasonActive() {
  try {
    const settings = parse(readFileSync('./site-content/content/settings.yaml', 'utf8'));
    return Boolean(settings?.christmas?.active);
  } catch {
    return false;
  }
}

const christmasActive = christmasSeasonActive();

export default defineConfig({
  site,

  security: {
    allowedDomains: [
      { hostname, protocol: 'https' },
      { hostname: `panel.${hostname}`, protocol: 'https' },
    ],
  },

  // The whole public site is prerendered to static HTML. Only the Keystatic
  // admin routes opt out via `export const prerender = false`, because its API
  // routes need a Node runtime.
  output: 'static',
  adapter: node({ mode: 'middleware' }),

  integrations: [
    react(),
    markdoc(),
    keystatic(),
    sitemap({ filter: (page) => christmasActive || !/\/swieta\/?$/.test(page) }),
  ],

  image: {
    // Photos are the whole point of this site, so allow generous widths.
    responsiveStyles: true,
  },
});
