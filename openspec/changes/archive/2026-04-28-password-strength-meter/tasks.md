# Tasks

## Setup
- [x] Create branch `feat/password-strength-meter`
- [x] Scaffold OpenSpec change folder

## Component
- [x] `frontend/src/components/PasswordStrengthMeter.tsx` — pure, prop-driven, 5-segment bar + label

## i18n
- [x] `password.strength.{label,veryWeak,weak,fair,strong,veryStrong}` in en.json + es.json
- [x] Mirror keys in `frontend/tests/helpers.ts` fallback

## Wiring
- [x] `/profile` page — meter under New password input
- [x] `/admin/users` reset-password modal — meter under New password input

## Tests
- [x] Playwright: 3 tests in `tests/password-strength.spec.ts` — severity transitions, no-block contract, admin reset modal

## Live spec
- [x] `openspec/specs/frontend/auth/spec.md` — Requirement for meter on /profile + 3 scenarios
- [x] `openspec/specs/frontend/user-management/spec.md` — Requirement for meter on the reset modal + 1 scenario

## Verification
- [x] `make test-frontend`: 130 passing (was 127, +3 new)
- [x] `make test-backend`: 493 still passing (unaffected)
- [x] TypeScript: clean

## Side fix
- [x] `scripts/run-e2e-tests.sh` and Makefile `e2e-up` now pass `--build` to `docker compose up` so frontend source changes propagate into the next test run (without it, an old frontend-e2e image masks new component changes)

## Commit
- [x] Single commit on the feat branch
- [x] Merged into master (operator approval received post-review)
