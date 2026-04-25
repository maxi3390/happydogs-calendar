# Tasks

## 1. Dependency pins

- [x] 1.1 Bump every `@docusaurus/*` package in `docs/package.json` to `3.10.0` (exact, no `^`).
- [x] 1.2 Add `overrides.webpack: "5.95.0"` to `docs/package.json`.
- [x] 1.3 Regenerate `docs/package-lock.json` under `node:24-alpine` so it reflects exactly what the build container resolves.

## 2. Container

- [x] 2.1 `docs/Dockerfile`: `FROM node:20` → `FROM node:24-alpine`. Keep `npm ci`.

## 3. Documentation

- [x] 3.1 AGENTS.md pin table: change the Docs row to `node:24-alpine` and remove the held-back note.

## 4. Verification

- [x] 4.1 `docker run --rm -v <docs>:/app -w /app node:24-alpine sh -c 'npm ci'` — succeeds.
- [x] 4.2 Same container: `npm run build` — succeeds, generates `build/`.
- [x] 4.3 `docker compose --profile docs build docs` — succeeds.
- [x] 4.4 `docker compose --profile docs up -d docs` and curl `http://localhost:3001/` — to be confirmed by the operator end-to-end.
