from django.db import models


class VaccinationType(models.Model):
    """Model representing a configurable vaccination type."""
    name = models.CharField(max_length=50, unique=True, help_text="Internal key (e.g. rabies)")
    label = models.CharField(max_length=100, help_text="Display label (e.g. Rabies)")
    enabled = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    due_after_days = models.PositiveIntegerField(
        default=365,
        help_text="Days after a vaccination of this type before the next is considered due. "
                  "0 means non-recurring (no notification will fire).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'pets'
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.label} ({'enabled' if self.enabled else 'disabled'})"


class Vaccination(models.Model):
    """Model representing a vaccination record for a pet."""
    pet = models.ForeignKey('pets.Pet', on_delete=models.CASCADE, related_name='vaccinations')
    vax_type = models.CharField(max_length=50)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'pets'
        ordering = ['-date']

    def __str__(self):
        return f"{self.pet.name} - {self.vax_type} ({self.date})"
