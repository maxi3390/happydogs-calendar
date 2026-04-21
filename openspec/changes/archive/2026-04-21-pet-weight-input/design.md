# Design — pet-weight-input

## State representation

| Layer           | Representation                                     |
|-----------------|----------------------------------------------------|
| Form / API      | `weight: number \| null` in **kilograms**         |
| Component state | `cents: number` (integer, `Math.round(kg * 100)`) |
| Display         | `(cents / 100).toFixed(2)` left-padded to `NN.NN` |

Internal arithmetic happens entirely on the integer `cents`. Floating-point conversions only occur at the two boundaries (reading `value` prop → `cents`, writing `onChange` → `kg`) and go through `Math.round` so `1234` cents always maps exactly to `12.34` kg and vice-versa. This eliminates the `0.1 + 0.2 !== 0.3` class of UI bugs.

## Formatting rule

```ts
function formatCents(cents: number): string {
  const str = (cents / 100).toFixed(2);        // "6.54"
  const [intPart, decPart] = str.split('.');
  return `${intPart.padStart(2, '0')}.${decPart}`;  // "06.54"
}
```

Examples from the proposal:

| cents  | display   |
|--------|-----------|
| 0      | `00.00`   |
| 6      | `00.06`   |
| 65     | `00.65`   |
| 654    | `06.54`   |
| 6543   | `65.43`   |
| 65432  | `654.32`  |
| 654321 | `6543.21` |
| 999999 | `9999.99` |

## Keyboard contract

| Key                 | Effect                                                        |
|---------------------|---------------------------------------------------------------|
| `0`–`9`             | `cents = Math.min(cents * 10 + digit, 999999)`               |
| `Backspace`         | `cents = Math.floor(cents / 10)`                              |
| `Delete`            | same as Backspace                                             |
| `Enter`             | pass through (lets the enclosing form submit)                 |
| `Tab`, arrows       | pass through (focus/nav)                                      |
| any modifier combo  | pass through (`Ctrl+V`, `Ctrl+C`, `Ctrl+A`, etc.)            |
| any other key       | `preventDefault()` — silently ignored                         |

The handler calls `preventDefault()` for the keys it consumes so the browser does not also insert the character into the text input.

## Paste contract

`onPaste` extracts digits only (`/\d+/g`). Each extracted digit is applied as a successive "type digit" operation, subject to the same clamp. A pasted string of `"1.234"` therefore produces `cents = 1234`, i.e. `12.34`. Non-digit characters are discarded. If the paste produces zero digits, the value is unchanged.

## Focus and selection behavior

The input is rendered without a selection-range attempt on every re-render (no `setSelectionRange` hacks). The native caret is irrelevant because every key press is intercepted. Visually the entire string updates as if the decimal point were fixed on-screen.

## Null semantics

- Initial `value === null` → `cents = 0`, display `00.00`. The placeholder-like rendering signals "no weight set" without the component injecting text of its own.
- On every `cents` mutation, the component emits `onChange(cents === 0 ? null : cents / 100)`. This preserves the form's existing "null when blank" contract: if the user backspaces all the way to zero, the form receives `null` again and the API call omits the field (or sends `null`, equivalently) on submit.

## Clamp at `999999`

The backend's `DecimalField(max_digits=6, decimal_places=2)` caps `weight` at `9999.99` kg. The input refuses to grow past that by ignoring digits that would push `cents` over `999999`. This matches the common calculator behavior of "input locked" at the display-length limit and spares the operator a 400 error from the API.

## Accessibility

- The component renders a `<label>` (via a `label` prop) associated with the input via `htmlFor` / `id`.
- `inputMode="decimal"` so mobile keyboards show a numeric keypad.
- `aria-label` falls back to the label text when no visible label is rendered.
- The input is keyboard-reachable in the normal tab order.

## Rejected alternatives

- **Keep `<input type="number">` and add a `blur` reformatter** — doesn't satisfy the user's ask (digits flow right-to-left as typed, not just on blur) and leaves floating-point drift on the boundary (e.g. `0.1 + 0.2`).
- **`inputmask` / third-party library** — we don't currently depend on one; a 100-line component is cheaper than a new dependency.
- **Store the value as a formatted string internally** — forces every digit operation to parse and reformat, opens floating-point drift, and complicates the clamp logic. The integer-cents representation is both simpler and exact.
- **Render as a display-only div with hidden input** — hurts accessibility (the caret and input contract disappear) and breaks keyboard users who expect the input to behave like one.
