# Design: admin activity feed

## Decisions

### Per-model query, Python-level merge

Django's ORM doesn't union heterogeneous models cleanly: each `Historical*` table has a different schema (different snapshot fields per entity), so a single SQL union with `UNION ALL` requires casting columns to a common shape — fragile and SQL-dialect-specific.

Instead, we run one filtered query per tracked entity (4 queries total), pull a bounded set of rows from each, and merge in Python:

```python
def list(self, request):
    rows = []
    for kind, cfg in TRACKED.items():
        if entity_type and entity_type != kind:
            continue
        qs = cfg['manager']()
        if user_id: qs = qs.filter(history_user_id=user_id)
        if action:  qs = qs.filter(history_type=action)
        if since:   qs = qs.filter(history_date__gte=since)
        if until:   qs = qs.filter(history_date__lte=until)
        # Pull (offset + limit) rows from each model so the merge can
        # truncate to the requested page after sorting.
        rows.extend(_serialise(kind, h) for h in qs.order_by('-history_date')[: offset + limit])
    rows.sort(key=lambda r: r['history_date'], reverse=True)
    page = rows[offset : offset + limit]
    total = sum(_count(kind) for kind in TRACKED)  # one cheap COUNT per model
    return Response({'count': total, 'results': page})
```

Performance characteristics:
- 4 queries per request, each with a tiny LIMIT.
- Worst-case for a request asking the 200th page: each query pulls 50 × 200 + 50 = ~10k rows → still small. Cap of `limit ≤ 200` and `offset ≤ 5000` keeps it bounded.
- For a nursery with > ~10k history rows we'd revisit with a real SQL union; today's data scale (10s–100s) makes Python merge the right pick.

### Configuration-driven entity registration

```python
TRACKED = {
    'pet':           {'manager': lambda: Pet.history,           'label': lambda h: h.name},
    'owner':         {'manager': lambda: Owner.history,         'label': lambda h: f'{h.first_name} {h.last_name}'},
    'medical_note':  {'manager': lambda: MedicalNote.history,   'label': lambda h: h.title},
    'vaccination':   {'manager': lambda: Vaccination.history,   'label': lambda h: h.vax_type},
}
```

When a new entity gets `simple_history` wiring later, registration here is one dict entry. No view subclassing, no boilerplate.

### Single endpoint, not a viewset

The activity feed is read-only and stateless. A function-based / `APIView`-style endpoint is the right shape; a `ModelViewSet` would suggest writes that don't exist.

### URL: `GET /api/audit-log/activity/`

The audit-log app already owns `/api/pets/<id>/history/` etc. The new endpoint sits at `/api/audit-log/activity/` for clarity — it's a feature of the audit-log app, not of any single entity.

### Filter validation

- `entity_type`: string, must be one of `pet|owner|medical_note|vaccination`. Unknown values → 400.
- `action`: must be `+|~|-`. Unknown values → 400.
- `user`: integer. Unknown user id returns 0 results, not 400 (consistent with how the admin user list filter handles non-existent values).
- `since` / `until`: ISO 8601. Bad format → 400.
- `limit`: integer 1..200. Out of range → clamped silently (default 50).
- `offset`: integer ≥ 0. Negative → 400.

### Pagination shape

`{ count, results }` matches the DRF pagination convention without using DRF's pagination infrastructure (which assumes a single QuerySet). `count` is the **total** count across all entities matching the same filter set, computed as the sum of per-entity `.count()` calls. That's 4 cheap `COUNT(*)` queries; acceptable.

### Frontend page at `/admin/activity`

Mirrors the structure of `/admin/users`:
- `withAdmin` HOC for access control.
- Filter row above the table (role / status / date filters → entity / action / period / user).
- Server-side filtering via the new endpoint's query params.
- Pagination controls at the bottom.

Each row renders:
- Timestamp (human-readable: "2 hours ago" with a tooltip showing the absolute time).
- User badge (initials avatar + email).
- Action badge (Created / Updated / Deleted with colour).
- Entity type chip + entity label.

No expand-to-diff in v1; the row is informational. Drill-down to per-entity history can land later as a stretch.

### i18n

New keys under the `audit` namespace:

```
audit.activity.title           "Activity log"
audit.activity.description     "Recent changes across the nursery."
audit.activity.empty           "No activity to show."
audit.activity.action.created  "Created"
audit.activity.action.updated  "Updated"
audit.activity.action.deleted  "Deleted"
audit.activity.entity.pet      "Pet"
audit.activity.entity.owner    "Owner"
audit.activity.entity.medical_note "Medical note"
audit.activity.entity.vaccination  "Vaccination"
audit.activity.filters.title   "Filters"
audit.activity.filters.entity  "Entity"
audit.activity.filters.action  "Action"
audit.activity.filters.user    "User"
audit.activity.filters.period  "Period"
audit.activity.filters.all     "All"
audit.activity.filters.last7d  "Last 7 days"
audit.activity.filters.last30d "Last 30 days"
audit.activity.filters.last90d "Last 90 days"
audit.activity.pagination.prev "Previous"
audit.activity.pagination.next "Next"
audit.activity.pagination.page "Page {n}"
```

## Alternatives considered

- **Single SQL view (`CREATE VIEW ...`) unioning the historical tables.** Would be the right answer at scale, but premature for this dataset and a Postgres-only solution (we test on SQLite).
- **Per-entity activity feeds (one per model).** Fragments the UX; admins want one cross-cutting view.
- **Server-side rendering of timestamps.** Pushed to the frontend (`date-fns/formatDistanceToNow`) so the relative time stays accurate as the page sits open.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| In-memory merge becomes slow as the audit log grows. | Cap `limit ≤ 200`. Document the SQL-union upgrade path in this design doc. Realistic data volume keeps us well below the threshold for years. |
| `entity_label` reads a field on the historical row that may have been renamed in the live model. | History rows are immutable snapshots; the historical row keeps the field name as it was at the time. |
| Deleted entities show `deleted` but no useful label (the snapshot is from before the delete). | The label-resolver uses the snapshot, so the row reads "Pet 'Buddy' deleted" with the last known name. Correct behaviour; we want the label preserved. |
| 5+ Playwright tests asserting on absolute counts will break when seed data changes. | The new tests use mocked endpoints (`page.route`) with fixed result sets, so they're independent of dev-DB state. |
