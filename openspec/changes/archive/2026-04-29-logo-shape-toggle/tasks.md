# Tasks

## Setup
- [x] Create branch `feat/logo-shape-toggle`
- [x] Scaffold OpenSpec change folder

## Backend (`backend/nursery_settings/`)
- [x] `models.py` — add `logo_shape` CharField (choices `square`/`circle`, default `circle`) + class-level constants for the choices
- [x] Migration `0005_nurserysetting_logo_shape.py` — `AddField` with the model default (existing rows pick up `circle` automatically)
- [x] `serializers.py` — include `logo_shape` in the field list
- [x] `tests.py` — `LogoShapeAPITest` class with 7 tests (field exposure, default value, PATCH both ways, unknown-value rejection, upload-doesn't-clobber-shape, public GET includes the field)

## Frontend type + helper
- [x] `domain/settings/types.ts` — export `LogoShape = 'square' | 'circle'`; add to `NurserySetting` interface
- [x] `components/ProfilePictureUpload.tsx` — optional `shape` prop (default `'circle'`), threading the shape to container + overlay + image-fit classes; `data-testid="picture-preview"` + `data-shape="<value>"`

## Frontend Settings page
- [x] `app/settings/page.tsx` — read `logo_shape` from settings on load; thread to `ProfilePictureUpload`; render the radiogroup toggle below the upload (square / circle buttons with `aria-checked`, `data-testid="logo-shape-square"` / `data-testid="logo-shape-circle"`)
- [x] Optimistic-update handler (`handleSelectLogoShape`) that flips state, fires PATCH, reverts on error
- [x] Upload handler updated to also sync the shape from the upload response (defensive — keeps local state aligned if the operator changed shape elsewhere)

## Frontend Navigation header
- [x] `components/Navigation.tsx` — fetch `logo_shape` alongside `logo_url`; render `rounded-full` + `object-cover` (with explicit `w-9 h-9 sm:w-10 sm:h-10` so the image fills the circle) when shape is circle; keep historical `p-2 rounded-xl` + `object-contain` for square; `data-testid="nav-logo"` + `data-shape="<value>"`

## Frontend Login page
- [x] `app/login/page.tsx` — same shape-aware rendering (`rounded-full` + `w-16 h-16 sm:w-20 sm:h-20` for circle, `p-3 sm:p-4 rounded-2xl` for square); `data-testid="login-logo"` + `data-shape="<value>"`

## i18n (`backend/translations/`)
- [x] `en.json` — `settings.logoShape`, `settings.logoShapeSquare`, `settings.logoShapeCircle`, `settings.logoShapeInfo`
- [x] `es.json` — Spanish equivalents

## Playwright tests
- [x] `frontend/tests/logo-shape.spec.ts` — 7 tests covering settings toggle (3 incl. PATCH round-trip), navigation `data-shape` (2), login page `data-shape` (2)

## Live spec
- [x] `openspec/specs/backend/settings/spec.md` — new "System Logo Shape" Requirement with 5 scenarios
- [x] `openspec/specs/frontend/settings/spec.md` — new "Logo shape toggle" Requirement with 2 scenarios
- [x] `openspec/specs/frontend/navigation/spec.md` — new "Logo shape mirrors the operator's setting" Requirement with 3 scenarios

## Verification
- [x] `make test-backend` passes — 528 passing (was 521; +7 new in `LogoShapeAPITest`)
- [x] `make lint` clean
- [x] Full Playwright suite passes — 151 passing (was 138; +13 new across the toggle, fill-container, and first-paint-cache specs)

## Commit
- [x] Single commit on `feat/logo-shape-toggle`
- [x] Merged into master (operator approval received post-review)
