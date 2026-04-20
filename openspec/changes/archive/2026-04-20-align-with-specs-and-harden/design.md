# Design: Align with Specs and Harden

## Technical Approach

### 1. Compatibility returns multiple reasons

`Pet.is_compatible_with(other)` currently short-circuits on the first failing rule and returns `(False, "single reason")`. The spec requires that when multiple rules are triggered for the same pair (e.g., a pet is aggressive **and** has a large size+dominance gap), the response cites all applicable rules.

**Refactor:**

```python
def is_compatible_with(self, other_pet):
    reasons = []
    # Rule 1: aggressive
    if self.temperament == 'aggressive' or other_pet.temperament == 'aggressive':
        reasons.append("Aggressive pets cannot be scheduled together with other pets")
    # Rule 2: both dominance > 7
    if self.dominance_level > 7 and other_pet.dominance_level > 7:
        reasons.append("Two highly dominant pets cannot be scheduled together")
    # ... rules 3, 4, 5 all appended (not early-returned) ...
    is_compatible = not reasons
    return is_compatible, reasons
```

The return type changes from `(bool, str)` to `(bool, list[str])`. Callers (compatibility endpoint, schedule conflict check) must be updated.

**API response format:**
- Compatibility endpoint: each entry gets a `reasons` field (list) in addition to `reason` (first reason, kept for backward compat).
- Conflict check: each conflict gets `reasons` (list) and `reason` (first, for backward compat).

### 2. Daily count field rename

`GET /api/schedules/daily_count/` currently returns `{count, limit, limit_reached, limit_exceeded}`. The spec says the field is `daily_booking_limit`. Frontend reads `.limit` today, so we rename in both places atomically.

### 3. Reject zero-duration schedules

`ScheduleCreateSerializer.validate()` uses `if start_time >= end_time` which already rejects equal times — but `BatchScheduleCreateSerializer.validate()` has the same check. Audit: both already reject via `>=`. **Action: verify and ensure tests cover the equal case.**

### 4. Admin-only settings writes

The existing settings endpoints (`get_nursery_settings`, `update_nursery_settings`, `upload_logo`, `delete_logo`) are function-based views decorated with `@api_view`. We add `@permission_classes([IsAdmin])` to the three write endpoints. `get_nursery_settings` stays public (AllowAny) because the login page needs to fetch the logo **before** authentication.

This is a deliberate exception to the spec's "MUST require authentication" rule. We update `openspec/specs/backend/settings/spec.md` to note that GET is intentionally public.

### 5. Frontend runtime bug fixes

**Login page & Navigation:**
```tsx
const [logoUrl, setLogoUrl] = useState<string | null>(null);

useEffect(() => {
  api.nurserySettings.get()
    .then(s => setLogoUrl(s.logo_url))
    .catch(() => {}); // silently ignore - fallback to default icon
}, []);
```

**PetForm & OwnerForm:**
```tsx
const [pendingProfilePicture, setPendingProfilePicture] = useState<File | null>(null);
```

## Architecture Decisions

### Decision: Return list of reasons (not single string)

**Why:** Required by the spec. Single-reason response hides compounding safety concerns from the user.

**Tradeoffs:** Breaking change to the `is_compatible_with()` return type. We add a `reason` convenience field (first reason) for backward compatibility so existing frontend code keeps working.

### Decision: Keep `GET /api/settings/` public (AllowAny)

**Why:** The login page displays the custom logo before any user is authenticated. Requiring auth on this endpoint would force a chicken-and-egg fallback flow.

**Tradeoffs:** This exposes `daily_booking_limit` publicly. Acceptable because that value is not sensitive (just a capacity number). If this becomes a concern, add a separate lightweight `GET /api/settings/public/` that returns only the logo URL.

### Decision: Add `reasons` list, keep `reason` scalar

**Why:** Avoid breaking existing API consumers. Frontend can migrate to `reasons` at its own pace.

**Tradeoffs:** Slightly redundant response. Worth it for zero-breakage migration.

### Decision: No pagination in this change

**Why:** Adding pagination is an architectural change requiring frontend updates (pagination UI, loading-more logic) and new tests. Scope creep for a spec-alignment pass. Tracked as follow-up.

## Data Flow — Compatibility Check

```
Before:
  GET /api/pets/42/compatibility/
    Pet.is_compatible_with(other) returns (False, "Aggressive pets...")
    Response: [{pet_id, pet_name, is_compatible: false, reason: "Aggressive pets..."}]

After:
  GET /api/pets/42/compatibility/
    Pet.is_compatible_with(other) returns (False, ["Aggressive pets...", "Large size..."])
    Response: [{pet_id, pet_name, is_compatible: false,
                reason: "Aggressive pets...",  # first, for backward compat
                reasons: ["Aggressive pets...", "Large size..."]}]
```

## Key Files

| File | Change |
|------|--------|
| `backend/domain/pets/models.py` | Refactor `is_compatible_with()` return type |
| `backend/pets/views.py` | Update compatibility endpoint + conflict check to use `reasons` list; rename `limit` → `daily_booking_limit` in `daily_count` |
| `backend/nursery_settings/views.py` | Add `@permission_classes([IsAdmin])` to update, upload_logo, delete_logo |
| `backend/pets/tests/test_pet_api.py` | Add tests: multiple-rule compatibility, cascade-delete, profile picture delete no-op |
| `backend/pets/tests/test_schedule_api.py` | Add test: equal start/end rejected |
| `backend/pets/tests/test_owner_api.py` | Add test: cascade delete owner → pets |
| `backend/pets/tests/test_document_api.py` | **NEW** full document API tests |
| `backend/pets/tests/test_medical_note_api.py` | Add tests: missing title/pet rejected; count updates after add/delete |
| `backend/pets/tests/test_translations_api.py` | Add tests: unauthenticated access works |
| `backend/accounts/tests/test_auth_api.py` | Add tests: blacklisted refresh token rejected; email change ignored on profile update |
| `backend/nursery_settings/tests.py` | Update tests: non-admin rejected on writes; admin succeeds |
| `frontend/src/app/login/page.tsx` | Add `logoUrl` state + fetch |
| `frontend/src/components/Navigation.tsx` | Add `logoUrl` state + fetch |
| `frontend/src/components/PetForm.tsx` | Add `pendingProfilePicture` state |
| `frontend/src/components/OwnerForm.tsx` | Add `pendingProfilePicture` state |
| `frontend/src/domain/schedules/types.ts` | Rename `limit` → `daily_booking_limit` in `DailyCountResult` |
| `frontend/src/components/ScheduleForm.tsx` | Read `daily_booking_limit` instead of `limit` |
| `openspec/specs/backend/pets/spec.md` | Document `reasons` list in compatibility response |
| `openspec/specs/backend/schedules/spec.md` | Update daily_count response field name; note `reasons` in conflicts |
| `openspec/specs/backend/settings/spec.md` | Note that GET is intentionally public; writes now require IsAdmin |
| `openspec/changes/archive/` | Move `add-system-logo` and `avatar-on-create` here |
