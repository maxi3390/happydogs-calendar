# Architecture

## System Overview

Happy Calendar is a full-stack web application with a clear three-tier architecture: a **Next.js 16** frontend, a **Django 5.1.4** REST API backend, and a **PostgreSQL 18** database. All services are containerized with Docker Compose and routed through a **Traefik v3.6** reverse proxy that handles TLS termination and path-based routing.

There is no external caching layer (no Redis). All state lives in PostgreSQL. Authentication uses stateless JWT tokens with server-side blacklisting for revocation.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Internet"
        Client[Browser / Client]
    end

    subgraph "Docker Compose Stack"
        subgraph "Reverse Proxy"
            Traefik["Traefik v3.6<br/>:80 → :443 redirect<br/>TLS termination"]
        end

        subgraph "Application Services"
            Frontend["Frontend<br/>Next.js 16 + React 19<br/>:3000"]
            Backend["Backend<br/>Django 5.1.4 + DRF 3.15.2<br/>:8000"]
        end

        subgraph "Data Layer"
            DB[("PostgreSQL 18<br/>:5432")]
        end

        subgraph "Infrastructure"
            SocketProxy["Docker Socket Proxy<br/>(read-only API access)"]
        end
    end

    Client -->|"HTTPS :443"| Traefik
    Traefik -->|"/* → :3000"| Frontend
    Traefik -->|"/api/*, /media/* → :8000"| Backend
    Traefik -->|"tcp://docker-socket-proxy:2375"| SocketProxy
    Backend --> DB

    style Client fill:#e1f5fe
    style Traefik fill:#fff3e0
    style Frontend fill:#e3f2fd
    style Backend fill:#f3e5f5
    style DB fill:#e8f5e8
    style SocketProxy fill:#fce4ec
