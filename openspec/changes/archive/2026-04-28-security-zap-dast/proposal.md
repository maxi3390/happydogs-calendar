# DAST: OWASP ZAP baseline scan in `make security`

## Why

The current security suite covers SAST and dependency CVE scanning (bandit, pip-audit, npm audit) plus framework-level checks (`manage.py check --deploy`, custom Django tests). It doesn't poke the running app's HTTP surface — missing security headers, cookie flags, server-version disclosure, mixed-content, and similar runtime misconfigs slip through every category.

OWASP ZAP's "baseline" mode is the right tool for this gap: passive scan only (no active probing), pinned ruleset for ~30–40 web-app posture checks, ~2-minute runtime against a small Django+Next.js app. It fits the suite's "fast pre-release gate" framing.

We make it opt-in (`WITH_DAST=1 make security`) rather than always-on for two reasons:
1. ZAP first-pull is ~1 GB — punishing if you don't need it on every run.
2. Even a 2-minute scan triples the suite's runtime; not worth paying on every `make security`.

## What

1. **`scripts/security/run-scans.sh`** gains an opt-in 6th step gated on `WITH_DAST=1`:
   - Brings up the existing isolated e2e stack (`make e2e-up`) so ZAP scans an isolated, ephemeral target instead of the dev DB.
   - Runs `zap-baseline.py` against `http://frontend-e2e:3000/` from inside a `zaproxy/zap-stable` container joined to the `happy-calendar-e2e` network.
   - Emits `zap-baseline.json` and `zap-baseline.md` artefacts into the per-run report directory.
   - Tears the e2e stack back down (`make e2e-down`) after the scan so subsequent `make test-frontend` runs start cleanly.
2. **`scripts/security/generate-report.py`** gains a `parse_zap` helper:
   - Reads `zap-baseline.json`.
   - Maps each ZAP alert to a Finding with the suite's standard shape.
   - Risk → severity: `High` → critical, `Medium`/`Low` → warning, `Informational` → info.
   - Coarse OWASP categorisation: header / config alerts → A05, cookie security → A02, session-related → A07, SQL/XSS heuristics → A03; default A05.
3. **`make security`** macro stays a single target. Operators opt in with `WITH_DAST=1 make security`.
4. **Live spec** at `openspec/specs/tooling/security/spec.md` gets a Requirement covering the opt-in DAST step + its mapping to the standard Finding shape.

## Impact

- **First run with `WITH_DAST=1`** pulls the 1 GB ZAP image. Subsequent runs reuse the cached image.
- **Per-run cost** (with DAST enabled): adds the e2e stack bring-up (~30s cold, ~5s warm) + ZAP baseline (~2 min). Typical end-to-end with DAST: ~3 min.
- **Per-run cost** (without DAST): unchanged from today.
- **No new dep on the host.** ZAP runs in its container; aggregator parses the JSON it produces.
- **Aggregated report** gains a `Z` line per ZAP alert in the per-OWASP-category sections, alongside the existing scanners. The exit-code gate continues to work: a ZAP `High` becomes a `critical` and trips `make security`'s non-zero exit.

## Out of scope

- **Active scan** (zap-full-scan.py). Adds 10–30 minutes per run and probes injection / fuzzing surfaces; useful but the runtime cost is too high for the standard pre-release flow. Could land as a separate `WITH_DAST_FULL=1` mode later.
- **AJAX spider** for the SPA pages. The Next.js app's routes are mostly static after the initial bundle; the AJAX spider would help, but it ~3× the runtime. Out of scope for v1.
- **Authenticated scanning.** ZAP can drive a login form to probe authenticated routes; a config-file-driven setup. Out of scope here; the public surface is enough for an opening-move DAST.
- **Per-finding suppression / triage list.** ZAP supports a config file to demote specific rules. Useful when the baseline gets noisy; we'll add it once we see the actual finding mix.
- **Wiring `make security WITH_DAST=1` into CI.** The aggregator's exit code already supports CI gating; the actual GitHub Actions job is its own change.
