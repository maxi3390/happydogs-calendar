# Delta for UI Components

## ADDED Requirements

### Requirement: Styled Scrollbar Utility

The UI library SHALL provide a `styled-scroll` utility class that applies a thin, theme-aware scrollbar to any scrollable container it is placed on. The utility SHALL use the application's theme tokens (`--border` for the thumb at rest, `--muted-foreground` for hover) so it adapts to both light and dark modes without further configuration.

#### Scenario: Utility styles Chromium scrollbars

- GIVEN an element with `overflow-y-auto` and the `styled-scroll` class
- WHEN rendered in a Chromium-based browser
- THEN its scrollbar SHALL render with an 8 px width, a transparent track, and a thumb colored with the border token
- AND the thumb SHALL change to the muted-foreground color on hover

#### Scenario: Utility styles Firefox scrollbars

- GIVEN an element with `overflow-y-auto` and the `styled-scroll` class
- WHEN rendered in Firefox
- THEN the scrollbar SHALL render with `scrollbar-width: thin` and a `scrollbar-color` combining the border token and a transparent track

#### Scenario: Utility adapts to dark mode

- GIVEN an element with the `styled-scroll` class
- WHEN the active theme is dark
- THEN the scrollbar colors SHALL pick up the dark-theme values of the `--border` and `--muted-foreground` tokens without additional configuration

#### Scenario: Scoped application — utility does not affect unmarked scrollbars

- GIVEN a scrollable element without the `styled-scroll` class
- WHEN the page renders
- THEN the element SHALL use the browser's default scrollbar styling
- AND the utility SHALL have no effect on it
