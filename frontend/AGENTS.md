# Frontend — Agent Guidelines

## Project Overview

Next.js 16 / React 19 / TypeScript application for the Happy Pet Nursery system. Uses Tailwind CSS for styling, Lucide React for icons, date-fns for date utilities. No external state management library — React hooks and Context API only.

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
git add -A && git commit -m "feat(calendar): add week view component"

# 4. When done, verify before considering the branch ready
cd frontend && npm run build             # TypeScript + Next.js must compile
cd frontend && npm run lint              # no lint errors
make test-frontend                       # all Playwright E2E tests must pass

# 5. Do NOT push or merge — leave that to the user
```

### Branch naming examples

| Type | Branch name | Commit prefix |
|------|-------------|---------------|
| New feature | `feat/add-system-logo` | `feat(settings):` |
| Bug fix | `fix/calendar-bar-overlap` | `fix(calendar):` |
| Refactor | `refactor/unify-schedule-form` | `refactor(schedules):` |
| Tests | `test/pet-form-avatar-upload` | `test(pets):` |
| Docs/specs | `docs/update-frontend-specs` | `docs:` |

### Full workflow for a feature request

```
1. git checkout -b feat/<slug>           # create branch
2. Create openspec/changes/<slug>/       # proposal, design, specs, tasks
3. Implement frontend changes            # pages, components, domain APIs, types
4. Write/update Playwright tests         # tests must pass
5. Update docs                           # docs/docs/, AGENTS.md if needed
6. Commit with conventional messages     # one or more commits
7. npm run build && make test-frontend   # final verification
```

### Commit message rules

- Use the Conventional Commits format: `type(scope): subject` on the first line.
- Keep the subject under ~72 characters and use the imperative mood ("add", "fix", "rename").
- Body paragraphs explain *why* (rationale, tradeoffs), not *what* (the diff shows that).
- **Do NOT add tool attribution or co-author trailers to commit messages.** No `Generated with ...`, no `Co-Authored-By: <tool>`, no signature lines. Commits should read as if written by a human engineer on the team.

## Verification Commands

```bash
# Run all Playwright E2E tests (headless Chrome via Docker).
# Tests run against an isolated Postgres + Django pair (db-e2e +
# backend-e2e) brought up automatically and torn down on exit.
# The dev DB is never touched. See
# openspec/specs/tooling/e2e-isolation/spec.md.
make test-frontend

# Same as above but with Playwright trace=on for debugging failures.
make test-frontend-debug

# Leave the e2e stack up after the run for inspection (e.g. to query
# what the failing test created via `manage.py shell`). Clean up
# afterwards with `make e2e-down`.
KEEP_E2E_DATA=1 make test-frontend

# Run a single spec against the isolated e2e stack:
bash scripts/run-e2e-tests.sh tests/pets.spec.ts

# Lint
cd frontend && npm run lint

# Build (checks TypeScript + Next.js compilation)
cd frontend && npm run build
```

### Test isolation invariants

Playwright tests register users (`POST /api/auth/register/`) and create
owners / pets / schedules through the real REST API. To keep these
tests from polluting the developer's working database, the test runner
brings up three dedicated containers defined in **`docker-compose.e2e.yml`**
(a separate compose file from the dev stack), under the
`happy-calendar-e2e` compose project on its own `happy-calendar-e2e`
bridge network:

- **`db-e2e`** — `postgres:18-alpine` with a `tmpfs` data dir. Stopping
  the container wipes the DB unconditionally; no volume to clean up.
- **`backend-e2e`** — same Django image as the dev `backend`, configured
  to talk to `db-e2e`. No Traefik labels, no published host ports;
  reachable only as `backend-e2e:8000` on the e2e network.
- **`frontend-e2e`** — same source tree as the dev `frontend`, but built
  with the build-arg `NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api`.
  Next.js inlines that URL into the browser bundle, so browser-side
  fetches go straight to the e2e backend instead of the dev frontend's
  empty default (`/api` relative). Reachable as `frontend-e2e:3000`.

The Playwright container is launched with
`--network=happy-calendar-e2e`, `BASE_URL=http://frontend-e2e:3000`,
and `NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api`. Server-side
`page.request.*` calls (`setupAuth`, `createOwnerViaApi`, etc.) read
the env var; browser-side fetches read the URL baked into the bundle.
Both end up at `backend-e2e`. **Do not change these URLs in the
helpers** — pointing the tests back at the dev `backend:8000` would
re-introduce dev-DB pollution.

