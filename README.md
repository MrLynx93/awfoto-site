# AW Fotografia

Polish-language promotional site for a photography business. Static Astro site
with a Keystatic admin panel, hosted on mydevil.net.

**For the photographer:** see [DLA-FOTOGRAFA.md](./DLA-FOTOGRAFA.md) — how to add
sessions, change prices, and switch the Christmas offer on and off.

---

## Getting started

```bash
npm install
npm run content:init     # seed content, so the site builds before the content repo exists
npm run dev              # site at localhost:4321
```

Once the private content repo exists, use `npm run content:pull` instead of
`content:init` — it clones or updates `site-content/`.

### Editing content locally

The panel at `/keystatic` always talks to the private content repo over GitHub,
in development as well as production, so it needs the OAuth credentials from
[`.env.example`](./.env.example) and a GitHub login. Local site development
needs none of that — `npm run dev` renders straight from `site-content/`.

Keystatic also has a "local" storage mode that edits files on disk with no
login, but it is **not** usable here: its reader walks the current repo's git
tree and honours `.gitignore`, and `site-content/` is gitignored by design, so
local mode shows an empty panel. It only works in a checkout where the content
is committed — hence `PUBLIC_KEYSTATIC_STORAGE=local` is opt-in, not the default.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server; site reads `./site-content`, panel needs GitHub credentials |
| `npm run build` | Static build into `dist/` |
| `npm run serve` | Runs the production Express entry (`app.js`) |
| `npm run content:init` | Copies `content-template/` → `site-content/` (won't overwrite) |
| `npm run content:pull` | Clones/updates the private content repo |
| `npm run images:resize` | Shrinks oversized photos in `site-content/` in place |
| `npm run images:check` | Reports oversized photos without changing them |
| `npm run fetch:fonts` | Re-downloads the self-hosted webfonts |

## How it fits together

```
Panel at panel.awfotografia.pl/keystatic
        │  commits Markdown/YAML + images
        ▼
   lynx-soft/awfotografia-site-content  (private)
        │  publish.yml → repository_dispatch
        ▼
   this repo ── GitHub Actions ──┐
        │  checkout code          │  checkout site-content → ./site-content
        ▼  npm ci && npm run build ◄┘
   rsync over SSH to mydevil.net
        ├── dist/client/ → awfotografia.pl/public_html        (static, nginx)
        └── whole app    → panel.awfotografia.pl/public_nodejs (Passenger + Express)
```

**Why the split:** the public site is static files served straight by nginx, so
no photo request touches Node. Only Keystatic's API routes need a Node runtime,
and they live on the panel subdomain — which is `noindex` and redirects every
non-panel path to the real site.

**Why two repos:** the photographer's GitHub account gets write access to content
only, so she can't break the site code, and unpublished drafts stay out of any
public repo.

## Conventions

- **Code is English** — identifiers, filenames, components, CSS classes.
  **Only the colour tokens keep Polish names** (`--kremowy`, `--glina`, …),
  as do all user-facing strings and panel labels.
- **URLs are Polish**: `/sesje`, `/oferta`, `/cennik`, `/o-mnie`, `/kontakt`.
- **Portfolio and blog are one thing.** A session is a short piece of text plus
  its photos, rendered as intro → text → photos, at `/sesje`.

## Content model

| Where | What |
|---|---|
| `sessions` (collection) | `site-content/content/sessions/*.mdoc` — the site's only editorial collection |
| `offers` (collection) | `site-content/content/offers/*.yaml` |
| `pricing` (singleton) | `site-content/content/pricing.yaml` |
| `settings` (singleton) | `site-content/content/settings.yaml` |

Sessions and offers are Astro content collections because they carry images and
need the `image()` schema for `astro:assets` optimisation. Pricing and settings
have no images, so `src/lib/siteContent.ts` reads them directly — still
schema-validated, so a panel typo fails the build rather than silently rendering
a blank section.

Keystatic image fields write into `site-content/images/…` with a `publicPath` that
resolves relative to the content file, which is what lets Astro optimise them.

### Image paths are Keystatic's convention, not ours

An entry's images must live under `images/<collection>/<entry-slug>/`, named after
their field path:

```
images/sessions/roczek-antosia/coverImage.jpg        ← the coverImage field
images/sessions/roczek-antosia/photos/0/image.jpg    ← photos[0].image
images/offers/plenerowa/image.jpg                    ← the offers image field
```

Keystatic resolves an image by stripping `publicPath` *plus the entry slug* off the
stored value and looking up the remainder under the field's `directory`. Anything
laid out differently shows as an **empty image field in the panel** — and because
`coverImage` is required, that silently blocks saving. On the next successful save
Keystatic rewrites the paths to this shape and moves the files to match.

`content-template/` therefore mirrors this layout exactly, so seed content and
panel-created content are byte-identical. `scripts/generate-placeholders.mjs`
generates the files in the right places; if you add a seed entry by hand, follow
the same pattern.

## Deployment

### One-time setup on mydevil.net

```bash
devil www add awfotografia.pl static
devil www add panel.awfotografia.pl nodejs 22

# free, auto-renewing certificates for both
devil ssl www add <IP> le le awfotografia.pl
devil ssl www add <IP> le le panel.awfotografia.pl
```

Then create `~/domains/panel.awfotografia.pl/public_nodejs/.env` from
[`.env.example`](./.env.example). It is never committed and survives deploys.

### GitHub secrets and variables

In **this** repo:

| Secret | What |
|---|---|
| `MYDEVIL_HOST`, `MYDEVIL_USER` | SSH target |
| `MYDEVIL_SSH_KEY` | Private key for that account |
| `CONTENT_REPO_TOKEN` | Read access to the private content repo |

| Variable | Default |
|---|---|
| `SITE_URL` | `https://awfotografia.pl` |
| `SITE_DOMAIN` / `PANEL_DOMAIN` | `awfotografia.pl` / `panel.awfotografia.pl` |
| `CONTENT_REPO` | `lynx-soft/awfotografia-site-content` |

In the **content** repo: `CODE_REPO_TOKEN` (a token that can dispatch to this repo).

### Seeding the content repo

While `lynx-soft/awfotografia-site-content` is still empty, fill it in one step:

```bash
./scripts/seed-content-repo.sh
```

That pushes the seed sessions, offers, price list, settings and their photos —
in Keystatic's exact directory layout, so the panel reads them on first load —
plus `.github/workflows/publish.yml`, which is what resizes uploaded photos and
triggers a rebuild. It refuses to run if the repo already has `content/` or
`images/`, so it cannot clobber real work.

### GitHub OAuth app for the panel

Register at *Settings → Developer settings → OAuth Apps* with callback
`https://panel.awfotografia.pl/api/keystatic/github/oauth/callback`, then put the
client ID and secret in the server-side `.env` along with a
`KEYSTATIC_SECRET` (`openssl rand -hex 32`).

**Fallback:** if Passenger proves awkward, the public site is unaffected — it is
just static files. Run the panel locally with `npm run dev` and deploy only
`dist/client/`.

## Running cost

`.pl` domain ≈ 80–100 zł/rok + mydevil MD1 ≈ 100 zł/rok → **≈ 180–200 zł/rok.**

## Things worth knowing

- **Photos are resized automatically, in CI.** In GitHub storage mode Keystatic
  commits straight from the browser to api.github.com — our server is never in
  the path, and there is no custom-field API to hook the upload — so nothing can
  touch a photo *before* it reaches GitHub. `publish.yml` in the content repo
  therefore resizes anything over 2400 px or 900 KB and **amends the panel's own
  commit**, force-pushing with `--force-with-lease`. The oversized original is
  never permanently referenced, so GitHub garbage-collects it and the repo stays
  small. This is what lets photos be uploaded straight from the camera.
  If a second save lands mid-run the lease refuses and that run bows out; the
  new push is resized by its own run. The bot's push is skipped via an
  `actor != github-actions[bot]` guard so the workflow doesn't loop.
- **Publishing is not instant** — save → commit → build → deploy ≈ 2–3 minutes.
- **No analytics, no cookies, no contact form**, so there is no consent banner
  and no spam surface. A commented-out Plausible snippet sits in `BaseLayout.astro`.
- **Fonts are self-hosted**, split `latin`/`latin-ext` so Polish diacritics render
  without a third-party request.
- **`content-template/` is seed data**, not the live content. Once the private
  repo exists, edit content there — this folder is only a starting point and a
  fallback for local builds.

## Still to fill in

Business name and city · phone · e-mail · Facebook and Instagram URLs · real
prices · about-me text · real photos. All currently placeholders in
`content-template/content/settings.yaml` and `pricing.yaml`, editable from the
panel once deployed. The privacy policy also needs real company details before
going live.
