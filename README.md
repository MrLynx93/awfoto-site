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
Panel at panel.aw-foto.pl/keystatic
        │  commits Markdown/YAML + images
        ▼
   MrLynx93/awfoto-site-content  (private)
        │  publish.yml → repository_dispatch
        ▼
   this repo ── GitHub Actions ──┐
        │  checkout code          │  checkout site-content → ./site-content
        ▼  npm ci && npm run build ◄┘
   rsync over SSH to mydevil.net
        ├── dist/client/ → aw-foto.pl/public_html        (static, nginx)
        └── whole app    → panel.aw-foto.pl/public_nodejs (Passenger + Express)
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
# The static site: nginx serves the files directly, no Node in the request path.
devil www add aw-foto.pl static

# The panel. The nodejs type takes the full path to the interpreter and an
# environment — not a bare version number.
devil www add panel.aw-foto.pl nodejs /usr/local/bin/node22 production

# free, auto-renewing certificates for both
devil ssl www add <IP> le le aw-foto.pl
devil ssl www add <IP> le le panel.aw-foto.pl
```

Check the available interpreter path first (`ls /usr/local/bin/node*`); the host
carries several versions and only the even-numbered ones are LTS. Node 22 is
what CI builds with, so match it.

Then create `~/domains/panel.aw-foto.pl/public_nodejs/.env` from
[`.env.example`](./.env.example). It is never committed and survives deploys.

### Pointing the domain at the host

The domain does not have to be bought from the host — buy it at any registrar
and point it here. Order matters: DNS first, then the www entries, then the
certificates. Issuing a certificate before the domain resolves fails, because
Let's Encrypt validates over HTTP against the live name.

**1 — create the DNS zone on the host.**

```bash
devil dns add aw-foto.pl     # or: panel → Strefy DNS → + Dodaj nową strefę
```

**2 — hand the domain to the host's nameservers, at the registrar.** On mydevil
they are `dns1.mydevil.net` and `dns2.mydevil.net`; on small.pl read them out of
the panel rather than assuming — do not guess nameserver hostnames. At the
registrar this is "serwery nazw" / "delegacja DNS".

Re-delegation is a registry change, so it is not instant: usually minutes, up to
24 h. Wait for it before step 4:

```bash
dig +short NS aw-foto.pl     # must show the host's nameservers
```

*Alternative:* keep DNS at the registrar and add two A records instead — `@` and
`panel`, both pointing at the account's IP (`devil www list` shows it). Works
fine; you just lose the host's mail records, so pick this only if you don't want
`kontakt@aw-foto.pl` on this host.

**3 — add the two www entries**, as in the setup block above (`static` for the
site, `nodejs` for the panel).

**4 — issue the certificates**, once `dig +short A aw-foto.pl` returns the
account IP for both names.

**5 — tell the build about it:** set the `SITE_DOMAIN` repository variable, set
`SITE_URL` in the server-side `.env`, and point the GitHub OAuth callback at
`https://panel.<domain>/api/keystatic/github/oauth/callback`. See *Changing the
domain* above — those three are the ones that actually break things.

### GitHub secrets and variables

In **this** repo:

| Secret | What |
|---|---|
| `MYDEVIL_HOST`, `MYDEVIL_USER` | SSH target |
| `MYDEVIL_SSH_KEY` | Private key for that account |
| `CONTENT_REPO_TOKEN` | Read access to the private content repo |

| Secret | What | If unset |
|---|---|---|
| `KEYSTATIC_GITHUB_CLIENT_ID` | OAuth app client id | the `.env` step is skipped entirely |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | OAuth app client secret | — |
| `KEYSTATIC_SECRET` | signs panel sessions | kept from the server, generated on first deploy |

| Variable | Default |
|---|---|
| `SITE_DOMAIN` | `aw-foto.pl` — the only domain setting; the rest derives from it |
| `PANEL_DOMAIN` | `panel.<SITE_DOMAIN>`, unless set explicitly |

### The panel's `.env` is written by CI

Setting the three `KEYSTATIC_*` secrets above is enough — the deploy writes
`~/domains/<panel>/public_nodejs/.env` over SSH and `chmod 600`s it, so the
panel can be set up without ever opening a shell. The step is skipped when
`KEYSTATIC_GITHUB_CLIENT_ID` is unset, so it cannot blank out a hand-written
`.env`; the rsync excludes `.env` either way.

`KEYSTATIC_SECRET` only has to be *stable*, not known: CI reuses whatever is
already on the server and generates one on the first deploy. Set it as a secret
only if you want to control it.

