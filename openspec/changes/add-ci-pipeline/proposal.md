# Add a continuous-integration pipeline

## Why

The repository has excellent local quality gates — `make lint`, `make test`,
and `make security` (which already exits non-zero on any `critical` finding) —
but **nothing runs them automatically**. There is no `.github/`,
`.gitlab-ci.yml`, or any other CI configuration. Every guarantee the tooling
provides depends on a human remembering to run it before merging, and the
`git-workflow` spec's "verify before the branch is ready" step is unenforced.

This undermines the other hardening changes: it's easy to reintroduce a
`DEBUG=True` default, a public endpoint, or a vulnerable dependency, and only
discover it in production. CI turns those checks into a merge gate.

## What

Add a CI pipeline, triggered on every push and every proposed change targeting
`master`, that runs three jobs against the pinned container images:

1. **lint** — `make lint` (flake8 + `next lint`).
2. **test** — `make test-backend` and `make test-frontend`.
3. **security** — `make security` (bandit, pip-audit, npm audit,
   `check --deploy`, custom OWASP tests). This job SHALL fail the pipeline when
   the suite exits non-zero (i.e. any `critical` finding).

The pipeline SHALL use the same image versions pinned in the repo (see the
version table in the root `AGENTS.md`) so CI matches local runs. The `security`
job SHALL be a required check for merging to `master`.

Because the origin is a self-hosted bare repository rather than GitHub or
GitLab, the concrete provider is chosen at implementation time; the requirement
is provider-agnostic. A portable `Makefile` target (`make ci`) SHALL run the
same three steps so the pipeline is a thin wrapper and CI is reproducible
locally.

## Impact

- New CI config file (provider TBD) plus a `make ci` convenience target.
- No application code change.
- Slightly longer feedback loop on PRs (offset by catching regressions early).
- Docs: a short "Continuous Integration" section referenced from `AGENTS.md`.

## Out of scope

- Deployment / CD (building and publishing images, releasing). This change is
  CI (verification) only.
- Caching/matrix optimisation beyond a reasonable first pass.
- Coverage-threshold gating (can be layered on later).
