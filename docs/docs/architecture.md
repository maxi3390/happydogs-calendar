# Architecture

## System Overview

Happy Calendar is built as a full-stack web application with a clear separation of concerns between the frontend user interface, the backend API, and the database layer. The system is designed for scalability, maintainability, and user experience.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React Frontend<br/>Next.js + TypeScript]
    end

    subgraph "API Layer"
        API[Django REST Framework<br/>Authentication & Business Logic]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL Database<br/>Pet, Owner, Schedule Data)]
    end

    subgraph "Infrastructure"
        Docker[Docker Compose<br/>Container Orchestration]
    end

    UI --> API
    API --> DB
    Docker -.-> UI
    Docker -.-> API
    Docker -.-> DB

    style UI fill:#e1f5fe
    style API fill:#f3e5f5
    style DB fill:#e8f5e8
    style Docker fill:#fff3e0
```

## Component Architecture

### Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js App Router"
        Layout[Root Layout<br/>Providers & Context]
        Pages[Page Components<br/>Calendar, Pets, Owners]
        Components[Reusable Components<br/>Forms, Navigation, Calendar]
    end

    subgraph "State Management"
        Context[React Context<br/>Auth, Theme, Language]
        Hooks[Custom Hooks<br/>API calls, Local State]
    end

    subgraph "Services"
        APIClient[API Client<br/>HTTP Requests]
        Translation[Translation Service<br/>i18n Support]
    end

    Layout --> Pages
    Pages --> Components
    Components --> Context
    Components --> Hooks
    Hooks --> APIClient
    Hooks --> Translation

    style Layout fill:#e3f2fd
    style Pages fill:#f3e5f5
    style Components fill:#e8f5e8
    style Context fill:#fff3e0
    style Hooks fill:#fce4ec
    style APIClient fill:#e0f2f1
    style Translation fill:#f9fbe7
```

### Backend Architecture

```mermaid
graph TB
    subgraph "Django Applications"
        AuthApp[Authentication App<br/>JWT, Users, Roles]
        PetsApp[Pets App<br/>Models, Views, Serializers]
        SchedulesApp[Schedules App<br/>Scheduling Logic]
        TranslationsApp[Translations App<br/>i18n API]
    end

    subgraph "Core Components"
        Settings[Django Settings<br/>Configuration]
        URLs[URL Configuration<br/>Routing]
        Middleware[Middleware<br/>CORS, Auth]
    end

    subgraph "External Services"
        DB[(PostgreSQL)]
        Cache[(Redis<br/>Optional)]
    end

    AuthApp --> Settings
    PetsApp --> Settings
    SchedulesApp --> Settings
    TranslationsApp --> Settings

    Settings --> URLs
    URLs --> Middleware

    Middleware --> DB
    PetsApp -.-> Cache

    style AuthApp fill:#e3f2fd
    style PetsApp fill:#f3e5f5
    style SchedulesApp fill:#e8f5e8
    style TranslationsApp fill:#fff3e0
    style Settings fill:#fce4ec
    style URLs fill:#e0f2f1
    style Middleware fill:#f9fbe7
    style DB fill:#ffebee
    style Cache fill:#ffebee,stroke-dasharray: 5 5
```

## Data Flow Architecture

### User Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React)
    participant A as API (Django)
    participant D as Database (PostgreSQL)

    U->>F: Interact with UI (click, form submit)
    F->>F: Validate input locally
    F->>A: Send API request with JWT
    A->>A: Authenticate user
    A->>A: Validate request data
    A->>A: Execute business logic
    A->>D: Query/Update data
    D-->>A: Return results
    A-->>F: Send response
    F-->>U: Update UI with results
```

### Scheduling Flow with Conflict Detection

```mermaid
flowchart TD
    A[User selects pets<br/>and time slot] --> B{Validate<br/>input data}
    B --> C[Check pet<br/>compatibility rules]
    C --> D{Aggressive<br/>pets?}
    D -->|Yes| E[Block scheduling<br/>if multiple pets]
    D -->|No| F{Check dominance<br/>levels > 7}
    F -->|Yes| G[Block scheduling<br/>if both > 7]
    F -->|No| H{Check size +<br/>dominance combo}
    H -->|Warning| I[Allow with warning]
    H -->|OK| J{Check cross-species<br/>rules}
    J -->|Conflict| K[Block scheduling]
    J -->|OK| L{Check anxious +<br/>playful rules}
    L -->|Conflict| M[Block scheduling]
    L -->|OK| N[Create schedule<br/>in database]
    N --> O[Return success<br/>response]

    E --> P[Return conflict<br/>error]
    G --> P
    K --> P
    M --> P

    style A fill:#e3f2fd
    style N fill:#e8f5e8
    style P fill:#ffebee
    style I fill:#fff3e0
