# Design: Pet Management

## Technical Approach

The pet management module handles CRUD operations for pets in the nursery, including profile information, vaccination tracking, medical notes, and document management. The UI uses an **expandable accordion pattern** for the pet list, allowing users to view and manage pet details inline without navigating to a separate page.

The pet creation and editing flow enforces a **staged data integrity model**: owner selection must precede other form fields, and certain features (profile picture, medical notes, documents) are only available in edit mode after the pet record exists on the server. This ensures referential integrity and avoids orphaned uploads.

Visual elements include **species-specific icons** for pets without profile pictures, a **color-coded dominance slider** for behavioral risk assessment, and **dynamic vaccination arrays** that reflect the nursery's configured vaccination types.

## Architecture Decisions

### Decision: Expandable Accordion Pattern for Pet List

`PetList` uses an **expandable accordion** where clicking a pet row reveals an inline detail/edit panel with **CSS grid transitions** for smooth animation, rather than navigating to a separate pet detail page or opening a modal.

The accordion pattern keeps users in the list context — they can quickly expand one pet, make changes, collapse it, and expand another without page navigation overhead. This is particularly valuable for nursery staff who frequently need to check or update multiple pets during intake. CSS grid transitions (`grid-template-rows: 0fr` to `1fr`) provide smooth height animation without JavaScript measurement or layout thrashing.

*Tradeoffs:* Accordions can make the list long and require scrolling when multiple items are expanded. This is mitigated by collapsing the previously expanded item when a new one is opened (single-expand mode). A separate detail page would provide more screen real estate for complex editing, but the navigation cost outweighs this for the typical quick-check use case. Modals were rejected because pet editing involves multiple sections (info, vaccinations, notes, documents) that need vertical space.

*Alternatives considered:* Separate detail page with router navigation (rejected: too much navigation overhead for frequent operations), modal dialog (rejected: insufficient space for multi-section editing), master-detail split panel (rejected: requires wider viewport, poor mobile experience).

### Decision: Species Icon Mapping for Default Avatars

Pets without profile pictures display a **species-specific icon** (e.g., dog icon, cat icon, bird icon) rather than a generic placeholder or initials.

Species icons provide immediately recognizable visual differentiation in the pet list. A generic silhouette or initials-based avatar (as used for human users) doesn't convey useful information, whereas a species icon tells staff at a glance what type of animal they're looking at — useful during busy intake periods.

*Tradeoffs:* Requires maintaining a species-to-icon mapping and having icons available for each supported species. Lucide React provides common animal icons. Uncommon species fall back to a generic paw icon. The mapping is a simple object literal, so maintenance cost is minimal.

### Decision: Color-Coded Dominance Slider

The dominance assessment uses a **slider (1-10)** with **color-coded visual feedback**: green (1-3, low dominance), yellow (4-6, moderate), red (7-10, high dominance). This is for visual risk assessment when grouping pets.

The color gradient provides instant visual communication of behavioral risk level without requiring staff to interpret a raw number. Green/yellow/red is universally understood as safe/caution/warning. The slider input is more intuitive than a dropdown for a continuous scale and allows quick adjustment.

*Tradeoffs:* The three-band color system is a simplification — a dominance of 4 and 6 are both "yellow" but represent different risk levels. A continuous gradient (green-to-red) would be more precise but harder to read quickly. The three-band system matches how staff actually think about grouping decisions: "safe to group with anyone", "check compatibility first", "keep separated".

*Alternatives considered:* Numeric input only (rejected: no visual risk communication), dropdown with labels (rejected: less intuitive for a scale), continuous color gradient (rejected: harder to read quickly), radio buttons (rejected: 10 options is too many for radio).

### Decision: Owner Selection Gates Form Fields

**All other form fields are disabled until an owner is selected**, enforcing the data integrity requirement that every pet must have an owner. The owner dropdown is the first field and must be filled before proceeding.

This prevents the creation of ownerless pets and communicates the mandatory relationship clearly through the UI. Disabled fields with a visual cue ("Select an owner first") make the dependency explicit rather than relying on form validation at submission time.

