# Design: Schedules & Booking

## Technical Approach

The Schedule model manages daycare bookings for pets at the nursery. The core complexity lies in **overlap detection** — determining if a new booking conflicts with existing ones based on date ranges and time ranges. The system takes a **warning-based approach**: conflicts are detected and reported but do **not block** schedule creation. A daily booking limit is tracked against `NurserySetting.daily_booking_limit` but also not enforced as a hard constraint.

The schedule system supports batch creation (multiple schedules in one request) and provides a pre-flight conflict check endpoint for the UI to warn users before submission.

## Architecture Decisions

### Decision: Domain-Driven Design for Schedule Model

The Schedule model lives in `domain/schedules/models.py` following the same DDD structure as Pet and Owner.

**Why:** Consistency with the rest of the codebase. Schedules are a core domain concept — they represent the nursery's primary business operation (booking daycare slots). Keeping the model in the domain layer alongside Pet and Owner maintains the separation between domain logic and API concerns.

### Decision: Overlap Detection with Django Q Objects

Schedule conflicts are detected using compound Django Q objects:

```python
Q(start_date__lte=end_date) & Q(end_date__gte=start_date)  # Date overlap
&
Q(start_time__lt=end_time) & Q(end_time__gt=start_time)    # Time overlap
```

Only **active schedules** are checked for conflicts — those with `status IN ['scheduled', 'checked_in']`. Completed, cancelled, or no-show schedules are excluded.

**Why:** This is the standard interval overlap algorithm (two ranges overlap if and only if each one starts before the other ends). Using Django Q objects translates this into a single SQL query with proper indexing support — no Python-side filtering needed.

**Alternatives considered:**
- *Python-side overlap checking:* Load all schedules for the pet/date range into memory and check in a loop. Simpler to write but O(n) in the number of existing schedules and doesn't leverage database indexes.
- *Database-level constraint (EXCLUDE):* PostgreSQL supports exclusion constraints via `tsrange` or `daterange` that prevent overlapping ranges at the database level. This is the most robust approach but requires raw SQL migrations and is PostgreSQL-specific. The Django ORM doesn't support exclusion constraints natively.
- *Calendar slot model:* Pre-generate time slots (e.g., 8:00–9:00, 9:00–10:00) and book into slots. Eliminates overlap math entirely but imposes rigid scheduling and wastes storage.

**Tradeoffs:** The Q-object approach works at the application level — it's possible to create overlapping schedules via raw SQL or race conditions (two requests checking simultaneously, both finding no conflict, both inserting). For a nursery management system with low concurrent booking volume, this race condition is extremely unlikely. A database-level exclusion constraint would close this gap at the cost of portability and migration complexity.

### Decision: Conflict Warnings, Not Blockers

Schedules are **always created** even when conflicts exist. Conflicts are returned in the API response as warnings. The system **does not reject** conflicting bookings.

**Why:** The nursery staff may intentionally double-book — for example, a pet that stays all day might overlap with afternoon-only pets, and the staff knows the physical space can accommodate both. Blocking creation would force staff to cancel existing bookings to make new ones, then re-create the cancelled ones. Warning-based conflict detection respects staff expertise while surfacing potential issues.

**Alternatives considered:**
- *Hard enforcement (reject on conflict):* Simplest to implement and guarantees no overlaps. However, it assumes the software perfectly models physical capacity constraints, which it doesn't — the system doesn't know room sizes, staff availability, or pet groupings.
- *Configurable enforcement (setting to choose block vs. warn):* Offers flexibility but doubles the code paths and testing surface. Can be added later if needed.
- *Approval workflow:* Conflicting bookings go into a "pending approval" state. Adds process overhead for a small nursery team that likely just wants to see and manage conflicts visually on a calendar.

**Tradeoffs:** Warning-only means the system can end up with many overlapping schedules if staff ignores warnings. The calendar UI becomes the de facto conflict management tool — it must clearly visualize overlaps. The backend cannot guarantee a consistent, conflict-free schedule.

### Decision: Pre-flight Conflict Check Endpoint

A dedicated endpoint allows the UI to check for conflicts **before** submitting a schedule creation request. This returns the same conflict data without creating any records.

**Why:** The UI can show conflict warnings in real-time (e.g., as the user selects dates/times) without committing data. This supports a "check → warn → confirm → create" flow that gives staff maximum visibility before committing.

**Alternatives considered:**
- *Client-side conflict checking:* Download all schedules and check in the browser. Works for small datasets but becomes slow and stale — new bookings by other users wouldn't be reflected.
- *No pre-flight, rely on create response:* Simpler but the user only sees conflicts after submitting, requiring a "go back and edit" flow if they want to adjust.

### Decision: Conflicts Computed on Every Read via SerializerMethodField

The `has_conflicts` and `conflict_details` fields are computed via `SerializerMethodField` on the `ScheduleSerializer`. Every time a schedule is serialized (including list views), the system queries for overlapping schedules.

**Why:** Conflicts are dynamic — a schedule that was conflict-free at creation time may conflict with a subsequently created schedule. Computing on every read ensures accuracy.

