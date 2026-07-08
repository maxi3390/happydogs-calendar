# Design — CI pipeline

## Provider-agnostic core: `make ci`

The pipeline logic lives in the Makefile, not the CI YAML, so it is
reproducible locally and portable across providers:

```make
ci: lint test security
```

The CI config's only job is to check out the code, ensure Docker is available,
and run `make ci`. Whatever provider is chosen (GitHub Actions, GitLab CI, a
Jenkins job pointed at the self-hosted remote, or a server-side `post-receive`
hook that shells out), it calls the same target.

## Jobs and ordering

Run as three separate jobs (or stages) for clear signal:

1. `lint` — fast, fails first on style/type issues.
2. `test` — `make test-backend` (SQLite in-memory, fast) + `make test-frontend`
   (Playwright against the isolated e2e stack from `docker-compose.e2e.yml`).
3. `security` — `make security`; the job's exit status is the suite's, so a
   `critical` finding fails the pipeline.

`lint` and `test` can run in parallel; `security` may run in parallel too but
is the gate that must be green to merge.

## Image pinning

CI SHALL pull the exact tags pinned in the repo (`python:3.12-slim`,
`node:24-alpine`, `postgres:18-alpine`, `mcr.microsoft.com/playwright:...`).
This is the whole point of the "everything runs in Docker" policy in
`AGENTS.md`: CI and laptops run byte-identical toolchains, so a green local run
predicts a green CI run.

## Frontend E2E in CI

`make test-frontend` already brings up and tears down the ephemeral
`happy-calendar-e2e` stack via `scripts/run-e2e-tests.sh`. CI needs a
Docker-capable runner (docker-in-docker or a mounted socket). No new test
infrastructure is required — the isolation spec
(`openspec/specs/tooling/e2e-isolation/spec.md`) already guarantees the e2e
stack never touches a dev database, which is exactly what a shared CI runner
needs.

## Security job as a required check

`make security` is designed for gating (documented in the security spec: exits
non-zero only on `critical`). Marking the job "required" on the `master` branch
protection turns that design into an enforced policy. `warning`/`info`
findings still surface in the artefact report without blocking.

## Artefacts

The `security` job SHALL upload `security-reports/latest/REPORT.md` as a build
artefact so reviewers can read findings without re-running the suite.
