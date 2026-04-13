# Frontend Context

Next.js 16 / React 19 application for the Happy Pet Nursery system.

---

## Directory Structure

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout: wraps app in AuthProvider + TranslationProvider
│   │   ├── page.tsx                # Main calendar page (/)
│   │   ├── login/page.tsx          # Login page
│   │   ├── register/page.tsx       # Registration page
│   │   ├── pets/page.tsx           # Pets management page
│   │   ├── owners/page.tsx         # Owners management page
│   │   └── settings/page.tsx       # Settings & incompatibility management
│   ├── components/                 # Shared React components
│   │   ├── Calendar.tsx            # Monthly calendar view
│   │   ├── WeekView.tsx            # Weekly schedule view
│   │   ├── DaySchedule.tsx         # Daily schedule panel
│   │   ├── ScheduleForm.tsx        # Single schedule creation/editing
│   │   ├── MultiPetScheduleForm.tsx# Batch scheduling for multiple pets
│   │   ├── PetForm.tsx             # Pet creation/editing form
│   │   ├── PetList.tsx             # Pet listing component
│   │   ├── OwnerForm.tsx           # Owner creation/editing form
│   │   ├── ScheduleDetailsPopup.tsx# Popup with schedule details
│   │   ├── DocumentUpload.tsx      # Document upload component
│   │   ├── ProfilePictureUpload.tsx# Profile picture upload component
│   │   ├── PublicCalendar.tsx      # Public-facing calendar view
│   │   ├── Navigation.tsx          # Reusable nav bar (links, lang switcher, theme toggle)
│   │   ├── LanguageSwitcher.tsx    # Language selector component
│   │   ├── ThemeToggle.tsx         # Dark mode toggle
│   │   ├── MedicalNotesSection.tsx # Inline medical notes CRUD for pets
│   │   └── ui/                     # Reusable UI component library
│   │       ├── Button.tsx          # Variants: primary/secondary/danger/ghost/outline; Sizes: sm/md/lg/icon
│   │       ├── Input.tsx           # Label, left/right icons, error message support
│   │       ├── Card.tsx            # Composable: Card/CardHeader/CardTitle/CardContent/CardFooter
│   │       ├── Select.tsx          # Styled dropdown select
│   │       └── Badge.tsx           # Status/tag display
│   ├── domain/                     # Domain-sliced API clients and TypeScript types
│   │   ├── _http/client.ts         # Base HTTP helpers: fetchApi<T> and uploadFile<T>
│   │   ├── auth/types.ts           # User, AuthTokens, RegisterData, AuthContextType
│   │   ├── owners/                 # owners api.ts, types.ts, index.ts
│   │   ├── pets/                   # pets api.ts, types.ts, index.ts
│   │   ├── schedules/              # schedules api.ts, types.ts, index.ts
│   │   ├── vaccinations/           # vaccination-types api.ts, types.ts, index.ts
│   │   ├── documents/              # documents api.ts, types.ts, index.ts
│   │   ├── medical-notes/         # medical-notes api.ts, types.ts
│   │   ├── settings/               # nursery-settings api.ts, types.ts, index.ts
│   │   ├── translations/           # translation types
│   │   └── users/                 # users api.ts, types.ts
│   └── lib/
│       ├── api.ts                  # Barrel: re-exports all domain types + api object
│       ├── auth.tsx                # AuthProvider, useAuth hook, authFetch helper
│       ├── withAuth.tsx            # HOC: redirects unauthenticated users to /login
│       ├── withAdmin.tsx           # HOC: redirects non-admin users to /
│       └── translations.tsx        # TranslationProvider, useTranslation hook
├── tests/                          # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── calendar.spec.ts
│   ├── pets.spec.ts
│   ├── schedule.spec.ts
│   ├── language.spec.ts (implied)
│   ├── navigation.spec.ts
│   └── helpers.ts
├── public/
│   └── .gitkeep
├── Dockerfile
├── next.config.ts
├── package.json
└── tailwind.config.ts
```

---

## Key Architectural Decisions

### Domain-Sliced Structure
API clients and types are organized by domain under `src/domain/`. Each domain folder contains:
- `types.ts` — TypeScript interfaces for that domain.
- `api.ts` — Functions that call the backend REST API.
- `index.ts` — Re-export barrel.

All domains are aggregated in `src/lib/api.ts` which exports a single `api` object:
```ts
import { api } from '@/lib/api';

