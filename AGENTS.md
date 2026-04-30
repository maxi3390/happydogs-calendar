# Happy Pet Nursery — Repository-level Agent Guidelines

This file is the canonical entry point for coding agents working on this repo. It covers repo-wide conventions, points to the subproject-level guides, and summarises quick-reference information that would otherwise require reading multiple docs.

- **Backend** work → see `backend/AGENTS.md`
- **Frontend** work → see `frontend/AGENTS.md`
- **Deep docs** (architecture, API, deployment) → see `docs/docs/` (Docusaurus site)
- **Behavioural specs** (source of truth) → see `openspec/specs/`

---

## Project at a glance

Calendar-based schedule management system for pet nurseries. Staff register owners and pets, create time-slotted schedules, and the system automatically detects behavioural conflicts between incompatible pets before (and after) booking. Conflicts are **non-blocking warnings** — schedules are always created; the response includes warnings.

### Repository layout

```
happy-calendar/
├── backend/          # Django 5.1 REST API (Python 3.12)
├── frontend/         # Next.js 16 / React 19 app (TypeScript)
├── docs/             # Docusaurus documentation site
├── openspec/         # OpenSpec specs and change proposals
├── docker-compose.yml
├── Makefile          # Developer convenience targets
└── README.md
```

---

## Tech stack

| Layer      | Technology                                                              |
|------------|-------------------------------------------------------------------------|
| Frontend   | Next.js 16, React 19, TypeScript, TailwindCSS 3, Lucide React, date-fns |
| Backend    | Django 5.1, Django REST Framework 3.15, djangorestframework-simplejwt   |
| Database   | PostgreSQL 18                                                           |
| Auth       | JWT (access 60 min / refresh 7 days, refresh rotation + blacklist)      |
| API Docs   | drf-spectacular (OpenAPI 3.0, Swagger UI, ReDoc)                        |
| Testing    | Playwright (frontend E2E), Django test runner + coverage (backend)      |
| Containers | Docker, Docker Compose with Traefik reverse proxy                       |

---

## Docker services

| Service    | Image / Build      | Port  | Profile    | Notes                                               |
|------------|--------------------|-------|------------|-----------------------------------------------------|
| `db`       | postgres:18-alpine | 5432  | (default)  | DB/user/password all `nursery`. Volume `postgres_data`. |
| `backend`  | `./backend`        | 8000  | (default)  | Runs `migrate` then `runserver` on start.           |
| `frontend` | `./frontend`       | 3000  | (default)  | Next.js standalone build.                           |
| `garage`   | dxflrs/garage:v1.0.1 | 3900 | `s3`       | Single-node S3-compatible object storage. Optional; only with `--profile s3`. Bootstrap with `make s3-init`. |
| `docs`     | `./docs`           | 3001  | `docs`     | Docusaurus site. Only with `--profile docs`.        |
| `pgadmin`  | dpage/pgadmin4     | 5050  | `dev`      | Only with `--profile dev`.                          |

Backend mounts `./backend:/app` as a volume so file edits hot-reload.

### E2E test stack (separate compose file)

Frontend Playwright tests run against an isolated, ephemeral stack defined in `docker-compose.e2e.yml`. It lives in its own compose project (`happy-calendar-e2e`) and on its own bridge network (also `happy-calendar-e2e`), so it never touches the dev stack. See `openspec/specs/tooling/e2e-isolation/spec.md`.

| Service        | Image / Build      | Notes                                                                                  |
|----------------|--------------------|----------------------------------------------------------------------------------------|
| `db-e2e`       | postgres:18-alpine | `tmpfs` data dir. Wiped unconditionally on container stop.                             |
| `backend-e2e`  | `./backend`        | Same image as `backend`, talks to `db-e2e`. Reachable only as `backend-e2e:8000` on the e2e network. |
| `frontend-e2e` | `./frontend`       | Same source as `frontend`, **built with `NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api`** so browser-side fetches go to the e2e backend (no `page.route` mocks needed). Reachable as `frontend-e2e:3000`. |

Brought up by `make test-frontend` (via `scripts/run-e2e-tests.sh`); torn down on exit unless `KEEP_E2E_DATA=1` is set.

---

## Tool execution policy

Every tool that interacts with the project's tech stack — Python, pip, Django, Node, npm, npx, Next.js, Playwright, psql, etc. — SHALL be run **inside a Docker container**, never on the host. This applies to coding agents and humans alike. The host is treated as a thin shell whose only purpose is invoking Docker; build / test / lint / one-off scripts all execute in containers.

