# Tasks — Security testing suite

## Phase 1 — Tooling installation

- [x] Add `bandit` (pinned) to `backend/requirements-dev.txt`.
- [x] Add `pip-audit` (pinned) to `backend/requirements-dev.txt`.
- [x] Rebuild the backend image so the deps install.
- [x] Verify `python -m bandit --version` and `python -m pip_audit --version` succeed inside the container.

## Phase 2 — Custom OWASP test suite

- [x] Create the `security_tests` Django app (`apps.py`, `__init__.py`, `tests/__init__.py`).
- [x] Add `security_tests` to `INSTALLED_APPS` AFTER all the application apps so URL discovery is complete by the time it runs.
- [x] **A01 — Access control walk:** test class that introspects every registered URL pattern, distinguishes anonymous / authenticated / admin scopes via the ViewSet's `permission_classes`, and asserts the expected status code.
- [x] **A07 — Auth posture:** assert `AUTH_PASSWORD_VALIDATORS` is configured with at least the four Django defaults; assert JWT access lifetime ≤ 60 minutes; assert blacklisted refresh tokens are rejected.
- [x] **A09 — Logging / audit:** assert each tracked model (Pet, Owner, MedicalNote, Vaccination) has `HistoricalRecords()`; assert a logout call invalidates the refresh token.
- [x] Wire the new app into `nursery/test_settings.py` so `manage.py test security_tests` runs in isolation if needed.

## Phase 3 — Scan orchestrator

- [x] Create `scripts/security/run-scans.sh` that:
  - Creates / cleans `security-reports/` per run.
  - Runs bandit against `backend/` (JSON output → `security-reports/bandit.json`).
  - Runs pip-audit against `backend/requirements.txt` (JSON output → `security-reports/pip-audit.json`).
  - Runs `npm audit --json` against `frontend/` (JSON output → `security-reports/npm-audit.json`).
  - Runs `python manage.py check --deploy` with `DEBUG=False` (text output → `security-reports/django-check.txt`).
  - Runs `python manage.py test security_tests --verbosity 2` (text output → `security-reports/owasp-tests.txt`).
  - Calls the aggregator to produce `REPORT.md`.
- [x] Make every step non-fatal individually so a single tool's failure doesn't truncate the overall report. The orchestrator's exit code is the aggregator's exit code.

## Phase 4 — Report generator

- [x] Create `scripts/security/generate-report.py`:
  - Parse each artifact into a normalised `Finding` shape: `{ category, severity, tool, title, location, description }`.
  - Map findings to OWASP categories per the rules in `design.md`.
  - Emit `security-reports/REPORT.md` with:
    - Header summary (run timestamp, severity counts, OWASP coverage table).
    - Per-OWASP-category section (A01 through A10) listing every finding tagged to that category.
    - Per-tool appendix linking back to the raw artifact.
  - Exit non-zero when any finding has severity `critical`.

## Phase 5 — Repo plumbing

- [x] Create `security-reports/.gitkeep`.
- [x] Update `.gitignore` to ignore `security-reports/*` except `.gitkeep`.
- [x] Add `make security` Makefile target that calls `bash scripts/security/run-scans.sh` and prints the report path on success.
- [x] Add a short `make help` description for the new target.

## Phase 6 — Spec + docs

- [x] Add the live spec at `openspec/specs/tooling/security/spec.md`.
- [x] Add a "Security testing" feature row to `backend/AGENTS.md` (#13).
- [x] Add a `make security` row to the root `AGENTS.md` Makefile section.
- [x] Document the workflow under a new "Security" subsection in `docs/docs/backend/intro.md`.
- [x] Archive this change folder.

## Phase 7 — Verification

- [x] Run `make security` end-to-end on a clean tree.
- [x] Confirm `security-reports/REPORT.md` is generated with sensible OWASP-category sections.
- [x] Confirm all five tool artifacts are present.
- [x] Confirm `make security` exits 0 when no critical findings exist (and would exit non-zero otherwise — exercise this by introducing a trivial test failure and reverting).
