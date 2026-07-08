# Backend Architecture

## Overview

The backend is built with **Django 5.1.4** and **Django REST Framework 3.15.2**, serving a REST API for the Happy Calendar pet nursery application. It manages pets, owners, scheduling with multi-day support, conflict detection, vaccinations, documents, medical notes, nursery-wide settings, authentication with role-based access, and i18n translations.

## Core Technologies

| Dependency | Version | Purpose |
|---|---|---|
| Django | 5.1.4 | Web framework, ORM, admin |
| djangorestframework | 3.15.2 | REST API toolkit |
| djangorestframework-simplejwt | 5.3.1 | JWT authentication with blacklisting |
| django-cors-headers | 4.6.0 | Cross-origin resource sharing |
| psycopg2-binary | 2.9.10 | PostgreSQL adapter |
| gunicorn | 23.0.0 | Production WSGI server |
| drf-spectacular | 0.28.0 | OpenAPI 3 schema generation (Swagger UI + ReDoc) |
| Pillow | 11.1.0 | Image processing and validation |

## Directory Structure

```
backend/
├── nursery/                      # Django project package
│   ├── settings.py               # Main settings (reads env vars, PostgreSQL, JWT config)
│   ├── test_settings.py          # SQLite in-memory for tests
│   ├── urls.py                   # Root URL config (includes pets, accounts, nursery_settings URLs + drf-spectacular)
│   └── wsgi.py                   # WSGI entry point
├── domain/                       # Pure domain models (no Django app logic)
│   ├── addresses/models.py       # Reusable abstract Address mixin
│   ├── owners/models.py          # Owner model (inherits Address)
│   ├── pets/models.py            # Pet model + is_compatible_with()
│   ├── schedules/models.py       # Schedule model + check_conflicts() + get_overlapping_schedules()
│   ├── vaccinations/models.py    # VaccinationType + Vaccination models
│   ├── documents/models.py       # Document model
│   ├── notes/models.py           # Abstract Note + MedicalNote models
│   └── files/validators.py       # validate_file_size, validate_image_type, validate_document_type
├── pets/                         # Django app: re-exports domain models, hosts views/serializers/URLs
│   ├── models.py                 # Re-exports: Owner, Pet, VaccinationType, Vaccination, Schedule, Document, MedicalNote
│   ├── views.py                  # OwnerViewSet, PetViewSet, ScheduleViewSet, VaccinationTypeViewSet,
│   │                             #   DocumentViewSet, MedicalNoteViewSet, get_translations, get_available_languages
│   ├── serializers.py            # All serializers for pets, owners, schedules, vaccinations, documents, notes
│   ├── urls.py                   # DRF router + translation endpoints
│   ├── validators.py             # Additional field validators
│   ├── admin.py                  # Django admin registrations
│   └── tests/                    # test_pet_api.py, test_owner_api.py, test_schedule_api.py, test_models.py, etc.
├── accounts/                     # Django app: custom User model + auth views
│   ├── models.py                 # User (email as USERNAME_FIELD, no username, roles: admin/user)
│   ├── views.py                  # RegisterView, LoginView, LogoutView, ProfileView, ChangePasswordView, UserViewSet
│   ├── serializers.py            # UserSerializer, UserCreateSerializer, LoginSerializer, etc.
│   ├── permissions.py            # IsAdmin, IsAdminOrReadOnly, IsOwnerOrAdmin, IsAuthenticated
│   ├── urls.py                   # Auth routes + user management router
│   └── tests/
├── nursery_settings/             # Django app: singleton NurserySetting
│   ├── models.py                 # NurserySetting (daily_booking_limit, logo, always pk=1)
│   ├── views.py                  # get/update settings + upload_logo/delete_logo (function-based views)
│   ├── serializers.py            # NurserySettingSerializer (includes logo_url)
│   ├── urls.py                   # /api/settings/, /api/settings/update/, /api/settings/upload_logo/, /api/settings/delete_logo/
│   └── tests.py                  # NurserySettingModelTest, NurserySettingAPITest, SystemLogoAPITest, DailyCountAPITest
├── translations/                 # JSON i18n files
│   ├── en.json                   # English translations
│   └── es.json                   # Spanish translations
├── requirements.txt
├── manage.py
└── Dockerfile
```

### Architectural Pattern

The project separates **domain models** from **Django app logic**:

- **`domain/`** contains pure model definitions with business logic methods (e.g., `is_compatible_with()`, `check_conflicts()`). Every model in `domain/` uses `app_label = 'pets'` in its `Meta` class so Django registers them under a single database namespace.
- **`pets/models.py`** re-exports all domain models (`Owner`, `Pet`, `VaccinationType`, `Vaccination`, `Schedule`, `Document`, `MedicalNote`), making them available as `pets.Owner`, `pets.Pet`, etc., for migrations, serializers, and views.
- **`accounts/`** manages its own `User` model independently.
- **`nursery_settings/`** manages a singleton configuration record.

---

## Data Models

### User (`accounts/models.py`)

Extends `AbstractUser`. Uses **email** as the login identifier; the `username` field is explicitly removed.

