# Logo shape toggle (square / circle)

## Why

The system logo currently renders the same way wherever it appears: a small icon-style image inside a rounded-corner rectangle (navigation header, login page) or a circular profile-picture preview (settings page upload). Operators with a circular brand mark have no way to make the navigation/login look right — their round logo is squeezed into a square frame — and operators with a wide rectangular logo see a circular preview during upload that misrepresents how the logo actually appears in the header.

The fix is a tiny per-install toggle: pick the silhouette (square or circle) once on `/settings`, and have every consumer of the logo respect that choice. The two shapes also correspond to two different image-fit semantics — square = `object-contain` (preserve aspect ratio), circle = `object-cover` (crop to fill) — which matches the user expectation when they pick each option.

## What

1. **Backend**: new `NurserySetting.logo_shape` field (CharField, choices `'square'` / `'circle'`, default `'circle'`). Migration `0005_nurserysetting_logo_shape` uses `AddField` with the model default, so existing rows pick up `'circle'` automatically on upgrade.
2. **Serializer**: expose `logo_shape` on `GET /api/settings/` (intentionally public — login page needs it before auth) and accept it via `PATCH /api/settings/update/`.
3. **Frontend type + helpers**: `LogoShape = 'square' | 'circle'` exported from `domain/settings/types`; `ProfilePictureUpload` gains an optional `shape` prop (default `'circle'` so existing pet/owner avatar usages stay unchanged).
4. **Settings page**: square / circle toggle (`role="radiogroup"` with two `role="radio"` buttons) under the logo upload card. Optimistic update — the preview re-clips immediately on click; PATCH persists in the background.
5. **Navigation header**: container is `rounded-full` (with `w-9 h-9 sm:w-10 sm:h-10` so the image fully fills the circle) when shape is circle, or the existing `p-2 rounded-xl` icon-button look when shape is square. Image fit is `object-cover` for circle, `object-contain` for square.
6. **Login page**: matches navigation — `rounded-full` with `w-16 h-16 sm:w-20 sm:h-20` for circle, existing `p-3 sm:p-4 rounded-2xl` for square.
7. **i18n**: `settings.logoShape`, `settings.logoShapeSquare`, `settings.logoShapeCircle`, `settings.logoShapeInfo` in both `en.json` and `es.json`.
8. **Tests**:
   - Backend: 7 new tests in `LogoShapeAPITest` (field exposure on GET, default value, PATCH round-trip both ways, unknown-value rejection, upload-doesn't-clobber, public GET includes the field).
   - Playwright: 7 new tests in `tests/logo-shape.spec.ts` covering the settings toggle UI, the navigation logo's `data-shape`, and the login logo's `data-shape`. All use `page.route` mocks so the suite stays deterministic.
9. **Live spec**: extend `backend/settings`, `frontend/settings`, `frontend/navigation` with new Requirements + scenarios.

## Impact

- **Visible behaviour change for existing installs**: the new field defaults to `'circle'`, so any install that already has a logo will see it re-clipped to a circle on first page load after upgrade. This matches the operator-facing UX answer ("default circle"); operators who prefer the historic square look flip the toggle once on `/settings` and the change is one PATCH away.
- **No data loss**: `logo_shape` is independent of the logo file. Uploading a logo doesn't touch the shape; flipping the shape doesn't touch the logo. `--reset` paths (out of scope for this change) do not need to clean up the field — the default applies.
- **`ProfilePictureUpload` is shared with pet/owner avatars**. The new `shape` prop defaults to `'circle'`, so every existing call site keeps its current visual without code changes.
- **Live spec**: `backend/settings` gains a "System Logo Shape" Requirement; `frontend/settings` gains a "Logo shape toggle" Requirement; `frontend/navigation` gains a "Logo shape mirrors the operator's setting" Requirement.
- **Migration** is additive (`AddField`), reversible via Django's auto-generated `RemoveField`. No data migration required.

## Out of scope

- **Logo cropping UI**. Operators who upload a wide rectangular logo and pick "circle" will see edges cropped (because `object-cover`). A pre-upload crop tool would be a separate, much larger change.
- **Per-page shape overrides**. The shape is a single per-install value; we don't expose a different shape on the login page than the navigation header. If a future requirement justifies that, it'd be a new field.
- **A "no shape / inline" mode**. We considered a third option that strips the colored container entirely, but that breaks the existing visual identity (a coloured backdrop is part of the brand) and isn't requested. Stays a square/circle choice.
- **Backend admin form**. The Django admin panel renders the field with the auto-generated `Select` widget; no special widget customisation needed.
