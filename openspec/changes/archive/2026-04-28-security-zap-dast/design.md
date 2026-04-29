# Design: ZAP baseline DAST in `make security`

## Decisions

### Opt-in via `WITH_DAST=1`, not a separate `make` target

`make security WITH_DAST=1` keeps the operator's mental model simple: there's one security-suite entry-point. Everything's still a single Markdown report; the DAST step just adds a section. We considered `make security-dast` as a separate target but rejected it — operators run the full suite at release time and want one verdict, not two.

The env-var gate is read at the top of `run-scans.sh`. When unset (the default), the DAST step is skipped completely; no compose calls, no image pull, no runtime cost.

### Target the e2e stack, not the dev stack

ZAP scans a running app. We could point it at the dev `frontend:3000`, but that risks colouring a security report with whatever happens to be in the dev DB (test pollution, mid-feature debug data, half-broken state). The isolated e2e stack — phase 1's `db-e2e` + `backend-e2e` + `frontend-e2e` — is exactly the deterministic, ephemeral target ZAP wants.

The DAST step:
1. Calls `make e2e-up` (idempotent — no-op if already up).
2. Runs ZAP against `http://frontend-e2e:3000/`.
3. Calls `make e2e-down` to tear down (free resources, restore the operator's pre-scan environment).

If the operator was running `make test-frontend` in another shell, this would race; we accept that — the security suite is a release-time check, not a parallel-development tool.

### Baseline mode, not full scan

`zap-baseline.py` runs the **passive** scan rules: ~30–40 checks against the response stream as the spider crawls. No active probing, no fuzzing. Typical findings:

- Missing / mis-configured security headers (X-Frame-Options, CSP, X-Content-Type-Options, HSTS).
- Cookie flags (Secure, HttpOnly, SameSite).
- Server / framework version disclosure.
- Mixed-content references.
- CORS misconfig (the app today has `CORS_ALLOW_ALL_ORIGINS=True` — ZAP won't yell, but it surfaces useful header context).

`zap-full-scan.py` adds ~10–30 minutes for active probing. Out of scope for the opening move; can land later as `WITH_DAST_FULL=1`.

### Risk → severity mapping

ZAP's risk scale: Informational / Low / Medium / High. Our suite's: info / warning / critical.

```
ZAP risk          → ours
─────────────────────────────
High              → critical
Medium            → warning
Low               → warning
Informational     → info
```

We don't demote High when "no fix available" the way `npm audit` does — for ZAP, High means a clear runtime exposure, not a CVE, and it's almost always actionable.

### OWASP category mapping

ZAP exposes CWE/WASC IDs but not directly OWASP Top 10. We map by alert name, coarsely:

| Alert keyword | Category |
|---|---|
| `csp`, `content security policy`, `x-frame-options`, `x-content-type-options`, missing-header generally | A05 |
| `hsts`, `strict-transport-security`, TLS-related | A02 |
| `cookie` AND (`secure` OR `httponly` OR `samesite`) | A02 |
| `cors` | A05 |
| `session` | A07 |
| `sql`, `injection`, `xss`, `cross-site` | A03 |
| (default) | A05 |

A05 (Security Misconfiguration) is the natural home for most baseline findings; the mapping isn't exact OWASP science but matches what an operator would expect to read under each category in the report.

### Artefact shape

ZAP can emit JSON, XML, HTML, or Markdown. We capture both:

- **`zap-baseline.json`** — primary input to the aggregator. Stable schema across ZAP versions.
- **`zap-baseline.md`** — human-readable; folded into the per-run directory alongside `bandit.json` etc.

The aggregator only reads JSON; the Markdown is for browsing.

### Tear-down on exit

The DAST step runs at the end of the scan, AFTER the other 5 scanners. We tear down the e2e stack only after ZAP completes. If the operator interrupts (Ctrl+C) mid-ZAP, the stack stays up — the orchestrator already documents `make e2e-down` for cleanup.

We considered a bash `trap`, like the e2e test runner uses. Rejected for symmetry: the security suite's other scanners don't bring up state, so adding lifecycle traps just for DAST muddies the script. Operators who interrupt accept the leftover state.

## Alternatives considered

- **Build ZAP into the backend or a sidecar service** — bloats the dev image and ties scanner version to the backend release. Rejected.
- **Authenticated baseline scan with a context file** — would broaden coverage to authenticated routes (admin, profile) but adds complexity and a contracted login-flow definition that has to track frontend changes. Worth a follow-up; out of scope for v1.
- **Fail the suite on Medium ZAP findings** (raise to critical) — too aggressive; baseline is noisy on small apps, and an operator can promote individual rules in the ZAP config file later if they want stricter posture.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| First run is slow (image pull). | Document it: `WITH_DAST=1` pulls ~1 GB on first use. Subsequent runs reuse the cached image. |
| Race with concurrent `make test-frontend`. | Document that `make security WITH_DAST=1` brings up + tears down the e2e stack. Operators should not run both at once; rare in practice. |
| ZAP baseline returns no findings, false sense of security. | The report's per-tool section makes the empty result explicit ("ZAP baseline: 0 findings"). The aggregator surfaces this rather than silently dropping it. |
| ZAP image upstream renames / breaks. | We pin to `zaproxy/zap-stable` (the canonical OWASP-maintained image). If that breaks, we switch to a tagged release in a follow-up commit. |
| Network race: scan starts before `frontend-e2e` is fully ready. | `make e2e-up` already waits on the healthcheck; ZAP doesn't start until that returns. ZAP's own spider timeout absorbs any residual startup lag. |
