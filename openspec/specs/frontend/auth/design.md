# Design: Authentication & Authorization

## Technical Approach

The authentication system provides client-side auth state management, token-based API authentication, and route protection for the pet nursery management frontend. The architecture centers on a **React Context provider** that exposes auth state (user, tokens, loading) and auth actions (login, register, logout, refresh) to the entire component tree. Protected routes are guarded by **Higher-Order Components** (withAuth, withAdmin) that check auth state and redirect unauthorized users.

All authenticated API requests flow through an **authFetch() helper** that automatically attaches Bearer tokens from localStorage, providing a single point of control for auth headers. Token and user data persist in localStorage under dedicated keys (`auth_tokens`, `auth_user`), enabling session survival across browser refreshes without server-side session management.

## Architecture Decisions

### Decision: React Context API for Auth State

**React Context API** is used for auth state management rather than Redux, Zustand, or other external state libraries.

Auth state is fundamentally simple: a user object (or null), a tokens object (or null), and a loading boolean. This binary authenticated/unauthenticated shape does not benefit from Redux's action/reducer ceremony, Zustand's middleware ecosystem, or any external library's devtools. Context provides native React primitives (`useContext`) with zero bundle cost and zero dependency risk.

*Tradeoffs:* Context triggers re-renders for all consumers when any part of the auth state changes. For auth, this is acceptable because auth state changes are infrequent (login, logout, token refresh) and affect the entire app anyway. If auth state were high-frequency (e.g., updating every second), a library with selector support like Zustand would be preferable. Context also lacks built-in devtools, making debugging harder compared to Redux DevTools, but auth state is simple enough to inspect via React DevTools or console logging.

*Alternatives considered:* Redux Toolkit (rejected: too much boilerplate for simple state), Zustand (rejected: unnecessary dependency for binary state), Jotai (rejected: atom-based model adds complexity without benefit here).

### Decision: localStorage for Token Persistence

**localStorage** stores auth tokens under the `auth_tokens` key and user data under the `auth_user` key, rather than using cookies, sessionStorage, or in-memory-only storage.

localStorage survives browser tab closes and restarts, providing a persistent session experience. Users don't need to re-login when they close and reopen the browser. The keys are namespaced (`auth_tokens`, `auth_user`) to avoid collisions with other stored data.

*Tradeoffs:* localStorage is vulnerable to XSS attacks — any JavaScript running on the page can read tokens. HttpOnly cookies would be more secure against XSS but require server-side cookie management and complicate CORS for API calls to a separate backend. Since this is an internal management tool (not a public-facing consumer app), the XSS risk is lower and the development simplicity of localStorage is worthwhile. sessionStorage was rejected because it doesn't persist across tab closes, forcing frequent re-logins that hurt usability for staff who use the system throughout the day.

*Alternatives considered:* HttpOnly cookies (rejected: requires backend cookie support, complicates API architecture), sessionStorage (rejected: poor UX for a daily-use management tool), in-memory only (rejected: no persistence at all).

### Decision: authFetch() Helper for Authenticated Requests

A centralized **authFetch()** function wraps the native `fetch` API to automatically attach `Authorization: Bearer <token>` headers to all authenticated requests, rather than having each component manually add headers.

This provides a single point of control for auth headers, token reading, and future enhancements like automatic 401 handling. Every API call site simply uses `authFetch(url, options)` instead of `fetch(url, options)` with no other changes needed.

*Tradeoffs:* This is a lightweight approach compared to Axios interceptors, which provide more structured request/response pipelines. authFetch() is simpler but less extensible — adding features like retry logic or request queuing would require custom implementation. For this app's needs (add a header, make a request), the simplicity wins.

*Alternatives considered:* Axios with interceptors (rejected: adds a dependency for what is essentially one header), custom fetch wrapper class (rejected: over-engineering for current needs), per-component header management (rejected: duplication and inconsistency risk).

### Decision: HOC Pattern for Route Protection

**Higher-Order Components** (`withAuth`, `withAdmin`) wrap page components to enforce authentication and authorization, rather than using Next.js middleware, layout-level checks, or custom hooks with early returns.

