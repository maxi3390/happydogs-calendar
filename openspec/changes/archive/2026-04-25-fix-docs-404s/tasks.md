# Tasks

## 1. Homepage

- [x] 1.1 Create `docs/src/pages/index.js` with a `<Redirect to="/docs/overview" />`.

## 2. Branding asset

- [x] 2.1 Create `docs/static/img/logo.svg` — paw-print SVG matching the project's Lucide-PawPrint branding.
- [x] 2.2 `docusaurus.config.js`: change `favicon` from `img/favicon.ico` to `img/logo.svg`. Reuses the same asset for the favicon.

## 3. Drop unbacked references

- [x] 3.1 `docusaurus.config.js`: remove `themeConfig.image: 'img/happy-calendar-social-card.jpg'`. No JPG to back it; restore when the asset is authored.
- [x] 3.2 `docusaurus.config.js`: replace the `presets > classic > blog: { ... }` block with `blog: false`. There's no `blog/` content directory.

## 4. Verification

- [x] 4.1 `docker compose --profile docs build docs` — succeeds with zero `Broken link` warnings.
- [x] 4.2 Boot the docs service and curl every linked route — all return 200.
- [x] 4.3 `grep -r 'favicon\.ico\|social-card\|/blog' docs/build/` — empty (zero references in the compiled HTML).
