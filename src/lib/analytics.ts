/**
 * Visitor statistics, sent to a self-hosted Matomo.
 *
 * Deliberately not Matomo's own tracker: matomo.js weighs ~22 KB gzipped and
 * sets cookies unless told otherwise. BaseLayout instead sends one beacon per
 * page view straight to Matomo's tracking API — the page address, the referrer
 * and the title — and stores nothing in the visitor's browser. Matomo tells
 * visitors apart on the server from an anonymised IP and the user agent, so
 * there is nothing to consent to and no banner to show.
 *
 * Off until the build is given MATOMO_SITE_ID (a repository variable, passed in
 * by deploy.yml). Matomo is assumed to live at stats.<domain>; MATOMO_URL
 * overrides that.
 */

/** Set by /nie-licz-mnie in the photographer's own browsers; BaseLayout skips the beacon. */
export const IGNORE_KEY = 'awfoto-nie-licz';

export interface Analytics {
  /** Matomo's tracking endpoint, matomo.php. */
  endpoint: string;
  siteId: string;
}

export function getAnalytics(site: URL): Analytics | null {
  const siteId = import.meta.env.MATOMO_SITE_ID?.trim();
  // `astro dev` never counts: it is someone working on the site, not a visitor.
  if (!siteId || !import.meta.env.PROD) return null;

  const base = import.meta.env.MATOMO_URL?.trim() || `https://stats.${site.hostname}/`;
  // Trailing slash, or `new URL` would replace the last path segment of a
  // Matomo installed in a subdirectory instead of appending to it.
  const endpoint = new URL('matomo.php', base.endsWith('/') ? base : `${base}/`).href;
  return { endpoint, siteId };
}
