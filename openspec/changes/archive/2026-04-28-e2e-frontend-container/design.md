# Design: dedicated frontend-e2e container

## Decisions

### Build-arg, not a separate Dockerfile

`NEXT_PUBLIC_API_URL` is read by Next.js at *build* time and inlined into the JS bundle for browser-side fetches. There are two ways to bake a different value into the e2e image:

1. **`ARG` in the existing Dockerfile**, overridden via `--build-arg` from compose.
2. **`Dockerfile.e2e`** — duplicate the multi-stage build with a different `ENV` line.

We pick option 1. The dev and e2e images share 99% of their build (same node version, same install, same source); duplicating the Dockerfile to flip a single env var is gratuitous DRY violation. The build-arg pattern is explicit at the call site (compose's `args:` block), so the difference between dev and e2e images is one line of YAML, not a parallel Dockerfile.

```dockerfile
# frontend/Dockerfile (relevant block)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
```

The dev compose file passes no build-arg → `NEXT_PUBLIC_API_URL` is empty → Next.js inlines an empty string → fetches resolve to relative `/api/...` → Traefik routes them. Unchanged from today.

The e2e compose file passes `NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api` → Next.js inlines that → fetches go directly to the e2e backend.

### Frontend-e2e on the same network as backend-e2e

`frontend-e2e` joins the dedicated `happy-calendar-e2e` bridge network. The Playwright container, also joined to that network, addresses the page as `http://frontend-e2e:3000`. The page's browser then fetches `http://backend-e2e:8000/api/...` — also resolvable on the same Docker network.

No Traefik labels, no host ports. The full e2e stack — db, backend, frontend — is reachable only by the Playwright container that brings it up.

### Why not run Playwright against the dev `frontend` container with its NEXT_PUBLIC_API_URL pointing at backend-e2e?

Two ideas surfaced in design that we discarded:

- **Live-mutate the dev frontend's env at runtime.** Doesn't work: `NEXT_PUBLIC_*` is build-time. The deployed bundle has the URL inlined; nothing the runtime container does can change it.
- **Run a Next.js dev server (`npm run dev`) inside the e2e container.** Builds happen on first request, so the test would hang waiting. Could work, but slower and less production-like than a `next build` artefact.

A static, pre-built frontend-e2e image is the right shape: faster after first build, identical to production behaviour, and the build-arg makes the configuration explicit.

### Healthcheck on frontend-e2e

`node:24-alpine` doesn't ship with `curl`. We use a busybox-y `wget` invocation that exists on alpine:

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:3000/ >/dev/null 2>&1 || exit 1"]
  interval: 2s
  timeout: 3s
  retries: 30
```

`wget -qO-` writes to stdout (silent, with response body to /dev/null). Exits 0 when the server responds 200 (after `next build` and `node server.js` have both completed). The retry count covers cold-start + first-build cases.

### CORS

Browser-side fetches from `http://frontend-e2e:3000` to `http://backend-e2e:8000` are cross-origin. Django settings already have `CORS_ALLOW_ALL_ORIGINS = True` in development; the e2e backend uses the same code path, so it accepts these calls. Production CORS hardening (allow-list specific origins) is a separate concern tracked outside this change.

### Existing tests keep working

Today's tests rely heavily on `page.route` to mock `/api/translations/`, `/api/users/`, etc. Those routes match by URL pattern, not by origin, so they fire whether the page's API URL is `frontend-e2e:3000/api` or `backend-e2e:8000/api`. The mocks continue to intercept and the tests continue to pass.

The new infrastructure unblocks dropping mocks per-spec when an integration test makes more sense than a stubbed unit. We don't migrate any spec in this change.

### Why a separate `wait` orchestration in the script?

`docker compose up --wait` is great when every service has a healthcheck, but `frontend-e2e`'s healthcheck depends on a successful `next build` having completed. If the build is slow, the healthcheck retries until the server responds — which is exactly what we want. No bespoke wait logic needed; we keep `--wait --wait-timeout 240` (raised from 120 to allow first-time `next build`).

## Alternatives considered

- **`Dockerfile.e2e`**: rejected for DRY (covered above).
- **Runtime config injection**: rejected for complexity; build-arg is the canonical Next.js way.
- **Run Playwright headed against dev stack**: doesn't get isolation; defeats the e2e DB infra we already have.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| First `make test-frontend` after a frontend change is slow (full `next build`). | Layer cache makes subsequent builds fast. The `--wait-timeout 240` accommodates the cold case. |
| frontend-e2e's `next build` fails — entire e2e run fails before tests start. | The script captures `compose logs` on bring-up failure and prints them; same as we already do for backend-e2e. |
| Tests that rely on the dev frontend (e.g. specifically targeting `localhost:3000`) break. | None do. `BASE_URL` is sourced from env in `playwright.config.ts`. Verified by audit. |
| CORS on production becomes "well, it works in tests" — a false sense of safety. | Production CORS posture is tracked separately; this change explicitly notes the dev-only `ALLOW_ALL_ORIGINS` in the proposal. |
