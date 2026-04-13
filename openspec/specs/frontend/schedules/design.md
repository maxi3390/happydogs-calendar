# Design: Schedule Management

## Technical Approach

The schedule management module handles creation, editing, and status tracking of pet nursery bookings. The central component is a **unified ScheduleForm** that supports both single-pet and multi-pet scheduling modes via a `mode` prop, providing real-time **conflict detection** and **daily limit enforcement** through debounced API checks.

The scheduling flow emphasizes **immediate feedback**: as users select dates, times, and pets, the system checks for conflicts and capacity limits in the background, surfacing warnings before submission. After submission, a **result screen** shows success/failure details inline without navigating away.

## Architecture Decisions

### Decision: Unified ScheduleForm with Mode Prop

A **single `ScheduleForm` component** handles both single-pet and multi-pet scheduling via a `mode` prop (`'single' | 'multi'`), rather than maintaining two separate form components with duplicated logic.

Both scheduling modes share 80%+ of their logic: date selection, time selection, conflict checking, submission, and result display. The differences are limited to pet selection (single dropdown vs. multi-select checkboxes) and result display (single result vs. per-pet result list). A unified component eliminates duplication and ensures both modes stay in sync when scheduling logic changes.

*Tradeoffs:* The unified component has conditional rendering branches for mode-specific UI, which adds some internal complexity compared to two focused components. The `mode` prop also means TypeScript types need to handle both shapes (single pet ID vs. array of pet IDs). However, the duplication cost of separate components — maintaining parallel conflict checking, validation, and submission logic — is significantly higher than the branching cost.

