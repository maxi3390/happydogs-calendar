# Design — `seed-example-data`

## Where the command lives

The repo has no pre-existing `management/commands/` directory under any Django app. Picking `backend/pets/management/commands/seed_example_data.py` keeps the command colocated with the domain app that owns the bulk of the seeded entities (Owner, Pet, Schedule, Vaccination, MedicalNote). Future seed/admin commands can live alongside it without introducing a new "tools" app. The new `backend/pets/management/__init__.py` and `backend/pets/management/commands/__init__.py` files exist solely for Django's command-discovery machinery.

## Dataset shape

The fixture is deliberately tiny and hand-tuned so docs, screenshots, and manual testing can reference specific names. Counts are a hard contract of the spec so tests can assert them:

| Entity              | Count | Notes                                                                       |
|---------------------|-------|-----------------------------------------------------------------------------|
| `User` (staff)      | 2     | `sofia@happydogs.example`, `carlos@happydogs.example`, password `seed1234`. Both `role='user'`, `is_staff=False`. |
| `VaccinationType`   | 5     | rabies, distemper, parvovirus, bordetella, leptospirosis (all enabled).     |
| `Owner`             | 8     | Latin-American Spanish names; addresses in AR.                              |
| `Pet`               | 12    | Mix of dogs, cats, a rabbit, a bird; covers every temperament choice and a known compatibility conflict. |
| `Vaccination`       | 10    | Mostly rabies + distemper; one expired, one recent.                         |
| `MedicalNote`       | 4     | Allergy, behavioural, chronic condition, post-op follow-up.                 |
| `Schedule`          | 10    | Past (completed + cancelled), today, future; one pair of overlapping schedules that triggers a conflict warning. |

The `sofia@happydogs.example` / `carlos@happydogs.example` users are plain staff users — they do NOT get `is_staff=True` so they cannot log into `/admin/`. The default `admin@happydogs.com.ar` created by `make create-admin` remains the only superuser.

## Idempotency contract

Every entity has a stable natural key used as the lookup for `get_or_create` / `update_or_create`:

| Entity              | Natural key                                               |
|---------------------|-----------------------------------------------------------|
| `User`              | `email`                                                   |
| `VaccinationType`   | `name`                                                    |
| `Owner`             | `email`                                                   |
| `Pet`               | `(owner, name)`                                           |
| `Vaccination`       | `(pet, vax_type, date)`                                   |
| `MedicalNote`       | `(pet, title)`                                            |
| `Schedule`          | `(pet, start_date, start_time)`                           |

Re-running the command with no flags therefore converges on the same set of rows. Non-key fields (e.g. `temperament` on a pet, `notes` on a schedule) are overwritten via `update_or_create` so edits to the seed data propagate on the next run.

## Production guard

Seeding a production database is almost always a bug. The command calls `django.conf.settings.DEBUG`:

- `DEBUG=True`  → proceed.
- `DEBUG=False` and no `--allow-production` → exit 1 with a message explaining the refusal.
- `DEBUG=False` and `--allow-production` → proceed (escape hatch for staging / demo environments).

The guard is checked *before* any write, so a refused command leaves the database untouched.

## `--reset` semantics

`--reset` deletes previously-seeded rows **before** creating them. The command deletes by the same stable keys used for get-or-create, so it does NOT touch:

- Users other than the two seed emails.
- Owners with emails outside the seed list (so data typed in by a developer is safe).
- Pets whose `(owner, name)` pair isn't in the seed list, even when the owner is seeded.
- Schedules / vaccinations / notes for non-seeded pets.

This keeps `--reset` scoped to the seed dataset and reversible.

## Makefile surface

```makefile
SEED_ARGS ?=

seed-example-data:
	docker compose exec -T backend python manage.py seed_example_data $(SEED_ARGS)
```

Typical invocations:

- `make seed-example-data` — idempotent seed.
- `SEED_ARGS=--reset make seed-example-data` — wipe and re-seed.
- `SEED_ARGS="--allow-production --reset" make seed-example-data` — emergency demo/staging reset.

A help entry is added under the existing "Database" section.

## Rejected alternatives

- **Django fixtures (`loaddata` / JSON)** — rigid about field names, bad for computed fields (e.g. schedule dates relative to "today"), and each model change requires re-exporting the fixture. A hand-written command expresses intent clearly.
- **`factory_boy` in the command** — already used in `backend/tests/factories.py` for randomised test data; the seed command needs deterministic records by design. Using factories here would blur the test/demo boundary and surface unstable emails in docs.
- **Management command under a new `seed` app** — adds an app to `INSTALLED_APPS` just to host one command. Not worth the churn.
- **Running the seed automatically on `make init`** — explicit is better than implicit; operators who follow `make init` currently get an empty DB plus the admin user, which is the right default for a clean environment.
