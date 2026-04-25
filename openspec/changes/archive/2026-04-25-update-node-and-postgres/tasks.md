# Tasks

## 1. Image pins

- [x] 1.1 `frontend/Dockerfile`: `FROM node:22-alpine` → `FROM node:24-alpine`.
- [x] 1.2 `docker-compose.yml`: `db.image: postgres:16-alpine` → `postgres:18-alpine`.

## 2. Documentation

- [x] 2.1 AGENTS.md "Tool execution policy" pin table: update Frontend and Database rows. Add a note explaining why Docs is held back on `node:20`.
- [x] 2.2 `docs/docs/overview.md`: "PostgreSQL 16" → "PostgreSQL 18" in both prose and the inline ASCII diagram.
- [x] 2.3 `docs/docs/architecture.md`: same in prose, Mermaid diagrams, and the service table (`postgres:18-alpine`).
- [x] 2.4 `docs/docs/deployment.md`: Mermaid diagram + `db` service block (`postgres:18-alpine`).
- [x] 2.5 `docs/docs/frontend/intro.md`: three references to `node:22-alpine` in the Dockerfile description and multi-stage build narrative.

## 3. Verification

- [x] 3.1 `tsc --noEmit` (in `node:24-alpine`) — clean.
- [x] 3.2 `next build` (in `node:24-alpine`) — passes.
- [x] 3.3 Bring up `postgres:18-alpine` against a fresh volume and confirm health check returns ready. (Operational — requires destroying any existing v16 volume per the upgrade procedure in `design.md`.)

## 4. Out of scope (documented, not implemented)

- [x] 4.1 `docs/Dockerfile` stays on `node:20`. AGENTS.md notes the constraint; design.md explains the Docusaurus + webpack + npm 11 chain.
- [x] 4.2 `make pg-major-upgrade` automation. Operators run the five-step procedure manually for now.
