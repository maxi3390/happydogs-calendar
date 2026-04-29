# ADDED: Frontend / Settings

## ADDED Requirements

### Requirement: Logo shape toggle

The Settings page SHALL render a square / circle shape toggle alongside the system-logo upload control. The toggle SHALL reflect the persisted `logo_shape` from `GET /api/settings/` and SHALL persist the operator's selection via `PATCH /api/settings/update/` with `{ logo_shape: 'square' | 'circle' }`.

The active option SHALL be visually distinguished and SHALL carry `aria-checked="true"`. The toggle SHALL be implemented as a `role="radiogroup"` with two `role="radio"` buttons identified by `data-testid="logo-shape-square"` and `data-testid="logo-shape-circle"`. The upload preview rendered above the toggle SHALL re-clip immediately on change (optimistic update) so the operator sees the result without a save round-trip.

#### Scenario: Toggle reflects the persisted shape

- GIVEN the persisted `logo_shape` is `'square'`
- WHEN the operator opens `/settings`
- THEN the `logo-shape-square` button SHALL carry `aria-checked="true"`
- AND the `logo-shape-circle` button SHALL carry `aria-checked="false"`
- AND the upload preview SHALL carry `data-shape="square"`

#### Scenario: Selecting the inactive option persists and re-clips

- GIVEN the persisted `logo_shape` is `'circle'`
- WHEN the operator clicks `logo-shape-square`
- THEN a `PATCH /api/settings/update/` SHALL be issued with `{ logo_shape: 'square' }`
- AND the upload preview SHALL re-clip to the square shape immediately (before the network round-trip completes)
- AND on success, `logo-shape-square` SHALL carry `aria-checked="true"`
