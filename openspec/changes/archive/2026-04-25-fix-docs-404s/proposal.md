# Proposal — fix-docs-404s

## Intent

Several routes on the docs site return 404 in the live container even though the build "succeeds":

- `/` — no `src/pages/index.{js,tsx,md}` exists, so the homepage hits Docusaurus's default 404 page.
- `/img/logo.svg`, `/img/favicon.ico`, `/img/happy-calendar-social-card.jpg` — the navbar logo / favicon / social card are referenced in `docusaurus.config.js` but no `static/` directory exists, so every `/img/*` path 404s.
- `/blog/*` — the `classic` preset's `blog` config is wired up (with `editUrl` etc.) but there's no `blog/` content directory, leaving empty / dead routes.

This change closes every reachable 404 without changing what the docs cover.

## Scope

### In scope

- New `docs/src/pages/index.js`: a `<Redirect to="/docs/overview" />` so `/` resolves to the canonical entry point of the docs hub.
- New `docs/static/img/logo.svg`: a small Lucide-style paw-print SVG that matches the project's brand. Reused for both the navbar logo and the favicon (browsers accept SVG via `<link rel="icon" type="image/svg+xml">`).
- `docusaurus.config.js`: switch `favicon` from `img/favicon.ico` to `img/logo.svg`, drop the unbacked `image: 'img/happy-calendar-social-card.jpg'` (no JPG to point at), and disable the blog preset (`blog: false`).

### Out of scope

- Authoring blog content. The site is documentation-only; if a blog is wanted later, re-enable the preset and add a `blog/` directory in that change.
- A separate landing page distinct from the docs hub. The homepage is a redirect, not a marketing page.
- A real social-card image. Generating a 1200×630 JPG is its own design task; until one exists, omitting the meta tag is cleaner than referencing a missing file.

## Approach

1. Verify the build's output under `node:24-alpine` references no `/img/*` or `/blog*` paths once the config is fixed. Pages emit `<link rel="icon" href="/img/logo.svg">` (200) and never reference the dropped paths.
2. Smoke-test every linked route on the running `docs` compose service. Each linked route returns 200; the only non-200s are nginx's trailing-slash 301 (when serving the static build directly) and 404s on URLs the rendered HTML never references (so they're unreachable from the site itself).
