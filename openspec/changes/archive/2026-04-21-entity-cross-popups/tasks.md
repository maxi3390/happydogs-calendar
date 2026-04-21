# Tasks

## 1. Popup components
- [x] 1.1 `frontend/src/components/PetDetailsPopup.tsx`:
  - Props: `petId`, `onClose`, `onEdit`.
  - Fetches the pet via `api.pets.get(id)` on mount; loading + error states.
  - Read-only sections: header, traits, profile (sex / neutered / weight), owner, vet_override (flag-gated), special notes.
  - Footer: Close + Edit Pet buttons.
  - `role="dialog"`, focus-traps the close button on mount, ESC closes.
- [x] 1.2 `frontend/src/components/OwnerDetailsPopup.tsx`:
  - Props: `ownerId`, `onClose`, `onEdit`.
  - Fetches the owner via `api.owners.get(id)` on mount.
  - Read-only sections: header, identification, address, emergency contact, veterinary (flag-gated), pet count, notes.
  - Same footer, accessibility, ESC behaviour.

## 2. PetList wiring
- [x] 2.1 Add an `onViewOwner?: (ownerId: number) => void` prop to `PetList`.
- [x] 2.2 In the accordion body, wrap the `Owner: <full_name>` line in a `<button type="button">` that invokes `onViewOwner(pet.owner)` when present AND the pet has an owner.
- [x] 2.3 The button is styled as a subtle link (hover underline) so it reads as interactive.

## 3. Pets page
- [x] 3.1 Add `ownerDetailsId` state + render `OwnerDetailsPopup` when non-null.
- [x] 3.2 Add `editingOwner` state + render `OwnerForm` when set.
- [x] 3.3 Wire `onEdit(owner)` on the popup to close itself and open `OwnerForm` for the same id.
- [x] 3.4 After `OwnerForm` saves, refresh the pet list (increment the existing `refreshPets` counter) so any updated owner name is re-fetched on the rendered pet cards.

## 4. Owners page
- [x] 4.1 Make each pet card in the expanded accordion a click target (the existing "Schedule" icon button on the right stays functional — `stopPropagation` on it).
- [x] 4.2 Add `petDetailsId` state + render `PetDetailsPopup` when non-null.
- [x] 4.3 Add `editingPet` state; extend the existing `PetForm` render to support both Add (`lockedOwnerId`) and Edit (`pet={editingPet}`).
- [x] 4.4 After `PetForm` saves, refresh the expanded owner's details so the updated pet fields (name, species) show up.

## 5. Translations
- [x] 5.1 Add `pet.detailsPopup.*` and `owner.detailsPopup.*` namespaces in en / es.
- [x] 5.2 Ensure `common.close` is present in both locales.

## 6. Specs
- [x] 6.1 Write `openspec/changes/entity-cross-popups/specs/frontend/pets/spec.md` (MODIFIED delta: "Clicking owner opens owner popup" requirement).
- [x] 6.2 Write `openspec/changes/entity-cross-popups/specs/frontend/owners/spec.md` (MODIFIED delta: "Clicking pet opens pet popup" requirement).
- [x] 6.3 Append the same requirements to the baseline `openspec/specs/frontend/{pets,owners}/spec.md`.

## 7. Verification
- [x] 7.1 `tsc --noEmit` — zero errors.
- [x] 7.2 Manual: on `/pets`, expand a pet, click the owner name → popup opens with owner details. Click Edit → owner form opens. Save → pet list refreshes.
- [x] 7.3 Manual: on `/owners`, expand an owner, click a pet card → popup opens with pet details. Click Edit → pet form opens. Save → owner details refresh.
- [x] 7.4 Manual: ESC closes each popup. Clicking outside the card closes each popup.

## 8. Profile picture avatars on the cross-entity surfaces
- [x] 8.1 Backend: add `profile_picture_url` to `OwnerListSerializer` (used as `owner_details` on `PetSerializer`) via a `SerializerMethodField` that builds an absolute URI when a request is in context.
- [x] 8.2 Backend: add `profile_picture_url` to `PetListSerializer` (used as `pets` on `OwnerWithPetsSerializer`) the same way.
- [x] 8.3 Frontend types: add `profile_picture_url?: string | null` on `OwnerListItem` and on the inline pet row type of `OwnerWithPets.pets[]`.
- [x] 8.4 `PetDetailsPopup`: in the Owner section, render a small round avatar (picture if present, else initials) next to the owner's full name.
- [x] 8.5 `/app/owners/page.tsx`: on the expanded owner's pet cards, render the pet's `profile_picture_url` when present; otherwise keep the existing species emoji (`🐕` / `🐱` / `🐦` / `🐰` / `🐾`).
