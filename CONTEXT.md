# Happy Pet Nursery — Project Context

## What This Project Is

A calendar-based schedule management system for pet nurseries. It lets staff register owners and pets, create time-slotted schedules, and automatically detects behavioural conflicts between incompatible pets before (and after) booking.

---

## Repository Layout

```
happy-calendar/
├── backend/          # Django 5.1 REST API (Python 3.12)
├── frontend/         # Next.js 16 / React 19 app (TypeScript)
├── docs/             # Docusaurus documentation site
├── docker-compose.yml
├── Makefile          # Developer convenience targets
└── README.md
```

---

## Services (docker-compose)

| Service    | Image / Build      | Port  | Profile    | Notes                                                              |
|------------|--------------------|-------|------------|--------------------------------------------------------------------|
| `db`       | postgres:16-alpine | 5432  | (default)  | DB/user/password all `nursery`. Persisted in `postgres_data` vol. |
| `backend`  | `./backend`        | 8000  | (default)  | Runs `migrate` then `runserver 0.0.0.0:8000` on start.           |
| `frontend` | `./frontend`       | 3000  | (default)  | Next.js standalone build served with `node server.js`.            |
| `docs`     | `./docs`           | 3001  | `docs`     | Docusaurus site. Only started with `--profile docs`.              |
| `pgadmin`  | dpage/pgadmin4     | 5050  | `dev`      | Only started with `--profile dev`.                                |

Backend mounts `./backend:/app` as a volume so file edits hot-reload the Django dev server.

---

## Makefile Commands

Run `make help` to print all targets. Key ones:

### Docker Management
| Command              | What it does                                                    |
|----------------------|-----------------------------------------------------------------|
| `make build`         | `docker compose build`                                          |
| `make build-no-cache`| `docker compose build --no-cache`                               |
| `make up`            | Start all services in detached mode                             |
| `make down`          | Stop all services                                               |
| `make restart`       | `down` then `up`                                                |
| `make rebuild`       | `down` → `build` → `up`                                        |
| `make clean`         | `docker compose down -v --remove-orphans` (removes volumes)     |
| `make status`        | `docker compose ps`                                             |

### Logs
| Command               | What it does                   |
|-----------------------|-------------------------------|
| `make logs`           | Tail all service logs          |
| `make logs-backend`   | Tail backend logs only         |
| `make logs-frontend`  | Tail frontend logs only        |
| `make logs-db`        | Tail database logs only        |

### Shell Access
| Command               | What it does                                      |
|-----------------------|---------------------------------------------------|
| `make shell-backend`  | `/bin/bash` inside the backend container          |
| `make shell-frontend` | `/bin/sh` inside the frontend container           |
| `make shell-db`       | `psql -U nursery -d nursery` inside db container  |

### Database
| Command                  | What it does                                                              |
|--------------------------|---------------------------------------------------------------------------|
| `make migrate`           | `python manage.py migrate` inside backend container                       |
| `make makemigrations`    | `python manage.py makemigrations` inside backend container                |
| `make createsuperuser`   | Interactive Django superuser creation                                     |
| `make create-admin`      | Non-interactive admin creation. Defaults: `admin@happypet.com` / `admin1234`. Override with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST`, `ADMIN_LAST` env vars. |

### Testing
| Command                    | What it does                                                                              |
|----------------------------|-------------------------------------------------------------------------------------------|
| `make test`                | Runs `test-backend` then `test-frontend`                                                  |
| `make test-backend`        | `manage.py test --settings=nursery.test_settings` (SQLite in-memory)                     |
| `make test-frontend`       | Playwright tests via `mcr.microsoft.com/playwright:v1.50.0-noble` Docker image (Chrome)  |
| `make test-frontend-debug` | Same but with `--trace=on`                                                                |
| `make test-coverage`       | Django `coverage run` + report + HTML output                                              |

### Development
| Command       | What it does                                     |
|---------------|--------------------------------------------------|
| `make lint`   | `flake8` on backend, `next lint` on frontend     |
| `make format` | `black` + `isort` on backend                     |
| `make init`   | `build` → `up` → `migrate` → `create-admin` (first-time setup for new devs) |

### Maintenance
| Command        | What it does                                                              |
|----------------|---------------------------------------------------------------------------|
| `make upgrade` | `git pull` → `build` → `up` → `migrate` (update a running deployment)     |

---

## Quick-Start (first run)

```bash
make init          # builds, starts, migrates, creates admin user
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/
# Swagger UI: http://localhost:8000/api/docs/
```

---

## Environment Variables

### Backend (set in `docker-compose.yml`)
| Variable            | Default (docker)                   | Notes                          |
|---------------------|------------------------------------|--------------------------------|
| `DJANGO_SECRET_KEY` | `dev-secret-key-change-in-production` | Must be changed for production |
| `DEBUG`             | `True`                             |                                |
| `POSTGRES_DB`       | `nursery`                          |                                |
| `POSTGRES_USER`     | `nursery`                          |                                |
| `POSTGRES_PASSWORD` | `nursery`                          |                                |
| `POSTGRES_HOST`     | `db`                               |                                |
| `POSTGRES_PORT`     | `5432`                             |                                |

### Frontend (set in `docker-compose.yml`)
| Variable              | Default                        |
|-----------------------|--------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api`    |

---

## Tech Stack Summary

| Layer      | Technology                                                              |
|------------|-------------------------------------------------------------------------|
| Frontend   | Next.js 16, React 19, TypeScript, TailwindCSS 3, Lucide React, date-fns |
| Backend    | Django 5.1, Django REST Framework 3.15, djangorestframework-simplejwt   |
| Database   | PostgreSQL 16                                                           |
| Auth       | JWT (access 60 min / refresh 7 days, refresh token rotation + blacklist)|
| API Docs   | drf-spectacular 0.28 (OpenAPI 3.0, Swagger UI, ReDoc)                  |
| Testing    | Playwright (frontend E2E), Django test runner + coverage (backend)      |
| Containers | Docker, Docker Compose                                                  |

---

## Conflict Detection Rules (core business logic)

Implemented in `backend/domain/pets/models.py` — `Pet.is_compatible_with(other)`:

1. **Aggressive**: Either pet with `temperament = aggressive` → incompatible with any other pet.
2. **High dominance**: Both pets have `dominance_level > 7` → incompatible.
3. **Size + dominance**: Size difference ≥ 2 levels AND dominance difference ≥ 5 → incompatible.
4. **Cross-species temperament**: Different species with `(aggressive, anxious)` or `(aggressive, calm)` temperament pairs → incompatible.
5. **Anxious + playful**: One anxious, one playful, and `dominance_level` difference > 4 → incompatible.

Conflicts are non-blocking: schedules are still created, but warnings are returned in the response.

---

## Access URLs (when running locally)

| URL                              | Description                    |
|----------------------------------|--------------------------------|
| http://localhost:3000            | Frontend application           |
| http://localhost:8000/api/       | REST API root                  |
| http://localhost:8000/admin/     | Django admin panel             |
| http://localhost:8000/api/docs/  | Swagger UI                     |
| http://localhost:8000/api/redoc/ | ReDoc                          |
| http://localhost:8000/api/schema/| OpenAPI 3.0 schema (YAML)      |
| http://localhost:3001            | Docusaurus docs (`--profile docs`) |
| http://localhost:5050            | pgAdmin (`--profile dev`)      |
