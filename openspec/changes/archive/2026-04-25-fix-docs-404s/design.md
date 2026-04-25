# Design — fix-docs-404s

## Cataloguing the 404s

The `docusaurus.config.js` and the file system disagreed on three classes of asset:

| Reference | Source | File on disk | Result |
|-----------|--------|--------------|--------|
| `/` | navbar / footer / sidebar links | no `src/pages/index.*` | 404 (homepage) |
| `/img/logo.svg` | `themeConfig.navbar.logo.src` | no `static/` dir | 404 |
| `/img/favicon.ico` | `siteConfig.favicon` | no `static/` dir | 404 |
| `/img/happy-calendar-social-card.jpg` | `themeConfig.image` (Open Graph) | no `static/` dir | 404 |
| `/blog`, `/blog/<slug>` | `presets > classic > blog` enabled | no `blog/` dir | empty / 404 routes |

The build did not surface these as hard errors because Docusaurus only **warns** on broken markdown links by default and silently emits `<link>` / `<meta>` tags for non-existent assets — they don't fail the build, they just 404 at runtime.

The previous `update-node-and-postgres` change captured them as build-time warnings:

```
- Broken link on source page path = /docs/overview: -> linking to /
- Broken link on source page path = /docs/architecture: -> linking to /
...
```

That's the build telling us: every doc page links back to `/`, and `/` doesn't exist. After this change those warnings disappear.

## Fix per class

### Homepage `/`

A `src/pages/index.js` file at the React-pages layer of Docusaurus becomes the homepage. Three options were considered:

1. **Bare redirect** (`<Redirect to="/docs/overview" />`) — minimal, correct, no marketing surface.
2. **Hand-built landing page** — would be a separate design task with its own copy.
3. **Markdown index** (`pages/index.md`) — works, but pulls Docusaurus's default page chrome which looks identical to a docs page and confuses users about whether they're "in the docs hub" yet.

We pick (1): a small React component that does a client-side `Redirect`. It also doubles as a clear answer to "what's at `/`" — "the docs hub". The previously-warned broken links from `/docs/overview` etc. all resolved to `/`; after this change `/` resolves further to `/docs/overview` and the warnings disappear.

```jsx
import { Redirect } from '@docusaurus/router';

export default function Home() {
  return <Redirect to="/docs/overview" />;
}
```

### Logo + favicon

The brand identity in the rest of the project is a paw-print (Lucide's `PawPrint` icon, used in the frontend). Mirroring that here keeps the docs visually anchored to the product. A 24×24 SVG is enough — Docusaurus scales it for the navbar (~40px) and favicon (~16-32px) automatically.

The same SVG serves both `themeConfig.navbar.logo.src` and `siteConfig.favicon`. Modern browsers accept SVG favicons via `<link rel="icon" type="image/svg+xml" href="...">`, which Docusaurus emits when the favicon path ends in `.svg`. Older browsers fall back to a default favicon — acceptable tradeoff vs. the alternative of also generating an `.ico`.

### Social-card meta tag

`themeConfig.image` controls the `og:image` / `twitter:image` meta tags. Pointing it at a non-existent file means social shares get a broken preview. The choices were:

1. Remove the line entirely — meta tag isn't emitted at all, social shares get no preview.
2. Generate a 1200×630 JPG.
3. Re-use `img/logo.svg` — but Open Graph spec requires a raster image at a specific aspect ratio; SVG isn't reliably supported.

(2) is its own design task (logo + tagline + brand colors at the right pixel size). For this change we go with (1): drop the line. When a social-card image is created later, restore the line in the same change that adds the asset.

### Blog preset

The `classic` preset has three sub-options: `docs`, `blog`, `theme`. The default for `blog` is "enabled with default options" — Docusaurus then looks for `blog/` and falls over silently (or worse, generates empty index pages) when it's missing.

`blog: false` cleanly disables every blog-derived route at the preset level. No `/blog`, no `/blog/tags/*`, no `/blog/archive`, no Atom / RSS feeds.

## Verification

The fix was validated three ways:

1. **Build warnings.** Before: 4× `Broken link on source page path = /docs/...: linking to /`. After: zero broken-link warnings.
2. **Static-file smoke test.** `nginx:alpine` serving `docs/build/` — every linked route returns 200; explicit GETs for the dropped paths (`/img/favicon.ico`, `/img/happy-calendar-social-card.jpg`, `/blog`) return 404 but no rendered HTML references them, so they're unreachable from any site link.
3. **Live `docs` compose service.** `docker compose --profile docs up -d docs` followed by curl against every linked route — all return 200 (nginx-style trailing-slash 301s do not happen on the Docusaurus dev/serve runtime).

## Tests

Frontend-only behaviour change with no API or backend surface. Verification is manual + build-warning observation:

- `docker compose --profile docs build docs` — succeeds with zero broken-link warnings.
- `docker compose --profile docs up -d docs` and curl `/`, `/img/logo.svg`, `/docs/{overview,architecture,backend/intro,frontend/intro,deployment}` — every route returns 200.
- `grep -r 'favicon\.ico\|social-card\|/blog' build/` — empty (zero references in the compiled HTML).
