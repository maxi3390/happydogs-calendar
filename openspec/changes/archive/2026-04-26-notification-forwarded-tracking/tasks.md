# Tasks — Owner-forward tracking

## Phase 1 — Backend model

- [x] Added `Notification.forwarded_at` (`DateTimeField(null=True, blank=True)`).
- [x] Migration `0002_notification_forwarded_at.py`.

## Phase 2 — REST endpoint

- [x] `forward` action on `NotificationViewSet` — sets `forwarded_at = now()` if NULL, returns updated row, idempotent, 404 on cross-user.
- [x] `forwarded_at` exposed in `NotificationSerializer.fields`.

## Phase 3 — Backend tests

- [x] `test_forward_sets_forwarded_at`.
- [x] `test_forward_is_idempotent` — second call leaves timestamp unchanged.
- [x] `test_cross_user_forward_is_404`.

## Phase 4 — Frontend types + API

- [x] `Notification.forwarded_at: string | null` in `frontend/src/domain/notifications/types.ts`.
- [x] `notificationsApi.forward(id)` wrapper in `frontend/src/domain/notifications/api.ts`.

## Phase 5 — Frontend UI

- [x] `ForwardActions` accepts `notificationId` + `forwardedAt` props.
- [x] Both email and WhatsApp anchors fire `api.notifications.forward(id)` via `onClick` (fire-and-forget; failures swallowed).
- [x] "Forwarded ✓" pill (`data-testid="forwarded-pill"`) renders next to the event date when `forwarded_at` is non-null. Row carries `data-forwarded="true|false"`.
- [x] Forward buttons get a localised `title` tooltip "Already forwarded {when}" and a muted variant on already-forwarded rows.
- [x] Translations: `notifications.page.forwardedPill` and `notifications.page.alreadyForwardedTooltip` in EN and ES.

## Phase 6 — Spec + archive

- [x] `openspec/specs/backend/notifications/spec.md` — added forward endpoint to the endpoint list, three scenarios (first set, idempotent, cross-user 404), and the "three timestamps are independent" note.
- [x] `openspec/specs/frontend/notifications/spec.md` — added the click-tracking + pill contract and three scenarios.
- [x] Archive this change folder.
