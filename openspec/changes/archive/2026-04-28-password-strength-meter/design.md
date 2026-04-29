# Design: password-strength meter

## Decisions

### Hand-rolled scorer, not `zxcvbn-ts`

`zxcvbn-ts` is the gold-standard JS strength estimator (port of Dropbox's zxcvbn). It catches "Password1!" as weak, recognises keyboard patterns ("qwerty"), runs against a 50k-common-passwords dictionary, and produces calibrated estimates. It also adds **~250KB minified, ~70KB gzipped** to the bundle for two forms.

We're not running `npm audit` in production today; the bundle is what's served to every user on every page. A 70KB dependency for "tell people the difference between bad and good passwords" doesn't pencil out. Hand-rolled scorer is ~30 lines and gets us 90% of the value:

```ts
function scorePassword(value: string): number {
  if (!value) return 0;
  if (value.length < 8) return 1;
  let classes = 0;
  if (/[a-z]/.test(value)) classes++;
  if (/[A-Z]/.test(value)) classes++;
  if (/\d/.test(value)) classes++;
  if (/[^A-Za-z0-9]/.test(value)) classes++;
  if (classes === 1) return 2;
  if (classes === 2) return 3;
  if (classes === 3) return 4;
  if (classes === 4 && value.length >= 12) return 5;
  return 4;  // 4 classes but < 12 chars: still strong, not very-strong
}
```

If real-world abuse data shows we need better resistance to dictionary-style passwords, we can swap in `zxcvbn-ts` later — the component's contract (prop in, score-driven render out) stays the same.

### Meter is advisory, not blocking

Server-side validation is the source of truth (`AUTH_PASSWORD_VALIDATORS` in `nursery/settings.py`). The meter shows a label so the user knows where they stand; it does NOT disable the submit button below score N. Three reasons:

1. **Two enforcement paths diverge.** A frontend block at score≥3 plus a backend reject at common-password check means the same input gets two different rejection messages on the two paths. Confusing.
2. **Server is the only path that's reachable from non-browser callers** (curl, scripts, future mobile clients). The meter has to be additive UX, not part of the security model.
3. **Operators reset passwords for other users.** If the meter blocks, an admin trying to set a temporary password to "Welcome2026" gets a frontend block before the server has a chance to weigh in.

### Meter hidden on empty input

When `value === ''` we return `null` — no meter renders. This avoids visual jitter on initial render (empty form → nothing) and on the post-success reset (form clears, meter disappears). The label only appears when there's something to score.

### Component contract

```tsx
interface PasswordStrengthMeterProps {
  value: string;
  /** Optional id used to label-associate with the input above. */
  inputId?: string;
}
```

Pure, no state. Renders a 5-segment horizontal bar plus a label paragraph beneath it. The segments "fill" up to the current score; segments above the score render with `bg-muted/40` (dim) so the bar always shows the full 5-segment total even when score is low.

### Colours

- Score 1 (Very weak): `bg-red-500` segment + `text-red-600` label.
- Score 2 (Weak): `bg-orange-500` + `text-orange-600`.
- Score 3 (Fair): `bg-yellow-500` + `text-yellow-700`.
- Score 4 (Strong): `bg-emerald-500` + `text-emerald-600`.
- Score 5 (Very strong): `bg-green-600` + `text-green-700`.

Dark-mode variants follow the project's existing convention (the colour tokens already work in both themes via the Tailwind config).

### i18n

Six keys in the `password.strength` namespace:

- `password.strength.label` — "Strength:" prefix on the descriptor line.
- `password.strength.veryWeak` / `weak` / `fair` / `strong` / `veryStrong`.

Stored in `backend/translations/{en,es}.json` (the canonical translations) and mirrored as fallbacks in `frontend/tests/helpers.ts`. Phase 1 ensured the helper fetches live translations, so the mirror is just a safety net.

### Where to put the component file

`frontend/src/components/PasswordStrengthMeter.tsx`, at the top level — same as `Input`, `Button`, etc. It's reusable across pages, not tied to a specific feature directory.

### Wiring on `/profile`

The new-password input lives in `frontend/src/app/profile/page.tsx`. We render `<PasswordStrengthMeter value={newPassword} />` directly below the input's label/error block, in the same `<div>` so they share spacing.

### Wiring on the admin reset modal

The reset-password modal lives in `frontend/src/app/admin/users/page.tsx`. Same approach: meter below the new-password input.

## Alternatives considered

- **`zxcvbn-ts` (rejected for bundle cost; covered above).**
- **A separate "Strength" tooltip instead of an inline meter.** Tooltips don't communicate severity. Inline bar reads at a glance.
- **Meter blocks Save below score 3.** Rejected; covered in "advisory not blocking" above.
- **Single text label, no bar.** Bar gives a glanceable, non-text signal that's particularly valuable in dense forms.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Meter says "Strong" but server rejects via `CommonPasswordValidator`. | Acceptable: the server is the authority. The meter never claimed to be canonical; the user just gets a clearer message AFTER the reject ("password too common"). |
| Hand-rolled scorer accepts genuinely-weak passwords (e.g., `Welcome1!` scores 4). | Acceptable for v1; this is a UX hint not a security gate. If we need higher fidelity later, swap to `zxcvbn-ts` behind the same component prop interface. |
| Spanish "Muy débil" / "Muy fuerte" wraps awkwardly on narrow viewports. | The label sits on its own line below the bar; word wrap handles it gracefully. |
