# ADDED: Tooling / Continuous Integration

## ADDED Requirements

### Requirement: A single `make ci` target SHALL run the full quality gate

The repository SHALL provide a `make ci` target that runs `make lint`,
`make test` (backend + frontend), and `make security`, in that order, using the
container image versions pinned in the repository. This target is the canonical
CI gate: it is reproducible locally and portable, so any CI provider only has
to check out the code and run `make ci`.

`make ci` SHALL fail (non-zero exit) if any of lint, test, or security fails.
Because `make security` already exits non-zero only on a `critical` finding,
`warning`/`info` findings do not fail the gate but remain visible in the
generated report.

#### Scenario: `make ci` runs the whole gate

- WHEN a developer runs `make ci`
- THEN it SHALL run lint, then tests, then the security suite
- AND it SHALL exit non-zero if any stage fails

#### Scenario: A critical security finding fails the gate

- GIVEN a change that introduces a `critical` finding (e.g. a public endpoint
  that should require auth, or a fixable high-CVSS dependency)
- WHEN `make ci` runs
- THEN the `security` stage SHALL exit non-zero and fail the target

#### Scenario: A failing test fails the gate

- GIVEN a commit that breaks an existing backend or frontend test
- WHEN `make ci` runs
- THEN the `test` stage SHALL fail

### Requirement: A configured CI provider SHALL invoke `make ci` on every proposed change

When a CI provider is wired up, its pipeline SHALL trigger on every push and
every change proposed against `master`, and its job SHALL invoke `make ci` (not
a re-implementation of the steps). The `security` stage SHALL be a required
check for merging to `master`, and the pipeline SHALL publish
`security-reports/latest/REPORT.md` as a build artefact.

> Status: the portable `make ci` target is implemented. Selecting and wiring a
> specific provider (GitHub Actions / GitLab CI / Jenkins / server-side hook)
> is deferred; the target is deliberately provider-agnostic so that wiring is a
> thin checkout-and-`make ci` job.

#### Scenario: Pipeline delegates to `make ci`

- GIVEN a CI provider has been configured
- WHEN a change is proposed against `master`
- THEN the pipeline SHALL run `make ci`
- AND merging SHALL be blocked while the security stage is failing
