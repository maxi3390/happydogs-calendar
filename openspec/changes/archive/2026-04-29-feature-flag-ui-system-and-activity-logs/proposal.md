# Feature flags for UI System and Activity Logs

## Why

Two admin-only surfaces shipped with no kill switch:

* **`/ui-system`** — a live style-guide of the shared UI components. It's a developer reference, not a customer surface. With no flag, every nursery sees the link in the admin profile dropdown — including ones that have no engineers in the building. That's UX clutter at best and confusion at worst ("what is this 'UI System' page and do I need to do something with it?").
* **`/admin/activity`** — the cross-entity audit feed that just shipped under `feat/admin-activity-feed`. It works fine, but a strict-privacy deployment (e.g. one where staff don't want each other seeing their edit history at a glance) currently has no way to hide it without a code patch.

The product already has a `FeatureFlag` model, an admin toggle UI at `/admin/feature-flags`, and an `is_feature_enabled` helper. Adding two flags here turns both surfaces into operator-toggleable knobs without touching the underlying code paths.

## What

1. **Backend migration** `0005_seed_ui_system_and_activity_logs.py` adds two `FeatureFlag` rows:
   - `ui_system` — default `enabled = False`. The page is a dev reference; nurseries opt in if they want to see it.
   - `activity_logs` — default `enabled = True`. The feed just shipped; flipping the default off would surprise admins who already use it. Operators that want it hidden flip it on `/admin/feature-flags`.
2. **Backend gate** on `GET /api/audit-log/activity/` returns HTTP 404 when `activity_logs` is off. The gate runs *after* the auth + admin permission checks so an unauthenticated curl still gets 401 / a non-admin still gets 403 — the surface's existence isn't leaked via the gating shape. The per-entity history endpoints (`/api/pets/<id>/history/` etc.) stay reachable so admins can still drill in on a single entity's history when the cross-entity feed is hidden.
3. **Frontend gating** in `Navigation.tsx`:
   - Desktop profile dropdown hides the `/admin/activity` and `/ui-system` links when the corresponding flag is off (the `isAdmin` gate stays — non-admins never see them regardless).
   - Mobile menu mirrors the same conditions.
4. **Page bodies** for `/admin/activity` and `/ui-system` short-circuit to an empty-state card (`{t('featureFlags.empty')}`) when the corresponding flag is off, with deterministic test ids (`activity-disabled` / `ui-system-disabled`). The activity page additionally skips the API fetch in the disabled branch since the backend would 404 anyway.
5. **i18n** adds the two flag descriptions to `featureFlags.flags.{ui_system,activity_logs}` in both `en.json` and `es.json` so the descriptions render on the `/admin/feature-flags` toggle page.
6. **Live spec updates** extend the existing canonical sets:
   - `backend/feature-flags/spec.md` — two new flags listed in the canonical-flags scenario with their documented defaults.
   - `backend/audit-log/spec.md` — new Requirement covering the 404 gate + the auth-then-flag ordering.
   - `frontend/navigation/spec.md` — Activity entry added to the dropdown / mobile-menu enumeration; UI System and Activity scenarios pivot on their flag states.
   - `frontend/audit-activity/spec.md` — Activity-link Requirement amended to reference `activity_logs`; new Requirement for the empty-state branch.
7. **Tests**:
   - Backend: 2 new tests in `audit_log/tests/test_activity_feed.py` covering the 404 path and the admin-then-flag ordering. Existing seed-migration test in `feature_flags/tests.py` updated (canonical key set + defaults) so a future flag drift breaks loudly.
   - Frontend: new Playwright spec `feature-flag-ui-system-and-activity-logs.spec.ts` with 6 tests (3 per surface — link hidden when off / link visible when on / empty-state on direct visit). Existing UI System nav test stubs `ui_system: true` because the new default is off.
   - Test-helper `stubFeatureFlags(page, overrides)` added to `tests/helpers.ts` so future specs that need a deterministic flag state don't reinvent the route stub each time.

## Impact

- **No data migrations** other than the seed row inserts — both flags are new and `get_or_create`-keyed so `migrate` is idempotent on environments that already have the surfaces.
- **No API contract changes** for the per-entity history endpoints; only the cross-entity activity endpoint gains a 404 path.
- **No data loss** when the flag flips off — `simple_history` rows continue to be recorded; the feed reappears as soon as the flag flips back on.
- **Behavioural change for fresh installs**: `/ui-system` becomes opt-in. Existing installs are unaffected because `get_or_create` doesn't clobber an existing row, but a fresh install no longer sees the link in the dropdown until an operator enables `ui_system`.
- **Live spec**: small modifications to `backend/feature-flags`, `backend/audit-log`, `frontend/navigation`, and `frontend/audit-activity`.

## Out of scope

- **Gating the `/ui-system` page on `withAdmin`.** The page is currently public (no auth gate), and that's deliberate — engineers occasionally screen-share it without a login. The flag controls the nav entry + page body's empty state, which is enough to keep it out of nurseries' view; locking it down further would be a separate change.
- **Per-row diff view inside `/admin/activity`** when the flag is off. Out of scope; we don't render anything but the empty state in the disabled branch.
- **Audit-log gating for the per-entity history endpoints.** Those stay reachable regardless of `activity_logs`; an admin who lands on a specific Pet detail page should still be able to see its history even when the cross-entity feed is hidden. If we ever want to gate those, that's a separate change.
- **Migration to remove the seed flags.** Deletion remains manual (mirrors the precedent set by `0002_seed_flags.py`'s docstring). If we ever want to retire either flag, it's a separate, explicit operator action.
