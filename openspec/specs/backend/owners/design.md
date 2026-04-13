# Design: Owners Management

## Technical Approach

The Owner model represents pet owners in the nursery system. It follows the same **Domain-Driven Design** structure as the Pet model, living in `domain/owners/models.py` with `app_label='pets'`. The model enforces uniqueness on email and id_number at the database level, and provides two serializer variants: a full detail serializer with nested pets, and a minimal list serializer optimized for dropdowns and reference displays.

## Architecture Decisions

### Decision: Owner Model in domain/owners/ with app_label='pets'

The Owner model lives in `domain/owners/models.py` but declares `app_label = 'pets'`, meaning its migrations are managed by the `pets` app.

**Why:** Owner is tightly coupled to the pets domain — owners exist only in context of having pets at the nursery. Sharing the `pets` app_label means Owner and Pet migrations live together, avoiding circular migration dependencies between apps. The `domain/owners/` directory provides logical separation while the shared app_label provides migration cohesion.

**Alternatives considered:**
- *Separate `owners` app with its own migrations:* Clean separation but introduces cross-app foreign key migrations that can create circular dependencies. Django handles this with lazy references, but it complicates the migration graph.
- *Owner model in `domain/pets/models.py` alongside Pet:* Reduces files but creates a monolithic model file. Separate files per entity is cleaner for navigation and version control.
- *Owner as part of the User model:* Some systems merge owner and user concepts. Here they are distinct — a User is someone who logs into the system (staff), an Owner is a customer who brings pets. They are different bounded contexts.

**Tradeoffs:** The `app_label` override means `python manage.py makemigrations pets` generates migrations for both Pet and Owner. This is intentional but can surprise developers expecting one model per app. Clear documentation mitigates this.

### Decision: Database-Level Uniqueness on Email and id_number

Both `email` (required) and `id_number` (optional) have `unique=True` at the database level.

**Why:** Email uniqueness prevents duplicate owner records, which would cause confusion in scheduling and communication. Government ID number uniqueness is a natural business constraint — one person has one ID. Enforcing at the database level provides a safety net even if application-level validation is bypassed (e.g., raw SQL, management commands, race conditions).

**Alternatives considered:**
- *Application-level uniqueness only (serializer validation):* Vulnerable to race conditions — two simultaneous requests could both pass validation, then one would fail on save. Database constraints eliminate this race condition.
- *Unique-together on (first_name, last_name, email):* More permissive but email alone is sufficient as a unique identifier.
- *id_number as required unique field:* Would strengthen identity verification but some owners may not provide ID, especially for casual visits.

**Tradeoffs:** The `id_number` field is optional (`blank=True, null=True`) but unique. In PostgreSQL, `NULL` values are not considered equal for uniqueness, so multiple owners can have `id_number=NULL`. This is correct behavior — only provided ID numbers must be unique.

### Decision: Default Ordering by last_name, first_name

The model's `Meta.ordering` is set to `['last_name', 'first_name']`.

**Why:** Alphabetical ordering by surname is the natural expectation for a list of people in a business context. Setting it at the model level ensures consistent ordering across all queries — API endpoints, admin views, and management commands all get the same sort order without explicit `.order_by()`.

**Alternatives considered:**
- *No default ordering (let views decide):* More flexible but inconsistent — every queryset must remember to sort, and forgetting produces unpredictable results.
- *Order by created date:* Useful for "recently added" views but unhelpful for finding a specific owner in a list.

**Tradeoffs:** Default ordering adds an `ORDER BY` clause to every query hitting the Owner table. For list views this is desired; for aggregate queries (counts) it's unnecessary overhead. Django's ORM is smart enough to drop ordering in `.count()` calls, but not in all cases. For the expected dataset size (hundreds to low thousands of owners), this is negligible.

### Decision: Two Serializer Variants (Detail vs. List)

- **`OwnerWithPetsSerializer`** — Full detail: all owner fields plus nested list of all pets belonging to this owner.
- **`OwnerListSerializer`** — Minimal: `id`, `first_name`, `last_name`, `full_name`, `phone`, `email`, `id_number`. Designed for dropdowns and search results.

The `pet_count` is a computed `SerializerMethodField` on the detail serializer. The `profile_picture_url` builds an absolute URL using the request context.

