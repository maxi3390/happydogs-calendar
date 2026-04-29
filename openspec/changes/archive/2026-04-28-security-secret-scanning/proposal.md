# Secret scanning (gitleaks) in `make security`

## Why

Bandit catches hardcoded secrets in *Python source* via B105/B106/B107, but it can't see anything that left those files: secrets accidentally committed to YAML / JSON / `.env.example` / shell scripts / past git history. The OWASP Top 10 (2021) explicitly calls this out under A02 (Cryptographic Failures): "Are passwords, sensitive information, certificates and keys committed to source repositories or container images?"

A focused secret-scanner closes the gap. **gitleaks** is the de-facto choice for this task: a single Go binary, scans both the working tree and the full git history, produces JSON, ~5-second runtime on a small repo. Running it on every `make security` is cheap and the cost of a leaked production secret is high.

## What

1. **`scripts/security/run-scans.sh`** gains a 6th always-on step: `gitleaks detect` against the repo (working tree + git history). The step lands BEFORE the optional ZAP step so the numbering is stable: `make security` is now `1/6` through `6/6`; `WITH_DAST=1 make security` is `1/7` through `7/7`.
2. **`scripts/security/generate-report.py`** gains a `parse_gitleaks` helper:
   - Reads `gitleaks.json`.
   - One Finding per leak, all classified as `critical` (a hard-coded secret in source is unambiguously a release blocker).
   - All findings are tagged OWASP **A02** to match how bandit's `B105`/`B106`/`B107` are already categorised.
3. **Live spec** at `openspec/specs/tooling/security/spec.md` gets a Requirement covering the gitleaks step + its severity / category mapping.

## Impact

- **Per-run cost:** ~3–5s on this repo. First-time docker pull is ~10 MB. No ongoing infrastructure overhead.
- **Exit-code gate works as expected:** any leak → critical → non-zero exit → CI gate fires.
- **No new host-side dep:** gitleaks runs in its container.
- **Aggregated report grows by a per-leak block under A02** alongside the existing bandit/django entries.

## Out of scope

- **Trufflehog as a second scanner.** Trufflehog adds semantic verification (calls APIs to confirm a leaked key is still live). Useful for live-scanning production logs; over-spec for a pre-release source check. We can add it as a follow-up if the team wants verification of high-confidence findings.
- **Custom rule packs** (e.g. internal company rule names). Gitleaks ships a comprehensive default ruleset; we use it as-is. Custom rules can land in a `.gitleaks.toml` config file if specific patterns need adding later.
- **Allow-list / suppression.** When false positives surface, we'll add a `.gitleaks.toml` with rule-level allowlists. Premature today.
- **Pre-commit hook.** Useful but a separate ergonomic concern; this change is about the release-time gate.
- **Wiring `make security` into CI.** Tracked separately from this change.
