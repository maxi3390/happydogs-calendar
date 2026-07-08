# Validate uploads by content, not client-declared MIME type

## Why

File-upload validation in `backend/domain/files/validators.py` decides whether
a file is an allowed type by reading `file.content_type` — a value supplied by
the client in the multipart request. It is trivially spoofable: an attacker can
upload `payload.exe` (or an SVG with embedded script, an HTML file, etc.) while
declaring `Content-Type: image/jpeg`, and the current validator accepts it.

Every upload surface is affected: pet and owner profile pictures, the system
logo, and pet/owner documents. Uploaded media is served publicly under
`/media` (or a public-read S3 bucket), so an accepted disguised file can be a
stored-XSS or malware-distribution vector.

This is exactly the class of gap the `make security` suite exists to catch, so
we also add a regression test under `security_tests`.

## What

1. **Content-based type detection.** Determine the real MIME type from the
   file's magic bytes (via `python-magic` / libmagic) instead of trusting
   `content_type`. Validate the detected type against the existing
   `ALLOWED_IMAGE_TYPES` (images: pet/owner/logo) and `ALLOWED_DOCUMENT_TYPES`
   (documents) allow-lists already defined in `settings.py`.
2. **Reject on mismatch.** If the sniffed type is not in the relevant
   allow-list, reject with the same validation-error contract as today
   (unchanged API behaviour for legitimate uploads).
3. **Read safely.** Sniff a bounded prefix (e.g. first 2048 bytes) and
   `seek(0)` so the file can still be saved.
4. **Security regression test.** Add a `security_tests` case that uploads a
   file whose bytes are an executable but whose declared `content_type` is
   `image/jpeg`, and asserts it is rejected.
5. **Dependency.** Add `python-magic` pinned to a release published at least
   7 days ago (and ensure `libmagic` is present in the backend image).

## Impact

- `backend/domain/files/validators.py`: validation reads sniffed type.
- `backend/requirements.txt`: add `python-magic`.
- `backend/Dockerfile`: ensure `libmagic1` is installed (OS dep).
- `backend/security_tests/`: new A08/A05-style test for spoofed uploads.
- No change to the accepted file types or the success-path API contract.

## Out of scope

- Deep content scanning / AV integration (ClamAV, etc.).
- Re-encoding images to strip embedded payloads.
- Blocking macro-enabled Office formats (DOC/DOCX remain allowed as today).
