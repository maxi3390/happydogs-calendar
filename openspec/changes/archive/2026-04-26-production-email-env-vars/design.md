# Design — Production email env vars

## Why a startup warning instead of an error?

The `notification-cron` container can legitimately run with the console backend in dev — that's the default and we want it to keep working. Hard-failing on `console + notifications=True` would prevent the very common "I'm spinning up dev to look at the notifications flow without setting up SMTP" workflow.

A single INFO-level warning is the right balance: surfaces the issue without blocking, and grep-able so observability tooling can alert on it in prod.

## When is the warning logged?

At the `run_notification_scheduler` command's startup, exactly once per process. Re-emitting it on every loop iteration would clutter the logs without adding signal. The check is:

```python
if (settings.EMAIL_BACKEND.endswith('.console.EmailBackend')
        and is_feature_enabled('notifications')):
    logger.warning(WARN_MESSAGE)
```

## Why does `make env` ask for SMTP-specific values?

To remove the "I read `.env.example` but forgot to apply it" failure mode. The prompt block:

```
Email delivery for notifications
================================
The notification cron sends staff-internal emails when the master flag is on.
Leave any field blank to keep the dev defaults (console backend; emails print to stdout).

EMAIL_BACKEND     [django.core.mail.backends.console.EmailBackend]:
EMAIL_HOST        [localhost]:
EMAIL_PORT        [25]:
EMAIL_HOST_USER   []:
EMAIL_HOST_PASSWORD [hidden] []:
EMAIL_USE_TLS     [False]:
DEFAULT_FROM_EMAIL [happy-calendar@localhost]:
```

`EMAIL_HOST_PASSWORD` SHALL use `read -s` (silent input) so the password doesn't end up in shell history.

## Why not skip `make env` and use a `.env` file directly?

`make env` is the documented onboarding path (per `tooling/env-bootstrap/spec.md`). Adding the email vars there means new operators automatically get the right prompts without having to read the example file end-to-end. The example file is the fallback for advanced users who are doing things by hand.

## Backwards compatibility

Existing `.env` files without the email vars continue to work — `nursery/settings.py` already reads them with `os.environ.get(...)` defaults. We're not changing the application's behaviour, only making the prompt and example file cover the same surface.
