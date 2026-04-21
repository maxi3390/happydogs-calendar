# Proposal — pet-weight-input

## Intent

Replace the free-form `type="number"` weight field in the Pet form with a calculator-style input that always displays the value in `00.00` kg format and accepts digits right-to-left. This matches the way most scales display weight (value builds up from the least-significant digit) and removes a class of input errors where operators leave the decimal in an ambiguous position (e.g. `4` meaning 4 kg vs. 0.04 kg vs. 40 kg).

## Scope

### In scope

- A new `frontend/src/components/WeightInput.tsx` component that renders the weight in `NN.NN` format, grows when the kilogram part exceeds two digits (`654.32`, `6543.21`), and accepts digits keyed from the right.
- Replace the existing `<input type="number" step="0.1">` block inside `PetForm.tsx` with the new component.
- Clamp at the backend's `DecimalField(max_digits=6, decimal_places=2)` limit — i.e. at most `9999.99` kg. Extra digits beyond that SHALL be silently ignored to preserve round-trip correctness with the API.
- Support mouse / keyboard interactions: digit keys, `Backspace` / `Delete` for right-to-left removal, `Ctrl+V` paste parsed as a sequence of digits, `Ctrl+C` copy of the current display text.
- OpenSpec delta on `frontend/pets` describing the new interaction contract so the behavior is captured in the spec.

### Out of scope

- Negative weights. No pet has one; the component simply doesn't accept a `-` key or a negative initial value.
- Unit switching (lb vs. kg). The data model is kilograms; any display-unit feature is a future change.
- Applying the same widget to other decimal fields (e.g. "Dominance" is an integer, schedule times are time fields). Nothing else in the UI has a two-decimal weight-like field today.
- A Vitest / Jest setup for unit-testing the component. The repo runs only Playwright today; introducing a unit-test framework would expand the PR's surface. The spec's scenarios stand in as the behavioral contract.

## Approach

1. Track weight internally as **cents** (`Math.round(kg * 100)`), an integer. All arithmetic happens on that integer; the display derives from it. This eliminates floating-point drift issues.
2. Render `cents` as `(cents / 100).toFixed(2)` padded left to at least `NN.NN` (i.e. two digits before the decimal, or more if needed).
3. Use a controlled `<input type="text" inputMode="decimal">` and intercept keys in `onKeyDown`:
   - Digit `0–9`: `cents = cents * 10 + digit` (clamped to `999999`).
   - `Backspace` / `Delete`: `cents = Math.floor(cents / 10)`.
   - Navigation / selection / modifier keys pass through so copy/paste and focus behavior remain normal.
4. Emit `onChange(cents === 0 ? null : cents / 100)` so the form retains its existing "null means no weight set" semantic when the user erases everything.
5. Mirror the current form's visual style (same border / ring / background classes) to keep the visual identity.
