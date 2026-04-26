# Tasks — Notification fan-out filter

## Phase 1 — Backend model + migration

- [x] Add `NurserySetting.notification_recipient_lookback_days` (`PositiveIntegerField`, `default=30`, `help_text` documenting `0 = no filter`).
- [x] Migration `0004_nurserysetting_notification_recipient_lookback_days.py`.

## Phase 2 — Service change

- [x] `notifications/services._recipient_queryset(settings)` filters by `last_login__gte=now - timedelta(days=lookback)` when the setting is `> 0`.
- [x] Users with `last_login = NULL` are excluded from the lookback window.
- [x] When the setting is `0`, the filter is dropped — fall back to the previous "every active user" behaviour.

## Phase 3 — Tests

- [x] `test_default_is_30_days`.
- [x] `test_recent_login_included` — covers `last_login = today - 5 days` and `today - 29 days`.
- [x] `test_stale_login_excluded` — `last_login = today - 31 days` is excluded.
- [x] `test_null_last_login_excluded`.
- [x] `test_lookback_zero_includes_everyone` — covers `last_login = today - 400 days` and `last_login = NULL`.
- [x] `test_custom_lookback_window` — `lookback = 7` excludes a user who logged in 8 days ago.
- [x] Updated the `tests.factories.create_user` default to set `last_login = timezone.now()` so existing tests don't break under the new filter.
- [x] Updated `seed_example_data._seed_users` to stamp `last_login = now()` on seed users for the same reason.

## Phase 4 — Frontend

- [x] Added `notification_recipient_lookback_days: number` to `frontend/src/domain/settings/types.ts`.
- [x] Surfaced the field in `NotificationsSettings` as a number input next to the deworming default, with a hint translation explaining the `0 = no filter` semantics.
- [x] Added EN / ES translations for `notifications.settings.recipientLookbackDays` and `recipientLookbackHint`.

## Phase 5 — Spec + archive

- [x] Updated `openspec/specs/backend/notifications/spec.md` with the recipient filter clause and four lookback scenarios.
- [x] Updated `openspec/specs/backend/settings/spec.md` with the new field in the `NurserySetting` table and two operator scenarios.
- [x] Updated `openspec/specs/frontend/notifications/spec.md` to add the new input to the nursery-wide contract.
- [x] Archive this change folder.
