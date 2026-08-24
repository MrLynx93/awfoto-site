/**
 * Clones or updates the private content repo into ./site-content.
 *
 * The panel commits there; this pulls those commits down so a local build sees
 * the same content the deployed site will. CI does the equivalent with
 * actions/checkout, so this is only for working locally.
 */
import { execFileSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

const repo = process.env.CONTENT_REPO || 'git@github.com:lynx-soft/awfotografia-site-content.git';
const branch = process.env.CONTENT_BRANCH || 'main';
const target = path.join(process.cwd(), 'site-content');

const run = (args, cwd) =>
  execFileSync('git', args, { cwd, stdio: 'inherit' });

const isRepo = await access(path.join(target, '.git')).then(
  () => true,
  () => false,
);

try {
  if (isRepo) {
    console.log(`Aktualizuję site-content (${branch})…`);
    run(['fetch', 'origin', branch], target);
    run(['checkout', branch], target);
    run(['reset', '--hard', `origin/${branch}`], target);
  } else {
    const hasPlainDir = await access(target).then(
      () => true,
      () => false,
    );
    if (hasPlainDir) {
      console.error(
        'site-content/ istnieje, ale nie jest repozytorium git.\n' +
          'To zapewne treść startowa z `npm run content:init`.\n' +
          'Usuń ten katalog albo przenieś go, zanim pobierzesz prawdziwe repo.',
      );
      process.exit(1);
    }
    console.log(`Klonuję ${repo}…`);
    run(['clone', '--branch', branch, repo, target]);
  }
  console.log('Gotowe.');
} catch {
  // execFileSync already printed git's own error.
  console.error(
    '\nNie udało się pobrać treści.\n' +
      'Sprawdź dostęp do repo (klucz SSH) albo ustaw CONTENT_REPO na inny adres.\n' +
      'Bez dostępu do prywatnego repo użyj `npm run content:init`, żeby pracować na treści startowej.',
  );
  process.exit(1);
}
