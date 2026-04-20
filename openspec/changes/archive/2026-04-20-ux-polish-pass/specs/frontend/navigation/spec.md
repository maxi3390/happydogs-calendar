# Delta for Frontend Navigation

## ADDED Requirements

### Requirement: New Schedule Global Shortcut

The navigation SHALL expose a persistent "New Schedule" shortcut that is reachable from every authenticated page. The shortcut SHALL behave contextually:

- When the host page injects an `onNewSchedule` callback (the Calendar / home page), activating the shortcut SHALL invoke that callback, opening the schedule modal in place without navigating.
- When the host page does not inject a callback (any other authenticated page), activating the shortcut SHALL route to `/?new=1`.

The home page SHALL detect the `new=1` query parameter on mount, auto-open the schedule modal, and clean the query parameter from the URL so a subsequent reload does not re-open the modal.

#### Scenario: New Schedule shortcut is visible on every authenticated page

- GIVEN an authenticated user on any authenticated page
- WHEN the header renders
- THEN a "New Schedule" shortcut SHALL be visible in the primary nav cluster (desktop) and in the mobile menu

#### Scenario: New Schedule shortcut opens the modal in place on the home page

- GIVEN the user is on `/`
- WHEN the user activates the New Schedule shortcut
- THEN the schedule modal SHALL open without a URL change

#### Scenario: New Schedule shortcut routes to home and opens modal from another page

- GIVEN the user is on `/pets` (or any other authenticated page)
- WHEN the user activates the New Schedule shortcut
- THEN the user SHALL be routed to `/?new=1`
- AND once the home page mounts, the schedule modal SHALL open automatically
- AND the URL SHALL be cleaned to `/` so reloading does not re-open the modal

## MODIFIED Requirements

### Requirement: Page-Scoped Actions Stay Page-Scoped

Buttons that depend on the host page's state SHALL be passed into the Navigation component as optional callbacks and SHALL NOT be listed as navigation destinations in this spec. They MAY render inside the header for convenience but their presence depends on the host page wiring them in.

Note: "New Schedule" is not an example of a purely page-scoped action. It is a global destination covered by the "New Schedule Global Shortcut" requirement above. The Multi-Pet Schedule shortcut, which still only exists when the host page provides its callback, is an example of a page-scoped action.

#### Scenario: Multi-Pet Schedule is only present when its host page provides the callback

- GIVEN the home page provides an `onMultiPetSchedule` callback
- WHEN the mobile menu renders on `/`
- THEN a Multi-Pet Schedule action SHALL appear
- WHEN the mobile menu renders on any other page that does not pass the callback
- THEN no Multi-Pet Schedule action SHALL appear
