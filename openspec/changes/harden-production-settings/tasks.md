# Tasks — Harden production settings

## Phase 1 — Settings

- [x] `SECRET_KEY`: read from env; raise `ImproperlyConfigured` when unset (or
      equal to the dev placeholder) and `DEBUG=False`.
- [x] `DEBUG`: default to `False`.
- [x] `ALLOWED_HOSTS`: parse comma-separated `ALLOWED_HOSTS` env
      (default `localhost,127.0.0.1`); append `'*'` only when `DEBUG=True`.
- [x] CORS: `CORS_ALLOW_ALL_ORIGINS = DEBUG`; parse `CORS_ALLOWED_ORIGINS` when
      `DEBUG=False`.
- [x] DRF `DEFAULT_PERMISSION_CLASSES` → `IsAuthenticated`.
- [x] Audit every viewset + `@api_view` to confirm public endpoints still set
      `AllowAny` explicitly — added explicit `AllowAny` to `get_nursery_settings`,
      `get_translations`, `get_available_languages` (previously relied on the
      implicit default). Login/register set it already; token refresh
      (simplejwt) and schema (drf-spectacular) manage their own.

## Phase 2 — Compose

- [x] Pass `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` through to `backend` and
      `notification-cron` (consulted only when `DEBUG=False`).
- [~] Gating `--api.insecure=true` / `8080:8080` behind a dev-only override is
      delegated to the `backend-production-runtime` change (it owns the
      dev/prod compose split; Compose `command` merge semantics make a partial
      move here fragile). Base compose keeps `DEBUG=${DEBUG:-True}` as the dev
      stack; the fail-closed guarantee lives in `settings.py`.

## Phase 3 — Env docs

- [x] Add `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` to `.env.example` with
      documented dev defaults and production guidance.

## Phase 4 — Tests

- [x] `security_tests` (A05): subprocess test asserts importing settings with
      `DEBUG=False` and no `SECRET_KEY` aborts with `ImproperlyConfigured`.
- [x] `security_tests` (A05): assert the DRF default permission is
      `IsAuthenticated`. Existing A01 access-control walk still passes after
      the flip.
- [x] Verified `check --deploy` under `DEBUG=False` + real key reports no
      `security.E…` errors (only the pre-existing W-level TLS/cookie warnings,
      scoped out below).

## Phase 5 — Spec + docs + verify

- [ ] Update live `openspec/specs/backend/auth/spec.md` (default-deny) and
      `openspec/specs/tooling/security/spec.md` (deploy posture) on archive.
- [ ] Update `docs/docs/deployment.md` + root `AGENTS.md` env table.
- [x] `make test-backend` (539 passed) + `flake8` clean, run via one-off
      container (dev DB volume is on a stale pre-18 layout; SQLite test
      settings need no Postgres).
- [ ] Archive this change folder.

## Follow-ups (scoped out here)

- HSTS / `SECURE_SSL_REDIRECT` / secure-cookie settings: need
  `SECURE_PROXY_SSL_HEADER` coordination with Traefik TLS termination to avoid
  redirect loops. Tracked separately.
