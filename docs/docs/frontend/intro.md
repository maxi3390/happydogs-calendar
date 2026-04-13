# Frontend Architecture

## Overview

The Happy Calendar frontend is a server-rendered React application built with Next.js 16 and the App Router. It provides a responsive, multi-language interface for managing pet nursery schedules — including monthly/weekly calendar views, real-time conflict detection, pet and owner management, and admin user administration.

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16 | Framework (App Router) |
| **React** | 19 | UI library |
| **TypeScript** | 5.7 | Type safety |
| **TailwindCSS** | 3.4 | Utility-first styling |
| **Lucide React** | — | Icon library |
| **date-fns** | — | Date manipulation |
| **Playwright** | — | End-to-end testing |

> **No external state management libraries are used** — no Redux, Zustand, Jotai, or similar. All global state is managed through React Context + hooks. Local component state uses `useState` and `useEffect`.

## Directory Structure

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout: AuthProvider + TranslationProvider
│   │   ├── page.tsx                # Main calendar page (public + authenticated views)
│   │   ├── login/page.tsx          # Login page
│   │   ├── register/page.tsx       # Registration page
│   │   ├── pets/page.tsx           # Pet management (withAuth protected)
│   │   ├── owners/page.tsx         # Owner management (withAuth protected)
│   │   ├── settings/page.tsx       # Settings & incompatibility rules (withAuth protected)
│   │   ├── admin/users/page.tsx    # Admin user management (withAdmin protected)
│   │   ├── ui-system/page.tsx      # UI component showcase
│   │   └── globals.css
│   ├── components/                 # Shared React components
│   │   ├── Calendar.tsx            # Monthly calendar view with schedule bars
│   │   ├── WeekView.tsx            # Weekly schedule view with pet rows
│   │   ├── DaySchedule.tsx         # Daily schedule panel with status management
│   │   ├── ScheduleForm.tsx        # Unified schedule form (single + multi mode)
│   │   ├── MultiPetScheduleForm.tsx# Re-export wrapper for ScheduleForm mode='multi'
│   │   ├── PetForm.tsx             # Pet CRUD with vaccinations, medical notes, documents
│   │   ├── PetList.tsx             # Expandable pet cards
│   │   ├── OwnerForm.tsx           # Owner CRUD form
│   │   ├── Navigation.tsx          # Top nav bar (desktop + mobile hamburger)
│   │   ├── LanguageSwitcher.tsx    # Language selector
│   │   ├── ThemeToggle.tsx         # Dark mode toggle (Sun/Moon icons)
│   │   ├── ProfilePictureUpload.tsx# Circular picture upload with initials fallback
│   │   ├── MedicalNotesSection.tsx # Inline medical notes CRUD
│   │   ├── DocumentUpload.tsx      # Drag-and-drop document upload
│   │   ├── ScheduleDetailsPopup.tsx# Modal popup for schedule details
│   │   ├── PublicCalendar.tsx      # Public availability calendar (no auth required)
│   │   └── ui/                     # Reusable UI component library
│   │       ├── Button.tsx          # 5 variants, 4 sizes
│   │       ├── Input.tsx           # Label, icons, error support
│   │       ├── Card.tsx            # Composable Card/CardHeader/CardTitle/CardContent/CardFooter
│   │       ├── Select.tsx
│   │       └── Badge.tsx
│   ├── domain/                     # Domain-sliced API clients and types
│   │   ├── _http/client.ts         # fetchApi<T> and uploadFile<T> helpers
│   │   ├── auth/types.ts
│   │   ├── owners/{api,types,index}.ts
│   │   ├── pets/{api,types,index}.ts
│   │   ├── schedules/{api,types,index}.ts
│   │   ├── vaccinations/{api,types,index}.ts
│   │   ├── documents/{api,types,index}.ts
│   │   ├── medical-notes/{api,types}.ts
│   │   ├── settings/{api,types,index}.ts
│   │   ├── users/{api,types}.ts
│   │   └── translations/types.ts
│   └── lib/
│       ├── api.ts                  # Barrel: re-exports all domain types + single api object
│       ├── auth.tsx                # AuthProvider, useAuth hook, authFetch helper
│       ├── withAuth.tsx            # HOC for auth-protected pages
│       ├── withAdmin.tsx           # HOC for admin-only pages
│       └── translations.tsx        # TranslationProvider, useTranslation hook
├── tests/                          # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── calendar.spec.ts
│   ├── pets.spec.ts
│   ├── schedule.spec.ts
│   ├── language.spec.ts
│   ├── navigation.spec.ts
│   ├── settings.spec.ts
│   └── helpers.ts
├── Dockerfile                      # Multi-stage: deps -> builder -> runner (node:22-alpine)
├── package.json
├── tailwind.config.ts
├── playwright.config.ts
└── next.config.ts
```

## Pages

The application defines **8 pages**:

| Route | File | Protection | Description |
|---|---|---|---|
| `/` | `page.tsx` | None | Main calendar. Shows `PublicCalendar` when unauthenticated; full dashboard (`Calendar`/`WeekView` + `DaySchedule`) when authenticated |
| `/login` | `login/page.tsx` | None | Email + password login. Password visibility toggle, error display. Redirects to `/` if already authenticated |
| `/register` | `register/page.tsx` | None | Name, email, password + confirmation (min 8 chars). Redirects to `/` if already authenticated |
| `/pets` | `pets/page.tsx` | `withAuth` | Pet management — `PetList` + `PetForm` modal |
| `/owners` | `owners/page.tsx` | `withAuth` | Owner management — search, expandable cards, batch and individual scheduling |
| `/settings` | `settings/page.tsx` | `withAuth` | Daily capacity limit, incompatibility rules (localStorage), vaccination types |
| `/admin/users` | `admin/users/page.tsx` | `withAdmin` | Admin user management — stats cards, user table, CRUD modals, role/status badges |
| `/ui-system` | `ui-system/page.tsx` | None | UI component showcase page |

## Component Architecture

```mermaid
graph TB
    subgraph "Root Layout (layout.tsx)"
        AuthProvider["AuthProvider"]
        TranslationProvider["TranslationProvider"]
    end

    subgraph "Pages"
        MainPage["/ — Calendar Dashboard"]
        LoginPage["/login"]
        RegisterPage["/register"]
        PetsPage["/pets (withAuth)"]
        OwnersPage["/owners (withAuth)"]
        SettingsPage["/settings (withAuth)"]
        AdminPage["/admin/users (withAdmin)"]
    end

    subgraph "Calendar Components"
        Calendar["Calendar.tsx — Monthly grid"]
        WeekView["WeekView.tsx — Weekly rows"]
        DaySchedule["DaySchedule.tsx — Daily panel"]
        PublicCalendar["PublicCalendar.tsx — Public view"]
    end

    subgraph "Form Components"
        ScheduleForm["ScheduleForm.tsx — Single + Multi mode"]
        PetForm["PetForm.tsx"]
        OwnerForm["OwnerForm.tsx"]
    end

    subgraph "UI Library (ui/)"
        Button["Button.tsx"]
        Input["Input.tsx"]
        Card["Card.tsx"]
        Select["Select.tsx"]
        Badge["Badge.tsx"]
    end

    AuthProvider --> TranslationProvider
    TranslationProvider --> MainPage
    TranslationProvider --> LoginPage
    TranslationProvider --> PetsPage
    TranslationProvider --> OwnersPage
    TranslationProvider --> SettingsPage
    TranslationProvider --> AdminPage

    MainPage --> Calendar
    MainPage --> WeekView
    MainPage --> DaySchedule
    MainPage --> PublicCalendar
    MainPage --> ScheduleForm

    PetsPage --> PetForm
    OwnersPage --> OwnerForm

    Calendar --> Button
    ScheduleForm --> Input
    ScheduleForm --> Select
    PetForm --> Input
    PetForm --> Card
    DaySchedule --> Badge

    style AuthProvider fill:#e3f2fd
    style TranslationProvider fill:#f3e5f5
    style Calendar fill:#e8f5e9
    style WeekView fill:#e8f5e9
    style DaySchedule fill:#e8f5e9
    style ScheduleForm fill:#fff3e0
    style PetForm fill:#fff3e0
    style OwnerForm fill:#fff3e0
