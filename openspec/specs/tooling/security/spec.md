# Tooling: Security Testing

## Purpose

Make `make security` a dependable single-command pre-release gate that surfaces every category of OWASP-Top-10 risk that automated tooling can detect for a Django + Next.js stack: insecure code patterns, vulnerable dependencies, framework misconfiguration, and per-route authorisation regressions. The aggregated Markdown report at `security-reports/REPORT.md` gives an operator one place to look to answer "is this safe to release?"

## Requirements

### Requirement: `make security` SHALL produce a single Markdown report covering OWASP Top 10

The repository SHALL provide a `make security` target that runs every component of the security suite, aggregates their output into one Markdown file, and surfaces every finding under the OWASP Top 10 category it concerns.

The target SHALL execute, in order:

1. `bandit` against `backend/` (excluding tests and migrations) — Python static analysis.
2. `pip-audit` against `backend/requirements.txt` — Python dependency CVE check.
3. `npm audit --json` against `frontend/` — Node dependency CVE check.
4. `python manage.py check --deploy` with `DEBUG=False` — Django framework misconfiguration check.
5. `python manage.py test security_tests` — custom Django test suite asserting access control (A01), auth posture (A07), and audit-log coverage (A09).

The report SHALL be written to `security-reports/REPORT.md`. The directory SHALL be tracked via a `.gitkeep`; per-run artefacts (the JSON / text outputs of each tool plus the regenerated Markdown) SHALL be gitignored so a fresh clone always has a place for the report to land but the report itself is never committed.

#### Scenario: Operator runs `make security` on a clean tree

- GIVEN a checkout where every tool runs cleanly
- WHEN the operator runs `make security`
- THEN every artefact SHALL appear under `security-reports/` (`bandit.json`, `pip-audit.json`, `npm-audit.json`, `django-check.txt`, `owasp-tests.txt`, `REPORT.md`)
- AND `REPORT.md` SHALL contain a section per OWASP category (A01 through A10)

#### Scenario: One tool fails individually

- GIVEN one of the upstream scanners errors out (e.g. `pip-audit` cannot reach the PyPI advisory database)
- WHEN `make security` runs
- THEN the orchestrator SHALL NOT abort — it SHALL record the tool's error and continue running the remaining scans
- AND `REPORT.md` SHALL surface the tool's error in its per-tool section

### Requirement: Findings SHALL be mapped to OWASP Top 10 categories with normalised severity

Every finding the suite produces SHALL be normalised to a `Finding` shape with at minimum `{ category, severity, tool, title, location }`, where:

- `category` is the OWASP Top 10 identifier (`A01` through `A10`) the finding most closely concerns.
- `severity` is one of `critical`, `warning`, `info`.

The mapping rules SHALL be:

- Bandit `HIGH` severity → `critical`. `MEDIUM` / `LOW` → `warning`. Issue notes → `info`.
- pip-audit / npm audit:
  - CVE rated 9.0+ AND a fix is available → `critical`.
  - CVE rated < 9.0 OR no fix available → `warning`.
  - Informational advisories → `info`.
- Django `check --deploy`:
  - `?: (security.E…)` errors → `critical`.
  - `?: (security.W…)` warnings → `warning`.
- Custom OWASP test failures → `critical`.

`make security` SHALL exit non-zero when any finding has severity `critical`, and SHALL exit 0 when only `warning` / `info` findings are present.

#### Scenario: A failing access-control test makes the build fail

- GIVEN a regression in a ViewSet's permission_classes that lets a non-admin DELETE a user
- WHEN `make security` runs
- THEN the corresponding test in `security_tests/tests/test_a01_access_control.py` SHALL fail
- AND the report SHALL list the failure under the A01 section as `critical`
- AND `make security` SHALL exit non-zero

#### Scenario: A high-severity CVE with no fix yet is a warning, not a blocker

- GIVEN a Python dependency with a CVSS 9.0 advisory but no upgraded release available
- WHEN `make security` runs
- THEN `pip-audit` SHALL report the CVE under A06
- AND the aggregator SHALL classify it as `warning` (because no fix exists; the team can't unblock)
- AND `make security` SHALL still exit 0 (the warning is visible in the report for humans to escalate)

### Requirement: A04 (Insecure Design) and A10 (SSRF) SHALL be explicitly named in the report even when no findings exist

A04 has no automated coverage in this suite (insecure design is a process, not a scanner finding). A10 has only partial coverage (bandit catches obvious cases; full taint analysis is out of scope).

The report SHALL name both gaps in their respective sections so a reader does not infer "no findings = compliant."

#### Scenario: Report includes a coverage caveat for A04 and A10

- GIVEN a clean run with no findings under A04 or A10
- WHEN the operator opens `REPORT.md`
- THEN the A04 section SHALL include the sentence "No automated coverage; this category requires threat-modelling discipline that lives outside the scanner."
- AND the A10 section SHALL note that bandit covers the obvious cases but full SSRF detection requires taint analysis which is out of scope for this suite