**`page.route` mocks remain optional, not required.** Existing tests
use them to deliver deterministic responses; new tests can rely on the
real backend instead. Both styles work because `page.route` matches
URLs by pattern, regardless of the underlying origin.

## Key Context Files

| File | Purpose |
|------|---------|
| `AGENTS.md` (repo root) | Repo-wide conventions, tech stack, services, commit rules |
| `docs/docs/frontend/intro.md` | Public-facing frontend architecture reference (directory tree, pages, components, domain APIs, auth, i18n) |
| `openspec/specs/frontend/` | Behavioural source of truth (spec.md + design.md per capability) |

---

## Features

### 1. Authentication & Route Protection

JWT-based auth with login, register, logout, token refresh, and protected routes.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/auth/spec.md` |
| **Design** | `openspec/specs/frontend/auth/design.md` |
| **Tests** | `frontend/tests/auth.spec.ts` |
| **Docs** | `docs/docs/frontend/intro.md` (Authentication section) |
| **Code** | `frontend/src/lib/auth.tsx` (AuthProvider, useAuth), `frontend/src/lib/withAuth.tsx`, `frontend/src/lib/withAdmin.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/app/register/page.tsx`, `frontend/src/app/profile/page.tsx`, `frontend/src/domain/users/passwordApi.ts` |

Key decisions: React Context for auth state (not Redux/Zustand). localStorage for token persistence (keys: `auth_tokens`, `auth_user`). HOC pattern (withAuth, withAdmin) for route protection. Login page fetches and displays custom system logo if configured.

Self-service password change lives at `/profile` (linked from the profile-menu dropdown). The form calls `usersApi.changeOwnPassword`, which talks to `PUT /api/auth/change-password/`. Admin password reset lives in `/admin/users` as a per-row "Reset password" button + modal that calls `usersApi.setPassword`, which talks to `POST /api/users/<id>/set_password/`. Both forms share the `FieldErrors` shape from `domain/users/passwordApi.ts` so DRF's per-field errors map directly to the matching input.

### 2. Calendar Views

Monthly and weekly calendar views with schedule bars, conflict indicators, and daily schedule panel.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/calendar/spec.md` |
| **Design** | `openspec/specs/frontend/calendar/design.md` |
| **Tests** | `frontend/tests/calendar.spec.ts` |
| **Docs** | `docs/docs/frontend/intro.md` (Calendar components section) |
| **Code** | `frontend/src/components/Calendar.tsx`, `frontend/src/components/WeekView.tsx`, `frontend/src/components/DaySchedule.tsx`, `frontend/src/components/ScheduleDetailsPopup.tsx`, `frontend/src/components/PublicCalendar.tsx` |

Key decisions: Two separate components for month/week (not polymorphic). CSS grid layout. 8-color stable pet color palette (memoized). Stacking algorithm for overlapping bars (max 3 visible + "+N more"). Public calendar uses direct fetch without auth.

### 3. Pet Management

