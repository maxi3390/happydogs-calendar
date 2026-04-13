# Design: Settings Management

## Technical Approach

The settings page provides nursery administrators with configuration controls for system-wide parameters: **pet incompatibility rules**, **vaccination type management**, and **daily booking limits**. The page is organized into clearly delineated sections with **inline documentation** (info boxes) explaining each feature.

The settings module is notable for its **mixed persistence strategy**: some settings are server-persisted (vaccination types, daily limits) while pet incompatibility rules are stored in **localStorage only**, operating as a client-side-only feature.

## Architecture Decisions

### Decision: Pet Incompatibility Rules in localStorage

Pet incompatibility rules (defining which dogs cannot be grouped together) are stored in **localStorage** rather than on the server, making them a **local-only, per-browser feature**.

This decision reflects the current scope limitation: incompatibility rules are a convenience feature for the current user's reference, not an enforced system constraint. Storing them locally avoids the need for a server-side API endpoint, database schema for many-to-many pet relationships, and cross-user synchronization. The feature serves as a personal reference tool for the staff member using that browser.

*Tradeoffs:* This is the most significant limitation of the settings module. Rules created on one browser/device are not visible on another. If multiple staff members manage the nursery, they don't share incompatibility knowledge. Rules are also lost if the user clears browser data. This is explicitly a **scope trade-off**: building the server-side infrastructure for incompatibility rules (API, database relations, conflict enforcement during scheduling) is a substantial effort that's deferred in favor of a lightweight local-only MVP. Migration to server-side storage would require adding an API endpoint and replacing localStorage calls with authFetch calls — the UI can remain unchanged.

*Alternatives considered:* Server-side storage with API (deferred: significant backend work for a non-critical feature), IndexedDB (rejected: more complex than localStorage for simple key-value data, no cross-device benefit), shared Google Sheet / external doc (rejected: not integrated, defeats the purpose of in-app settings).

### Decision: Inline CRUD for Vaccination Types

Vaccination type management uses **inline create/read/update/delete operations** directly in the settings page without modal forms, separate pages, or multi-step workflows.

Vaccination types are simple objects (name, enabled flag) that don't warrant the overhead of modal dialogs. Inline editing — where each type appears as a row with edit/toggle/delete buttons — provides the fastest workflow: see all types at a glance, toggle one on/off, add a new one at the bottom. The simplicity of the data model (just a name and a boolean) maps naturally to inline row editing.

*Tradeoffs:* Inline editing can feel cluttered if there are many vaccination types, as all rows are always visible and editable. For the expected count (5-15 vaccination types), this is manageable. If the count grew significantly, a collapsible list or paginated view would be needed. Inline editing also makes validation feedback placement trickier — error messages need to appear adjacent to the specific row, not in a centralized form error area.

*Alternatives considered:* Modal form for create/edit (rejected: overhead for a single-field form — opening a modal to type one name feels heavy), separate management page (rejected: not enough content to justify a dedicated route), accordion/expandable rows (rejected: unnecessary for single-field editing).

### Decision: Daily Booking Limit with Temporary Success Feedback

The daily booking limit control saves via an API call and shows a **temporary "Saved!" success indicator** that disappears after approximately 2 seconds, rather than a persistent success message, toast notification, or page reload.

Temporary inline feedback provides immediate confirmation without cluttering the UI. The "Saved!" text appears near the save button (replacing or adjacent to it), clearly associating the feedback with the action that triggered it. The 2-second duration is long enough to be noticed but short enough to not feel like a stuck state. After the feedback disappears, the button returns to its normal "Save" state.

*Tradeoffs:* If the user looks away during the 2-second window, they might miss the confirmation. A persistent message (dismissed manually) would be more reliable but adds visual clutter. A toast notification (appearing in a corner) provides feedback without cluttering the form but may not be noticed on large screens. The temporary inline approach is the best balance for a single-field save operation where the user's attention is already on the button they just clicked.

*Alternatives considered:* Toast/snackbar notification (rejected: requires a toast system infrastructure, may go unnoticed), persistent success message with dismiss button (rejected: visual clutter for a frequent operation), optimistic update with no feedback (rejected: users need confirmation that the save succeeded), page reload (rejected: disrupts the page state and feels heavy for a single-value change).

### Decision: Info Boxes for Inline Documentation

Each settings section includes an **info box** (styled container with an information icon) that explains what the feature does, how it works, and any limitations. These are always visible, not hidden behind help icons or tooltips.

Staff who access settings infrequently may not remember what each option does. Always-visible documentation prevents confusion and reduces support requests. The info boxes serve as persistent onboarding — new staff can understand each setting without external training materials.

*Tradeoffs:* Always-visible info boxes take vertical space and may feel redundant to experienced users. A collapsible or tooltip-based approach would save space but risks information being missed. For a settings page that's visited infrequently, the verbosity is acceptable — it's not a page where screen real estate is at a premium.

*Alternatives considered:* Tooltip on hover/click (rejected: easily missed, not accessible on touch devices), collapsible help sections (rejected: adds interaction overhead for information that should be immediately available), separate documentation page (rejected: requires context switching, won't be read).

### Decision: Dog-Only Filter for Incompatibility Rules

The incompatibility rules feature **hardcodes a filter for dogs only**, not allowing rules for cats, birds, or other species.

Dominance-based incompatibility is primarily a concern for dogs in group play settings. Cats are typically housed individually or in calm group settings where dominance conflicts are rare. Other species have different behavioral dynamics that don't map to the same incompatibility model. Filtering to dogs keeps the feature focused and the pet selection dropdowns manageable.

*Tradeoffs:* This is an explicitly opinionated design choice that may not fit all nurseries. A nursery with aggressive cats or mixed-species group areas would need cross-species incompatibility rules. Making the species filter configurable would add complexity for an edge case. The hardcoded filter can be removed or made configurable if user feedback indicates broader species support is needed.

*Alternatives considered:* All-species incompatibility rules (rejected: clutters the UI for the dominant use case, dog play groups), configurable species filter (rejected: over-engineering for initial release), per-species incompatibility sections (rejected: multiplies UI complexity by number of species).

## Data Flow

1. **Settings page loads** -> Fetches vaccination types via `authFetch('/api/vaccination-types')` -> Fetches daily limit via `authFetch('/api/settings/daily-limit')` -> Reads incompatibility rules from localStorage -> Renders all sections
2. **Add vaccination type** -> User types name in inline input -> Submit POST to `/api/vaccination-types` -> New type appears in list
3. **Toggle vaccination type** -> User clicks enable/disable toggle -> PUT to `/api/vaccination-types/:id` with updated enabled flag -> Toggle reflects immediately (optimistic)
4. **Delete vaccination type** -> User clicks delete -> Confirmation prompt -> DELETE to `/api/vaccination-types/:id` -> Type removed from list
5. **Save daily limit** -> User modifies number input -> Clicks "Save" -> PUT to `/api/settings/daily-limit` -> "Saved!" feedback appears for ~2 seconds -> Button returns to normal
6. **Add incompatibility rule** -> User selects two dogs from dropdowns -> Clicks "Add Rule" -> Rule stored in localStorage -> Rule appears in list
7. **Remove incompatibility rule** -> User clicks remove on a rule -> Rule deleted from localStorage -> Rule removed from list

## Key Files

- **`src/app/settings/page.tsx`** — Settings page component. Three main sections (incompatibility rules, vaccination types, daily limit) with info boxes, inline CRUD for vaccination types, localStorage management for incompatibility rules, temporary save feedback for daily limit. Protected by withAdmin HOC.
