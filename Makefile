.PHONY: help build up down restart logs shell-backend shell-frontend migrate makemigrations test test-backend test-frontend test-frontend-debug lint lint-backend clean rebuild create-admin seed-example-data env env-check init upgrade backup restore volume-ensure destroy-db notifications-run

POSTGRES_VOLUME_NAME := happy-calendar_postgres_data

# Default target
help:
	@echo "Happy Dogs Nursery - Available Commands"
	@echo "======================================"
	@echo ""
	@echo "Docker Management:"
	@echo "  make build          - Build all Docker containers"
	@echo "  make build-no-cache - Build containers without cache"
	@echo "  make up             - Start all services"
	@echo "  make stop           - Stop all services"
	@echo "  make down           - Stop and remove all services"
	@echo "  make restart        - Restart all services"
	@echo "  make rebuild        - Rebuild and restart all services"
	@echo "  make clean          - Stop services and remove volumes"
	@echo ""
	@echo "Logs:"
	@echo "  make logs           - View logs from all services"
	@echo "  make logs-backend   - View backend logs"
	@echo "  make logs-frontend  - View frontend logs"
	@echo "  make logs-db        - View database logs"
	@echo ""
	@echo "Shell Access:"
	@echo "  make shell-backend  - Open shell in backend container"
	@echo "  make shell-frontend - Open shell in frontend container"
	@echo "  make shell-db       - Open psql shell in database"
	@echo ""
	@echo "Database:"
	@echo "  make migrate        - Run Django migrations"
	@echo "  make makemigrations - Create new migrations"
	@echo "  make createsuperuser - Create Django admin user (interactive)"
	@echo "  make create-admin   - Create first admin user (non-interactive)"
	@echo "  make seed-example-data - Populate DB with demo data (idempotent; SEED_ARGS=\"--reset\" to wipe first)"
	@echo ""
	@echo "Notifications:"
	@echo "  make notifications-run - Run the daily notification cron once (idempotent; NOTIF_ARGS=\"--today YYYY-MM-DD --no-email\" supported)"
	@echo ""
	@echo "Testing:"
	@echo "  make test              - Run all tests (backend + frontend)"
	@echo "  make test-backend      - Run backend tests only"
	@echo "  make test-frontend     - Run frontend Playwright tests (Chrome headless)"
	@echo "  make test-frontend-debug - Run frontend tests with Playwright trace viewer"
	@echo "  make test-coverage     - Run tests with coverage report"
	@echo ""
	@echo "Development:"
	@echo "  make lint           - Run linters"
	@echo "  make format         - Format code"
	@echo ""
	@echo "Maintenance:"
	@echo "  make env            - Create .env interactively from .env.example (idempotent)"
	@echo "  make backup         - Write a full gzipped pg_dump to backups/nursery-<timestamp>.sql.gz"
	@echo "  make restore        - Restore the database from the latest backup (or BACKUP_FILE=...)"
	@echo "  make upgrade        - Backup, pull, rebuild, restart, migrate (SKIP_BACKUP=1 to skip step 1)"

# Docker Management
build:
	docker compose build

build-no-cache:
	docker compose build --no-cache

# Auto-create the external postgres_data volume if it isn't present yet.
# `docker volume create` is idempotent: a no-op when the volume exists,
# otherwise it creates an empty Docker-managed volume. Wired as a
# prerequisite of every target that starts the stack or talks to db.
volume-ensure:
	@docker volume create $(POSTGRES_VOLUME_NAME) >/dev/null

up: volume-ensure
	docker compose up -d

stop:
	docker compose stop

down:
	docker compose down

restart: stop up

rebuild: stop build up

# `make clean` stops and removes containers but NEVER removes the
# database volume (postgres_data is declared external in
# docker-compose.yml, so `docker compose down -v` couldn't remove it
# anyway — dropping -v keeps the recipe self-documenting).
clean:
	docker compose down --remove-orphans

# `make destroy-db` is the only Makefile target that removes the
# database volume. Confirmation-gated via bash scripts/destroy-db.sh.
destroy-db:
	@POSTGRES_VOLUME_NAME=$(POSTGRES_VOLUME_NAME) bash scripts/destroy-db.sh

# Logs
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f db

# Shell Access
shell-backend:
	docker compose exec backend /bin/bash

shell-frontend:
	docker compose exec frontend /bin/sh

shell-db:
	docker compose exec db psql -U postgres -d happy_pet_nursery

# Database
migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

ADMIN_EMAIL ?= admin@happydogs.com.ar
ADMIN_PASSWORD ?= admin1234
ADMIN_FIRST ?= Admin
ADMIN_LAST ?= User

create-admin:
	@docker compose exec backend python manage.py shell -c "\
	from accounts.models import User; \
	user, created = User.objects.get_or_create( \
		email='$(ADMIN_EMAIL)', \
		defaults={ \
			'first_name': '$(ADMIN_FIRST)', \
			'last_name': '$(ADMIN_LAST)', \
			'role': 'admin', \
			'is_staff': True, \
			'is_superuser': True, \
		} \
	); \
	user.set_password('$(ADMIN_PASSWORD)') if created else None; \
	user.save() if created else None; \
	print(f'Admin created: {user.email}') if created else print(f'Admin already exists: {user.email}') \
	"
	@echo "Email: $(ADMIN_EMAIL) | Password: $(ADMIN_PASSWORD)"