Pet CRUD with behavioral attributes, vaccinations, medical notes, documents, and profile pictures.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/pets/spec.md` |
| **Design** | `openspec/specs/frontend/pets/design.md` |
| **Change spec** | `openspec/changes/avatar-on-create/specs/frontend/pets/spec.md` (avatar during creation) |
| **Tests** | `frontend/tests/pets.spec.ts` |
| **Docs** | `docs/docs/frontend/intro.md` (PetForm section) |
| **Code** | `frontend/src/components/PetForm.tsx`, `frontend/src/components/PetList.tsx`, `frontend/src/components/MedicalNotesSection.tsx`, `frontend/src/components/DocumentUpload.tsx`, `frontend/src/components/ProfilePictureUpload.tsx`, `frontend/src/domain/pets/api.ts` |

Key decisions: Owner selection gates all other fields. Dominance slider with color coding (green/yellow/red). Profile picture available in **both create and edit modes** — in create mode, file stored in local state (`pendingProfilePicture`) and sent as multipart FormData via `createWithAvatar`. Medical notes and documents only in edit mode. Vaccinations managed as dynamic list.

### 4. Owner Management

Owner CRUD with search, expandable cards, batch scheduling, and profile pictures.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/owners/spec.md` |
| **Design** | `openspec/specs/frontend/owners/design.md` |
| **Tests** | (covered in navigation and integration tests) |
| **Docs** | `docs/docs/frontend/intro.md` (Owners page) |
| **Code** | `frontend/src/app/owners/page.tsx`, `frontend/src/components/OwnerForm.tsx`, `frontend/src/domain/owners/api.ts` |

Key decisions: Client-side search filter (not server-side). Lazy-loaded owner detail (fetched on expand). Profile picture available in **both create and edit modes** via `createWithAvatar`. Batch scheduling pre-selects all owner's pets.

### 5. Schedule Management

Schedule creation/editing with real-time conflict detection, multi-pet batch scheduling, and daily limit checks.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/schedules/spec.md` |
| **Design** | `openspec/specs/frontend/schedules/design.md` |
| **Tests** | `frontend/tests/schedule.spec.ts` |
| **Docs** | `docs/docs/frontend/intro.md` (ScheduleForm section) |
| **Code** | `frontend/src/components/ScheduleForm.tsx`, `frontend/src/components/MultiPetScheduleForm.tsx`, `frontend/src/domain/schedules/api.ts` |

Key decisions: Unified ScheduleForm with mode prop ('single' | 'multi'). MultiPetScheduleForm is a backward-compat re-export. 500ms debounced conflict checking. 15-minute time intervals (96 options). Result screen inline (not separate page). Daily limit override via confirmation dialog.

### 6. Settings & System Logo

System logo management, daily booking limits, pet incompatibility rules, and vaccination type management.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/settings/spec.md` |
| **Design** | `openspec/specs/frontend/settings/design.md` |
| **Change spec** | `openspec/changes/add-system-logo/specs/frontend/settings/spec.md` (logo upload) |
| **Tests** | `frontend/tests/settings.spec.ts` |
| **Docs** | `docs/docs/frontend/intro.md` (Settings page) |
| **Code** | `frontend/src/app/settings/page.tsx`, `frontend/src/domain/settings/api.ts` |

Key decisions: Logo upload uses ProfilePictureUpload component. Incompatibility rules stored in localStorage (not server). Vaccination types managed inline (no modal). Daily limit save with temporary success feedback.

### 7. Admin User Management

Admin-only page for managing users, roles, and account status.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/user-management/spec.md` |
| **Design** | `openspec/specs/frontend/user-management/design.md` |
| **Tests** | (covered in auth and navigation tests) |
| **Docs** | `docs/docs/frontend/intro.md` (Admin page) |
| **Code** | `frontend/src/app/admin/users/page.tsx`, `frontend/src/domain/users/api.ts` |

Key decisions: withAdmin HOC for access control. Stats cards computed client-side. Modal CRUD pattern. Colored role/status badges.

### 8. Internationalization (i18n)

English and Spanish translations with browser auto-detection and real-time switching.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/i18n/spec.md` |
| **Design** | `openspec/specs/frontend/i18n/design.md` |
| **Tests** | `frontend/tests/language.spec.ts` |
| **Docs** | `docs/docs/frontend/intro.md` (Translation section) |
| **Code** | `frontend/src/lib/translations.tsx` (TranslationProvider, useTranslation), `frontend/src/components/LanguageSwitcher.tsx` |