| Field | Type | Details |
|---|---|---|
| `username` | — | Set to `None` (removed from AbstractUser) |
| `email` | `EmailField` | **unique**, `USERNAME_FIELD` |
| `role` | `CharField(10)` | Choices: `admin`, `user`. Default: `user` |
| `first_name` | `CharField(150)` | Inherited from AbstractUser |
| `last_name` | `CharField(150)` | Inherited from AbstractUser |
| `created_at` | `DateTimeField` | `auto_now_add=True` |
| `updated_at` | `DateTimeField` | `auto_now=True` |

- **`REQUIRED_FIELDS`**: `first_name`, `last_name`
- **Properties**: `full_name` (returns combined name), `is_admin` (returns `self.role == 'admin'`)

---

### Address (reusable abstract model) (`domain/addresses/models.py`)

An **abstract Django model** that any concrete model can inherit to add a structured postal address. Since `Meta: abstract = True`, Django creates no standalone table — the columns are contributed to each subclass's own table.

| Field | Type | Spanish label | Details |
|---|---|---|---|
| `street` | `CharField(255)` | *Dirección* | Street address line |
| `city` | `CharField(100)` | *Ciudad* | — |
| `state` | `CharField(100)` | *Localidad* | — |
| `province` | `CharField(100)` | *Provincia* | — |
| `country` | `CharField(100)` | *País* | — |

All fields are optional (`blank=True`, default empty string). Spanish labels are carried by the frontend i18n layer via `owner.street`, `owner.city`, `owner.state`, `owner.province`, `owner.country` translation keys.

**Usage:**

```python
from domain.addresses.models import Address

class Branch(Address, models.Model):
    name = models.CharField(max_length=100)
    # street, city, state, province, country are inherited
```

Currently consumed by `Owner`. Any future entity that needs an address (branches, vendors, veterinarians) can inherit without code duplication.

---

### Owner (`domain/owners/models.py`)

