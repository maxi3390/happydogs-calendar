# MODIFIED: Tooling / Security Testing

## ADDED Requirements

### Requirement: Production configuration SHALL fail closed

When `DEBUG` is `False`, the backend SHALL refuse to start with an insecure
configuration rather than boot into an insecure state. Specifically:

- A missing `DJANGO_SECRET_KEY` (or one equal to the committed dev placeholder)
  SHALL raise `ImproperlyConfigured` at startup.
- `DEBUG` SHALL default to `False` when the `DEBUG` env var is absent.
- `ALLOWED_HOSTS` SHALL be derived from the `ALLOWED_HOSTS` env var
  (comma-separated), defaulting to `localhost,127.0.0.1`. The `*` wildcard
  SHALL only be added when `DEBUG` is `True`.
- `CORS_ALLOW_ALL_ORIGINS` SHALL equal the value of `DEBUG`; when `DEBUG` is
  `False`, cross-origin access SHALL be limited to the origins listed in
  `CORS_ALLOWED_ORIGINS`.

`python manage.py check --deploy` run under `DEBUG=False` with the required
environment SHALL produce no `security.E…` errors.

#### Scenario: Missing secret key aborts a production boot

- GIVEN `DEBUG=False` and no `DJANGO_SECRET_KEY` set
- WHEN the Django process starts
- THEN it SHALL raise `ImproperlyConfigured` and NOT serve requests

#### Scenario: Wildcard host is rejected in production

- GIVEN `DEBUG=False` and `ALLOWED_HOSTS` unset
- WHEN a request arrives with an arbitrary `Host` header
- THEN Django SHALL reject it (host not in the scoped allow-list)

#### Scenario: `check --deploy` is clean

- GIVEN the documented production environment (`DEBUG=False`, a real
  `DJANGO_SECRET_KEY`, scoped `ALLOWED_HOSTS`)
- WHEN `python manage.py check --deploy` runs
- THEN it SHALL report no `security.E…` errors

> Note: gating the Traefik API dashboard (`--api.insecure=true`) and its
> `:8080` publish behind a dev-only compose override is handled by the
> `backend-production-runtime` change, which owns the dev/prod compose split
> (Compose merges a service `command` by replacement, so the dashboard move is
> implemented alongside the override that supplies the full dev Traefik
> command).