*Tradeoffs:* This blocks the user from pre-filling pet information before selecting an owner, which could slow down data entry in edge cases where the user knows the pet details but needs to look up the owner. However, in practice, nursery intake always starts with owner identification, so the flow matches the real-world process. A validate-on-submit approach would be more flexible but allows users to fill out entire forms only to be blocked at the end.

*Alternatives considered:* Validate on submit (rejected: worse UX — wasted effort if owner forgotten), owner as optional with later assignment (rejected: violates data model, creates orphan records), inline owner creation (considered for future: would allow creating owner and pet in one flow).

### Decision: Dynamic Vaccination Array Management

Vaccinations are managed as a **dynamic array** with add/remove buttons, filtered to show only **enabled VaccinationTypes** from the settings system. Each vaccination entry includes type, date administered, and expiration date.

The dynamic array pattern allows pets to have zero-to-many vaccinations of various types. Filtering to enabled types ensures staff can't assign deprecated vaccination types while still displaying them on existing records. Add/remove operations modify local form state, and the entire vaccination array is submitted with the pet update.

*Tradeoffs:* Managing array state in a form is inherently complex — adding, removing, and validating multiple entries requires careful index management. A library like react-hook-form with `useFieldArray` would simplify this, but the project uses controlled components throughout, so a custom array state management approach maintains consistency. The filtered-types approach means changing the enabled types in settings immediately affects the pet form, which could confuse users if a type disappears mid-editing.

### Decision: Birth Date Auto-Calculates Age

When the birth date field changes, the **age field is automatically calculated** using date-fns `differenceInYears` / `differenceInMonths`. The age field is read-only and derived.

Automatic calculation eliminates data inconsistency between birth date and age. Staff enter the birth date (from owner records or estimates), and the system computes the age. This is a one-way derivation — there's no "enter age, compute birth date" reverse flow, as birth date is the authoritative datum.

*Tradeoffs:* Age display is a point-in-time calculation that changes as time passes. The displayed age is always current (computed on render), but stored age on the server may become stale. The frontend always recomputes from birth date, so staleness only affects server-side data consumers.

### Decision: Edit-Only Features for Profile Picture, Medical Notes, and Documents

**Profile picture upload, medical notes, and document uploads are only available in edit mode** (when editing an existing pet), not during initial pet creation.

These features require the pet record to exist on the server first: profile pictures need a pet ID for the upload endpoint, medical notes are separate API resources linked to the pet, and documents similarly need a parent pet record. Allowing these during creation would require either a two-step creation flow (create pet, then upload) or temporary client-side storage — both add complexity.

*Tradeoffs:* Users must create a pet first, then re-open it to add photos, notes, and documents. This is a minor UX friction point, especially for initial pet registration where staff want to capture everything in one session. The accordion pattern mitigates this — after creation, the pet appears in the list and can be immediately expanded for editing.

*Alternatives considered:* Two-step creation wizard (rejected: over-engineering for the frequency of new pet registration), client-side temporary storage with deferred upload (rejected: complex, error-prone if user navigates away), all-in-one form that creates then uploads (rejected: partial failure handling is complex — pet created but upload fails).

### Decision: MedicalNotesSection as Inline Editable List

Medical notes are rendered as an **inline editable list** within the pet detail panel, not in a separate modal. Notes can be added, viewed, and managed directly in the accordion-expanded pet view.

Inline editing keeps notes in context with the rest of the pet's information. Staff reviewing a pet's profile can see notes alongside vaccination records and other details without additional navigation. The list format with newest-first ordering surfaces recent notes immediately.

*Tradeoffs:* Inline editing in a list can feel cramped for longer notes. A modal would provide more editing space, but the overhead of opening/closing modals for each note adds friction for the common case of short clinical observations ("Flea treatment administered", "Weight: 12kg"). Long notes can still be written — the textarea expands — but the layout is optimized for brevity.

### Decision: DocumentUpload with Drag-and-Drop

The `DocumentUpload` component supports **drag-and-drop file upload** along with traditional file picker, with **file type icons** displayed for each uploaded document.

