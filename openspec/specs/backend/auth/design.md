# Design: Authentication & Authorization

## Technical Approach

The authentication system is built on a **custom User model** with email-based authentication and **JWT tokens** for stateless API access. Authorization uses a simple role field on the User model with custom DRF permission classes, deliberately avoiding Django's built-in groups/permissions system in favor of explicit, domain-specific access control.

The system provides four endpoints: registration, login (token obtain), token refresh, and logout (token blacklist). All auth logic is encapsulated in the `accounts` app.

## Architecture Decisions

### Decision: Custom User Model with Email as USERNAME_FIELD

The User model uses `email` as the `USERNAME_FIELD` and removes the `username` field entirely. A `CustomUserManager` handles user creation, ensuring email is always required and normalized.

**Why:** A pet nursery management system is a business application where users are identified by email, not arbitrary usernames. Emails are inherently unique, verifiable, and serve double duty as both identifier and communication channel.

**Alternatives considered:**
- *Default Django User with username:* Would require maintaining two unique fields (username + email) with no practical benefit. Users would need to remember a username they'd likely set to their email anyway.
- *AbstractUser with email override:* This is what we do — extend `AbstractBaseUser` with `PermissionsMixin` to get full control over the model while retaining Django's password hashing and permission hooks.
- *Third-party package (django-allauth):* Too heavyweight for this use case. Allauth brings social auth, email verification flows, and template-based views that conflict with an API-only backend.

**Tradeoffs:** Requires a `CustomUserManager` to replace the default `create_user`/`create_superuser` flow. Django admin integration needs minor adjustments since it expects a `username` field by default.

### Decision: JWT Authentication via djangorestframework-simplejwt

Access tokens expire after **60 minutes**; refresh tokens after **7 days**. Token rotation is enabled (each refresh produces a new refresh token), and token blacklisting is enabled for logout support.

**Why:** JWT is the standard for stateless API authentication in SPA + REST API architectures. The nursery frontend is a separate SPA that needs to make authenticated requests without server-side session state.

**Alternatives considered:**
- *Django session auth:* Requires server-side session storage, doesn't work well with cross-origin SPAs, and ties the backend to cookie-based auth.
- *Token auth (DRF built-in):* Single persistent token per user with no expiration — a security risk. No refresh mechanism.
- *dj-rest-auth / django-allauth:* Adds social authentication, password reset via email, and other features not needed in v1. Can be added later if requirements grow.

**Tradeoffs:**
- 60-minute access token is a balance between security and UX — short enough to limit exposure if leaked, long enough to avoid constant refresh cycles.
- 7-day refresh token means a user stays logged in for up to a week, suitable for a daily-use business tool.
- **Token rotation** mitigates refresh token theft: a stolen refresh token becomes invalid after one use. However, this requires blacklisting to track used tokens, adding database writes on every refresh.
- **Token blacklisting** adds a database table that grows with every refresh/logout. In a small-scale nursery app this is negligible, but would need cleanup (cron job) at scale.

### Decision: Role Field on User Model Instead of Django Groups/Permissions

The User model has a `role` CharField with choices `admin` and `user`. Authorization decisions are based on this single field.

**Why:** The nursery system has exactly two roles with clearly separated capabilities. Django's groups and permissions system is designed for fine-grained, per-object permissions across many roles — massive overkill here. A simple role field is explicit, easy to query, and trivial to check in permission classes.

**Alternatives considered:**
- *Django groups/permissions:* Requires managing group records, permission records, and M2M relationships. For two roles, this is unnecessary indirection.
- *django-guardian (object-level permissions):* Would allow per-pet or per-owner access control, but the nursery model doesn't require it — admins see everything, regular users see everything (with write restrictions).
- *Role as a separate model with FK:* Adds flexibility for future roles but introduces a join for every permission check. YAGNI.

**Tradeoffs:** Adding a third role later requires a migration to update the choices and potentially reworking permission classes. This is acceptable — role changes are infrequent and significant enough to warrant deliberate migration.

### Decision: Custom Permission Classes Over DRF Built-ins

