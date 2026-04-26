# Backend — Agent Guidelines

## Project Overview

Django 5.1 REST API for the Happy Pet Nursery system. Domain-driven design with models in `domain/` and three Django apps: `pets`, `accounts`, `nursery_settings`.

## Git Workflow

**Always create a feature branch before starting work.** Never commit directly to `master`.

```bash
# 1. Start from an up-to-date master
git checkout master && git pull

# 2. Create a feature branch using conventional naming
git checkout -b feat/<feature-slug>      # new features
git checkout -b fix/<bug-slug>           # bug fixes
git checkout -b refactor/<scope>         # refactoring
git checkout -b test/<scope>             # adding tests
git checkout -b docs/<scope>             # documentation only

# 3. Work — commit often with conventional commit messages
git add -A && git commit -m "feat(pets): add weight field to pet model"

# 4. When done, verify before considering the branch ready
make test-backend                        # all tests must pass
make lint                                # no lint errors

# 5. Do NOT push or merge — leave that to the user
```

### Branch naming examples

| Type | Branch name | Commit prefix |
|------|-------------|---------------|
| New feature | `feat/add-system-logo` | `feat(settings):` |
| Bug fix | `fix/schedule-overlap-query` | `fix(schedules):` |
| Refactor | `refactor/extract-compatibility-service` | `refactor(pets):` |
| Tests | `test/logo-upload-validation` | `test(settings):` |
| Docs/specs | `docs/update-openspec-settings` | `docs:` |

### Full workflow for a feature request

```
1. git checkout -b feat/<slug>           # create branch
2. Create openspec/changes/<slug>/       # proposal, design, specs, tasks
3. Implement backend changes             # models, views, serializers, urls
4. Write tests                           # tests must pass
5. Update docs                           # docs/docs/, AGENTS.md if needed
6. Commit with conventional messages     # one or more commits
7. make test-backend && make lint        # final verification
```

### Commit message rules

- Use the Conventional Commits format: `type(scope): subject` on the first line.
- Keep the subject under ~72 characters and use the imperative mood ("add", "fix", "rename").
- Body paragraphs explain *why* (rationale, tradeoffs), not *what* (the diff shows that).
- **Do NOT add tool attribution or co-author trailers to commit messages.** No `Generated with ...`, no `Co-Authored-By: <tool>`, no signature lines. Commits should read as if written by a human engineer on the team.

## Verification Commands

```bash
# Run all backend tests (SQLite in-memory, fast)
make test-backend
# or directly (manage.py auto-selects test_settings when running 'test'):
docker compose exec backend python manage.py test

# Run a specific test file
docker compose exec backend python manage.py test pets.tests.test_pet_api

# Run linting
make lint

# Run formatting
make format

# Generate migrations after model changes
make makemigrations
```

## Key Context Files

| File | Purpose |
|------|---------|
| `AGENTS.md` (repo root) | Repo-wide conventions, tech stack, services, commit rules |
| `docs/docs/backend/intro.md` | Public-facing backend architecture reference (directory tree, all models, endpoints, permissions) |
| `openspec/specs/backend/` | Behavioural source of truth (spec.md + design.md per capability) |

---

## Features

### 1. Authentication & RBAC

Email-based JWT authentication with admin/user roles.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/auth/spec.md` |
| **Design** | `openspec/specs/backend/auth/design.md` |
| **Tests** | `backend/accounts/tests/test_auth_api.py`, `backend/accounts/tests/test_models.py`, `backend/accounts/tests/test_permissions.py` |
| **Docs** | `docs/docs/backend/intro.md` (Authentication & Permissions section) |
| **Code** | `backend/accounts/models.py`, `backend/accounts/views.py`, `backend/accounts/serializers.py`, `backend/accounts/permissions.py` |

Key decisions: Custom User model with email as USERNAME_FIELD (no username). JWT via simplejwt with 60min access / 7day refresh tokens, rotation + blacklisting. Role field on User model (not Django groups).

### 2. User Management (Admin)

Admin-only CRUD for managing users, roles, and active status.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/auth/spec.md` (admin user management section) |
| **Design** | `openspec/specs/backend/auth/design.md` |
| **Tests** | `backend/accounts/tests/test_user_management_api.py` |
| **Docs** | `docs/docs/backend/intro.md` (Users endpoints table) |
| **Code** | `backend/accounts/views.py` (UserViewSet) |

