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
| Database   | PostgreSQL 16                                                           |
| Auth       | JWT (access 60 min / refresh 7 days, refresh rotation + blacklist)      |
| API Docs   | drf-spectacular (OpenAPI 3.0, Swagger UI, ReDoc)                        |
| Testing    | Playwright (frontend E2E), Django test runner + coverage (backend)      |
| Containers | Docker, Docker Compose with Traefik reverse proxy                       |

---

## Docker services

| Service    | Image / Build      | Port  | Profile    | Notes                                               |
|------------|--------------------|-------|------------|-----------------------------------------------------|
| `db`       | postgres:16-alpine | 5432  | (default)  | DB/user/password all `nursery`. Volume `postgres_data`. |
| `backend`  | `./backend`        | 8000  | (default)  | Runs `migrate` then `runserver` on start.           |
| `frontend` | `./frontend`       | 3000  | (default)  | Next.js standalone build.                           |
| `docs`     | `./docs`           | 3001  | `docs`     | Docusaurus site. Only with `--profile docs`.        |
| `pgadmin`  | dpage/pgadmin4     | 5050  | `dev`      | Only with `--profile dev`.                          |

Backend mounts `./backend:/app` as a volume so file edits hot-reload.

---

## Environment variables

### Backend (set in `docker-compose.yml`)

| Variable            | Default (docker)                      | Notes                          |
|---------------------|---------------------------------------|--------------------------------|
| `DJANGO_SECRET_KEY` | `dev-secret-key-change-in-production` | Must be changed for production |
| `DEBUG`             | `True`                                |                                |
| `POSTGRES_DB`       | `nursery`                             |                                |
| `POSTGRES_USER`     | `nursery`                             |                                |
| `POSTGRES_PASSWORD` | `nursery`                             |                                |
| `POSTGRES_HOST`     | `db`                                  |                                |
| `POSTGRES_PORT`     | `5432`                                |                                |

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
| `make test-frontend`    | Playwright E2E tests (headless Chrome)                                    |
| `make lint`             | `flake8` on backend, `next lint` on frontend                              |
| `make backup`           | Full gzipped `pg_dump` → `backups/nursery-<timestamp>.sql.gz`             |
| `make restore`          | Restore the DB from the latest backup (or `BACKUP_FILE=path make restore`) — destructive; requires explicit confirmation |
| `make destroy-db`       | Irreversibly remove the `happy-calendar_postgres_data` volume — destructive; requires explicit confirmation |
| `make clean`            | Stop and remove containers; the database volume is preserved              |
| `make upgrade`          | `backup` → `git pull` → `build` → `up` → `migrate` (use `SKIP_BACKUP=1` to skip step 1) |
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

Full per-variable guidance lives as comments in `.env.example` itself; `make env` reads those comments and shows them at each prompt. The invariants are tracked in `openspec/specs/tooling/env-bootstrap/`.

---

## Database backup and restore

`make backup` produces a full gzipped `pg_dump` (plain SQL, compressed) named `backups/nursery-<YYYY-MM-DD-HHMMSS>.sql.gz`. The script starts the `db` container if it's not running, waits for `pg_isready`, and writes the dump. Backup files are git-ignored; the `backups/` directory is tracked via a `.gitkeep`.

`make restore` restores from the most recent backup under `backups/`, or from an explicit path when the operator passes `BACKUP_FILE=path/to/file.sql.gz`. Because the restore drops and recreates the database (`DROP DATABASE ... WITH (FORCE)` then loads the gzipped SQL), it **refuses to proceed without explicit confirmation**: interactive runs require `yes` typed at the prompt, non-interactive runs require `RESTORE_I_UNDERSTAND=yes` as an environment variable.

`make upgrade` runs `make backup` as its first of five steps. If the backup fails, the upgrade halts before any mutation. Use `SKIP_BACKUP=1 make upgrade` only when a pre-upgrade backup was taken out-of-band and the step would be redundant.

The invariants are tracked in `openspec/specs/tooling/backup/` and (for the `make upgrade` integration) in `openspec/specs/tooling/upgrade/`.

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
