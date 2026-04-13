# Design: Theme System (Dark Mode)

## Technical Approach

The theme system provides **dark mode support** using Tailwind CSS's class-based dark mode strategy. A `ThemeToggle` component allows users to switch between light and dark themes, with the preference persisted in localStorage and system preference detection as the default for first-time users.

The implementation is lightweight and framework-native — it leverages Tailwind's built-in `dark:` variant classes rather than CSS-in-JS, CSS custom properties, or a theme provider library. The theme toggle is available in both desktop navigation and mobile hamburger menu for consistent accessibility.

## Architecture Decisions

### Decision: Tailwind CSS 'class' Strategy for Dark Mode

Dark mode uses Tailwind's **`darkMode: 'class'` configuration** rather than the `'media'` (prefers-color-scheme) strategy or a custom CSS variable system.

The `class` strategy applies dark mode when a `dark` class is present on an ancestor element (typically `<html>`). This provides **explicit user control** — users can choose dark mode regardless of their OS setting, and the choice is persisted. The `media` strategy would automatically follow the OS dark mode setting but provides no user override without additional JavaScript.

*Tradeoffs:* The `class` strategy requires JavaScript to add/remove the `dark` class, which means there's a brief flash of the wrong theme on initial page load if the theme preference doesn't match the default. This Flash of Incorrect Theme (FOIT) occurs because JavaScript runs after HTML renders. It's mitigated by injecting a `<script>` tag in the `<head>` that reads localStorage and sets the class before render, or by using Next.js's `beforeInteractive` strategy. The `media` strategy avoids FOIT entirely since the browser applies it natively, but sacrifices user control.

