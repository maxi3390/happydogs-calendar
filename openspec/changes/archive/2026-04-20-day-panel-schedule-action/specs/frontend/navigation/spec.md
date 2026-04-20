# Delta for Frontend Navigation

## REMOVED Requirements

### Requirement: New Schedule Global Shortcut

**Reason**: The New Schedule action moved out of the global header into the day schedule panel on the Calendar page (see `frontend/calendar` capability, requirement "New Schedule Action Lives In The Day Schedule Panel"). A single panel-level entry point prevents two affordances from drifting and co-locates the action with the selected date it operates on.

**Migration**: The Navigation component no longer accepts an `onNewSchedule` prop. Callers that previously used it (the Home page) now pass `onNewSchedule` to `DaySchedule` instead. Users creating a schedule from a non-Calendar page now click the Calendar nav link first, then the panel's "+ New Schedule" button.

## MODIFIED Requirements

### Requirement: Page-Scoped Actions Stay Page-Scoped

Buttons that depend on the host page's state SHALL be passed into the Navigation component as optional callbacks and SHALL NOT be listed as navigation destinations in this spec. They MAY render inside the header for convenience but their presence depends on the host page wiring them in.

#### Scenario: Multi-Pet Schedule is only present when its host page provides the callback

- GIVEN the home page provides an `onMultiPetSchedule` callback
- WHEN the mobile menu renders on `/`
- THEN a Multi-Pet Schedule action SHALL appear
- WHEN the mobile menu renders on any other page that does not pass the callback
- THEN no Multi-Pet Schedule action SHALL appear
