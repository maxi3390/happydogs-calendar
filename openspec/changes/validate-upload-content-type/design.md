# Design — Content-based upload validation

## The hole

`validators.py` today branches on `file.content_type`:

```python
if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
    raise ValidationError(...)
```

`content_type` comes straight from the multipart part header the client sent.
`curl -F 'file=@evil.exe;type=image/jpeg'` sails through. The fix is to ignore
the declared type for the security decision and derive it from the bytes.

## Detection

Use `libmagic` via the `python-magic` binding:

```python
import magic

def _sniff(file):
    head = file.read(2048)
    file.seek(0)
    return magic.from_buffer(head, mime=True)
```

2048 bytes is enough for every signature in the allow-list (JPEG/PNG/GIF/WEBP
magic, `%PDF-`, the OLE/ZIP headers for DOC/DOCX). Always `seek(0)` afterward so
the subsequent `.save()` writes the whole file.

## Keep the allow-lists; keep the contract

The allow-lists already live in settings (`ALLOWED_IMAGE_TYPES`,
`ALLOWED_DOCUMENT_TYPES`). Image validators check the sniffed type against the
image list; document validators against the document list. The raised
`ValidationError` message and shape stay identical, so legitimate uploads and
the existing "unsupported type" scenario behave exactly as before — only the
*source of truth* for the type changes.

### DOCX/DOC nuance

`libmagic` reports modern `.docx` as
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`
(sometimes `application/zip` on older libmagic). `.doc` reports as
`application/msword` (sometimes `application/x-ole-storage`). The validator
SHALL accept the canonical types in the allow-list and MAY map the known
generic fallbacks (`application/zip` for a `.docx` whose inner structure
matches, `application/x-ole-storage` for `.doc`) so valid Office files aren't
falsely rejected. This mapping is documented in the validator and covered by
tests for each allowed format.

## OS dependency

`python-magic` needs `libmagic`. The backend image (Debian slim) installs
`libmagic1` alongside the existing `postgresql-client`. This is added to the
`base` stage introduced by the `backend-production-runtime` change (or directly
if that change lands later).

## Test strategy

- Success path per allowed format (reuse the in-memory Pillow images already
  used by the document/image tests; add tiny valid PDF/DOC/DOCX byte fixtures).
- **Spoof rejection:** bytes of a Windows PE / shell script with
  `content_type='image/jpeg'` → rejected. Lives in `security_tests` so
  `make security` gates it.
- Declared-type mismatch that is nonetheless a *valid* image (e.g. a real PNG
  sent as `image/jpeg`) → accepted, because the sniffed type is allowed. This
  documents that we validate content, not the label.
