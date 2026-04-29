# Tasks

## Setup
- [x] Create branch `feat/e2e-frontend-container`
- [x] Scaffold OpenSpec change folder

## Compose / Dockerfile
- [x] Add `ARG NEXT_PUBLIC_API_URL` to `frontend/Dockerfile` builder stage
- [x] Add `frontend-e2e` service to `docker-compose.e2e.yml` (build-arg, e2e network, no Traefik, healthcheck)
- [x] Healthcheck targets `127.0.0.1` (not `localhost`) — busybox wget tries IPv6 first and Next standalone only binds IPv4

## Orchestrator
- [x] Update `scripts/run-e2e-tests.sh`: bring up frontend-e2e alongside db/backend, `--wait-timeout 240`, BASE_URL to `frontend-e2e:3000`

## Makefile
- [x] `e2e-up` brings up all three services with the bumped wait-timeout
- [x] `e2e-down` removes all three (compose-down on the e2e project)

## Live spec / docs
- [x] Update `openspec/specs/tooling/e2e-isolation/spec.md` — frontend-e2e service, BASE_URL, browser-side fetch scenario
- [x] Update `AGENTS.md` (services table) and `frontend/AGENTS.md` (test isolation invariants)

## Verification
- [x] `make e2e-up` brings up all three healthy
- [x] cross-check: `wget` against `frontend-e2e:3000` returns the Next.js app shell; `wget` against `backend-e2e:8000/api/translations/en/` returns the live English translations
- [x] `make test-frontend` runs end-to-end: 127/127 passing in ~53s
- [x] First-time `next build` cost is ~30s on cold cache, ~5s on warm

## Commit
- [x] Single commit on the feat branch
- [x] Merged into master (operator approval received post-review)