# Seed a deterministic demo dataset (idempotent). Forward SEED_ARGS="..."
# to pass flags through, e.g.  SEED_ARGS=--reset make seed-example-data.
# Full spec: openspec/specs/tooling/seed/spec.md
SEED_ARGS ?=

seed-example-data:
	docker compose exec -T backend python manage.py seed_example_data $(SEED_ARGS)

# Notifications — fire the daily cron command once. The notification-cron
# docker service runs this on a polling loop in normal operation; this
# target is for manual smoke-testing and one-off catch-up runs. Idempotent
# (the natural-key UniqueConstraint protects against duplicates).
notifications-run:
	docker compose exec -T backend python manage.py generate_notifications $(NOTIF_ARGS)

# Testing
PLAYWRIGHT_IMAGE ?= mcr.microsoft.com/playwright:v1.58.2-noble

test: test-backend test-frontend

test-backend:
	docker compose exec backend python manage.py test --settings=nursery.test_settings

test-frontend:
	@echo "Running Playwright tests (Chrome headless)..."
	docker run --rm --network=happy-calendar_proxy \
		-v $(PWD)/frontend:/app \
		-w /app \
		-e BASE_URL=http://localhost:3000 \
		-e NEXT_PUBLIC_API_URL=http://backend:8000/api \
		$(PLAYWRIGHT_IMAGE) \
		sh -c "npm install && npx playwright test --project=chromium"

test-frontend-debug:
	@echo "Running Playwright tests (Chrome headless, trace on)..."
	docker run --rm --network=happy-calendar_proxy \
		-v $(PWD)/frontend:/app \
		-w /app \
		-e BASE_URL=http://localhost:3000 \
		-e NEXT_PUBLIC_API_URL=http://backend:8000/api \
		$(PLAYWRIGHT_IMAGE) \
		sh -c "npm install && npx playwright test --project=chromium --trace=on"

test-coverage:
	docker compose exec backend coverage run --source='.' manage.py test --settings=nursery.test_settings
	docker compose exec backend coverage report
	docker compose exec backend coverage html

# Development
# `make lint` runs only the backend lint today; the frontend half is broken
# upstream because Next 16 removed `next lint` and the package script has
# not been migrated to ESLint-direct yet (tracked separately). Once that
# is resolved, append the frontend invocation to this rule.
lint: lint-backend

lint-backend:
	docker compose exec backend python -m flake8 .

format:
	docker compose exec backend python -m black .
	docker compose exec backend python -m isort .

# Status
status:
	docker compose ps

# Quick start for new developers
init: env-check build up migrate create-admin
	@echo ""
	@echo "Setup complete! The application is now running at:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend API: http://localhost:8000/api"
	@echo ""
	@echo "Default admin: $(ADMIN_EMAIL) / $(ADMIN_PASSWORD)"

# Env bootstrap
# `make env` creates .env from .env.example via the guided wizard. Safe
# to run multiple times: it refuses to overwrite an existing .env.
env:
	@bash scripts/setup-env.sh

# env-check is a private prerequisite used by init: it only runs the
# wizard when .env is missing, so repeat runs of `make init` are no-ops
# on that step.
env-check:
	@if [ ! -f .env ]; then \
		echo "[env] .env missing — running 'make env' first."; \
		$(MAKE) env; \
	fi

# Database backup / restore
# `make backup` writes a timestamped, gzipped pg_dump to backups/.
# `make restore` restores the latest backup (or BACKUP_FILE=...).
# Both scripts start the db container if it isn't already running.
backup: volume-ensure
	@bash scripts/backup-db.sh

restore: volume-ensure
	@bash scripts/restore-db.sh $(if $(BACKUP_FILE),$(BACKUP_FILE),)

# Maintenance
upgrade: volume-ensure
	@echo "=== Upgrading Happy Pet Nursery ==="
	@if [ ! -f .env ]; then \
		echo "[upgrade] WARNING: .env is missing. Traefik Host rules will match nothing and the stack will 404."; \
		echo "[upgrade]          Run 'make env' to generate one. Continuing anyway."; \
	fi
	@if [ "$${SKIP_BACKUP:-}" = "1" ]; then \
		echo "[1/5] WARNING: SKIP_BACKUP=1 set — skipping pre-upgrade database backup."; \
	else \
		echo "[1/5] Backing up database..."; \
		$(MAKE) backup; \
	fi
	@if [ "$${SKIP_PULL:-}" = "1" ]; then \
		echo "[2/5] WARNING: SKIP_PULL=1 set — skipping 'git pull' (using local code)."; \
	else \
		echo "[2/5] Pulling latest code..."; \
		git pull; \
	fi
	@echo "[3/5] Rebuilding images..."
	$(MAKE) build
	@echo "[4/5] Restarting services..."
	$(MAKE) up
	@echo "[5/5] Running migrations..."
	$(MAKE) migrate
	@echo "=== Upgrade complete ==="
complete ==="