```

## Database Schema

```mermaid
erDiagram
    User ||--o{ Pet : owns
    User ||--o{ Owner : manages
    User ||--o{ Schedule : creates
    Owner ||--o{ Pet : owns
    Pet ||--o{ Schedule : participates_in
    Pet ||--o{ IncompatibilityRule : subject_of

    User {
        int id PK
        string username
        string email
        string password_hash
        string role "admin|user"
        datetime created_at
        datetime updated_at
    }

    Owner {
        int id PK
        string name
        string email
        string phone
        string address
        string emergency_contact
        datetime created_at
        datetime updated_at
    }

    Pet {
        int id PK
        string name
        string species "dog|cat|bird|rabbit|other"
        string breed
        int age
        string size "small|medium|large"
        string temperament "calm|playful|aggressive|anxious|friendly"
        int dominance_level "1-10"
        string special_notes
        int owner_id FK
        datetime created_at
        datetime updated_at
    }

    Schedule {
        int id PK
        datetime start_time
        datetime end_time
        string status "scheduled|checked_in|completed|cancelled"
        int pet_id FK
        int created_by_id FK
        datetime created_at
        datetime updated_at
    }

    IncompatibilityRule {
        int id PK
        string rule_type "custom|system"
        string description
        int pet1_id FK
        int pet2_id FK
        datetime created_at
    }
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant T as Token Store

    U->>F: Login attempt
    F->>A: POST /auth/login/ with credentials
    A->>A: Validate credentials
    A->>T: Generate JWT tokens
    T-->>A: Return access & refresh tokens
    A-->>F: Return tokens
    F->>F: Store tokens in localStorage
    F->>A: Subsequent requests with Authorization header
    A->>A: Validate JWT token
    A->>A: Check token not blacklisted
    A-->>F: Return requested data

    Note over F,T: Tokens automatically refreshed<br/>when expired
```

## Conflict Detection Algorithm

```mermaid
flowchart TD
    A[Start conflict check<br/>for pet list] --> B[For each pet pair<br/>in schedule]
    B --> C{Is either pet<br/>aggressive?}
    C -->|Yes| D[CONFLICT:<br/>Aggressive pets cannot<br/>be with others]
    C -->|No| E{Are both pets<br/>dominance > 7?}
    E -->|Yes| F[CONFLICT:<br/>High dominance pets<br/>cannot be together]
    E -->|No| G{Calculate size<br/>difference}
    G --> H{Calculate dominance<br/>difference}
    H --> I{Size diff >= 2<br/>AND dominance diff >= 5?}
    I -->|Yes| J[WARNING:<br/>Size-dominance<br/>incompatibility]
    I -->|No| K{Check cross-species<br/>temperament rules}
    K --> L{Specific temperament<br/>combinations incompatible?}
    L -->|Yes| M[CONFLICT:<br/>Cross-species<br/>temperament issue]
    L -->|No| N{Check anxious-playful<br/>rules}
    N --> O{Anxious pet with<br/>playful pet<br/>AND dominance diff > 4?}
    O -->|Yes| P[CONFLICT:<br/>Behavioral<br/>incompatibility]
    O -->|No| Q[No conflicts found]

    D --> R[Return conflict list]
    F --> R
    M --> R
    P --> R
    J --> Q
    Q --> R

    style A fill:#e3f2fd
    style Q fill:#e8f5e8
    style R fill:#ffebee
    style J fill:#fff3e0
```

## API Layer Architecture

```mermaid
graph TB
    subgraph "API Endpoints"
        PetsAPI[Pets API<br/>CRUD + Compatibility]
        OwnersAPI[Owners API<br/>CRUD + Relationships]
        SchedulesAPI[Schedules API<br/>CRUD + Conflict Check]
        AuthAPI[Auth API<br/>Login, Register, Profile]
        TranslationsAPI[Translations API<br/>i18n Support]
    end

    subgraph "Middleware"
        CORSMiddleware[CORS Middleware]
        AuthMiddleware[JWT Authentication]
        PermissionMiddleware[Permission Checks]
    end

    subgraph "Business Logic"
        ConflictEngine[Conflict Detection<br/>Engine]
        ValidationEngine[Data Validation<br/>Engine]
        SerializationEngine[Response<br/>Serialization]
    end

    subgraph "Data Access"
        ORM[Django ORM<br/>Model Queries]
        DB[(PostgreSQL)]
    end

    PetsAPI --> AuthMiddleware
    OwnersAPI --> AuthMiddleware
    SchedulesAPI --> AuthMiddleware
    AuthAPI --> AuthMiddleware

    AuthMiddleware --> PermissionMiddleware
    PermissionMiddleware --> ConflictEngine
    PermissionMiddleware --> ValidationEngine

    ConflictEngine --> ORM
    ValidationEngine --> ORM
    ORM --> DB

    SchedulesAPI --> ConflictEngine

    style PetsAPI fill:#e3f2fd
    style OwnersAPI fill:#f3e5f5
    style SchedulesAPI fill:#e8f5e8
    style AuthAPI fill:#fff3e0
    style TranslationsAPI fill:#fce4ec
    style CORSMiddleware fill:#e0f2f1
    style AuthMiddleware fill:#f9fbe7
    style PermissionMiddleware fill:#ffebee
    style ConflictEngine fill:#e3f2fd
    style ValidationEngine fill:#f3e5f5
    style SerializationEngine fill:#e8f5e8
    style ORM fill:#fff3e0
    style DB fill:#ffebee
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LoadBalancer[Load Balancer<br/>Nginx/HAProxy]
        FrontendContainer[Frontend Container<br/>Next.js Production]
        BackendContainer[Backend Container<br/>Django + Gunicorn]
        Database[PostgreSQL<br/>Primary + Replica]
        Cache[Redis Cache<br/>Optional]
    end

    subgraph "Infrastructure"
        DockerRegistry[Docker Registry<br/>Image Storage]
        CI_CD[CI/CD Pipeline<br/>GitHub Actions]
        Monitoring[Monitoring<br/>Logs, Metrics]
    end

    LoadBalancer --> FrontendContainer
    LoadBalancer --> BackendContainer
    FrontendContainer --> BackendContainer
    BackendContainer --> Database
    BackendContainer -.-> Cache

    CI_CD --> DockerRegistry
    DockerRegistry --> FrontendContainer
    DockerRegistry --> BackendContainer

    Monitoring -.-> FrontendContainer
    Monitoring -.-> BackendContainer
    Monitoring -.-> Database

    style LoadBalancer fill:#e3f2fd
    style FrontendContainer fill:#f3e5f5
    style BackendContainer fill:#e8f5e8
    style Database fill:#fff3e0
    style Cache fill:#fce4ec,stroke-dasharray: 5 5
    style DockerRegistry fill:#e0f2f1
    style CI_CD fill:#f9fbe7
    style Monitoring fill:#ffebee
```

## Component Interaction Details

### Frontend-Backend Communication

The frontend communicates with the backend through RESTful APIs using JSON payloads. All requests include JWT authentication headers for secure communication.

**Request Flow:**
1. User action triggers state change in React component
2. Component calls custom hook for API interaction
3. Hook uses Axios client to make HTTP request
4. Request includes Authorization header with JWT token
5. Backend validates token and processes request
6. Response data updates component state
7. UI re-renders with new data

### Conflict Detection Integration

The conflict detection engine is tightly integrated into the scheduling workflow:

1. **Pre-validation**: Input data validated before conflict checking
2. **Rule Application**: Multiple rules applied in sequence for comprehensive coverage
3. **Performance Optimization**: Rules ordered by computational cost and likelihood
4. **Result Aggregation**: All conflicts collected and returned with detailed messages
5. **Caching**: Rule results cached for repeated validations

### Internationalization Pipeline

```mermaid
sequenceDiagram
    participant F as Frontend Component
    participant T as Translation Hook
    participant A as API
    participant C as Cache
    participant D as Database

    F->>T: t('key', params)
    T->>T: Check local cache
    T->>A: GET /translations/{lang}/
    A->>C: Check Redis cache
    C-->>A: Cache miss
    A->>D: Query translations
    D-->>A: Return translations
    A->>C: Store in cache
    C-->>A: Return cached data
    A-->>T: Return translations
    T->>F: Return translated text
```

This architecture ensures efficient translation loading and caching while maintaining real-time language switching capabilities.

## Security Considerations

### Authentication Security
- JWT tokens with expiration and refresh mechanism
- Token blacklisting for logout
- Password hashing with secure algorithms
- Role-based access control

### API Security
- CORS configuration for allowed origins
- Input validation and sanitization
- SQL injection prevention through ORM
- Rate limiting (recommended for production)

### Data Security
- Encrypted database connections
- Secure password storage
- Audit logging for sensitive operations
- Data backup and recovery procedures

## Performance Optimizations

### Frontend Optimizations
- Code splitting with Next.js dynamic imports
- Image optimization and lazy loading
- Memoization of expensive calculations
- Efficient state management

### Backend Optimizations
- Database query optimization with select_related/prefetch_related
- API response caching
- Background task processing for heavy operations
- Database indexing on frequently queried fields

### Infrastructure Optimizations
- Container resource limits
- Horizontal scaling capabilities
- CDN for static assets
- Database connection pooling
