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
| `GET` | `/api/users/` | List all users |
| `GET` | `/api/users/{id}/` | Get user details |
| `PATCH` | `/api/users/{id}/` | Update user (role, etc.) |
| `DELETE` | `/api/users/{id}/` | Delete user |
| `GET` | `/api/users/me/` | Get current authenticated user |

### Nursery Settings — `/api/settings/`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings/` | Get nursery settings (daily booking limit, logo URL) |
| `PUT` / `PATCH` | `/api/settings/update/` | Update nursery settings |
| `POST` | `/api/settings/upload_logo/` | Upload or replace system logo (multipart, JPEG/PNG/GIF/WEBP, max 5 MB) |
| `DELETE` | `/api/settings/delete_logo/` | Remove the current system logo |

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
