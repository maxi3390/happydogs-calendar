# Design: Add Pets From the Owner List

## Context

Before this change, pet creation lives on /pets. The only way to associate a pet with an owner is by picking the owner from a dropdown inside the pet form, which also gates every other field until an owner is chosen. This design:

- Adds friction when a user just created an owner and wants to register that owner's pets.
- Keeps two create entry points for related resources (the owner page and the pet page), even though pets cannot exist without an owner.
- Makes bulk pet onboarding painful (every new pet needs manual owner re-selection).

The goal is to make the owner list the single entry point for pet creation, with a fast-path for multiple pets per owner.

## Decisions

### 1. Locked owner in the pet form, via a new `lockedOwnerId` prop

The pet form already knows how to operate with a pre-selected owner (edit mode does exactly that). The cleanest change is to accept an optional `lockedOwnerId?: number` prop:

- When absent, behavior is unchanged (dropdown visible and required) — this keeps the possibility to reintroduce a generic "add pet" entry point later if needed, without reworking the form again.
- When present, the owner dropdown block is not rendered at all (not merely disabled), and `isOwnerSelected` is forced to `true` so the form is fully enabled on open.
- In edit mode, `lockedOwnerId` is ignored (the pet's existing owner is used, as today).

Why hide the dropdown vs. showing it disabled? Showing a disabled owner dropdown adds visual noise and invites confusion ("can I change this?"). Hiding it also communicates "this pet is being created for that specific owner", which matches the entry-point UI on /owners.

Alternative considered: pass the whole `Owner` object rather than just the id. Rejected because the form only needs the id for submission; the owner's display name is already visible in the triggering owner card, so duplicating it inside the modal is noise.

### 2. "Save & Add Another" button

Create mode only. Placed to the left of the primary "Save" button, after "Cancel". On click:

1. Validate and submit the form exactly like "Save".
2. On success, do NOT call `onClose`. Instead:
   - Reset `formData` to defaults, keeping `owner = lockedOwnerId` (or the previously selected owner if ever the dropdown reappears in a future change).
   - Clear `pendingProfilePicture`, `vaccinations`, and any local error state.
   - Fire a success toast with the freshly saved pet's name.
   - Re-focus the `name` input so the user can immediately type.
3. The parent receives a lightweight "a pet was saved but the modal is still open" signal so it can refresh the underlying pet list (e.g. re-fetch the expanded owner's pets).

The parent signal is delivered through an optional `onSaveAndAnother?: (savedPet: Pet) => void` callback. If undefined, the fast-path still works locally (toast + reset), and the parent will see the final state when the user eventually clicks "Save" or "Cancel". Keeping the callback optional keeps the form easy to reuse from any entry point.

Disabled conditions mirror the "Save" button (`loading` only; `isOwnerSelected` is always true when `lockedOwnerId` is set). The button is hidden entirely in edit mode since "save & add another" makes no sense when editing an existing record.

Alternative considered: a checkbox "Create another after saving" next to the Save button. Rejected because it requires two clicks per pet instead of one, and users tend to forget to tick it before submitting.

### 3. Toast system

A minimal, framework-free toast:

- **`ToastProvider`** (context + portal). Holds a list of active toasts in state. Renders a fixed container in the top-right of the viewport (z-index above modals). Each toast auto-dismisses after a configurable timeout (default 4s).
- **`useToast()`** returns a `toast(message, { variant })` function. Variants: `success` (green accent), `error` (red accent). Neutral variant is reserved for future use.
- **`<Toast />` visual** is a rounded card with an icon (lucide-check-circle / alert-circle), the message, and a close button. Respects dark mode via the existing `bg-card`/`text-card-foreground` tokens.
- **Placement in the tree**: wrapped *inside* `TranslationProvider` in `app/layout.tsx`, so toasts can use `t()` messages if needed. Sits above the app-level modal overlay (`z-50` for modals → container uses `z-[60]`).

Why not a library (sonner, react-hot-toast)? The app currently has zero UX runtime deps beyond lucide-react and Tailwind; adding a transitive dep for a single toast is disproportionate. The custom component is small (~80 lines) and fits the Card/Button conventions already established in `components/ui/`.

Accessibility: the toast container has `role="status"` and `aria-live="polite"`. Close button is a keyboard-focusable `<button>` with an accessible label.

### 4. Remove the /pets page "Add Pet" button

Two options:

(a) Remove the button entirely.
(b) Keep it but open a blocking "pick an owner first" step.

Decision: **(a) remove entirely.** The /owners page is now the single entry point for pet creation, and "Add Pet" on /pets violates the new invariant that pet creation starts from an owner. Option (b) still forces the owner selection the new design wanted to eliminate. If in the future we want a global "add pet" action, we can add it back as a wizard that first picks the owner, but that is a separate proposal.

Tests that previously opened the pet form via /pets are updated to open it via the owner card.

### 5. Refresh strategy on /owners

When `PetForm` closes after a save, the /owners page should re-fetch:

1. The expanded owner's `ownerDetails[ownerId]` (so the new pet appears in the "Pets (N)" grid).
2. The owner list (so the `pet_count` badge on the owner summary updates).

The existing `fetchOwners()` handles (2). A new helper `refreshOwnerDetails(ownerId)` (same logic as `handleExpand`'s fetch path) handles (1). Both are called in the `onSave` callback of `PetForm`.

For "Save & Add Another" (the modal stays open), only (1) and (2) still need to run so the background state is current; the modal itself drives its own reset.

## Risks / Trade-offs

- **Existing tests break**: the /pets test suite extensively opens the form from /pets. Those tests must be rewritten to go through /owners. Without this update, the Playwright suite fails. Mitigation: the tests are part of this PR.
- **Translations helper must stay in sync**: `frontend/tests/helpers.ts` holds its own mock of translation strings for E2E. Forgetting to add the new keys there causes the mocked endpoints to return missing strings. Mitigation: mirror the new keys in the helper and in the JSON files.
- **Toast z-index above the modal**: the pet form modal sits at `z-50` with a dark backdrop; the toast must render above it (`z-[60]` or higher) so "Save & Add Another" feedback is visible while the modal is open.
- **State reset on "Save & Add Another"**: vaccinations, profile picture and error need to be explicitly reset, not just `formData`. Missing one would cause the next pet to inherit state from the previous.
- **Optional callback**: `onSaveAndAnother` is optional to keep the form flexible, but consumers that forget to wire it lose background-refresh while the modal stays open. Mitigation: on /owners we wire it to `refreshOwnerDetails` + `fetchOwners`.
