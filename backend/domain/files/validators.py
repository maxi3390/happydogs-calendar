from django.conf import settings
from django.core.exceptions import ValidationError


def validate_file_size(file):
    max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 5 * 1024 * 1024)
    if file.size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise ValidationError(f"File size must not exceed {max_mb:.0f} MB.")


def validate_image_type(file):
    allowed = getattr(settings, 'ALLOWED_IMAGE_TYPES', [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    ])
    if hasattr(file, 'content_type') and file.content_type not in allowed:
        raise ValidationError(
            f"Unsupported image type '{file.content_type}'. "
            f"Allowed types: {', '.join(allowed)}"
        )


def validate_document_type(file):
    allowed = getattr(settings, 'ALLOWED_DOCUMENT_TYPES', [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ])
    if hasattr(file, 'content_type') and file.content_type not in allowed:
        raise ValidationError(
            f"Unsupported file type '{file.content_type}'. "
            f"Allowed types: JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX"
        )