HOCs provide declarative, composable route protection: `export default withAuth(DashboardPage)` or `export default withAdmin(UserManagementPage)`. The protection logic is encapsulated and reusable. `withAuth` checks for any authenticated user and redirects to `/login` if not found. `withAdmin` extends this to also check for admin role and redirects to `/` (home) if the user lacks admin privileges.

*Tradeoffs:* HOCs are considered a legacy React pattern — hooks and composition are generally preferred in modern React. However, for route protection specifically, HOCs map naturally to the "wrap the page" mental model and keep protection logic out of page component bodies. A custom hook approach (`useRequireAuth()`) would require every protected page to include redirect logic in its body, increasing boilerplate. Next.js middleware was rejected because it runs on the server/edge and cannot access client-side localStorage where tokens are stored.

*Alternatives considered:* Next.js middleware (rejected: no access to localStorage tokens), layout-level auth checks (rejected: layouts in App Router don't re-render on navigation, making them unreliable for auth gating), custom hook with early return (rejected: more boilerplate per page, easier to forget).

### Decision: Client-Side Mounting Check for SSR Compatibility

The AuthProvider includes a **mounted state check** (`const [mounted, setMounted] = useState(false)`) that prevents localStorage access during server-side rendering, returning a loading state until the component mounts on the client.

Next.js renders components on the server where `localStorage` is undefined. Accessing it during SSR causes hydration mismatches or runtime errors. The mounting check ensures localStorage is only read after the component mounts in the browser, with a loading/skeleton state shown during the brief SSR-to-client transition.

*Tradeoffs:* This adds a brief flash of loading state on initial page load before auth state resolves. For a management tool, this is acceptable. The alternative — making all auth pages fully client-side with `"use client"` and `dynamic(() => import(...), { ssr: false })` — would eliminate the flash but lose SSR benefits entirely.

### Decision: Manual Token Refresh

A `refreshToken()` method is exposed by the auth context but is **not automatically triggered** on 401 responses or token expiration. Refresh must be called explicitly by consuming code.

Automatic token refresh adds significant complexity: intercepting 401s, queuing concurrent requests during refresh, handling refresh token expiration, and avoiding infinite retry loops. For a management tool with reasonable session lengths, manual refresh (or simply re-logging in) is adequate. The method exists as a hook for future automatic refresh implementation if needed.

*Tradeoffs:* Users may occasionally experience failed requests if their token expires mid-session, requiring a page refresh or re-login. This is a UX trade for implementation simplicity. If session lengths become a pain point, automatic refresh can be added by wrapping authFetch() with 401 detection and retry logic.

## Data Flow

1. **App loads** -> AuthProvider reads `auth_tokens` and `auth_user` from localStorage -> Sets initial auth state -> Sets `mounted = true`
2. **Login** -> POST credentials to `/api/auth/login` -> Receive tokens + user -> Store in localStorage + context state -> Redirect to home
3. **Register** -> POST user data to `/api/auth/register` -> Receive tokens + user -> Store in localStorage + context state -> Redirect to home
4. **Authenticated request** -> Component calls `authFetch(url)` -> authFetch reads token from localStorage -> Adds `Authorization: Bearer <token>` header -> Returns fetch response
5. **Route protection** -> withAuth/withAdmin HOC renders -> Reads auth context -> If not authenticated/authorized, redirects via `router.push()` -> Otherwise renders wrapped component
6. **Logout** -> Clear localStorage keys -> Reset context state to null -> Redirect to `/login`
7. **Already authenticated visit to login/register** -> Page mounts -> Checks auth context -> If authenticated, redirects to home

## Key Files

- **`src/lib/auth.tsx`** — AuthContext definition, AuthProvider component, useAuth hook, authFetch helper. Central auth module containing all state management, localStorage persistence, and API communication logic.
- **`src/lib/withAuth.tsx`** — HOC that wraps page components to require authentication. Checks auth context on render, shows loading during resolution, redirects to `/login` if unauthenticated.
- **`src/lib/withAdmin.tsx`** — HOC that extends withAuth to also require admin role. Redirects to `/` (home) if user is authenticated but not an admin.
- **`src/app/login/page.tsx`** — Login page with email/password form. Redirects to home if already authenticated. Calls auth context's login method on submit.
- **`src/app/register/page.tsx`** — Registration page with user creation form. Redirects to home if already authenticated. Calls auth context's register method on submit.
