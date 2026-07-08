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

Each invocation SHALL create a timestamped run directory at `security-reports/YYYY-MM-DD-HHMMSS/` and write every per-tool artefact (`bandit.json`, `pip-audit.json`, `npm-audit.json`, `django-check.txt`, `owasp-tests.txt`) plus the aggregated `REPORT.md` into that subdirectory, so multiple runs co-exist without overwriting each other. The orchestrator SHALL maintain a `security-reports/latest` symlink pointing at the most recent run so `cat security-reports/latest/REPORT.md` is stable across runs.

The orchestrator SHALL trim old runs to keep the most recent N (default 10). The retention count SHALL be overridable via the `SECURITY_REPORT_KEEP` environment variable; setting `SECURITY_REPORT_KEEP=0` SHALL disable trimming.

`security-reports/` itself SHALL be tracked via `.gitkeep`; per-run subdirectories and their contents SHALL be gitignored so the report history is local-only and a fresh clone always has a place for the next run to land.

#### Scenario: Operator runs `make security` on a clean tree

- GIVEN a checkout where every tool runs cleanly
- WHEN the operator runs `make security`
- THEN a new directory `security-reports/<timestamp>/` SHALL be created
- AND every artefact (`bandit.json`, `pip-audit.json`, `npm-audit.json`, `django-check.txt`, `owasp-tests.txt`, `REPORT.md`) SHALL appear inside that directory
- AND `security-reports/latest` SHALL be a symlink pointing at the new run directory
- AND `REPORT.md` SHALL contain a section per OWASP category (A01 through A10)

#### Scenario: Multiple runs co-exist

- GIVEN one run has already produced `security-reports/2026-04-27-085851/`
- WHEN the operator runs `make security` a second time
- THEN a new sibling directory (`security-reports/2026-04-27-085922/` or similar) SHALL be created alongside the previous one
- AND `security-reports/latest` SHALL now point at the newer directory
- AND the previous run directory SHALL still be readable

#### Scenario: Old runs are auto-trimmed

- GIVEN `security-reports/` already contains 11 timestamped run directories
- WHEN the operator runs `make security` with the default retention
- THEN the orchestrator SHALL retain the 10 most recent runs (including the new one)
- AND the oldest excess run directory SHALL be removed
- AND `security-reports/latest` SHALL point at the most recent run

#### Scenario: Trimming is disabled when SECURITY_REPORT_KEEP=0

- GIVEN `security-reports/` already contains many run directories
- WHEN the operator runs `SECURITY_REPORT_KEEP=0 make security`
- THEN no run directory SHALL be deleted, regardless of how many already exist

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

### Requirement: `WITH_DAST=1 make security` SHALL run an OWASP ZAP baseline scan

`make security` SHALL accept a `WITH_DAST=1` env var to enable an opt-in 6th step: an OWASP ZAP baseline (passive) scan against the isolated e2e stack. The flag SHALL be off by default — without `WITH_DAST=1` the suite's behaviour is unchanged from today (5 scanners, no ZAP image pull, no e2e stack lifecycle).

When `WITH_DAST=1`, the orchestrator SHALL:

1. Bring up the isolated e2e stack via `make e2e-up` (idempotent — no-op if already up).
2. Run `zaproxy/zap-stable` `zap-baseline.py` from a one-off container joined to the `happy-calendar-e2e` network, targeting `http://frontend-e2e:3000/` by default.
3. Capture `zap-baseline.json` (machine-readable) and `zap-baseline.md` (human-readable) into the per-run report directory.
4. Tear the e2e stack back down via `make e2e-down`.

ZAP findings SHALL be folded into the existing OWASP-Top-10 sections of `REPORT.md`. Risk → severity:

- `High` → `critical`
- `Medium` / `Low` → `warning`
- `Informational` → `info`

OWASP categorisation SHALL be derived from the alert name with a documented keyword-mapping (header / cookie / TLS / session / injection); default A05.

#### Scenario: Default invocation skips DAST

- WHEN the operator runs `make security`
- THEN no ZAP work SHALL run
- AND the report SHALL contain the existing 5 scanner sections, unchanged

#### Scenario: WITH_DAST=1 adds the ZAP section

- WHEN the operator runs `WITH_DAST=1 make security`
- THEN the e2e stack SHALL be brought up before the ZAP step
- AND `zap-baseline.json` and `zap-baseline.md` SHALL appear in the per-run report directory
- AND the e2e stack SHALL be torn down after the scan
- AND `REPORT.md` SHALL include ZAP findings folded into the appropriate OWASP-Top-10 sections

