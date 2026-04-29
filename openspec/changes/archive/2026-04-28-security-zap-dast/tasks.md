# Tasks

## Setup
- [x] Create branch `feat/security-zap-dast`
- [x] Scaffold OpenSpec change folder

## Orchestrator
- [x] `scripts/security/run-scans.sh`: read `WITH_DAST` env var; when set to `1`, run a 6th step
  - [x] Bring up e2e stack via `make e2e-up`
  - [x] Run `zaproxy/zap-stable` `zap-baseline.py` against `http://frontend-e2e:3000/`
  - [x] Capture `zap-baseline.json` + `zap-baseline.md` into the per-run dir
  - [x] Tear down via `make e2e-down`
- [x] Print clear status messages with the same `[security] [N/M]` style as the existing scanners
- [x] Use `-I` (don't fail on warnings) so ZAP exits 0 — the aggregator owns the verdict
- [x] `chmod a+rwx` on the run dir before mounting it: ZAP container's `zap` user needs to write into it

## Aggregator
- [x] `scripts/security/generate-report.py`:
  - [x] `parse_zap()` reading `zap-baseline.json`
  - [x] Risk → severity (High → critical, Medium/Low → warning, Informational → info)
  - [x] OWASP categorisation by alert-name keyword (rules described in design.md)
  - [x] Wire into `tools = [...]` in `main()` only when the artefact exists (opt-in)

## Live spec
- [x] `openspec/specs/tooling/security/spec.md` — Requirement covering opt-in DAST + risk → severity mapping + scenarios

## Verification
- [x] `WITH_DAST=1 make security` runs end-to-end: e2e stack up, ZAP scan, e2e stack down, REPORT.md updated
- [x] `make security` (no flag) is unchanged: 5/5 scanners, no e2e stack touched
- [x] Aggregator parses 11 real ZAP findings on the home page (CSP, anti-clickjacking, COOP/COEP, etc.)
- [x] ZAP findings appear in the report's OWASP sections with `tool: zap-baseline` label
- [x] No leftover containers / network after the run

## Commit
- [x] Single commit on the feat branch
- [x] Merged into master (operator approval received post-review)
