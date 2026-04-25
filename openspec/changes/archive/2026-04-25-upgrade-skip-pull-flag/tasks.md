# Tasks — `SKIP_PULL=1` for `make upgrade`

## Implementation

- [x] Replace `Makefile` step 2's bare `git pull` with the same `if [ "$${SKIP_PULL:-}" = "1" ]; ...` shape that step 1 uses for `SKIP_BACKUP`.
- [x] Verify with `make -n upgrade` (no env) that step 2 still runs `git pull` by default.
- [x] Verify with `SKIP_PULL=1 make -n upgrade` that step 2 prints the warning and skips the pull.

## Documentation

- [x] AGENTS.md: extend the `make upgrade` row in the commands table.
- [x] AGENTS.md: extend the upgrade-prose paragraph with the new flag.
- [x] OpenSpec change folder: delta spec under `specs/tooling/upgrade/spec.md` describing the opt-out scenario.

## Verification

- [x] `make help` still parses cleanly.
- [x] `make -n upgrade` dry-run outputs match the spec on both code paths.
