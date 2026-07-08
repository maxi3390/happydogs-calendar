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
        indexes = [
            # Serves the calendar date-range query and the conflict-detection
            # overlap query (start_date <= end / end_date >= start).
            models.Index(fields=['start_date', 'end_date']),
            # Serves per-pet timelines.
            models.Index(fields=['pet', 'start_date']),
        ]

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
        Returns list of conflicts with details (one entry per overlapping pet).
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
                    'conflicting_pet_id': other_schedule.pet.id,
                    'conflicting_pet': other_schedule.pet.name,
                    'conflicting_schedule_id': other_schedule.id,
                    'reason': reasons[0] if reasons else None,
                    'reasons': reasons,
                    'date_range': date_range,
                    'time_slot': f"{other_schedule.start_time} - {other_schedule.end_time}"
                })

        return conflicts


def collate_reason_groups(conflicts):
    """Convert a per-overlap conflicts list into per-reason groups.

    Input: list of dicts as produced by ``Schedule.check_conflicts()`` /
    ``ScheduleViewSet.check_conflicts``. Each dict carries a ``reasons``
    list (or a single ``reason`` string) plus the conflicting pet's
    name, id, time_slot, and date_range.

    Output: list of ``{reason, pets: [{id, name, time_slot, date_range}]}``
    entries — one row per distinct reason, listing every overlap that
    triggered it. Insertion order is preserved.
    """
    reason_to_pets = {}
    order = []
    for c in conflicts:
        rs = c.get('reasons') or ([c['reason']] if c.get('reason') else [])
        for reason in rs:
            if not reason:
                continue
            if reason not in reason_to_pets:
                reason_to_pets[reason] = []
                order.append(reason)
            reason_to_pets[reason].append({
                'id': c.get('conflicting_pet_id'),
                'name': c.get('conflicting_pet'),
                'time_slot': c.get('time_slot'),
                'date_range': c.get('date_range'),
            })
    return [{'reason': r, 'pets': reason_to_pets[r]} for r in order]
