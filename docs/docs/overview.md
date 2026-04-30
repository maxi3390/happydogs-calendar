# Overview

## What is Happy Calendar?

Happy Calendar is a calendar-based schedule management system built specifically for pet nurseries. It provides a full-featured platform for managing pets, owners, and daily schedules — with an intelligent conflict detection engine that automatically evaluates pet compatibility based on behavioral characteristics such as temperament, dominance level, species, and size.

The system is designed as a modern full-stack web application with a **Next.js 16** frontend, a **Django 5.1.4** REST API backend, and a **PostgreSQL 18** database, all orchestrated via **Docker Compose** with a **Traefik v3.6** reverse proxy.

- 📘 [Backend Documentation](backend/intro)
- 📗 [Frontend Documentation](frontend/intro)

---

## Key Features

### 1. Pet Management

Comprehensive pet profiles with rich behavioral and medical data:

- **Species**: Dog, Cat, Bird, Rabbit, Other (+ free-text "Other" override under the `custom_pet_species` flag)
- **Temperament**: Calm, Playful, Aggressive, Anxious, Friendly
- **Dominance Level**: 1–10 scale (submissive to very dominant)
- **Size**: Small, Medium, Large
- **Details**: Breed, age, sex, neutered status, birth date
- **Weight**: Kilograms via a calculator-style `NN.NN kg` widget (avoids the parsing ambiguity of a plain number field)
- **Deworming Tracking**: `last_internal_deworming_date` and `last_external_deworming_date` (gated by the `deworming_tracking` flag)
- **Special Notes**: Free-text field for additional care instructions
- **Profile Pictures**: JPEG, PNG, GIF, WEBP — max 5 MB per image
- **Vaccination Records**: Date-stamped records linked to configurable vaccination types
- **Medical Notes**: Title + description entries with inline CRUD (gated by the `medical_notes` flag)
- **Document Attachments**: Upload files (JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX — max 5 MB) with drag-and-drop support
- **Vet Override**: Optional override of the owner's primary vet on a per-pet basis (gated by the `vet_management` flag)

### 2. Owner Management

- **Contact Information**: First name, last name, email (unique), phone, ID number (unique), address, birth date
- **Emergency Contact**: Name, phone, and can-pickup flag
- **Notes**: Free-text field for additional information
- **Profile Pictures**: Same format/size constraints as pets; can be uploaded during creation or added later

- **Document Attachments**: Upload files linked to owner records
- **Pet Relationships**: View and manage all pets associated with an owner

### System Branding
- **Custom Logo**: Upload a custom logo image via settings (JPEG/PNG/GIF/WEBP, max 5 MB)
- **Logo Shape Toggle**: Operators choose `square` or `circle` rendering. The frontend cache hydrates the chosen shape on first paint so the login page and the nav header don't flash the default icon.
- **Login Page Branding**: Custom logo displayed on the login page, replacing the default icon
- **Navigation Branding**: Custom logo displayed in the navigation bar, replacing the default PawPrint icon
- **Fallback**: Default icons shown when no custom logo is configured

### 3. Smart Scheduling with Conflict Detection

