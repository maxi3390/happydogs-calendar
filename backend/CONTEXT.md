# Backend Context

Django 5.1 REST API for the Happy Pet Nursery system.

---

## Directory Structure

```
backend/
├── nursery/                  # Django project package (settings, root URLs, WSGI)
│   ├── settings.py           # Main settings (reads env vars)
│   ├── test_settings.py      # Overrides DB to SQLite in-memory for tests
│   ├── urls.py               # Root URL config
│   └── wsgi.py
├── domain/                   # Pure domain models (no Django app logic)
│   ├── owners/models.py      # Owner model
│   ├── pets/models.py        # Pet model + is_compatible_with()
│   ├── schedules/models.py   # Schedule model + check_conflicts()
│   ├── vaccinations/models.py# VaccinationType + Vaccination models
│   ├── documents/models.py   # Document model
│   └── files/validators.py   # File size and MIME-type validators
├── pets/                     # Django app: re-exports domain models, hosts views/serializers/URLs
│   ├── models.py             # Re-exports all domain models via __all__
│   ├── views.py              # ViewSets and function-based views
│   ├── serializers.py        # DRF serializers
│   ├── urls.py               # Router + translation endpoints
│   ├── admin.py
│   └── migrations/
├── accounts/                 # Django app: custom User model + auth views
│   ├── models.py             # User (email-based, roles: admin/user)
│   ├── views.py              # Register, Login, Logout, Profile, ChangePassword, UserViewSet
│   ├── serializers.py
│   ├── urls.py
│   └── migrations/
├── nursery_settings/         # Django app: singleton NurserySetting
│   ├── models.py             # NurserySetting (daily_booking_limit, logo, always pk=1)
│   ├── views.py              # GET/PUT settings + POST upload_logo + DELETE delete_logo
│   ├── serializers.py        # NurserySettingSerializer (includes logo_url)
│   ├── urls.py               # /api/settings/, /settings/update/, /settings/upload_logo/, /settings/delete_logo/
│   ├── tests.py              # NurserySettingModelTest, NurserySettingAPITest, SystemLogoAPITest, DailyCountAPITest
│   └── migrations/
├── translations/             # JSON i18n files served via API
│   ├── en.json
│   └── es.json
├── tests/                    # Project-level test directory
├── manage.py
├── requirements.txt
└── Dockerfile
```

---

## Domain Model Architecture

Models live under `backend/domain/` and are **re-exported** through the `pets` Django app (all set `app_label = 'pets'`). This means all migrations belong to the `pets` app even though model source files are in `domain/`.

### Owner (`domain/owners/models.py`)
| Field               | Type           | Notes                                      |
|---------------------|----------------|--------------------------------------------|
| `first_name`        | CharField(100) |                                            |
| `last_name`         | CharField(100) | Ordered by last_name, first_name           |
| `email`             | EmailField     | Unique                                     |
| `phone`             | CharField(20)  |                                            |
| `address`           | TextField      | Optional                                   |
| `emergency_contact` | CharField(100) | Optional                                   |
| `emergency_phone`   | CharField(20)  | Optional                                   |
| `notes`             | TextField      | Optional                                   |
| `profile_picture`   | ImageField     | Uploaded to `profile_pictures/owners/`. Max 5 MB; JPEG/PNG/GIF/WEBP only. |
| `created_at`        | DateTimeField  | auto_now_add                               |
| `updated_at`        | DateTimeField  | auto_now                                   |

Property: `full_name` → `"{first_name} {last_name}"`

