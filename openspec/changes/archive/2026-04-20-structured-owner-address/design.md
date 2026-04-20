# Design: Structured Owner Address

## Technical Approach

Introduce a reusable abstract Django model, `Address`, in a new domain module `backend/domain/addresses/`. Any concrete model that needs a structured address inherits from it via Django's multiple-inheritance pattern (the abstract mixin contributes its fields to each subclass's table). `Owner` is the first consumer; future consumers (e.g., a nursery branch model, a vendor model) inherit the same mixin without code duplication.

## Architecture Decisions

### Decision: Abstract model mixin (not concrete with FK)

```python
# backend/domain/addresses/models.py
class Address(models.Model):
    """Reusable address fields. Inherit as an abstract mixin."""
    street = models.CharField(max_length=255, blank=True, ...)
    city = models.CharField(max_length=100, blank=True, help_text="Ciudad")
    state = models.CharField(max_length=100, blank=True, help_text="Localidad")
    province = models.CharField(max_length=100, blank=True, help_text="Provincia")
    country = models.CharField(max_length=100, blank=True, help_text="País")

    class Meta:
        abstract = True
```

**Alternatives considered:**
- *Concrete `Address` model + FK from Owner*: more flexible (multiple addresses per entity, address reuse), but adds a join on every query and introduces orphan-address cleanup concerns. Overkill for the current requirement of one address per owner.
- *JSONField on Owner*: single column, schemaless. Loses indexability, loses type safety at the ORM level, and makes migrations harder when we add fields.
- *`django-address` third-party package*: heavy (depends on Google Maps API) and introduces an external service dependency for something that's fundamentally five strings.

**Why abstract mixin:** simplest possible shape that satisfies the reuse requirement; each table owns its columns; zero runtime cost; trivial migrations.

### Decision: Remove the old `address` TextField

The existing `Owner.address` (free-form text) is dropped. A data migration copies existing values into the new `street` field, truncated to 255 characters if necessary.

**Rationale:** the whole point of "divide the address" is that the system no longer stores the address as an opaque blob. Keeping both fields would leave two places to look for the same data and confuse form rendering. A best-effort copy into `street` preserves any existing data during the schema transition.

**Tradeoffs:** values longer than 255 chars are truncated. Acceptable because the old field was rarely used for massive multi-line addresses in practice, and the truncated portion is just the tail of the string. The frontend provides new fields (city/state/province/country) to capture the rest cleanly.

### Decision: All fields optional (`blank=True`)

Every address component is optional, matching the current behavior (the old `address` field was also `blank=True`).

**Rationale:** we don't want to block owner creation on complete address data. Staff can capture what's given and fill in the rest later. If partial addresses become a data-quality issue in practice, a follow-up change can introduce `required=True` on the fields that matter most.

### Decision: Field naming conventions

| Spanish (user-facing) | Field name (code) | Rationale |
|-----------------------|-------------------|-----------|
| Dirección | `street` | "street" is the conventional English term for a street address line |
| Ciudad | `city` | Standard English |
| Localidad | `state` | Short, CRM-friendly English property name. The Spanish-facing label "Localidad" is preserved via the i18n layer |
| Provincia | `province` | Direct cognate. Not `state` because the primary market is Argentina where provinces are called provincias, and because `state` is already taken by the localidad field above |
| País | `country` | Standard English |

The Spanish user-facing labels are carried by the frontend translation layer (`owner.city`, `owner.state`, `owner.province`, `owner.country` keys in `es.json`).

### Decision: Data migration semantics

Single migration file with:
1. `migrations.AddField` for each of the 5 new columns (nullable/blank during transition).
2. `migrations.RunPython` that runs a forward function copying `owner.address` into `owner.street` (slicing to `[:255]`) for all existing rows.
3. `migrations.RemoveField` for `address`.
4. A no-op reverse (`migrations.RunPython.noop`) for the data copy so rollbacks don't crash but also don't magically reconstruct the textfield.

**Tradeoff:** rollback loses the structured fields without reconstituting a plausible `address` textfield. Acceptable — rollback in a project this size means restoring from backup anyway.

### Decision: Serializer keeps `fields = '__all__'` for Owner

`OwnerSerializer` already uses `fields = '__all__'`, which automatically picks up the new columns. `OwnerWithPetsSerializer` has an explicit field list and must be updated to include the 5 new fields.

## Data Flow — creating an owner with structured address

```
Frontend form submits JSON:
  {
    first_name: "Ana",
    last_name: "García",
    email: "ana@example.com",
    phone: "+54 11 1234 5678",
    street: "Av. Cabildo 1234",
    city: "Ciudad Autónoma de Buenos Aires",
    state: "Belgrano",
    province: "Buenos Aires",
    country: "Argentina",
    ...
  }
        │
        ▼
  POST /api/owners/
        │
        ▼
  OwnerViewSet.create()
        │
        ▼
  OwnerSerializer.validate + save
        │
        ▼
  Owner row written with all 5 address columns
        │
        ▼
  Response 201 with full owner payload including address fields
```

## Reusability — future adoption example

```python
# Hypothetical future model: a nursery branch with an address
from domain.addresses.models import Address

class Branch(Address, models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    # `street`, `city`, `state`, `province`, `country` come from Address
```

No new migration file for the fields themselves is needed — they inherit the column definitions from the mixin. The `Branch` migration will include the 5 columns automatically.

## Key Files

| File | Change |
|------|--------|
| `backend/domain/addresses/__init__.py` | NEW — empty package marker |
| `backend/domain/addresses/models.py` | NEW — abstract `Address` model |
| `backend/domain/owners/models.py` | Owner inherits `Address`; remove `address` TextField |
| `backend/pets/models.py` | Re-export the Address mixin (optional; makes imports tidier) |
| `backend/pets/migrations/0011_structured_owner_address.py` | NEW — AddFields + data migration + RemoveField |
| `backend/pets/serializers.py` | `OwnerWithPetsSerializer.Meta.fields` updated to include the 5 new fields |
| `backend/pets/admin.py` | Optional — add new fields to `list_filter` / `search_fields` |
| `backend/pets/tests/test_owner_api.py` | Add tests for create/update/retrieve with structured address |
| `backend/tests/factories.py` | Optional — extend `create_owner` to accept address kwargs |
| `frontend/src/domain/owners/types.ts` | Replace `address: string` with 5 new fields on `Owner`, `OwnerWithPets`, `OwnerFormData` |
| `frontend/src/components/OwnerForm.tsx` | Replace single textarea with 5 labelled inputs |
| `frontend/src/app/owners/page.tsx` | Update detail-expansion display to show structured address |
| `backend/translations/en.json` | Add `owner.street`, `owner.city`, `owner.state`, `owner.province`, `owner.country` keys |
| `backend/translations/es.json` | Same keys with Spanish values |
| `docs/docs/backend/intro.md` | Document the new Address mixin + updated Owner model |
| `openspec/specs/backend/owners/spec.md` | Reflect the new address structure |
