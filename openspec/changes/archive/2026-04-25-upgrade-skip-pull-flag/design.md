# Design — `SKIP_PULL=1` for `make upgrade`

## Decision summary

| Decision | Choice | Why |
|----------|--------|-----|
| Opt-out by env var, not flag | `SKIP_PULL=1 make upgrade` | Mirrors the existing `SKIP_BACKUP=1` shape exactly. Operators don't have to learn a second pattern, and existing scripts that already run `SKIP_BACKUP=1 make upgrade` can append `SKIP_PULL=1` with zero ceremony. |
| Default behaviour unchanged | `git pull` runs unless skipped | Preserves the existing automation contract — CI / on-prem deploy scripts that rely on `make upgrade` pulling don't need updating. |
| Warning when skipped | Print `[2/5] WARNING: SKIP_PULL=1 set — skipping 'git pull' (using local code).` | Same convention as `SKIP_BACKUP`; makes the deviation visible in the upgrade log so a future "why did this deploy ship stale code?" investigation has a breadcrumb. |
| No fallthrough on pull failure | Step still uses bare `git pull` (no `\|\| true`) | Matches the spec scenario "Upgrade halts on git pull failure". An auth / merge-conflict / network failure should still abort the upgrade, not silently roll forward with stale code. |

## Why a flag and not deleting the pull

Two alternatives were considered and rejected:

- **Remove `git pull` from the upgrade target entirely.** Rejected. Many operators rely on `make upgrade` as a one-shot "fetch + deploy" command; making them remember to run `git pull` separately would silently regress behavior.
- **Detect "no upstream configured" and skip implicitly.** Rejected. Implicit skips are the kind of thing that swallow errors — if the upstream is misconfigured we want the operator to see a `git pull` failure, not have the upgrade quietly continue.

## Alternatives considered for the flag name

- `SKIP_PULL` — chosen. Verb-first, mirrors `SKIP_BACKUP`.
- `NO_PULL` — rejected. The negation reads slightly worse than `SKIP_*` and breaks the symmetry with the backup flag.
- `PULL=0` — rejected. Boolean env vars are easier to reason about as a presence-check (`= "1"` exactly), and `0` vs unset feels ambiguous for shell scripts that don't quote.

## Files touched

| Path | Change |
|------|--------|
| `Makefile` | Step 2 wrapped in `if/else` checking `SKIP_PULL`. |
| `AGENTS.md` | Commands table and upgrade prose paragraph mention the new flag. |
| `openspec/specs/tooling/upgrade/spec.md` (delta in change folder; merged into live spec on archive) | Extend the existing requirement to allow the opt-out; new scenario for the skip path. |

## Edge cases

- **Both flags set.** `SKIP_BACKUP=1 SKIP_PULL=1 make upgrade` runs only steps 3–5 (build, up, migrate). Both warnings print. No interaction between them — the conditionals are sibling blocks.
- **Pull fails because of merge conflict.** Without `SKIP_PULL`, the upgrade halts at step 2 with the git error — same as today. The new flag changes nothing for this case.
- **CI hand-off.** A CI pipeline that already runs `git pull` itself (e.g. through a checkout action) and then invokes `make upgrade` as the deploy step would benefit from `SKIP_PULL=1` to avoid the redundant fetch.