### Pet (`domain/pets/models.py`)
| Field             | Type          | Choices / Constraints                         |
|-------------------|---------------|-----------------------------------------------|
| `name`            | CharField(100)|                                               |
| `species`         | CharField(20) | dog, cat, bird, rabbit, other                 |
| `breed`           | CharField(100)| Optional                                      |
| `age`             | PositiveInt   | In years                                      |
| `temperament`     | CharField(20) | calm, playful, aggressive, anxious, friendly  |
| `dominance_level` | IntegerField  | 1–10 (validated)                              |
| `size`            | CharField(10) | small, medium, large                          |
| `neutered`        | BooleanField  | Default False                                 |
| `sex`             | CharField(10) | male, female                                  |
| `birth_date`      | DateField     | Optional                                      |
| `weight`          | DecimalField(6,2) | Optional — Weight in kg                    |
| `special_notes`   | TextField     | Optional                                      |
| `owner`           | FK → Owner    | CASCADE delete; optional (null/blank)         |
| `profile_picture` | ImageField    | Uploaded to `profile_pictures/pets/`. Max 5 MB; JPEG/PNG/GIF/WEBP only. |

Method: `is_compatible_with(other_pet) → (bool, str)` — implements the 5 conflict detection rules (see root `CONTEXT.md`).

### Schedule (`domain/schedules/models.py`)
| Field        | Type          | Notes                                                   |
|--------------|---------------|---------------------------------------------------------|
| `pet`        | FK → Pet      | CASCADE delete                                          |
| `start_date` | DateField     |                                                         |
| `end_date`   | DateField     | Can span multiple days                                  |
| `start_time` | TimeField     |                                                         |
| `end_time`   | TimeField     |                                                         |
| `status`     | CharField(20) | scheduled, checked_in, completed, cancelled             |
| `notes`      | TextField     | Optional                                                |

Methods:
- `get_overlapping_schedules()` — returns Schedules that overlap this one's date range and time slot (status: scheduled or checked_in only).
- `check_conflicts()` — calls `get_overlapping_schedules()` then `pet.is_compatible_with()` for each; returns a list of conflict dicts.

### VaccinationType (`domain/vaccinations/models.py`)
Configurable vaccination type with `name` (internal key), `label` (display), `enabled`, `order`.

### Vaccination (`domain/vaccinations/models.py`)
Links a `Pet` to a vaccination record: `vax_type` (CharField, not FK — free-text key), `date`.

### Document (`domain/documents/models.py`)
Attached to **either** a `Pet` or an `Owner` (not both, enforced in `clean()`). File stored under `documents/%Y/%m/`. Supported formats: JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX. Max 5 MB.

### NurserySetting (`nursery_settings/models.py`)
Singleton (always `pk=1`). Configurable fields: `daily_booking_limit` (PositiveInt, 0 = unlimited), `logo` (ImageField, upload to `logos/`, max 5 MB, JPEG/PNG/GIF/WEBP, optional). Use `NurserySetting.load()` to get the instance. Serializer exposes `logo_url` (computed absolute URL or null).

### User (`accounts/models.py`)
Custom `AbstractUser` with email as `USERNAME_FIELD` (no `username` field).
- Roles: `admin`, `user` (default).
- Properties: `full_name`, `is_admin`.
- `REQUIRED_FIELDS`: `first_name`, `last_name`.

---

## API Endpoints

All endpoints are under `/api/`. Routed via DRF `DefaultRouter` for ViewSets, plus manual paths.

### Owners — `/api/owners/`
| Method | Path                                        | Description                              |
|--------|---------------------------------------------|------------------------------------------|
| GET    | `/api/owners/`                              | List all owners                          |
| POST   | `/api/owners/`                              | Create owner                             |
| GET    | `/api/owners/{id}/`                         | Owner detail (includes pets list)        |
| PATCH  | `/api/owners/{id}/`                         | Partial update                           |
| PUT    | `/api/owners/{id}/`                         | Full update                              |
| DELETE | `/api/owners/{id}/`                         | Delete owner                             |
| GET    | `/api/owners/dropdown/`                     | Simplified list for dropdowns            |
| POST   | `/api/owners/{id}/upload_profile_picture/`  | Upload profile picture (multipart)       |
| DELETE | `/api/owners/{id}/delete_profile_picture/`  | Remove profile picture                   |

