# Tasks

## 1. Spec
- [x] 1.1 Create baseline `openspec/specs/frontend/navigation/spec.md` describing the nav contract (destinations, visibility, a11y, overlay behavior).
- [x] 1.2 Place the same content marked ADDED at `openspec/changes/improve-nav-ux/specs/frontend/navigation/spec.md`.

## 2. Navigation component
- [x] 2.1 Add a Calendar (`/`) top-level link in desktop nav, positioned before Owners.
- [x] 2.2 Add an admin-only top-level Admin (`/admin/users`) link.
- [x] 2.3 Add a UI System (`/ui-system`) entry in the profile dropdown, admin-only, with a distinct dev-tool icon.
- [x] 2.4 Keep Settings in the profile dropdown and in the mobile menu (no change in behavior).
- [x] 2.5 Replace the hardcoded "Admin" string with `t('nav.admin')` on both desktop and mobile.
- [x] 2.6 Use `t('nav.uiSystem')` for the new UI System entry.
- [x] 2.7 Add `aria-current="page"` on every active nav `Link` (desktop + mobile + logo when on `/`).
- [x] 2.8 Add `title` and `aria-label` to every icon-only element (md-width nav items, profile button, mobile toggle).
- [x] 2.9 Add a `keydown` handler that closes `mobileMenuOpen` / `profileMenuOpen` when ESC is pressed.

## 3. Translations
- [x] 3.1 Add `nav.admin` to `backend/translations/en.json` and `es.json`.
- [x] 3.2 Add `nav.uiSystem` to both files.
- [x] 3.3 Mirror both keys in `frontend/tests/helpers.ts` (both EN_TRANSLATIONS and ES_TRANSLATIONS mocks).

## 4. Tests
- [x] 4.1 `frontend/tests/navigation.spec.ts`: assert the Calendar link is visible in the desktop header and routes to `/`.
- [x] 4.2 Assert the top-level Admin link is visible for admin users and absent for regular users.
- [x] 4.3 Assert ESC closes the profile dropdown.
- [x] 4.4 Keep the existing Settings-via-profile-menu and mobile-menu assertions passing.

## 5. Verification
- [x] 5.1 `make test-backend` (or equivalent): 222/222 still pass.
- [x] 5.2 Frontend `tsc --noEmit` baseline: no new errors (baseline is 10 pre-existing).
- [x] 5.3 `python3 -c 'import json; json.load(open(p))'` on both translation JSONs.
