# MODIFIED: Frontend / Owners

## ADDED Requirements

### Requirement: Owner birth date rendered as dd/mm/yyyy

Owner birth dates SHALL be formatted as `dd/mm/yyyy` when displayed in the Owner Details popup (`OwnerDetailsPopup.tsx`), using the shared `formatIsoDate` helper from `@/lib/dateLocale`. The underlying storage and API representation SHALL continue to be `YYYY-MM-DD`.

#### Scenario: Birth date in owner details popup

- GIVEN an owner whose `birth_date` is `1990-07-12`
- WHEN the Owner Details popup renders the Identification section
- THEN the birth-date line SHALL read `<Birth Date label>: 12/07/1990`

#### Scenario: Missing birth date

- GIVEN an owner whose `birth_date` is `null`
- WHEN the Owner Details popup renders
- THEN the birth-date line SHALL NOT appear (unchanged from the existing guard)
