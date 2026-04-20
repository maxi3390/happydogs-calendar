# Design: Move Admin Destination From Top-Level To Profile Dropdown

## Context

The `improve-nav-ux` change promoted `/admin/users` to a dedicated top-level nav link so administrators could reach user management in a single click, bypassing the profile dropdown. The intent was speed. In use, two things are now clear:

1. The primary nav has settled on three destinations (Calendar, Owners, Pets) that cover the daily work. Adding a fourth primary item only for admins creates asymmetry and extra visual noise, and the purple styling needed to distinguish it doesn't compose well with the green/slate palette already in use.
2. Admin work is occasional: user CRUD, seat management, audits. It doesn't need the same real estate as the core flows, and admins are already in the habit of opening the profile dropdown to reach Settings.

Moving Admin into the profile dropdown keeps it at one click for admins while restoring the three-destination primary nav for everyone. The profile dropdown becomes the single surface for every user-scoped destination (Settings, Admin, UI System, Sign Out).

## Decisions

### 1. Profile dropdown ordering: Settings → Admin → UI System → Sign Out

Within the dropdown, Settings stays first because every user has it. Admin sits second (admin-only) to emphasize its administrator scope without being the most prominent item. UI System remains third as a dev-tool. Sign Out is always last with its destructive (red) visual treatment.

This ordering reads naturally as "my preferences → my admin responsibilities → my dev affordances → leave", which matches how an admin mentally navigates the menu.

### 2. Preserve the Shield icon and color cue

Top-level Admin used a `Shield` lucide icon in purple. Inside the dropdown we keep the `Shield` icon but color it `text-purple-500` (matching the profile-menu "dev" convention of colored icons — Settings is amber, UI System is blue). This ties the dropdown entry visually to the purple role treatment used throughout admin (for instance on the admin badge on user rows).

Alternative considered: no color on the menu icon. Rejected — the other two menu entries already use colored icons as cues; making Admin grayscale would make it feel less intentional.

### 3. Mobile menu stays the same

The mobile hamburger already lists Admin inside the authenticated user section at the bottom. That section plays the role of the "user menu" on small viewports, with the same contents the desktop dropdown exposes. No change needed there.

Alternative considered: collapse the mobile menu's user section into a nested dropdown. Rejected — the mobile hamburger is already a single-column list, and mimicking the desktop's double-menu pattern on mobile adds interaction cost for no gain.

### 4. Spec delta shape

Two edits to `openspec/specs/frontend/navigation/spec.md`:

- REMOVE the entire "Admin Destinations Are Top-Level For Admins" requirement and its three scenarios. The requirement is no longer true and leaving it weakly worded ("may" / "may not") would be ambiguous.
- MODIFY the "Profile Dropdown Exposes User-Scoped Destinations" requirement so the enumeration includes Admin (admin-only) alongside Settings, UI System (admin-only), and Sign Out. Add a scenario for the new Admin menu entry and a scenario for its absence for non-admin users. Keep the existing UI System scenarios unchanged.

A standalone "New Schedule Global Shortcut" requirement stays untouched; Admin is a destination (covered by the profile-dropdown requirement), not a shortcut.

### 5. Test rewrites, not adds

`frontend/tests/navigation.spec.ts` currently asserts Admin is top-level for admins. We replace the assertion rather than add another, so the test suite expresses the new contract cleanly:

- Drop: `Navigation (admin) → 'should expose the Admin top-level link for admin users'`.
- Add: `Navigation (admin) → 'should expose Admin in the profile dropdown and route to /admin/users'`.
- Keep and reuse: the non-admin negative test (it now asserts Admin is absent in the header for all users, which becomes always-true when Admin is never in the header).
- Tighten: `Public Navigation → 'should NOT expose authenticated destinations when signed out'` — drop the Admin assertion since Admin is never in the header anymore; keep Owners and Pets assertions.

Mobile admin test stays untouched — it already asserts Admin inside the mobile auth section.

## Risks / Trade-offs

- **One extra click for admins** reaching `/admin/users`. That's the whole point: the primary nav gets three stable items. Admins who need frequent admin work can still pin the URL or use keyboard shortcuts; the change is about average UX.
- **Visual reshuffling** during deploy. Admins used to the purple top-level link will briefly hunt for it. The change is reversible (one commit revert) if the cost is too high in practice — the spec delta is small.
- **Mobile parity mismatch risk**: the mobile layout keeps Admin as a flat list item in the user section. That's acceptable because the mobile pattern already collapses everything into a scrollable list; adding a mobile profile dropdown just to match desktop would be over-engineering.
- **Non-admin-user regression risk is minimal**: the top-level rendering was already admin-gated, so non-admin users see no change.
