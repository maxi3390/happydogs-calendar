# Design — Pagination, N+1s, indexes

## Pagination shape and the frontend contract

The biggest risk here is not the backend change but the **response-shape
break**. Today every list endpoint returns a bare JSON array; DRF pagination
wraps it in:

```json
{ "count": 123, "next": "…?page=2", "previous": null, "results": [ … ] }
```

Every frontend caller that does `const items = await api.owners.list()` and
treats the result as an array breaks. Two mitigations, pick per call-site:

1. **Centralise unwrapping in the `_http` client.** For list calls, the client
   returns `results` and exposes `count`/`next` on a side channel. Simplest for
   the many screens that just want "all rows on this small dataset".
2. **Follow `next` in the domain API layer** for the few views that must show
   the entire set regardless of page size (e.g. the calendar month view
   aggregating schedules). These loop until `next` is null.

The delta specs below pin the backend envelope and the frontend's obligation to
handle it; the exact unwrap location is an implementation detail recorded in
tasks.

## Counts: annotate, don't call `.count()` per row

```python
# OwnerViewSet
queryset = Owner.objects.annotate(pet_count=Count('pets')) \
                        .select_related('primary_vet', 'emergency_vet')
# PetViewSet
queryset = Pet.objects.annotate(medical_notes_count=Count('medical_notes')) \
                      .select_related('owner', 'vet_override')
```

The serializer `SerializerMethodField`s become plain reads of the annotated
attribute (falling back to the relation when the annotation is absent, so the
detail/create paths that don't use the list queryset still work).

## Indexes

```python
class Schedule(models.Model):
    ...
    class Meta:
        app_label = 'pets'
        ordering = ['start_date', 'start_time']
        indexes = [
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['pet', 'start_date']),
        ]
```

The `(start_date, end_date)` index serves the calendar's range query and the
conflict-detection overlap query; `(pet, start_date)` serves per-pet timelines.
FK columns (`pet`, `owner`) are already indexed by Django, so no extra index
there. All migrations belong to the `pets` app because of the `app_label`
override (per `backend/AGENTS.md`).

## Verifying the N+1 fix

Use `django.test.utils.CaptureQueriesContext` (or `assertNumQueries`) in the
pets/owners list tests to assert the query count is constant regardless of the
number of rows returned — this both proves the fix and guards against
regression.

## Page size

`PAGE_SIZE = 50`, `page_size` query param honoured up to a `max_page_size`
(e.g. 200) via a small custom pagination class. Keeps worst-case payload and
serialization bounded.
