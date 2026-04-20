# Design: Tooling — Upgrade

## Technical Approach

The `make upgrade` target is a thin wrapper that composes four existing operations into a single reproducible flow: `git pull`, `$(MAKE) build`, `$(MAKE) up`, `$(MAKE) migrate`. Reusing existing Makefile targets keeps the upgrade recipe DRY — any evolution of the underlying commands (e.g., new build args) is picked up automatically.

## Architecture Decisions

### Decision: Reuse existing Makefile targets

The target calls `$(MAKE) build`, `$(MAKE) up`, and `$(MAKE) migrate` rather than inlining raw `docker compose ...` commands.

**Why:** DRY. The single source of truth for "how do we build" lives in the `build` target; upgrade just sequences it with the others. If we later add options to `build` (e.g., progress output, pull policy), upgrade inherits them.

**Tradeoffs:** Sub-make invocations are slightly noisier and marginally slower. Acceptable for an already-slow upgrade flow.

### Decision: `git pull` before anything else

The pull step comes first so that if there are no new changes, the build/up/migrate steps become no-ops against Docker's cache and Django's migration ledger.

**Why:** Fast-fail on network or merge issues before any Docker work is done. Also ensures the images we build reflect the latest code, not some older working-tree state.

**Tradeoffs:** If the operator wants to upgrade to a specific commit instead of upstream HEAD, this target is not for them — they should run the commands manually. This is acceptable for an operations-focused helper.

### Decision: Migrations run after `up`, not before

Migrations are applied via `docker compose exec backend python manage.py migrate`, which requires the backend container to be already running.

**Why:** The simplest option that works with the rest of the Makefile (`make migrate` has the same requirement). Using `docker compose run --rm backend ...` would work pre-up, but then we'd run migrations in a freshly-created throwaway container that doesn't share a network name with the DB, which can cause connection issues depending on Compose networking.

**Tradeoffs:** There is a short window where the new code is running against the old schema (until migrate completes). For forward-only migrations this is generally safe. For destructive migrations (column removal, data rewrites), operators should pause traffic manually.

### Decision: No automatic tests / health checks

The target does not run the test suite before upgrading nor health-check endpoints afterward.

**Why:** Keeps upgrade fast and predictable. Tests take time and may depend on fixtures not suitable for a live instance. Health checks belong in a separate `make health` or a monitoring stack.

**Tradeoffs:** Operators must decide separately when to run `make test` or probe their environment. A dedicated `make upgrade-safe` target that runs tests first could be added later if the team wants it.

## Data Flow

```
Operator: `make upgrade`
     │
     ▼
  git pull                                 ─── fails → exit
     │
     ▼
  make build  → docker compose build       ─── fails → exit
     │
     ▼
  make up     → docker compose up -d       ─── fails → exit
     │
     ▼
  make migrate → docker compose exec
                  backend python
                  manage.py migrate        ─── fails → exit
     │
     ▼
  "Upgrade complete"
```

## Key Files

| File | Purpose |
|------|---------|
| `Makefile` | Defines the `upgrade` target and lists it in `.PHONY` and `make help` |
| `AGENTS.md` (repo root) | Documents `make upgrade` in the Makefile commands table |