Key decisions: React Context (not i18next/react-intl). Translations fetched from backend API (not bundled). Default language: Spanish. Dot-notation key lookup with `{placeholder}` interpolation.

### 9. Dark Mode / Theming

Light and dark themes with system preference detection and manual toggle.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/theme/spec.md` |
| **Design** | `openspec/specs/frontend/theme/design.md` |
| **Tests** | (covered in navigation tests) |
| **Docs** | `docs/docs/frontend/intro.md` |
| **Code** | `frontend/src/components/ThemeToggle.tsx`, `frontend/tailwind.config.ts` |

Key decisions: Tailwind 'class' strategy (not 'media'). Sun/Moon icons from Lucide. Theme class on HTML root element. localStorage persistence.

### 10. UI Component Library

Reusable components: Button, Input, Card, Select, Badge.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/ui-components/spec.md` |
| **Design** | `openspec/specs/frontend/ui-components/design.md` |
| **Tests** | (used across all E2E tests) |
| **Docs** | `docs/docs/frontend/intro.md` |
| **Code** | `frontend/src/components/ui/Button.tsx`, `frontend/src/components/ui/Input.tsx`, `frontend/src/components/ui/Card.tsx`, `frontend/src/components/ui/Select.tsx`, `frontend/src/components/ui/Badge.tsx` |

Key decisions: Custom library (no shadcn/Material/Chakra). Components extend native HTML element props via forwardRef. Variant/size pattern with Tailwind class maps. Composable Card sub-component pattern.

### 11. Notifications

Bell + unread badge in Navigation, dedicated `/notifications` page with mark-read / dismiss actions, and forward-to-owner affordances (`mailto:` + `api.whatsapp.com/send`). Operator templates and per-kind toggles live in the Settings page. Hidden when the master `notifications` feature flag is off.

| Artifact | Path |
|----------|------|
| **Spec** | `openspec/specs/frontend/notifications/spec.md` (after archive) |
| **Design** | `openspec/specs/frontend/notifications/design.md` |
| **Tests** | TBD (Playwright) |
| **Docs** | `docs/docs/frontend/intro.md` (Notifications — TBD) |
| **Code** | `frontend/src/app/notifications/page.tsx`, `frontend/src/components/NotificationBell.tsx`, `frontend/src/components/NotificationsSettings.tsx`, `frontend/src/domain/notifications/` |

Key decisions: Polling at 60s for unread count. Localised one-liners under `notifications.kind.<kind>`. Forward block pre-rendered server-side; frontend only assembles the deep links. Settings UI shows nursery-wide config (admin-write) + per-user email opt-in (any user) + operator templates (admin-write).

---

## Change Log (OpenSpec Changes)

Active or recently completed changes tracked in `openspec/changes/`:

| Change | Status | Artifacts |
|--------|--------|-----------|
| `add-system-logo` | Implemented | `proposal.md`, `design.md`, `tasks.md`, delta specs for frontend/auth, frontend/settings |
| `avatar-on-create` | Implemented | `proposal.md`, `design.md`, `tasks.md`, delta specs for frontend/pets |

---

## Conventions

- **Domain-sliced API clients** live in `src/domain/<feature>/` with `types.ts` and `api.ts`. Aggregated in `src/lib/api.ts`.
- **HTTP helpers**: `fetchApi<T>()` for JSON, `uploadFile<T>()` for multipart. Both in `src/domain/_http/client.ts`.
- **State management**: React hooks + Context only. No Redux/Zustand.
- **Auth tokens**: localStorage keys `auth_tokens` and `auth_user`.
- **Language preference**: localStorage key `preferred_language`.
- **Route protection**: `withAuth` HOC (redirects to /login) and `withAdmin` HOC (redirects to /).
- **Refresh pattern**: Counter-based (`refreshTrigger` prop) for data invalidation after mutations.
- **Playwright tests**: In `frontend/tests/`. Auth state seeded via localStorage in test helpers.
- **OpenSpec standard**: All specs follow [OpenSpec.dev](https://openspec.dev) format.
