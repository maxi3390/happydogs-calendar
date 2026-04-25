# MODIFIED: Tooling / Upgrade

## MODIFIED Requirements

### Requirement: Single-Command System Upgrade

The system SHALL provide a `make upgrade` target that performs a complete upgrade of a running deployment in the correct order.

The target SHALL execute, in sequence:

1. `make backup` — produce a full gzipped pre-upgrade database snapshot under `backups/` (see the `tooling/backup` capability). This step MAY be skipped by exporting `SKIP_BACKUP=1`; when skipped the target SHALL print a visible warning.
2. `git pull` — fetch the latest commits from the current branch's upstream. This step MAY be skipped by exporting `SKIP_PULL=1`; when skipped the target SHALL print a visible warning and proceed with the current local working tree.
3. `docker compose build` — rebuild images (leveraging Docker's layer cache)
4. `docker compose up -d` — recreate containers whose image hash changed
5. `docker compose exec backend python manage.py migrate` — apply any pending Django migrations

If any step fails (and is not opted out), the target MUST stop immediately and surface the failing command's exit code. Subsequent steps MUST NOT run.

## ADDED Requirements

### Requirement: Upgrade SHALL skip `git pull` on explicit `SKIP_PULL=1` opt-out

When the operator runs `make upgrade` with the `SKIP_PULL` environment variable set to `1`, step 2 SHALL be skipped: `git pull` MUST NOT be invoked, the target SHALL emit a visible warning that the pull was skipped, and the remaining steps (3–5) SHALL run as if step 2 had succeeded.

The opt-out SHALL be independent of `SKIP_BACKUP`. Setting one, both, or neither SHALL each produce the documented behavior for those steps individually.

#### Scenario: Upgrade skips git pull on explicit opt-out

- GIVEN the operator has already pulled the latest code by hand (or is rebuilding deliberately against the current local tree)
- WHEN the operator runs `SKIP_PULL=1 make upgrade`
- THEN step 2 SHALL emit a warning that the pull was skipped
- AND `git pull` SHALL NOT be invoked
- AND the remaining steps (build, up, migrate) SHALL run normally

#### Scenario: Both opt-outs combine

- GIVEN the operator has already taken a backup AND already pulled the latest code by hand
- WHEN the operator runs `SKIP_BACKUP=1 SKIP_PULL=1 make upgrade`
- THEN step 1 SHALL emit the backup-skipped warning
- AND step 2 SHALL emit the pull-skipped warning
- AND steps 3–5 (build, up, migrate) SHALL run normally