### Pets — `/api/pets/`
| Method | Path                                      | Description                             |
|--------|-------------------------------------------|-----------------------------------------|
| GET    | `/api/pets/`                              | List all pets                           |
| POST   | `/api/pets/`                              | Create pet (with optional vaccinations) |
| GET    | `/api/pets/{id}/`                         | Pet detail                              |
| PATCH  | `/api/pets/{id}/`                         | Partial update                          |
| PUT    | `/api/pets/{id}/`                         | Full update                             |
| DELETE | `/api/pets/{id}/`                         | Delete pet (cascades schedules)         |
| GET    | `/api/pets/{id}/compatibility/`           | Compatibility check vs all other pets   |
| POST   | `/api/pets/{id}/upload_profile_picture/`  | Upload profile picture (multipart)      |
| DELETE | `/api/pets/{id}/delete_profile_picture/`  | Remove profile picture                  |

### Schedules — `/api/schedules/`
| Method | Path                                 | Description                                                    |
|--------|--------------------------------------|----------------------------------------------------------------|
| GET    | `/api/schedules/`                    | List (filter: `date`, `start_date`, `end_date`, `pet_id`, `status`) |
| POST   | `/api/schedules/`                    | Create schedule (conflicts returned as `warnings` field)       |
| GET    | `/api/schedules/{id}/`               | Schedule detail                                                |
| PATCH  | `/api/schedules/{id}/`               | Partial update                                                 |
| PUT    | `/api/schedules/{id}/`               | Full update                                                    |
| DELETE | `/api/schedules/{id}/`               | Delete schedule                                                |
| POST   | `/api/schedules/check_conflicts/`    | Pre-flight conflict check (does not create)                    |
| GET    | `/api/schedules/daily_summary/`      | Summary for a date (`?date=YYYY-MM-DD`)                        |
| GET    | `/api/schedules/daily_count/`        | Count + limit check for a date (`?date=YYYY-MM-DD`)            |
| POST   | `/api/schedules/batch_create/`       | Create schedules for multiple pets with the same time slot     |

### Vaccination Types — `/api/vaccination-types/`
Standard CRUD ViewSet.

### Documents — `/api/documents/`
| Method | Path                  | Description                                     |
|--------|-----------------------|-------------------------------------------------|
| GET    | `/api/documents/`     | List (filter: `pet_id`, `owner_id`)             |
| POST   | `/api/documents/`     | Upload document (multipart/form-data)           |
| DELETE | `/api/documents/{id}/`| Delete document                                 |

### Medical Notes — `/api/medical-notes/`
| Method | Path                       | Description                          |
|--------|----------------------------|--------------------------------------|
| GET    | `/api/medical-notes/`      | List (filter: `pet_id`)             |
| POST   | `/api/medical-notes/`      | Create medical note                  |
| PATCH  | `/api/medical-notes/{id}/` | Partial update                       |
| PUT    | `/api/medical-notes/{id}/` | Full update                          |
| DELETE | `/api/medical-notes/{id}/` | Delete medical note                  |

### Authentication — `/api/auth/`
| Method | Path                         | Description                                    |
|--------|------------------------------|------------------------------------------------|
| POST   | `/api/auth/register/`        | Register; returns `{ user, tokens }`           |
| POST   | `/api/auth/login/`           | Login; returns `{ user, tokens }`              |
| POST   | `/api/auth/logout/`          | Blacklists refresh token                       |
| POST   | `/api/auth/refresh/`         | Refresh access token (simplejwt)               |
| GET    | `/api/auth/profile/`         | Current user profile                           |
| PATCH  | `/api/auth/profile/`         | Update profile                                 |
| PUT    | `/api/auth/change-password/` | Change password                                |

### Users (admin only) — `/api/users/`
| Method | Path               | Description                              |
|--------|--------------------|------------------------------------------|
| GET    | `/api/users/`      | List all users                           |
| GET    | `/api/users/{id}/` | User detail                              |
| PATCH  | `/api/users/{id}/` | Update user (role, status)               |
| DELETE | `/api/users/{id}/` | Delete user                              |
| GET    | `/api/users/me/`   | Current user info                        |