```

### Key Components

#### Calendar.tsx — Monthly Calendar View

The main calendar renders a CSS grid (7 columns) representing a month. Key behaviors:

- **8-color stable palette**: Each pet is assigned a deterministic color based on its ID, ensuring the same pet always has the same color across views.
- **Multi-day bar spanning**: Schedules spanning multiple days render as continuous horizontal bars across grid cells.
- **Stacking algorithm**: Up to 3 schedule bars are visible per cell. When there are more, a **"+N more"** overflow indicator appears.
- **Clickable bars**: Clicking a schedule bar opens the `ScheduleDetailsPopup` modal with full details.
- **Navigation**: Month-to-month navigation with previous/next controls and a today button.

#### WeekView.tsx — Weekly Schedule View

Renders a week as a grid where each **row is a pet** and each **column is a day**. Schedule bars span horizontally across the pet's row, giving a clear per-pet overview of the week.

#### DaySchedule.tsx — Daily Schedule Panel

A scrollable list of all schedules for the selected date. Features:

- **Inline status dropdown**: Change schedule status (scheduled, confirmed, in progress, completed, cancelled) directly in the list.
- **Conflict details**: If a schedule has incompatibility conflicts, they are highlighted inline.
- **Edit/Delete actions**: Each schedule entry has edit and delete buttons that open the appropriate form or confirmation dialog.

#### ScheduleForm.tsx — Unified Schedule Form

A single component handling both scheduling modes via a `mode` prop:

- **`mode='single'`**: Pet dropdown selection. Includes a **500ms debounced conflict check** — as the user adjusts dates/times, the system checks for incompatibility and capacity conflicts in near real-time.
- **`mode='multi'`**: Owner filter dropdown + pet checkboxes. Supports **select all / clear all** for batch scheduling.
- **Both modes**: 15-minute time intervals for start/end times. Daily capacity limit check before submission. After scheduling, a **result screen** shows successes and failures.

`MultiPetScheduleForm.tsx` is a thin re-export wrapper that renders `ScheduleForm` with `mode='multi'`.

#### PetForm.tsx — Pet CRUD Form

- **Owner required first**: The owner field must be selected before other fields are enabled (gates the form).
- **Dominance slider**: Visual slider from 1–10 with color coding: green (1–3), yellow (4–6), red (7–10).
- **Birth date → age**: Selecting a birth date automatically calculates and displays the pet's age.
- **Vaccinations**: Dynamic list — add/remove vaccination entries with type and date.
- **Edit-mode-only features**: Profile picture upload (`ProfilePictureUpload`), medical notes (`MedicalNotesSection`), and documents (`DocumentUpload`) are only available when editing an existing pet, not when creating.

#### Navigation.tsx — Top Navigation Bar

- **Sticky positioning** with scroll detection (changes background opacity on scroll).
- **Desktop**: Horizontal links + profile dropdown menu with logout.
- **Mobile**: Hamburger menu that slides open with all navigation links.
- **Admin indicator**: Visual badge/indicator when the logged-in user has admin role.

#### PublicCalendar.tsx — Public Availability Calendar

Displayed on the main page (`/`) when no user is authenticated. Shows a read-only calendar indicating nursery availability without exposing pet or owner details.

### UI Component Library (`ui/`)

| Component | Description |
|---|---|
| `Button.tsx` | 5 variants (primary, secondary, outline, ghost, destructive) × 4 sizes (sm, md, lg, icon) |
| `Input.tsx` | Text input with label, left/right icon slots, and error message support |
| `Card.tsx` | Composable card with `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` sub-components |
| `Select.tsx` | Styled select dropdown |
| `Badge.tsx` | Status/label badges with color variants |

## State Management

### Architecture

The application uses **no external state management libraries**. All global state is handled through two React Context providers, and local UI state uses standard React hooks.

```mermaid
graph LR
    subgraph "Global State (Context)"
        Auth["AuthProvider<br/>user, tokens, isAdmin"]
        i18n["TranslationProvider<br/>language, translations"]
    end

    subgraph "Persistence"
        LS["localStorage"]
    end

    subgraph "Server State"
        API["Backend API"]
    end

    subgraph "Component State"
        Hooks["useState / useEffect<br/>+ counter-based refresh triggers"]
    end

    Auth -- "auth_tokens<br/>auth_user" --> LS
    i18n -- "preferred_language" --> LS
    Hooks -- "fetchApi / uploadFile" --> API
    API -- "JSON responses" --> Hooks
    Auth -- "login/register/logout/refreshToken" --> API

    style Auth fill:#e3f2fd
    style i18n fill:#f3e5f5
    style LS fill:#e0f2f1
    style API fill:#fce4ec
    style Hooks fill:#e8f5e9
