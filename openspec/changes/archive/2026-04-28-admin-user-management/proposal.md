# Admin user management — filters, bulk select, deactivation, deletion, promote/demote

## Why

`/admin/users` today supports create, edit, delete, and password reset on individual users. That works for a handful of accounts but breaks down as the team grows:

- Finding the right row scales linearly because the only filter is a free-text search.
- Bulk operations (deactivate a batch of seasonal hires, demote everyone after a re-org) require N round-trips through the edit modal.
- Deletion is a single click that hard-removes the user immediately, with no impact preview and no soft-delete safety net.
- Role transitions only happen through the edit modal alongside other field changes; "promote this user" is not a first-class action.

The fix is the standard user-admin pattern: filters, bulk select with a contextual action bar, deactivate-then-delete with an impact summary, and explicit promote/demote actions.

## What

1. **Backend** (`UserViewSet`):
   - **Per-user actions** (admin-only):
     - `POST /api/users/<id>/deactivate/` — set `is_active=False`.
     - `POST /api/users/<id>/activate/` — set `is_active=True`.
     - `POST /api/users/<id>/promote/` — set `role=admin`.
     - `POST /api/users/<id>/demote/` — set `role=user`.
     - `GET /api/users/<id>/deletion_impact/` — returns `{ notifications: N, audit_log_entries: M }` so the frontend can show what will be discarded / anonymized before the operator confirms.
   - **Bulk actions** (admin-only, body `{ ids: [...] }`):
     - `POST /api/users/bulk_deactivate/`
     - `POST /api/users/bulk_activate/`
     - `POST /api/users/bulk_delete/` — same inactive-only rule as single delete.
     - `POST /api/users/bulk_set_role/` — body `{ ids: [...], role: 'admin' | 'user' }`.
   - **Override `destroy`** to refuse with 400 when the target's `is_active=True`. Forces operators through deactivate → delete, matching the soft-delete safety pattern the operator asked for.
   - **List filters** on `GET /api/users/`: `?role=`, `?is_active=`, `?last_login_within_days=` (and `?last_login_never=true` to find users who never logged in).
   - **Guards** that apply to both single and bulk endpoints:
     - The requesting admin SHALL NOT be able to deactivate, demote, or delete themselves.
     - The system SHALL refuse to demote / deactivate / delete the last remaining admin (would lock the team out).

2. **Frontend** (`/admin/users`):
   - **Filter bar** at the top of the list: role select (admin / user / all), status select (active / inactive / all), last-login select (any / within 7d / 30d / 90d / never). Filters round-trip to the backend via query params on the list call.
   - **Bulk select**: checkbox in the table header (select-all-on-page) and per-row checkboxes. When `≥ 1` row is selected, a contextual action bar appears above the table with "Activate", "Deactivate", "Delete", "Promote", "Demote" buttons. Disabled actions (e.g. Delete when any selected user is active) show a tooltip explaining why.
   - **Per-row action menu**: extend the existing icon row to include Activate / Deactivate (mutually exclusive based on current state), Promote / Demote (mutually exclusive based on current role), and Delete. Delete remains disabled (with tooltip) on active users.
   - **Delete confirmation modal**: shows the impact summary returned by `deletion_impact`. Confirm button is destructive; cancel returns to the list.
   - **`/admin/users` route is admin-only** (already enforced via `withAdmin` HOC; no change).

3. **i18n**: every new label / message added to `backend/translations/en.json` and `es.json` (the canonical translation files) and to `frontend/tests/helpers.ts` (the Playwright mocks).

4. **Live specs**:
   - `openspec/specs/backend/auth/spec.md` gains the new endpoints + guards.
   - `openspec/specs/frontend/user-management/spec.md` gains filters, bulk actions, deletion-requires-inactive, action menu.

## Impact

- **No data migration.** All endpoints operate on existing fields (`is_active`, `role`). No new columns.
- **`User` model unchanged.** No new role; per the design conversation, "staff" is a UI synonym for admin and the data model stays at admin / user.
- **Existing admin tests survive.** The pre-existing list / create / edit / set_password / destroy paths keep working; destroy gains a new precondition (target must be inactive) that's tested in isolation.
- **No backend dependency on `django-filter`.** Filters are implemented with `get_queryset()` overrides because the rest of the codebase doesn't use django-filter; staying consistent.

## Out of scope

- **Migrating user-owned data on delete.** The current data model has no user-owned business records (Owner / Pet / Schedule belong to the nursery, not to operators). The deletion-impact endpoint reports notifications + audit-log entries only. If `created_by` FKs land on those models in a future change, the migration UI can be re-introduced then.
- **Server-side pagination.** Filters work on the existing client-side rendering. Once the operator base grows past ~200 users, server-side pagination becomes worthwhile; out of scope for this round.
- **Audit-log entries for the new admin actions.** The audit-log middleware already records all writes via `simple_history`; no per-action wiring needed. Tracked separately if a richer "admin activity feed" is wanted later.
- **Email notifications when an account is deactivated / deleted.** Reasonable next step but adds an SMTP path; out of scope here.
