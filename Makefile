.PHONY: help build up down restart logs shell-backend shell-frontend migrate makemigrations test test-backend test-frontend test-frontend-debug lint clean rebuild create-admin

# Default target
help:
	@echo "Happy Pet Nursery - Available Commands"
	@echo "======================================"
	@echo ""
	@echo "Docker Management:"
	@echo "  make build          - Build all Docker containers"
	@echo "  make build-no-cache - Build containers without cache"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
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

# Docker Management
build:
	docker compose build

build-no-cache:
	docker compose build --no-cache

up:
	docker compose up -d

down:
	docker compose down

restart: down up

rebuild: down build up

clean:
	docker compose down -v --remove-orphans

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

ADMIN_EMAIL ?= admin@happypet.com
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

# Testing
PLAYWRIGHT_IMAGE ?= mcr.microsoft.com/playwright:v1.50.0-noble

test: test-backend test-frontend

test-backend:
	docker compose exec backend python manage.py test --settings=nursery.test_settings

test-frontend:
	@echo "Running Playwright tests (Chrome headless)..."
	docker run --rm --network=host \
		-v $(CURDIR)/frontend:/app \
		-w /app \
		-e CI=1 \
		-e BASE_URL=http://localhost:3000 \
		$(PLAYWRIGHT_IMAGE) \
		sh -c "npm install && npx playwright test --project=chromium"

test-frontend-debug:
	@echo "Running Playwright tests (Chrome headless, trace on)..."
	docker run --rm --network=host \
		-v $(CURDIR)/frontend:/app \
		-w /app \
		-e CI=1 \
		-e BASE_URL=http://localhost:3000 \
		$(PLAYWRIGHT_IMAGE) \
		sh -c "npm install && npx playwright test --project=chromium --trace=on"

test-coverage:
	docker compose exec backend coverage run --source='.' manage.py test --settings=nursery.test_settings
	docker compose exec backend coverage report
	docker compose exec backend coverage html

# Development
lint:
	docker compose exec backend python -m flake8 .
	docker compose exec frontend npm run lint

format:
	docker compose exec backend python -m black .
	docker compose exec backend python -m isort .

# Status
status:
	docker compose ps

# Quick start for new developers
init: build up migrate create-admin
	@echo ""
	@echo "Setup complete! The application is now running at:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend API: http://localhost:8000/api"
	@echo ""
	@echo "Default admin: $(ADMIN_EMAIL) / $(ADMIN_PASSWORD)"