Two reasons make this non-negotiable:

1. **Reproducibility.** A test that passes on your laptop must pass on a colleague's laptop and on CI. The compose file pins specific image versions; the host doesn't.
2. **Environment drift.** macOS Pythons, system Nodes, and locally-installed npm packages routinely shadow the project's pinned versions and produce subtly different output. Running everything in containers eliminates this class of bug at the root.

### Version pinning — match the compose / Dockerfile

When you need to spin up a one-off container (typically `docker run --rm ... <image> sh -c '...'`), the image and tag SHALL match what the project already uses. The current pins are:

| Layer       | Image                                     | Source                                |
|-------------|-------------------------------------------|---------------------------------------|
| Backend     | `python:3.12-slim`                        | `backend/Dockerfile`                  |
| Frontend    | `node:24-alpine`                          | `frontend/Dockerfile`                 |
| Docs        | `node:24-alpine`                          | `docs/Dockerfile`                     |
| Database    | `postgres:18-alpine`                      | `docker-compose.yml` (`db` service)   |
| Reverse proxy | `traefik:v3.6`                          | `docker-compose.yml` (`traefik`)      |
| Playwright  | `mcr.microsoft.com/playwright:v1.58.2-noble` | `Makefile` (`PLAYWRIGHT_IMAGE`)    |

Always cross-check the source before running an ad-hoc container; the pins above are a snapshot, not a contract. When the source changes, follow the source.

### How to run things — preferred order

1. **Use a Makefile target if one exists.** `make test-backend`, `make test-frontend`, `make lint`, `make migrate`, `make seed-example-data`, etc. all already wrap the right `docker compose exec` / `docker run` invocation with the right version. Read `make help` first; `grep <verb> Makefile` second.
2. **`docker compose exec <service> <command>`** for anything against a long-running service. The backend, frontend, db, and traefik services are already up after `make up` — exec into them rather than starting a new container. Examples:
   - Backend: `docker compose exec backend python manage.py test pets.tests.test_vet_api`
   - Database: `docker compose exec db psql -U nursery -d nursery`
3. **`docker run --rm -v $(PWD)/<dir>:/app -w /app <image> sh -c '<command>'`** for one-off tooling that doesn't have a long-running service (e.g. `tsc --noEmit`, `next build` against a clean tree, ad-hoc Python scripts). Use the matching image and tag from the table above.

### What NOT to do

- Do **not** run `python`, `pip`, `pytest`, `flake8`, `node`, `npm`, `npx`, `next`, `tsc`, `playwright`, `psql`, etc. directly on the host shell.
- Do **not** install language toolchains on the host to "make agents go faster". The container is the source of truth.
- Do **not** change versions in a one-off `docker run` to work around a tooling bug; fix the bug at the source (Dockerfile / compose / Makefile) so every contributor benefits.

### Permitted host commands

A small set of commands are inherently host-side and remain on the host: `git`, `make`, `docker` itself, and read-only file inspection (`ls`, `cat`, `grep`, `find`, etc.). Anything that compiles, executes user code, hits the network on behalf of the project, or reads a project secret runs in a container.

---

## Code style — comments and names

Two rules govern in-source prose so the codebase reads quickly without sacrificing context where it matters.

### 1. Comments scale with complexity

Default to **no comment**. Add one only when the code itself can't tell the next reader what they need to know. Specifically:

- **Trivial code → no comment.** If a function name, variable name, or signature already says it, don't repeat it.
- **Complex / non-obvious code → a longer comment.** If a choice involves a tradeoff, fixes a non-trivial bug, encodes domain knowledge, or relies on an external invariant (browser quirk, Django ORM behaviour, etc.), explain *why* — not *what*.

Long-form rationale (multi-paragraph history, alternatives considered, etc.) lives in the OpenSpec change folder under `openspec/changes/<slug>/design.md`, not in the source. Source comments link back when needed but stay tight.

#### Examples

Don't:

```ts
// Increment the counter
counter++;

// Default to 0 in the component signature so existing call-sites that
// don't pass the prop keep working.
refreshTrigger = 0,
```

Do:

```ts
counter++;

// Optional so PublicCalendar can omit it.
refreshTrigger = 0,
```

Don't:

```ts
// Counter from the parent page that increments on every schedule
// mutation (create / edit / delete). Including it in the fetch
// effect's dep array re-runs the fetch and refreshes the bars
// without forcing the user to navigate between months. Optional
// so `PublicCalendar` (and any future read-only consumer) can
// omit it and keep the fetch driven only by period changes.
refreshTrigger?: number;
```

