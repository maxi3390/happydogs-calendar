# Proposal: Move Admin Destination From Top-Level To Profile Dropdown

## Intent

The admin destination (`/admin/users`) is currently a top-level nav item for administrators, rendered next to Calendar/Owners/Pets with a distinctive purple style. After using the nav in practice, this placement is noisy: the admin area is an occasional-use surface, not a primary daily destination, and giving it the same visual weight as the three core destinations makes the header busier without helping admins. Moving Admin into the existing profile dropdown keeps it one click away, co-locates it with other user-scoped surfaces (Settings, UI System, Sign Out), and restores a cleaner three-destination primary nav.

## Scope

In scope:
- Remove the top-level desktop Admin link from `Navigation.tsx` (including its icon, purple styling, and aria-current wiring).
- Add an Admin entry to the profile dropdown between Settings and UI System, admin-only. Same icon (Shield), same translation key (`nav.admin`), same dropdown menuitem styling as the other entries.
- Update the `frontend/navigation` spec to reflect the new placement:
  - REMOVE the requirement "Admin Destinations Are Top-Level For Admins" (baseline).
  - MODIFY the requirement "Profile Dropdown Exposes User-Scoped Destinations" to include Admin (admin-only), alongside Settings, UI System (admin-only), and Sign Out.
- Update `frontend/tests/navigation.spec.ts` to cover Admin inside the profile dropdown instead of as a top-level link, and to assert its absence from the header's primary nav for all users.
- Keep the mobile menu structure unchanged: it already surfaces Admin within the authenticated user section at the bottom of the hamburger, which is the mobile equivalent of "the user menu".

Out of scope:
- Any change to the UI System link placement — it already lives in the profile dropdown; only its ordering changes (now Settings → Admin → UI System → Sign Out).
- Any change to the Calendar, Owners, Pets top-level items or the global New Schedule shortcut.
- Any change to `/admin/users` itself or the admin access rules (still admin-only at the page level).
- A visual redesign of the profile dropdown — the existing rounded card with menuitem rows is reused as-is.

## Approach

- The `Navigation` component currently wraps the desktop primary-nav cluster in an `{isAuthenticated && (<>…</>)}` fragment that contains four Links (Calendar, Owners, Pets, conditional Admin). Drop the Admin Link there.
- Inside the profile dropdown's `role="menu"` container, add a new admin-only Link rendered between the Settings Link and the existing UI System admin-only Link. The styling reuses the same `flex items-center gap-3 px-3 py-2 …` class string as Settings / UI System, with a `Shield` icon tinted `text-purple-500` to echo the previous top-level color cue inside the menu.
- On the mobile menu, the existing authenticated user section already renders Admin (and UI System) as separate bottom-stacked links. That's already "the user menu on mobile". No structural change.
- Spec update mirrors the implementation: remove the baseline requirement that mandated the top-level admin link; amend the profile-dropdown requirement's enumeration and add a scenario for the new admin entry and a scenario for its absence for non-admin users.
- E2E tests: delete the "top-level Admin link visible for admins" assertion; add an "Admin in profile dropdown" assertion behind `setupAuthAndLanguage(page, { admin: true })`; tighten the "NOT expose authenticated destinations when signed out" test so it only asserts on Owners and Pets (Admin was never going to be top-level for an unauthenticated user anyway, and removing the explicit admin check prevents it from becoming a lie).
