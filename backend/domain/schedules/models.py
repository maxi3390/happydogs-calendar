from django.db import models
from django.db.models import Q


class Schedule(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('checked_in', 'Checked In'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    pet = models.ForeignKey('pets.Pet', on_delete=models.CASCADE, related_name='schedules')
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'pets'
        ordering = ['start_date', 'start_time']

    def __str__(self):
        if self.start_date == self.end_date:
            return f"{self.pet.name} - {self.start_date} ({self.start_time} to {self.end_time})"
        return f"{self.pet.name} - {self.start_date} to {self.end_date} ({self.start_time} to {self.end_time})"

    def get_overlapping_schedules(self):
        """Get all schedules that overlap with this schedule's date range and time slot."""
        return Schedule.objects.filter(
            Q(start_date__lte=self.end_date) & Q(end_date__gte=self.start_date),
            status__in=['scheduled', 'checked_in'],
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk)

    def check_conflicts(self):
        """
        Check for conflicts with other scheduled pets.
        Returns list of conflicts with details.
        """
        conflicts = []
        overlapping = self.get_overlapping_schedules()

        for other_schedule in overlapping:
            is_compatible, reasons = self.pet.is_compatible_with(other_schedule.pet)
            if not is_compatible:
                date_range = (
                    f"{other_schedule.start_date}"
                    if other_schedule.start_date == other_schedule.end_date
                    else f"{other_schedule.start_date} to {other_schedule.end_date}"
                )
                conflicts.append({
                    'conflicting_pet': other_schedule.pet.name,
                    'conflicting_schedule_id': other_schedule.id,
                    'reason': reasons[0] if reasons else None,
                    'reasons': reasons,
                    'date_range': date_range,
                    'time_slot': f"{other_schedule.start_time} - {other_schedule.end_time}"
                })

        return conflicts
