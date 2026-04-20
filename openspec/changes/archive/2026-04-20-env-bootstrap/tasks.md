# Tasks

## 1. New tooling capability
- [x] 1.1 Create baseline `openspec/specs/tooling/env-bootstrap/spec.md` with three requirements: self-documenting `.env.example`, idempotent `make env`, and integration with `make init` / `make upgrade`.
- [x] 1.2 Mirror the same content marked ADDED at `openspec/changes/env-bootstrap/specs/tooling/env-bootstrap/spec.md`.

## 2. `.env.example`
- [x] 2.1 Replace the current flat `.env.example` with a commented version: one multi-line comment block per variable describing purpose, required-ness, and default.
- [x] 2.2 Change prod-only variables (`CF_DNS_API_TOKEN`, `ACME_EMAIL`) to have blank defaults so a straight copy yields a working local stack.
- [x] 2.3 Keep the existing variable names (`DOMAIN`, `NEXT_PUBLIC_API_URL`, `DOCKER_SOCKET`, `CF_DNS_API_TOKEN`, `ACME_EMAIL`) unchanged.

## 3. Interactive wizard
- [x] 3.1 Add `scripts/setup-env.sh` that parses `.env.example` block by block, prints per-variable guidance, accepts user input (empty = default), and writes `.env`.
- [x] 3.2 Preserve the original comment blocks in the generated `.env` so manual edits retain the guidance.
- [x] 3.3 Refuse to overwrite an existing `.env`: if the file is present, print a notice and exit 0.
- [x] 3.4 Fall back to defaults (non-interactive) when `/dev/tty` is not readable, printing a one-line notice.

## 4. Makefile
- [x] 4.1 Add `make env` that runs `bash scripts/setup-env.sh`.
- [x] 4.2 Add a private `env-check` target that invokes `$(MAKE) env` when `.env` is missing.
- [x] 4.3 Make `init` depend on `env-check` before `build up migrate create-admin`.
- [x] 4.4 `make upgrade` prints a warning (not an error) when `.env` is missing.
- [x] 4.5 Add `env` and `env-check` to `.PHONY`. Update `make help` with the new target under a "Setup" or "Maintenance" group.

## 5. Documentation
- [x] 5.1 `AGENTS.md`: add a `make env` row to the Makefile table.
- [x] 5.2 `AGENTS.md`: add a short "Environment variables" section below the Makefile table, listing which vars are local-dev-required vs production-only and pointing at `make env`.

## 6. Verification
- [x] 6.1 Manual: delete local `.env`, run `make env` (attached to TTY) accepting defaults — confirm a working `.env` is written.
- [x] 6.2 Manual: run `make env` again — confirm it refuses to overwrite.
- [x] 6.3 Non-TTY: pipe `make env` and confirm defaults are used with a notice.
- [x] 6.4 Smoke: with `.env` present, `docker compose config` resolves `${DOMAIN}` / `${NEXT_PUBLIC_API_URL}` with no "variable is not set" warnings.
- [x] 6.5 Backend tests remain 222/222.
- [x] 6.6 Frontend `tsc --noEmit` stays at 0 errors.
