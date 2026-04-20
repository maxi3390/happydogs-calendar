# Design: Add Customizable System Logo

## Technical Approach

The logo is a nursery-wide branding image stored on the existing `NurserySetting` singleton model. The backend adds an `ImageField` with the same validators used for profile pictures (5 MB max, JPEG/PNG/GIF/WEBP). Two new endpoints handle upload (multipart POST) and deletion (DELETE), following the exact pattern established by `OwnerViewSet.upload_profile_picture`. The frontend fetches the logo URL from the public `/api/settings/` endpoint — which requires no authentication — so the login page can display it without a token.

## Architecture Decisions

### Decision: Logo on NurserySetting Singleton (Not a Separate Model)

The logo is a single nursery-wide image. Adding it as a field on the existing singleton model keeps the data model flat and avoids creating a new model + migration for a single image. The singleton already handles nursery-wide configuration (daily_booking_limit).

**Tradeoffs:** If more branding assets are needed later (favicon, dark-mode logo), a separate `Branding` model might be warranted. For now, a single field is the simplest approach.

### Decision: Same Validators as Profile Pictures

Reusing `validate_file_size` and `validate_image_type` from `domain/files/validators.py` ensures consistent upload rules across all image uploads in the system (owners, pets, logo). No new validation code needed.

### Decision: Public Settings Endpoint Serves Logo URL

The `/api/settings/` GET endpoint already has no authentication requirement (AllowAny default). The logo URL is added to the serializer response so the login page (which has no auth token) can fetch and display it. No separate public endpoint needed.

### Decision: Upload/Delete as Separate Endpoints (Not PATCH on Settings)

File uploads require `multipart/form-data` which doesn't mix well with the JSON PATCH used for `daily_booking_limit`. Separate endpoints (`/api/settings/upload_logo/` and `/api/settings/delete_logo/`) follow the same pattern as profile picture endpoints and keep the API clean.

### Decision: Frontend Fetches Logo from Settings API (No Dedicated Context)

The logo is a simple URL string that changes rarely. Rather than adding a dedicated React Context or global state, components that need the logo (Navigation, login page, settings page) each fetch it from the settings API. The settings payload is small and fast to serve.

**Tradeoffs:** Multiple components fetching the same endpoint could cause redundant requests. This is acceptable because: (1) the payload is tiny, (2) it only happens on page load, (3) browser HTTP caching handles repeated fetches. If this becomes an issue, SWR/React Query can be added later.

## Data Flow

```
Settings Page                    Navigation / Login
     |                                |
     | POST /api/settings/upload_logo/  GET /api/settings/
     |           |                      |
     v           v                      v
   [NurserySetting model]         [NurserySetting model]
     logo field (ImageField)       logo_url (SerializerMethodField)
     upload_to='logos/'            builds absolute URL
```

## Key Files

| File | Change |
|------|--------|
| `backend/nursery_settings/models.py` | Add `logo` ImageField |
| `backend/nursery_settings/serializers.py` | Add `logo_url` SerializerMethodField |
| `backend/nursery_settings/views.py` | Add `upload_logo` and `delete_logo` views |
| `backend/nursery_settings/urls.py` | Add URL patterns for upload/delete |
| `backend/nursery_settings/tests.py` | Add `SystemLogoAPITest` class with 11 tests |
| `frontend/src/domain/settings/types.ts` | Add `logo_url` to NurserySetting type |
| `frontend/src/domain/settings/api.ts` | Add `uploadLogo` and `deleteLogo` methods |
| `frontend/src/components/Navigation.tsx` | Fetch and display logo |
| `frontend/src/app/login/page.tsx` | Fetch and display logo |
| `frontend/src/app/settings/page.tsx` | Add logo upload/delete section |

## Test Strategy

Backend tests are in `nursery_settings/tests.py` under the `SystemLogoAPITest` class. They cover:

| Category | Tests | Coverage |
|----------|-------|----------|
| Retrieval | 3 tests | `logo_url` field present, null when no logo, populated after upload |
| Upload | 5 tests | Success with file storage, replace existing, no-file 400, reject PDF, reject >5MB |
| Delete | 3 tests | Success removes file, clears URL, no-op when no logo |
| Integrity | 1 test | Logo survives unrelated settings updates (singleton integrity) |

All tests use the existing `auth_client` helper and `APIClient` pattern from the codebase. Test images are generated in-memory via Pillow (no fixtures needed).