Four permission classes are defined in `accounts/permissions.py`:
- **`IsAdmin`** — user must have role='admin'
- **`IsAdminOrReadOnly`** — admins can write, everyone else can only read
- **`IsOwnerOrAdmin`** — user must own the resource or be admin
- **`IsAuthenticated`** — any authenticated user (mirrors DRF's but included for consistency)

The default `REST_FRAMEWORK` permission is set to `AllowAny`, with permissions applied per-view.

**Why:** DRF's built-in `IsAuthenticated` and `IsAdminUser` don't map to our role field (DRF's `IsAdminUser` checks `is_staff`, not our `role` field). Custom classes express the domain's access rules directly.

**Alternatives considered:**
- *DRF's IsAdminUser:* Checks `is_staff`, which is a Django admin concept, not our application role.
- *Default permission = IsAuthenticated:* Would be safer by default, but several endpoints (translations, login, register) must be public. Explicitly setting AllowAny as default and overriding per-view makes the public-by-default, protected-where-needed pattern clear. **Note: this is a deliberate choice that requires discipline — every protected endpoint MUST specify its permission classes.**

**Tradeoffs:** Default `AllowAny` is risky — forgetting to add permission classes to a view exposes it publicly. The upside is that public endpoints don't need boilerplate, and the protected endpoints are self-documenting since they explicitly declare their permissions.

### Decision: Django Built-in Password Validators

All four default validators are enabled: `UserAttributeSimilarityValidator`, `MinimumLengthValidator`, `CommonPasswordValidator`, `NumericPasswordValidator`.

**Why:** These are battle-tested, NIST-aligned validators that cover the most common password weaknesses. No custom password policy is needed for a nursery management tool.

**Alternatives considered:**
- *Custom validators (e.g., requiring special characters):* Modern guidance (NIST SP 800-63B) actually discourages composition rules. The built-in validators focus on length and known-weak passwords, which is more effective.
- *django-password-strength:* Adds entropy-based scoring, which is nice but unnecessary complexity for this use case.

### Decision: CORS_ALLOW_ALL_ORIGINS = True

CORS is fully open, allowing any origin to make requests.

**Why:** This is a **development-only setting**. The frontend and backend run on different ports during development, and restrictive CORS would block legitimate requests.

**Tradeoffs:** **This MUST be changed before production deployment.** In production, `CORS_ALLOWED_ORIGINS` should list only the specific frontend domain(s). This is a known technical debt item.

## Data Flow

### Authentication Flow
```
1. Registration:
   POST /api/accounts/register/ {email, password, role}
   → CustomUserManager.create_user() → User record
   → Return user data (no auto-login)

2. Login:
   POST /api/accounts/token/ {email, password}
   → SimpleJWT TokenObtainPairView
   → Return {access, refresh} tokens

3. Authenticated Request:
   GET /api/pets/ [Authorization: Bearer <access_token>]
   → JWTAuthentication middleware validates token
   → Permission class checks user.role
   → View processes request

4. Token Refresh:
   POST /api/accounts/token/refresh/ {refresh}
   → Validate refresh token (not blacklisted, not expired)
   → Blacklist old refresh token (rotation)
   → Return {access, refresh} (new pair)

5. Logout:
   POST /api/accounts/logout/ {refresh}
   → Blacklist refresh token
   → Client discards access token
```

### Permission Evaluation
```
Request → JWTAuthentication (is token valid?)
       → Permission Class (does user have required role?)
       → View logic (optional: is user the resource owner?)
```

## Key Files

| File | Purpose |
|------|---------|
| `accounts/models.py` | Custom User model, CustomUserManager, role choices |
| `accounts/views.py` | Register, token obtain/refresh, logout views |
| `accounts/serializers.py` | User registration/detail serializers, token serializers |
| `accounts/permissions.py` | IsAdmin, IsAdminOrReadOnly, IsOwnerOrAdmin, IsAuthenticated |
| `accounts/urls.py` | Auth endpoint routing |
| `config/settings.py` | REST_FRAMEWORK, SIMPLE_JWT, AUTH_PASSWORD_VALIDATORS, CORS config |
