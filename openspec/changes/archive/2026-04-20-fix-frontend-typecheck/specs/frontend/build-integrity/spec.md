# Delta for Frontend Build Integrity

This capability is introduced by this change. All requirements below are ADDED.

## ADDED Requirements

### Requirement: `next build` Succeeds On `master`

Running `npm run build` from `frontend/` on any commit of `master` SHALL complete with a zero exit status.

#### Scenario: `make upgrade` rebuilds the frontend successfully

- GIVEN an operator on a clean `master`
- WHEN the operator runs `make upgrade`
- THEN the `docker compose build` step SHALL complete without error
- AND the embedded `npm run build` step SHALL exit with status 0

### Requirement: Standalone `tsc` Agrees With `next build`

Running `tsc --noEmit -p tsconfig.json` from `frontend/` SHALL report zero errors on `master`, and SHALL surface the same errors that `next build` would reject.

#### Scenario: Zero TypeScript errors on master

- GIVEN a clean `master` checkout
- WHEN a contributor runs `tsc --noEmit -p tsconfig.json`
- THEN the command SHALL exit with status 0

### Requirement: `tsconfig.json` Target Matches Next.js Auto-Upgrade

The `compilerOptions.target` in `frontend/tsconfig.json` SHALL be set explicitly to the value Next.js would otherwise auto-upgrade to at build time (currently `es2017`).

#### Scenario: Target is set explicitly

- GIVEN `frontend/tsconfig.json`
- WHEN the file is inspected
- THEN `compilerOptions.target` SHALL be present and match Next.js's auto-upgrade value
