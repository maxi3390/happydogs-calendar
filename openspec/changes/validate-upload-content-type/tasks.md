# Tasks — Content-based upload validation

## Phase 1 — Dependency

- [x] Add `python-magic==0.4.27` to `backend/requirements.txt` (released 2022,
      well over the 7-day floor).
- [x] Install `libmagic1` in the backend image (`backend/Dockerfile` OS deps).

## Phase 2 — Validator

- [x] `backend/domain/files/validators.py`: `_sniff_mime` reads a 2048-byte
      prefix and `seek(0)`s; returns `None` when unreadable so field-level
      validation degrades to a no-op (the real upload path is always readable).
- [x] Validate the sniffed type against `ALLOWED_IMAGE_TYPES` /
      `ALLOWED_DOCUMENT_TYPES`; keep the existing `ValidationError` contract.
- [x] Map libmagic's generic fallbacks (`application/zip` → docx,
      `application/x-ole-storage` / `application/CDFV2` → doc) so valid Office
      files aren't falsely rejected.

## Phase 3 — Tests

- [x] Existing document/logo tests already upload genuine Pillow-generated
      images, so the success paths exercise the sniffer.
- [x] `security_tests` (A08): spoofed upload (ELF bytes declared as
      `image/jpeg`) is rejected — gated by `make security`.
- [x] `security_tests` (A08): a genuine PNG declared as `image/jpeg` is
      accepted (content, not label, decides).

## Phase 4 — Verify + spec + archive

- [x] 541 backend tests pass (2 new A08 tests); flake8 clean. Image rebuilt
      with `libmagic1`; python-magic imports and sniffs correctly.
- [ ] Update live `openspec/specs/backend/documents/spec.md` (File Type
      Validation) and `openspec/specs/tooling/security/spec.md` on archive.
- [ ] Update `docs/docs/backend/intro.md` (Documents / validation) if it
      describes the mechanism.
- [ ] Archive this change folder.
