# Design: Nursery Settings & Configuration

## Technical Approach

The settings system covers two distinct concerns: **nursery configuration** (daily booking limits and other operational parameters) and **translations** (serving localized UI strings). NurserySetting uses a **singleton pattern** ensuring only one configuration record exists in the database. Translations are served as **static JSON files from disk**, not stored in the database. The system also integrates **drf-spectacular** for OpenAPI schema generation providing Swagger and ReDoc documentation.

## Architecture Decisions

### Decision: Singleton Pattern with pk=1 Enforcement

The `NurserySetting` model overrides `save()` to force `self.pk = 1`, ensuring only one record ever exists. A `load()` class method uses `get_or_create` to return the single instance, creating it with defaults if it doesn't exist.

**Why:** A nursery has exactly one set of operational settings. Multiple configuration records would create ambiguity — which one is "active"? The singleton pattern eliminates this entirely by construction.

**Alternatives considered:**
- *Django-constance or django-solo:* Third-party packages specifically for singleton settings models. They provide admin integration, caching, and type-safe access. However, they add dependencies for a simple use case — one model with a handful of fields. The overhead of learning and maintaining the package outweighs the benefit.
- *Environment variables / Django settings:* Store configuration in `settings.py` or `.env`. Appropriate for infrastructure settings (database URL, secret key) but not for business settings that non-developers need to change at runtime without redeployment.
- *Multiple NurserySetting records with an "active" flag:* Supports configuration versioning (keep old configs, activate new ones). Useful for auditing setting changes, but overkill for a small nursery.
- *JSON settings stored in a single TextField:* Maximum flexibility — any key-value pair without migrations. But no type safety, no validation, and no queryability.

**Tradeoffs:**
- The `pk=1` enforcement is a convention, not a database constraint. Code that bypasses `save()` (e.g., `bulk_create`, raw SQL) could create additional records. In practice, this won't happen because all access goes through `save()` and `load()`.
- **No audit trail for setting changes.** When `daily_booking_limit` changes from 20 to 25, the old value is lost. For a production system, a simple history table or django-simple-history integration would be advisable.
- The `load()` method's `get_or_create` issues a database query on every call. This could be cached (e.g., Django's cache framework with a short TTL), but for a single nursery with infrequent settings reads, the query overhead is negligible.

### Decision: daily_booking_limit Default 0 Means Unlimited

The `daily_booking_limit` field defaults to `0`, which the schedule system interprets as "no limit."

**Why:** Using 0 as "unlimited" is a common convention (e.g., Unix `ulimit`, Kubernetes resource limits). It avoids needing a separate boolean `has_limit` field and a nullable integer — a single integer field serves both purposes.

**Alternatives considered:**
- *Null means unlimited:* `daily_booking_limit = models.IntegerField(null=True, default=None)`. Semantically clearer (null = "not set" = unlimited), but nullable integers complicate comparison logic — every check needs `if limit is not None and count > limit`.
- *Separate boolean + integer:* `has_booking_limit: bool` + `booking_limit: int`. Most explicit but two fields for one concept.
- *Very high number as unlimited:* Set default to 999999. Hacky and fragile — what if someone enters 999999 thinking it means "about a million"?

**Tradeoffs:** Developers must know the "0 = unlimited" convention. It should be documented in the model's help_text and in the API docs. A new developer seeing `daily_booking_limit=0` might think "no bookings allowed" rather than "unlimited."

### Decision: Static JSON Files for Translations

Translations are served from static JSON files on disk (e.g., `translations/en.json`, `translations/es.json`). The translation endpoint reads the file and returns it as JSON. Supported languages are defined in the view code as a hardcoded list.

**Why:** Translation content changes infrequently (when the UI is updated, not at runtime). Static files are simple to create, version-controlled alongside the code, and trivially served with no database overhead. The view just reads and returns a file — no ORM, no serializer.

**Alternatives considered:**
- *Database-backed translations (django-modeltranslation, django-parler):* Allows runtime translation editing via admin. Useful for content-heavy sites where non-developers manage translations, but overkill for a nursery app where UI strings are developer-managed.
- *Frontend-only translations (i18n libraries like react-i18next):* Translations live entirely in the frontend bundle. Eliminates the API endpoint entirely but doesn't support backend-generated content (error messages, email templates).
- *Third-party translation service (Transifex, Crowdin):* Professional translation management with collaboration features. Appropriate for apps with many languages and non-developer translators. Overkill for a small project.
- *Django's built-in i18n (gettext):* The standard approach for Django templates. But this is an API-only backend — there are no templates to translate. The frontend needs JSON-formatted translations, not .po files.

**Tradeoffs:**
- **Supported languages are hardcoded in view code.** Adding a new language requires a code change (adding to the language list) plus creating the JSON file. This is fine for a small, controlled project but wouldn't scale for community-translated software.
- **No fallback mechanism.** If a translation key is missing in `es.json`, the endpoint returns whatever's in the file — it doesn't fall back to English. The frontend must handle missing keys.
- **File reads on every request.** The JSON file is read from disk on each API call. Django's `cache_page` decorator or application-level caching could be added, but for small JSON files (< 100KB), disk read latency is negligible.

### Decision: Translation Endpoint is AllowAny (Public)

The translation endpoint has no authentication requirement — any client can fetch translations.

**Why:** Translations are needed before the user logs in (login page, registration page). Making the endpoint public avoids a chicken-and-egg problem where the UI can't display translated login text without being logged in.

**Alternatives considered:**
- *Embed translations in the frontend bundle:* Eliminates the need for a public API endpoint. However, adding or updating translations would require a frontend rebuild and deployment.

### Decision: Settings Endpoints Lack Permission Protection (Known Issue)

