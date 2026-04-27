# Design — Security testing suite

## Why bandit + pip-audit + npm audit + Django check + custom tests, and not a single tool?

There isn't one tool that covers the whole OWASP Top 10 for a Django + Next.js stack:

- Static analysers (bandit) catch insecure code patterns (A02, A03, A05, A08) but can't see whether your viewset actually requires admin to delete a user (A01).
- Dependency auditors (pip-audit, npm audit) catch A06 only.
- Django's built-in `check --deploy` catches a specific set of A05/A07 settings issues (DEBUG, cookie flags, HSTS, SECURE_*) that bandit's generic Python lens doesn't know about.
- Custom Django tests are the only realistic way to assert per-route access control (A01) and per-event audit logging (A09) for THIS specific application.

Combining four cheap, off-the-shelf scanners with a focused custom test suite costs a fraction of one DAST run and produces a higher signal-to-noise ratio.

## Why one Markdown report instead of leaving every artifact separate?

Operator UX. Five tool outputs in five formats (bandit JSON, pip-audit JSON, npm audit JSON, Django text, Python unittest text) is hostile to the on-call engineer who got paged the first time `make security` failed. The aggregator parses each one, normalises severity, maps findings to OWASP categories, and produces a single Markdown file that opens in any viewer. The raw artefacts are kept alongside the report for tool-native deep-dives.

## Why mapped to OWASP categories instead of just dumping findings?

The OWASP Top 10 is the framing the team will reach for when reasoning about coverage ("are we OK on access control?" → A01). Findings ungrouped by category tell you "you have 17 issues" but not "you have 4 access-control issues and the rest are debug-info leaks." The mapping is the value-add the aggregator provides over `cat *.json`.

## A04 (Insecure Design) is intentionally not "covered"

A04 asks whether the system was designed with security in mind — threat-modelled, defence in depth, segregation of duties. No automated tool can answer that. The report dedicates a section to A04 that says "No automated coverage; refer to threat model in `openspec/specs/`" so a reader doesn't misread silence as compliance.

## A10 (SSRF) — depth of coverage

Bandit's `B310` (`urllib.urlopen`) and lookups for `requests.get(user_supplied_url)` patterns catch the obvious cases. A more thorough A10 check would require taint analysis (semgrep with the `r2c-security-audit` ruleset, etc.). Out of scope for v1; we name this gap in the report so it's visible.

## Why a Django app for the custom tests rather than putting them in an existing `tests/` directory?

The custom OWASP test class is conceptually distinct from the per-feature tests already in `pets/tests/`, `accounts/tests/`, `notifications/tests/`. Putting them in their own `security_tests/` app:

- Keeps `make test-backend` separable from `make security` (operators running the full suite get OWASP coverage, day-to-day TDD doesn't).
- Makes the access-control walk discoverable: every new ViewSet that registers in any `urls.py` is automatically tested without per-feature tests having to remember to add an entry.
- Gives the suite its own settings hooks (e.g. forcing `DEBUG=False` for the misconfig tests) without polluting the rest of the test runner.

## Severity model in the report

Each finding gets one of three severities:
- **Critical** — exits the suite non-zero. Things like a bandit HIGH-severity issue, a CVE rated 9.0+, a `DEBUG=True` misconfig, or any failing custom OWASP test.
- **Warning** — surfaced in the report but doesn't fail the build. Bandit MEDIUM/LOW, mid-severity CVEs, Django check warnings (`?: (security.W004)` and friends).
- **Info** — counted only. Bandit informational notes, low CVEs.

This three-tier model is what lets the same target be both a pre-commit gate (reject criticals) and a daily report (surface warnings without blocking work).

## Why orchestrate from a bash script + a Python aggregator instead of a single Python entrypoint?

The bash script is the natural shape for "run five external commands in sequence; collect their outputs." Python doesn't add anything except subprocess wrapping. The aggregator is Python because it parses JSON, walks dataclasses, and emits Markdown — Python's the right tool there.

## Bandit scope and exclusions

`bandit -r backend/ -x backend/*/tests,backend/*/migrations`:
- Tests intentionally use hardcoded passwords (`'TestPass123!'`) and would otherwise dominate the report with false positives.
- Migrations are auto-generated and not a typical bug surface (matches the `.flake8` exclusion policy).

We do NOT broadly disable bandit rule classes. False positives on individual lines should be tagged with `# nosec B###` and a one-line justification, the same way flake8's `# noqa` works.

## pip-audit and npm audit — vulnerable-but-no-fix policy

pip-audit and npm audit both flag CVEs even when there's no fix yet (the package author hasn't released the patch). Treating these as critical would block releases on issues we can't fix. The aggregator maps "no fix available" to **Warning**; a finding only escalates to **Critical** when an upgrade path exists.

## What gets gitignored

`security-reports/` is mostly per-run output (timestamps in filenames, JSON tool dumps, the regenerated Markdown). The directory itself is tracked via `security-reports/.gitkeep` so a fresh clone has somewhere for the report to land. Everything else under `security-reports/` is `.gitignore`'d.

## Where the spec lives

`openspec/specs/tooling/security/spec.md`. Tooling because this is a developer-facing build target, not application behaviour. Sibling to `tooling/lint/spec.md` and `tooling/env-bootstrap/spec.md`.
