# Proposal — vet-details-popup

## Intent

The pet details popup and owner details popup currently reference vets by their raw primary-key id (`#12`, `#47`) — a placeholder that the original `vet-frontend` change deliberately deferred for a later UX pass. Operators cannot read the vet's name from the popup and have no way to drill into the vet without leaving the current surface, opening the Vets page, and searching manually.

This change closes that gap by:

1. Displaying the vet's **name** (not its id) inside both detail popups, and
2. Making each vet reference a **click target** that opens a new `VetDetailsPopup` — a read-only modal that mirrors the existing `PetDetailsPopup` / `OwnerDetailsPopup` pattern and includes an Edit button that hands off to the existing `VetForm` in edit mode.

The UX shape is: Pet details popup → click vet → Vet details popup → Edit → Vet form. Same flow from the owner details popup for both primary and emergency vets.

## Scope

### In scope

- **Backend serializer enrichment.** Add a compact nested projection of the related vet record on the serializers the popups read:
  - `PetSerializer`: add `vet_override_details` (id, name, phone, email, city) next to the existing `vet_override` FK column.
  - `OwnerSerializer` and `OwnerWithPetsSerializer`: add `primary_vet_details` and `emergency_vet_details` the same way.
  - A new `VetListSerializer` (id, name, phone, email, city) sourced from the existing `Vet` model. The full `VetSerializer` stays authoritative for the `/api/vets/` endpoint.
- **Frontend types.** Extend `Pet`, `Owner`, and `OwnerWithPets` with the new nested `*_details` fields typed as `VetListItem | null`. The existing raw-id fields stay for form submission / backwards compatibility.
- **New `VetDetailsPopup` component.** Modal overlay that fetches the vet via `api.vets.get(id)` on mount and renders a read-only preview: name + address summary, contact chips (phone / email), notes. Close and Edit buttons at the bottom; Edit hands off to `<VetForm>` in edit mode.
- **Pet details popup wiring.** The "Vet override" section switches from `#<id>` to the vet name, rendered as a button that opens the `VetDetailsPopup`.
- **Owner details popup wiring.** Both the primary vet and the emergency vet lines switch from `#<id>` to the vet name, each rendered as a button that opens the `VetDetailsPopup`.
- **Translations.** New `vet.detailsPopup.*` namespace in `en.json` and `es.json` (title, loading, loadFailed, editVet, openInVets).
- **Feature-flag alignment.** Keep the existing `vet_management` gate: the vet sections in the pet / owner popups are only rendered when the flag is on, matching current behaviour.

### Out of scope

- **Serializer changes to the vet `/api/vets/` endpoint itself.** The full `VetSerializer` is unchanged.
- **A dedicated `/vets/<id>` route.** The popup is the detail surface; consistent with the rest of the app.
- **Showing the pet's "effective vet" (resolver output) in the popup.** Today the `vet_override` column is what the popup already exposes, and that's what this change upgrades. The `effective_vet` convenience property remains a backend-only helper until we have a concrete UX reason to surface it.
- **Adding a vet's avatar / profile picture.** The `Vet` model has no image field.
- **Playwright coverage for the new popup.** Backend serializer tests are added; frontend coverage mirrors the policy used by `entity-cross-popups` (manual verification, TS build, and the existing Playwright smoke tests for the parent popups).

## Approach

1. Mirror the serializer enrichment pattern already used for owner avatars in `entity-cross-popups` — a lightweight `*ListSerializer` sourced via `source=` on the parent serializer. This keeps the payload small, read-only, and safe to expand later.
2. Mirror the popup UX used by `PetDetailsPopup` / `OwnerDetailsPopup`: presentational component that owns only its loading / error state; parent page owns the `popupVetId` + `editingVet` state so the Edit handoff is a matter of moving an id between two state slots.
3. Both popups parent the new `VetDetailsPopup` themselves (not via the page) because they already know which vet to open. The page only sees the outermost popup; click → open → close is contained. This keeps page-level state from ballooning and matches the "nested popup" pattern that browsers already handle well with z-index stacks.
4. When the vet Edit button is clicked inside the `VetDetailsPopup`, we close the inner popup and open `<VetForm>` rendered by the parent popup itself. Parent popup (pet / owner) stays open in the background; this is intentional — the operator is drilling into a sub-entity, not leaving the primary entity they were looking at.