Do:

```ts
/** Bumps when the parent records a schedule mutation; re-runs the fetch. */
refreshTrigger?: number;
```

Do (complex bug fix earns the breadth):

```ts
// `dayHiddenCounts` counts segments per day that landed at
// row >= MAX_VISIBLE_BARS. Used directly by the "+N more"
// indicator: deriving it as `dayBarCounts - MAX` is wrong when
// overlap on other days pushes a single-day-only segment to a
// high row (it can go negative).
```

### 2. Names are short and self-explanatory

- Prefer names that read as their meaning at the call-site, not as their full lifecycle.
- Cut redundant prefixes when the surrounding context already names them: `showAll` inside the calendar component beats `showAllSchedules`; `t` for translations beats `translate`.
- A name that's slightly longer is fine when it disambiguates two similar things in the same scope. Don't shorten when shortening creates collisions or ambiguity.
- Stick with the team's existing names when refactoring nearby code. Renaming for the sake of brevity churns diffs without helping the reader.

#### Examples

Don't:

```ts
const handleToggleShowAllSchedulesPreference = () => { ... };
const cellLayoutRowsForCol = (colIdx: number) => { ... };
const visibleCalendarSegmentsForGroupMode = ...;
```

Do:

```ts
const toggleShowAll = () => { ... };
const rowsForCol = (colIdx: number) => { ... };
const visibleSegments = ...;
```

### Pre-existing comments and names

Don't churn nearby code just to apply this rule. Touch what your change touches and leave the rest. The rule applies to NEW prose / NEW names introduced by your change.

---

## Environment variables

### Backend / Database (dev defaults in `docker-compose.yml`, overridable via `.env`)

Each variable has a dev default baked into `docker-compose.yml`'s `${VAR:-default}` interpolation, so a fresh checkout boots with no `.env`. Production deployments override the same names from `.env`.

| Variable            | Default (docker)                      | Production override            |
|---------------------|---------------------------------------|--------------------------------|
| `DJANGO_SECRET_KEY` | `dev-secret-key-change-in-production` | **Required** (committed default is public; would let attackers forge sessions / signed URLs) |
| `DEBUG`             | `True`                                | **Required** — set `False`. Leaves stack traces and settings in error pages otherwise. |
| `POSTGRES_PASSWORD` | `nursery`                             | **Required** — committed default is public.   |
| `POSTGRES_DB`       | `nursery`                             | Optional — pick any name.                     |
| `POSTGRES_USER`     | `nursery`                             | Optional — pick any name.                     |
| `POSTGRES_HOST`     | `db`                                  | Override only when pointing at an external Postgres (managed RDS, etc.). |
| `POSTGRES_PORT`     | `5432`                                | Optional.                                     |

### Frontend