**The content repo is a build-time setting, not a runtime one.**
`keystatic.config.ts` is bundled into the browser, so `import.meta.env.PUBLIC_*`
is statically replaced when the site is built — putting `PUBLIC_CONTENT_REPO_*`
in the server's `.env` does nothing. Verified by building with a probe value and
finding it baked into `dist/client/_astro/keystatic-page.*.js`. CI passes them to
`npm run build` from the `CONTENT_OWNER` / `CONTENT_NAME` values set at the top
of `deploy.yml`, which name the repo directly rather than through a variable.

### Changing the domain

The domain is not hardcoded — CI reads `SITE_DOMAIN`, the server reads
`SITE_URL`. To move to a different one (`aw-foto.pl`, say):

1. Set the repository variable **`SITE_DOMAIN`**. That alone fixes the canonical
   URLs and sitemap in the build, both rsync targets, and the panel restart.
2. On the server, update **`SITE_URL`** in `.env` — it is where the panel sends
   non-panel traffic.
3. Re-point the **GitHub OAuth app** callback to
   `https://panel.<new-domain>/api/keystatic/github/oauth/callback`. The panel
   cannot log in until this matches.
4. On mydevil, `devil www add` the two new domains and issue their certificates,
   as in the setup block above.
5. Update the panel address in `DLA-FOTOGRAFA.md`, and the Plausible
   `data-domain` in `BaseLayout.astro` if analytics are ever switched on.

Steps 3 and 4 are the ones that actually break things if skipped; the rest are
cosmetic until traffic arrives.

In the **content** repo: `CODE_REPO_TOKEN` (a token that can dispatch to this repo).

### Seeding the content repo

While `MrLynx93/awfoto-site-content` is still empty, fill it in one step:

```bash
./scripts/seed-content-repo.sh
```

That pushes the seed sessions, offers, price list, settings and their photos —
in Keystatic's exact directory layout, so the panel reads them on first load —
plus `.github/workflows/publish.yml`, which is what resizes uploaded photos and
triggers a rebuild. It refuses to run if the repo already has `content/` or
`images/`, so it cannot clobber real work.

### GitHub App for the panel — not an OAuth App

Keystatic needs a **GitHub App**, at *Settings → Developer settings → GitHub
Apps → New*. An OAuth App has a client id and secret too and will happily let
you log in, but its token cannot see the content repo: Keystatic uses a
user-to-server token, which only reaches repositories where the **App is
installed**. The symptom is a successful login followed by Keystatic's
"Repo not found" page.

| Field | Value |
|---|---|
| Homepage URL | `https://panel.aw-foto.pl/keystatic` |
| Callback URL | `https://panel.aw-foto.pl/api/keystatic/github/oauth/callback` |
| Request user authorization (OAuth) during installation | ticked |
| Webhook → Active | unticked |
| Repository permissions | Contents: **Read and write**, Metadata: Read, Pull requests: Read |
| Where can this be installed | Only on this account |

Then **install it** on the content repo (*Install App* → Only select
repositories), generate a client secret, and set `KEYSTATIC_GITHUB_CLIENT_ID`
and `KEYSTATIC_GITHUB_CLIENT_SECRET` as repository secrets. `KEYSTATIC_SECRET`
is generated by the deploy.

Optionally set the repository **variable** `KEYSTATIC_GITHUB_APP_SLUG` to the
app's slug (the last part of its settings URL). It only makes the panel's
"repo not found" page link to the install page — which is precisely the page
you see when the app is missing from a repo.

`/keystatic/setup` in the panel automates all of this: it posts a prefilled
manifest to GitHub, which creates the app with exactly these permissions.

**Fallback:** if Passenger proves awkward, the public site is unaffected — it is
just static files. Run the panel locally with `npm run dev` and deploy only
`dist/client/`.

## Which host

The deploy targets a host with SSH and the `devil` CLI. Two work identically:

| | Disk | Price |
|---|---|---|
| **small.pl** SMALL1 | 5 GB | 50 zł/rok (25 zł first year) |
| **mydevil.net** MD1 | — | ~100 zł/rok |

small.pl is mydevil's own budget brand from the same operator (ADMIN.NET.PL),
in the same ATMAN Warsaw datacenter, with the same `devil` tooling and the same
language support. Nothing in this repo changes between them.

5 GB is ample: the panel needs ~370 MB (`node_modules` — Astro, Keystatic and
React are runtime dependencies, so `--omit=dev` barely trims it), and the built
site is a few MB plus the generated photo variants.

## Running cost

`.pl` domain ≈ 60–100 zł/rok + hosting 50–100 zł/rok → **≈ 110–200 zł/rok**,
depending on which of the two you pick.

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