```

### Routing Rules

| Path Pattern | Target Service | Port |
|---|---|---|
| `/api/*` | backend | 8000 |
| `/media/*` | backend | 8000 |
| `/*` (catch-all) | frontend | 3000 |

All HTTP traffic on port 80 is permanently redirected to HTTPS on port 443.

---

## Component Architecture

### Frontend Architecture

The frontend uses the **Next.js App Router** with **React 19** and **TypeScript 5.7**. State is managed through React Context providers and custom hooks. API communication is organized into domain-sliced modules.

```mermaid
graph TB
    subgraph "Next.js App Router"
        RootLayout["Root Layout<br/>Providers, Theme, Nav"]
        Pages["Pages<br/>Calendar, Pets, Owners,<br/>Settings, Auth, Users"]
    end

    subgraph "React Context Providers"
        AuthProvider["AuthProvider<br/>JWT tokens, user state,<br/>login/logout"]
        TranslationProvider["TranslationProvider<br/>Language detection,<br/>real-time switching"]
    end

    subgraph "Domain API Clients (src/domain/)"
        AuthAPI["auth/"]
        PetsAPI["pets/"]
        OwnersAPI["owners/"]
        SchedulesAPI["schedules/"]
        VaccinationsAPI["vaccinations/"]
        DocumentsAPI["documents/"]
        MedicalNotesAPI["medical-notes/"]
        SettingsAPI["settings/"]
        TranslationsAPI["translations/"]
        UsersAPI["users/"]
    end

    subgraph "Shared Infrastructure"
        HttpClient["_http/client.ts<br/>Base HTTP client,<br/>JWT header injection"]
    end

    subgraph "UI Components"
        Button["Button<br/>5 variants, 4 sizes"]
        Input["Input<br/>icons, labels, errors"]
        Card["Card<br/>composable"]
        Select["Select"]
        Badge["Badge"]
    end

    RootLayout --> AuthProvider
    RootLayout --> TranslationProvider
    RootLayout --> Pages
    Pages --> AuthAPI & PetsAPI & OwnersAPI & SchedulesAPI
    Pages --> VaccinationsAPI & DocumentsAPI & MedicalNotesAPI
    Pages --> SettingsAPI & TranslationsAPI & UsersAPI
    AuthAPI & PetsAPI & OwnersAPI & SchedulesAPI --> HttpClient
    VaccinationsAPI & DocumentsAPI & MedicalNotesAPI --> HttpClient
    SettingsAPI & TranslationsAPI & UsersAPI --> HttpClient
    Pages --> Button & Input & Card & Select & Badge

    style RootLayout fill:#e3f2fd
    style AuthProvider fill:#fff3e0
    style TranslationProvider fill:#fff3e0
    style HttpClient fill:#e0f2f1
```

**Key design decisions:**

- **Domain-sliced API clients**: Each domain (`pets/`, `owners/`, `schedules/`, etc.) has its own `api.ts` and `types.ts` under `src/domain/`, keeping API logic co-located with type definitions
- **Centralized HTTP client**: `src/domain/_http/client.ts` handles base URL configuration and JWT `Authorization` header injection
- **Context-based state**: `AuthProvider` manages authentication state (tokens, user info, login/logout); `TranslationProvider` manages i18n (language detection, switching, caching)
- **No external state library**: State management uses React Context and hooks — no Redux, Zustand, or similar

### Backend Architecture

The backend is a **Django 5.1.4** project with **3 Django apps** and a **domain model package**:

```mermaid
graph TB
    subgraph "Django Project (nursery/)"
        Settings["nursery/settings.py<br/>Configuration"]
        URLs["nursery/urls.py<br/>URL routing"]
    end

    subgraph "Django Apps"
        Accounts["accounts/<br/>User model, JWT auth,<br/>registration, user management"]
        Pets["pets/<br/>Views, serializers, admin<br/>Re-exports domain models"]
        NurserySettings["nursery_settings/<br/>Singleton config model,<br/>daily booking limit, logo"]
    end

    subgraph "Domain Models (backend/domain/)"
        DomainOwners["domain/owners/<br/>Owner model"]
        DomainPets["domain/pets/<br/>Pet model + is_compatible_with()"]
        DomainSchedules["domain/schedules/<br/>Schedule model + conflict check"]
        DomainVaccinations["domain/vaccinations/<br/>VaccinationType + Vaccination"]
        DomainDocuments["domain/documents/<br/>Document model"]
        DomainNotes["domain/notes/<br/>Note (abstract) + MedicalNote"]
        DomainFiles["domain/files/<br/>File validators (size, type)"]
    end

    subgraph "Translations"
        TranslationsApp["translations/<br/>JSON translation files,<br/>API endpoint"]
    end

    URLs --> Accounts & Pets & NurserySettings & TranslationsApp
    Pets -->|"re-exports"| DomainOwners & DomainPets & DomainSchedules
    Pets -->|"re-exports"| DomainVaccinations & DomainDocuments & DomainNotes
    DomainPets --> DomainFiles
    DomainDocuments --> DomainFiles
    DomainOwners --> DomainFiles

    style Settings fill:#fce4ec
    style Accounts fill:#e3f2fd
    style Pets fill:#f3e5f5
    style NurserySettings fill:#e8f5e8
    style DomainPets fill:#fff3e0
    style DomainSchedules fill:#fff3e0
```

**Key design decisions:**

- **Domain model package**: All business models live in `backend/domain/` (owners, pets, schedules, vaccinations, documents, notes, files), each with `app_label = 'pets'` so Django manages them under a single migration history
- **Model re-export**: `pets/models.py` re-exports all domain models, making them accessible via `pets.Owner`, `pets.Pet`, `pets.Schedule`, etc.
- **Singleton settings**: `NurserySetting` enforces `pk=1` in its `save()` method, ensuring exactly one configuration row
- **No separate schedules app**: Schedules are a domain model under `domain/schedules/`, with views handled by `pets/views.py`

---

## Data Flow

### Standard API Request Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant T as Traefik
    participant F as Frontend (Next.js)
    participant A as Backend (Django)
    participant D as PostgreSQL

    B->>T: HTTPS request
    T->>F: /* routes
    F->>B: Render page (SSR/CSR)
    B->>T: API call (POST /api/schedules/)
    T->>A: Forward to backend:8000
    A->>A: JWT validation
    A->>A: Request deserialization & validation
    A->>A: Business logic (conflict detection)
    A->>D: Database query/insert
    D-->>A: Result
    A-->>T: JSON response (+ warnings if conflicts)
    T-->>B: Forward response
    B->>B: Update UI state
```

### Schedule Creation with Conflict Detection

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Backend API
    participant D as Database

    U->>F: Select pet(s), date range, time slot
    F->>A: POST /api/schedules/ (or batch endpoint)
    A->>A: Validate input fields
    A->>D: Save schedule(s) to database
    D-->>A: Schedule(s) created
    A->>D: Query overlapping schedules
    D-->>A: Return overlapping schedules
    A->>A: Run is_compatible_with() for each pet pair
    A->>A: Collect conflict warnings
    A-->>F: 201 Created + warnings[] array
    F->>F: Display schedule on calendar
    F->>F: Show conflict indicators if warnings present
    F-->>U: Updated calendar view with conflict badges
```

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Schedule : "created_by (implied)"
    Owner ||--o{ Pet : "has many"
    Owner ||--o{ Document : "has many"
    Pet ||--o{ Schedule : "has many"
    Pet ||--o{ Vaccination : "has many"
    Pet ||--o{ Document : "has many"
    Pet ||--o{ MedicalNote : "has many"

    User {
        int id PK
        string email UK "USERNAME_FIELD, unique"
        string password "hashed"
        string first_name "max 150"
        string last_name "max 150"
        string role "admin | user"
        boolean is_staff
        boolean is_superuser
        boolean is_active
        datetime created_at "auto"
        datetime updated_at "auto"
    }

    Owner {
        int id PK
        string first_name "max 100"
        string last_name "max 100"
        string email UK "unique"
        string phone "max 20"
        string id_number UK "unique, nullable"
        text address "optional"
        date birth_date "nullable"
        string emergency_contact "max 100, optional"
        string emergency_phone "max 20, optional"
        boolean emergency_contact_can_pickup "default false"
        text notes "optional"
        image profile_picture "nullable, max 5MB"
        datetime created_at "auto"
        datetime updated_at "auto"
    }

    Pet {
        int id PK
        string name "max 100"
        string species "dog|cat|bird|rabbit|other"
        string breed "max 100, optional"
        int age "positive, years"
        string temperament "calm|playful|aggressive|anxious|friendly"
        int dominance_level "1-10"
        string size "small|medium|large"
        boolean neutered "default false"
        string sex "male|female"
        date birth_date "nullable"
        decimal weight "nullable, kg"
        text special_notes "optional"
        int owner_id FK "nullable → Owner"
        image profile_picture "nullable, max 5MB"
        datetime created_at "auto"
        datetime updated_at "auto"
    }

    Schedule {
        int id PK
        int pet_id FK "→ Pet"
        date start_date "DateField"
        date end_date "DateField"
        time start_time "TimeField"
        time end_time "TimeField"
        string status "scheduled|checked_in|completed|cancelled"
        text notes "optional"
        datetime created_at "auto"
        datetime updated_at "auto"
    }

    VaccinationType {
        int id PK
        string name UK "unique, max 50"
        string label "max 100"
        boolean enabled "default true"
        int order "display order"
        datetime created_at "auto"
        datetime updated_at "auto"
    }

    Vaccination {
        int id PK
        int pet_id FK "→ Pet"
        string vax_type "max 50"
        date date
        datetime created_at "auto"
    }

    Document {
        int id PK
        int pet_id FK "nullable → Pet"
        int owner_id FK "nullable → Owner"
        file file "max 5MB"
        string original_filename "max 255"
        string description "max 255, optional"
        datetime uploaded_at "auto"
    }

    MedicalNote {
        int id PK
        int pet_id FK "→ Pet"
        string title "max 150"
        text description "optional"
        datetime created_at "auto"
        datetime updated_at "auto"
    }

    NurserySetting {
        int id PK "always 1 (singleton)"
        int daily_booking_limit "default 0 (unlimited)"
        image logo "optional, upload_to logos/"
        datetime updated_at "auto"
    }
```

### Model Details

| Model | App Label | Location | Notes |
|---|---|---|---|
| `User` | `accounts` | `accounts/models.py` | Extends `AbstractUser`, `username = None`, `USERNAME_FIELD = 'email'` |
| `Owner` | `pets` | `domain/owners/models.py` | Unique email, unique id_number |
| `Pet` | `pets` | `domain/pets/models.py` | `is_compatible_with()` method implements conflict rules |
| `Schedule` | `pets` | `domain/schedules/models.py` | Separate `DateField` + `TimeField` (not `DateTimeField`) |
| `VaccinationType` | `pets` | `domain/vaccinations/models.py` | Configurable types with enable/disable and ordering |
| `Vaccination` | `pets` | `domain/vaccinations/models.py` | Links pet to a vaccination type string + date |
| `Document` | `pets` | `domain/documents/models.py` | Polymorphic: links to either Pet or Owner (not both) |
| `Note` | — | `domain/notes/models.py` | Abstract base model (title + description + timestamps) |
| `MedicalNote` | `pets` | `domain/notes/models.py` | Concrete model extending `Note`, linked to Pet |
| `NurserySetting` | `nursery_settings` | `nursery_settings/models.py` | Singleton (`pk=1` enforced in `save()`). Stores `daily_booking_limit` and `logo` (ImageField). |

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Backend (SimpleJWT)
    participant D as Database

    U->>F: Enter email + password
    F->>A: POST /api/auth/login/
    A->>D: Validate credentials
    D-->>A: User record
    A->>A: Generate token pair<br/>(access: 60min, refresh: 7 days)
    A-->>F: { access, refresh, user }
    F->>F: Store tokens in memory/localStorage

    Note over F,A: Subsequent authenticated requests

    F->>A: GET /api/pets/<br/>Authorization: Bearer {access_token}
    A->>A: Decode & validate JWT
    A-->>F: 200 OK + data

    Note over F,A: Token refresh flow

    F->>A: POST /api/auth/token/refresh/<br/>{ refresh: token }
    A->>A: Validate refresh token
    A->>D: Blacklist old refresh token
    A->>A: Issue new token pair (rotation)
    A-->>F: { access, refresh }

    Note over F,A: Logout

    F->>A: POST /api/auth/logout/<br/>{ refresh: token }
    A->>D: Blacklist refresh token
    A-->>F: 200 OK
    F->>F: Clear stored tokens
```

### Authentication Details

- **No username**: The `User` model sets `username = None` and `USERNAME_FIELD = 'email'`
- **Access token lifetime**: 60 minutes
- **Refresh token lifetime**: 7 days
- **Token rotation**: Each refresh request issues a new token pair and blacklists the old refresh token
- **Roles**: `admin` and `user` — stored as a `CharField` with `TextChoices`
- **Admin capabilities**: User CRUD, role assignment, account deactivation

---

## Conflict Detection Algorithm

The conflict detection logic lives in two methods on the domain models:

1. **`Pet.is_compatible_with(other_pet)`** — Pairwise compatibility check
2. **`Schedule.check_conflicts()`** — Finds overlapping schedules and runs compatibility checks

```mermaid
flowchart TD
    Start["Schedule.check_conflicts()"] --> FindOverlap["Find overlapping schedules<br/>(same date range + time overlap,<br/>status: scheduled or checked_in)"]
    FindOverlap --> Loop["For each overlapping schedule"]
    Loop --> CallCompat["Pet.is_compatible_with(other_pet)"]

    CallCompat --> R1{"Rule 1:<br/>Either pet is aggressive?"}
    R1 -->|Yes| C1["❌ 'Aggressive pets cannot be<br/>scheduled together with other pets'"]
    R1 -->|No| R2{"Rule 2:<br/>Both dominance > 7?"}
    R2 -->|Yes| C2["❌ 'Two highly dominant pets<br/>cannot be scheduled together'"]
    R2 -->|No| R3{"Rule 3:<br/>Size diff ≥ 2 AND<br/>dominance diff ≥ 5?"}
    R3 -->|Yes| C3["❌ 'Large size difference with<br/>significant dominance difference'"]
    R3 -->|No| R4{"Rule 4:<br/>Different species AND<br/>(aggressive,anxious) or<br/>(aggressive,calm) pair?"}
    R4 -->|Yes| C4["❌ 'Incompatible temperaments<br/>between different species'"]
    R4 -->|No| R5{"Rule 5:<br/>anxious + playful AND<br/>dominance diff > 4?"}
    R5 -->|Yes| C5["❌ 'Anxious pets may be stressed<br/>by highly playful pets'"]
    R5 -->|No| OK["✅ Compatible"]

    C1 --> Collect["Collect warning"]
    C2 --> Collect
    C3 --> Collect
    C4 --> Collect
    C5 --> Collect
    Collect --> Loop
    OK --> Loop
    Loop -->|"All pairs checked"| Return["Return warnings list<br/>(schedule is ALWAYS created)"]

    style Start fill:#e3f2fd
    style OK fill:#e8f5e8
    style Return fill:#fff3e0
    style C1 fill:#ffebee
    style C2 fill:#ffebee
    style C3 fill:#ffebee
    style C4 fill:#ffebee
    style C5 fill:#ffebee
```

### Size Mapping for Rule 3

| Size | Numeric Value |
|---|---|
| small | 1 |
| medium | 2 |
| large | 3 |

Size difference is calculated as `abs(size_order[pet_a] - size_order[pet_b])`. A difference ≥ 2 (e.g., small vs. large) combined with dominance difference ≥ 5 triggers the rule.

### Key Principle: Non-Blocking Conflicts

Conflicts are **warnings, not errors**. The schedule is always saved to the database regardless of compatibility results. The API response includes a `warnings` array so the frontend can display conflict indicators without preventing the booking.

---

## API Layer

### Endpoint Structure

```mermaid
graph LR
    subgraph "Authentication (accounts)"
        A1["POST /api/auth/register/"]
        A2["POST /api/auth/login/"]
        A3["POST /api/auth/logout/"]
        A4["POST /api/auth/token/refresh/"]
        A5["GET/PUT /api/auth/profile/"]
        A6["PUT /api/auth/change-password/"]
    end

    subgraph "User Management (accounts)"
        U1["GET/POST /api/users/"]
        U2["GET/PUT/DELETE /api/users/:id/"]
    end

    subgraph "Pets (pets)"
        P1["GET/POST /api/pets/"]
        P2["GET/PUT/DELETE /api/pets/:id/"]
        P3["POST /api/pets/:id/check-compatibility/"]
    end

    subgraph "Owners (pets)"
        O1["GET/POST /api/owners/"]
        O2["GET/PUT/DELETE /api/owners/:id/"]
    end

    subgraph "Schedules (pets)"
        S1["GET/POST /api/schedules/"]
        S2["GET/PUT/DELETE /api/schedules/:id/"]
        S3["POST /api/schedules/batch/"]
        S4["POST /api/schedules/check-conflicts/"]
    end

    subgraph "Supporting Resources"
        V1["CRUD /api/vaccination-types/"]
        V2["CRUD /api/vaccinations/"]
        D1["CRUD /api/documents/"]
        M1["CRUD /api/medical-notes/"]
        NS["GET/PUT /api/settings/<br/>POST upload_logo/ DELETE delete_logo/"]
        T1["GET /api/translations/:lang/"]
    end
```

### API Documentation Endpoints

| Endpoint | Format | Description |
|---|---|---|
| `/api/docs/` | Swagger UI | Interactive API explorer |
| `/api/redoc/` | ReDoc | Alternative documentation viewer |
| `/api/schema/` | OpenAPI 3.0 JSON | Machine-readable schema (generated by drf-spectacular) |

### Middleware Pipeline

All API requests pass through:

1. **Traefik**: TLS termination, path-based routing
2. **Django CORS Middleware** (`django-cors-headers`): Cross-origin request handling
3. **JWT Authentication** (`djangorestframework-simplejwt`): Token validation and user resolution
4. **DRF Permission Classes**: Role-based access control (admin vs. user)
5. **DRF Serializers**: Request validation and response serialization

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Compose Services"
        subgraph "Core Services (always running)"
            DB["db<br/>postgres:18-alpine<br/>:5432"]
            Backend["backend<br/>Django + DRF<br/>:8000"]
            Frontend["frontend<br/>Next.js 16<br/>:3000"]
            Traefik["traefik<br/>traefik:v3.6<br/>:80, :443, :8080"]
            SocketProxy["docker-socket-proxy<br/>tecnativa/docker-socket-proxy<br/>(internal network only)"]
        end

        subgraph "Profile: docs"
            Docs["docs<br/>Docusaurus<br/>:3001"]
        end

        subgraph "Profile: dev"
            PgAdmin["pgadmin<br/>dpage/pgadmin4<br/>:5050"]
        end
    end

    subgraph "Docker Networks"
        ProxyNet["proxy (bridge)<br/>All app services"]
        SocketNet["socket-proxy (bridge, internal)<br/>Traefik ↔ Docker Socket Proxy only"]
    end

    Traefik -->|"/api/*, /media/*"| Backend
    Traefik -->|"/*"| Frontend
    Backend --> DB
    Traefik -.->|"tcp://2375"| SocketProxy

    Traefik --- ProxyNet
    Frontend --- ProxyNet
    Backend --- ProxyNet
    DB --- ProxyNet
    Traefik --- SocketNet
    SocketProxy --- SocketNet

    style DB fill:#e8f5e8
    style Backend fill:#f3e5f5
    style Frontend fill:#e3f2fd
    style Traefik fill:#fff3e0
    style SocketProxy fill:#fce4ec
    style Docs fill:#e0f2f1
    style PgAdmin fill:#e0f2f1
    style ProxyNet fill:#f5f5f5
    style SocketNet fill:#ffebee
```

### Service Configuration

| Service | Image / Build | Port | Network | Profile |
|---|---|---|---|---|
| `db` | `postgres:18-alpine` | 5432 (internal) | proxy | — |
| `backend` | `./backend` (Dockerfile) | 8000 (via Traefik) | proxy | — |
| `frontend` | `./frontend` (Dockerfile) | 3000 (via Traefik) | proxy | — |
| `traefik` | `traefik:v3.6` | 80, 443, 8080 | proxy, socket-proxy | — |
| `docker-socket-proxy` | `tecnativa/docker-socket-proxy` | 2375 (internal) | socket-proxy | — |
| `docs` | `./docs` (Dockerfile) | 3001 | — | `docs` |
| `pgadmin` | `dpage/pgadmin4` | 5050 | proxy | `dev` |

### TLS Configuration

- **Default**: Self-signed TLS certificate (Traefik's built-in fallback)
- **Production**: Let's Encrypt via Cloudflare DNS challenge (requires `CF_DNS_API_TOKEN` and `ACME_EMAIL` environment variables)
- **HTTP → HTTPS**: Global permanent redirect from port 80 to 443

### Docker Network Security

- **`proxy` network**: Standard bridge network for inter-service communication (frontend, backend, db, traefik, pgadmin)
- **`socket-proxy` network**: Internal bridge network (`internal: true` — no outbound internet access) connecting only Traefik and the Docker Socket Proxy
- **Docker Socket Proxy**: Grants Traefik **read-only** access to specific Docker API endpoints (containers, services, networks, events) while explicitly blocking all write operations

### Volumes

| Volume | Purpose |
|---|---|
| `postgres_data` | Persistent PostgreSQL data |
| `traefik-certs` | Persistent Let's Encrypt certificates |
