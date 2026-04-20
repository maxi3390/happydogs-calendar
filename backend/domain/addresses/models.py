from django.db import models


class Address(models.Model):
    """Reusable abstract address mixin.

    Inherit from this model to give any entity a structured postal address.
    All fields are optional so partial addresses are valid.

    Field names use English for the codebase; Spanish equivalents (ciudad,
    localidad, provincia, país) are carried by the i18n layer via the
    ``owner.city`` / ``owner.locality`` / ``owner.province`` / ``owner.country``
    translation keys.

    Example:
        class Branch(Address, models.Model):
            name = models.CharField(max_length=100)
            # street, city, state, province, country come from Address
    """

    street = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Street address line (building number + street name + unit)",
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Ciudad",
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Localidad",
    )
    province = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Provincia",
    )
    country = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="País",
    )

    class Meta:
        abstract = True
