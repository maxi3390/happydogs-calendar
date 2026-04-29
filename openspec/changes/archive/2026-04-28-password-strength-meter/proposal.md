# Password-strength meter on /profile and the admin reset modal

## Why

Today both password forms — `/profile` (self-service change) and `/admin/users` (admin reset) — accept any string ≥ 8 characters and rely on Django's server-side validators (`AUTH_PASSWORD_VALIDATORS`) to reject weak ones. Server validation works, but the operator and the user only see the rejection AFTER hitting Save. A live strength indicator gives a faster signal: type, see colour and label update, decide to keep typing.

This is purely a UX hint — the server still has final authority. We do NOT block submission based on the meter; weak passwords still go to the server, where Django's validators enforce policy.

## What

1. **New component `frontend/src/components/PasswordStrengthMeter.tsx`** — a pure, prop-driven bar with five segments and a label. Hand-rolled scorer (no `zxcvbn-ts` dep) keyed on length + character-class diversity:

   | Score | Criteria | Label key |
   |---|---|---|
   | 0 | empty input | (meter hidden) |
   | 1 | < 8 chars | `password.strength.veryWeak` |
   | 2 | ≥ 8 chars, 1 character class | `password.strength.weak` |
   | 3 | ≥ 8 chars, 2 character classes | `password.strength.fair` |
   | 4 | ≥ 8 chars, 3 character classes | `password.strength.strong` |
   | 5 | ≥ 12 chars, all 4 classes | `password.strength.veryStrong` |

   Character classes: lowercase letters, uppercase letters, digits, symbols. The five segments fill in red → orange → yellow → emerald → green as the score climbs.

2. **Wired into `/profile`'s "New password" input.** Renders below the input, hidden when value is empty.

3. **Wired into `/admin/users`' reset-password modal "New password" input.** Same component, same behaviour.

4. **i18n** — six new keys (`password.strength.label` plus the five severity labels) added to `backend/translations/{en,es}.json` and the `frontend/tests/helpers.ts` mock fallback.

5. **Live specs** — the auth + user-management front-end specs gain a Requirement covering the meter's presence and behaviour.

## Impact

- **Smaller submission feedback loop.** Users / admins see "Very weak" the moment they type `password`, well before clicking Save and getting a 400 back.
- **No bundle-size hit.** Hand-rolled scorer is ~30 lines; no new dep.
- **No backend change.** Server still validates; the meter is advisory only.
- **No behaviour change for empty / pre-fill state.** When the input is empty (initial render, after submit clears the form, etc.) the meter doesn't render. No visual jitter.

## Out of scope

- **`zxcvbn-ts` integration.** A higher-fidelity scorer that catches "Password1" as weak — useful, but adds ~250KB to the bundle for two forms. Worth doing later if password posture becomes a stated priority.
- **Blocking submission below score N.** The server validates; the meter informs. Adding a block would diverge the two paths (frontend block vs server reject) and confuse users who run into one without the other.
- **Strength feedback for the password input on `/login` / `/register`.** Login is "verify what you have"; register is account creation, where the strength meter would be useful — but that's a third surface and a separate piece of work.
- **Password visibility toggle next to the meter.** The forms already have eye-toggles on their type=password inputs; the meter sits independently below.
