# MODIFIED: Frontend / Settings

## ADDED Requirements

### Requirement: Data Backup Section

The general Settings page SHALL expose a "Data Backup" section, visible to every authenticated user (not admin-only), that wraps the backend data-portability endpoints. The section SHALL contain:

1. A short description of what the backup covers and what it does NOT cover (users, uploaded files).
2. Two download actions — "Export JSON" and "Export CSV" — that trigger a native browser download of the respective format.
3. An import area with a file picker, a confirmation text input, and a primary "Restore" button. The Restore button SHALL remain disabled until the confirmation input contains the literal string `RESTORE` (case-sensitive) AND a file has been picked.

#### Scenario: Exporting JSON

- GIVEN the operator clicks "Export JSON"
- WHEN the browser resolves the download
- THEN the user SHALL receive a file named `happy-calendar-backup-<timestamp>.json`
- AND the file SHALL be a well-formed v1 JSON envelope

#### Scenario: Exporting CSV

- GIVEN the operator clicks "Export CSV"
- WHEN the browser resolves the download
- THEN the user SHALL receive a file named `happy-calendar-backup-<timestamp>.zip`
- AND the archive SHALL contain a `manifest.json` and one `.csv` per entity

#### Scenario: Restore is gated by confirmation

- GIVEN the operator has picked a file
- AND the confirmation input is empty or contains anything other than `RESTORE`
- THEN the "Restore" button SHALL be disabled

- GIVEN the operator has picked a file AND typed `RESTORE` into the confirmation input
- THEN the "Restore" button SHALL be enabled
- WHEN the operator clicks it
- THEN the frontend SHALL POST the file to `/api/data-portability/import` and display either a success toast with the import summary or an inline error with the server's message

#### Scenario: No file picked

- GIVEN the operator has typed `RESTORE` but not selected a file
- THEN the "Restore" button SHALL be disabled
