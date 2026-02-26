from django.db import models


class NurserySetting(models.Model):
    """Singleton model for nursery-wide configuration."""
    daily_booking_limit = models.PositiveIntegerField(
        default=0,
        help_text="Maximum number of bookings allowed per day. 0 means unlimited."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Nursery Setting"
        verbose_name_plural = "Nursery Settings"

    def __str__(self):
        return f"Nursery Settings (limit={self.daily_booking_limit})"

    def save(self, *args, **kwargs):
        # Enforce singleton: always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
