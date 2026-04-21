# Proposal — `make seed-example-data`

## Intent

Give operators a single, deterministic command that populates an empty or freshly-wiped development database with a small but representative dataset. The goal is to shorten the gap between "blank DB" and "I can click around the app" from a dozen manual admin-panel steps to one command.

## Scope

### In scope

- A new Django management command `seed_example_data` that creates a curated set of users, vaccination types, owners, pets, vaccinations, medical notes, and schedules covering the common states of the app (past / today / future schedules, a cancelled one, a known compatibility conflict, etc.).
- A new Makefile target `make seed-example-data` that proxies the management command through the running `backend` container.
- Idempotency: a second run SHALL NOT duplicate rows. The command uses stable keys (e.g. well-known emails, pet names scoped by owner, schedule `(pet, start_date, start_time)`) and `get_or_create` so re-running is safe.
- A production safety guard: the command refuses to run when `DEBUG=False` unless the operator passes `--allow-production`.
- A `--reset` option that deletes the previously-seeded rows before re-creating them (useful when you want a clean slate without wiping the admin or other out-of-band data).
- Unit tests under `backend/pets/tests/test_seed_example_data.py` exercising the empty-DB case, the idempotent re-run, the `--reset` flow, and the production guard.

### Out of scope

- Seeding large-volume performance-test datasets (the command is about demo data, not load data).
- Randomisation / faker integration — the dataset is hard-coded on purpose so screenshots, tests, and documentation can reference specific names.
- Frontend E2E wiring — any Playwright tests that want this data can call the command themselves.
- Internationalisation beyond what the models already do (names include Latin-American Spanish flavor to match the existing translation samples, but no per-locale dataset).
- File uploads (pet / owner profile pictures, documents) — skipped to keep the command filesystem-free and portable.

## Approach

1. Add `backend/pets/management/commands/seed_example_data.py` (first management command in the repo). The command builds the fixture in a single atomic transaction so a failure leaves the DB unchanged.
2. Wire `make seed-example-data` as a one-liner that runs `docker compose exec -T backend python manage.py seed_example_data`, forwarding an optional `SEED_ARGS="…"` variable so operators can append `--reset` / `--allow-production` / `--quiet` without editing the Makefile.
3. Add a `help` entry under the existing "Database" section.
4. Cover the command with fast unit tests that import and call it via `call_command`, using the `--settings=nursery.test_settings` SQLite in-memory DB.
