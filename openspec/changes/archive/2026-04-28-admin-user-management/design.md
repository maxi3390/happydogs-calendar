# Design: Admin user management — filters, bulk select, deactivation, deletion, promote/demote

## Decisions

### Soft-delete by hand (deactivate-then-delete), not a `deleted_at` column

The operator asked for a hard requirement: "for deletion it's a requisite to be deactivated first." We honour that with a precondition check in the `destroy` view, not by introducing a `deleted_at` column. Reasons:

- The User model already has `is_active`, which Django's auth pipeline already respects (`is_active=False` ⇒ login refused). We don't need a second flag.
- Soft-delete-by-tombstone (`deleted_at` set, row stays around) is meaningful when users own a lot of data we want to preserve. They don't, so the value of an extra column is small.
- The two-step flow (deactivate → delete) gives the same safety affordance: operators can't accidentally delete an active user with one click. The list filter "Inactive" surfaces the deletion candidates.

`destroy` returns `400` with `{ "detail": "User must be deactivated before deletion." }` when called on an active user. Bulk delete returns the same shape with the offending ids enumerated.

### Bulk endpoints accept `{ ids: [...] }`, not query strings

We chose JSON-body bulk endpoints for three reasons:

1. **Atomic-ish semantics.** The view runs `User.objects.filter(id__in=ids).update(...)` in a single transaction. Either every targeted user changes, or none does (on validation failure).
2. **Audit-log compatibility.** The audit-log middleware reads request bodies for change-context. `update()` skips per-row signals so audit history won't capture bulk changes — that's the same trade-off `simple_history` documents, and we accept it; the per-user actions DO write audit entries.
3. **Simple to call from the frontend.** `fetchApi.post('/users/bulk_deactivate/', { ids: [1,2,3] })` is one line.

The flip side is that bulk endpoints cannot reuse standard DRF mixins. They're three-line `@action(detail=False, methods=['post'])` functions — small enough to write longhand.

### "Cannot remove the last admin" is enforced server-side

A frontend that disables the "demote" button when only one admin exists is helpful UX, but it isn't security. The backend check runs as the last gate inside every action that could remove admin privileges:

- `destroy` (single + bulk) when the target is admin.
- `demote` (single + bulk_set_role to user) when the target is admin.
- `deactivate` (single + bulk) when the target is admin.

The check is `User.objects.filter(role='admin', is_active=True).exclude(id__in=affected_ids).count() >= 1`. If it would drop to zero, the action SHALL refuse with `400 { "detail": "Cannot remove the last active admin." }`.

### "Cannot modify yourself" applies to deactivate, demote, delete — not promote / activate

If the operator could deactivate themselves, they'd lose access mid-request. If they could demote themselves, the next admin-only call fails. If they could delete themselves, same plus auth tokens become orphaned. So those three are blocked when the request user appears in the targeted ids.

Promote / activate against yourself is a no-op (you're already admin and active to be hitting the admin endpoint), but harmless — we don't bother special-casing it.

### Deletion impact is a separate `GET` endpoint, not embedded in the user list

The impact counts (notifications, audit-log entries) require a join across tables and aren't useful on every list-row render. They live on `GET /api/users/<id>/deletion_impact/` and the frontend fetches them lazily when the delete modal opens. Cheap, focused, easy to cache later if needed.

The endpoint returns:

```json
{
  "notifications": 12,
  "audit_log_entries": 47
}
```

Both counts are deletion-side-effects: notifications cascade and disappear; audit-log entries SET_NULL the `history_user` and become anonymous. The modal renders this as "12 unread notifications will be discarded; 47 audit-log entries will be anonymized."

### Filters land on `get_queryset` rather than `django-filter`

The codebase doesn't use `django-filter` anywhere else; adding it just for three filters here would be incongruous. Three short conditional `qs = qs.filter(...)` calls in `get_queryset` are easier to read for a future maintainer and don't pull in another dependency. If filter complexity grows past a handful, we revisit.

The `last_login_within_days` filter accepts an integer (e.g. `30` for "last 30 days"); `last_login_never=true` is its mutually-exclusive complement.

### Frontend filter state lives in URL query params

Filter selections (role, status, last-login range) are reflected in the URL via `useSearchParams` + `router.replace`. Three benefits:

- **Shareable links.** "Send me the list of inactive admins" works as a URL.
- **Survives reload.** Reloading the page keeps the filter state.
- **Plays nicely with browser back/forward.** Toggling a filter is a navigation, not a hidden state change.

Bulk selection is NOT in the URL — it's session-local and resets on filter changes (selecting rows that disappear from the filtered view would be confusing).

### Bulk action bar is sticky and contextual

Selecting one or more rows reveals a sticky bar below the filter row with:

```
3 selected · [Activate] [Deactivate] [Promote] [Demote] [Delete]   [Clear]
```

Disabled buttons render with a tooltip explaining why ("All selected users are already active", "Cannot delete: 1 active user in selection — deactivate first", "Cannot demote: would leave no active admin"). The bar persists until the operator clears the selection or all selected rows leave the view.

### Per-row action menu vs. icon row

The current row has three icon buttons (edit / reset password / delete). Adding four more (activate, deactivate, promote, demote) would crowd the row. We swap the icons for a single "More actions" button that opens a small popover with all the actions, with edit + reset-password kept as direct icon buttons (most-used affordances stay one click away).

The popover is a `<div>` positioned to the right of the row's More icon, dismissed on outside click. We don't introduce a popover library — the codebase doesn't use one, and the implementation fits in ~50 lines including click-outside detection.

## Alternatives considered

- **`POST /api/users/<id>/role/` accepting `{role: '...'}`.** More REST-ish than two action endpoints (`promote`/`demote`), but harder to read at the call site (`api.users.role(id, 'admin')` vs. `api.users.promote(id)`). The action verbs match the UX; we kept them.
- **A single `bulk_action` endpoint with a `kind` field.** Tempting but harder to type-check on the frontend and more annoying to test on the backend (one fat function with a switch). Five small endpoints are easier to maintain.
- **Server-side pagination from day one.** Out of scope — the current data layer is small and the UX can run client-side until it can't. Adding pagination after filters is straightforward.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| An admin accidentally bulk-deactivates a group that includes themselves. | Self-protection guard at the view layer: any bulk endpoint that includes `request.user.id` in `ids` rejects with `400 { "detail": "Cannot include yourself in this bulk action." }`. The frontend pre-strips the requesting user from "select all on page". |
| Race: two admins simultaneously demote each other (both pass the "last active admin" check independently, both succeed, system ends up admin-less. | The check inside each action is wrapped in `transaction.atomic` with a `select_for_update()` on the affected rows. The first transaction to commit wins; the second fails its precondition check and returns 400. |
| Filter combinatorics misbehave. | Each filter is independent and applies only when its query param is present. `last_login_within_days` and `last_login_never` are mutually exclusive — the view returns 400 if both are present. |
| Bulk endpoints flood the audit log. | Out of scope: `update()` doesn't trigger `simple_history` at all, so bulk endpoints don't write history rows. Acceptable trade-off for now; if richer activity tracking is wanted, the bulk endpoints can be reworked to per-row `save()` later. |
