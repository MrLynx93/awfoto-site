#!/usr/bin/env bash
#
# Seeds the private content repo from content-template/.
#
# Run once, from the root of this repo, when the content repo is still empty:
#
#   ./scripts/seed-content-repo.sh
#
# Pass a different target to seed somewhere else:
#
#   ./scripts/seed-content-repo.sh git@github.com:owner/name.git
#
# Copies the seed sessions, offers, price list, settings, their photos, and the
# publish workflow that resizes uploads. Refuses to run if the target already
# has content, so it can never clobber real work.

set -euo pipefail

REPO="${1:-git@github.com:MrLynx93/awfoto-site-content.git}"
BRANCH="${CONTENT_BRANCH:-main}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
template="$here/content-template"

[ -d "$template" ] || { echo "Nie znaleziono $template" >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Ask the remote what it has before cloning. A repo with no commits cannot be
# inspected by looking at a checkout: git clones it with an empty working tree
# and no branch, which is indistinguishable from "cloned a repo with content
# but checked nothing out" — and that mistake would push an unrelated root
# commit at a repo that already has work in it.
heads="$(git ls-remote --heads "$REPO" 2>/dev/null || true)"

if [ -z "$heads" ]; then
  echo "Repozytorium jest puste — zakładam pierwszą gałąź $BRANCH."
  git init --quiet "$work/repo"
  cd "$work/repo"
  git remote add origin "$REPO"
  git checkout --quiet -B "$BRANCH"
else
  echo "Klonuję $REPO…"
  git clone --quiet "$REPO" "$work/repo" || {
    echo "Nie udało się sklonować. Sprawdź dostęp (klucz SSH) i adres repo." >&2
    exit 1
  }
  cd "$work/repo"

  if git show-ref --quiet --verify "refs/remotes/origin/$BRANCH"; then
    git checkout --quiet "$BRANCH"
  else
    echo "Gałąź $BRANCH jeszcze nie istnieje — zakładam ją." >&2
    git checkout --quiet -B "$BRANCH"
  fi

  if [ -e content ] || [ -e images ]; then
    echo >&2
    echo "To repozytorium ma już treść (content/ albo images/)." >&2
    echo "Przerywam, żeby nic nie nadpisać. Jeśli naprawdę chcesz zacząć od nowa," >&2
    echo "usuń tę treść ręcznie i uruchom skrypt jeszcze raz." >&2
    exit 1
  fi
fi

# -a keeps the .github directory; a plain glob would skip it.
cp -a "$template/." .

git add -A
git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo 'AW Fotografia')}" \
    -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo 'noreply@aw-foto.pl')}" \
    commit --quiet -m "Treść startowa strony

Przykładowe sesje, oferta, cennik i ustawienia wraz ze zdjęciami
zastępczymi, w układzie katalogów, którego oczekuje panel.

Zawiera też .github/workflows/publish.yml — to on zmniejsza wgrywane
zdjęcia i uruchamia przebudowę strony."

echo "Wysyłam na $BRANCH…"
git push --quiet -u origin "$BRANCH"

echo
echo "Gotowe. W repozytorium jest teraz:"
git ls-files | sed 's/^/  /'
echo
echo "Następne kroki:"
echo "  1. Ustaw w tym repo sekret CODE_REPO_TOKEN (token z prawem dispatch do repo z kodem)."
echo "  2. W repo z kodem ustaw CONTENT_REPO_TOKEN (odczyt tego repo)."
echo "  3. W panelu podmień treść startową na prawdziwą."
