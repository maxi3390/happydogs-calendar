# Tasks

## 1. Backend: reusable Address mixin

- [x] 1.1 Create `backend/domain/addresses/__init__.py`
- [x] 1.2 Create `backend/domain/addresses/models.py` with abstract `Address` model (street, city, state, province, country)
- [x] 1.3 Optional: re-export `Address` from `backend/pets/models.py` for tidy imports

## 2. Backend: migrate Owner

- [x] 2.1 Update `backend/domain/owners/models.py` — Owner inherits `Address`, remove `address` TextField
- [x] 2.2 Create migration `backend/pets/migrations/0011_structured_owner_address.py` with:
  - AddField for street/city/state/province/country
  - RunPython to copy old `address` → `street` (truncated 255)
  - RemoveField for old `address`
- [x] 2.3 Update `backend/pets/serializers.py` — `OwnerWithPetsSerializer.Meta.fields` includes new fields
- [x] 2.4 Update `backend/pets/admin.py` — add new fields to `search_fields` where sensible

## 3. Backend tests

- [x] 3.1 `test_create_owner_with_structured_address` — all 5 fields roundtrip
- [x] 3.2 `test_partial_update_street_field` — PATCH a single address component
- [x] 3.3 `test_owner_list_excludes_address_by_default` — check list endpoint still contains the fields (it uses OwnerSerializer)
- [x] 3.4 `test_retrieve_owner_with_pets_includes_address_fields` — OwnerWithPetsSerializer exposes new fields

## 4. Frontend types & API

- [x] 4.1 Update `frontend/src/domain/owners/types.ts` — `Owner`, `OwnerWithPets`, `OwnerFormData` replace `address: string` with `street`, `city`, `state`, `province`, `country`

## 5. Frontend form & display

- [x] 5.1 Update `frontend/src/components/OwnerForm.tsx` — replace single address textarea with 5 labelled inputs, fullWidth
- [x] 5.2 Update `frontend/src/app/owners/page.tsx` — detail expansion shows structured address (join non-empty parts)

## 6. Translations

- [x] 6.1 `backend/translations/en.json` — add owner.street, owner.city, owner.state, owner.province, owner.country
- [x] 6.2 `backend/translations/es.json` — same keys with Spanish labels

## 7. Docs

- [x] 7.1 `docs/docs/backend/intro.md` — new "Address mixin" section + update Owner model fields table
- [x] 7.2 Update `openspec/specs/backend/owners/spec.md` to reflect the structured address

## 8. Verification

- [x] 8.1 `make test-backend` — all tests pass
- [x] 8.2 `make -n migrate` shows the new migration
- [x] 8.3 Python files parse clean (`ast.parse`)
- [x] 8.4 Frontend types compile (no lint errors on touched files)
