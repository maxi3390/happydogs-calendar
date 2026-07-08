# Harden production settings (fail closed, not open)

## Why

`backend/nursery/settings.py` currently fails **open**: a deployment that
forgets any single environment variable silently runs in an insecure state
rather than refusing to boot. Concretely, on a fresh process with no `.env`:

- `SECRET_KEY` falls back to a committed, public value
  (`'django-insecure-dev-key-change-in-production'`) — anyone with repo access
  can forge sessions, password-reset tokens, and signed URLs.
- `DEBUG` defaults to `True` — stack traces and a settings dump leak on error.
- `ALLOWED_HOSTS = ['*']` — accepts any Host header (host-header injection,
  cache poisoning of absolute URLs built via `build_absolute_uri`).
- `CORS_ALLOW_ALL_ORIGINS = True` — any website can call the API with the
  browser's credentials.
- The DRF global default permission is `AllowAny` — every viewset sets
  `IsAuthenticated` explicitly today, but a single forgotten
  `permission_classes` ships a public endpoint.

The compose file and `.env.example` *document* that production must override
these, but documentation is not enforcement. This change makes the insecure
combinations impossible to reach unintentionally: when `DEBUG` is off, missing
secrets/host config abort startup, and CORS/hosts are scoped from
configuration instead of wildcarded.

It also closes the matching operational footgun in `docker-compose.yml`: the
Traefik dashboard runs with `--api.insecure=true` on port 8080 despite a
comment claiming it's "disabled in production".

## What

1. **`SECRET_KEY`** — read from env with no committed production fallback. When
   `DEBUG=False` and the key is unset (or equals the dev placeholder), raise
   `ImproperlyConfigured` so the process refuses to start.
2. **`DEBUG`** — default to `False`. Dev enables it explicitly via the dev
   compose override (see the `backend-production-runtime` change).
3. **`ALLOWED_HOSTS`** — read a comma-separated `ALLOWED_HOSTS` env var
   (default `localhost,127.0.0.1`). Wildcard only permitted when `DEBUG=True`.
4. **CORS** — `CORS_ALLOW_ALL_ORIGINS` follows `DEBUG`; when `DEBUG=False` the
   allowed origins come from a `CORS_ALLOWED_ORIGINS` env var.
5. **DRF default permission** — change `DEFAULT_PERMISSION_CLASSES` to
   `IsAuthenticated`. The handful of genuinely public endpoints (login,
   register, token refresh, translations, public nursery settings/logo) keep
   their explicit `AllowAny`.
6. **Traefik dashboard** — gate `--api.insecure=true` / `--api.dashboard=true`
   and the `:8080` publish behind the dev compose override so the base compose
   is production-shaped.
7. **New env vars** documented in `.env.example`: `ALLOWED_HOSTS`,
   `CORS_ALLOWED_ORIGINS`.

## Impact

- `backend/nursery/settings.py`: ~15 lines changed.
- `docker-compose.yml` / `docker-compose.override.yml`: dashboard + debug moved
  to the dev override.
- `.env.example`: two new documented variables.
- `backend/security_tests/`: assertions that `check --deploy` is clean under
  `DEBUG=False` and that a missing `SECRET_KEY` aborts startup.
- No API contract change; the public endpoint set is unchanged.

## Out of scope

- HSTS / cookie-secure hardening beyond what `manage.py check --deploy`
  requires (tracked separately once TLS termination is finalised).
- Rotating the historical dev secret (it was only ever a placeholder).
- Rate limiting (separate concern).
