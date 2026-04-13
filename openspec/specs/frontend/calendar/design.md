# Design: Calendar Views

## Technical Approach

The calendar system provides the primary interface for viewing and managing pet nursery schedules. It renders schedule data in **month view** and **week view** formats using CSS grid layouts, with schedule entries displayed as colored bars spanning their duration across day cells. A **public calendar** variant shows availability without requiring authentication.

The core rendering challenge is the **schedule bar stacking algorithm**: when multiple schedules overlap on the same day, bars must be vertically stacked within fixed-height day cells, with overflow indicated by a "+N more" label. Each pet is assigned a **stable color** from an 8-color palette based on pet ID, ensuring consistent visual identification across views and sessions.

Date manipulation throughout the calendar system uses **date-fns** exclusively, providing tree-shakeable, immutable date operations without the weight of Moment.js or the inconsistencies of native Date.

## Architecture Decisions

### Decision: Separate Month/Week View Components

**Two distinct components** (`Calendar.tsx` for month view, `WeekView.tsx` for week view) are used rather than a single polymorphic component that switches rendering based on a `view` prop.

Month and week views have fundamentally different rendering logic: month view shows 4-6 rows of 7 days with compact bar representations and overflow handling, while week view shows 7 days with expanded detail and potentially time-axis rendering. A single component would require extensive conditional branching in the render logic, the stacking algorithm, the grid sizing, and the interaction handlers — becoming a "god component" that's difficult to maintain and test.

*Tradeoffs:* Separate components mean some code duplication in shared concerns like bar color assignment, date navigation, and data fetching. This is mitigated by extracting shared logic into hooks and utility functions (e.g., the color palette mapping is shared). The duplication cost is lower than the maintenance cost of a deeply branched single component.

*Alternatives considered:* Single polymorphic component with view prop (rejected: excessive conditional complexity), render-prop pattern with shared container (rejected: over-abstraction for two concrete views), compound component pattern (rejected: adds indirection without clear benefit for only two variants).

### Decision: CSS Grid for Calendar Layout

**CSS Grid** with `grid-template-columns: repeat(7, 1fr)` is used for calendar layout rather than HTML tables or flexbox.

CSS Grid naturally maps to the 7-column calendar structure, supports cell spanning for multi-day bars via `grid-column: span N`, and handles responsive sizing without complex calculations. Day cells auto-size to equal widths, and the grid gap provides consistent spacing.

*Tradeoffs:* CSS Grid is slightly less semantic than HTML `<table>` for tabular data, which a calendar arguably is. However, `<table>` makes multi-day bar spanning significantly harder (requires `colspan` or absolute positioning hacks) and complicates responsive behavior. Flexbox would require manual width calculations for equal columns and cannot natively span items across cells.

*Alternatives considered:* HTML table (rejected: poor support for spanning bars, inflexible for responsive design), Flexbox grid (rejected: manual width math, no native spanning), third-party calendar library like FullCalendar (rejected: heavy dependency, limits customization, styling conflicts with Tailwind).

### Decision: useMemo Stacking Algorithm for Overlapping Bars

A **memoized stacking algorithm** (`useMemo`) processes the schedule data for each view period and assigns vertical slot indices to overlapping schedule bars. Each day cell shows a **maximum of 3 visible bars**, with a "+N more" overflow indicator for additional schedules.

The algorithm iterates through schedules sorted by start date, assigns each to the lowest available vertical slot, and tracks slot occupancy per day. This runs once per data change (memoized on the schedules array reference) rather than per-render, avoiding expensive recomputation during interactions like hovering or scrolling.

*Tradeoffs:* The 3-bar limit is a fixed constraint that works well for typical nursery loads (5-15 pets per day) but could feel restrictive for high-volume operations. Making it configurable would add complexity for questionable benefit. The stacking algorithm has O(n*d) complexity where n is schedules and d is days in the view — acceptable for typical data sizes but could lag with hundreds of schedules in a month. Virtual rendering was considered but rejected as premature optimization.

*Alternatives considered:* Per-cell stacking (rejected: doesn't handle multi-day bar continuity), CSS-only stacking with flexbox (rejected: can't enforce cross-cell slot consistency for multi-day bars), unlimited bars with scroll (rejected: day cells become inconsistent heights, layout breaks).