*Alternatives considered:* `darkMode: 'media'` (rejected: no user override, purely follows OS setting), CSS custom properties / design tokens (rejected: duplicates what Tailwind's `dark:` prefix does natively, adds maintenance burden of a variable system), styled-components/emotion ThemeProvider (rejected: incompatible with Tailwind utility-first approach, adds CSS-in-JS runtime cost).

### Decision: Sun/Moon Icons from Lucide React

The `ThemeToggle` component uses **Sun and Moon icons from Lucide React** to indicate the current theme state and the toggle action — Sun icon when in dark mode (click to switch to light), Moon icon when in light mode (click to switch to dark).

Lucide React is already a project dependency (used for other UI icons), so no additional bundle cost is incurred. The sun/moon metaphor is universally understood for theme toggling. Icons provide a compact toggle that works in both the desktop navbar and mobile menu without requiring text labels.

*Tradeoffs:* The icon-only toggle relies on the universal understanding of sun = light and moon = dark. While this is well-established, adding a tooltip ("Switch to dark mode") improves accessibility for screen readers and users unfamiliar with the convention. The component should include `aria-label` for accessibility.

*Alternatives considered:* Text toggle ("Light" / "Dark") (rejected: takes more space in navbar, less visually clean), toggle switch / checkbox (rejected: doesn't communicate what's being toggled without a label, takes more space), dropdown with theme options (rejected: over-engineering for a binary toggle, dropdown implies more than two options).

### Decision: Theme Class on HTML Root Element

The `dark` class is applied to the **`<html>` element** rather than `<body>`, a wrapper `<div>`, or individual component trees.

Tailwind's `dark:` variants look for the `dark` class on any ancestor. Placing it on `<html>` ensures every element in the document is within the dark mode scope, including elements rendered outside the React tree (e.g., portals, modals appended to `<body>`). The `<body>` element would miss `<html>`-level styles, and a React wrapper would miss portal-rendered content.

*Tradeoffs:* Modifying the `<html>` element from React requires either `document.documentElement.classList` manipulation (direct DOM access) or Next.js's `<html>` tag in the root layout. Direct DOM manipulation works but bypasses React's rendering model. In the root layout approach, the class can be set via a script, but dynamic toggling still requires DOM manipulation since the layout doesn't re-render on client state changes.

### Decision: localStorage Theme Persistence

The selected theme is persisted in **localStorage** under a dedicated key (e.g., `theme`), read on page load to restore the user's preference.

localStorage provides simple, synchronous persistence that survives browser sessions. The theme is read in a `<script>` tag or early in the component lifecycle to apply the correct theme before or immediately after the first paint.

*Tradeoffs:* localStorage is per-browser, not per-user. A user who logs in on a different device gets the default theme, not their preference. Server-side persistence (in user profile) would sync across devices but requires an authenticated API call before the theme can be applied, which is too late to prevent FOIT. A hybrid approach (localStorage for immediate application, synced with server preference when auth is available) would be ideal but adds complexity. For a single-location management tool where staff typically use the same workstation, localStorage persistence is sufficient.

*Alternatives considered:* Cookie-based persistence (considered: cookies are available server-side for SSR, avoiding FOIT, but add complexity with cookie management and GDPR considerations), user profile server-side persistence (rejected for initial implementation: requires auth before theme, delayed application), sessionStorage (rejected: doesn't persist across sessions, forces re-selection).

### Decision: System Preference Detection

On first visit (no localStorage preference), the theme **defaults to the user's OS/browser preference** detected via the `prefers-color-scheme` media query, using `window.matchMedia('(prefers-color-scheme: dark)')`.

This provides a sensible default that matches the user's existing preference without requiring manual selection. Users who have their OS in dark mode get dark mode automatically; light mode users get light mode. The detected preference is used only as the initial default — once the user explicitly toggles, their choice overrides the system preference.

*Tradeoffs:* System preference detection requires JavaScript (`window.matchMedia`), which isn't available during SSR. The detection runs on client mount, meaning the first render may use the wrong theme if the server-rendered HTML assumes a default. This is the same FOIT issue as the class strategy, mitigated by the head-script approach. Additionally, some users have OS dark mode but prefer certain apps in light mode (or vice versa) — the explicit toggle handles this.

### Decision: Availability in Desktop Nav and Mobile Menu

The `ThemeToggle` component is rendered in **both the desktop navigation bar and the mobile hamburger menu**, ensuring theme switching is accessible regardless of viewport size.

Responsive layouts typically show a full navbar on desktop and a collapsed hamburger menu on mobile. Placing the toggle in only one location would make it inaccessible on certain screen sizes. Rendering it in both ensures consistent access.

*Tradeoffs:* Two instances of the toggle must stay in sync — toggling in the mobile menu should immediately reflect in the desktop nav (and vice versa, if both are somehow visible). Since both read from the same state source (the `<html>` class and localStorage), they naturally stay in sync. The minor code duplication of rendering the component in two places is negligible.

## Data Flow

1. **Initial page load** -> Script in `<head>` reads `theme` from localStorage -> If found, applies `dark` class to `<html>` -> If not found, checks `window.matchMedia('(prefers-color-scheme: dark)')` -> Applies `dark` class accordingly -> Prevents FOIT
2. **ThemeToggle mount** -> Reads current theme from `<html>` class or localStorage -> Sets internal state to match -> Renders appropriate icon (Sun for dark mode, Moon for light mode)
3. **User toggles theme** -> Click handler toggles `dark` class on `document.documentElement` -> Updates localStorage with new preference -> Re-renders icon to match new theme -> All Tailwind `dark:` variants across the app respond immediately
4. **System preference change** (optional) -> `matchMedia` change listener detects OS theme change -> If no explicit user preference in localStorage, updates theme to match -> If user has explicit preference, system change is ignored

## Key Files

- **`src/components/ThemeToggle.tsx`** — Theme toggle component. Renders Sun/Moon icon button, handles click to toggle `dark` class on `<html>`, reads/writes localStorage preference, detects system preference for first-time default. Includes `aria-label` for accessibility. Used in both desktop navbar and mobile menu.
- **`tailwind.config.ts`** — Tailwind configuration. Sets `darkMode: 'class'` to enable class-based dark mode strategy. Defines color palette and design tokens that support both light and dark variants.