**Why:** The list view (dropdowns, search) doesn't need full pet data — sending it would waste bandwidth and slow rendering. The detail view needs everything. Two serializers let each view return exactly the data its consumers need.

**Alternatives considered:**
- *Single serializer with conditional fields:* DRF supports dynamic field selection, but it makes the serializer complex and harder to document. Explicit serializers are clearer.
- *GraphQL-style field selection:* Let the client specify which fields to return. Powerful but requires GraphQL or a query parameter system, adding significant complexity.
- *`full_name` as a model property:* Currently computed in the serializer. Moving it to a model `@property` would make it available everywhere, but it's a simple concatenation that doesn't warrant model-level logic.

**Tradeoffs:** Maintaining two serializers means updates to the Owner model require checking both. If fields are added, developers must decide which serializer(s) to include them in. This cognitive overhead is acceptable given the clear use-case separation.

### Decision: Profile Picture Shares Validators with Pet Model

Owner profile pictures use the same `validate_file_size` and `validate_image_type` validators from `domain/files/validators.py`. The upload path is `profile_pictures/owners/` (vs. `profile_pictures/pets/` for pets).

**Why:** File validation rules (max size, allowed MIME types) are a cross-cutting concern. Sharing validators ensures consistency — owners and pets have the same file constraints, and changing the max file size updates both.

**Alternatives considered:**
- *Separate validators per model:* Would allow different rules per model (e.g., larger photos for owners) but adds duplication. If different rules are needed later, the shared validators can accept parameters.

### Decision: Cascade Delete from Owner to Pets to Schedules

Deleting an Owner cascades to all their Pets, which in turn cascades to all Schedules for those pets.

**Why:** An owner leaving the nursery means their pets and associated schedules are no longer relevant. Orphaned pet records with no owner would create data integrity issues — schedules referencing non-existent owners, pet lists with uncontactable owners, etc.

**Alternatives considered:**
- *Soft delete (is_active flag):* Preserves historical data and allows reactivation. Better for audit trails and reporting on past clients. However, it complicates every query (must filter `is_active=True`) and the nursery system doesn't currently require historical reporting.
- *SET_NULL on delete:* Keep pets but null out the owner reference. Creates orphaned pets that no one can claim, which is worse than deletion for a nursery context.
- *PROTECT (prevent deletion if pets exist):* Would require manually deleting/reassigning all pets first. Safer but creates a poor UX — the admin must perform multiple steps to remove a client.

**Tradeoffs:** Cascade delete is irreversible and can accidentally remove large amounts of data. A confirmation step in the UI is essential. For a production system, adding soft-delete or at least a pre-delete archive step would be advisable. The current cascade approach prioritizes simplicity for v1.

## Data Flow

### Owner List (Dropdown)
```
GET /api/owners/list/
  → OwnerViewSet with OwnerListSerializer
  → QuerySet: Owner.objects.all() (ordered by last_name, first_name)
  → Serialize minimal fields: {id, first_name, last_name, full_name, phone, email, id_number}
  → Return paginated list
```

### Owner Detail with Pets
```
GET /api/owners/{id}/
  → OwnerViewSet.retrieve()
  → QuerySet: Owner.objects.prefetch_related('pets')
  → OwnerWithPetsSerializer:
    → Owner fields
    → pets: [PetSerializer(pet) for pet in owner.pets.all()]
    → pet_count: owner.pets.count()
    → profile_picture_url: request.build_absolute_uri(owner.profile_picture.url)
  → Return full owner with nested pets
```

### Owner Deletion Cascade
```
DELETE /api/owners/{id}/
  → owner.delete()
    → CASCADE: Pet.objects.filter(owner=owner).delete()
      → CASCADE: Schedule.objects.filter(pet__owner=owner).delete()
      → CASCADE: MedicalNote.objects.filter(pet__owner=owner).delete()
      → CASCADE: Vaccination.objects.filter(pet__owner=owner).delete()
    → CASCADE: Document.objects.filter(owner=owner).delete()
  → Return 204 No Content
```

## Key Files

| File | Purpose |
|------|---------|
| `domain/owners/models.py` | Owner model with unique constraints, ordering, profile picture |
| `pets/models.py` | Re-exports Owner model |
| `pets/views.py` | OwnerViewSet with list/detail actions |
| `pets/serializers.py` | OwnerWithPetsSerializer, OwnerListSerializer |
| `domain/files/validators.py` | Shared file validation (size + type) |