*Alternatives considered:* Two separate components (rejected: 80%+ code duplication, maintenance burden of keeping both in sync), base component with composition/inheritance (rejected: React composition doesn't work well for form branching, and class inheritance is an anti-pattern in React), shared hook with separate UI components (considered: viable but increases file count without meaningful separation of concerns since the UI differences are small).

### Decision: MultiPetScheduleForm as Re-Export Wrapper

`MultiPetScheduleForm.tsx` exists as a **backward-compatible re-export wrapper** that renders `ScheduleForm` with `mode='multi'`, rather than being a standalone component.

This maintains backward compatibility with existing import paths and call sites that reference `MultiPetScheduleForm` while centralizing logic in the unified `ScheduleForm`. New code should import `ScheduleForm` directly, but existing references continue to work without migration.

*Tradeoffs:* The wrapper file is essentially dead weight — an extra file that adds no logic. It could be removed if all import sites were updated. It exists purely for migration convenience and should be documented as deprecated for eventual removal.

### Decision: Debounced Conflict Checking (500ms)

Schedule conflict detection uses a **500ms debounce** on the API call to `/api/schedules/check-conflicts`, triggered when the user changes date, time, or pet selection fields. Conflicts are displayed as warning messages below the form fields.

Real-time conflict feedback prevents users from submitting invalid schedules, catching double-bookings before they reach the server. The 500ms debounce prevents excessive API calls during rapid field changes (e.g., scrolling through a date picker) while still feeling responsive — users see conflict warnings within half a second of stopping input.

*Tradeoffs:* 500ms is a compromise between responsiveness and server load. A shorter debounce (200ms) would feel more instant but could fire multiple requests during a single interaction sequence. A longer debounce (1000ms) would reduce requests further but feels sluggish. 500ms matches the "stopped typing" heuristic that users intuitively understand. The debounce means there's a brief window where the UI shows stale conflict status — a user could theoretically submit during this window. Server-side validation is the final safety net.

*Alternatives considered:* Check on blur only (rejected: delayed feedback, user may not realize there's a conflict until they leave the field), check on submit only (rejected: bad UX, wasted effort filling out the form), WebSocket real-time updates (rejected: massive over-engineering for a conflict check).

### Decision: Debounced Daily Count Checking

Daily booking limit enforcement uses a **separate debounced API call** to check the current day's booking count when the date field changes, displaying a warning if the limit is approached or exceeded.

This is separate from conflict checking because it queries different data (aggregate count vs. specific schedule overlap) and triggers on different field changes (date only vs. date+time+pet). Separating the concerns keeps each check focused and independently testable.

*Tradeoffs:* Two separate debounced API calls (conflict + daily count) when the date changes could be combined into a single endpoint that returns both. However, the checks have different trigger conditions (conflict check also fires on time/pet changes) and different response shapes, so combining them would add server-side complexity for marginal network savings.

### Decision: Pre-Generated 15-Minute Time Intervals

Time selection uses a **pre-generated list of 96 options** representing 15-minute intervals from 00:00 to 23:45, rendered as a dropdown select element.

15-minute intervals match the granularity of nursery scheduling (drop-off and pick-up times don't need minute precision) while keeping the dropdown manageable at 96 options. Pre-generating the options array avoids recalculating on each render.

*Tradeoffs:* 96 options in a dropdown is at the upper limit of usability — scrolling through requires effort. A time picker component (with hour/minute wheels or an analog clock face) would be more ergonomic. However, time pickers add dependency or implementation complexity, and the dropdown is universally accessible and keyboard-navigable. The options could be filtered to business hours (e.g., 06:00-22:00) to reduce the count to ~64, but some nurseries operate 24/7 or have early/late services.

*Alternatives considered:* Free-text time input with parsing (rejected: error-prone, format ambiguity), time picker component (rejected: adds dependency or significant implementation effort), 30-minute intervals (rejected: too coarse for precise scheduling), 5-minute intervals (rejected: 288 options, unwieldy dropdown).

### Decision: Result Screen as Inline Render Path

After schedule submission, the **result screen** (success/failure with details) renders **within the same ScheduleForm component** as a conditional render path, rather than navigating to a separate page or opening a result modal.

The inline result screen keeps context — users see the result alongside the form they just submitted. For multi-pet scheduling, the result shows per-pet status (success/conflict/error) in a list. A "Schedule Another" button resets the form to its initial state. This avoids router navigation and the associated unmount/remount cycle.

*Tradeoffs:* The ScheduleForm component manages two "modes" (form and result) internally, adding state complexity. A separate result page would be simpler per-component but requires passing result data through navigation state or a shared store. The inline approach keeps all scheduling state local to one component.

*Alternatives considered:* Separate result page (rejected: navigation overhead, state passing complexity), toast/notification only (rejected: insufficient for multi-pet results where per-pet status matters), modal overlay (rejected: modals on top of forms feel cluttered, and the form behind is no longer relevant).

### Decision: Daily Limit Override with Confirmation Dialog

When a schedule would exceed the configured daily limit, the system shows a **confirmation dialog** asking the admin to explicitly override the limit, rather than hard-blocking the submission.

Hard blocking would prevent legitimate edge cases (special events, owner emergencies, holiday bookings) where temporarily exceeding capacity is acceptable at the admin's discretion. The confirmation dialog communicates the risk ("This will book pet #11 on a day with a limit of 10") while still allowing the action. This respects the admin's authority to make judgment calls.

*Tradeoffs:* Overrides could lead to genuine overcapacity if used carelessly. The dialog provides friction (must click "Yes, Override") but a staff member in a hurry might click through habitually. Logging overrides (server-side) provides an audit trail. The alternative — hard blocking with a separate "increase limit" flow in settings — would be safer but too slow for the phone-call-with-owner scenario.

*Alternatives considered:* Hard block with no override (rejected: too rigid for real-world scenarios), soft warning with no confirmation (rejected: too easy to miss or ignore), admin-only override with role check (considered: good enhancement, but adds complexity to the initial implementation).

### Decision: Status Color Coding System

Schedule status uses a **consistent color coding** throughout the application: **blue** (scheduled/upcoming), **green** (checked_in/active), **gray** (completed/past), **red** (cancelled). These colors are applied to badges, calendar bars, and status indicators.

The four-color system maps directly to the schedule lifecycle and uses culturally familiar color associations (green = active/good, red = cancelled/alert, gray = inactive/done, blue = neutral/pending). Consistency across all views means staff learn the color meanings once and can interpret them everywhere.

*Tradeoffs:* Four statuses with four colors is a clean 1:1 mapping. If additional statuses are added (e.g., "no_show", "waitlisted"), the color system needs expansion without creating ambiguity. The current palette has room for additions (orange for warning states, purple for special states).

## Data Flow

1. **Form opens** -> Initialize with mode ('single' or 'multi') and optional pre-selected pet(s) -> Fetch pet list for dropdown/multi-select -> Render form fields
2. **Date/time/pet change** -> Debounce 500ms -> Call `authFetch('/api/schedules/check-conflicts')` with current selections -> Display conflict warnings if any
3. **Date change** -> Debounce 500ms -> Call `authFetch('/api/schedules/daily-count')` for selected date -> Compare against daily limit -> Display capacity warning if near/over limit
4. **Form submit (single)** -> POST to `/api/schedules` with pet ID, dates, times -> Receive result -> Switch to result render path
5. **Form submit (multi)** -> POST to `/api/schedules/batch` with pet ID array, dates, times -> Receive per-pet results -> Switch to result render path showing per-pet status
6. **Daily limit exceeded** -> Show confirmation dialog with override option -> If confirmed, submit with `override: true` flag -> Server processes despite exceeding limit
7. **Result screen** -> Display success/failure per pet with status colors -> "Schedule Another" resets form state -> "View Calendar" navigates to calendar view
8. **Status change** (from DaySchedule or detail views) -> PATCH to `/api/schedules/:id/status` with new status -> Update local state -> Reflect new status color

## Key Files

- **`src/components/ScheduleForm.tsx`** — Unified scheduling form. Mode-based rendering (single/multi), date/time selection with 15-minute intervals, debounced conflict checking, debounced daily count checking, daily limit override confirmation, inline result screen, pre-selection support from owner module integration.
- **`src/components/MultiPetScheduleForm.tsx`** — Backward-compatible wrapper. Re-exports ScheduleForm with `mode='multi'` pre-set. Exists for import path compatibility with existing code.
- **`src/domain/schedules/api.ts`** — Schedule API functions. Typed fetch wrappers for schedule CRUD, conflict checking, daily count, batch creation, and status updates. Uses authFetch for all authenticated calls.
- **`src/domain/schedules/types.ts`** — Schedule TypeScript types. Schedule interface, ScheduleStatus enum/union, CreateSchedulePayload, BatchScheduleResult, ConflictCheckResponse, and related type definitions.
