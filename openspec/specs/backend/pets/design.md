# Design: Pets Management

## Technical Approach

The Pet model is the central domain entity in the nursery system. It follows a **Domain-Driven Design** structure where the model lives in `domain/pets/models.py` with an explicit `app_label='pets'` to ensure Django's migration system associates it with the `pets` app. The model includes a **5-rule compatibility system** implemented as an instance method, keeping business logic close to the domain entity rather than in service layers or serializers.

Pet CRUD operations are exposed via a DRF ViewSet with nested vaccination handling, profile picture management, and computed fields for owner details and medical notes counts.

## Architecture Decisions

### Decision: Domain-Driven Design File Structure

The Pet model lives in `domain/pets/models.py`, not `pets/models.py`. It is re-exported through `pets/models.py` for clean imports. The model declares `class Meta: app_label = 'pets'` so Django's migration framework assigns it to the `pets` app.

**Why:** Separating domain models from app-level concerns (views, serializers, URLs) creates a clean boundary between "what the business cares about" (domain) and "how the API works" (app). This mirrors DDD's separation of domain layer from application layer.

**Alternatives considered:**
- *Standard Django app layout (models.py in app directory):* Simpler and more conventional. Works fine for small projects, but as models grow complex (compatibility logic, validators, nested relationships), the app directory becomes cluttered.
- *Separate `core` app for all models:* Some projects put all models in a single `core` app. This avoids circular imports but creates a monolithic model file and defeats the purpose of Django's app modularity.
- *Full DDD with repositories and services:* Would add repository classes and service layers. Overkill for this project's complexity level — Django's ORM already acts as a repository.

**Tradeoffs:** The `domain/` directory is unconventional for Django developers. New contributors need to understand the re-export pattern. The `app_label` override is a minor Django anti-pattern that can confuse tooling. However, the clean separation of business logic from API concerns justifies the overhead.

### Decision: Compatibility Logic as Instance Method on Pet Model

The `is_compatible_with(other_pet)` method lives directly on the Pet model. It evaluates 5 rules in order and returns on the first failure (short-circuit evaluation).

**5 Compatibility Rules (ordered):**
1. A pet is always compatible with itself
2. Pets of different species are incompatible
3. Size difference > 1 level (on a 1-3 scale) makes pets incompatible
4. Either pet having dominance ≥ 8 makes them incompatible
5. Both pets having dominance ≥ 5 makes them incompatible

**Size ordering map:** `{'small': 1, 'medium': 2, 'large': 3}` for numeric comparison.

**Why:** This is core business logic that belongs on the domain entity. Placing it as an instance method means any code with a Pet instance can check compatibility without importing external services. The ordered evaluation with short-circuiting is efficient and makes the rule priority explicit.

**Alternatives considered:**
- *Compatibility service class:* Would decouple compatibility logic from the model, making it independently testable and replaceable. However, compatibility is intrinsic to the Pet domain concept — a Pet "knows" if it's compatible with another Pet.
- *Database-driven compatibility rules:* Store rules as data (e.g., a rules table). Adds flexibility to change rules without code deployment, but the rules are complex (multi-field, conditional) and hard to express as data. Also adds query overhead.
- *Compatibility as a serializer method:* Would couple business logic to the API layer. Unusable from management commands, background tasks, or other non-API contexts.

**Tradeoffs:** The method is tightly coupled to the model's fields — adding a new compatibility dimension requires modifying the method. The ordered evaluation means rule priority is implicit in code order, not configurable. This is acceptable because compatibility rules change rarely and are fundamental to the domain.

### Decision: Dominance Validated with Django Validators

The `dominance` field uses `MinValueValidator(1)` and `MaxValueValidator(10)` to constrain values to 1–10.

**Why:** Django validators run during form/serializer validation and `full_clean()`, catching invalid data before it reaches the database. Combined with the compatibility rules (which use dominance thresholds at 5 and 8), this ensures the math always works.

**Alternatives considered:**
- *Database-level CHECK constraint:* Would enforce the constraint even for raw SQL inserts, but Django's migration support for CHECK constraints is limited and database-specific.
- *Serializer-only validation:* Would miss validation from admin, management commands, or direct model saves.

### Decision: Profile Picture Validation with Shared Validators

Profile pictures are validated by two separate validators (file size and image type) defined in `domain/files/validators.py`. Upload path is `profile_pictures/pets/`.

