# Design: `make upgrade` Action

## Technical Approach

A new Makefile target, `upgrade`, chains four operations in the correct order for updating a running stack:

```makefile
upgrade:
	@echo "=== Upgrading Happy Pet Nursery ==="
	@echo "[1/4] Pulling latest code..."
	git pull
	@echo "[2/4] Rebuilding images..."
	$(MAKE) build
	@echo "[3/4] Restarting services..."
	$(MAKE) up
	@echo "[4/4] Running migrations..."
	$(MAKE) migrate
	@echo "=== Upgrade complete ==="
```

The target is added to `.PHONY` and listed under a new "Maintenance" section of `make help`.

## Architecture Decisions

### Decision: Reuse existing targets instead of duplicating commands

`make upgrade` calls `$(MAKE) build`, `$(MAKE) up`, and `$(MAKE) migrate` rather than inlining `docker compose build` etc. This keeps the Makefile DRY — if the underlying commands evolve (e.g., adding build args), only the canonical target needs updating.

**Tradeoffs:** Spawning sub-`make` invocations adds a small amount of overhead and makes the output slightly noisier (each sub-make prints its own recipe echo). Acceptable for an upgrade flow that's expected to be slow anyway (image builds dominate the wall time).

### Decision: `docker compose up -d` (not `up -d --build`)

The build step is separated from the up step so that build failures don't partially stop running services. If the build succeeds, `up -d` only recreates containers whose image hash changed.

**Tradeoffs:** This is two commands instead of one, but it isolates failure modes. `up -d --build` would rebuild and restart in one step but the error signal is less clear.

### Decision: `git pull` uses the current branch's upstream

No `git fetch` + conflict check — `git pull` is a simple "update from upstream". If the local branch has uncommitted changes or would conflict, `git pull` fails loudly and `make` stops, which is the desired behavior (the operator must resolve before upgrading).

**Tradeoffs:** An operator on a feature branch with an unrelated upstream will pull from that branch, which may not be what they want. Acceptable: the target is intended for a "clean" operations flow (usually on `master`). If someone wants to upgrade from a different branch, they can `git checkout master && make upgrade`.

### Decision: Migrations run after `up`, not before

The backend container must be running before `docker compose exec backend` works. Order: `build` (prepare images) → `up` (start containers with new images) → `migrate` (connect to running backend).

**Tradeoffs:** If a migration fails, the services are already running with the new code but an old schema. For simple forward-only migrations (the common case), this window is harmless because Django's ORM tolerates missing columns on a short timeframe during deploy. For destructive migrations, operators should stop traffic separately (not automated here). If we need a safer flow later, we can switch to `docker compose run --rm backend python manage.py migrate` before `up`.

### Decision: No automatic tests / health check

The target does not run the test suite or a health check after upgrade. Those are separate concerns (operators can run `make test` before upgrade and `make status` or hit an endpoint after). Keeping upgrade focused makes it predictable and fast.

## Data Flow

```
Operator runs `make upgrade`
     │
     ▼
 git pull                                (from upstream)
     │
     ▼
 docker compose build                    (uses Docker layer cache)
     │
     ▼
 docker compose up -d                    (recreates changed containers)
     │
     ▼
 docker compose exec backend             (runs inside the now-up backend)
   python manage.py migrate
     │
     ▼
 "Upgrade complete" message
```

## Key Files

| File | Change |
|------|--------|
| `Makefile` | Add `upgrade` target to `.PHONY`, add implementation, add entry to `make help` under a new "Maintenance" section |
| `CONTEXT.md` (root) | Add `make upgrade` row to the Makefile commands table under "Docker Management" |
| `openspec/specs/tooling/upgrade/spec.md` (NEW) | New capability spec documenting the upgrade behavior |
| `openspec/specs/tooling/upgrade/design.md` (NEW) | Design rationale (mirrors this file) |
