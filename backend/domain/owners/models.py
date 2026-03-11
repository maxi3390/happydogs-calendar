from django.db import models
from domain.files.validators import validate_file_size, validate_image_type


class Owner(models.Model):
    """Model representing a pet owner."""
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/owners/',
        blank=True,
        null=True,
        validators=[validate_file_size, validate_image_type],
        help_text="Profile picture (JPEG, PNG, GIF, WEBP — max 5 MB)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'pets'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