**Why:** Splitting validation into file-size and file-type validators follows the single responsibility principle and allows reuse across Pet, Owner, and Document models. The shared `domain/files/` location reflects that file validation is a cross-cutting concern, not specific to any one domain model.

**Alternatives considered:**
- *Single combined validator:* Fewer validator instances but harder to reuse — e.g., documents accept PDFs but pets only accept images.
- *Validation in serializer only:* Would not protect against invalid uploads through admin or management commands.

### Decision: Nested Vaccination Serialization with Replace-All Strategy

When updating a Pet, vaccinations are provided as a nested array in the request body. On update, **all existing vaccinations are deleted and the provided list is created fresh**, wrapped in `@transaction.atomic`.

**Why:** The replace-all strategy dramatically simplifies the update logic. The frontend sends the complete vaccination list every time — no need to track which vaccinations were added, modified, or removed. The atomic transaction ensures data consistency — if any vaccination fails to create, the entire update rolls back.

**Alternatives considered:**
- *Incremental update (PATCH semantics):* Track individual vaccination changes (add/update/delete) by ID. More efficient for large lists but significantly more complex — requires diffing, handling orphans, and managing partial failures. For a pet's vaccination list (typically < 20 records), the performance difference is negligible.
- *Separate vaccination endpoints:* Manage vaccinations independently via `/api/pets/{id}/vaccinations/`. Cleaner REST semantics but requires multiple API calls to update a pet with vaccinations, complicating the frontend.
- *Soft delete + upsert:* Mark deleted vaccinations instead of removing them. Adds audit trail but complicates queries and the vaccination list would accumulate historical data.

**Tradeoffs:** The replace-all approach loses vaccination record IDs on every update — if other parts of the system reference vaccination IDs, those references break. Currently no other model references vaccinations directly, so this is safe. The atomic transaction adds a slight overhead but guarantees consistency.

### Decision: Computed Fields on PetSerializer

`PetSerializer` includes three computed fields:
- **`owner_details`** — nested owner serializer (read-only)
- **`medical_notes_count`** — count of related medical notes via `SerializerMethodField`
- **`profile_picture_url`** — absolute URL built from request context

**Why:** These fields avoid N+1 queries when the queryset uses `select_related('owner')` and `annotate(Count('medical_notes'))`. The frontend needs this data for the pet list/detail views, and computing it server-side avoids extra API calls.

**Tradeoffs:** The serializer is heavier than a minimal representation. For list views with many pets, the owner details nesting adds payload size. A lighter `PetListSerializer` could be introduced later if performance becomes an issue.

## Data Flow

### Pet Creation with Vaccinations
```
POST /api/pets/ {name, species, size, dominance, owner, vaccinations: [...]}
  → PetSerializer.validate()
    → Validate pet fields
    → Extract vaccinations from validated_data
  → PetSerializer.create()
    → @transaction.atomic
      → Pet.objects.create(**pet_data)
      → For each vaccination:
          → Vaccination.objects.create(pet=pet, **vax_data)
    → Return pet with nested vaccinations
```

### Pet Update with Vaccination Replace
```
PUT /api/pets/{id}/ {name, ..., vaccinations: [...]}
  → PetSerializer.update()
    → @transaction.atomic
      → pet.vaccinations.all().delete()  ← Delete ALL existing
      → For each vaccination in new list:
          → Vaccination.objects.create(pet=pet, **vax_data)
      → Update pet fields
    → Return updated pet
```

### Compatibility Check
```
GET /api/pets/{id}/compatibility/{other_id}/
  → Retrieve both Pet instances
  → pet.is_compatible_with(other_pet)
    → Rule 1: same pet? → compatible
    → Rule 2: different species? → incompatible
    → Rule 3: size gap > 1? → incompatible
    → Rule 4: either dominance ≥ 8? → incompatible
    → Rule 5: both dominance ≥ 5? → incompatible
    → All rules pass → compatible
  → Return {compatible: bool, reason: str}
```

## Key Files

| File | Purpose |
|------|---------|
| `domain/pets/models.py` | Pet model definition, compatibility logic, field validators |
| `pets/models.py` | Re-exports Pet model for standard Django imports |
| `pets/views.py` | PetViewSet with CRUD, compatibility endpoint |
| `pets/serializers.py` | PetSerializer with nested vaccinations, computed fields |
| `domain/files/validators.py` | Shared file size and image type validators |
