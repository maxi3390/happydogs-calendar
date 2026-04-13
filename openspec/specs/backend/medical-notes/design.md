# Design: Medical Notes

## Technical Approach

Medical notes are free-form text records attached to pets, used by nursery staff to track health observations, behavioral notes, dietary requirements, and other pet-specific information. The system uses an **abstract base Note model** for extensibility, with `MedicalNote` as the concrete implementation. Notes are exposed through a simple CRUD ViewSet with filtering by pet, and a count is surfaced as a computed field on the PetSerializer.

## Architecture Decisions

### Decision: Abstract Base Note Model

An abstract `Note` model defines shared fields (`title`, `description`, `created_at`, `updated_at`) and `MedicalNote` extends it with a ForeignKey to Pet.

**Why:** The abstract base class anticipates future note types (e.g., behavioral notes, staff notes, administrative notes) that would share the same structure but link to different entities. By extracting common fields into an abstract model, new note types can be added with minimal code — just a new concrete model with the appropriate FK.

**Alternatives considered:**
- *No abstraction (just MedicalNote):* Simplest approach. If no other note types are ever needed, the abstract class is unnecessary indirection. However, the cost of an abstract base class is near zero — no extra database table, no runtime overhead.
- *Single Note model with type discriminator:* One `Note` model with a `type` field ('medical', 'behavioral', etc.) and generic FK or multiple nullable FKs. This is the polymorphic pattern seen in Document — but notes are simpler (no file handling) and entity-type-specific behavior is less likely, making separate models cleaner.
- *JSONField for flexible note content:* Store note content as structured JSON to allow different note types to have different fields. Too much flexibility — medical notes just need title and description. JSON fields also complicate querying and validation.

**Tradeoffs:** The abstract class adds a layer of indirection that may never be used. If no other note types are added, it's a small cost (one extra class in the file) with no runtime impact. If note types do proliferate, the abstraction pays for itself immediately.

### Decision: MedicalNote Extends Note with Pet FK

`MedicalNote` has a required ForeignKey to Pet with `on_delete=CASCADE`. The related name allows `pet.medical_notes.all()` queries.

**Why:** A medical note is meaningless without a pet — it's an observation about a specific animal. The required FK enforces this relationship, and cascade deletion ensures no orphaned notes when a pet is removed.

**Alternatives considered:**
- *Optional pet FK (allow general notes):* Would enable nursery-wide notes not tied to any pet. However, that's a different use case (more like a bulletin board) and should be a separate model if needed.
- *SET_NULL on delete:* Preserves notes when a pet is deleted. Useful for audit/history, but orphaned notes without pet context are of limited value. A soft-delete on Pet would be a better approach for preserving history.

### Decision: Simple CRUD ViewSet with pet_id Filtering

MedicalNotes are exposed through a standard DRF `ModelViewSet` with filtering by `pet_id` query parameter. No nesting under the pet URL — it's a top-level resource with filtering.

**Why:** Unlike vaccinations (which are managed as nested data within pet updates), medical notes have independent lifecycles. Staff add notes over time as observations occur — they don't replace all notes on every edit. A standalone ViewSet with CRUD operations matches this usage pattern.

**Alternatives considered:**
- *Nested under pet URL (`/api/pets/{id}/medical-notes/`):* RESTfully correct — notes are sub-resources of pets. However, DRF nested routers add configuration complexity, and a flat URL with filtering (`/api/medical-notes/?pet=5`) is simpler to implement and equally functional.
- *Nested in PetSerializer (like vaccinations):* Would require sending all medical notes in every pet update. Medical notes accumulate over time (potentially dozens), and replacing all on every pet edit would be error-prone and wasteful. Notes are added individually, not managed as a set.

**Tradeoffs:** The flat URL structure (`/api/medical-notes/`) doesn't express the pet-note relationship in the URL hierarchy. This is a minor RESTful purity concern — the filtering parameter achieves the same result. If the API grows more complex, nested routes might be reconsidered for clarity.

### Decision: medical_notes_count as Computed Field on PetSerializer

The `PetSerializer` includes a `medical_notes_count` field computed via `SerializerMethodField`, returning the count of related medical notes for each pet.

**Why:** The pet list/detail views need to show whether a pet has medical notes and how many. Computing this server-side avoids an extra API call per pet. The count can be optimized with `annotate(Count('medical_notes'))` on the queryset.

**Alternatives considered:**
- *Denormalized count field on Pet model:* Store the count directly on the Pet model, updated via signals or overridden save. Eliminates the count query but introduces consistency risks — if a note is deleted directly (e.g., from admin), the count becomes stale. Signals add hidden complexity.
- *Include full notes in PetSerializer:* Return all medical notes inline with every pet. Too heavy for list views — notes can be long text blocks, and a list of 50 pets with 10 notes each creates a massive response.
- *No count, let the frontend query separately:* Would require an extra API call per pet to get the note count. Wasteful for list views.

**Tradeoffs:** The `SerializerMethodField` approach results in a per-pet query unless the queryset is annotated. With annotation (`Pet.objects.annotate(medical_notes_count=Count('medical_notes'))`), it's a single query. The serializer method should check for the annotation first and fall back to a query — this dual-path logic is a minor complexity cost.

### Decision: Cascade Delete When Pet Is Deleted

Medical notes are deleted when their associated pet is deleted (`on_delete=CASCADE`).

**Why:** Consistent with the system's cascade philosophy (owner → pets → notes/schedules/vaccinations). Medical notes for a deleted pet have no value — they reference an animal no longer in the system.

**Tradeoffs:** Same as with all cascade deletes — irreversible data loss. For a veterinary context, historical medical records might have legal retention requirements. A production system should consider either soft-delete or archival before cascade deletion. For v1, cascade deletion prioritizes simplicity.

## Data Flow

### Creating a Medical Note
```
POST /api/medical-notes/ {pet: 5, title: "Limping observation", description: "Right front leg..."}
  → MedicalNoteSerializer.validate()
    → Validate pet exists
    → Validate title and description are provided
  → MedicalNoteSerializer.create()
    → MedicalNote.objects.create(pet_id=5, title=..., description=...)
  → Return {id, pet, title, description, created_at, updated_at}
```

### Listing Notes for a Pet
```
GET /api/medical-notes/?pet=5
  → MedicalNoteViewSet.list()
  → QuerySet: MedicalNote.objects.filter(pet_id=5).order_by('-created_at')
  → Return paginated list of notes, newest first
```

### Pet with Notes Count
```
GET /api/pets/
  → PetViewSet.list()
  → QuerySet: Pet.objects.annotate(medical_notes_count=Count('medical_notes'))
  → PetSerializer includes medical_notes_count field
  → Return [{id, name, ..., medical_notes_count: 3}, ...]
```

## Key Files

| File | Purpose |
|------|---------|
| `domain/notes/models.py` | Abstract Note model, MedicalNote concrete model |
| `pets/views.py` | MedicalNoteViewSet with pet_id filtering |
| `pets/serializers.py` | MedicalNoteSerializer, medical_notes_count on PetSerializer |