#### Scenario: A ZAP High-risk finding fails the suite

- GIVEN a ZAP baseline scan that surfaces a High-risk alert (e.g., a clear runtime exposure)
- WHEN the aggregator runs
- THEN the finding SHALL be classified as `critical`
- AND `make security` SHALL exit non-zero

### Requirement: `make security` SHALL run gitleaks against the working tree and git history

The suite SHALL include an always-on gitleaks step that scans both the working tree (`gitleaks dir`) and the full git history (`gitleaks detect`). Findings from both passes SHALL be merged and de-duped on (RuleID, File, StartLine) into a single `gitleaks.json` artefact.

Every gitleaks finding SHALL be classified as `critical` severity and OWASP category `A02` (Cryptographic Failures), matching the existing categorisation of bandit's `B105` / `B106` / `B107` (hardcoded password) rules.

Gitleaks SHALL be configured via a project-level `.gitleaks.toml` that:

- Inherits the bundled default ruleset (`[extend].useDefault = true`).
- Adds path-based allowlists for build artefacts and dependency caches (`.next/`, `node_modules/`, `.docusaurus/`, `docs/build/`, `security-reports/`, `backups/`).

#### Scenario: Clean repo → 0 findings, suite is unaffected

- GIVEN a checkout with no committed or working-tree secrets
- WHEN the operator runs `make security`
- THEN gitleaks SHALL run as step 6/6
- AND `gitleaks.json` SHALL be written into the per-run directory
- AND the per-tool table in `REPORT.md` SHALL include a `gitleaks completed with 0 findings` note
- AND no critical finding SHALL be added by gitleaks

#### Scenario: A committed AWS access token is caught and fails the suite

- GIVEN a file in the working tree contains a string matching gitleaks's `aws-access-token` rule
- WHEN the operator runs `make security`
- THEN gitleaks SHALL emit a finding with `RuleID=aws-access-token`
- AND the finding SHALL render under A02 with severity `critical`
- AND `make security` SHALL exit non-zero

#### Scenario: Build artefacts are not flagged

- GIVEN the working tree has populated `frontend/.next/` and `frontend/node_modules/` directories
- WHEN gitleaks scans the working tree
- THEN no finding from those paths SHALL appear in `gitleaks.json` (the project-level allowlist suppresses them)

### Requirement: Production configuration SHALL fail closed

When `DEBUG` is `False`, the backend SHALL refuse to start with an insecure
configuration rather than boot into an insecure state. Specifically:

- A missing `DJANGO_SECRET_KEY` (or one equal to the committed dev placeholder)
  SHALL raise `ImproperlyConfigured` at startup.
- `DEBUG` SHALL default to `False` when the `DEBUG` env var is absent.
- `ALLOWED_HOSTS` SHALL be derived from the `ALLOWED_HOSTS` env var
  (comma-separated), defaulting to `localhost,127.0.0.1`. The `*` wildcard
  SHALL only be added when `DEBUG` is `True`.
- `CORS_ALLOW_ALL_ORIGINS` SHALL equal the value of `DEBUG`; when `DEBUG` is
  `False`, cross-origin access SHALL be limited to the origins listed in
  `CORS_ALLOWED_ORIGINS`.

`python manage.py check --deploy` run under `DEBUG=False` with the required
environment SHALL produce no `security.E…` errors.

#### Scenario: Missing secret key aborts a production boot

- GIVEN `DEBUG=False` and no `DJANGO_SECRET_KEY` set
- WHEN the Django process starts
- THEN it SHALL raise `ImproperlyConfigured` and NOT serve requests

#### Scenario: Wildcard host is rejected in production

- GIVEN `DEBUG=False` and `ALLOWED_HOSTS` unset
- WHEN a request arrives with an arbitrary `Host` header
- THEN Django SHALL reject it (host not in the scoped allow-list)

### Requirement: The security suite SHALL guard content-based upload validation

The custom security test suite SHALL include a case asserting that an upload
whose bytes do not match an allowed type is rejected even when the client
declares an allowed `Content-Type`. A regression that reintroduces
`content_type`-only validation SHALL make `make security` fail. This finding is
categorised under A08 (Software and Data Integrity Failures) — untrusted
client-supplied metadata driving a trust decision.

#### Scenario: Spoofed-upload guard is exercised by `make security`

- GIVEN the security suite runs
- WHEN it submits a file with executable bytes and a declared
  `Content-Type: image/jpeg`
- THEN the upload SHALL be rejected
- AND if it were accepted, the `security_tests` case SHALL fail and
  `make security` SHALL exit non-zero