Represents a pet owner. Inherits from the [`Address` mixin](#address-reusable-abstract-model-domainaddressesmodelspy) for structured postal address. `Meta: app_label = 'pets'`, ordered by `last_name, first_name`.

| Field | Type | Details |
|---|---|---|
| `first_name` | `CharField(100)` | Required |
| `last_name` | `CharField(100)` | Required |
| `email` | `EmailField` | **unique** |
| `phone` | `CharField(20)` | Required |
| `id_number` | `CharField(20)` | **unique**, optional — DNI/national ID |
| `street` | `CharField(255)` | Optional — street address line (from `Address` mixin) |
| `city` | `CharField(100)` | Optional — *ciudad* (from `Address` mixin) |
| `state` | `CharField(100)` | Optional — *localidad* (from `Address` mixin) |
| `province` | `CharField(100)` | Optional — *provincia* (from `Address` mixin) |
| `country` | `CharField(100)` | Optional — *país* (from `Address` mixin) |
| `birth_date` | `DateField` | Optional |
| `emergency_contact` | `CharField(100)` | Optional |
| `emergency_phone` | `CharField(20)` | Optional |
| `emergency_contact_can_pickup` | `BooleanField` | Default: `False` |
| `notes` | `TextField` | Optional |
| `profile_picture` | `ImageField` | `upload_to='profile_pictures/owners/'`, max 5 MB, JPEG/PNG/GIF/WEBP |
| `created_at` | `DateTimeField` | `auto_now_add=True` |
| `updated_at` | `DateTimeField` | `auto_now=True` |

- **Property**: `full_name`

---

### Pet (`domain/pets/models.py`)

Represents a pet in the nursery. `Meta: app_label = 'pets'`.

| Field | Type | Details |
|---|---|---|
| `name` | `CharField(100)` | Required |
| `species` | `CharField(20)` | Choices: `dog`, `cat`, `bird`, `rabbit`, `other` |
| `breed` | `CharField(100)` | Optional |
| `age` | `PositiveIntegerField` | Age in years |
| `temperament` | `CharField(20)` | Choices: `calm`, `playful`, `aggressive`, `anxious`, `friendly` |
| `dominance_level` | `IntegerField` | Validators: `MinValueValidator(1)`, `MaxValueValidator(10)` |
| `size` | `CharField(10)` | Choices: `small`, `medium`, `large` |
| `neutered` | `BooleanField` | Default: `False` |
| `sex` | `CharField(10)` | Choices: `male`, `female` |
| `birth_date` | `DateField` | Optional |
| `weight` | `DecimalField(6,2)` | Optional, in kg |
| `last_internal_deworming_date` | `DateField` | Optional. Surfaced in the UI behind the `deworming_tracking` feature flag; the API always accepts and persists the value regardless of the flag. |
| `last_external_deworming_date` | `DateField` | Optional. Same flag-gated UI / always-persisted contract as `last_internal_deworming_date`. |
| `special_notes` | `TextField` | Optional |
| `owner` | `ForeignKey -> Owner` | `CASCADE`, optional |
| `profile_picture` | `ImageField` | `upload_to='profile_pictures/pets/'`, max 5 MB |
| `created_at` | `DateTimeField` | `auto_now_add=True` |
| `updated_at` | `DateTimeField` | `auto_now=True` |

- **Method**: `is_compatible_with(other_pet)` → `(bool, str)` — Runs the 5-rule compatibility algorithm (see [Conflict Detection](#conflict-detection-system) below).

---

### Schedule (`domain/schedules/models.py`)

Represents a booking. Supports **multi-day** stays with separate date and time fields. `Meta: app_label = 'pets'`.

| Field | Type | Details |
|---|---|---|
| `pet` | `ForeignKey -> Pet` | `CASCADE` |
| `start_date` | `DateField` | Start of the stay |
| `end_date` | `DateField` | End of the stay (supports multi-day) |
| `start_time` | `TimeField` | Check-in time |
| `end_time` | `TimeField` | Check-out time |
| `status` | `CharField(20)` | Choices: `scheduled`, `checked_in`, `completed`, `cancelled` |
| `notes` | `TextField` | Optional |
| `created_at` | `DateTimeField` | `auto_now_add=True` |
| `updated_at` | `DateTimeField` | `auto_now=True` |

- **Method**: `get_overlapping_schedules()` — Returns queryset of schedules that overlap with this schedule's date/time range.
- **Method**: `check_conflicts()` — Uses `get_overlapping_schedules()` to find all pets present during this schedule and runs `is_compatible_with()` against each one. Returns conflict warnings.

---

### VaccinationType (`domain/vaccinations/models.py`)

Catalog of available vaccination types.

| Field | Type | Details |
|---|---|---|
| `name` | `CharField` | **unique** |
| `label` | `CharField` | Display label |
| `enabled` | `BooleanField` | Whether this type is active |
| `order` | `IntegerField` | Sort order |

---

### Vaccination (`domain/vaccinations/models.py`)

Records a vaccination given to a pet.

| Field | Type | Details |
|---|---|---|
| `pet` | `ForeignKey -> Pet` | `CASCADE` |
| `vax_type` | `CharField` | Vaccination type name (stored as string, **not** a FK to VaccinationType) |
| `date` | `DateField` | Date of vaccination |

---

### Document (`domain/documents/models.py`)

File attachments for pets or owners.

| Field | Type | Details |
|---|---|---|
| `pet` | `ForeignKey -> Pet` | Optional |
| `owner` | `ForeignKey -> Owner` | Optional |
| `file` | `FileField` | `upload_to='documents/%Y/%m/'` |
| `original_filename` | `CharField` | Original file name at upload time |
| `description` | `TextField` | Optional |
| `uploaded_at` | `DateTimeField` | `auto_now_add=True` |

**Validation**: A document must belong to either a `pet` OR an `owner`, but not both and not neither.

---

### Note (abstract) and MedicalNote (`domain/notes/models.py`)

| Field | Type | Details |
|---|---|---|
| `title` | `CharField` | Required |
| `description` | `TextField` | Required |
| `created_at` | `DateTimeField` | `auto_now_add=True` |
| `updated_at` | `DateTimeField` | `auto_now=True` |

`Note` is an **abstract** model. `MedicalNote` extends it and adds:

| Field | Type | Details |
|---|---|---|
| `pet` | `ForeignKey -> Pet` | `CASCADE` |

---

### NurserySetting (`nursery_settings/models.py`)

A **singleton** configuration record (pk is always forced to `1` in `save()`).

| Field | Type | Details |
|---|---|---|
| `daily_booking_limit` | `PositiveIntegerField` | Default: `0` (0 = unlimited) |
| `logo` | `ImageField` | Upload to `logos/`, max 5 MB, JPEG/PNG/GIF/WEBP. Optional. Used for login page and navbar branding. |

- **Class method**: `load()` — Returns the singleton instance, creating it if it doesn't exist.
- **Serializer**: `NurserySettingSerializer` exposes `daily_booking_limit`, `logo_url` (computed), `updated_at`.

---

## File Upload & Validation

Validators are defined in `domain/files/validators.py`:

- **`validate_file_size`**: Rejects files larger than **5 MB** (`MAX_UPLOAD_SIZE` from settings).
- **`validate_image_type`**: Accepts JPEG, PNG, GIF, WEBP.
- **`validate_document_type`**: Accepts images (JPEG, PNG, GIF, WEBP) plus PDF, DOC, DOCX.

Type validation is **content-based**: the validators sniff the file's real MIME type from its magic bytes via `python-magic`/libmagic (a bounded 2048-byte read, rewound so the save still writes the file), rather than trusting the client-supplied `Content-Type`. A file whose bytes don't match an allowed type is rejected even if it claims to be an image; libmagic's generic container types are mapped back to the canonical Office MIMEs so genuine `.doc`/`.docx` uploads pass.

Profile pictures (Owner and Pet) use `validate_image_type`. Documents use `validate_document_type`. The system logo also uses `validate_image_type`.

### Multipart Create/Update

Both `PetViewSet` and `OwnerViewSet` accept `multipart/form-data` on create and update endpoints, allowing a profile picture to be uploaded alongside other fields in a single request. JSON requests (without files) are still supported for backward compatibility.

For pets, nested vaccinations data is sent as a JSON string field within the multipart form data and parsed back to a list on the server side.

---

## Conflict Detection System

Compatibility logic lives in `Pet.is_compatible_with(other_pet)` on the domain model. It returns a tuple `(bool, str)` — a boolean for compatible/incompatible and a reason string.

### The 5 Rules

| # | Rule | Condition | Result |
|---|---|---|---|
| 1 | **Aggressive pet** | Either pet has `temperament == 'aggressive'` | Incompatible |
| 2 | **High dominance pair** | Both pets have `dominance_level > 7` | Incompatible |
| 3 | **Size + dominance gap** | `size_diff >= 2` AND `dominance_diff >= 5` | Incompatible |
| 4 | **Cross-species temperament** | Different species AND temperament pair is (`aggressive`, `anxious`) or (`aggressive`, `calm`) | Incompatible |
| 5 | **Anxious + playful** | One `anxious` + one `playful` AND `dominance_diff > 4` | Incompatible |
| — | **Default** | None of the above triggered | Compatible |

**Size ordering** for Rule 3: `small = 1`, `medium = 2`, `large = 3`. Size diff and dominance diff are absolute values.

### How Conflicts Surface

- **`Schedule.check_conflicts()`** finds all overlapping schedules via `get_overlapping_schedules()`, then runs `is_compatible_with()` for each pair.
- **`ScheduleSerializer`** includes a computed `conflicts` field that calls `check_conflicts()` on every read, so the frontend always sees current conflict data.
- **Conflicts are NON-BLOCKING**: schedules are **always created** regardless of conflicts. The API returns conflict information as **warnings**, not errors. The frontend can display these warnings but the booking is never rejected based on compatibility.
- **Conflict warnings carry i18n keys**, not raw English text. Each warning is `(rule_key, kwargs)` (e.g. `('pet.compat.aggressive', {'pet_a': 'Bandit', 'pet_b': 'Luna'})`); the frontend resolves the key against the active translation table.

---

## Audit Log

The backend wires `django-simple-history` against every domain model so every create/update/delete is captured with author, timestamp, and field-level diff:

- **Tracked models**: `Pet`, `Owner`, `MedicalNote`, `Vaccination`, `Document`, `Schedule`, `Vet`, `NurserySetting`, `FeatureFlag`.
- **History table** lives next to the original (e.g. `pets_historicalpet`) and is populated by signal-driven middleware (`audit_log/middleware.py`) that resolves the request user via JWT.
- **Per-entity history endpoints** are provided by `audit_log.views.HistoryViewSetMixin`; the route pattern is `<entity>/<id>/history/` (`/api/pets/<id>/history/`, `/api/owners/<id>/history/`, etc.). Each event in the response includes `id`, `history_type` (one of `+`, `~`, `-` for create/update/delete), `history_user`, `history_date`, and a `changes` array describing field-level deltas.
- **Cross-entity feed endpoint**: `GET /api/audit/activity/?since=<iso>&entity=<name>&action=<+|~|->&user=<id>&page=<n>` powers the admin activity timeline (`/admin/activity` on the frontend). Admin-only.
- **Out of scope of the audit trail**: user account changes (handled by Django's auth signals), data-portability imports (logged via the export manifest), and the audit log itself.

---

## Notifications

Daily reminder system implemented in the `notifications/` app:

- **Model**: `Notification` (per-user) with fields `user`, `kind`, `title`, `body`, `payload` (JSON), `read_at`, `forwarded_at`, `created_at`. Also `NotificationCron` (singleton) holds the configured run-time.
- **Generator**: `python manage.py generate_notifications` queries today's schedules, picks the active staff users (`is_active=True`, `last_login` within `NOTIFICATIONS_ACTIVE_USER_WINDOW_DAYS = 30` of today), and writes one `Notification` row per (user × event). The command is idempotent — re-running on the same day creates no duplicates because rows are upserted by `(user, kind, payload_signature, date)`.
- **Cron service**: `notification-cron` (Compose) is a long-running scheduler that polls `NotificationCron.run_time` once a minute and fires the management command when the wall clock matches. Sharing the backend image keeps the model and translation imports identical.
- **Email delivery**: when `EMAIL_BACKEND` is the SMTP backend, the generator also sends emails to each user. The default is `django.core.mail.backends.console.EmailBackend`; the cron emits a one-shot warning at startup if it boots with the console backend AND the `notifications` flag is on, so silent prod-on-stdout isn't invisible.
- **Endpoints**:
    - `GET /api/notifications/` — list current user's notifications (paginated, newest first).
    - `POST /api/notifications/<id>/mark_read/` — flip `read_at` to now.
    - `POST /api/notifications/<id>/forward/` — set `forwarded_at` and bump the bell-icon counter for the *other* staff users (so they see the message has already been passed along).
    - `GET /api/notifications/unread_count/` — minimal endpoint for the bell badge.
- **Feature-flag gating**: when the `notifications` flag is off, the cron skips its tick and the frontend hides the bell icon and `/notifications` page. Existing rows are preserved.

---

## Feature Flags

Runtime toggles backed by a small singleton-style table:

- **Model**: `FeatureFlag` with fields `key`, `enabled` (bool), `description`, `updated_at`. Seeded by data migration; new flags land via subsequent migrations.
- **Endpoints**:
    - `GET /api/feature-flags/` — `AllowAny` (the login page must read the catalogue to display only the languages a deployment serves).
    - `PATCH /api/feature-flags/<key>/` — admin-only; toggles the `enabled` field.
- **Seeded flags**: `multiday_schedule`, `custom_pet_species`, `vet_management`, `medical_notes`, `data_backup`, `compatibility_warnings`, `notifications`, `ui_system`, `activity_logs`, `deworming_tracking`. Each flag's effect is documented in `openspec/specs/backend/feature-flags/spec.md`.
- **Gating contract**: flags hide UI surfaces but **never remove tables, migrations, or endpoints**. Toggling is a single DB write, not a redeploy.

---

## Data Portability

JSON / ZIP export + atomic import for the operator's own data:

- `GET /api/data-portability/export/` — JSON manifest + every domain row as a flat object. Auth required.
- `GET /api/data-portability/export/?format=zip` — same as above plus the entire `media/` directory zipped in.
- `POST /api/data-portability/import/` — multipart upload of a JSON or ZIP. The whole import runs inside a single `transaction.atomic()`; any per-row error rolls back the entire operation. Returns a per-entity counter so the operator can verify what arrived.
- **Scope**: domain data only — owners, pets, schedules, vets, vaccinations, medical notes, documents, settings, feature flags. User accounts and the audit history are explicitly **excluded** (a backup of the data, not of the runtime state).

---

## File Storage

The backend's file storage backend is environment-driven so the same image runs against three modes:

- **Filesystem (default)**: `django.core.files.storage.FileSystemStorage` writes to `MEDIA_ROOT = backend/media/`. Static asset behavior unchanged.
- **S3-compatible (opt-in)**: when `S3_ENDPOINT_URL` + `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` + `S3_BUCKET_NAME` are all set + non-empty, `STORAGES['default']` is rewired to `storages.backends.s3boto3.S3Boto3Storage` (from `django-storages[s3]`). Optional knobs: `S3_PUBLIC_ENDPOINT_URL` for behind-Traefik public URLs, `S3_REGION_NAME`, `S3_ADDRESSING_STYLE` (`path` for Garage/MinIO, `virtual` for AWS), `S3_QUERYSTRING_AUTH` (presigned URLs).
- **Bundled Garage**: `docker compose --profile s3 up -d garage` brings up a single-node Garage 1.0.1 instance on the `proxy` network. `make s3-init` provisions bucket + key idempotently using the bundled `garage` CLI (the script handles the one-shot `layout assign` step Garage 1.0 requires before any bucket op works).
- **Half-applied config**: when only some `S3_*` vars are set, the backend falls back to filesystem and emits a startup warning naming the missing var. This is enforced in `_build_storages_config()` (`backend/nursery/settings.py:117`).

The same `Pet.profile_picture`, `Document.file`, `NurserySetting.logo`, etc. fields work transparently across all three modes — there's one storage abstraction.

---

## API Endpoints

### Owners — `/api/owners/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/owners/` | List all owners |
| `POST` | `/api/owners/` | Create an owner |
| `GET` | `/api/owners/{id}/` | Retrieve owner (includes pets list via `OwnerWithPetsSerializer`) |
| `PATCH` | `/api/owners/{id}/` | Partial update |
| `PUT` | `/api/owners/{id}/` | Full update |
| `DELETE` | `/api/owners/{id}/` | Delete owner |
| `GET` | `/api/owners/dropdown/` | Minimal list for dropdown selectors (`OwnerListSerializer`) |
| `POST` | `/api/owners/{id}/upload_profile_picture/` | Upload profile picture (multipart) |
| `DELETE` | `/api/owners/{id}/delete_profile_picture/` | Remove profile picture |

### Pets — `/api/pets/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pets/` | List all pets |
| `POST` | `/api/pets/` | Create pet (supports nested `vaccinations` array) |
| `GET` | `/api/pets/{id}/` | Retrieve pet details |
| `PATCH` | `/api/pets/{id}/` | Partial update |
| `PUT` | `/api/pets/{id}/` | Full update |
| `DELETE` | `/api/pets/{id}/` | Delete pet (cascades to schedules) |
| `GET` | `/api/pets/{id}/compatibility/` | Check compatibility with other scheduled pets |
| `POST` | `/api/pets/{id}/upload_profile_picture/` | Upload profile picture |
| `DELETE` | `/api/pets/{id}/delete_profile_picture/` | Remove profile picture |

### Schedules — `/api/schedules/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/schedules/` | List schedules. **Filters**: `date`, `start_date`, `end_date`, `pet_id`, `status` |
| `POST` | `/api/schedules/` | Create schedule (returns conflict warnings in response) |
| `GET` | `/api/schedules/{id}/` | Retrieve schedule detail |
| `PATCH` | `/api/schedules/{id}/` | Partial update |
| `PUT` | `/api/schedules/{id}/` | Full update |
| `DELETE` | `/api/schedules/{id}/` | Delete schedule |
| `POST` | `/api/schedules/check_conflicts/` | Pre-flight conflict check. Accepts `pet_id`, dates, times, optional `exclude_schedule_id` |
| `GET` | `/api/schedules/daily_summary/?date=YYYY-MM-DD` | Summary of all schedules for a given day |
| `GET` | `/api/schedules/daily_count/?date=YYYY-MM-DD` | Returns `count`, `limit`, `limit_reached`, `limit_exceeded` |
| `POST` | `/api/schedules/batch_create/` | Create schedules for multiple pets at once (`pet_ids` list + shared schedule fields) |

### Vaccination Types — `/api/vaccination-types/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/vaccination-types/` | List all vaccination types |
| `POST` | `/api/vaccination-types/` | Create vaccination type |
| `GET` | `/api/vaccination-types/{id}/` | Retrieve |
| `PATCH` | `/api/vaccination-types/{id}/` | Update |
| `PUT` | `/api/vaccination-types/{id}/` | Full update |
| `DELETE` | `/api/vaccination-types/{id}/` | Delete |

### Documents — `/api/documents/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/documents/` | List documents. **Filters**: `pet_id`, `owner_id` |
| `POST` | `/api/documents/` | Upload document (multipart form data) |
| `DELETE` | `/api/documents/{id}/` | Delete document |

### Medical Notes — `/api/medical-notes/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/medical-notes/` | List medical notes. **Filter**: `pet_id` |
| `POST` | `/api/medical-notes/` | Create medical note |
| `PATCH` | `/api/medical-notes/{id}/` | Partial update |
| `PUT` | `/api/medical-notes/{id}/` | Full update |
| `DELETE` | `/api/medical-notes/{id}/` | Delete |

### Authentication — `/api/auth/`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register/` | Register new user |
| `POST` | `/api/auth/login/` | Login, returns access + refresh tokens |
| `POST` | `/api/auth/logout/` | Logout (blacklists refresh token) |
| `POST` | `/api/auth/refresh/` | Refresh access token |
| `GET` | `/api/auth/profile/` | Get current user profile |
| `PATCH` | `/api/auth/profile/` | Update current user profile |
| `PUT` | `/api/auth/change-password/` | Change password |

### User Management — `/api/users/` (admin only)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/` | List all users (filters: `role`, `is_active`, `search`) |
| `GET` | `/api/users/{id}/` | Get user details |
| `PATCH` | `/api/users/{id}/` | Update user (role, `is_active`, etc.) — promote/demote admin via the `role` field |
| `POST` | `/api/users/{id}/set_password/` | Admin password reset — sets a new password without requiring the current one |
| `DELETE` | `/api/users/{id}/` | Hard-delete user (UI requires typed confirmation; cascades to authored audit-log entries) |
| `GET` | `/api/users/me/` | Get current authenticated user |
| `POST` | `/api/users/bulk/deactivate/` | Bulk deactivate by `ids` array (operator may not deactivate themselves) |
| `POST` | `/api/users/bulk/reactivate/` | Bulk reactivate by `ids` array |
| `POST` | `/api/users/bulk/delete/` | Bulk delete by `ids` array (UI gates with typed confirmation) |

### Nursery Settings — `/api/settings/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings/` | Get nursery settings (daily booking limit, logo URL, logo shape) |
| `PUT` / `PATCH` | `/api/settings/update/` | Update nursery settings (including `logo_shape: 'square' \| 'circle'`) |
| `POST` | `/api/settings/upload_logo/` | Upload or replace system logo (multipart, JPEG/PNG/GIF/WEBP, max 5 MB) |
| `DELETE` | `/api/settings/delete_logo/` | Remove the current system logo |

### Feature Flags — `/api/feature-flags/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/feature-flags/` | List flag catalogue (`AllowAny` — login page must read this before sign-in) |
| `PATCH` | `/api/feature-flags/{key}/` | Toggle a flag's `enabled` field (admin only) |

### Notifications — `/api/notifications/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications/` | List the signed-in user's notifications, newest first |
| `GET` | `/api/notifications/unread_count/` | Bell-badge endpoint — returns `{count: N}` |
| `POST` | `/api/notifications/{id}/mark_read/` | Stamp `read_at = now()` |
| `POST` | `/api/notifications/{id}/forward/` | Stamp `forwarded_at` and signal sibling staff via the bell counter |

### Audit Log — `/api/audit/` and entity-scoped sub-routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audit/activity/` | Cross-entity timeline (admin only). Filters: `since`, `entity`, `action`, `user`, `page` |
| `GET` | `/api/{entity}/{id}/history/` | Per-entity history (works for `pets`, `owners`, `medical-notes`, `vaccinations`, `documents`, `schedules`, `vets`, `feature-flags`, `settings`) |

### Data Portability — `/api/data-portability/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/data-portability/export/` | JSON export (manifest + every domain row). Auth required. |
| `GET` | `/api/data-portability/export/?format=zip` | ZIP export (JSON + entire `media/` directory) |
| `POST` | `/api/data-portability/import/` | Atomic import — JSON or ZIP multipart body. Per-row errors rollback the whole transaction. |

### Translations

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/translations/{language}/` | Get translations for a specific language (e.g., `en`, `es`) |
| `GET` | `/api/translations/` | Get default translations |
| `GET` | `/api/languages/` | Get list of available languages |

### API Documentation

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/schema/` | OpenAPI 3 schema (YAML) |
| `GET` | `/api/docs/` | Swagger UI |
| `GET` | `/api/redoc/` | ReDoc |

---

## Key Serializers

### PetSerializer

- Includes **nested vaccinations** array. On create/update, vaccinations are replaced atomically using `@transaction.atomic` (replace-all strategy: existing vaccinations are deleted and re-created from the submitted list).
- Read fields: `owner_details` (nested owner info), `profile_picture_url`, `medical_notes_count`.
- Validates `dominance_level` range (1–10).

### OwnerSerializer

- Includes computed `pet_count` and `profile_picture_url`.

### NurserySettingSerializer

- Exposes `daily_booking_limit`, `logo_url` (computed via `SerializerMethodField`), `updated_at`.
- `logo_url` builds an absolute URL from the request context, or returns `null` if no logo is set.

### ScheduleSerializer

- Read fields: `pet_details` (nested pet info), computed `conflicts` field.
- The `conflicts` field calls `check_conflicts()` on **every read**, ensuring conflict data is always fresh.

### ScheduleCreateSerializer

- Validates `start_time < end_time` and `start_date <= end_date`.

### BatchScheduleCreateSerializer

- Accepts a `pet_ids` list plus shared schedule fields (`start_date`, `end_date`, `start_time`, `end_time`, `status`, `notes`).
- Creates one schedule per pet in the list.

### ConflictCheckSerializer

- Used by the `check_conflicts/` endpoint for pre-flight checks.
- Fields: `pet_id`, `start_date`, `end_date`, `start_time`, `end_time`, optional `exclude_schedule_id` (to ignore a specific schedule when editing).

### DocumentSerializer

- Validates that exactly one of `pet` or `owner` is provided (not both, not neither).
- Captures `original_filename` from the uploaded file on creation.

### OwnerWithPetsSerializer

- Extends owner data to include the full `pets` list (used on owner detail retrieval).

### OwnerListSerializer

- Minimal fields for dropdown/select components.

---

## Authentication & Permissions

### JWT Configuration

| Setting | Value |
|---|---|
| Access token lifetime | 60 minutes |
| Refresh token lifetime | 7 days |
| Token rotation | Enabled (new refresh token on each refresh) |
| Blacklisting | Enabled (old refresh tokens blacklisted after rotation) |
| Auth header type | `Bearer` |
| Custom user model | `accounts.User` (`AUTH_USER_MODEL = 'accounts.User'`) |

### Permission Classes (`accounts/permissions.py`)

| Class | Logic |
|---|---|
| `IsAdmin` | Grants access only if `user.role == 'admin'` |
| `IsAdminOrReadOnly` | Authenticated users can read (safe methods); only admins can write |
| `IsOwnerOrAdmin` | Object-level: grants access if user is the object's owner or an admin |
| `IsAuthenticated` | Grants access if `user.is_authenticated` |

### Default Permission

The global DRF default is `AllowAny`. Individual views override this with the appropriate permission class (e.g., `UserViewSet` uses `IsAdmin`, auth endpoints use `AllowAny`, etc.).

---

## Django Settings Highlights

| Setting | Value |
|---|---|
| `AUTH_USER_MODEL` | `'accounts.User'` |
| `CORS_ALLOW_ALL_ORIGINS` | `True` (development configuration) |
| `MAX_UPLOAD_SIZE` | 5 MB |
| `ALLOWED_IMAGE_TYPES` | JPEG, PNG, GIF, WEBP |
| `ALLOWED_DOCUMENT_TYPES` | JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX |
| Default DRF permission | `AllowAny` (overridden per-view) |
| Default DRF schema class | `drf_spectacular.openapi.AutoSchema` |
| Database | PostgreSQL (env vars: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`) |
| Test database | SQLite in-memory (`nursery/test_settings.py`) |

---

## Internationalization

Translation files are stored as JSON in `backend/translations/`:

- `en.json` — English
- `es.json` — Spanish

The `get_translations` view in `pets/views.py` reads the requested JSON file and returns it as a response. The `get_available_languages` view returns the list of available language codes.

---

## Notifications

The `notifications/` app generates daily reminders for staff:

- **Vaccination due** — fired when `today >= last_vaccination + VaccinationType.due_after_days`. `due_after_days = 0` means non-recurring.
- **Deworming due** — fired when `today >= Pet.last_(internal|external)_deworming_date + NurserySetting.deworming_default_due_days`.
- **Pet birthday** — fired when `today.month == birth_date.month` and `today.day == birth_date.day`.
- **Arrival / egress today / tomorrow** — fired when a `Schedule` starts or ends on the matched date.

Each event materialises one `Notification` row per active staff user. A natural-key `UniqueConstraint` keeps the daily run idempotent; staff users can mark rows read or dismissed independently. The master `notifications` feature flag and per-kind `NurserySetting.notifications_*_enabled` toggles let operators turn the system on or off (or filter to a subset of kinds) at runtime.

Email delivery is staff-internal only. The forward-to-owner affordance is rendered by the frontend via `mailto:` and `api.whatsapp.com/send` deep links (the `api.whatsapp.com` endpoint is preferred over `wa.me` because it preserves emoji glyphs verbatim across iOS, Android, and desktop WhatsApp clients); subjects, bodies, and WhatsApp text come from operator-overridable `NotificationTemplate` rows (two scopes: `treatment_due`, `pet_birthday`) with localised defaults under `notifications.staff_email.*` in the translation files.

The `run_notification_scheduler` management command runs in its own `notification-cron` Docker Compose service. It polls every minute and calls `generate_notifications` exactly once per day, when wall-clock >= `NurserySetting.notifications_run_time`.

### Email delivery configuration

Real email delivery requires SMTP variables to be set in `.env`. The relevant variables — `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` — are documented inline in `.env.example` and prompted by `make env`. Defaults keep dev stacks on Django's stdout-only console backend so contributors can exercise the notifications flow without standing up an SMTP relay.

To avoid the silent-failure mode where a production deployment turns the `notifications` flag on but forgets to switch off the console backend, the cron container emits a one-shot WARNING-level log line at startup whenever `EMAIL_BACKEND` ends with `.console.EmailBackend` AND the master `notifications` flag is enabled. Observability tooling can grep for that line as an alert.

---

## Security testing (`make security`)

The repo ships an OWASP-Top-10-aligned security suite at `make security`. It runs five scanners in sequence and aggregates their output into a single Markdown report at `security-reports/REPORT.md`:

| Tool | Scope | OWASP categories |
|---|---|---|
| `bandit` | Python static analysis on `backend/` | A02 (weak crypto), A03 (injection), A05 (misconfig), A08 (deserialisation), A10 (SSRF — partial) |
| `pip-audit` | CVE check on `backend/requirements.txt` | A06 (vulnerable deps) |
| `npm audit` | CVE check on `frontend/package.json` | A06 (vulnerable deps) |
| `manage.py check --deploy` | Django framework misconfiguration with `DEBUG=False` | A02 (cookie/SSL flags), A05 (HSTS, debug, etc.) |
| `python manage.py test security_tests` | Custom Django suite walking every viewset and asserting auth/integrity invariants | A01 (access control), A07 (auth posture), A08 (file upload validators), A09 (audit log), A10 (no outbound HTTP without an allowlist) |

Findings are normalised to one of three severities — `critical`, `warning`, `info` — and grouped by OWASP category in the report. The target exits non-zero when any finding is `critical`, so it can gate releases or CI runs.

Each invocation creates a timestamped subdirectory under `security-reports/` (e.g. `security-reports/2026-04-27-114740/`) and writes every per-tool artefact plus the aggregated `REPORT.md` into it, so multiple runs co-exist for diffing. A `security-reports/latest` symlink always points at the most recent run, so `cat security-reports/latest/REPORT.md` is stable across runs.

The most recent 10 runs are retained by default; older runs are auto-trimmed at the end of each scan. Override via the `SECURITY_REPORT_KEEP` environment variable (e.g. `SECURITY_REPORT_KEEP=30 make security`); set `SECURITY_REPORT_KEEP=0` to disable trimming entirely.

The `security-reports/` directory itself is tracked via `.gitkeep`; per-run subdirectories and their contents are gitignored so the report history is local-only and a fresh clone always has a place for the next run to land.

A04 (Insecure Design) has no automated coverage in this suite — it's a process discipline that lives outside the scanner. The report's A04 section explicitly names this gap so silent acceptance can't be inferred.

---

## Testing

Tests are organized per-app:

- **`pets/tests/`**: `test_pet_api.py`, `test_owner_api.py`, `test_schedule_api.py`, `test_models.py`, and others.
- **`accounts/tests/`**: Auth and user management tests.
- **`nursery_settings/tests.py`**: `NurserySettingModelTest` (singleton behavior), `NurserySettingAPITest` (get/update settings), `SystemLogoAPITest` (11 tests: upload, replace, reject invalid files, delete, retrieval, singleton integrity), `DailyCountAPITest` (daily count + limit checks).

Tests for multipart avatar upload are included in `test_pet_api.py` and `test_owner_api.py` (create with profile_picture, create with picture + vaccinations, JSON backward compatibility).

The test runner uses `nursery/test_settings.py`, which configures **SQLite in-memory** for fast, isolated test execution without requiring a PostgreSQL instance.

---

## Deployment

The backend includes a `Dockerfile` for containerized deployment. In production the application is served by **Gunicorn** bound to the `nursery.wsgi` application.

### Environment Variables

| Variable | Purpose |
|---|---|
| `DEBUG` | Enable/disable debug mode |
| `DJANGO_SECRET_KEY` | Django secret key |
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_HOST` | Database host |
| `POSTGRES_PORT` | Database port |
