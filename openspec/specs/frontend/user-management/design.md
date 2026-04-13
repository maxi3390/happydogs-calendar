# Design: User Management

## Technical Approach

The user management module provides admin-only CRUD operations for system users (staff accounts). It includes a **stats dashboard** summarizing user counts by role and status, a **searchable user list** with role/status badges, and **modal-based forms** for create/edit/delete operations. Access is restricted to admin users via the `withAdmin` HOC.

The module computes all statistics **client-side** from the fetched user list, avoiding the need for dedicated statistics API endpoints. The interface prioritizes at-a-glance information through colored badges and computed summary cards.

## Architecture Decisions

### Decision: Admin-Only Access via withAdmin HOC

The user management page is wrapped with the **`withAdmin` HOC**, which checks for admin role in the auth context and **redirects non-admin users to the home page**.

User management is a privileged operation — creating accounts, assigning roles, and deactivating users must be restricted to administrators. The HOC pattern provides declarative, reusable protection: `export default withAdmin(UserManagementPage)`. The redirect to home (rather than showing an "access denied" page) is a UX choice that avoids revealing the existence of admin-only pages to unauthorized users.

*Tradeoffs:* The HOC check is client-side only — a determined user could bypass it by modifying client state. **Server-side authorization on every API call is the actual security boundary**; the HOC is a UX convenience that prevents unauthorized users from seeing an admin UI that would produce 403 errors on every action. This dual-layer approach (client UX + server security) is standard practice.

*Alternatives considered:* Server-side middleware/page protection (rejected: tokens are in localStorage, not cookies, so server can't check auth during SSR), conditional rendering without redirect (rejected: showing an empty or error page is worse UX than redirecting), role-based routing in layout (rejected: Next.js App Router layouts don't re-run on navigation).

### Decision: Client-Side Stats Computation

Stats cards (total users, active count, admin count, inactive count) are **computed client-side** from the fetched user list using `.filter()` and `.length`, rather than fetching from a separate statistics API endpoint.

The user list is already fetched for the table display. Computing counts from the same data is a trivial O(n) operation that runs in microseconds for the expected user count (tens to low hundreds). A separate API endpoint would duplicate data the client already has, adding network overhead and server-side query logic for no benefit.

*Tradeoffs:* Stats and list data are always in sync since they derive from the same source. However, this means stats only reflect the fetched data — if server-side pagination were added (fetching only the first page of users), the stats would only represent the visible page, not all users. At that scale, a dedicated stats endpoint would be needed. For current scale, client-side computation is optimal.

*Alternatives considered:* Dedicated `/api/users/stats` endpoint (rejected: unnecessary network request for data derivable from existing fetch), server-side computed stats embedded in the list response (considered: viable but couples list and stats concerns), real-time stats via WebSocket (rejected: absurd over-engineering for a rarely-changing dataset).

### Decision: Client-Side Search Filter

User search is implemented as a **client-side filter** on the already-fetched user list, matching against name, email, and role fields, consistent with the same pattern used in the owner management module.

For the same reasons as owner search: the dataset is small enough that client-side filtering is faster and simpler than server-side search. Consistency with the owner module means the pattern is familiar to developers maintaining the codebase.

*Tradeoffs:* Identical to owner search — works well for small datasets, doesn't scale to thousands of users. The pattern is consistent across the app, which aids maintainability.

### Decision: Modal Pattern for CRUD Operations

User create, edit, and delete operations use **modal dialogs** rather than inline editing, separate pages, or accordion expansion.

Unlike pet management (where accordion expansion makes sense for complex multi-section editing), user management involves relatively simple forms (name, email, role, status). A modal provides focused attention on the form without navigating away from the user list, and the overlay communicates that the action is temporary/transient. Delete uses a confirmation modal with explicit action text ("Delete User: John Doe") to prevent accidental deletions.

*Tradeoffs:* Modals interrupt the list browsing flow and can't show the list context behind them (especially on mobile where the modal may be full-screen). For the simple forms involved (5-6 fields), this is acceptable. If user editing became more complex (e.g., permission management with many options), a separate page or panel would be more appropriate.

*Alternatives considered:* Inline editing in table rows (rejected: table cells are too cramped for form inputs, especially on mobile), accordion expansion like pets (rejected: over-engineering for simple forms, inconsistent mental model since user entries are less complex than pets), separate detail page (rejected: navigation overhead for a simple form).

### Decision: Colored Role and Status Badges

User roles (admin, staff) and statuses (active, inactive) are displayed as **colored badges** with distinct colors: admin = purple/indigo badge, staff = blue badge, active = green badge, inactive = gray badge.

Badges provide instant visual scanning — an admin can quickly identify all admin users or all inactive accounts in the list without reading text. The color choices follow conventions: green for active/good, gray for inactive/neutral, purple for elevated privilege.

*Tradeoffs:* Color-only differentiation is an accessibility concern for colorblind users. The badges also contain text labels ("Admin", "Active"), so color is a secondary indicator, not the only one. This dual encoding (color + text) ensures accessibility.

### Decision: Initials-Based User Avatars

User entries display **initials-based avatars** (same pattern as owner management) rather than supporting avatar uploads for user accounts.

User accounts are internal staff accounts, not customer-facing profiles. The overhead of implementing avatar upload, storage, and display for internal users doesn't justify the minimal UX benefit. Initials provide sufficient visual differentiation for a list of 5-50 staff members.

*Tradeoffs:* Staff might prefer personalized avatars for a more polished feel. This could be added later by reusing the profile picture upload component from the pet module. For MVP, initials are adequate and consistent with the owner module's fallback pattern.

## Data Flow

1. **Page loads** -> withAdmin HOC checks auth context -> If not admin, redirect to home -> If admin, render page
2. **Data fetch** -> `authFetch('/api/users')` retrieves full user list -> Store in state -> Compute stats (total, active, admin, inactive counts) -> Render stats cards and user table
3. **Search** -> User types in search field -> Client-side filter on name/email/role -> Filtered list re-renders, stats remain based on full list
4. **Create user** -> Click "Add User" -> Open create modal with empty form -> Fill fields (name, email, password, role) -> Submit POST to `/api/users` -> Close modal -> Re-fetch user list
5. **Edit user** -> Click edit button on user row -> Open edit modal with pre-filled form -> Modify fields -> Submit PUT to `/api/users/:id` -> Close modal -> Re-fetch user list
6. **Delete user** -> Click delete button -> Open confirmation modal with user name -> Confirm -> DELETE to `/api/users/:id` -> Close modal -> Re-fetch user list
7. **Stats update** -> After any CRUD operation and re-fetch, stats recompute from new list data automatically (derived state)

## Key Files

- **`src/app/admin/users/page.tsx`** — User management page. Stats cards, searchable user table with role/status badges, modal forms for CRUD operations, initials avatars. Protected by withAdmin HOC. Contains the modal state management and CRUD handlers.
- **`src/domain/users/api.ts`** — User API functions. Typed fetch wrappers for user CRUD operations (getUsers, createUser, updateUser, deleteUser). Uses authFetch for all calls. Defines request/response types for each operation.
