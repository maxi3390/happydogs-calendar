# Delta for Frontend Calendar

## ADDED Requirements

### Requirement: Localized Day And Month Labels

All calendar surfaces (month calendar header, week view day labels and week range header, day schedule header, public availability calendar) SHALL render day names and month names in the application's active language. Machine-format date tokens (ISO dates like `yyyy-MM-dd`) SHALL remain locale-independent.

#### Scenario: Week view day names change with language

- GIVEN the user is viewing the week view in English
- WHEN the user switches the active language to Spanish
- THEN the day name abbreviations ("MON", "TUE", …) SHALL re-render as Spanish abbreviations
- AND the week range header (for example "Week of Apr 14 - Apr 20, 2026") SHALL re-render with Spanish month names

#### Scenario: Day schedule header changes with language

- GIVEN the user is viewing the day schedule for a given date
- WHEN the active language is Spanish
- THEN the full date header (day name, month name, day number, year) SHALL render in Spanish

#### Scenario: Month calendar header changes with language

- GIVEN the user is viewing the month calendar on the home page
- WHEN the active language is Spanish
- THEN the month-and-year header SHALL render as a Spanish month followed by the year

#### Scenario: Public availability calendar header changes with language

- GIVEN an unauthenticated visitor is viewing the public availability calendar
- WHEN the active language is Spanish
- THEN the month-and-year header SHALL render in Spanish

#### Scenario: Machine-format date tokens are locale-independent

- GIVEN a component formats a date for API consumption (for example `'yyyy-MM-dd'` in schedule range queries)
- WHEN the active language changes
- THEN the machine-format output SHALL remain identical across languages
