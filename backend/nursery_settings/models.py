from datetime import time

from django.db import models
from domain.files.validators import validate_file_size, validate_image_type


class NurserySetting(models.Model):
    """Singleton model for nursery-wide configuration."""
    daily_booking_limit = models.PositiveIntegerField(
        default=0,
        help_text="Maximum number of bookings allowed per day. 0 means unlimited."
    )
    logo = models.ImageField(
        upload_to='logos/',
        blank=True,
        null=True,
        validators=[validate_file_size, validate_image_type],
        help_text="System logo (JPEG, PNG, GIF, WEBP — max 5 MB)",
    )

    # Notification system fields. The cron container reads
    # ``notifications_run_time`` once per minute and fires the
    # ``generate_notifications`` management command when wall-clock
    # >= this value AND the command hasn't run today yet.
    notifications_run_time = models.TimeField(
        default=time(7, 0),
        help_text="Time of day the daily notifications cron runs.",
    )
    deworming_default_due_days = models.PositiveIntegerField(
        default=90,
        help_text="Days after a deworming treatment before it is considered due.",
    )
    notifications_vaccination_enabled = models.BooleanField(default=True)
    notifications_arrivals_enabled = models.BooleanField(default=True)
    notifications_egress_enabled = models.BooleanField(default=True)
    notifications_birthdays_enabled = models.BooleanField(default=True)
    notifications_deworming_enabled = models.BooleanField(default=True)
    notification_recipient_lookback_days = models.PositiveIntegerField(
        default=30,
        help_text=(
            "Only fan notifications out to users whose ``last_login`` is "
            "within this many days. 0 disables the filter (every active "
            "user receives notifications, regardless of last_login)."
        ),
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