The scheduling engine implements 5 conflict detection rules (see [Business Logic](#business-logic) below) that evaluate pet compatibility in real time. Key characteristics:

- **Multi-day Schedules**: Separate start/end dates and start/end times. Multi-day stays support cross-day windows (e.g. `18:00` Mon → `10:00` Wed) when the `multiday_schedule` feature flag is on.
- **Same-Pet Overlap Detection**: Creating a schedule whose date range or time-slot intersects an existing one for the same pet surfaces a dedicated overlap block in the form. Operators can edit-existing or extend the existing schedule with a single click.
- **Status Tracking**: Scheduled → Checked In → Completed / Cancelled
- **Conflicts are Warnings, Not Blockers**: Schedules are always created; conflicts are returned as warnings alongside the created schedule. Each warning is keyed (e.g. `pet.compat.aggressive`) so the frontend translates them.
- **Pre-flight Conflict Check**: A dedicated endpoint to check conflicts before committing a schedule

### 4. Multi-Pet Scheduling

- Batch create schedules for multiple pets in a single request
- Owner-based pet filtering for quick selection
- Per-pet conflict warnings returned individually

### 5. Calendar Interface

- **Monthly View**: 7-column grid with schedule bars rendered in stable per-pet colors, a stacking algorithm for overlapping entries, and conflict indicators
- **Weekly View**: Pet rows with horizontal schedule bars
- **Day Schedule Panel**: Inline status updates, edit, and delete actions
- **Public Calendar**: Availability indicators visible without authentication

### 6. Medical Notes

- Title and description per pet
- Inline CRUD (create, read, update, delete) directly from the pet detail view

### 7. Document Management

- Upload files to pets or owners (JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX — max 5 MB)
- Drag-and-drop upload support
- Original filename preservation

### 8. Vaccination Types

- Configurable vaccination types managed in nursery settings
- Enable/disable individual types
- Display ordering support

### 9. Daily Booking Limits

- Configurable daily booking limit (0 = unlimited)
- Count checking is informational only — the limit is **not enforced** by the API

### 10. User Authentication & Role-Based Access Control

- **JWT Authentication**: 60-minute access tokens, 7-day refresh tokens
- **Token Rotation & Blacklisting**: Refresh tokens are rotated on each use; old tokens are blacklisted
- **Email-Based Login**: No username field — email is the sole login identifier
- **Roles**: Admin and User roles with different permission levels
- **Self-Service Password Change**: `PUT /api/auth/change-password/` requires the current password and updates the signed-in user's hash
- **Admin Password Reset**: `POST /api/users/<id>/set_password/` lets an admin reset another user's password without knowing the current one
- **Password Strength Meter**: Live zxcvbn-style scoring rendered on `/profile` and on the admin reset modal
- **Admin User Management Panel**: Filters (role, status, search), bulk select, deactivate / reactivate, hard delete (with confirm), promote / demote between admin and user

### 11. Internationalization (i18n)

- **Languages**: English and Spanish (Spanish is the default for new sessions)
- **API-Served Translations**: Translation strings fetched from the backend; the API endpoint is open (`AllowAny`) so the login page can render in the right language before the user signs in
- **Browser Auto-Detection**: Initial language set from browser preferences
- **Per-User Persistence**: Each user has a stored language preference; the device-wide `localStorage` value is a fallback only used when a user is not signed in
- **Real-Time Switching**: UI updates instantly without page reload

### 12. Dark Mode

- Tailwind CSS `class` strategy for theme switching
- System preference detection on first visit
- Manual toggle in the UI
- Preference persisted in localStorage

### 13. Responsive Design

- Mobile: Hamburger menu navigation
- Tablet & Desktop: Full sidebar/header layouts
- Adaptive calendar views across breakpoints

### 14. Reusable UI Components

Atoms in `frontend/src/components/ui/`:
- **Button**: 5 variants, 4 sizes
- **Input**: Icon support, labels, error messages, `aria-invalid` + `aria-describedby` wiring on errors
- **Select**: Dropdown select component with `htmlFor`-bound label, error-id wiring
- **Card**: Composable card components
- **Badge**: Status and category badges
- **Toast**: Provider + `useToast` hook for transient notifications

Higher-order primitives extracted from the popups and forms:
- **`Modal`**: Shared dialog shell — backdrop + `role="dialog"` container + header + body slot + optional footer band. Owns focus-on-mount, Escape, backdrop-click. Takes `inert` for nested-modal coordination and `size: 'md' | 'lg'` for the wider PetForm layout.
- **`DetailsModal<T>`**: Built on Modal. Adds a fetch lifecycle (`fetcher` prop) and a standard Close + Edit footer. Used by `PetDetailsPopup`, `OwnerDetailsPopup`, and `VetDetailsPopup`.
- **`FormModal`**: Built on Modal. Wraps body + footer in a single `<form>` with a Cancel + Save footer; pairs with `useFormSubmit` for the loading/error state. Used by `PetForm`, `OwnerForm`, and `VetForm`.

Custom hooks in `frontend/src/hooks/`:
- **`useFormSubmit`**: Captures the loading + error state machine and the `try / catch / setError(t('errors.saveFailed'))` cycle every form used to reimplement.
- **`useResourceList<T>`**: `setLoading → fetch → setItems / log error → setLoading(false)` with proper request cancellation. Replaces the 8 hand-rolled fetch effects in `PetList`, `VetList`, `Calendar`, `WeekView`, `DaySchedule`, etc.
- **`useSearchableList<T>`**: Memoised, case-insensitive substring filter over a list. Used by `VetList` and the `/owners` search.

### 15. Audit Trail

`django-simple-history` records every create / update / delete on the domain models (Pet, Owner, MedicalNote, Vaccination, Document, Schedule, Vet, NurserySetting, FeatureFlag) with author, timestamp, and field-level diff:
- **Per-entity history endpoints**: `GET /api/pets/<id>/history/` (and equivalents) return paginated event lists scoped to one record.
- **Cross-entity admin activity feed**: `/admin/activity` (frontend) shows a unified timeline with filtering by entity, action, and author. Gated by the `activity_logs` feature flag.

### 16. Notifications

Daily reminder system for staff so the operator never reads "the dog is here today" off a paper calendar:
- **Cron-driven**: a long-running `notification-cron` Compose service polls the configured run-time once per minute and fires `python manage.py generate_notifications`.
- **Per-user fan-out**: only recently-active users (last 30 days by default) receive notifications, so dormant accounts don't accumulate inbox cruft.
- **In-app delivery**: bell icon in the navigation with unread count, full `/notifications` page, mark-as-read flow.
- **Optional email**: when `EMAIL_BACKEND` is set to `django.core.mail.backends.smtp.EmailBackend`, the cron also sends email; otherwise it logs to console (and the cron emits a startup warning so silent prod-on-console isn't invisible).
- **Forwarded tracking**: each notification deep-links to the owner via `https://api.whatsapp.com/send?phone=...`; clicking it stamps a `forwarded_at` so other staff see who already passed the message along.
- **Feature-flag gated**: the `notifications` flag turns the entire surface (cron + bell + page) on or off without a redeploy.

### 17. File Storage

The backend's storage layer is environment-driven:
- **Filesystem (default)**: uploads (pet / owner profile pictures, system logo, documents) land under `backend/media/`. Backed up with `rsync`.
- **S3-compatible (opt-in)**: set `S3_ENDPOINT_URL` + `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` + `S3_BUCKET_NAME` and Django switches to `django-storages[s3]`. Works against AWS S3, MinIO, Backblaze B2, and Garage.
- **Bundled Garage (opt-in)**: `docker compose --profile s3 up -d garage` brings up a single-node Garage on the same host; `make s3-init` provisions the bucket and access key idempotently. Useful for self-hosted deployments that want object-storage semantics without an external account.
- **Half-applied config**: when only some `S3_*` vars are set, the backend falls back to filesystem and emits a startup warning instead of silently writing nowhere.

See [Deployment](deployment.md#file-storage) for the full env-var contract and the Garage bootstrap flow.

### 18. Feature Flags

Runtime toggles editable from `/admin/feature-flags/` (admin-only PATCH; `AllowAny` GET so the login page can show only the flagged-on languages):

| Flag                      | Effect when off                                     |
|---------------------------|-----------------------------------------------------|
| `multiday_schedule`       | Schedule form hides the multi-day fields            |
| `custom_pet_species`      | "Other" species text field hidden                   |
| `vet_management`          | Hides the Vets nav entry, vet override on pets, primary/emergency vet on owners |
| `medical_notes`           | Removes the medical notes section from pet details  |
| `data_backup`             | Hides the Data backup tile on `/profile`            |
| `compatibility_warnings`  | Conflict warnings still computed but UI badges hidden |
| `notifications`           | Notification cron paused; bell + page hidden        |
| `ui_system`               | Hides the `/ui-system` design-token explorer        |
| `activity_logs`           | Hides `/admin/activity`; per-entity history endpoints stay live |
| `deworming_tracking`      | Hides last-internal/external-deworming date fields  |

Flag-gating is at the UI layer; the underlying tables and migrations always exist, so toggling is a single DB write rather than a redeploy.

### 19. Data Portability

One-click export and atomic import for the operator's own data:
- **JSON export**: `GET /api/data-portability/export/` → manifest + every domain row.
- **ZIP export**: `?format=zip` → JSON + the entire `media/` directory in a single archive, suitable for self-managed cloud backup (Google Drive, Dropbox, S3 bucket the operator owns).
- **Atomic import**: `POST /api/data-portability/import/` accepts a JSON or ZIP. The whole import runs in a single transaction; any per-row error rolls back the whole operation.
- **Scope**: domain data only (owners, pets, schedules, vets, vaccinations, medical notes, documents, settings, feature flags). User accounts and audit history are **not** exported.

### 20. Accessibility

The frontend tracks a WCAG 2.1 AA target enforced by automated tests:
- **`frontend/tests/accessibility.spec.ts`** scans 10 main routes (login, register, calendar, pets, owners, settings, profile, admin/users, admin/activity, vets) with `@axe-core/playwright`.
- The suite hard-fails on `critical` impact violations and logs `serious` / `moderate` / `minor` for follow-up. The threshold is one line away from `serious` once the design-system color-contrast pass burns down the backlog.
- Real fixes already shipped: `<label htmlFor>` on Select, `aria-describedby` for error messages, `role="dialog"` + `aria-modal` on every popup and form, `aria-label` on icon-only buttons (calendar chevrons, password-toggle, language switcher, schedule-status select).

### 21. Operations & Tooling

`Makefile` wraps `docker compose` for the operator's lifecycle:
- **`make init`** sets up a fresh checkout end-to-end (`env` → `volume-ensure` → `build` → `up` → `migrate` → `create-admin`).
- **`make backup`** writes a gzipped `pg_dump` to `backups/`.
- **`make restore`** restores the latest backup (or `BACKUP_FILE=...`); refuses to run without typed confirmation.
- **`make upgrade`** chains `backup → git pull → build → up → migrate`. `SKIP_BACKUP=1` and `SKIP_PULL=1` available.
- **`make seed-example-data`** populates a deterministic demo dataset.
- **`make security`** runs the OWASP-Top-10 suite (bandit + pip-audit + npm audit + Django `check --deploy` + gitleaks + opt-in OWASP ZAP baseline).
- **`make destroy-db`** is the only path that removes the Postgres volume; it requires typed confirmation.
- **`make test-frontend`** spins up a fully isolated `db-e2e` + `backend-e2e` + `frontend-e2e` stack so Playwright never touches the dev database.

### 22. API Documentation

- **Swagger UI**: Live interactive docs at `/api/docs/`
- **ReDoc**: Alternative documentation at `/api/redoc/`
- **OpenAPI Schema**: Machine-readable schema at `/api/schema/`

---

## Technology Stack

### Frontend

| Technology              | Version   | Purpose                                       |
|-------------------------|-----------|-----------------------------------------------|
| Next.js                 | 16        | React framework with App Router               |
| React                   | 19        | UI library                                    |
| TypeScript              | 5.7       | Type-safe JavaScript                          |
| TailwindCSS             | 3.4       | Utility-first CSS framework                   |
| Lucide React            | 0.475+    | Icon library                                  |
| date-fns                | 4.1+      | Date manipulation utilities                   |
| Playwright              | 1.50+     | End-to-end testing                            |
| @axe-core/playwright    | 4.11+     | Accessibility audits inside the E2E suite     |
| Container base image    | `node:24-alpine` | Pinned in `frontend/Dockerfile`         |

### Backend

| Technology                       | Version | Purpose                                              |
|----------------------------------|---------|------------------------------------------------------|
| Django                           | 5.1.4   | Web framework                                        |
| Django REST Framework            | 3.15.2  | REST API toolkit                                     |
| djangorestframework-simplejwt    | 5.3.1   | JWT authentication                                   |
| drf-spectacular                  | 0.28.0  | OpenAPI 3.0 schema generation                        |
| Pillow                           | 11.1.0  | Image processing for uploads                         |
| psycopg2-binary                  | 2.9.10  | PostgreSQL adapter                                   |
| django-cors-headers              | 4.6.0   | CORS handling                                        |
| django-simple-history            | 3.11.0  | Per-row audit log + history endpoints                |
| django-storages[s3]              | 1.14.4  | S3-compatible storage backend (opt-in)               |
| gunicorn                         | 23.0.0  | Production WSGI server                               |
| bandit (dev)                     | 1.9.4   | Static analysis for common Python security mistakes  |
| pip-audit (dev)                  | 2.10.0  | CVE auditor for Python dependencies                  |
| Container base image             | `python:3.12-slim` | Pinned in `backend/Dockerfile`             |

### Infrastructure

| Technology                       | Version              | Purpose                                              |
|----------------------------------|----------------------|------------------------------------------------------|
| PostgreSQL                       | 18 (Alpine)          | Relational database                                  |
| Docker & Docker Compose          | —                    | Containerization and orchestration                   |
| Traefik                          | v3.6                 | Reverse proxy, TLS termination, routing              |
| `tecnativa/docker-socket-proxy`  | latest               | Read-only Docker API surface for Traefik             |
| Garage (optional)                | 1.0.1                | S3-compatible object storage, single-node, profile `s3` |
| Docusaurus (docs site, optional) | 3.10+                | Documentation site, profile `docs`                   |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Traefik v3.6                                 │
│                    (Reverse Proxy / TLS)                             │
│                                                                      │
│   :80 ──► :443 (HTTP→HTTPS redirect)                                │
│                                                                      │
│   /api/*   ──────►  backend:8000                                     │
│   /media/* ──────►  backend:8000                                     │
│   /*       ──────►  frontend:3000                                    │
└──────────┬───────────────────────────────────────┬───────────────────┘
           │                                       │
           ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────────┐
│   Frontend          │              │   Backend               │
│   Next.js 16        │   REST API   │   Django 5.1.4 + DRF   │
│   React 19          │◄────────────►│   Port 8000             │
│   Port 3000         │   (JSON)     │                         │
└─────────────────────┘              └────────────┬────────────┘
                                                  │
                                                  ▼
                                     ┌─────────────────────────┐
                                     │   PostgreSQL 18         │
                                     │   Port 5432             │
                                     └─────────────────────────┘
                                                  ▲
                                                  │  cron 1/min
                                     ┌─────────────────────────┐
                                     │   notification-cron     │
                                     │   (same backend image)  │
                                     └─────────────────────────┘

Optional services (via Docker Compose profiles):
  - s3:      Garage 1.0.1 (profile: s3)    → S3-compatible storage on :3900
  - docs:    Docusaurus  (profile: docs)   → :3001/docs/  AND  Traefik /docs/
  - dev:     pgAdmin 4   (profile: dev)    → :5050/pgadmin/  AND  Traefik /pgadmin/

Security:
  - docker-socket-proxy: Read-only Docker API access for Traefik
  - Networks: socket-proxy (internal), proxy (app communication)

E2E testing (separate compose file: docker-compose.e2e.yml):
  - Own project (`happy-calendar-e2e`) and bridge network
  - tmpfs-backed db-e2e, ephemeral
  - frontend-e2e built with NEXT_PUBLIC_API_URL baked in
  - Never touches the dev stack
```

---

## Business Logic

### Conflict Detection Rules

The conflict detection engine is implemented in `Pet.is_compatible_with()` and evaluates pairwise compatibility between pets sharing the same time slot. All 5 rules are checked in sequence:

| # | Rule | Condition | Result |
|---|---|---|---|
| 1 | **Aggressive Pet** | Either pet has temperament `aggressive` | Incompatible |
| 2 | **High Dominance** | Both pets have dominance level > 7 | Incompatible |
| 3 | **Size + Dominance Combo** | Size difference ≥ 2 levels AND dominance difference ≥ 5 | Incompatible |
| 4 | **Cross-Species Temperament** | Different species with temperament pairs (`aggressive`, `anxious`) or (`aggressive`, `calm`) | Incompatible |
| 5 | **Anxious + Playful** | One pet anxious, the other playful, and dominance difference > 4 | Incompatible |

### Non-Blocking Conflict Philosophy

**Conflicts are warnings, not blockers.** When a schedule is created that triggers one or more compatibility rules:

1. The schedule is **always saved** to the database
2. Conflict details are returned in the API response as `warnings`
3. The UI displays conflict indicators on the calendar and in schedule details
4. Staff can make informed decisions about whether to proceed or reschedule

A **pre-flight conflict check** endpoint is also available to evaluate conflicts before committing.

### Daily Booking Limits

The daily booking limit (configured in nursery settings) is **informational only**. The API reports the current day's booking count against the configured limit, but does not reject bookings that exceed it.

---

## Development and Deployment

### Local Development

1. **Docker Compose**: Start all services with a single command
2. **Hot Reload**: Both frontend (Next.js Turbopack) and backend (Django runserver) support automatic code reloading
3. **Database Migrations**: Automatically applied on backend container startup
4. **API Documentation**: Live Swagger UI at `/api/docs/` and ReDoc at `/api/redoc/`
5. **TLS**: Self-signed certificates by default; Let's Encrypt via Cloudflare DNS challenge available

### Production

- **Traefik**: Handles HTTPS termination with self-signed certificates or Let's Encrypt (Cloudflare DNS challenge)
- **Gunicorn**: Production WSGI server for Django
- **Docker Socket Proxy**: Scoped read-only Docker API access for Traefik (no direct socket exposure)
- **Network Isolation**: Internal `socket-proxy` network for Traefik↔Docker communication; `proxy` network for app services

---

## Getting Started

1. **Clone the repository** and copy the `.env.example` to `.env`
2. **Start the stack**:
   ```bash
   docker compose up --build
   ```
3. **Access the application**:
   - Frontend: `https://localhost`
   - API: `https://localhost/api/`
   - Swagger UI: `https://localhost/api/docs/`
   - ReDoc: `https://localhost/api/redoc/`
   - Traefik Dashboard: `http://localhost:8080`
4. **Optional services**:
   ```bash
   docker compose --profile docs up -d docs    # Docusaurus at https://${DOMAIN}/docs/ (or :3001/docs/)
   docker compose --profile dev  up -d pgadmin # pgAdmin    at https://${DOMAIN}/pgadmin/ (or :5050/pgadmin/)
   ```

See the [Deployment Guide](deployment.md) for detailed configuration and production setup instructions.

---

## Testing

### Frontend — Playwright E2E Tests

End-to-end tests cover the full user experience:

- Navigation flows and page transitions
- Calendar interactions (monthly, weekly, daily views)
- Pet and owner management workflows
- Schedule creation, editing, and conflict detection
- Language switching (English ↔ Spanish)
- Authentication flows

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run headed (visible browser)
npm run test:headed
```

### Backend — Django Test Runner + Coverage

Unit and integration tests for models, views, serializers, and business logic:

- Model validation and constraint testing
- API endpoint testing (CRUD, auth, permissions)
- Conflict detection rule verification
- Schedule overlap and compatibility checks

```bash
# Run backend tests
python manage.py test

# Run with coverage
coverage run manage.py test && coverage report
```
