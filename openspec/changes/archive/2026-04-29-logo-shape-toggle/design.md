# Design — Logo shape toggle

## Default = circle, despite breaking historical visuals

The new field defaults to `'circle'`. We chose this over the more conservative `'square'` (which would preserve the current rendering) for two reasons:

1. **Most uploaded brand marks are round.** Pet-care nurseries tend to upload paw-print logos, mascot heads, or seal-style emblems that read better in a circle than in a rounded-corner rectangle. The previous square-framed rendering was the "no-shape-knob default", not a deliberate visual choice.
2. **The settings preview was already a circle.** Operators uploading a logo in the current code see a circular preview (because `ProfilePictureUpload` is hard-coded to `rounded-full`). The gap between "preview shows circle" and "header shows square" was a long-standing UX wart; defaulting to circle closes it.

Operators who prefer the historic look flip the toggle once. The change is one PATCH; nothing else moves.

## `object-cover` for circle, `object-contain` for square

The two shapes carry different fit semantics:

| Shape  | CSS                              | What the operator sees                                     |
|--------|----------------------------------|------------------------------------------------------------|
| Circle | `rounded-full` + `object-cover`  | Image fills the circle, edges cropped if the logo isn't square. |
| Square | `rounded-xl` + `object-contain`  | Image preserves aspect ratio inside a rounded rectangle, padding visible.|

These match the operator's mental model: a circle profile-picture-style mark is supposed to fill its frame; an icon-style logo on a coloured backdrop is supposed to keep its proportions. Pairing the two correctly avoids surprises like a wide logo "becoming" a circle that's actually a circular crop of its centre.

## `ProfilePictureUpload` gets an optional `shape` prop

The component is shared between three call sites: pet avatars, owner avatars, and the system-logo upload preview on `/settings`. Pet/owner avatars are conventionally circular and we don't want to disturb that contract. So the new prop defaults to `'circle'` — every existing call site stays visually identical — and only the `/settings` invocation passes the persisted `logo_shape`.

Inside the component, the prop drives three classes:
- `containerShapeClass`: `rounded-full` vs `rounded-2xl` (the latter is one notch rounder than the navigation `rounded-xl` so the preview reads as "framed image" rather than "icon button").
- `overlayShapeClass`: same shape as the container so the loading-spinner overlay tracks the clip.
- `imageFitClass`: `object-cover` vs `object-contain`.

Adding the prop instead of forking the component keeps the upload + delete + error-handling logic in one place.

## Navigation container sizing — why two different widths

Navigation has a paired requirement that doesn't apply elsewhere: the logo container has a coloured backdrop (`bg-primary`), and the colour matters as part of the brand identity even when no image is uploaded.

For the **square** shape we keep the historical pattern: container has `p-2` padding, image is fixed at `w-5 h-5 sm:w-6 sm:h-6`. The result is a small icon centred inside a ~36×36 / ~40×40 coloured tile.

For the **circle** shape we switch to a "fill the circle" model: container has explicit `w-9 h-9 sm:w-10 sm:h-10` and no padding, image fills it via `w-full h-full object-cover`. The result is a circular image with the full container occupied — exactly what an operator who picks "circle" expects.

We could have used `w-9 h-9 sm:w-10 sm:h-10` for the square shape too (matching dimensions) but that creates visual jitter when toggling, because the historical "square logo" relies on the padding to set its size. Keeping each shape's existing geometry meant no other surface needed to change.

## Why the toggle persists optimistically

Clicking square → circle is a tiny visual decision; making the operator wait for a network round-trip before the preview re-clips would feel sluggish. The settings page applies `setLogoShape(next)` synchronously, fires the PATCH, and only reverts on error. The previous-value capture (`const previous = logoShape`) handles the rare "PATCH 500" case; the operator's intent is never silently lost.

We chose not to render a "saving…" spinner or a "saved" pill: the visual feedback IS the preview re-clipping. A spinner would compete with that signal.

## `data-shape` attributes for testability

Both `nav-logo` and `login-logo` carry a `data-shape="<value>"` attribute. End-to-end tests could in principle assert against `class*="rounded-full"`, but Tailwind compiles classes into hashes in production builds (or could rename them in a future Tailwind version), so a stable data attribute is the safer contract. The attribute also doubles as documentation when reading the rendered DOM.

## Why we didn't add the shape field to the seed

The recently-added `SEED_NURSERY_SETTINGS` only manages `daily_booking_limit`. Adding `logo_shape` would force the seed to override the operator's choice on every reseed, which conflicts with the seed's "respect non-seed singleton fields" rule established in `feat/seed-overlap-multiday-and-overrides`. The model default (`'circle'`) is what fresh installs see anyway, so explicitly seeding it adds no value.

## Why `GET /api/settings/` stays public

The settings endpoint is intentionally public so the login page can fetch the logo before auth. We add `logo_shape` to the same response, which means the unauthenticated endpoint now leaks the operator's shape preference. That's not sensitive — the shape is visible to anyone who looks at the rendered login page anyway. The alternative (a separate authenticated endpoint just for the shape) would be over-engineered.
