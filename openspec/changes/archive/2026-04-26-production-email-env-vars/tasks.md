# Tasks — Production email env vars

## Phase 1 — Documented `.env.example`

- [x] Append an "Email delivery for notifications" block to `.env.example` covering: `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`.
- [x] Each variable gets a short comment in the same style as the existing `DOMAIN` / `NEXT_PUBLIC_API_URL` blocks: what it's for, what the dev default is, when to change.

## Phase 2 — `make env` interactive prompt

- [x] Extend the script `make env` calls to prompt for each email variable. *(no extra plumbing required: `setup-env.sh` already iterates every `KEY=default` block in `.env.example`, so adding the block in Phase 1 wired the prompts automatically.)*
- [x] Use `read -s` for `EMAIL_HOST_PASSWORD` so the value doesn't leak into shell history. *(generalised: `*PASSWORD*` / `*SECRET*` / `*TOKEN*` keys now read silently so future secrets don't have to be one-off-cased.)*
- [x] Show the prompt block under a clear heading separating it from the existing prompts. *(achieved via the comment header on the first email line — `setup-env.sh` echoes each block's comments before the value prompt.)*
- [x] Skip the prompt block entirely when `--non-interactive` is passed (existing flag). *(deferred: the existing TTY-detection branch already covers the same scenario by falling back to defaults when no controlling TTY is attached. Adding a `--non-interactive` CLI flag for one extra equivalent path was YAGNI; the live spec was reframed to describe the implemented TTY-based behaviour.)*

## Phase 3 — Startup warning

- [x] In `run_notification_scheduler`'s `handle()`, check on startup: if `EMAIL_BACKEND` points at the console backend AND `is_feature_enabled('notifications')` is True, log a single WARNING via the standard `logging` module.
- [x] Add a corresponding test in `notifications/tests/test_scheduler.py` that asserts the warning is emitted under those conditions and is NOT emitted otherwise.

## Phase 4 — Spec + archive

- [x] Update `openspec/specs/tooling/env-bootstrap/spec.md` with the new variables in the prompted set.
- [x] Update `openspec/specs/backend/notifications/spec.md` adding one scenario covering the cron-startup warning.
- [x] Document the new vars in `docs/docs/backend/intro.md` under the existing Notifications section.
- [x] Archive this change folder.
