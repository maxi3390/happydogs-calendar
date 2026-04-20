# Proposal: Improve Navigation UX and Expose All Major Destinations

## Intent

The top navigation is the user's primary tool for orienting themselves and moving between the app's major destinations. Today it falls short on both counts: the home / Calendar page is reachable only by clicking the logo, the admin area hides behind a profile dropdown, the internal UI System page has no entry point at all, the "Admin" label is an untranslated hardcoded string, and the nav is partly inaccessible (no keyboard dismissal for overlays, icon-only buttons at mid-widths without accessible labels, no `aria-current` on the active link).

This change establishes an explicit navigation contract so every major destination is discoverable, and upgrades the existing header component to meet that contract.

## Scope

In scope:
- Introduce a new capability `frontend/navigation` with a baseline spec describing the header, its destinations, and its accessibility requirements.
- Promote the Calendar (home) destination to an explicit top-level link in desktop nav. The logo continues to link home as well.
- Promote Admin (`/admin/users`) to a top-level link that is visible **only to administrators**, so admins reach user management in one click.
- Add a UI System (`/ui-system`) entry inside the profile dropdown as an admin-only developer tool — today this page has zero entry points from the UI.
- Translate the "Admin" label (previously hardcoded) and add a new `nav.uiSystem` key.
- Keyboard accessibility: ESC closes the mobile menu and the profile dropdown.
- A11y: every nav item (icon-only at compact widths, or icon+label at wide widths) carries a `title`/`aria-label` and, when active, `aria-current="page"`.
- Update the Playwright navigation suite to cover Calendar in desktop nav, admin-only access, and ESC-close behavior. Preserve the existing mobile-menu assertions.

Out of scope:
- The page-specific "New Schedule" / "Multi-Pet Schedule" buttons passed in from the Calendar page (`onNewSchedule` / `onMultiPetSchedule`). They remain page actions, not nav items.
- Redesign of the settings area or adding a global "+" FAB for schedules — those are separate UX discussions.
- Authentication pages (`/login`, `/register`) keep their current header-less layout.
- Focus-trap inside overlays and full WAI-ARIA menubar semantics — nice-to-have, tracked as follow-up.

## Approach

- Establish `openspec/specs/frontend/navigation/spec.md` as the new capability baseline. The delta under `openspec/changes/improve-nav-ux/specs/frontend/navigation/spec.md` is marked ADDED because no prior navigation spec existed in the repo.
- In `frontend/src/components/Navigation.tsx`:
  - Add a `/` Calendar link to the desktop nav cluster, positioned before Owners.
  - Add an admin-only `/admin/users` top-level link for users with `isAdmin`; keep the Admin link out of the regular user's nav.
  - Keep Settings in the profile dropdown (it's a personal settings surface) and add a new UI System entry next to it that only renders when `isAdmin` is true.
  - Use `t('nav.admin')` and `t('nav.uiSystem')` instead of the current hardcoded "Admin".
  - Add a global `keydown` listener while either overlay is open to close on ESC.
  - Add `aria-current="page"` to active links (both `Link` components and buttons that route internally).
  - Add `aria-label` and `title` on every icon-only rendering of a nav item (desktop at `md` width, mobile toggle button, profile button).
- Extend `backend/translations/{en,es}.json` with `nav.admin` and `nav.uiSystem`; mirror both keys in `frontend/tests/helpers.ts` so the E2E translation mock stays in lockstep.
- Add two new Playwright assertions: Calendar is reachable from the desktop header; admin users see the top-level Admin link; the profile dropdown closes on ESC.
