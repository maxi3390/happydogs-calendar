# Production email env vars

## Why

The notification system reads SMTP config from `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, and `DEFAULT_FROM_EMAIL`. The `notification-cron` docker-compose service correctly forwards these variables, but:

1. **`.env.example` doesn't list them**, so an operator running `make env` for the first time has no idea they need to be set.
2. **`make env` doesn't prompt for them**, so even an attentive operator who reads `.env.example` end-to-end can miss a manual edit step.
3. **The defaults silently log emails to stdout** (Django's console backend). On a production deploy with `notifications` flipped on, the cron will fire daily, log a wall of "would-have-been-sent emails" into the container logs, and no notifications will ever land. The operator only finds out when staff complain three weeks later.

This is a "silent failure on day one of prod" footgun. We close it.

## What

Three small changes:

1. **`.env.example`** — add a documented section with every email variable and a short comment on each, mirroring the style of the `DOMAIN` / `NEXT_PUBLIC_API_URL` blocks already present.
2. **`make env`** — extend the interactive prompt to cover the email vars. They should be optional (operator can skip them and stay on the console backend in dev), but the prompt's documentation SHALL clearly say "leave blank for dev / change for prod."
3. **One-time guard** — when `EMAIL_BACKEND` is `console.EmailBackend` AND the master `notifications` flag is `True`, the `notification-cron` startup SHALL log a single warning at INFO level: `"WARNING: notifications flag is on but EMAIL_BACKEND is the dev console backend; staff emails are being printed to stdout, not sent."` This avoids the silent-failure mode on prod deploys where the operator forgot to set `EMAIL_*`.

## Impact

- `.env.example` gains ~8 lines.
- `make env` (or the script it calls) gains a new prompt block.
- The cron container's startup gets one log line at INFO under specific conditions.
- One small backend test asserting the warning is emitted under those conditions.

## Out of scope

- Wiring an actual SMTP relay (Mailgun, SES, etc.). Operator's choice; we just document the variables.
- Validating email deliverability at startup (DNS lookups, etc.). Way too far for v1.
- Per-template "from" addresses. Single `DEFAULT_FROM_EMAIL` is fine.