api.owners.list()
api.pets.create(data)
api.schedules.checkConflicts(payload)
api.nurserySettings.get()
```

### HTTP Layer
`src/domain/_http/client.ts` provides two base helpers:
- `fetchApi<T>(endpoint, options?)` — JSON requests; throws on non-ok responses.
- `uploadFile<T>(endpoint, formData)` — multipart file uploads.

Both resolve `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api`).

### Auth
`src/lib/auth.tsx` exports:
- `AuthProvider` — React context provider. Persists `auth_tokens` and `auth_user` in `localStorage`.
- `useAuth()` — Hook returning `{ user, tokens, isLoading, isAuthenticated, isAdmin, login, register, logout, refreshToken }`.
- `authFetch(url, options, tokens)` — Helper for making authenticated fetch calls with `Authorization: Bearer <access>` header.

Auth flow:
1. Login/register returns `{ user, tokens }` from API.
2. Tokens stored in localStorage under keys `auth_tokens` / `auth_user`.
3. Logout POSTs to `/api/auth/logout/` (blacklists refresh token) then clears localStorage.
4. `refreshToken()` calls `/api/auth/refresh/` and rotates tokens in localStorage.

### Translations (i18n)
`src/lib/translations.tsx` exports:
- `TranslationProvider` — Fetches translations from `/api/translations/{language}/` on language change. Persists preference in `localStorage` under `preferred_language`. Default language: `es` (Spanish). Auto-detects browser language on first load.
- `useTranslation()` — Returns `{ t, language, setLanguage, availableLanguages, loading }`.
- `t(key, params?)` — Resolves dot-notation keys from the translations JSON (e.g. `t('pets.form.name')`). Supports `{placeholder}` interpolation.

### Root Layout
`src/app/layout.tsx` wraps the entire app:
```
<AuthProvider>
  <TranslationProvider>
    {children}
  </TranslationProvider>
