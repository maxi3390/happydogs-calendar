# Tasks

## Setup
- [x] Create branch `feat/security-secret-scanning`
- [x] Scaffold OpenSpec change folder

## Orchestrator
- [x] `scripts/security/run-scans.sh`: 6th always-on step running BOTH `gitleaks dir` (working tree) and `gitleaks detect` (history)
  - Mount repo at `/repo:ro` and run dir at `/out:rw`
  - JSON output to `/out/gitleaks-tree.json` + `/out/gitleaks-history.json`
  - Inline Python merges the two files into a de-duped `gitleaks.json`
  - `--exit-code=0` so aggregator owns the verdict
  - Empty-output safe fallback (`[]`)
- [x] `total_steps` computed up-front so all per-step prefixes show the same denominator

## Aggregator
- [x] `parse_gitleaks(path: Path)`: one Finding per leak, severity `critical`, category `A02`
- [x] Wire into `tools = [...]` in `main()` (always-on, alongside existing 5)

## Config
- [x] `.gitleaks.toml` at repo root: `extend.useDefault = true` + path allowlist for `.next/`, `node_modules/`, `.docusaurus/`, `docs/build/`, `security-reports/`, `backups/`

## Live spec
- [x] `openspec/specs/tooling/security/spec.md` — Requirement covering gitleaks step + dual-pass + severity / category mapping + .gitleaks.toml allowlist

## Verification
- [x] `make security` (no DAST): runs 6/6, emits `gitleaks.json`, 0 leaks on clean repo
- [x] `WITH_DAST=1 make security`: runs 6/7 + 7/7, gitleaks at 6/7
- [x] Report shows "gitleaks completed with 0 findings" note in the per-tool table
- [x] Synthetic AWS-key leak in a tracked file: gitleaks catches it, finding renders under A02 with severity `critical`
- [x] Without the allowlist, a clean repo would show 24 false positives in `frontend/.next/` build artefacts; with it, 0

## Commit
- [x] Single commit on the feat branch
- [x] Merged into master (operator approval received post-review)