The NurserySetting CRUD endpoints currently do **not** require specific permissions. Any authenticated user can read and modify nursery settings.

**Why:** This is a **known issue**, not a deliberate design choice. The settings endpoints should be protected with `IsAdmin` permission class to prevent regular users from modifying operational parameters like `daily_booking_limit`.

**Impact:** A non-admin user could change the daily booking limit, nursery name, or other operational settings. This is a **security concern** that should be addressed before production deployment.

**Fix:** Add `permission_classes = [IsAdmin]` to the NurserySettingViewSet. Read access could use `IsAdminOrReadOnly` if regular users need to see settings but not modify them.

### Decision: drf-spectacular for OpenAPI Schema Generation

The API documentation is generated by **drf-spectacular**, which produces an OpenAPI 3.0 schema served via both Swagger UI and ReDoc endpoints.

**Why:** drf-spectacular is the successor to drf-yasg and supports OpenAPI 3.0 (vs. yasg's OpenAPI 2.0). It has better support for modern DRF features including serializer polymorphism, nested serializers, and custom extensions. Auto-generated documentation stays in sync with the actual API — no risk of docs drifting from implementation.

**Alternatives considered:**
- *drf-yasg:* The previous generation tool. Still works but only generates OpenAPI 2.0 (Swagger) specs. Doesn't support some DRF 3.14+ features. The project is in maintenance mode.
- *Manual API documentation (Markdown/Notion):* Maximum control over documentation quality and organization. However, manual docs drift from implementation over time — someone changes an endpoint and forgets to update docs.
- *Postman collections:* Good for interactive testing and collaboration, but not a replacement for auto-generated specs. Can be generated from OpenAPI schemas, making drf-spectacular complementary.

**Tradeoffs:** Auto-generated documentation is comprehensive but not always well-organized. Custom schema extensions (`@extend_schema`) may be needed for complex endpoints (batch create, conflict check) to produce clear documentation. Without these extensions, the generated docs may show confusing or incorrect request/response shapes.

## Data Flow

### Loading Nursery Settings
```
GET /api/settings/
  → NurserySettingViewSet.retrieve()
    → NurserySetting.load()
      → get_or_create(pk=1)
      → If not exists: create with defaults {daily_booking_limit: 0, ...}
    → NurserySettingSerializer(instance)
  → Return {id: 1, daily_booking_limit: 0, ...}
```

### Updating Nursery Settings
```
PUT /api/settings/ {daily_booking_limit: 25, ...}
  → NurserySettingViewSet.update()
    → NurserySetting.load() → get existing instance
    → NurserySettingSerializer.update(instance, validated_data)
    → instance.save() → pk forced to 1
  → Return updated settings
```

### Fetching Translations
```
GET /api/translations/es/
  → TranslationView (AllowAny)
    → Validate 'es' is in supported languages list
    → Read translations/es.json from disk
    → Return JSON content as-is
  → Return {key1: "Traducción 1", key2: "Traducción 2", ...}

GET /api/translations/xx/
  → Validate 'xx' NOT in supported languages
  → Return 404
```

### OpenAPI Schema Access
```
GET /api/schema/          → Raw OpenAPI 3.0 JSON/YAML schema
GET /api/schema/swagger/  → Swagger UI (interactive)
GET /api/schema/redoc/    → ReDoc (readable documentation)
```

## Key Files

| File | Purpose |
|------|---------|
| `nursery_settings/models.py` | NurserySetting model with singleton pattern, load() class method, logo ImageField |
| `nursery_settings/views.py` | Settings CRUD (get/update) + logo upload/delete views |
| `nursery_settings/serializers.py` | NurserySettingSerializer with logo_url SerializerMethodField |
| `nursery_settings/urls.py` | URL patterns: /settings/, /settings/update/, /settings/upload_logo/, /settings/delete_logo/ |
| `nursery_settings/tests.py` | Model tests, settings API tests, SystemLogoAPITest (11 tests) |
| `pets/views.py` | TranslationView (serves static JSON translations) |
| `translations/*.json` | Static translation files (en.json, es.json) |
| `nursery/urls.py` | drf-spectacular schema/swagger/redoc URL configuration |

## System Logo Architecture

### Decision: Logo on NurserySetting Singleton

The logo is stored as an `ImageField` on the existing `NurserySetting` singleton model rather than a separate model. Reuses the shared `validate_file_size` and `validate_image_type` validators from `domain/files/validators.py` (5 MB max, JPEG/PNG/GIF/WEBP).

**Why:** A single nursery-wide image doesn't justify a separate model. The singleton already holds nursery configuration.

### Decision: Separate Upload/Delete Endpoints

Logo management uses dedicated endpoints (`POST /api/settings/upload_logo/`, `DELETE /api/settings/delete_logo/`) rather than including the file in the PATCH/PUT settings endpoint.

**Why:** File uploads require `multipart/form-data` which doesn't mix well with the JSON PATCH used for `daily_booking_limit`. Separate endpoints follow the same pattern as owner/pet profile picture endpoints.

### Decision: Public Settings Endpoint Serves Logo URL

The `GET /api/settings/` endpoint returns `logo_url` without authentication, allowing the login page to display the logo before the user has a token.

### Logo Data Flow

```
Upload:
  POST /api/settings/upload_logo/ (multipart, logo file)
    → upload_logo view
    → delete old logo if exists
    → assign new file to settings_obj.logo
    → full_clean() validates size + type
    → save()
    → return serialized settings with logo_url

Retrieve:
  GET /api/settings/
    → NurserySettingSerializer
    → get_logo_url() builds absolute URL from request context
    → returns logo_url or null

Delete:
  DELETE /api/settings/delete_logo/
    → logo.delete(save=True) removes file + clears field
    → return 204
```
