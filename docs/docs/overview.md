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

- **Species**: Dog, Cat, Bird, Rabbit, Other
- **Temperament**: Calm, Playful, Aggressive, Anxious, Friendly
- **Dominance Level**: 1–10 scale (submissive to very dominant)
- **Size**: Small, Medium, Large
- **Details**: Breed, age, sex, neutered status, birth date, weight (kg)
- **Special Notes**: Free-text field for additional care instructions
- **Profile Pictures**: JPEG, PNG, GIF, WEBP — max 5 MB per image
- **Vaccination Records**: Date-stamped records linked to configurable vaccination types
- **Medical Notes**: Title + description entries with inline CRUD
- **Document Attachments**: Upload files (JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX — max 5 MB) with drag-and-drop support

### 2. Owner Management

- **Contact Information**: First name, last name, email (unique), phone, ID number (unique), address, birth date
- **Emergency Contact**: Name, phone, and can-pickup flag
- **Notes**: Free-text field for additional information
- **Profile Pictures**: Same format/size constraints as pets; can be uploaded during creation or added later

### System Branding
- **Custom Logo**: Upload a custom logo image via settings (JPEG/PNG/GIF/WEBP, max 5 MB)
- **Login Page Branding**: Custom logo displayed on the login page, replacing the default icon
- **Navigation Branding**: Custom logo displayed in the navigation bar, replacing the default PawPrint icon
- **Fallback**: Default icons shown when no custom logo is configured
- **Document Attachments**: Upload files linked to owner records
- **Pet Relationships**: View and manage all pets associated with an owner

### 3. Smart Scheduling with Conflict Detection

The scheduling engine implements 5 conflict detection rules (see [Business Logic](#business-logic) below) that evaluate pet compatibility in real time. Key characteristics:

- **Multi-day Schedules**: Separate start/end dates and start/end times
- **Status Tracking**: Scheduled → Checked In → Completed / Cancelled
- **Conflicts are Warnings, Not Blockers**: Schedules are always created; conflicts are returned as warnings alongside the created schedule
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
- **Admin User Management Panel**: Admins can create, edit, and deactivate user accounts

### 11. Internationalization (i18n)

- **Languages**: English and Spanish
- **API-Served Translations**: Translation strings fetched from the backend
- **Browser Auto-Detection**: Initial language set from browser preferences
- **localStorage Persistence**: Language choice remembered across sessions
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

- **Button**: 5 variants, 4 sizes
- **Input**: Icon support, labels, error messages
- **Card**: Composable card components
- **Select**: Dropdown select component
- **Badge**: Status and category badges

### 15. API Documentation

- **Swagger UI**: Live interactive docs at `/api/docs/`
- **ReDoc**: Alternative documentation at `/api/redoc/`
- **OpenAPI Schema**: Machine-readable schema at `/api/schema/`

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5.7 | Type-safe JavaScript |
| TailwindCSS | 3.4 | Utility-first CSS framework |
| Lucide React | 0.475+ | Icon library |
| date-fns | 4.1+ | Date manipulation utilities |
| Playwright | 1.50+ | End-to-end testing |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Django | 5.1.4 | Web framework |
| Django REST Framework | 3.15.2 | REST API toolkit |
| djangorestframework-simplejwt | 5.3.1 | JWT authentication |
| drf-spectacular | 0.28.0 | OpenAPI 3.0 schema generation |
| Pillow | 11.1.0 | Image processing for uploads |
| psycopg2-binary | 2.9.10 | PostgreSQL adapter |
| django-cors-headers | 4.6.0 | CORS handling |
| gunicorn | 23.0.0 | Production WSGI server |

### Infrastructure

| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 16 (Alpine) | Relational database |
| Docker & Docker Compose | — | Containerization and orchestration |
| Traefik | v3.6 | Reverse proxy, TLS termination, routing |

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

Optional services (via Docker Compose profiles):
  - docs:    Docusaurus (profile: docs)    → :3001
  - pgadmin: pgAdmin 4  (profile: dev)     → :5050

Security:
  - docker-socket-proxy: Read-only Docker API access for Traefik
  - Networks: socket-proxy (internal), proxy (app communication)
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
   docker compose --profile docs up docs       # Docusaurus at :3001
   docker compose --profile dev up pgadmin     # pgAdmin at :5050
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
