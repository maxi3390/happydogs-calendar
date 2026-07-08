# Multi-stage build. Default target is `prod`: production dependencies only,
# a non-root user, and gunicorn. The `dev` stage adds the dev toolchain
# (linters, scanners) and is selected by docker-compose.override.yml for the
# local hot-reload stack.
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# ── dev ─────────────────────────────────────────────────────────────────────
# Includes flake8 / black / isort / bandit / pip-audit for CI and the local
# stack. Runs as root so the bind-mounted source tree (owned by the host user)
# stays writable for __pycache__, migrations, etc. Command comes from compose.
FROM base AS dev
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
EXPOSE 8000

# ── prod ────────────────────────────────────────────────────────────────────
# Runtime dependencies only; non-root; served by gunicorn. This is the default
# target so `docker build ./backend` produces the production image.
FROM base AS prod
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN adduser --system --no-create-home --uid 1001 appuser \
    && chown -R appuser /app
USER appuser
EXPOSE 8000
CMD ["gunicorn", "nursery.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
