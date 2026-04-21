# Design: Veterinarian Model With Owner And Pet Relations

## Context

The staff's current mental model maps vet information to the owner's emergency contact — a 20-character phone number field and a 100-character name field. This collapses two distinct roles ("the person who knows the pet best" vs "the vet clinic") into one string and forbids any address, email, or notes. For a nursery whose business depends on being able to reach the right clinic quickly, that shape isn't good enough.

The change introduces a first-class `Vet` entity, attaches each owner to both a primary and an emergency vet, and lets specialized pets override the primary. It reuses the `Address` abstract mixin that was introduced in the earlier `structured-owner-address` change so vet addresses benefit from the same multi-line postal structure without any duplication.

## Decisions

### 1. A single `Vet` model, not one per-owner

Alternatives considered:

- **One Vet row per Owner**, denormalized into the owner itself. Rejected: it duplicates data when two owners share a vet (common in small towns), makes "update clinic address" an O(owners) task, and would hide vet records from any future "list vets the nursery works with" admin view.
- **Polymorphic Contact model** that could represent vets, emergency contacts, pickup contacts, etc. Rejected: premature abstraction. The domain has four entities (owner, pet, vet, clinic-as-vet) and conflating them behind a polymorphic spine would make queries and serializers harder for no current payoff.
- **Shared `Vet` table with `ForeignKey`s from consumers** (the chosen design). Data lives once, is owned by no one, and references are `SET_NULL` so deletion is safe.

### 2. Address via the existing abstract mixin

`Vet` inherits `domain.addresses.models.Address`. The five fields (`street`, `city`, `state`, `province`, `country`) come in with matching defaults, help_text, and Spanish labelling (`Localidad`, `Provincia`, `País`). No re-declaration, no drift. Any future change to the Address mixin — validation, geocoding, formatting — applies to vets automatically. This is exactly the pattern `Owner` already uses.

Alternative considered: a dedicated `VetAddress` sub-model with a one-to-one relation. Rejected — there's no independent reason to query addresses without their owning entity, so flattening keeps things simple.

### 3. Three FK fields: owner.primary_vet, owner.emergency_vet, pet.vet_override

- **`Owner.primary_vet`**: the owner's regular clinic. Nullable so an owner who hasn't designated one remains valid. Used as the fallback when a pet has no override.
- **`Owner.emergency_vet`**: the after-hours / trauma clinic. Nullable. Not part of the per-pet fallback chain — emergencies are owner-scoped by convention: one operator knows "this owner goes to clinic X after midnight" and that's enough. If a concrete case surfaces where pets need per-pet emergency overrides, the spec can add it later additively without breaking callers.
- **`Pet.vet_override`**: per-pet override of the owner's primary. Named "override" rather than "vet" to make the fallback semantics obvious at the call site. Nullable, and when null the pet implicitly uses the owner's primary.

All three use `on_delete=SET_NULL` so deleting a vet clears the references instead of cascading into owner or pet deletion. `related_name` is set distinctly (`primary_for_owners`, `emergency_for_owners`, `override_for_pets`) to keep reverse queries clear on the `Vet` model.

Alternative considered: `on_delete=PROTECT` to refuse deleting a vet that's still referenced. Rejected for a first iteration — operators who want to clean up an unused vet shouldn't have to hunt down every referencing record. If the business ever wants stricter deletion rules, the change is one line.

### 4. `Pet.effective_vet` helper property

A read-only Python property that resolves to:

```
self.vet_override or (self.owner.primary_vet if self.owner_id else None)
```

`vet_override_id` is checked before dereferencing the FK to avoid an unnecessary query when the override is unset. The owner branch similarly guards on `owner_id` to handle the nullable-owner case.

This property is the single public accessor for "which vet cares for this pet right now?". Serializers and views SHOULD use it rather than re-implementing the fallback logic. It is a pure Python computation with zero additional writes and an at-most-two row read — well within Django's `select_related('vet_override', 'owner__primary_vet')` performance budget.

Alternative considered: a `@classmethod` query that filters pets by effective vet. Rejected — until a real feature needs it, exposing it in the model surface adds API for nothing.

### 5. Migration shape

Running `python manage.py makemigrations pets` produces one migration that:

1. Creates the `pets_vet` table with the abstract Address columns plus `name`, `phone`, `email`, `notes`, `created_at`, `updated_at`.
2. Adds `primary_vet_id` and `emergency_vet_id` FK columns on `pets_owner`.
3. Adds `vet_override_id` FK column on `pets_pet`.

Forward-only, no data backfill needed. Previous fixtures and seeds keep loading because all new columns are nullable.

### 6. API surface matches the rest of the app

`/api/vets/` with standard DRF verbs:

- `GET  /api/vets/` — list
- `GET  /api/vets/<id>/` — retrieve
- `POST /api/vets/` — create
- `PATCH /api/vets/<id>/` — update
- `DELETE /api/vets/<id>/` — delete

Permission class is `IsAuthenticated` like the other viewsets. Response serializer emits every field including the inherited address fields and the two audit timestamps. Owner and Pet serializers serialize their FKs as IDs today; nested details can be added in a follow-up change when the UI needs them, to avoid API payload bloat before it's requested.

### 7. Spec carving

- **New** `backend/vets` capability covering the model shape, the address-mixin inheritance, and the CRUD API.
- **Modified** `backend/owners` capability — ADD a requirement describing `primary_vet` and `emergency_vet`, their nullability, and the `on_delete=SET_NULL` behavior.
- **Modified** `backend/pets` capability — ADD a requirement for `vet_override` and the `effective_vet` resolution order.

No frontend spec touches. UI work is an explicit follow-up.

### 8. Test surface

`backend/pets/tests/test_vet_api.py` will include:

- List vets (authenticated vs unauthenticated)
- Retrieve a vet by id
- Create a vet with and without address fields
- Update a vet (including moving its address)
- Delete a vet and assert owner/pet references set to null
- Owner create/patch including the two new FKs
- Pet create/patch including the override
- `effective_vet` returns override when set, owner's primary when override is null, and `None` when neither is set

`tests/factories.py` gets `create_vet(**overrides)` modelled on `create_owner` (auto-generated unique `name` when not supplied).

## Risks / Trade-offs

- **Shared vet edits blast out**: updating a vet's address propagates to every owner and pet that references it. This is the intended benefit, but operators who want to record a vet as "what it was when I signed up" must create a new vet record rather than editing in place. Will surface in the admin docs.
- **No UI yet**: this change leaves vets inaccessible outside Django admin and direct API calls for a short period. Acceptable because the follow-up frontend change is a single contained piece of work. Callers who want to automate vet creation can hit the REST API today.
- **`effective_vet` depends on related data being loaded**: naive callers hitting `pet.effective_vet` on many pets without `select_related` will generate N+1 queries. Documented in the property docstring; view/serializer code that iterates pets is expected to use `select_related('vet_override', 'owner__primary_vet')` as it already does for other relations.
- **Migration collision**: if the repository lands another `pets/` migration between now and the merge, the auto-generated migration number might conflict. Mitigation: generate the migration on a freshly-updated master and include the actual filename in the PR.
