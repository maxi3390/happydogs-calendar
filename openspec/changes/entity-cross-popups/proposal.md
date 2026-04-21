# Proposal — entity-cross-popups

## Intent

Today the pet list shows the owner's name as a plain text line (`Owner: Luis Fernández`) and the owner detail accordion shows each of the owner's pets as a static card. Neither reference is reachable — if the operator wants to look up (or edit) the referenced entity, they have to navigate to the sibling list page and find it manually. Add two popup components so the reference itself is a click target: clicking an owner's name from a pet's detail opens an **Owner details** popup; clicking a pet card from an owner's detail opens a **Pet details** popup. Each popup includes an **Edit** action that hands off to the existing form in edit mode.

## Scope

### In scope

- A new `OwnerDetailsPopup` component — modal overlay that fetches the owner on mount (`api.owners.get(id)`) and renders a read-only preview (avatar + name, email, phone, id number, address, emergency contact, primary/emergency vets when `vet_management` is on, notes). Close and Edit buttons at the bottom.
- A new `PetDetailsPopup` component — modal overlay that fetches the pet on mount (`api.pets.get(id)`) and renders a read-only preview (avatar + name, species, breed, age, temperament, dominance, size, sex, neutered, weight, owner full name, special notes). Close and Edit buttons at the bottom.
- Wiring in `PetList.tsx`: the `Owner: <name>` line in the expanded pet accordion becomes a `<button>` that invokes a new `onViewOwner(ownerId)` callback. `PetList` does not own the popup state itself — the parent page does, so the edit handoff can share state with the existing form.
- Wiring in `/app/pets/page.tsx`: when `PetList` emits `onViewOwner`, the page opens `<OwnerDetailsPopup>`. Clicking **Edit Owner** in the popup closes the popup and opens `<OwnerForm>` (already a standalone component) for that owner.
- Wiring in `/app/owners/page.tsx`: each pet card in the expanded owner accordion becomes clickable. Clicking it opens `<PetDetailsPopup>`. Clicking **Edit Pet** closes the popup and opens the existing `<PetForm>` in edit mode (the owners page already instantiates `PetForm` for Add Pet — extend the same instance to cover edit).
- Translations under `pet.detailsPopup.*` and `owner.detailsPopup.*` for all new strings (section headings, close / edit labels).

### Out of scope

- Inline editing inside the popup. The popup is read-only by design; clicking **Edit** hands off to the existing form modal. This keeps form validation, vaccination lists, document upload, and the rest of the form machinery in exactly one place.
- Navigating from the popup to the referenced entity's list page (e.g. "open the owner's full page"). We don't have a per-owner detail page today; the popup IS the detail surface.
- Deep-linking to a popup (`?owner_popup=123`). Not a common pattern in this app; add if asked.
- Additional cross-references (e.g. clicking a vaccination or a schedule to open its detail). Out of scope — only owner↔pet for now.

## Approach

1. Implement `PetDetailsPopup` and `OwnerDetailsPopup` as presentational components that own only their loading / error state. The parent page owns the `popupEntityId` + `editingEntity` state so the edit-handoff is a matter of moving an id between two local state slots.
2. Each popup uses the same visual scaffolding already in use by `PetForm` / `OwnerForm` (`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50` + a centered `bg-card rounded-xl max-w-lg` card). No new backdrop / modal primitive.
3. On the pets page, add an `editingOwner` state and an `<OwnerForm>` instantiation (mirror of the existing `editingPet` / `<PetForm>` pair). This is net new — today `/pets` doesn't edit owners.
4. On the owners page, the existing `<PetForm>` state (`petFormOwnerId` for Add Pet) is extended with an `editingPet` slot so the same component handles both add and edit.
