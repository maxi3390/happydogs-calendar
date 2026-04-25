# Design — update-node-and-postgres

## Frontend (Node 22 → Node 24)

The frontend's only Node-version dependency surface is `next build` and `tsc --noEmit`. Both run cleanly under `node:24-alpine` against the existing `package-lock.json` (`npm ci` succeeds; `npm run build` produces the 12-route static output). One small lockfile drift is expected on the first install with npm 11 — it adds the new `peer: true` markers to a handful of dependency entries — but no version churn.

No code changes were needed.

## Database (Postgres 16 → Postgres 18)

PostgreSQL major version upgrades are **not seamless**: a v18 server cannot read v16 data files. The data volume holds binary catalogue files keyed to the running server's major version, so swapping the image without migrating the data leaves the new server unable to start (`FATAL: database files are incompatible with server`).

### Upgrade procedure for an existing deployment

```bash
# 1. With the old (v16) image still up, take a logical backup.
make backup
# Produces backups/nursery-<timestamp>.sql.gz, readable by any pg version.

# 2. Stop the stack.
make down

# 3. Destroy the data volume. (Backed up to disk in step 1.)
make destroy-db
#    Confirmation gate: type "yes" interactively, or set
#    RESTORE_I_UNDERSTAND=yes in the environment.

# 4. Pull / build the new images and start the stack.
make up
#    Re-creates the volume. Postgres 18 initialises a fresh data dir.

# 5. Restore the backup into v18.
make restore
#    Loads the v16 dump; SQL is portable across major versions.
```

`make upgrade` does **not** do this automatically — its happy path is "rebuild images and restart", which fails on the major version bump because step 4 sees a v18 server pointed at v16 data files. Operators on existing deployments must run the explicit five-step procedure above the first time they pull this change.

Future improvement (out of scope): a `make pg-major-upgrade` target that automates 1–5 with a confirmation gate, or a `pg_upgrade`-based path that doesn't require a dump/restore round-trip. Either is its own change.

### Why not `pg_upgrade`?

`pg_upgrade` (in-place) is faster than dump/restore for large databases and avoids loss of WAL state, but:

- It requires both old and new server binaries available at the same time. The alpine images don't bundle two majors.
- The schema is small (low tens of tables, no large object archive). Dump/restore takes seconds, not minutes.
- The dump/restore path is already covered by existing `make backup` / `make restore` semantics; `pg_upgrade` would need new tooling.

For this project's data-volume scale, dump/restore is the right primitive.

## Docs container held back at Node 20

Updating `docs/Dockerfile` to `node:24-alpine` triggers a chain of failures rooted in npm 11's stricter dependency validation:

1. `npm ci` against the existing `docs/package-lock.json` fails with `Missing: fsevents@2.3.3 from lock file` — npm 11 enforces optional-dep coverage that npm 10 silently allowed. Fixable by regenerating the lockfile.
2. After regenerating, `npm install` resolves `@docusaurus/theme-mermaid` to `3.10.0` while `@docusaurus/core` stays at `3.9.2`. Docusaurus's own version-coherence check rejects the build.
3. Pinning every `@docusaurus/*` package to the same `3.10.0` version unblocks (2) but exposes a third issue: Docusaurus 3.9.x and 3.10.x both pass `name`/`color`/`reporters` keys to webpack's `ProgressPlugin`, which the version of webpack now resolved (via Docusaurus's transitive deps) treats as an unknown-options ValidationError.

Each individual fix is small; the combined fix is "bump Docusaurus to a version that ships with a webpack-5-compatible ProgressPlugin call" — i.e. a Docusaurus dependency upgrade. That's a separate, owner-driven change. This image-pin refresh keeps the docs container on `node:20` and notes the constraint in `AGENTS.md` so the next person bumping it also bumps Docusaurus.

## Verification

- `docker run --rm -v <frontend>:/app -w /app node:24-alpine sh -c './node_modules/.bin/tsc --noEmit'` — clean.
- `docker run --rm -v <frontend>:/app -w /app node:24-alpine sh -c 'npm run build'` — passes (12 static routes).
- `docker compose pull db && docker compose up -d db` — postgres 18-alpine boots on a fresh volume; health check returns ready.
- Existing deployments: confirm the upgrade procedure above against a copy of production-like data.