### 3. Pet Management

CRUD for pets with behavioral attributes, compatibility checking, profile pictures, and nested vaccinations.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/pets/spec.md` |
| **Design** | `openspec/specs/backend/pets/design.md` |
| **Tests** | `backend/pets/tests/test_pet_api.py`, `backend/pets/tests/test_models.py` |
| **Docs** | `docs/docs/backend/intro.md` (Pet model, Pets endpoints, Conflict Detection) |
| **Code** | `backend/domain/pets/models.py`, `backend/pets/views.py` (PetViewSet), `backend/pets/serializers.py` (PetSerializer) |

Key decisions: Domain-Driven Design — Pet model in `domain/pets/` with `app_label='pets'`. Compatibility logic as instance method `is_compatible_with()` with 5 ordered rules. ViewSet accepts multipart/form-data on create/update for avatar-on-create support. Nested vaccinations replaced atomically on update.

### 4. Owner Management

CRUD for pet owners with contact info, emergency contacts, profile pictures, and pet associations.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/owners/spec.md` |
| **Design** | `openspec/specs/backend/owners/design.md` |
| **Tests** | `backend/pets/tests/test_owner_api.py` |
| **Docs** | `docs/docs/backend/intro.md` (Owner model, Owners endpoints) |
| **Code** | `backend/domain/owners/models.py`, `backend/pets/views.py` (OwnerViewSet), `backend/pets/serializers.py` (OwnerSerializer) |

Key decisions: ViewSet accepts multipart/form-data on create/update for avatar-on-create. Cascade delete: owner -> pets -> schedules/vaccinations/notes.

### 5. Schedule Management & Conflict Detection

Scheduling with multi-day support, automatic conflict detection, batch creation, and daily count tracking.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/schedules/spec.md` |
| **Design** | `openspec/specs/backend/schedules/design.md` |
| **Tests** | `backend/pets/tests/test_schedule_api.py` |
| **Docs** | `docs/docs/backend/intro.md` (Schedule model, Schedules endpoints, Conflict Detection System) |
| **Code** | `backend/domain/schedules/models.py`, `backend/pets/views.py` (ScheduleViewSet) |

Key decisions: Conflicts are **warnings, not blockers** — schedules are always created. Pre-flight conflict check endpoint available. Overlap detection uses Django Q objects on date+time ranges. Daily booking limit is informational only (reported, not enforced).

### 6. Vaccination Types

Configurable vaccination type catalog with enable/disable support.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/vaccinations/spec.md` |
| **Design** | `openspec/specs/backend/vaccinations/design.md` |
| **Tests** | `backend/pets/tests/test_vaccination_type_api.py` |
| **Docs** | `docs/docs/backend/intro.md` (Vaccination models) |
| **Code** | `backend/domain/vaccinations/models.py`, `backend/pets/views.py` (VaccinationTypeViewSet) |

Key decisions: VaccinationType is a reference model. Vaccination.vax_type is CharField (free-text), not FK — allows flexibility but no referential integrity.

### 7. Document Management

File uploads for pets and owners with type/size validation.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/documents/spec.md` |
| **Design** | `openspec/specs/backend/documents/design.md` |
| **Tests** | (covered in model tests) |
| **Docs** | `docs/docs/backend/intro.md` (Document model, Documents endpoints) |
| **Code** | `backend/domain/documents/models.py`, `backend/domain/files/validators.py`, `backend/pets/views.py` (DocumentViewSet) |

Key decisions: Polymorphic linking via nullable FKs (pet OR owner, not both). Shared file validators for size (5 MB) and MIME type.

### 8. Medical Notes

Per-pet medical notes with title and description.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/medical-notes/spec.md` |
| **Design** | `openspec/specs/backend/medical-notes/design.md` |
| **Tests** | `backend/pets/tests/test_medical_note_api.py` |
| **Docs** | `docs/docs/backend/intro.md` (MedicalNote model, Medical Notes endpoints) |
| **Code** | `backend/domain/notes/models.py`, `backend/pets/views.py` (MedicalNoteViewSet) |