| Variable              | Default                        |
|-----------------------|--------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api`    |

---

## Access URLs (local development)

| URL                              | Description                        |
|----------------------------------|------------------------------------|
| http://localhost:3000            | Frontend application               |
| http://localhost:8000/api/       | REST API root                      |
| http://localhost:8000/admin/     | Django admin panel                 |
| http://localhost:8000/api/docs/  | Swagger UI                         |
| http://localhost:8000/api/redoc/ | ReDoc                              |
| http://localhost:8000/api/schema/| OpenAPI 3.0 schema (YAML)          |
| http://localhost:3001            | Docusaurus docs (`--profile docs`) |
| http://localhost:5050            | pgAdmin (`--profile dev`)          |

---

## Makefile — essential commands

Run `make help` inside the repo for the full catalogue. Most-used targets:

| Command                 | What it does                                                              |
|-------------------------|---------------------------------------------------------------------------|
| `make env`              | Create `.env` interactively from `.env.example` (idempotent; never overwrites) |
| `make init`             | First-time setup: `env-check` → `volume-ensure` → `build` → `up` → `migrate` → `create-admin` |
| `make up` / `make down` | Start / stop all services                                                 |
| `make migrate`          | Run pending Django migrations                                             |
| `make test`             | Run all tests (`test-backend` + `test-frontend`)                          |
| `make test-backend`     | Backend tests (SQLite in-memory)                                          |
| `make test-frontend`    | Playwright E2E tests against an isolated, ephemeral Postgres + Django pair (`db-e2e` + `backend-e2e`). The dev DB is never touched. Set `KEEP_E2E_DATA=1` to skip teardown and inspect the e2e stack. Spec: `openspec/specs/tooling/e2e-isolation/spec.md`. |
| `make e2e-up` / `make e2e-down` | Manually drive the isolated e2e stack (rarely needed; `make test-frontend` handles the lifecycle automatically). |
| `make lint`             | `flake8` on backend, `next lint` on frontend                              |
| `make security`         | OWASP-Top-10 suite (bandit + pip-audit + npm audit + `check --deploy` + custom Django tests). Per-run report at `security-reports/<timestamp>/REPORT.md`; `security-reports/latest/REPORT.md` always points at the most recent. Exits non-zero on any `critical` finding. Override retention via `SECURITY_REPORT_KEEP` (default 10). |
| `make backup`           | Full gzipped `pg_dump` → `backups/nursery-<timestamp>.sql.gz`             |
| `make restore`          | Restore the DB from the latest backup (or `BACKUP_FILE=path make restore`) — destructive; requires explicit confirmation |
| `make destroy-db`       | Irreversibly remove the `happy-calendar_postgres_data` volume — destructive; requires explicit confirmation |
| `make clean`            | Stop and remove containers; the database volume is preserved              |
| `make upgrade`          | `backup` → `git pull` → `build` → `up` → `migrate` (use `SKIP_BACKUP=1` to skip step 1, `SKIP_PULL=1` to skip step 2) |
| `make seed-example-data` | Populate the DB with a deterministic demo dataset (idempotent). Pass `SEED_ARGS="--reset"` to wipe the seeded rows first, or `SEED_ARGS=--allow-production` to bypass the `DEBUG=False` guard on staging/demo stacks. |

---

## Environment variables

The stack expects a `.env` file at the repository root with the variables below. **Without `.env`, Docker Compose expands `${DOMAIN}` and friends to the empty string, Traefik's `Host(${DOMAIN})` rules match nothing, and the entire stack returns 404 on `http://localhost/` while looking healthy in `docker compose ps`.**

Generate `.env` once with `make env` (interactive, safe to re-run, never overwrites an existing file). `make init` calls `make env` automatically when `.env` is missing; `make upgrade` prints a warning but proceeds.

| Variable              | Required for local dev? | Notes                                                                 |
|-----------------------|--------------------------|-----------------------------------------------------------------------|
| `DOMAIN`              | Yes (`localhost`)        | Host in Traefik routing rules. Use your public hostname in production. |
| `NEXT_PUBLIC_API_URL` | Yes                      | URL the browser-side Next.js uses to reach the API (e.g. `http://localhost:8000/api`). |
| `DOCKER_SOCKET`       | Yes (`/var/run/docker.sock`) | Path Traefik mounts to discover services. Change only on non-standard docker installs. |
| `CF_DNS_API_TOKEN`    | No                       | Production-only. Cloudflare API token for Let's Encrypt DNS-01 challenge. Blank for local dev. |
| `ACME_EMAIL`          | No                       | Production-only. Email for Let's Encrypt certificate notifications. Blank for local dev. |
| `DJANGO_SECRET_KEY`<br>`POSTGRES_PASSWORD`<br>`DEBUG` | No (dev defaults work) | **Required for production** — see the "Backend / Database" table above. Dev defaults in `docker-compose.yml` boot a fresh checkout without `.env`; production MUST override these three. |
| `POSTGRES_DB`<br>`POSTGRES_USER`<br>`POSTGRES_HOST`<br>`POSTGRES_PORT` | No (dev defaults work) | Optional in production. Override `POSTGRES_HOST` only when pointing at an external Postgres; the others are cosmetic / network-internal. |
| `S3_ENDPOINT_URL`<br>`S3_ACCESS_KEY_ID`<br>`S3_SECRET_ACCESS_KEY`<br>`S3_BUCKET_NAME` | No (all four together) | Opt in to S3-compatible file storage. All four must be set + non-empty for the backend to switch off filesystem mode. Half-applied → falls back to filesystem with a warning. See the "File storage" section below for the full contract. |
| `GARAGE_RPC_SECRET`<br>`GARAGE_ADMIN_TOKEN`<br>`GARAGE_METRICS_TOKEN` | No (committed dev defaults work for development) | Internal secrets for the bundled Garage instance. Dev defaults are baked into `docker-compose.yml`, so `--profile s3 up -d` works on a fresh checkout without manual secret generation. **Production deployments MUST override these in `.env`** — the committed defaults are public. Generate with `openssl rand -hex 32`. Ignored when pointing at an external S3 service. |

