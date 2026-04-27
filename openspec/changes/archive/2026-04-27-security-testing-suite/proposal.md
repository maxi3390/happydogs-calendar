# Security testing suite covering OWASP Top 10

## Why

The codebase has a Django REST API exposed to a Next.js frontend, JWT auth, file uploads, an audit log, and a notification cron — every category of moving part where a security regression can land. Today there is no single command an operator can run before a release to get a confident "no critical findings" signal:

- A staff member who flips a feature flag could accidentally expose an admin endpoint to non-admins (A01).
- A pinned dep could pick up a CVE between releases without anyone noticing (A06).
- A `DEBUG=True` could end up in a deployed `.env` and leak stack traces (A05).
- A future contributor could add raw SQL via `connection.cursor()` and reintroduce SQL injection (A03).

A standing `make security` target that combines static analysis, dependency auditing, framework misconfiguration checks, and a custom Django test suite gives the team a reliable gate without bolting on a heavy DAST scanner or a paid service.

## What

A new `make security` Makefile target that:

1. Runs **`bandit`** against `backend/` — Python static analysis; covers OWASP A02 (weak crypto, hardcoded creds), A03 (SQL injection patterns, `shell=True`), A05 (Flask/Django debug, hardcoded keys), A08 (`pickle` on untrusted data), and parts of A10 (insecure deserialisation).
2. Runs **`pip-audit`** against `backend/requirements.txt` — Python deps CVE check; covers A06 for the backend.
3. Runs **`npm audit`** against `frontend/package.json` — Node deps CVE check; covers A06 for the frontend.
4. Runs **`python manage.py check --deploy`** with `DEBUG=False` — Django framework misconfiguration check; covers parts of A05 and A07 (cookie flags, HSTS, secure SSL settings, etc.).
5. Runs a new **`security_tests/`** Django app — a custom test suite that walks every registered ViewSet and exercises:
   - **A01:** Unauthenticated requests on protected endpoints SHALL return 401; non-admin requests on admin-only endpoints SHALL return 403; owner-bound resources only readable by their owner.
   - **A07:** Password validators are configured; JWT lifetime is bounded; sensitive endpoints reject expired/invalid tokens.
   - **A09:** The audit log records changes on every tracked entity; logout blacklists the refresh token.
6. Aggregates every artifact into a single Markdown report at **`security-reports/REPORT.md`**, mapping each finding to the OWASP Top 10 category it concerns, with severity counts and direct links to the source artefacts.
7. Exits non-zero when high-severity findings exist so the target can gate a future CI step.

## Impact

- New deps in `backend/requirements-dev.txt`: `bandit`, `pip-audit` (both pinned).
- New Django app `security_tests` (test-only; nothing exposed at runtime).
- New scripts: `scripts/security/run-scans.sh` (orchestrator) and `scripts/security/generate-report.py` (aggregator).
- New `security-reports/` directory; per-run artifacts gitignored except `.gitkeep`.
- New Makefile target: `security`.
- New live spec capability: `tooling/security`.
- New AGENTS.md feature (#13 in `backend/AGENTS.md`).

## Out of scope

- Dynamic application security testing (DAST) — running an OWASP ZAP scan against the live stack. Adds another container and ~5 minutes per run; can ship as a separate `--with-dast` mode later.
- Continuous integration wiring. The Makefile target produces machine-readable artifacts and exits non-zero on critical findings, which is enough for a follow-up PR to wire it into GitHub Actions / GitLab CI without changing the suite.
- A04 (Insecure Design) — a process / threat-modelling discipline rather than something a scanner detects. The report calls this out explicitly so readers don't infer "no findings = the design is secure."
- Cryptographic certificate / TLS posture testing (testssl.sh, sslyze). Out of scope for an in-repo target; that's an infra concern.
- Secret scanning (gitleaks, trufflehog). Worth adding later as a separate target; bandit covers a subset of this through the B105/B106/B107 hardcoded-secret detectors.
