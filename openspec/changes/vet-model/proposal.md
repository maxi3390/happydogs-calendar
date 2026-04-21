# Proposal: Veterinarian Model With Owner And Pet Relations

## Intent

Nursery staff regularly need to contact a pet's vet — for routine check-ups, vaccinations, or emergencies where the operator can't reach the owner. Today the only place to record any vet-adjacent information is the free-text `emergency_contact` / `emergency_phone` fields on `Owner`, which don't carry an address, don't distinguish primary from emergency clinic, and don't allow a per-pet override for exotics or specialists. Add a dedicated `Vet` domain model that reuses the existing `Address` mixin, relate each `Owner` to a primary and an emergency vet, and let individual pets override the primary vet when their care requires it.

## Scope

In scope:
- New domain model `Vet` under `backend/domain/vets/` that inherits the `Address` abstract mixin so vet records carry structured postal address fields (`street`, `city`, `state`, `province`, `country`) on the same footing as owners. Additional vet-specific fields: `name`, `phone`, `email`, `notes`, `created_at`, `updated_at`.
- Two new nullable `ForeignKey` fields on `Owner`: `primary_vet` and `emergency_vet`, both pointing at `Vet` with `on_delete=SET_NULL` so deleting a vet doesn't cascade into owner records.
- New nullable `ForeignKey` on `Pet` named `vet_override`, pointing at `Vet` with `on_delete=SET_NULL`. When set it takes precedence over the owner's `primary_vet` for that pet.
- A read-only `effective_vet` property on `Pet` that resolves `vet_override` → `owner.primary_vet` → `None`, giving consumers a single accessor.
- A serializer (`VetSerializer`), viewset (`VetViewSet`), and router registration at `/api/vets/` so the REST API offers the standard list / retrieve / create / update / delete verbs.
- Django admin registration for `Vet`, `Owner` (exposing the two new vet FKs), and `Pet` (exposing `vet_override`).
- A new migration under `pets/migrations/` covering the new table and the two new columns on `Owner` and one on `Pet`.
- A `create_vet` helper in `backend/tests/factories.py` and a focused test module `backend/pets/tests/test_vet_api.py` covering list / retrieve / create / update / delete, the two owner relations, the pet override, and the `effective_vet` property semantics.
- OpenSpec deltas: new baseline `backend/vets` capability; MODIFIED `backend/owners` (documenting `primary_vet` and `emergency_vet`); MODIFIED `backend/pets` (documenting `vet_override` and `effective_vet`).

Out of scope:
- Any frontend change. The TypeScript `Vet` type, its API client, and any UI to create / select / edit vets live in a dedicated follow-up change so this one stays data-model-focused and reviewable as a single unit.
- Backfill of existing `emergency_contact` / `emergency_phone` into `Vet` rows. Those owner fields remain untouched; operators populate `primary_vet` / `emergency_vet` as they create vet records.
- An `emergency_vet_override` per-pet field. The spec explicitly models one per-pet override (primary) because emergency clinics are overwhelmingly owner-scoped ("the 24-hour clinic I'd call for my animals") rather than pet-scoped. Adding a second per-pet override later is a narrow additive change if a real need surfaces.
- Role-based permissions on the `Vet` API. It inherits the same `IsAuthenticated` posture as the rest of the API; any future "only admins can edit vets" rule is a separate policy change.

## Approach

- Place the new model under `backend/domain/vets/` to match the existing per-entity domain folders (`addresses`, `owners`, `pets`, `notes`, …). Re-export `Vet` from `backend/pets/models.py` alongside the other entities so Django's `pets` app continues to hold every model and its migrations, mirroring the convention every other model follows.
- Inherit `domain.addresses.models.Address` on `Vet` exactly as `Owner` does. The inheritance pulls the five address fields in with matching help_text and Spanish labelling (`Localidad`, `Provincia`, etc.) — no code duplication and no risk of drift between owner and vet address handling.
- Relations use `on_delete=SET_NULL` in all three places: an owner or pet loses the reference when a vet is deleted, but the record itself is preserved. `related_name` values distinguish the back-pointers: `primary_for_owners`, `emergency_for_owners`, `override_for_pets`.
- The `Pet.effective_vet` property is a plain Python method that reads `self.vet_override` first, then falls back to `self.owner.primary_vet` when the owner is set. It does not trigger extra database queries when the relationships are already loaded via `select_related` / `prefetch_related`, and callers who want the related vet without the resolution logic still have `pet.vet_override` and `pet.owner.primary_vet` directly.
- `VetSerializer` uses `fields = '__all__'` and marks `created_at` / `updated_at` read-only, following the pattern set by `OwnerSerializer`. `VetViewSet` registers at `/api/vets/` with `IsAuthenticated` permission, `DefaultRouter` URL generation, and the same `MultiPartParser` / `FormParser` / `JSONParser` set as other viewsets (even though `Vet` has no file fields today — keeps future-friendliness cheap).
- The migration is generated with `docker compose exec backend python manage.py makemigrations pets`, which produces a single migration file named `pets/migrations/0012_vet_owner_vets_pet_vet_override.py` (or similar). It creates the `Vet` table with all address + vet fields, adds the three FK columns to the existing `Owner` / `Pet` tables, and stays forward-only (no reverse data migration needed).
- Tests live in `backend/pets/tests/test_vet_api.py`, register in the existing test discovery path, and use a new `create_vet(**overrides)` helper in `tests/factories.py`. Coverage targets: CRUD verbs, address-field round-trip, owner FK behavior on vet delete, pet FK behavior on vet delete, `effective_vet` resolution for all four cases (override, fallback, neither, neither + no owner).
