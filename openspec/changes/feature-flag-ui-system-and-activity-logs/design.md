# Design — Feature flags for UI System and Activity Logs

## Default state — why one flag defaults on, the other off

Two new flags, two different defaults. The defaults aren't symmetric on purpose; the audience and risk profile are different.

* **`ui_system`** defaults `False`. The `/ui-system` page is a live style-guide of the shared UI components — useful for engineers when they're picking variants for a new feature, useless for nursery staff. Defaulting off matches the audience: a fresh install has zero engineers in the building, so the link is just clutter. Engineers who screen-share it can flip the flag on and off as needed; nothing is lost.

* **`activity_logs`** defaults `True`. The cross-entity audit feed shipped in the previous merge (`feat/admin-activity-feed`) and works as designed. Flipping the default to `False` would silently take a feature away from admins who already use it after they upgrade — a regression in the form of a default change. The flag exists for the strict-privacy deployment that wants to hide the feed (e.g. one where staff don't want each other browsing their edit history), not for the typical install. Flipping it from `True` to `False` is one PATCH on `/admin/feature-flags`.

This split also doubles as a documentation pattern: one example of "off by default, opt in" and one of "on by default, opt out", so the next person adding a flag has both paths in front of them.

## Backend gate placement — auth THEN flag

`AuditLogActivityView.get` checks `is_feature_enabled('activity_logs')` *after* `permission_classes = [IsAuthenticated, IsAdmin]` has run. The order matters:

```
1. No Authorization header        → 401 (DRF default)
2. Authenticated non-admin        → 403 (IsAdmin)
3. Authenticated admin, flag off  → 404
4. Authenticated admin, flag on   → 200
```

If we put the flag check before the permission check, a non-admin probing the URL with the flag off would get 404 — which is fine on its own — but a non-admin probing with the flag on would get 403, leaking that the surface exists and is gated. By keeping the flag check inside the admin-gated branch, the gating shape never tells the curious caller anything they don't already know.

We pick **404** rather than 403 / 410 / 503 because 404 fits the operator-facing mental model: "this URL does not exist *for this install*". 403 implies a permissions issue that re-authenticating could fix; 503 implies a temporary outage. 404 is correct.

## Per-entity history endpoints stay open

The flag gates `GET /api/audit-log/activity/` only. `GET /api/pets/<id>/history/` and the other per-entity endpoints stay reachable when `activity_logs` is off. Reasoning: an admin investigating a specific pet's history shouldn't be locked out of the per-entity drill-down just because the operator hid the cross-entity feed for browsing-clutter reasons. The two surfaces serve different jobs:

| Surface                              | Job                                                           | Gated by `activity_logs`? |
|--------------------------------------|---------------------------------------------------------------|---------------------------|
| `/api/audit-log/activity/`           | Browse "what changed across the nursery this week"            | Yes                       |
| `/api/pets/<id>/history/`            | Reconstruct the trail for one specific entity (incident response) | No                        |

If a future operator wants the per-entity endpoints gated too, that's a separate flag — say `audit_history` — not an expansion of this one.

## Frontend short-circuit — skip the fetch when the flag is off

`/admin/activity` calls `useFeatureFlag('activity_logs')` first and short-circuits to the empty-state branch *before* the API request is fired. Two reasons:

1. The backend returns 404 in this case, which the existing fetch path renders as a generic error banner — useless to the operator.
2. Skipping the fetch keeps the `data-testid="activity-disabled"` branch deterministic for Playwright. The test asserts that the table never appears AND that no request hits `/api/audit-log/activity/`; if the fetch fired, the network mock from the existing `admin-activity-feed.spec.ts` could leak into other specs.

`/ui-system` doesn't need the same precaution — the page makes no API calls — but uses the same shape (`if (!enabled) return <empty-state />`) for consistency.

## Test helper — `stubFeatureFlags(page, overrides)`

The notifications spec already has an inline stub for `GET /api/feature-flags/`, but it only includes 2 flags and is local to that file. With three more specs needing the same trick, copy-pasting the stub starts to drift. We add `stubFeatureFlags(page, overrides)` to `frontend/tests/helpers.ts` returning every canonical flag with its seed default, and accepting a partial overrides map so a test that only cares about one flag can write `stubFeatureFlags(page, { ui_system: true })` without restating the others.

The default-state object inside the helper duplicates the seed values from the migrations on purpose: if a future flag is added without updating the helper, every test that depends on that flag fails fast — we'd rather break loudly than silently inherit `false` from the absence of a key.

## Why no `useFeatureFlag` redirect on the page

Both pages render the empty-state inline rather than calling `router.replace('/')`. The redirect approach has two drawbacks:

1. The flag state is fetched async (`FeatureFlagsProvider` issues the GET on mount). A redirect on `enabled === false` would fire on every load — including the brief "still loading" window where the hook returns `false` — and bounce the user away even when the flag is actually on.
2. An admin who navigates to `/admin/activity` on a flag-off install should see *something* explanatory ("this feature is disabled") rather than land back on the home page wondering why the link in the dropdown was missing AND the URL silently bounced.

The empty-state card is a small, honest surface. It costs ~10 lines of JSX; the redirect saves nothing meaningful.

## Why the existing admin-activity-feed Playwright tests don't need updates

`tests/admin-activity-feed.spec.ts` mocks `GET /api/audit-log/activity/` with `page.route` and goes straight to the table assertions. It doesn't stub the feature-flags endpoint, so it hits the real backend, which returns `activity_logs = True` (the new seeded default). With the flag enabled, the page takes the same code path it always has — the empty-state branch is dead code in that spec — so no edits needed.

The flip side: the new `feature-flag-ui-system-and-activity-logs.spec.ts` *does* stub the flags endpoint via the new helper. Both specs run in the same suite without interference because each registers its own routes per-page.
