# Design: Owner Management

## Technical Approach

The owner management module provides CRUD operations for pet owners, combining owner profile management with integrated pet views and scheduling shortcuts. The UI uses **expandable card components** that reveal owner details and their associated pets on demand, with **lazy-loaded detail data** to minimize initial page load.

The key UX integration is **batch scheduling**: from an owner's expanded view, staff can quickly schedule all of an owner's pets at once or schedule individual pets directly, reducing the multi-step navigation that would otherwise be required.

## Architecture Decisions

### Decision: Lazy Loading Owner Details on Accordion Expand

Owner detail data (including associated pets) is **fetched only when an owner's card is expanded**, not pre-fetched for all owners in the list. Fetched details are **cached in component state** so subsequent expand/collapse cycles don't re-fetch.

The owner list may contain dozens to hundreds of entries, each with associated pet data that includes vaccinations, medical notes, and documents. Pre-fetching all this data on page load would result in a large, slow initial request. Lazy loading defers the cost to the moment of need — most sessions only expand a few owners.

*Tradeoffs:* The first expansion of each owner card incurs a loading delay (typically 100-300ms) while the detail fetch completes, visible as a brief spinner or skeleton state. This is acceptable for an admin tool. Caching in component state means data can become stale if another user modifies the owner's pets concurrently — a full-page refresh or manual re-fetch resolves this. The cache is lost on page navigation, which is actually desirable (fresh data on re-visit).

*Alternatives considered:* Pre-fetch all owner details on page load (rejected: slow initial load, wasted bandwidth for unexpanded owners), React Query with stale-while-revalidate (rejected: adds dependency for a simple cache pattern), server-side pagination with detail endpoints (considered: would be needed at scale, but current owner counts don't justify the complexity).

### Decision: Client-Side Search Filter

Search/filter is implemented as a **client-side filter** on the already-fetched owner list using string matching on name, email, and phone fields, rather than server-side search with API parameters.

For the expected scale of a pet nursery (tens to low hundreds of owners), fetching the full list once and filtering in JavaScript is faster and simpler than round-tripping to the server for each keystroke or search query. The filter runs synchronously on every input change with imperceptible latency.

*Tradeoffs:* Client-side filtering requires the entire owner list to be in memory. For a nursery with thousands of owners, this would degrade performance and memory usage — at that scale, server-side search with debounced requests and pagination would be necessary. The current implementation can be migrated to server-side search by replacing the filter function with a debounced API call without changing the UI.

*Alternatives considered:* Server-side search with debounced API calls (rejected: unnecessary network overhead for current scale), Fuse.js fuzzy search (rejected: adds dependency for a simple substring match), search-as-you-type with server (rejected: latency and complexity for small dataset).

### Decision: Initials Fallback for Profile Pictures

Owners without profile pictures display a **generated avatar showing their initials** (first letter of first name + first letter of last name) on a colored background, rather than a generic silhouette or blank space.

Initials-based avatars provide visual differentiation between owners in the list, making it easier to scan and identify entries. The colored background can be derived from the owner's name (hash to color) for consistency across views. This is a common pattern (Slack, Google, Microsoft) that users recognize.

*Tradeoffs:* Initials don't work well for owners with identical initials (both "John Smith" and "Jane Sanders" show "JS"). The hash-to-color approach mitigates this somewhat by assigning different background colors to different full names. For a nursery's owner list, the likelihood of confusing two owners based on initials alone is low since other context (name text, email) is also displayed.

*Alternatives considered:* Generic silhouette placeholder (rejected: no visual differentiation, looks unfinished), Gravatar (rejected: requires email hash lookup, many users don't have Gravatars, adds external dependency), AI-generated avatars (rejected: absurd over-engineering).

### Decision: Batch Scheduling Integration

Each owner's expanded view includes a **"Schedule All Pets" button** that opens the ScheduleForm in multi mode with **all of the owner's pets pre-selected**, and individual **"Schedule" buttons per pet** that open the ScheduleForm with that single pet pre-selected.

This integration eliminates the common multi-step workflow: navigate to schedules, open form, search for owner, select pets. For the most frequent use case — an owner calling to book all their pets for a stay — the entire flow is reduced to: find owner, click "Schedule All". This is a significant UX improvement for daily nursery operations.

*Tradeoffs:* This couples the owner management module to the scheduling module. The owner page must import and render ScheduleForm (or navigate to it with pre-selection parameters). The coupling is acceptable because these modules are inherently related in the business domain — owners and their schedules are the core workflow. The implementation passes pet IDs and mode as props/state rather than using a global event system, keeping the coupling explicit and traceable.

*Alternatives considered:* Navigate to schedules page with URL params for pre-selection (rejected: page navigation breaks context, user loses place in owner list), clipboard/paste pet IDs (rejected: terrible UX), global state bus for cross-module communication (rejected: unnecessary indirection for a direct parent-child rendering relationship).

### Decision: Expandable Cards with Smooth Transitions

Owner entries use **expandable card components** with CSS transitions for smooth expand/collapse animation, consistent with the accordion pattern used in the pet list module.

Visual consistency across the application is important — staff learn one interaction pattern (click to expand, click to collapse) and apply it everywhere. The card component provides a contained visual boundary for each owner's data, and the transition communicates the show/hide action clearly.

*Tradeoffs:* Cards take more vertical space than a compact table layout. For a list view where scanning many items is the primary task, a table might be more space-efficient. However, cards accommodate the variable-height expanded content (pet lists, action buttons) better than table rows, and the expanded state includes enough content to justify the card container.

*Alternatives considered:* Table with expandable rows (rejected: table rows don't accommodate complex expanded content well), card grid layout (rejected: doesn't work well with expanded/collapsed mixed heights), separate detail page (rejected: too much navigation for frequent operations).

## Data Flow

1. **Page loads** -> Fetches owner list via `authFetch('/api/owners')` -> Renders card list with name, contact info, initials avatar
2. **Search input** -> User types in search field -> Client-side filter matches against name, email, phone -> Filtered list re-renders
3. **Card expand** -> User clicks owner card -> Check if detail data cached in state -> If not cached, fetch `authFetch('/api/owners/:id')` (includes pets) -> Cache in state -> Render expanded view with pet list and action buttons
4. **Card collapse** -> User clicks again or clicks another owner -> Collapse with CSS transition -> Cached data preserved for re-expansion
5. **Schedule all pets** -> User clicks "Schedule All Pets" button -> Opens ScheduleForm component in 'multi' mode -> Pre-selects all owner's pets by ID -> User completes scheduling flow
6. **Schedule single pet** -> User clicks "Schedule" on a specific pet row -> Opens ScheduleForm in 'single' mode -> Pre-selects that pet by ID -> User completes scheduling flow
7. **Owner create/edit** -> OwnerForm rendered (modal or inline) -> User fills/modifies fields -> Submit POST/PUT to `/api/owners` -> Refresh owner list

## Key Files

- **`src/app/owners/page.tsx`** — Owner management page. Owner list rendering with expandable cards, client-side search, lazy-loaded detail data with caching, batch scheduling integration, individual pet scheduling shortcuts. Orchestrates OwnerForm for create/edit operations.
- **`src/components/OwnerForm.tsx`** — Owner creation/editing form. Fields for name, email, phone, address, and notes. Handles both create (POST) and edit (PUT) modes with appropriate field pre-population and validation.
