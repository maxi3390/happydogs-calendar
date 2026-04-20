# Tasks

## 1. Makefile implementation

- [x] 1.1 Add `upgrade` to the `.PHONY` declaration
- [x] 1.2 Implement the `upgrade` target (git pull → build → up → migrate)
- [x] 1.3 Add a "Maintenance" section to `make help` with the `make upgrade` entry

## 2. OpenSpec capability

- [x] 2.1 Create `openspec/specs/tooling/upgrade/spec.md` with the behavior requirement + scenarios
- [x] 2.2 Create `openspec/specs/tooling/upgrade/design.md` with the technical rationale

## 3. Documentation

- [x] 3.1 Add `make upgrade` row to root `CONTEXT.md` Makefile commands table

## 4. Verification

- [x] 4.1 `make help` shows the new entry
- [x] 4.2 Makefile parses (`make -n upgrade` prints the commands without error)
