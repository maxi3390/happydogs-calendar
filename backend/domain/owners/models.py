from django.db import models
from domain.addresses.models import Address
from domain.files.validators import validate_file_size, validate_image_type


class Owner(Address):
    """Model representing a pet owner."""
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    id_number = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="ID Number / DNI")
    birth_date = models.DateField(null=True, blank=True, help_text="Date of birth (dd/mm/yyyy)")
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_can_pickup = models.BooleanField(default=False, help_text="Can the emergency contact pick up the pet?")
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
