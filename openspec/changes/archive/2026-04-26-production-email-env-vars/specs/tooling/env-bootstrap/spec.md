# MODIFIED: Tooling / Env Bootstrap

## ADDED Requirements

### Requirement: `make env` SHALL prompt for the email-delivery variables

The `make env` interactive prompt SHALL include a dedicated "Email delivery for notifications" block covering every SMTP variable read by `nursery/settings.py`:

- `EMAIL_BACKEND` (default: `django.core.mail.backends.console.EmailBackend`)
- `EMAIL_HOST` (default: `localhost`)
- `EMAIL_PORT` (default: `25`)
- `EMAIL_HOST_USER` (default: empty)
- `EMAIL_HOST_PASSWORD` (default: empty; SHALL be read silently so the value does not enter shell history)
- `EMAIL_USE_TLS` (default: `False`)
- `DEFAULT_FROM_EMAIL` (default: `happy-calendar@localhost`)

The block SHALL include guidance that leaving the values empty keeps the dev defaults (console backend) and that production deployments expecting actual email delivery SHALL set `EMAIL_BACKEND` to an SMTP backend along with the relevant credentials.

When `make env` is invoked with `--non-interactive`, the email block SHALL be skipped (the example file remains the canonical reference for advanced users).

#### Scenario: Operator runs `make env` for the first time

- GIVEN no `.env` file exists
- WHEN the operator runs `make env`
- THEN the prompt SHALL include an "Email delivery for notifications" block before completing
- AND every variable in the block SHALL be present in the resulting `.env`

#### Scenario: Password input is silent

- GIVEN the operator is at the `EMAIL_HOST_PASSWORD` prompt
- WHEN they type their password
- THEN the typed characters SHALL NOT echo to the terminal

#### Scenario: `--non-interactive` skips the email block

- WHEN the operator runs `make env -- --non-interactive`
- THEN the email block SHALL NOT be prompted
- AND the resulting `.env` SHALL still contain the canonical email variable lines, populated with their documented defaults
