# Tasks

## 1. New `tooling/backup` capability
- [x] 1.1 Create baseline `openspec/specs/tooling/backup/spec.md` defining `make backup`, `make restore`, and the file layout invariants.
- [x] 1.2 Mirror the content (marked ADDED) in `openspec/changes/db-backup-restore/specs/tooling/backup/spec.md`.

## 2. `tooling/upgrade` spec update
- [x] 2.1 Modify `openspec/specs/tooling/upgrade/spec.md` so the single-command upgrade runs `make backup` as its first step; halts on backup failure; supports `SKIP_BACKUP=1` opt-out.
- [x] 2.2 Mirror the MODIFIED delta in `openspec/changes/db-backup-restore/specs/tooling/upgrade/spec.md`.

## 3. Backup + restore scripts
- [x] 3.1 `scripts/backup-db.sh`: source `.env` with defaults; `docker compose up -d db` + `pg_isready` wait; `pg_dump | gzip` into `backups/nursery-<timestamp>.sql.gz`; print resulting file size.
- [x] 3.2 `scripts/restore-db.sh`: resolve backup file (arg / `BACKUP_FILE=` / newest in `backups/`); ensure db is up; require `yes` confirmation on TTY or `RESTORE_I_UNDERSTAND=yes` non-interactively; drop database with `FORCE`; recreate; `gunzip -c | psql`; print completion message.
- [x] 3.3 `chmod +x` both scripts.

## 4. Makefile
- [x] 4.1 Add `backup` and `restore` targets that invoke the scripts.
- [x] 4.2 Rework `upgrade` to run `$(MAKE) backup` as step 1 of 5 (unless `SKIP_BACKUP=1`).
- [x] 4.3 Add `backup` and `restore` to `.PHONY` and to the "Maintenance:" section of `make help`.

## 5. Repository layout
- [x] 5.1 Create `backups/` directory at the repo root with a `.gitkeep` sentinel.
- [x] 5.2 Add `backups/*.sql` and `backups/*.sql.gz` to `.gitignore`.

## 6. Documentation
- [x] 6.1 Add `make backup` / `make restore` rows to the Makefile table in `AGENTS.md`.
- [x] 6.2 Add a short "Database backup and restore" section in `AGENTS.md` that covers the filename convention, the restore confirmation prompt, and the `SKIP_BACKUP=1` opt-out for upgrades.

## 7. Verification
- [x] 7.1 `make backup` on a running stack produces a non-empty `backups/nursery-*.sql.gz` file.
- [x] 7.2 `make restore` with the just-produced backup restores without errors and the database content is intact afterwards (e.g. `make test-backend` still passes).
- [x] 7.3 `SKIP_BACKUP=1 make upgrade` skips step 1 and continues.
- [x] 7.4 `make upgrade` (no opt-out) includes step 1/5 "Backing up database" in its output.
- [x] 7.5 Backend tests remain 222/222.
- [x] 7.6 Scripts run end-to-end in a pipeline (`make backup && make restore` is a no-op round-trip).