Full per-variable guidance lives as comments in `.env.example` itself; `make env` reads those comments and shows them at each prompt. The invariants are tracked in `openspec/specs/tooling/env-bootstrap/`.

---

## Database backup and restore

`make backup` produces a full gzipped `pg_dump` (plain SQL, compressed) named `backups/nursery-<YYYY-MM-DD-HHMMSS>.sql.gz`. The script starts the `db` container if it's not running, waits for `pg_isready`, and writes the dump. Backup files are git-ignored; the `backups/` directory is tracked via a `.gitkeep`.

`make restore` restores from the most recent backup under `backups/`, or from an explicit path when the operator passes `BACKUP_FILE=path/to/file.sql.gz`. Because the restore drops and recreates the database (`DROP DATABASE ... WITH (FORCE)` then loads the gzipped SQL), it **refuses to proceed without explicit confirmation**: interactive runs require `yes` typed at the prompt, non-interactive runs require `RESTORE_I_UNDERSTAND=yes` as an environment variable.

`make upgrade` runs `make backup` as its first of five steps. If the backup fails, the upgrade halts before any mutation. Use `SKIP_BACKUP=1 make upgrade` only when a pre-upgrade backup was taken out-of-band and the step would be redundant. The `git pull` (step 2) can likewise be skipped with `SKIP_PULL=1` when the operator has already pulled the latest code by hand or is rebuilding deliberately against the current local tree.

The invariants are tracked in `openspec/specs/tooling/backup/` and (for the `make upgrade` integration) in `openspec/specs/tooling/upgrade/`.

---

## File storage (filesystem vs S3-compatible)

Uploaded files (pet / owner profile pictures, the system logo, pet documents) live in one of two places, chosen at backend-startup time from environment variables:

- **Filesystem** (default). Files are written under `MEDIA_ROOT = backend/media/` and served by Django/Traefik on `/media`. Works out of the box with no env config — the historical behaviour. Best for single-host deployments that don't need horizontal scaling.
- **S3-compatible**. When all four of `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` are set + non-empty, the backend writes uploads to that bucket via `django-storages[s3]`. Works with any S3-compatible service (the bundled Garage instance under the `s3` Compose profile, MinIO, AWS S3, Backblaze B2, …).

A half-applied env update (e.g. `S3_ENDPOINT_URL` set but credentials missing) **falls back to filesystem with a startup warning** rather than crashing — operators see a clear log line naming the missing vars instead of a boot loop.

### Self-hosted: bring up the bundled Garage