### Decision: Stable Pet Color Assignment

An **8-color palette** is defined, and pets are assigned colors based on a **memoized color map** keyed by pet ID. The color assignment is deterministic: given the same set of pets, each pet always gets the same color.

Colors are assigned by sorting pet IDs and mapping them to palette indices modulo 8. The map is computed once per schedule data change via useMemo. This ensures visual consistency — the same pet is always the same color regardless of which view you're looking at or when you load the page.

*Tradeoffs:* With only 8 colors, collisions occur when more than 8 pets are in view. This is acceptable for a nursery setting where daily pet counts are typically 5-15, and adjacent bars rarely share the same color in practice. A larger palette would reduce collisions but make colors harder to distinguish visually. Hashing pet IDs to HSL values was considered but produces unpredictable, sometimes ugly or low-contrast colors.

*Alternatives considered:* Random color per render (rejected: inconsistent, confusing), hash-to-HSL (rejected: unpredictable contrast and aesthetics), user-assigned colors (rejected: management overhead, not worth it for a scheduling view).

### Decision: Multi-Day Bar Rendering with Grid Spanning

Multi-day schedule bars **span multiple grid cells** using CSS `grid-column: span N`, with **rounded corners only at the start and end** of the bar (left-rounded at start day, right-rounded at end day, flat edges in between).

This approach renders each multi-day bar as a single DOM element that spans the appropriate grid columns, rather than rendering separate bar fragments per day. The single-element approach is simpler, performs better (fewer DOM nodes), and naturally handles hover/click interactions across the entire bar.

*Tradeoffs:* Grid spanning breaks when a multi-day bar crosses a week row boundary — it must be split into two bars (one ending at Saturday, one starting at Sunday). The component handles this by detecting row-crossing bars and rendering them as two separate elements with appropriate corner rounding. This edge case adds complexity but is unavoidable with any grid-based approach.

### Decision: ScheduleDetailsPopup as Modal Overlay

Schedule detail viewing uses a **modal overlay** (`ScheduleDetailsPopup`) triggered by clicking a schedule bar, with **click-outside-to-close** behavior rather than inline expansion or a side panel.

A modal focuses attention on the selected schedule's details without disrupting the calendar layout. Inline expansion would shift surrounding bars and break the grid layout. A side panel would reduce calendar width on smaller screens.

*Tradeoffs:* Modals interrupt the browsing flow — users can't see the calendar while viewing details. For quick reference this is fine; for comparison tasks (comparing two schedules) it's suboptimal. A tooltip/popover was considered but rejected because schedule details (pet info, times, status, notes) are too extensive for a tooltip.

### Decision: DaySchedule as Scrollable Panel

The `DaySchedule` component renders as a **scrollable list** (`max-h-[400px]` with `overflow-y-auto`) with inline status dropdowns for quick status changes, rather than a separate page or full modal.

This provides a focused view of a single day's schedules while maintaining context within the calendar page. The inline status dropdown allows quick status changes (scheduled → checked_in → completed) without navigating away. The 400px max height prevents the panel from dominating the viewport while allowing scrolling for busy days.

*Tradeoffs:* The fixed max-height may feel cramped on days with 15+ schedules. A dynamic height based on content would be more flexible but risks pushing other page content out of view. The current approach is a reasonable compromise for typical daily loads.

### Decision: Full-Period Data Fetching

The calendar **fetches all schedules for the entire visible period** (full month or full week) in a **single API call**, with client-side deduplication by schedule ID, rather than fetching per-day or using pagination.

A single request minimizes network roundtrips and avoids the complexity of coordinating multiple in-flight requests. For a nursery with 10-20 pets and ~30-day months, the data volume per request is small (hundreds of schedule records at most). Client-side deduplication handles any edge cases where the API returns overlapping data.

*Tradeoffs:* The initial load fetches more data than immediately visible (e.g., days not yet scrolled to in week view). This is negligible for the expected data volumes. For a much larger operation (hundreds of pets), server-side pagination or windowed fetching would be needed, but that's not the current scale.

*Alternatives considered:* Per-day fetching (rejected: N requests per view, poor performance), infinite scroll with pagination (rejected: calendars need random access to any day, not sequential loading), GraphQL with field selection (rejected: over-engineering for this use case).