```

### AuthProvider (`lib/auth.tsx`)

Wraps the entire application in the root `layout.tsx`. Manages:

- **User object** and **authentication state** (`isAuthenticated`, `isAdmin`).
- **JWT tokens** stored in `localStorage` under the keys `auth_tokens` and `auth_user`.
- **Provided methods**: `login(email, password)`, `register(userData)`, `logout()`, `refreshToken()`.
- On mount, reads tokens from `localStorage` and validates them. If invalid, clears state and redirects.

### TranslationProvider (`lib/translations.tsx`)

Also wraps the entire application in the root `layout.tsx` (inside `AuthProvider`). Manages:

- **Translations** fetched from the backend API.
- **Language preference** stored in `localStorage` under the key `preferred_language`.
- **Default language**: Spanish.
- **Browser auto-detection**: On first visit (no stored preference), detects the browser's language.
- **`useTranslation` hook** provides `t(key, params?)` for interpolated translation lookups.

### Data Invalidation Pattern

Instead of a global store or cache, the application uses **counter-based refresh triggers**. When a mutation occurs (e.g., creating a schedule), a counter state variable is incremented. Components that depend on that data include the counter in their `useEffect` dependency arrays, causing a re-fetch.

## HTTP Layer

### Domain-Sliced API Architecture

API logic is organized by domain under `src/domain/`. Each domain folder contains:

- `types.ts` — TypeScript interfaces for the domain's data models.
- `api.ts` — Functions that call the backend endpoints for that domain.
- `index.ts` — Barrel file re-exporting types and API functions.

The barrel file `src/lib/api.ts` re-exports everything from all domain modules, providing a single `api` import for the rest of the application.

### HTTP Client (`domain/_http/client.ts`)

Two core functions:

- **`fetchApi<T>(endpoint, options)`** — Makes JSON HTTP requests. Automatically attaches the `Authorization` header if the user is authenticated. Resolves the base URL from the `NEXT_PUBLIC_API_URL` environment variable (default: `http://localhost:8000/api`).
- **`uploadFile<T>(endpoint, formData)`** — Makes multipart/form-data requests for file uploads (profile pictures, documents). Same base URL resolution and auth behavior.