</AuthProvider>
```

---

## Pages

| Route        | File                        | Description                                                  |
|--------------|-----------------------------|--------------------------------------------------------------|
| `/`          | `app/page.tsx`              | Main calendar view with monthly/weekly views and day panel   |
| `/login`     | `app/login/page.tsx`        | Login form; redirects authenticated users to `/`             |
| `/register`  | `app/register/page.tsx`     | Registration form                                            |
| `/pets`      | `app/pets/page.tsx`         | Pet list and CRUD operations                                 |
| `/owners`    | `app/owners/page.tsx`       | Owner list and CRUD operations                               |
| `/settings`  | `app/settings/page.tsx`     | Nursery settings and incompatibility rule management         |
| `/admin/users` | `app/admin/users/page.tsx`| Admin user management (withAdmin protected)                  |

---

## Components

| Component                  | Purpose                                                                            |
|----------------------------|------------------------------------------------------------------------------------|
| `Calendar.tsx`             | Monthly calendar grid with schedule count indicators and conflict warnings         |
| `WeekView.tsx`             | Week-by-week schedule display                                                      |
| `DaySchedule.tsx`          | Panel showing schedules for a selected day; supports status updates                |
| `ScheduleForm.tsx`         | Single schedule creation/editing with conflict detection UI                        |
| `MultiPetScheduleForm.tsx` | Batch scheduling: select multiple pets, same time slot                             |
| `PetForm.tsx`              | Pet creation/editing (includes vaccination records)                                |
| `PetList.tsx`              | Paginated/filtered pet listing                                                     |
| `OwnerForm.tsx`            | Owner creation/editing                                                             |
| `ScheduleDetailsPopup.tsx` | Popup with full schedule details and status management                             |
| `DocumentUpload.tsx`       | File upload UI for attaching documents to pets or owners                           |
| `ProfilePictureUpload.tsx` | Image upload for owner/pet profile pictures                                        |
| `PublicCalendar.tsx`       | Calendar view accessible without authentication                                    |
| `Navigation.tsx`           | Top nav bar: links to Calendar, Owners, Pets, Settings; language switcher; theme toggle; mobile hamburger menu |
| `LanguageSwitcher.tsx`     | Dropdown/button to switch between `en` and `es`                                    |
| `ThemeToggle.tsx`          | Toggle between light and dark mode (system preference detected on first load)      |
| `MedicalNotesSection.tsx`  | Inline medical notes CRUD for a pet                                                |

### UI Component Library (`src/components/ui/`)
| Component   | Purpose                                                                        |
|-------------|--------------------------------------------------------------------------------|
| `Button.tsx`| 5 variants (primary/secondary/danger/ghost/outline), 4 sizes (sm/md/lg/icon)   |
| `Input.tsx` | Form input with optional label, left/right icons, error message, full-width    |
| `Card.tsx`  | Composable card: Card, CardHeader, CardTitle, CardContent, CardFooter          |
| `Select.tsx`| Styled dropdown select, consistent with Input styling                          |
| `Badge.tsx` | Status/tag display with variant support                                        |

---

## TypeScript Types (key interfaces)

Defined per-domain under `src/domain/*/types.ts`:

**Auth (`domain/auth/types.ts`)**
```ts
User { id, email, first_name, last_name, full_name, role: 'admin'|'user', is_active, created_at, updated_at }
AuthTokens { access: string, refresh: string }
RegisterData { email, password, password_confirm, first_name, last_name }
```

---

## Dependencies

### Runtime
| Package          | Version   | Purpose                        |
|------------------|-----------|--------------------------------|
| `next`           | 16.0.0    | Framework                      |
| `react`          | 19.1.0    | UI library                     |
| `react-dom`      | 19.1.0    | DOM renderer                   |
| `lucide-react`   | ^0.475.0  | Icon set                       |
| `date-fns`       | ^4.1.0    | Date manipulation utilities    |

### Dev
| Package             | Version   | Purpose                          |
|---------------------|-----------|----------------------------------|
| `typescript`        | ^5.7.3    |                                  |
| `tailwindcss`       | ^3.4.17   | Utility-first CSS                |
| `@playwright/test`  | ^1.50.0   | E2E testing                      |

No external state management library (Redux, Zustand, etc.) — state is managed with React hooks and context.

---

## npm Scripts

| Script            | Command                    | Description                                 |
|-------------------|----------------------------|---------------------------------------------|
| `dev`             | `next dev --turbopack`     | Local dev server with Turbopack             |
| `build`           | `next build`               | Production build                            |
| `start`           | `next start`               | Start production server                     |
| `lint`            | `next lint`                | ESLint via Next.js config                   |
| `test`            | `playwright test`          | Run all E2E tests (headless)                |
| `test:ui`         | `playwright test --ui`     | Interactive Playwright UI mode              |
| `test:headed`     | `playwright test --headed` | Tests with browser window visible           |
| `test:debug`      | `playwright test --debug`  | Debug mode                                  |
| `test:report`     | `playwright show-report`   | Open last test report                       |

---

## Playwright E2E Tests

Tests live in `frontend/tests/`. Run via `make test-frontend` (Docker, Chrome headless) or directly with `npm test`.

| File                  | Coverage                                                                  |
|-----------------------|---------------------------------------------------------------------------|
| `auth.spec.ts`        | Login form, register form, password visibility, error states, redirect    |
| `calendar.spec.ts`    | Calendar views, month/week navigation                                     |
| `pets.spec.ts`        | Pet CRUD, form validation                                                 |
| `schedule.spec.ts`    | Schedule creation, multi-pet scheduling                                   |
| `language.spec.ts`    | Language switching, translation persistence                                |
| `navigation.spec.ts`  | Navigation flows, mobile menu                                             |
| `helpers.ts`          | Shared test utilities                                                     |

Test auth state is seeded via `localStorage` directly in tests (no real login required for auth-gated tests).

To run against the Docker deployment:
```bash
BASE_URL=http://localhost:3000 npm test
```

---

## Dockerfile (frontend)

Multi-stage build:
1. **`deps`** — `node:22-alpine`, installs npm dependencies.
2. **`builder`** — Copies source + node_modules, runs `next build`.
3. **`runner`** — Copies only the Next.js standalone output (`.next/standalone`) and static assets. Runs as non-root `nextjs` user. Serves via `node server.js` on port 3000.

`NEXT_TELEMETRY_DISABLED=1` is set at build and runtime.

---

## Environment Variables

| Variable              | Default                         | Notes                                          |
|-----------------------|---------------------------------|------------------------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api`     | Backend API base URL. Must be accessible from the browser (public var). |
