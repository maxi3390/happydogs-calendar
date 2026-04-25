# Proposal — update-node-and-postgres

## Intent

Refresh the project's container image pins for the active services:

- Frontend: `node:22-alpine` → `node:24-alpine`.
- Database: `postgres:16-alpine` → `postgres:18-alpine`.

Both bumps use the alpine slim variant, keeping the existing image-size profile.

## Scope

### In scope

- `frontend/Dockerfile` base image bump.
- `docker-compose.yml` `db.image` bump.
- AGENTS.md "Tool execution policy" pin table refresh so agents spinning up one-off containers (`docker run --rm node:24-alpine sh -c 'tsc --noEmit'`) match the live source.
- User-facing docs in `docs/docs/{overview,architecture,deployment,frontend/intro}.md`: the inline "PostgreSQL 16" / "node:22-alpine" mentions become "PostgreSQL 18" / "node:24-alpine".
- Operational note in this change folder describing the **non-trivial Postgres major-version upgrade procedure** so an existing deployment doesn't lose data on `make upgrade`.

### Out of scope

- **`docs/Dockerfile`.** Docusaurus 3.9.x pulls in a webpack peer that fails npm 11's stricter ProgressPlugin schema validation. Updating Node alone breaks `npm run build` inside the docs container; updating Docusaurus to a version compatible with current webpack is a separate, scope-creep change. The docs container stays on `node:20`. The AGENTS.md pin table notes the constraint so the next person to bump it does so in a single coordinated change with the Docusaurus dependency.
- **Playwright image** (`mcr.microsoft.com/playwright:v1.58.2-noble`). Not requested; bumping would require revalidating every E2E test.
- **Backend image** (`python:3.12-slim`). Not requested.
- **Reverse-proxy image** (`traefik:v3.6`). Not requested.

## Approach

1. Bump the two image tags. Build verifications run inside containers (per AGENTS.md tool-execution policy).
2. Update the AGENTS.md pin table; add a one-line note explaining why docs is held back.
3. Update the user-facing docs that name the versions verbatim.
4. Document the **postgres major-version upgrade** in design.md: existing `postgres:16` data files are not readable by `postgres:18`. The operator must `make backup` (still on v16), then **destroy the data volume**, then bring up v18 fresh, then `make restore`. This isn't covered by `make upgrade`'s default flow.
