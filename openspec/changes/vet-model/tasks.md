# Tasks

## 1. Domain model
- [x] 1.1 Create `backend/domain/vets/__init__.py` (empty).
- [x] 1.2 Create `backend/domain/vets/models.py` with a `Vet` class inheriting `Address` and adding `name`, `phone`, `email`, `notes`, `created_at`, `updated_at`. `Meta.app_label = 'pets'`, `ordering = ['name']`.
- [x] 1.3 Re-export `Vet` from `backend/pets/models.py` alongside the existing entities.

## 2. Relations
- [x] 2.1 `Owner`: add `primary_vet` and `emergency_vet` FKs (`on_delete=SET_NULL`, `null=True`, `blank=True`, distinct `related_name`s).
- [x] 2.2 `Pet`: add `vet_override` FK (same options, `related_name='override_for_pets'`).
- [x] 2.3 `Pet`: add `effective_vet` read-only property resolving override → owner.primary_vet → None (guard on `vet_override_id` and `owner_id` to avoid extra queries).

## 3. Admin / serializers / views / routes
- [x] 3.1 Register `Vet` in `backend/pets/admin.py` with sensible list_display / search_fields.
- [x] 3.2 Extend existing `OwnerAdmin` and `PetAdmin` list_display / raw_id_fields where relevant (minimal changes — just surface the new FKs).
- [x] 3.3 Add `VetSerializer` to `backend/pets/serializers.py` (`fields = '__all__'`, audit timestamps read-only).
- [x] 3.4 Add `VetViewSet` to `backend/pets/views.py` with `IsAuthenticated` and `drf-spectacular` schema tags.
- [x] 3.5 Register the router path `/api/vets/` in `backend/pets/urls.py`.

## 4. Migration
- [x] 4.1 Generate the migration: `docker compose exec backend python manage.py makemigrations pets`.
- [x] 4.2 Apply it: `docker compose exec backend python manage.py migrate`.
- [x] 4.3 Confirm only one new migration file appears under `backend/pets/migrations/`.

## 5. Tests
- [x] 5.1 Add `create_vet` factory in `backend/tests/factories.py` (auto-unique `name` when not supplied).
- [x] 5.2 New `backend/pets/tests/test_vet_api.py` covering list, retrieve, create (with and without address fields), update, delete.
- [x] 5.3 In the same test module: delete a referenced vet and assert `owner.primary_vet` / `owner.emergency_vet` / `pet.vet_override` become `None`.
- [x] 5.4 Pet test coverage for `effective_vet`: override set (override wins), override null + owner has primary (primary wins), override null + owner null (None), pet with no owner (None or override).
- [x] 5.5 Extend existing owner and pet API tests minimally to prove the new FKs round-trip via POST / PATCH.

## 6. Spec deltas
- [x] 6.1 New baseline `openspec/specs/backend/vets/spec.md` describing the Vet model, address inheritance, FK behavior, and CRUD API.
- [x] 6.2 MODIFIED `openspec/specs/backend/owners/spec.md` with a new requirement for `primary_vet` and `emergency_vet`.
- [x] 6.3 MODIFIED `openspec/specs/backend/pets/spec.md` with a new requirement for `vet_override` and `effective_vet`.
- [x] 6.4 Mirror all three under `openspec/changes/vet-model/specs/backend/{vets,owners,pets}/spec.md` using ADDED / MODIFIED markers.

## 7. Verification
- [x] 7.1 `make test-backend` (or the equivalent `python manage.py test --settings=nursery.test_settings --keepdb`) — every previous test still passes (222 baseline) and new Vet tests are green.
- [x] 7.2 `python -m py_compile` on touched Python files as a smoke check.
- [x] 7.3 `docker compose build backend` succeeds.
- [x] 7.4 Manual: `GET /api/vets/` returns 200 on an authenticated client and an empty list on a fresh DB.
