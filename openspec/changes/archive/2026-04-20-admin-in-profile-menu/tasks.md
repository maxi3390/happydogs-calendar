# Tasks

## 1. Navigation component
- [x] 1.1 Remove the top-level desktop Admin Link (including the `isAdmin &&` wrapper, icon, aria-current, styling block).
- [x] 1.2 Add an Admin Link inside the profile dropdown's `role="menu"` container between the Settings Link and the existing UI System Link. Admin-only, with the `Shield` icon colored `text-purple-500`, same menuitem class string as the sibling entries, `onClick` closes the dropdown.
- [x] 1.3 Confirm the mobile menu still lists Admin inside the authenticated user section (no change expected).

## 2. Spec updates
- [x] 2.1 `openspec/specs/frontend/navigation/spec.md`: remove the entire "Admin Destinations Are Top-Level For Admins" requirement.
- [x] 2.2 `openspec/specs/frontend/navigation/spec.md`: modify "Profile Dropdown Exposes User-Scoped Destinations" to include Admin (admin-only) in the enumeration; add a scenario for Admin visible in the dropdown for admins; add a scenario for Admin absent in the dropdown for non-admins.
- [x] 2.3 `openspec/changes/admin-in-profile-menu/specs/frontend/navigation/spec.md`: write the corresponding MODIFIED + REMOVED delta file.

## 3. E2E tests
- [x] 3.1 Delete the `Navigation (admin) → 'should expose the Admin top-level link for admin users'` test.
- [x] 3.2 Add a new `Navigation (admin) → 'should expose Admin in the profile dropdown and route to /admin/users'` test.
- [x] 3.3 Tighten `Public Navigation → 'should NOT expose authenticated destinations when signed out'` to drop the Admin assertion.
- [x] 3.4 Keep the non-admin "should NOT expose Admin in the header" test (still valid and now always-true).
- [x] 3.5 Keep the mobile admin test unchanged.

## 4. Verification
- [x] 4.1 `tsc --noEmit -p tsconfig.json` returns 0 errors.
- [x] 4.2 `docker compose build frontend` succeeds.
- [x] 4.3 Backend tests still 222/222.
- [x] 4.4 Manual: admin login → header primary nav shows only Calendar / Owners / Pets; profile dropdown lists Settings / Admin / UI System / Sign Out.
- [x] 4.5 Manual: non-admin login → header primary nav shows only Calendar / Owners / Pets; profile dropdown lists only Settings / Sign Out.
