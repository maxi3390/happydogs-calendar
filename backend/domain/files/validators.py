import magic
from django.conf import settings
from django.core.exceptions import ValidationError

# libmagic sometimes reports Office formats by their generic container type
# rather than the canonical Office MIME. Map those back so genuine .doc/.docx
# files are not falsely rejected.
_MIME_ALIASES = {
    # Modern .docx is a ZIP container; older libmagic builds report zip.
    'application/zip':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    # Legacy .doc is an OLE2 compound file.
    'application/x-ole-storage': 'application/msword',
    'application/CDFV2': 'application/msword',
}


def validate_file_size(file):
    max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 5 * 1024 * 1024)
    if file.size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise ValidationError(f"File size must not exceed {max_mb:.0f} MB.")


def _sniff_mime(file):
    """Return the MIME type detected from the file's actual bytes.

    Reads a bounded prefix and rewinds so the caller can still save the file.
    Returns ``None`` when the content can't be read (e.g. a stored FieldFile
    that isn't open) so field-level validation degrades to a no-op rather than
    erroring — the real enforcement path (a fresh upload) is always readable.
    """
    try:
        file.seek(0)
        head = file.read(2048)
        file.seek(0)
    except (ValueError, OSError, AttributeError):
        return None
    if not head:
        return None
    if isinstance(head, str):
        head = head.encode('latin-1', 'ignore')
    detected = magic.from_buffer(head, mime=True)
    return _MIME_ALIASES.get(detected, detected)


def validate_image_type(file):
    allowed = getattr(settings, 'ALLOWED_IMAGE_TYPES', [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    ])
    detected = _sniff_mime(file)
    if detected is not None and detected not in allowed:
        raise ValidationError(
            f"Unsupported image type '{detected}'. "
            f"Allowed types: {', '.join(allowed)}"
        )


def validate_document_type(file):
    allowed = getattr(settings, 'ALLOWED_DOCUMENT_TYPES', [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ])
    detected = _sniff_mime(file)
    if detected is not None and detected not in allowed:
        raise ValidationError(
            f"Unsupported file type '{detected}'. "
            f"Allowed types: JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX"
        )