### Decision: Public Calendar Direct Fetch

The **public calendar** variant fetches schedule data directly via `fetch()` **without auth headers**, hitting the same `/api/schedules` endpoint that the authenticated calendar uses.

The backend distinguishes public vs. authenticated requests and returns appropriately scoped data (public calendar shows availability counts, not individual pet details). This avoids maintaining a separate public API endpoint while keeping the frontend simple — the PublicCalendar component simply doesn't use `authFetch()`.

*Tradeoffs:* Coupling public and authenticated views to the same endpoint means the backend must handle both cases. A separate `/api/public/availability` endpoint would be more explicit but adds backend surface area for the same underlying data.

### Decision: date-fns for Date Calculations

**date-fns** is used for all date operations (start/end of week, start/end of month, date formatting, date arithmetic, comparisons) rather than Moment.js, Day.js, or native Date.

date-fns is tree-shakeable (only import what you use), immutable (returns new Date objects, never mutates), and provides a comprehensive functional API. It's already a project dependency and integrates well with TypeScript.

*Tradeoffs:* date-fns functions are standalone imports rather than chainable methods, which can be more verbose than Moment's `moment().startOf('week').add(1, 'day')` chain syntax. However, tree-shaking and immutability are more important than syntactic convenience for a production application.

*Alternatives considered:* Moment.js (rejected: massive bundle size, mutable API, deprecated), Day.js (rejected: smaller but less comprehensive API, not already in project), native Date (rejected: inconsistent behavior, no timezone safety, verbose for common operations like "start of week").

### Decision: Availability Threshold Display

The public calendar uses **hardcoded availability thresholds**: fewer than 10 schedules per day shows **green/available**, 10 or more shows **limited/busy** indicator.

A simple numeric threshold provides clear, actionable availability information without exposing internal scheduling details. The threshold of 10 is based on typical nursery capacity assumptions.

*Tradeoffs:* A hardcoded threshold doesn't adapt to actual nursery capacity, which may vary. Making it configurable (from settings) would be more flexible but adds a dependency on the settings system. The hardcoded value can be extracted to a constant and made configurable later if needed.

## Data Flow

1. **Calendar loads** -> Determines current month/week boundaries using date-fns -> Fetches schedules for the full period via `authFetch('/api/schedules?start=...&end=...')` -> Stores response in state
2. **Stacking computation** -> useMemo processes schedules -> Sorts by start date -> Assigns vertical slots per day -> Identifies overflow (>3 per day) -> Returns positioned bar data
3. **Color assignment** -> useMemo extracts unique pet IDs -> Sorts IDs -> Maps to 8-color palette by index modulo 8 -> Returns pet-to-color map
4. **Bar rendering** -> Maps positioned bar data to DOM elements -> Applies grid-column spanning for multi-day bars -> Applies pet color from color map -> Attaches click handlers
5. **Bar click** -> Opens ScheduleDetailsPopup modal -> Displays full schedule info -> Click outside closes popup
6. **Day click** -> Opens DaySchedule panel -> Fetches/displays all schedules for that day -> Inline status dropdowns for quick edits
7. **Navigation** -> User clicks prev/next month/week -> Date boundaries recalculated -> New fetch triggered -> Stacking recomputed
8. **Public calendar** -> Fetches without auth headers -> Receives availability data -> Renders day cells with green/red availability indicators

## Key Files

- **`src/components/Calendar.tsx`** — Month view component. CSS grid layout, schedule bar stacking algorithm, multi-day bar rendering, pet color assignment, day cell click handling, month navigation.
- **`src/components/WeekView.tsx`** — Week view component. Similar structure to Calendar but with expanded day columns, more detail per bar, and week-level navigation.
- **`src/components/DaySchedule.tsx`** — Single-day schedule list panel. Scrollable list with inline status dropdowns, schedule detail display, and status change handling.
- **`src/components/ScheduleDetailsPopup.tsx`** — Modal overlay for viewing full schedule details. Click-outside-to-close behavior, pet and schedule info display, action buttons.
- **`src/components/PublicCalendar.tsx`** — Unauthenticated calendar variant. Direct fetch without auth headers, availability threshold display, simplified UI without management actions.
