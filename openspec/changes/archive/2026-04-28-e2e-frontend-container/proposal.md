# Dedicated frontend-e2e container so browser-side fetches reach the e2e backend

## Why

`docker-compose.e2e.yml` brings up an isolated `db-e2e` + `backend-e2e` pair, but it doesn't bring up a frontend. Playwright tests today load the page from the dev `frontend` container (built with `NEXT_PUBLIC_API_URL=` empty → relative `/api`). Two consequences:

1. **Browser-side fetches inside the page can't reach the e2e backend.** They hit `http://frontend:3000/api/…`, where Next.js has no `/api` handler → 404. Every Playwright test that exercises browser-driven UI must `page.route(...)` to intercept and stub the response. Spec files end up half mocking-library, half integration test.
2. **The e2e backend stays mostly idle on the network side.** Server-side `page.request.*` calls (registration, owner creation) reach `backend-e2e`, but the real authoritative path — the page's own data fetches — never does.

Phase 1 just landed live-translation fetching in `mockI18nEndpoints` so test mocks stay in sync with `backend/translations/{en,es}.json`. That works, but we keep accumulating mock surface every time a new component reads a new endpoint. The next escalation is to remove the need for the workaround entirely: build a frontend image that points at `backend-e2e:8000`, so browser-side fetches go straight through.

## What

1. **`frontend/Dockerfile`** gains an `ARG NEXT_PUBLIC_API_URL` in the builder stage. The dev image keeps building with the empty default; the e2e image overrides at build-time to bake `http://backend-e2e:8000/api` into the bundle.
2. **`docker-compose.e2e.yml`** gains a third service `frontend-e2e`, `build`-ing the same context with the e2e build-arg, joined to the existing `e2e` network. No Traefik labels, no host ports — only reachable as `frontend-e2e:3000` inside the `happy-calendar-e2e` network.
3. **`scripts/run-e2e-tests.sh`** brings up `frontend-e2e` alongside `db-e2e`/`backend-e2e` and points Playwright at `BASE_URL=http://frontend-e2e:3000`. The dev `frontend` container is no longer involved in test runs.
4. **No test code changes.** Existing tests keep their `page.route` mocks; they continue to work because `page.route` matches by URL pattern, not by origin. The new infrastructure simply unblocks future tests from needing the mocks.
5. **Live spec updated** at `openspec/specs/tooling/e2e-isolation/spec.md` to document the new `frontend-e2e` service and the `BASE_URL` flow.

## Impact

- **Test runs become genuinely end-to-end.** A test can drop its `page.route` blocks and still exercise the real Django API; new tests don't have to pre-stub every endpoint.
- **First-run cost goes up.** Building `frontend-e2e` adds a one-time `next build` (~30–45s) on the first `make test-frontend` after a frontend code change. Cached builds are fast (a few seconds for layer reuse). Acceptable trade.
- **CORS path is exercised.** Browser-side fetches from `frontend-e2e:3000` to `backend-e2e:8000` are cross-origin; Django already has `CORS_ALLOW_ALL_ORIGINS=True` in dev, so no change. (Production CORS hardening is a separate concern tracked outside this change.)
- **Dev frontend behaviour unchanged.** Building `frontend` (the dev service) with no `--build-arg` keeps the empty default and the relative `/api` URLs that proxy through Traefik.

## Out of scope

- **Removing existing `page.route` mocks from current specs.** They keep working. Doing the migration is a per-test exercise that can land incrementally; this change just unblocks it.
- **Reusing `frontend-e2e` for the security suite.** `make security` already runs in a different mode; bringing it under the e2e umbrella is a follow-up.
- **Runtime-injected `NEXT_PUBLIC_API_URL`** (via a custom server or `runtimeConfig`). That's a Next.js architectural change far bigger than what this needs; build-arg is the right tool.
- **CI parallelism.** Running multiple isolated e2e stacks in parallel still requires per-worker DB/backend/frontend triplets; out of scope until the test count justifies it.
