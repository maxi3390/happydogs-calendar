from django.db import models
from django.core.exceptions import ValidationError
from domain.files.validators import validate_file_size, validate_document_type


class Document(models.Model):
    """Model representing a document attached to a pet or an owner."""
    pet = models.ForeignKey(
        'pets.Pet', on_delete=models.CASCADE, related_name='documents',
        null=True, blank=True,
    )
    owner = models.ForeignKey(
        'pets.Owner', on_delete=models.CASCADE, related_name='documents',
        null=True, blank=True,
    )
    file = models.FileField(
        upload_to='documents/%Y/%m/',
        validators=[validate_file_size, validate_document_type],
        help_text="Supported formats: JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX — max 5 MB",
    )
    original_filename = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'pets'
        ordering = ['-uploaded_at']

    def __str__(self):
        target = self.pet or self.owner or "unlinked"
        return f"{self.original_filename} ({target})"

    def clean(self):
        if not self.pet and not self.owner:
            raise ValidationError("A document must be linked to a pet or an owner.")
        if self.pet and self.owner:
            raise ValidationError("A document cannot be linked to both a pet and an owner.")
