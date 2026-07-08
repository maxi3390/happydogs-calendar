# Design — Harden production settings

## Guiding principle: fail closed

Every decision here follows one rule: an insecure configuration must be
*reachable only by explicit opt-in*, never by omission. Dev ergonomics are
preserved by making the dev opt-ins live in a `docker-compose.override.yml`
(loaded automatically by `docker compose` in dev) rather than by weakening the
defaults that ship in the base image / base compose.

## Decisions

### SECRET_KEY: abort, don't fall back

```python
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY or SECRET_KEY == 'django-insecure-dev-key-change-in-production':
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-key-change-in-production'
    else:
        raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set when DEBUG is False')
```

Rationale: a running-but-forgeable server is worse than a server that refuses
to boot. The abort is loud and happens at import time, so it surfaces in the
first deploy attempt rather than weeks later.

### DEBUG default False

`DEBUG = os.environ.get('DEBUG', 'False') == 'True'`. The dev stack sets
`DEBUG=True` in the override file. This flips the failure mode: forgetting the
var yields a hardened server, not a leaky one.

### ALLOWED_HOSTS from env, wildcard dev-only

```python
_hosts = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _hosts.split(',') if h.strip()]
if DEBUG:
    ALLOWED_HOSTS += ['*']  # dev convenience only
```

We keep `localhost,127.0.0.1` as the non-debug default so a same-host reverse
proxy works out of the box; real deployments set the public hostname.

### CORS tracks DEBUG

`CORS_ALLOW_ALL_ORIGINS = DEBUG`. When off, `CORS_ALLOWED_ORIGINS` is parsed
from a comma-separated env var (empty by default → no cross-origin access,
which is correct when the SPA is served same-origin behind Traefik).

### DRF default permission: IsAuthenticated

Changing the global default is defense-in-depth. Audited today, every viewset
already sets `IsAuthenticated`, and the public endpoints set `AllowAny`
explicitly, so this change is behaviour-preserving for the current surface —
its only effect is on *future* endpoints that forget to declare a permission.
The `security_tests` A01 access-control walk already enumerates the URL surface
and will catch any endpoint that regressed to public.

Public endpoints that must keep explicit `AllowAny`:
`auth/login`, `auth/register`, `auth/token/refresh`, `translations`,
`languages`, and the `AllowAny` nursery-settings/logo read used by the login
page (per `backend/AGENTS.md`).

### Traefik dashboard moves to the dev override

The base compose drops `--api.insecure=true`, `--api.dashboard=true`, and the
`8080:8080` publish. The dev override re-adds them. This pairs with the
`backend-production-runtime` change which introduces the override file, so the
two changes share that mechanism.

## Alternatives considered

- **django-environ / pydantic-settings** for typed config: nice, but a new
  dependency for five variables is overkill; plain `os.environ` with an
  explicit abort is enough and matches the existing style.
- **Keeping AllowAny default and relying on tests**: rejected — the test walk
  is a backstop, but the framework default should itself be safe.
