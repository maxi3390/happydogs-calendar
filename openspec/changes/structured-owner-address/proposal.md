# Proposal: Structured Owner Address with Reusable Address Mixin

## Intent

The Owner model currently stores addresses as a single free-form `address: TextField`. This makes it impossible to search, filter, sort, or export owners by location — a common need for a nursery that may need to send mailings, verify pickup zones, or produce regional statistics. Upcoming work (e.g., delivery radius, nursery branches, vendor records) will also need structured addresses. This change introduces a reusable `Address` abstract model that any Django model can inherit from, and migrates `Owner` to use it.

## Scope

### In scope

- New abstract Django model `Address` in `backend/domain/addresses/models.py` with:
  - `street` — street address line (building number + street name + unit)
  - `city` — **ciudad**
  - `state` — **localidad**
  - `province` — **provincia**
  - `country` — **país**
  - All fields optional (`blank=True`) to preserve current flexibility
- `Owner` inherits from `Address` (abstract), gaining the 5 address fields.
- Remove the existing free-form `Owner.address` (TextField) field. A data migration copies any existing value into the new `street` field (truncated to 255 characters if needed).
- DRF serializers expose the new fields alongside the existing owner fields.
- Owner admin registers the new fields for display and search.
- Frontend:
  - Owner form: replace the single address textarea with 5 inputs (street, city, state, province, country).
  - Owner list / detail views: show the structured address.
  - TypeScript types: replace `address: string` with the structured fields.
  - Translations: add `owner.street`, `owner.city`, `owner.state`, `owner.province`, `owner.country` keys in both `en.json` and `es.json`.
- Backend tests: creation, update, retrieval with structured address fields.

### Out of scope

- Postal / ZIP code (can be added later by extending the `Address` mixin — explicitly noted in the design).
- Address validation against a real geocoding service.
- Multiple addresses per owner (current flow assumes a single home address).
- Retroactively parsing existing free-form `address` values into structured fields — too fragile; existing values go verbatim into `street`.
- Migration of other models to the new `Address` mixin (e.g., adding a nursery address). The mixin is created for reuse; applying it to other models is follow-up work.

## Approach

Django abstract models are the idiomatic way to ship a reusable set of fields without a join table. `Address(models.Model)` with `class Meta: abstract = True` compiles into concrete columns on every subclass's table (no extra join cost, no generic-FK complexity).

Owner inherits from `Address`:
```python
class Owner(Address, models.Model):
    first_name = ...
    # 5 address fields come from the mixin
```

Migration steps (single file):
1. `AddField` the 5 new columns on Owner (from the mixin).
2. `RunPython` data migration: copy old `address` into new `street` (truncated).
3. `RemoveField` the old `address` column.

Frontend rewires the single textarea input into 5 labelled inputs, using existing `<Input>` component + translation keys. Owner detail view concatenates non-empty pieces for display (e.g., `"Calle 123, Caballito, Buenos Aires, Argentina"`).