The repo ships a single-node [Garage](https://garagehq.deuxfleurs.fr/) instance under the `s3` Compose profile. Operators who want self-hosted object storage in one machine:

1. Pick an `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` and set them in `.env`. (The `GARAGE_*` internal secrets have committed dev defaults, so dev environments don't need to set them; production deployments **must** override them per the comments in `.env.example`.)
2. Bring up Garage: `docker compose --profile s3 up -d`.
3. Bootstrap bucket + key: `make s3-init` (idempotent; safe to re-run).
4. Restart the backend so it picks up the new env: `make restart`.

`make s3-init` creates the bucket if missing, imports the access key, and grants R/W on the bucket. Re-running on an already-bootstrapped Garage is a no-op.

### External S3 service

To point at AWS S3 / MinIO / Backblaze instead of the bundled Garage:

- Skip `docker compose --profile s3 up -d` and the `GARAGE_*` vars.
- Set `S3_ENDPOINT_URL` and `S3_PUBLIC_ENDPOINT_URL` to the external host.
- For AWS specifically: set `S3_REGION_NAME` to a real region (e.g. `us-east-1`) and `S3_ADDRESSING_STYLE=virtual`.

### Switching modes

Toggling between filesystem and S3 is a `.env` edit + `make restart` away — no migration, no rebuild. **Existing files do not auto-migrate**: when an operator switches to S3, files already on disk stay on disk and their old `.url` paths stop resolving once the FS mount is removed. Migrating is a one-shot operator task (e.g. `aws s3 cp --recursive` or `rclone sync`); the project deliberately doesn't bundle that into `make upgrade`. See the proposal's "Out of scope" section for the rationale.

The full contract lives in `openspec/specs/backend/file-storage/spec.md` and the Garage / Compose lifecycle in `openspec/specs/tooling/object-storage/spec.md`.

---

## Database persistence

The PostgreSQL data lives in an **external** Docker volume (`happy-calendar_postgres_data`), declared with `external: true` in `docker-compose.yml`. External volumes are outside the compose project's lifecycle, so `docker compose down -v` cannot remove them. This is the primary durability guarantee.

Three layers of defence for the database:

1. **External volume** — survives every routine container operation (`up`, `down`, `restart`, `rebuild`, `build`, `stop`, `clean`, `upgrade`).
2. **`make backup`** snapshots — a pre-upgrade snapshot is taken automatically by `make upgrade` (step 1 of 5); operators can run `make backup` ad hoc at any time.
3. **`make destroy-db`** is the **only** Makefile path that removes the volume. It matches the `make restore` confirmation contract: interactive runs require typing `yes`; non-interactive runs require `RESTORE_I_UNDERSTAND=yes`.

`make up`, `make init`, `make upgrade`, `make backup`, and `make restore` all depend on a private `volume-ensure` prerequisite that runs `docker volume create happy-calendar_postgres_data` (idempotent — a no-op when the volume already exists). A fresh clone therefore needs no manual setup: `make init` creates the volume transparently.

`make clean` used to run `docker compose down -v --remove-orphans`, which wiped everything. It now runs `docker compose down --remove-orphans` and leaves data alone.

The invariants are tracked in `openspec/specs/tooling/database-persistence/`.

---

## Core business logic: pet compatibility

The 5 compatibility rules implemented in `backend/domain/pets/models.py` via `Pet.is_compatible_with(other) → (bool, list[str])`:

1. **Aggressive** — either pet with `temperament='aggressive'` → incompatible with any other pet
2. **High dominance** — both pets have `dominance_level > 7` → incompatible
3. **Size + dominance** — size difference ≥ 2 levels AND dominance difference ≥ 5 → incompatible
4. **Cross-species temperament** — different species with `(aggressive, anxious)` or `(aggressive, calm)` pairs → incompatible
5. **Anxious + playful** — one anxious, one playful, dominance difference > 4 → incompatible

All triggered rules are reported in the `reasons` list, not just the first one.

---

## Git workflow (applies to every change)

**Always create a feature branch.** Never commit directly to `master`.

```bash
git checkout master && git pull
git checkout -b <type>/<slug>    # feat, fix, refactor, test, docs
# ... work, commit, verify ...
# Do NOT push or merge — leave that to the user
```

Branch types: `feat/` · `fix/` · `refactor/` · `test/` · `docs/`

### Commit message rules

- Use Conventional Commits: `type(scope): subject` on the first line.
- Subject under ~72 characters, imperative mood ("add", "fix", "rename").
- Body explains *why* (rationale, tradeoffs), not *what* (the diff shows that).
- **Do NOT add tool attribution or co-author trailers.** No `Generated with ...`, no `Co-Authored-By: <tool>`, no signature lines. Commits should read as if written by a human engineer on the team.

See `backend/AGENTS.md` and `frontend/AGENTS.md` for the full per-subproject workflow (verification commands, conventions).

---

## OpenSpec workflow

Every non-trivial change should have an OpenSpec change folder:

```
openspec/changes/<change-slug>/
├── proposal.md        # intent, scope (in/out), approach
├── design.md          # technical decisions with tradeoffs
├── tasks.md           # checklist of work items
└── specs/<capability>/<feature>/spec.md  # delta (ADDED / MODIFIED / REMOVED)
```

When the change is merged, move the folder to `openspec/changes/archive/YYYY-MM-DD-<slug>/` and any delta `spec.md` content merges into the live spec under `openspec/specs/<capability>/<feature>/spec.md`.

The integration itself uses a merge commit — see "Merging spec changes" under the Git workflow section above, and the full rule in `openspec/specs/tooling/git-workflow/spec.md`.

Existing specs live in `openspec/specs/` organised by capability (backend, frontend, tooling).
` and `frontend/AGENTS.md` for the full per-subproject workflow (verification commands, conventions).

---

## OpenSpec workflow

Every non-trivial change should have an OpenSpec change folder:

```
openspec/changes/<change-slug>/
├── proposal.md        # intent, scope (in/out), approach
├── design.md          # technical decisions with tradeoffs
├── tasks.md           # checklist of work items
└── specs/<capability>/<feature>/spec.md  # delta (ADDED / MODIFIED / REMOVED)
```

When the change is merged, move the folder to `openspec/changes/archive/YYYY-MM-DD-<slug>/` and any delta `spec.md` content merges into the live spec under `openspec/specs/<capability>/<feature>/spec.md`.

Existing specs live in `openspec/specs/` organised by capability (backend, frontend, tooling).