**Alternatives considered:**
- *Cached conflict flag on the model:* Store a `has_conflicts` boolean on the Schedule model, updated on create/update/delete of any schedule. Avoids per-read queries but requires maintaining cache consistency — every schedule change must re-evaluate conflicts for all affected schedules. Complex and error-prone.
- *Background job for conflict calculation:* Periodically recompute conflicts. Reduces real-time query load but introduces staleness — a just-created conflicting schedule wouldn't show as conflicting until the next run.

**Tradeoffs:** **This is a performance concern for list views.** If the list returns 50 schedules, and each conflict check queries the database, that's 50 additional queries (N+1 problem). Mitigations:
- Prefetch and annotate conflicts in the queryset (complex but possible)
- Paginate aggressively (limit page size)
- Add database indexes on (pet_id, start_date, end_date, status)

For the expected scale (a single nursery with dozens of daily bookings), the per-read approach is acceptable. At scale, this would be the first optimization target.

### Decision: Batch Create Uses Loop, Not bulk_create

Batch schedule creation iterates over the input list, creating each schedule individually rather than using Django's `bulk_create`.

**Why:** Each schedule needs individual conflict checking — `bulk_create` would skip this since it bypasses the model's save() method and serializer validation. Additionally, the API returns per-schedule conflict warnings, which requires evaluating each schedule against both existing schedules and other schedules in the same batch.

**Alternatives considered:**
- *`bulk_create` with post-creation conflict check:* Create all schedules at once, then check conflicts as a second pass. Faster creation but conflicts are only known after commit, and rolling back individual schedules from a bulk create is messy.
- *Async batch processing:* Queue batch creation as a background task. The API returns immediately with a job ID, and the client polls for results. Overkill for batches of < 100 schedules.

**Tradeoffs:** Loop-based creation is O(n) in database round-trips where n is the batch size. For typical batches (a week of bookings = 5–7 schedules), this is under 100ms total. For bulk imports of historical data, a separate management command with `bulk_create` would be more appropriate.

### Decision: Daily Count vs. daily_booking_limit (Report Only)

The system counts how many schedules exist on a given day and compares against `NurserySetting.daily_booking_limit`. When the limit is 0, it means "unlimited." The count is **reported but not enforced** — bookings beyond the limit are allowed.

**Why:** Consistent with the warning-based philosophy. The daily limit is a guideline, not a hard constraint. Staff may know that Tuesday's limit of 20 is conservative and can handle 22 for a specific day.

**Tradeoffs:** Same as the conflict warning decision — the limit is advisory, and the UI must clearly communicate when it's exceeded.

### Decision: Separate Time and Date Validation

`ScheduleCreateSerializer` validates time and date fields independently from conflict logic:
- `start_date` must be ≤ `end_date`
- `start_time` must be < `end_time`
- Dates must not be in the past (for new schedules)

These are hard validations that reject the request (unlike conflict warnings).

**Why:** These are logical impossibilities (a schedule can't end before it starts) vs. conflicts which are business-context warnings. Separating them makes the error hierarchy clear: structural errors block creation, business warnings don't.

## Data Flow

### Schedule Creation with Conflict Detection
```
POST /api/schedules/ {pet, start_date, end_date, start_time, end_time, notes}
  → ScheduleCreateSerializer.validate()
    → Validate dates: start_date ≤ end_date
    → Validate times: start_time < end_time
    → Validate dates not in past
  → ScheduleCreateSerializer.create()
    → Schedule.objects.create(**validated_data)
    → Query for overlapping active schedules:
        Schedule.objects.filter(
          pet=pet,
          status__in=['scheduled', 'checked_in'],
          start_date__lte=end_date,
          end_date__gte=start_date,
          start_time__lt=end_time,
          end_time__gt=start_time
        ).exclude(pk=new_schedule.pk)
    → Return schedule + conflicts as warnings
```

### Pre-flight Conflict Check
```
POST /api/schedules/check-conflicts/ {pet, start_date, end_date, start_time, end_time}
  → Validate inputs
  → Run same overlap query as creation (without creating)
  → Check daily count vs. daily_booking_limit
  → Return {conflicts: [...], daily_count: N, daily_limit: M}
```

### Batch Schedule Creation
```
POST /api/schedules/batch/ [{schedule_1}, {schedule_2}, ...]
  → For each schedule in list:
    → Validate fields
    → Create schedule
    → Check conflicts (against existing + previously created in batch)
    → Collect results
  → Return [{schedule_1, conflicts: [...]}, {schedule_2, conflicts: []}, ...]
```

## Key Files

| File | Purpose |
|------|---------|
| `domain/schedules/models.py` | Schedule model with status choices, date/time fields |
| `pets/views.py` | ScheduleViewSet with create, batch create, conflict check |
| `pets/serializers.py` | ScheduleSerializer (read), ScheduleCreateSerializer (write), conflict fields |
| `nursery_settings/models.py` | NurserySetting.daily_booking_limit (referenced during conflict check) |
