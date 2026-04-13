# Design: Documents

## Technical Approach

The Document model supports file uploads associated with either a **pet** or an **owner** (but not both). This polymorphic association is implemented via two **nullable foreign keys** with a model-level `clean()` method enforcing mutual exclusivity. Files are stored in timestamped directories and validated using shared validators from `domain/files/validators.py`, with an extended set of allowed MIME types that includes PDFs and Office documents alongside images.

## Architecture Decisions

### Decision: Polymorphic Linking via Nullable FKs

The Document model has two nullable ForeignKey fields: `pet` and `owner`. Exactly one must be set; the other must be null. This is enforced by the `clean()` method and serializer-level validation.

**Why:** Documents naturally belong to either a pet (vaccination certificates, health records) or an owner (ID copies, contracts). Rather than creating two separate document models (`PetDocument`, `OwnerDocument`) with identical fields, a single model with polymorphic linking avoids code duplication.

**Alternatives considered:**
- *Abstract base model + concrete per-type:* Create `BaseDocument` (abstract) with `PetDocument(BaseDocument)` and `OwnerDocument(BaseDocument)`. No nullable FKs needed — each model has a required FK to its parent. Clean from a data integrity perspective, but doubles the models, serializers, views, and URLs. Admin configuration is also duplicated.
- *Generic relations (ContentType framework):* Django's `GenericForeignKey` with `content_type` and `object_id` fields. More extensible — adding document support for a new model requires no schema change. However, generic relations can't use `select_related`, making query optimization harder. They also bypass database-level FK constraints entirely.
- *Single FK with type discriminator:* One FK field + a `parent_type` enum ('pet' or 'owner'). The FK would reference different tables based on `parent_type`. This doesn't work with Django's ORM — a FK must reference a specific model.
- *JSON field for parent reference:* Store `{type: 'pet', id: 5}` as JSON. Maximally flexible but zero database-level integrity, no joins, no cascading.

**Tradeoffs:**
- **Two nullable FKs means the database can't enforce the "exactly one" constraint.** The model `clean()` and serializer `validate()` enforce it at the application level. A raw SQL insert could violate this — e.g., both fields set, or both null. A database CHECK constraint could close this gap: `CHECK ((pet_id IS NOT NULL AND owner_id IS NULL) OR (pet_id IS NULL AND owner_id IS NOT NULL))`.
- **Querying "all documents for entity X" requires knowing which FK to filter on.** Not a problem in practice since the caller always knows whether they're looking at a pet or owner.
- **Adding a third entity type** (e.g., documents for staff) requires adding another nullable FK and updating the mutual exclusivity logic. At 3+ entity types, generic relations become more attractive.

### Decision: clean() Method for Mutual Exclusivity

The model's `clean()` method checks that exactly one of `pet` or `owner` is set. The `DocumentSerializer.validate()` method performs the same check.

**Why:** Defense in depth — the model `clean()` catches violations from Django admin, management commands, and any code that calls `full_clean()`. The serializer `validate()` catches violations from API requests with clear error messages. Both layers are needed because `clean()` is not called by `save()` by default (only by forms and `full_clean()`).

**Alternatives considered:**
- *Only serializer validation:* Misses non-API paths (admin, shell, commands).
- *Override save() with validation:* Would catch all save paths, but `save()` is performance-sensitive and shouldn't raise `ValidationError` — it should raise `IntegrityError` for database issues. Mixing validation concerns in `save()` is an anti-pattern.
- *Database CHECK constraint only:* Would catch everything at the lowest level, but error messages from database constraint violations are cryptic and hard to localize.

### Decision: Timestamped Upload Directory

Files are stored in `documents/%Y/%m/` (year/month directories based on upload date).

**Why:** Spreading files across date-based directories prevents any single directory from accumulating thousands of files, which degrades filesystem performance on many storage backends. The year/month pattern provides natural organization and makes manual browsing (for debugging or backup) easier.

**Alternatives considered:**
- *Flat directory (`documents/`):* Simple but a single directory with thousands of files causes slow `ls` and filesystem metadata operations.
- *Hash-based directories (`documents/a1/b2/`):* Used by systems like Git. Better distribution than date-based but impossible for humans to navigate.
- *Per-entity directories (`documents/pets/5/`, `documents/owners/3/`):* Intuitive organization matching the data model. However, Django's `upload_to` would need a callable that accesses the instance, and the instance may not have a PK yet during creation.

