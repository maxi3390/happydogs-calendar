# Design: Isolated e2e database

## Decisions

### A separate compose file with its own project + network

The e2e stack lives in **`docker-compose.e2e.yml`**, not in `docker-compose.yml`. We invoke it with an explicit project name to keep it fully namespaced:

```bash
docker compose -p happy-calendar-e2e -f docker-compose.e2e.yml up -d --wait
docker compose -p happy-calendar-e2e -f docker-compose.e2e.yml down
```

Three benefits over a profile inside `docker-compose.yml`:

1. **`compose down` is safe.** With a separate compose project, `down` only sees the e2e services. There is no path by which an `e2e-down` could tear down the dev backend / db / traefik. Inside one project, `compose down --profile e2e` operates on the whole project — even with `--profile e2e`, dev services without profiles are still in scope. We learned this the expensive way in an earlier iteration.
2. **No coupling.** The dev stack and the e2e stack share zero Docker resources: separate project namespace (containers prefixed `happy-calendar-e2e-…` vs `happy-calendar-…`), separate network (`happy-calendar-e2e` vs `happy-calendar_proxy`), separate volumes (none vs `postgres_data`). A change to the dev compose file cannot subtly break the e2e bring-up.
3. **The e2e file is self-documenting.** Reading `docker-compose.e2e.yml` tells the whole story of what e2e needs. No grepping `docker-compose.yml` for `profile: e2e` to find the relevant bits.

The trade-off is that every direct `docker compose` invocation against the e2e file needs `-p happy-calendar-e2e -f docker-compose.e2e.yml`. The Makefile and orchestrator script handle that for the common cases; `make e2e-up` / `make e2e-down` is the recommended interface.

### `tmpfs` for the e2e DB, not a named volume

`db-e2e` mounts `/var/lib/postgresql` as a tmpfs (parent dir, matching postgres:18+'s major-version-subdirectory layout). Three benefits:

1. **Truly ephemeral.** Stopping the container deletes the data — no `down -v` required, no leftover volume to remember to clean. If the script's `trap` somehow misses the teardown, the next `up` still starts fresh.
2. **Faster.** Postgres against tmpfs runs noticeably quicker than an overlayfs volume; helpful given migrations + ~50 Playwright tests now run against a fresh DB every invocation.
3. **No name collisions with the dev `postgres_data` volume.** The dev volume is declared `external` and protected; we couldn't accidentally wipe it even if we tried, but defence-in-depth is cheap.

The trade-off is RAM usage during the run (~50–100 MB). Acceptable on any developer machine that already runs the rest of the stack.

### Same image, same env, different `POSTGRES_HOST`

`backend-e2e` is `build: ./backend` (same Dockerfile) with all the same env vars except `POSTGRES_HOST=db-e2e`. No code branches on "am I the e2e backend?" — the Django app is identical, only its database peer differs. This keeps the e2e backend behaviourally indistinguishable from the dev one, which is the whole point: tests exercise the real API, not a stripped-down test fixture.

`backend-e2e` does NOT register Traefik labels. It is reachable only inside the dedicated `happy-calendar-e2e` Docker network as `backend-e2e:8000`, which is exactly where the Playwright container is launched (`docker run --network=happy-calendar-e2e ...`). No host-ports are exposed; nothing leaks out, and the dev `backend` cannot resolve `backend-e2e` even if both stacks are running concurrently.

### `KEEP_E2E_DATA=1` toggles teardown, not setup

The script always brings the e2e stack up. The `trap cleanup EXIT` handler decides whether to tear it down:

```bash
trap cleanup EXIT

cleanup() {
  if [ "${KEEP_E2E_DATA:-}" = "1" ]; then
    echo "[e2e] KEEP_E2E_DATA=1: leaving stack up. Run 'make e2e-down' to clean up."
    return
  fi
  docker compose -p happy-calendar-e2e -f docker-compose.e2e.yml down --remove-orphans
}
```

The variable is opt-in: by default every run is hermetic. When set, the stack stays up so the operator can `docker compose exec backend-e2e python manage.py shell` and inspect what the failing test created. The hint at exit reminds them to clean up explicitly when they're done.

`make e2e-down` exists for the cleanup path; `make e2e-up` exists for the rare case where an operator wants to bring up just the e2e stack without running tests (e.g. to seed it manually and run a single Playwright spec by hand).

### Where the test runner gets its `NEXT_PUBLIC_API_URL`

The Playwright container is launched with `--network=happy-calendar-e2e` (the e2e network) and `-e NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api`. The helper `setupAuth` reads that env var when it builds the registration URL:

```ts
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const res = await page.request.post(`${apiBase}/auth/register/`, ...);
```

So the **server-side** `page.request.*` calls inside Playwright route to `backend-e2e`. The **browser-side** fetches inside the page itself still go through the frontend container, which uses whatever URL was baked at build time (typically `/api` relative). For the tests to keep working, those browser fetches must continue to be either:

1. Mocked via `page.route('**/api/...', ...)` — which is what the current suite does for everything that matters.
2. Or 404 silently from the frontend container's perspective without breaking the test — already the case for any path Next.js doesn't handle.

This means the change does NOT require updating any individual `*.spec.ts` file. The same tests run, the same way, against a different backend.

### Why not just clean up `e2e_*` users in a fixture?

A fixture-based approach (e.g. a global teardown hook that deletes all `e2e_*` users) would solve the pollution but not the cross-contamination concern. It also requires every test to register through the same naming scheme forever, which is brittle. An isolated DB is strictly stronger and is the standard pattern for tools like this.

## Alternatives considered

- **Keep one DB, add a global teardown.** Cheaper to land but doesn't address cross-contamination, and the teardown can race with concurrent dev work on the same DB.
- **Switch the dev backend's `POSTGRES_HOST` to a tmpfs DB during tests.** Would corrupt or wipe whatever the developer was working on the moment they ran `make test-frontend`. Hard veto.
- **Test mode endpoint that wipes the DB.** A `POST /api/_test/reset/` guarded by an env var. Adds a security risk (forget to disable in prod = catastrophic) and still doesn't isolate concurrent runs from each other.
- **Run Playwright against a separate frontend container with `NEXT_PUBLIC_API_URL` baked at build time.** Cleaner end-state but a much bigger change (build pipeline, image cache, two `docker run` flows). Worth doing later if the test suite drifts toward full integration coverage.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `trap` fires before `docker compose up` finishes, leaving an orphaned stack on Ctrl+C. | The trap runs `docker compose --profile e2e down --remove-orphans`, which cleans up partial bring-ups too. Verified by interrupting the script during `up`. |
| First run is slow because the backend image is cold-cached. | Same image as the dev backend, which is built once on `make build`. After the first build, bring-up is dominated by Postgres startup (~3s) + Django migrate (~5s). |
| `tmpfs` runs out of RAM on a heavily loaded dev box. | The DB is small (one nursery, a few hundred test rows). 100 MB ceiling has never been a problem in practice; if it ever is, fall back to a named volume scoped to this profile. |
| Operator runs `KEEP_E2E_DATA=1`, gets distracted, then runs `make up` and finds two backends competing for the dev frontend's API calls. | The dev frontend hits `backend:8000` (via Traefik), not `backend-e2e:8000`. They don't compete. The cleanup hint at exit reduces the chance of stale e2e containers lingering for days. |
