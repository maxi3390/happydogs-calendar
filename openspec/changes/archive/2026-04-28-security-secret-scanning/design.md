# Design: gitleaks in `make security`

## Decisions

### gitleaks, not trufflehog

Both are excellent. The trade-off:

| Aspect | gitleaks | trufflehog |
|---|---|---|
| Speed | ~5 s on this repo | ~10–15 s on this repo |
| Image size | ~10 MB | ~100 MB |
| False-positive rate | Comparable | Lower with verification |
| Verification (live API check) | No | Yes (calls AWS/GitHub/etc.) |
| Rule pack | Comprehensive default TOML | Comprehensive default |
| Maintenance | Active | Active |

The verification feature in trufflehog is its strongest pitch — it can tell you whether a leaked AWS key is still live. That's compelling for production-log scanning. For a pre-release source / git-history scan, where the scanner runs offline-ish and we want a release-blocking signal, gitleaks's speed and footprint win.

If we ever need verification (e.g. for a leaked-secret incident-response flow), we add trufflehog as a separate command behind a flag, alongside gitleaks. Not now.

### Always-on, not opt-in

Three of the existing 5 scanners are always-on (bandit, django check, security_tests). pip-audit and npm audit are also always-on; only ZAP is opt-in (`WITH_DAST=1`) because it brings up containers and adds 2 minutes.

gitleaks adds ~5 seconds and pulls a 10 MB image. Always-on is the right call. The cost of a leaked secret is several orders of magnitude higher than the cost of the scan.

### All findings → critical → A02

Hardcoded secrets in source are non-negotiable: severity `critical`, category A02 (Cryptographic Failures). This matches the existing bandit mapping for B105/B106/B107 (`hardcoded_password_string`, `hardcoded_password_funcarg`, `hardcoded_password_default`) and keeps the OWASP picture coherent.

Some scanners try to soften severity for low-confidence rules. gitleaks's default ruleset is well-curated; we don't second-guess it. If a real false-positive hits (e.g. a high-entropy string in fixture data), we add a rule-level allowlist in a `.gitleaks.toml` rather than muting the whole class.

### Mount the repo read-only, write report to a chmod'd run dir

Two volume mounts in the docker invocation:

```
-v $REPO_ROOT:/repo:ro       # source tree + .git, RO so the scanner can't accidentally write
-v $RUN_DIR:/out:rw          # the report destination, RW
```

We `chmod a+rwx $RUN_DIR` before mounting so the gitleaks container's user (UID may differ from host) can write `/out/gitleaks.json`. This is the same pattern Phase 4 uses for the ZAP report dir.

### `--exit-code=0` so the aggregator owns the verdict

By default gitleaks exits 1 when leaks are found. Our orchestrator's pattern is "every scanner runs, aggregator decides". Passing `--exit-code=0` keeps gitleaks's process exit clean; the aggregator surfaces criticals via its own non-zero exit on `make security`'s end.

### Where in the script

Inserted as step 6/N, AFTER `security_tests` and BEFORE the optional ZAP step. The numbering is therefore:

- Always: steps 1–6 (bandit / pip-audit / npm audit / django check / security_tests / gitleaks).
- With DAST: step 7 (zap-baseline) is appended.

The total-steps variable updates accordingly so the per-step prefix reads e.g. `[security] [6/6]` or `[security] [6/7]`.

### Empty-output handling

Gitleaks creates the report file (`[]` empty array) when no leaks are found. We treat any non-existent or zero-byte file as a tool failure and substitute `[]` so the aggregator never crashes. Same pattern the other parsers use.

## Alternatives considered

- **Run gitleaks on the host via brew install.** Tool-execution policy says everything runs in containers. No exception here.
- **Skip git-history scan, only files.** `--no-git` makes scanning faster but misses the most embarrassing failure mode: a secret committed once, reverted later, still in history. Defaults are right.
- **Run gitleaks before bandit so secret findings surface first in REPORT.md.** Tempting but the report's category-grouped layout already surfaces all A02 findings together; insertion order in the script doesn't change the eyeball flow.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| False positives on test fixtures (e.g. `Test1234!` strings in seed data). | Add rule-level allowlists in `.gitleaks.toml` per-finding when they appear. v1 ships without one to see real-world signal first. |
| Slow git history on a much larger repo than today's. | Acceptable cost; gitleaks scales linearly. If we ever need to skip history, `--no-git` is one flag away. |
| New gitleaks releases break the JSON shape. | Minor risk — gitleaks's JSON has been stable for years. We pin to a specific tag once we've seen one major release; today's `latest` is `v8.30.1`. |