### Decision: original_filename Captured from Upload

The `original_filename` field stores the name of the file as uploaded by the user, separate from the storage path (which may be renamed by Django to avoid collisions).

**Why:** Users expect to see meaningful filenames — "vaccination_cert_max.pdf" not "documents/2024/03/vaccination_cert_max_a3f8b2c.pdf". The original filename is needed for display in the UI and for downloaded file naming.

**Alternatives considered:**
- *Rely on storage filename:* Would show Django's collision-suffixed names, which are ugly and confusing.
- *Parse filename from storage path:* Fragile — storage backends may transform paths differently.

### Decision: Extended Validator Set for Documents

Documents use the same `validate_file_size` from shared validators but add `validate_document_type` which allows a wider set of MIME types: images (JPEG, PNG, GIF, WebP) plus **PDF, DOC, and DOCX**.

**Why:** Documents in a nursery context include vaccination certificates (often PDF), owner contracts (DOC/DOCX), insurance paperwork, and photos. The document upload must accept all common business file types, unlike profile pictures which are image-only.

**Alternatives considered:**
- *Single "accept anything" validator:* No MIME type checking. Simpler but allows executable files, scripts, or other potentially dangerous uploads.
- *Strict image-only (same as profile pictures):* Too restrictive for documents. Would force users to convert PDFs to images.
- *Configurable allowed types via settings:* Maximum flexibility but adds configuration complexity. The allowed types for a nursery are well-known and unlikely to change.

**Tradeoffs:** MIME type validation can be spoofed (renaming a .exe to .pdf). For production, additional validation (magic bytes checking, virus scanning) would be advisable. The current validation is a reasonable first layer of defense.

### Decision: MAX_UPLOAD_SIZE Configurable via Django Settings

The maximum upload file size defaults to **5MB** and is configurable through `settings.MAX_UPLOAD_SIZE`.

**Why:** File size limits depend on deployment infrastructure (memory, storage, bandwidth). Making it configurable allows adjustment without code changes — development might allow 10MB while production limits to 5MB.

**Alternatives considered:**
- *Hardcoded limit:* Simpler but inflexible. Different environments (local dev, staging, prod) may need different limits.
- *Per-model limits:* Profile pictures might be 2MB while documents are 10MB. Currently they share the same limit, which is a simplification. Per-model limits could be added by parameterizing the validator.

## Data Flow

### Document Upload (Pet)
```
POST /api/documents/ {file: <binary>, pet: 5, owner: null, description: "Vaccination cert"}
  → DocumentSerializer.validate()
    → Check pet is set, owner is null (mutual exclusivity)
    → validate_file_size(file) → Check against MAX_UPLOAD_SIZE
    → validate_document_type(file) → Check MIME type in allowed set
  → DocumentSerializer.create()
    → Capture original_filename from file.name
    → Django storage saves to documents/2024/03/<filename>
    → Document.objects.create(pet_id=5, file=<path>, original_filename=<name>)
  → Return document metadata
```

### Document Upload (Owner)
```
POST /api/documents/ {file: <binary>, pet: null, owner: 3, description: "ID copy"}
  → Same flow as above, with owner FK instead of pet FK
```

### Document Listing by Entity
```
GET /api/documents/?pet=5
  → DocumentViewSet.list()
  → QuerySet: Document.objects.filter(pet_id=5)
  → Return [{id, file_url, original_filename, description, created_at}, ...]

GET /api/documents/?owner=3
  → DocumentViewSet.list()
  → QuerySet: Document.objects.filter(owner_id=3)
  → Return [{id, file_url, original_filename, description, created_at}, ...]
```

## Key Files

| File | Purpose |
|------|---------|
| `domain/documents/models.py` | Document model with nullable pet/owner FKs, clean() validation, upload_to |
| `domain/files/validators.py` | validate_file_size, validate_image_type (profile pics), validate_document_type (documents) |
| `pets/serializers.py` | DocumentSerializer with mutual exclusivity validation |
| `pets/views.py` | DocumentViewSet with filtering by pet/owner |
| `config/settings.py` | MAX_UPLOAD_SIZE configuration |
