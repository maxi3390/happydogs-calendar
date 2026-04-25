# Add `SKIP_PULL=1` opt-out flag to `make upgrade`

## Why

`make upgrade` runs `git pull` as step 2 of its 5-step pipeline. There are several legitimate situations where the operator wants to keep the rest of the pipeline (backup → build → up → migrate) but skip the pull:

- They've already pulled by hand on a feature branch and want to rebuild without a redundant fetch.
- They're rebuilding against a deliberately-pinned local commit (e.g. a hotfix being staged).
- The remote is unreachable or rate-limited and they just want the local code to roll out.

Today the only escape hatch is to comment out the `git pull` line in the Makefile, which is destructive (you're modifying a tracked file) and easy to forget to revert.

## What

Mirror the existing `SKIP_BACKUP=1` opt-out: when `SKIP_PULL=1` is set, the upgrade target SHALL print a visible warning and skip the `git pull` step. All other steps run normally.

## Scope (in)

- Makefile: wrap step 2 in the same `if [ "$${SKIP_PULL:-}" = "1" ]; then ... else git pull; fi` shape that step 1 already uses for `SKIP_BACKUP`.
- AGENTS.md: short note in the Makefile commands table and the upgrade prose paragraph.
- `openspec/specs/tooling/upgrade/spec.md`: extend the existing requirement to cover the new opt-out, plus a new scenario.

## Scope (out)

- No changes to step 1 (`SKIP_BACKUP`), step 3 (`build`), step 4 (`up`), or step 5 (`migrate`).
- No new tests — the spec scenarios cover the contract; the underlying behavior is a single shell conditional that's trivially correct.
- No combination flag (e.g. `SKIP=pull,backup`) — `SKIP_PULL=1 SKIP_BACKUP=1 make upgrade` already composes naturally.

## Approach

1. Replace step 2's hardcoded `git pull` with the same `if/else` skip-flag shape used by step 1's `SKIP_BACKUP`.
2. Update AGENTS.md and the upgrade spec to document the new flag and its scenario.
