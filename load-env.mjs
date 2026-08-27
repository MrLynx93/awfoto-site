/**
 * Loads .env into process.env before anything reads it.
 *
 * Passenger does not read .env by itself and nothing in the app did either, so
 * the file the deploy writes to the server was inert: the panel started with no
 * Keystatic credentials and every GitHub login returned 500.
 *
 * Imported first by app.js. ES module imports evaluate in order, so this runs
 * before dist/server/entry.mjs pulls in Keystatic.
 *
 * Values already in the environment win — process.loadEnvFile does not
 * overwrite them — so `SITE_URL=… npm run serve` still overrides the file.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');

try {
  process.loadEnvFile(envFile);
} catch (error) {
  // No .env is normal: CI and local development pass real variables instead.
  if (error?.code !== 'ENOENT') throw error;
}
