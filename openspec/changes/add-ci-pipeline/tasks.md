# Tasks — CI pipeline

## Phase 1 — Portable core

- [x] Add a `ci` Makefile target: `ci: lint test security` (+ help entry +
      `.PHONY`).
- [x] `make ci` composes existing targets, each of which runs inside the
      pinned images; ordering fails fast (lint → test → security).

## Phase 2 — Pipeline config

- [~] Provider config deferred by decision (see spec note): the repo's remote
      is a self-hosted bare repo, and the team opted for the portable target
      only for now. Wiring a provider is a thin checkout + `make ci` job.

## Phase 3 — Gating + artefacts

- [~] Deferred with the provider (required-check + artefact upload are
      provider features). `make security` already emits
      `security-reports/latest/REPORT.md` for a future job to upload.

## Phase 4 — Docs + verify

- [x] Add a "Continuous Integration" section to `docs/docs/` and reference it
      from the root `AGENTS.md`.
- [x] `make -n ci` expands to `lint`→`test`→`security` (dry-run verified);
      `make help` lists the target.

## Phase 5 — Spec + archive

- [x] Promote `specs/tooling/ci/spec.md` into the live
      `openspec/specs/tooling/ci/` capability.
- [ ] Archive this change folder (deferred until merge).
