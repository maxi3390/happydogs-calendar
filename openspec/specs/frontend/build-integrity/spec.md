# Frontend Build Integrity Specification

## Purpose

Define the invariants that keep the production frontend artifact buildable at every point in `master`. These invariants ensure `make upgrade` (which rebuilds the frontend Docker image) succeeds end-to-end, and that `tsc --noEmit` used by contributors locally reports the same errors as the production build.

## Requirements

### Requirement: `next build` Succeeds On `master`

Running `npm run build` (which delegates to `next build`) from `frontend/` on any commit of `master` SHALL complete with a zero exit status. This includes both the Next.js optimized build and the embedded TypeScript type check that `next build` performs.

#### Scenario: `make upgrade` rebuilds the frontend successfully

- GIVEN an operator on a clean `master`
- WHEN the operator runs `make upgrade`
- THEN the `docker compose build` step SHALL complete without error
- AND the embedded `npm run build` step SHALL exit with status 0

#### Scenario: Contributor can rebuild the frontend from master

- GIVEN a contributor with a clean `master` checkout
- WHEN the contributor runs `npm run build` inside `frontend/`
- THEN the command SHALL exit with status 0

### Requirement: Standalone `tsc` Agrees With `next build`

Running `tsc --noEmit -p tsconfig.json` from `frontend/` SHALL report zero errors on `master`, and SHALL surface the same errors that `next build` would reject. This property lets contributors iterate on TypeScript locally without needing to run the full Next.js build loop.

#### Scenario: Zero TypeScript errors on master

- GIVEN a clean `master` checkout
- WHEN a contributor runs `tsc --noEmit -p tsconfig.json`
- THEN the command SHALL exit with status 0

#### Scenario: `tsc` and `next build` diverge is fixed at the tsconfig level

- GIVEN a case where `next build` succeeds but standalone `tsc` fails (for example because Next.js auto-upgrades a compiler option)
- WHEN the divergence is detected
- THEN the fix SHALL update `tsconfig.json` so that both commands share the same contract
- AND the baseline `tsc` error count SHALL return to zero

### Requirement: `tsconfig.json` Target Matches Next.js Auto-Upgrade

The `compilerOptions.target` in `frontend/tsconfig.json` SHALL be set explicitly to the value Next.js would otherwise auto-upgrade to at build time (currently `es2017`). This prevents silent divergences between the production build and standalone tooling.

#### Scenario: Target is set explicitly

- GIVEN `frontend/tsconfig.json`
- WHEN the file is inspected
- THEN `compilerOptions.target` SHALL be present
- AND its value SHALL match the target that `next build` would otherwise write to disk

#### Scenario: No downlevel-iteration warnings

- GIVEN a TypeScript file that uses `[...new Set(...)]` or a for-of over an iterable
- WHEN the file is type-checked with `tsc --noEmit`
- THEN no error about `--downlevelIteration` or target < ES2015 SHALL be reported
