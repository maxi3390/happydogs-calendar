# Notifications Playwright coverage

## Why

The notifications system shipped with full backend coverage (63 tests) but zero frontend E2E tests. The recent `compatibility_warnings`-flag bug — where the schedule submit button stayed labelled "Schedule Anyway" because a hidden bit of state bled into a button label — is exactly the kind of "the visible UI doesn't match the flag state" regression that's untestable without an end-to-end run.

Three surfaces are at risk and have no test today:

1. **Bell badge in `Navigation`** — does it render? Does it count? Does it disappear when the master flag is off?
2. **`/notifications` page** — do rows render with the right localised one-liner? Do the per-row Mark / Dismiss buttons hit the API and clear from the list? Does Mark-all-read disable itself when there's nothing to mark?
3. **Forward-to-owner deep links** — do the `mailto:` and `api.whatsapp.com/send` URLs include the operator's template content with the row's payload interpolated? Are the buttons hidden when the owner's contact info is missing? Are they hidden entirely on internal-only kinds (arrival / egress)?

Without coverage on these, every refactor of the page risks silently breaking owner outreach — the most user-visible part of the feature.

## What

Add a single Playwright spec, `frontend/tests/notifications.spec.ts`, that:

1. Sets up a fixture: enables the master `notifications` flag, runs `seed_example_data`, and authenticates as an admin (existing helpers handle this for the other specs).
2. Triggers the daily cron once via the `generate_notifications` management command (or by issuing the same API call the cron does) so seed-fixture-driven rows exist for the logged-in user.
3. Asserts the bell badge is visible with a non-zero count.
4. Navigates to `/notifications` and asserts:
   - At least one row of each materialised kind is present.
   - Mark-read removes the unread dot indicator from a row and decrements the badge on next poll.
   - Dismiss removes the row from the list.
   - Mark-all-read disables itself after every visible row is read.
5. For one row of kind `pet_birthday` (a kind that produces a non-null `forward` block):
   - Asserts the **Email owner** button has an `href` starting with `mailto:` and including the seeded owner's email.
   - Asserts the **WhatsApp owner** button has an `href` starting with `https://api.whatsapp.com/send` (NOT `wa.me`) and includes the seeded phone (digits only) and a percent-encoded text.
6. For one row of kind `pet_arriving_today`:
   - Asserts neither forward button is rendered (internal-only kind).
7. Toggles the master flag off and reloads:
   - Asserts the bell is hidden.
   - Asserts `/notifications` renders the empty-state card.

The spec runs against the headless Chrome image already used by `make test-frontend`, so no new tooling is needed.

## Impact

- New file: `frontend/tests/notifications.spec.ts`.
- May require a small helper at `frontend/tests/helpers/notifications.ts` for the cron-trigger / flag-toggle plumbing if not already covered by existing helpers.
- The spec is added to the existing Playwright project; no `playwright.config.ts` changes.
- `make test-frontend` runtime grows by a few seconds (one spec, ~6–8 it() blocks).

## Out of scope

- Backend tests for the same surfaces — already covered by `notifications/tests/test_api.py` and `test_email.py`.
- Visual regression / screenshot coverage. Functional clicks are the priority.
- Bilingual coverage (running every assertion in both `en` and `es`). One language is enough to catch the bug class we care about; bilingual would double the spec for diminishing returns.
