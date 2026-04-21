# MODIFIED: Frontend / Owners

## ADDED Requirements

### Requirement: Owner Accordion Pet Cards Open Pet Details Popup

When an owner card in the owner list is expanded, each of the owner's pet cards SHALL be interactive. Clicking a pet card SHALL open a Pet Details popup showing a read-only view of the pet and an Edit button that hands off to the Pet form.

The popup SHALL fetch the pet freshly via `api.pets.get(id)` on mount so it can surface fields (breed, age, weight, special notes) that are not present on the light `pets` projection embedded in the owner's detail payload.

#### Scenario: Clicking a pet card opens the popup

- GIVEN the operator has expanded an owner that has at least one pet
- WHEN the operator clicks on one of the pet cards
- THEN a Pet Details popup SHALL open
- AND the popup SHALL display the pet's name, species, breed, age, temperament, dominance, size, sex, neutered status, weight, and special notes

#### Scenario: Editing the pet from the popup

- GIVEN the Pet Details popup is open
- WHEN the operator clicks the Edit Pet button
- THEN the popup SHALL close
- AND the Pet form SHALL open pre-filled with that pet's data
- AND saving the form SHALL refresh the expanded owner's detail so any updated pet fields appear in the owner's pets list

#### Scenario: Schedule button on a pet card still works

- GIVEN the pet cards carry an existing "Schedule this pet" icon button
- WHEN the operator clicks the schedule icon (rather than the card body)
- THEN the schedule form SHALL open AND the Pet Details popup SHALL NOT open

#### Scenario: Closing the popup

- GIVEN the Pet Details popup is open
- WHEN the operator clicks the backdrop, the close button, or presses Escape
- THEN the popup SHALL close
- AND the underlying owner list and accordion state SHALL NOT be affected

#### Scenario: Pet avatar on the owner accordion pet cards

- GIVEN an owner is expanded in the owners list AND at least one of their pets has a profile picture
- WHEN the operator views the owner's pet cards
- THEN each pet card SHALL display the pet's profile picture as a small round avatar in the place where the species emoji used to appear
- AND if a pet has no profile picture the card SHALL keep the existing species emoji (🐕 / 🐱 / 🐦 / 🐰 / 🐾) as the fallback

The owner detail payload (`OwnerWithPets.pets[]`) SHALL therefore expose `profile_picture_url` per pet, so the accordion can render the avatar without fetching each pet individually.
