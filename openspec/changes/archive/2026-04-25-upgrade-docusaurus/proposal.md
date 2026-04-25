# Proposal — upgrade-docusaurus

## Intent

Bring the `docs/` container onto the same `node:24-alpine` pin used by the rest of the active stack. The previous `update-node-and-postgres` change held docs back at `node:20` because Docusaurus 3.9.x shipped a webpack peer that npm 11 (Node 24) refused to resolve. This change unblocks docs.

## Scope

### In scope

- `docs/package.json`: bump every `@docusaurus/*` package to `3.10.0` (the latest stable at the time of writing) and align them all so Docusaurus's own version-coherence check stops failing.
- `docs/package.json`: add an `overrides` block pinning `webpack` to `5.95.0` — the floor declared by `@docusaurus/core@3.10.0` and `@docusaurus/bundler@3.10.0`. Without the override, npm 11 resolves a newer 5.x that has tightened `ProgressPlugin`'s option schema, rejecting the extra `name` / `color` / `reporters` keys Docusaurus passes.
- Regenerate `docs/package-lock.json` under `node:24-alpine` so `npm ci` succeeds.
- `docs/Dockerfile`: `FROM node:20` → `FROM node:24-alpine`.
- `AGENTS.md`: drop the held-back note and update the pin table row.

### Out of scope

- Docusaurus 4.x. Not yet released in the 3.x line on npm; nothing to migrate to.
- Switching to a different docs framework (mkdocs, vitepress, etc.). Out of scope; the docs already work.
- Removing the `webpack` override once Docusaurus ships a release that fixes the ProgressPlugin call. We keep the override until then; future Docusaurus bumps should reassess.

## Approach

1. Pin all `@docusaurus/*` packages to `3.10.0`. The exact-version pin (no `^`) prevents `npm install` from drifting one of the packages into a different patch version, which is exactly how the previous `^3.9.2` on `theme-mermaid` resolved to a different minor than `core` and triggered the version-coherence error.
2. Add `overrides.webpack: "5.95.0"` to lock the transitive webpack to the version Docusaurus tests against. npm honours `overrides` for the entire transitive graph.
3. Regenerate `docs/package-lock.json` from scratch inside `node:24-alpine` so the lockfile reflects exactly what the build container resolves.
4. Switch the Dockerfile base image. Keep the existing `npm ci` step (now passes against the regenerated lockfile).
5. Confirm `docker compose --profile docs build docs` succeeds and the in-container `npm run build` produces a `build/` directory.
