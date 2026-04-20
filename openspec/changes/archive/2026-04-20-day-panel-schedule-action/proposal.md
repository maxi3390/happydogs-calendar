# Proposal: Relocate New Schedule Action To The Day Panel, Ensure All Scheduled Pets Are Shown

## Intent

Two related UX issues reported together:

1. The right-hand day schedule panel has a hardcoded `max-h-[400px]` cap on its inner list. With several schedules on the same day, the later entries disappear below a nested scrollbar that users don't always notice — it looks like the pets were simply dropped. Remove the inner cap so every scheduled pet for the selected day is visible without nested scrolling. The outer page scroll still handles overflow if needed.
2. The "New Schedule" action lives in the global header. From the Calendar (home) page, that placement is disconnected from the selected day: the user clicks a day on the calendar and then has to travel to the top-right header to start scheduling. Moving the action into the day panel itself puts it where the user's attention already is and allows the form to open pre-populated with the selected date (ScheduleForm already honors its `selectedDate` prop). The header-level shortcut added previously is retired as part of this move.

## Scope

In scope:
- `DaySchedule.tsx`: drop the `max-h-[400px] overflow-y-auto` cap on the inner list so every fetched schedule is rendered; expose a new optional `onNewSchedule?: () => void` prop; render a "+ New Schedule" button in the panel header that calls it.
- `app/page.tsx`: wire the Home page to pass `onNewSchedule` to `DaySchedule`. Stop passing `onNewSchedule` to `Navigation`. Remove the `useEffect` that reads `?new=1` from the URL (no longer reachable from the nav).
- `Navigation.tsx`: remove the dual-mode (button / Link to `/?new=1`) desktop New Schedule shortcut and its mobile counterpart. Drop the `onNewSchedule` prop from `NavigationProps`. Keep `onMultiPetSchedule` untouched — that callback is still a legitimate page-scoped shortcut from the mobile menu.
- Spec deltas:
  - `frontend/navigation`: REMOVE "New Schedule Global Shortcut". MODIFY "Page-Scoped Actions Stay Page-Scoped" so it no longer has to contort around the special New Schedule carve-out — it returns to its general form.
  - `frontend/calendar`: ADD "Day Schedule Panel Lists All Scheduled Pets" (no internal cap; outer page scroll handles overflow) and "New Schedule Action Lives In The Day Schedule Panel" (the button + date-prefill behavior).
- Update `frontend/tests/navigation.spec.ts` to drop any assertion that expects a New Schedule item in the header.

Out of scope:
- A dedicated E2E test for the day-panel "New Schedule" button (there are no existing DaySchedule E2E tests; adding one is a separate change).
- Redesigning the day panel header or its empty state beyond the button addition.
- Any change to the multi-pet scheduling affordance that still lives in the mobile nav.
- Any change to `ScheduleForm` itself — its `selectedDate` prop already pre-fills the `start_date` and `end_date` inputs.

## Approach

- **Panel capacity**: the only reason the day panel looked like it was hiding pets was the inline `max-h-[400px]` on the list's scroll container. Removing that attribute lets every `<div>` row render in a naturally-sized list; the outer page scrollbar picks up any overflow. No JavaScript changes are needed. This also means the panel naturally adapts to small or large lists without a fixed visual footprint.
- **New Schedule button placement**: inside the panel header, aligned right, using the existing `Button` component in its `primary` variant to visually anchor the day's primary action. It uses `t('nav.newSchedule')` as its label so the i18n catalogue doesn't need new keys. The `onNewSchedule` prop is optional so `DaySchedule` remains usable from any future surface that doesn't offer scheduling.
- **Form pre-fill**: `ScheduleForm` already reads `selectedDate` from props and uses it to seed `start_date` and `end_date`. The Home page keeps `selectedDate` in state; `DaySchedule` operates on the same date. When the button fires, the existing `setShowScheduleForm(true)` path opens the form with the correct date — no new wiring needed.
- **Nav retirement**: removing `onNewSchedule` from `NavigationProps` is a breaking prop change. Only the Home page passes it today, so this is a one-site update. The removed desktop/mobile shortcut blocks go cleanly; no other callers exist. The `?new=1` useEffect in Home becomes dead code and is deleted.
- **Spec coherence**: the nav spec's "New Schedule Global Shortcut" was added one change ago (in `ux-polish-pass`). We're retracting it now in favor of the day-panel placement and noting the move explicitly in the proposal so the history is clear. The "Page-Scoped Actions" requirement loses its "note: New Schedule is an exception" caveat and becomes self-contained again.