Drag-and-drop is the expected interaction pattern for file uploads in modern web applications. File type icons (PDF, image, document icons) provide visual identification of uploaded files without requiring the user to read filenames. Both upload methods (drag-drop and click-to-browse) are supported to accommodate different user preferences and accessibility needs.

*Tradeoffs:* Implementing drag-and-drop requires handling dragenter, dragover, dragleave, and drop events with proper event prevention, which adds code complexity compared to a simple file input. The visual feedback during drag (drop zone highlighting) also needs careful state management. However, the UX improvement is significant for staff who upload documents frequently.

### Decision: Counter-Based Refresh Trigger

Data invalidation after mutations (create, update, delete) uses a **counter-based pattern** where a `refreshTrigger` prop (number) is incremented to signal child components to re-fetch data, rather than callback-based invalidation or a state management library's cache invalidation.

The counter pattern is simple and explicit: parent increments the counter, child's useEffect depends on the counter, data re-fetches. It avoids the complexity of cache keys, stale-while-revalidate strategies, or callback threading through component trees.

*Tradeoffs:* This is a blunt instrument — incrementing the trigger re-fetches all data, not just the changed item. For a pet list of typical nursery size (20-100 pets), this is imperceptible. For a much larger dataset, targeted invalidation (e.g., SWR's `mutate` or React Query's `invalidateQueries`) would be more efficient. The counter pattern also doesn't provide optimistic updates — the UI waits for the re-fetch to complete before showing changes.

*Alternatives considered:* React Query / SWR (rejected: adds dependency for simple CRUD operations), callback-based invalidation (rejected: threads callbacks through multiple component layers), optimistic updates (rejected: complexity not justified for admin tool where data accuracy matters more than perceived speed).

## Data Flow

1. **Pet list loads** -> Fetches all pets via `authFetch('/api/pets')` -> Renders accordion list with species icons and basic info
2. **Accordion expand** -> Fetches full pet detail if not cached -> Renders PetForm in edit mode with all sections
3. **Owner selection** -> User selects owner from dropdown -> Enables all other form fields -> Stores owner ID in form state
4. **Vaccination management** -> Fetches enabled VaccinationTypes -> Renders dynamic array of vaccination entries -> Add/remove modify local array state -> Submit sends full array
5. **Birth date change** -> User picks date -> Auto-calculate age via date-fns -> Display computed age in read-only field
6. **Pet create** -> Fill required fields (owner, name, species, breed) -> Submit POST to `/api/pets` -> Increment refreshTrigger -> New pet appears in list
7. **Pet edit** -> Modify fields in expanded accordion -> Submit PUT to `/api/pets/:id` -> Increment refreshTrigger -> Updated data reflected
8. **Profile picture** -> (Edit mode only) -> Drag-drop or select image -> POST to `/api/pets/:id/profile-picture` -> Preview updates immediately
9. **Medical notes** -> (Edit mode only) -> Add note inline -> POST to `/api/pets/:id/medical-notes` -> Note appears in list
10. **Document upload** -> (Edit mode only) -> Drag-drop or select file -> POST to `/api/pets/:id/documents` -> File appears with type icon

## Key Files

- **`src/components/PetForm.tsx`** — Comprehensive pet creation/editing form. Owner-gated field enabling, species selection, dominance slider with color coding, birth date with auto-age calculation, dynamic vaccination array management. Handles both create and edit modes.
- **`src/components/PetList.tsx`** — Accordion-based pet list. Expandable rows with CSS grid transitions, species icon fallbacks, search/filter capabilities, refreshTrigger-based data invalidation.
- **`src/components/MedicalNotesSection.tsx`** — Inline editable medical notes list. Add/view/delete notes within the pet detail panel, newest-first ordering, timestamp display.
- **`src/components/DocumentUpload.tsx`** — File upload component with drag-and-drop support. Drop zone with visual feedback, file type icon mapping, upload progress indication, file list with delete capability.
- **`src/components/ProfilePictureUpload.tsx`** — Pet profile picture upload. Image preview, drag-and-drop or click-to-browse, crop/resize before upload, fallback to species icon.