### Settings — `/api/settings/`
| Method      | Path                        | Description                   |
|-------------|-----------------------------|-------------------------------|
| GET         | `/api/settings/`            | Get nursery settings (includes logo_url) |
| PUT / PATCH | `/api/settings/update/`     | Update nursery settings       |
| POST        | `/api/settings/upload_logo/`| Upload or replace system logo (multipart) |
| DELETE      | `/api/settings/delete_logo/`| Remove the system logo        |

### Translations — `/api/translations/`
| Method | Path                           | Description                       |
|--------|--------------------------------|-----------------------------------|
| GET    | `/api/translations/{language}/`| Translations JSON for `en` or `es`|
| GET    | `/api/translations/`           | Default (English) translations    |
| GET    | `/api/languages/`              | Available language list            |

### API Documentation
| Path              | Tool          |
|-------------------|---------------|
| `/api/schema/`    | OpenAPI YAML  |
| `/api/docs/`      | Swagger UI    |
| `/api/redoc/`     | ReDoc         |

---

## Authentication & Permissions

- **Auth scheme**: JWT Bearer tokens via `djangorestframework-simplejwt`.
- **Access token lifetime**: 60 minutes.
- **Refresh token lifetime**: 7 days. Rotation + blacklisting enabled.
- **Default permission**: `AllowAny` (set globally in `REST_FRAMEWORK`). Individual views enforce their own permissions where needed.
- Auth state on the frontend is stored in `localStorage` under keys `auth_tokens` and `auth_user`.

---

## Settings Highlights (`nursery/settings.py`)

- `AUTH_USER_MODEL = 'accounts.User'`
- `CORS_ALLOW_ALL_ORIGINS = True` (dev configuration)
- `ALLOWED_HOSTS = ['*']` (dev configuration)
- `MAX_UPLOAD_SIZE = 5 MB`
- `ALLOWED_IMAGE_TYPES`: JPEG, PNG, GIF, WEBP
- `ALLOWED_DOCUMENT_TYPES`: images + PDF, DOC, DOCX
- Media files served under `/media/` in DEBUG mode.

---

## Serializers of Note

- `PetSerializer` — includes nested `vaccinations` (write: replace-all on update) and `owner_details`.
- `ScheduleSerializer` — includes computed `conflicts` field (calls `check_conflicts()` on every read).
- `ScheduleCreateSerializer` — validates `start_time < end_time` and `start_date <= end_date`.
- `BatchScheduleCreateSerializer` — accepts `pet_ids` list + shared schedule fields.
- `ConflictCheckSerializer` — used for pre-flight `/check_conflicts/` endpoint.
- `DocumentSerializer` — validates that a document is linked to a pet OR an owner, not both.
- `NurserySettingSerializer` — exposes `daily_booking_limit`, `logo_url` (computed), `updated_at`.

---

## ViewSet Parser Configuration

Both `PetViewSet` and `OwnerViewSet` use `parser_classes = [MultiPartParser, FormParser]`, allowing create and update endpoints to accept multipart/form-data (for profile picture upload alongside other fields) as well as JSON. For pets, nested vaccinations are sent as a JSON string within multipart form data and parsed on the server.

---

## Test Configuration

- Test settings: `nursery/test_settings.py` — overrides `DATABASES` to SQLite in-memory and uses `MD5PasswordHasher` for speed.
- `manage.py` auto-detects the `test` command and switches to `nursery.test_settings` automatically, so `--settings` is optional.
- Run via: `make test-backend` or `docker compose exec backend python manage.py test`.

---

## Dockerfile (backend)

- Base: `python:3.12-slim`
- Installs `postgresql-client` (for `pg_isready` health checks).
- Copies `requirements.txt`, installs deps, copies source.
- Default CMD: `python manage.py migrate && python manage.py runserver 0.0.0.0:8000`.
- In `docker-compose.yml` the `backend/` directory is mounted as a volume so source changes are reflected without rebuild.
`python manage.py migrate && python manage.py runserver 0.0.0.0:8000`.
- In `docker-compose.yml` the `backend/` directory is mounted as a volume so source changes are reflected without rebuild.