Both functions handle error responses and return typed results.

## Route Protection

### `withAuth` HOC (`lib/withAuth.tsx`)

A higher-order component that wraps page components requiring authentication:

- Checks `isAuthenticated` from `AuthProvider`.
- If not authenticated, **redirects to `/login`**.
- Shows a loading state while authentication status is being determined.
- Used by: `/pets`, `/owners`, `/settings`.

### `withAdmin` HOC (`lib/withAdmin.tsx`)

A higher-order component for admin-only pages:

- Checks `isAuthenticated` from `AuthProvider` — if not authenticated, **redirects to `/login`**.
- Checks `isAdmin` from `AuthProvider` — if authenticated but not admin, **redirects to `/`**.
- Used by: `/admin/users`.

```mermaid
flowchart TD
    A[User visits protected page] --> B{isLoading?}
    B -- Yes --> C[Show loading spinner]
    B -- No --> D{isAuthenticated?}
    D -- No --> E[Redirect to /login]
    D -- Yes --> F{Page requires admin?}
    F -- No --> G[Render page]
    F -- Yes --> H{isAdmin?}
    H -- Yes --> G
    H -- No --> I[Redirect to /]
```

## Theming

### Dark Mode

The `ThemeToggle` component switches between light and dark mode using Tailwind's `dark:` variant classes. The toggle renders a Sun icon (for switching to light) or Moon icon (for switching to dark) from Lucide React. Theme preference is persisted in `localStorage`.

### Responsive Design

All pages and components are responsive using Tailwind breakpoints:

- **Mobile-first**: Base styles target mobile screens.
- **Desktop enhancements**: `md:` and `lg:` breakpoints add larger layouts, sidebar panels, and multi-column grids.
- **Navigation**: Switches from hamburger menu (mobile) to horizontal link bar (desktop).

## Testing

### Playwright E2E Tests

End-to-end tests live in the `tests/` directory and cover:

| Test File | Coverage |
|---|---|
| `auth.spec.ts` | Login, registration, logout, auth redirects |
| `calendar.spec.ts` | Calendar navigation, view switching, date selection |
| `pets.spec.ts` | Pet CRUD, form validation, owner gating |
| `schedule.spec.ts` | Schedule creation, conflict detection, status changes |
| `language.spec.ts` | Language switching, translation loading, persistence |
| `navigation.spec.ts` | Desktop/mobile nav, route protection, admin visibility |
| `settings.spec.ts` | Settings CRUD, incompatibility rules |
| `helpers.ts` | Shared test utilities (login helpers, selectors, fixtures) |

Tests are configured via `playwright.config.ts` and can be run with:

```bash
make test-frontend          # Run all E2E tests (headless)
make test-frontend-debug    # Run with Playwright UI for debugging
```

## Build & Deployment

The frontend Dockerfile uses a **multi-stage build**:

1. **`deps`** stage: `node:22-alpine`, installs `node_modules` from `package.json` / lock file.
2. **`builder`** stage: Copies source code, runs `next build` to produce the production bundle.
3. **`runner`** stage: Minimal `node:22-alpine` image, copies only the built output and runs `next start`.

In the Docker Compose setup, Traefik routes all requests matching `/*` (except `/api/*` and `/media/*`) to the frontend container on port 3000.
