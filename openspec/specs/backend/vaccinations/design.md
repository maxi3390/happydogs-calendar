# Design: Vaccinations

## Technical Approach

The vaccination system consists of two models: **VaccinationType** (a reference/configuration model for available vaccine types) and **Vaccination** (actual vaccination records linked to pets). Critically, these two models are **not linked by a foreign key** — Vaccination uses a free-text `vax_type` field rather than a FK to VaccinationType. Vaccinations are managed exclusively as nested resources within the Pet serializer, not through standalone API endpoints.

## Architecture Decisions

### Decision: VaccinationType as Reference Model, Not FK Target

`VaccinationType` is a configuration model that stores the list of available vaccine types (name, enabled, order). However, `Vaccination.vax_type` is a **CharField (free-text)**, not a ForeignKey to VaccinationType.

**Why:** Vaccination types in veterinary practice are fluid — new vaccines appear, regional requirements differ, and pets may have been vaccinated elsewhere with types not in the nursery's predefined list. A free-text field allows recording any vaccination without requiring the type to exist in the reference table first.

**Alternatives considered:**
- *FK to VaccinationType (strict referential integrity):* Guarantees every vaccination references a known type. Simplifies querying by type and ensures consistent naming. However, it blocks recording vaccinations with unlisted types — staff would need to create the type first, adding friction.
- *FK with an "Other" type + description field:* Maintains referential integrity while allowing exceptions. But "Other (Rabies - imported)" is worse data quality than just "Rabies - imported" as free text.
- *Enum/choices on Vaccination model:* Even more restrictive — new types require code changes and migrations. Completely unsuitable for veterinary data.

**Tradeoffs:**
- **No referential integrity** between VaccinationType and Vaccination records. If a VaccinationType is renamed, existing Vaccination records retain the old name. There is no cascade or automatic sync.
- **Inconsistent naming risk:** Staff might enter "Rabies", "rabies", "RABIES", or "Anti-Rabies" for the same vaccine. The VaccinationType list serves as a suggestion list in the UI, guiding (but not enforcing) consistency.
- **Querying by type requires text matching:** `Vaccination.objects.filter(vax_type='Rabies')` must match exact text. Case-insensitive search (`vax_type__iexact`) helps but doesn't solve all variants.
- **This is a deliberate flexibility-over-integrity tradeoff** appropriate for a small nursery where staff know their data. A larger veterinary system would likely enforce the FK.

### Decision: Vaccinations Managed as Nested Resources

Vaccinations do not have standalone CRUD endpoints. They are created, read, updated, and deleted exclusively through the `PetSerializer`'s nested vaccination handling.

**Why:** A vaccination has no meaning outside of its pet context. Every vaccination operation is conceptually "managing pet X's vaccination records." Nesting reflects this domain relationship in the API structure. It also simplifies the frontend — a single PUT/PATCH to the pet endpoint manages both pet fields and vaccinations atomically.

**Alternatives considered:**
- *Standalone `/api/vaccinations/` endpoint:* Standard REST resource. More flexible for bulk operations across pets, but introduces complexity — which pet does a standalone POST /api/vaccinations/ belong to? The pet_id would need to be a required field, making it a "hidden" nested resource anyway.
- *Nested URL resource `/api/pets/{id}/vaccinations/`:* Proper REST nesting with separate serializer and viewset. Cleaner REST semantics but requires two API calls to create a pet with vaccinations — one for the pet, one for the vaccinations. The atomic single-request approach is simpler for the frontend.

**Tradeoffs:** No way to query/filter vaccinations independently (e.g., "find all pets with expired rabies vaccinations"). This would require either adding a standalone endpoint later or a custom pet filter. For v1, the nursery's primary interaction is per-pet, so this limitation is acceptable.

### Decision: Replace-All Strategy on Pet Update

When a pet is updated with vaccination data, **all existing vaccinations are deleted** and the provided list is created fresh. This happens within `@transaction.atomic`.

**Why:** See the detailed analysis in the [pets design.md](../pets/design.md). In summary: it eliminates the complexity of diffing (add/update/delete tracking), the frontend always sends the full list, and atomicity guarantees consistency.

**Tradeoffs:** Vaccination record IDs change on every pet update. If vaccination IDs are used as stable references elsewhere (unlikely in current design), this would break. The audit trail of individual vaccination records is also lost — you can't tell if a vaccination was "added on March 1st and unchanged since" because it gets a new database record on every pet update.

### Decision: VaccinationType Has enabled Flag and order Field

VaccinationType includes:
- **`enabled`** — Boolean for soft-disabling types without deletion
- **`order`** — Integer for controlling display order in the UI

**Why:** Soft-disable via `enabled` flag avoids deleting types that may be referenced by name in existing Vaccination records. While there's no FK, deleting a type from the reference list doesn't affect data — but keeping disabled types maintains historical context ("we used to offer this vaccine"). The `order` field supports custom sorting in the UI dropdown — commonly used vaccines first.

**Alternatives considered:**
- *Hard delete VaccinationType:* Simpler but loses the reference. Since there's no FK, it's technically safe, but staff might wonder why a type shown on existing records doesn't appear in the dropdown.
- *Sort by name:* Alphabetical sort is automatic and requires no maintenance. But "Rabies" and "Distemper" (common) would sort below less-common vaccines. Custom ordering reflects usage frequency.

## Data Flow

### Reading Pet with Vaccinations
```
GET /api/pets/{id}/
  → PetSerializer includes VaccinationSerializer(many=True)
  → QuerySet: pet.vaccinations.all()
  → Each vaccination: {id, vax_type, vax_date, ...}
  → Returned as nested array in pet response
```

### Updating Pet Vaccinations (Replace-All)
```
PUT /api/pets/{id}/ { ..., vaccinations: [{vax_type: "Rabies", vax_date: "2024-01-15"}, ...] }
  → PetSerializer.update()
    → @transaction.atomic
      → pet.vaccinations.all().delete()
      → For each vaccination in input:
          → Vaccination.objects.create(pet=pet, vax_type=vax_type, vax_date=vax_date)
      → Update pet fields
    → Return pet with new vaccination list
```

### VaccinationType Usage (UI Suggestions)
```
GET /api/vaccination-types/
  → VaccinationTypeViewSet.list()
  → QuerySet: VaccinationType.objects.filter(enabled=True).order_by('order')
  → Return [{id, name, order}, ...]
  → UI uses this as a suggestion dropdown
  → User can type a custom type not in this list
```

## Key Files

| File | Purpose |
|------|---------|
| `domain/vaccinations/models.py` | Vaccination model (pet FK, vax_type CharField), VaccinationType model |
| `pets/serializers.py` | VaccinationSerializer (nested in PetSerializer), VaccinationTypeSerializer |
| `pets/views.py` | VaccinationTypeViewSet (standalone CRUD for types), vaccination nesting handled by PetViewSet |
