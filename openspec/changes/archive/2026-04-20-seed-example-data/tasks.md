# Tasks

## 1. Management command
- [x] 1.1 Create `backend/pets/management/__init__.py` and `backend/pets/management/commands/__init__.py`.
- [x] 1.2 Create `backend/pets/management/commands/seed_example_data.py` with argument parsing for `--reset`, `--allow-production`, `--quiet`.
- [x] 1.3 Inside the command, wrap the whole seed in `transaction.atomic()` and gate writes behind the `DEBUG`/`--allow-production` check.
- [x] 1.4 Implement deterministic, idempotent creation via `get_or_create` / `update_or_create` using the natural keys listed in `design.md`.
- [x] 1.5 Implement `--reset`: delete rows with matching natural keys (users, owners, pets, schedules, notes, vaccinations, vaccination types) before creating them.
- [x] 1.6 Print a final counts summary (one line per entity with `created`/`updated`/`unchanged` totals) unless `--quiet` is set.

## 2. Makefile
- [x] 2.1 Add `seed-example-data` target that runs the management command through `docker compose exec -T backend`, accepting optional `SEED_ARGS="…"`.
- [x] 2.2 Add the target to the Database section of `make help`.
- [x] 2.3 Add `seed-example-data` to the `.PHONY` line.

## 3. Tests
- [x] 3.1 Create `backend/pets/tests/test_seed_example_data.py`.
- [x] 3.2 Empty-DB run: assert expected counts are created.
- [x] 3.3 Idempotent re-run: running twice produces the same counts, no duplicates.
- [x] 3.4 `--reset`: delete a seeded pet out-of-band, run with `--reset`, assert it is re-created and unrelated rows are unaffected.
- [x] 3.5 Production guard: run with `settings.DEBUG=False` and no `--allow-production`, assert `CommandError` (or non-zero exit via `call_command`) and zero rows written.
- [x] 3.6 `--allow-production` bypass: same as 3.5 but with the flag, asserts the data IS created.

## 4. Spec
- [x] 4.1 Create `openspec/changes/seed-example-data/specs/tooling/seed/spec.md` (ADDED delta).
- [x] 4.2 Mirror as new baseline `openspec/specs/tooling/seed/spec.md`.

## 5. Verification
- [x] 5.1 `docker compose exec -T backend python manage.py test --settings=nursery.test_settings --keepdb` — all tests green, including the new ones.
- [x] 5.2 Run `make seed-example-data` end-to-end on the dev stack, verify counts via `docker compose exec db psql`.
- [x] 5.3 Run `make seed-example-data` a second time, verify it reports everything as `unchanged`.
- [x] 5.4 `python3 -c "import json; json.load(open('backend/translations/en.json'))"` and same for `es.json` — no translation files touched, but sanity check.