Key decisions: Abstract base Note model for extensibility. MedicalNote extends Note with pet FK.

### 9. Nursery Settings & System Logo

Singleton configuration (daily booking limit) and customizable system logo for branding.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/settings/spec.md` |
| **Design** | `openspec/specs/backend/settings/design.md` |
| **Change spec** | `openspec/changes/add-system-logo/` (proposal, design, delta specs, tasks) |
| **Tests** | `backend/nursery_settings/tests.py` (NurserySettingModelTest, NurserySettingAPITest, SystemLogoAPITest, DailyCountAPITest) |
| **Docs** | `docs/docs/backend/intro.md` (NurserySetting model, Settings endpoints, Testing section) |
| **Code** | `backend/nursery_settings/models.py`, `backend/nursery_settings/views.py`, `backend/nursery_settings/serializers.py` |

Key decisions: Singleton pattern (pk=1 enforced in save()). Logo uses shared image validators. Upload/delete as separate endpoints. Settings endpoint is AllowAny so login page can fetch the logo.

### 10. Internationalization (Translations)

Static JSON translation files served via API for English and Spanish.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/settings/spec.md` (translations section) |
| **Design** | `openspec/specs/backend/settings/design.md` |
| **Tests** | `backend/pets/tests/test_translations_api.py` |
| **Docs** | `docs/docs/backend/intro.md` (Internationalization section) |
| **Code** | `backend/pets/views.py` (get_translations, get_available_languages), `backend/translations/en.json`, `backend/translations/es.json` |

Key decisions: Static JSON files (not database-backed). Translation endpoints are AllowAny (public). Supported languages hardcoded in view.

### 11. Notifications

Daily-cron-driven reminders for vaccination/deworming due, pet birthdays, and arrival/egress. Each event materialises one ``Notification`` row per active staff user with independent read / dismissed state. Email delivery is staff-internal (not owner-facing); the forward-to-owner affordance is rendered by the frontend (`mailto:` + `wa.me`). Operator-overridable templates live in ``NotificationTemplate`` (two scopes: ``treatment_due``, ``pet_birthday``).

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/backend/notifications/spec.md` (after archive) |
| **Design** | `openspec/specs/backend/notifications/design.md` |
| **Tests** | `backend/notifications/tests/test_api.py`, `test_services.py`, `test_email.py`, `test_scheduler.py` |
| **Docs** | `docs/docs/backend/intro.md` (Notifications section — TBD) |
| **Code** | `backend/notifications/` (models.py, services.py, email.py, serializers.py, views.py, urls.py, templating.py, management/commands/) |

Key decisions: Polling-loop scheduler (no celery). One notification row per (event × staff user). Idempotent natural key. Master ``notifications`` feature flag, plus per-kind ``NurserySetting.notifications_*_enabled`` toggles. Email templates fall back to localised defaults under ``notifications.staff_email.*`` in the translations files.

---

## Change Log (OpenSpec Changes)

Active or recently completed changes tracked in `openspec/changes/`:

| Change | Status | Artifacts |
|--------|--------|-----------|
| `add-system-logo` | Implemented | `proposal.md`, `design.md`, `tasks.md`, delta specs for backend/settings, frontend/auth, frontend/settings |
| `avatar-on-create` | Implemented | `proposal.md`, `design.md`, `tasks.md`, delta specs for backend/pets, backend/owners, frontend/pets |

---

## Conventions

- **Domain models** live in `backend/domain/` with `app_label = 'pets'`. Re-exported through `backend/pets/models.py`.
- **Migrations** all belong to the `pets` app (because of the `app_label` override).
- **Test images** are generated in-memory via Pillow (no fixtures).
- **Auth in tests**: Use `create_and_auth_user(self.client)` from `tests/factories.py`.
- **File validators** are shared across all upload features: `domain/files/validators.py`.
- **OpenSpec standard**: All specs use the [OpenSpec.dev](https://openspec.dev) format with `spec.md` (behavioral requirements, RFC 2119, Given/When/Then) and `design.md` (technical decisions with tradeoffs).
