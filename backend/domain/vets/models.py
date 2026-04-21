from django.db import models
from domain.addresses.models import Address


class Vet(Address):
    """Veterinarian clinic or practitioner.

    Inherits the Address abstract mixin so vet records carry the same
    structured postal address (``street``, ``city``, ``state``, ``province``,
    ``country``) that owners have. Vets are shared resources: multiple
    owners may reference the same vet as their primary or emergency
    clinic, and individual pets can override the owner's primary via
    ``Pet.vet_override`` when their care needs a specialist.

    Deletion is non-cascading: all foreign keys from ``Owner`` and
    ``Pet`` use ``on_delete=SET_NULL``, so removing a vet clears the
    references without destroying the referencing records.
    """

    name = models.CharField(
        max_length=150,
        help_text="Clinic or veterinarian name (used as the display label).",
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text="Primary contact phone number.",
    )
    email = models.EmailField(
        blank=True,
        default='',
        help_text="Primary contact email.",
    )
    notes = models.TextField(
        blank=True,
        default='',
        help_text="Free-form operator notes (hours, payment, preferred contact).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'pets'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name
