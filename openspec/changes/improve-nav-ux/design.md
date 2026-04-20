# Design: Improve Navigation UX and Expose All Major Destinations

## Context

`frontend/src/components/Navigation.tsx` is the sticky header rendered on every authenticated page and on the public home page. It handles primary destinations, the theme/language toggles, the profile menu, a page-scoped "New Schedule" button, and the mobile hamburger. Today:

- The home / Calendar page has no explicit desktop link. The logo is the only way back. On mobile the hamburger menu shows a Calendar link (so there is already a precedent for treating it as a navigation destination).
- Settings lives in the profile dropdown on desktop (fine — it's user-personal) but on mobile it sits in the hamburger list (also fine).
- Admin lives in the profile dropdown on desktop and in the hamburger on mobile. Its label is hardcoded `"Admin"`, breaking i18n.
- The UI System page (`/ui-system`) has no entry point in the nav; the only way to visit it is by typing the URL.
- Icon-only items on the `md` breakpoint (768–1024 px) have no `title` / `aria-label`, so both hovering users and screen readers lose the label.
- Overlays (mobile menu, profile dropdown) close on outside click but not on ESC.
- No active indicator beyond color (no `aria-current="page"`).

The change raises the navigation to "discoverable and accessible" by default while keeping the existing visual language.

## Decisions

### 1. Define a dedicated `frontend/navigation` capability

Nav behavior is currently referenced in ad-hoc ways across pet/owner/calendar specs, but there is no central source of truth. Creating `openspec/specs/frontend/navigation/spec.md` as a first-class capability means future UX changes (e.g. a global search, a notifications tray) extend a real spec rather than re-deriving nav intent from scratch.

The delta file under `openspec/changes/improve-nav-ux/specs/frontend/navigation/spec.md` is ADDED, mirroring the baseline exactly since nothing existed before.

### 2. Primary destinations: Calendar, Owners, Pets — plus admin-only Admin

Authenticated users land on `/` (Calendar). Exposing Calendar as a top-level link:

- gives returning users a way to get home without "hunting for the logo",
- creates a clear three-item anchor (Calendar, Owners, Pets) that matches the app's mental model,
- keeps the logo as a secondary "home" affordance.

Admins additionally get a top-level Admin link. Rationale: admin-level actions (user management, nursery overrides) are core work for an admin, not a once-a-week visit. Hiding them behind the profile dropdown slowed the admin flow by a click per use. Guarded by the existing `isAdmin` context value.

Alternative considered: expose Admin to everyone and gate the page itself. Rejected — makes the nav noisier for the common user and duplicates the access check.

### 3. UI System enters the profile dropdown (admin-only)

`/ui-system` is a developer/maintenance page (the internal component library). It is not a user-facing feature, so it does not belong in the primary desktop nav. But it also should not be completely hidden (so new developers and admins can preview the design tokens).

Placement: inside the authenticated profile dropdown, visible only when `isAdmin` is true. It gets a code-like icon (Lucide `Code2`) to signal "dev tool" and is separated visually from Settings. On mobile, it appears at the bottom of the hamburger's "user" group so admins still reach it in a single flow.

Alternative considered: hide it behind an environment flag or a `?dev=1` URL parameter. Rejected — admins legitimately want to audit the styling and shouldn't need tribal knowledge to find it.

### 4. i18n: translate "Admin", add `nav.uiSystem`

Two new keys:

- `nav.admin` — "Admin" (en) / "Administración" (es)
- `nav.uiSystem` — "UI System" (en) / "Sistema de UI" (es)

The existing `nav.settings`, `nav.calendar`, `nav.owners`, `nav.pets` keys already cover the rest. `frontend/tests/helpers.ts` holds a duplicated mock of the translation catalogue; it MUST be updated to include the new keys, otherwise E2E tests receive the raw dot-path string.

### 5. Accessibility upgrades

- **ESC closes overlays**: a single `useEffect` subscribes to `keydown` while either `mobileMenuOpen` or `profileMenuOpen` is true, and closes whichever overlay responded. Cheaper than instrumenting each overlay separately and matches the user expectation across the app.
- **`aria-current="page"` on active items**: implemented by extending `isActive(path)` to return the attribute value or `undefined`. This lets assistive tech identify the current location without relying on the visual active style.
- **Labels when compact**: every icon-only rendering (nav items at `md` width, the profile button, the mobile toggle) receives `title` + `aria-label` based on the same translation key the label would use. At `lg+` the label text is shown inline but `title`/`aria-label` stays — duplicating the visible text is harmless and keeps the code simple.
- **Focus management**: we do NOT implement a focus trap yet. ESC-close + click-outside is the baseline; full trap semantics live as a follow-up capability.

### 6. Keep page-specific buttons as props

`onNewSchedule` and `onMultiPetSchedule` are injected from the Calendar (home) page. They are actions, not destinations. They stay as optional callbacks on the Navigation component and are *not* referenced by the new nav spec. Attempting to hoist them to nav items would require the nav to know about schedule state, reversing the current dataflow.

### 7. No public-view changes beyond accessibility

Unauthenticated users see the same header minus user-specific surfaces (only logo + language + theme + "Sign In"). The new a11y upgrades still apply (aria-label on icon buttons, aria-current on the logo when on `/`). No new public destinations are introduced.

### 8. Tests

- Extend `frontend/tests/navigation.spec.ts`:
  - Assert the Calendar link is visible in the desktop header.
  - Assert the Admin top-level link is visible for admin users and absent for regular users (admin setup uses the existing `setupAuthAndLanguage(page, { admin: true })`).
  - Assert ESC closes the profile dropdown.
  - Keep the existing "sign out lives in profile menu" and mobile-menu assertions.

## Risks / Trade-offs

- **Existing Playwright navigation tests rely on the current structure**. Adding new links adds new DOM elements; the tests that use `a[href="/pets"]` and friends continue to work. Only the profile-menu test may be affected if we change the dropdown width — mitigated by keeping the existing Settings link in place.
- **Mobile menu footprint**: two extra items (Admin, UI System) only render for admins; regular users see the same length of list as today.
- **Translation helper drift**: the E2E mock is the #1 source of "translations look like dot paths" bugs. Listed explicitly in the tasks.
- **ESC semantics**: ESC closes only the most recently opened overlay in the typical usage pattern. If both are open at once (shouldn't happen given the UI — one appears only on mobile, the other on desktop), ESC will close both in the same render pass. Acceptable.
- **`aria-current` on internal-route Links**: Next.js `Link` doesn't set it automatically. We compute it from `usePathname()`, same as the existing active-style logic.
