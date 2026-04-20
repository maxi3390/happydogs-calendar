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
| `make init`             | First-time setup: `build` → `up` → `migrate` → `create-admin`             |
| `make up` / `make down` | Start / stop all services                                                 |
| `make migrate`          | Run pending Django migrations                                             |
| `make test`             | Run all tests (`test-backend` + `test-frontend`)                          |
| `make test-backend`     | Backend tests (SQLite in-memory)                                          |
| `make test-frontend`    | Playwright E2E tests (headless Chrome)                                    |
| `make lint`             | `flake8` on backend, `next lint` on frontend                              |
| `make upgrade`          | `git pull` → `build` → `up` → `migrate` (update a running deployment)     |

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

Existing specs live in `openspec/specs/` organised by capability (backend, frontend, tooling).
