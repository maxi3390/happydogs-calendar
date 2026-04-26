"""Services for the notifications app.

This module computes which (pet, kind, event_date) tuples are due on a
given day and materialises one ``Notification`` row per active staff
user. The actual email side-effects live in ``email.py``; this layer
returns a structured result so callers (the management command, tests)
can both create rows and decide whether to send emails.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Iterable

from django.contrib.auth import get_user_model
from django.db.models import Max
from django.utils import timezone

from feature_flags.services import is_feature_enabled
from nursery_settings.models import NurserySetting

from .models import Notification

User = get_user_model()


@dataclass
class _Event:
    kind: str
    pet: object
    event_date: date
    payload: dict
    schedule: object | None = None
    vaccination: object | None = None


@dataclass
class GenerationResult:
    created: list[Notification] = field(default_factory=list)
    existing: list[Notification] = field(default_factory=list)

    @property
    def created_count(self) -> int:
        return len(self.created)

    @property
    def existing_count(self) -> int:
        return len(self.existing)


def generate_for_date(today: date) -> GenerationResult:
    """Materialise one ``Notification`` row per (event, active user) for
    ``today``. Idempotent thanks to the natural-key UniqueConstraint.

    Returns a ``GenerationResult`` distinguishing newly created rows
    from rows that already existed (so the email layer only delivers
    fresh notifications).
    """
    result = GenerationResult()
    if not is_feature_enabled('notifications'):
        return result

    settings = NurserySetting.load()
    _auto_dismiss_stale(today)

    recipients = list(_recipient_queryset(settings))
    if not recipients:
        return result

    events: list[_Event] = []
    if settings.notifications_birthdays_enabled:
        events.extend(_birthday_events(today))
    if settings.notifications_arrivals_enabled:
        events.extend(_arrival_events(today))
    if settings.notifications_egress_enabled:
        events.extend(_egress_events(today))
    if settings.notifications_vaccination_enabled:
        events.extend(_vaccination_due_events(today))
    if settings.notifications_deworming_enabled:
        events.extend(_deworming_due_events(today, settings))

    for event in events:
        for user in recipients:
            notif, created = Notification.objects.get_or_create(
                kind=event.kind,
                pet=event.pet,
                event_date=event.event_date,
                recipient_user=user,
                schedule=event.schedule,
                vaccination=event.vaccination,
                defaults={'payload': event.payload},
            )
            if created:
                result.created.append(notif)
            else:
                result.existing.append(notif)

    return result


_STALE_THRESHOLD_DAYS = 7


def _recipient_queryset(settings):
    """Return the queryset of users that the cron should fan out to.

    Active users are filtered by ``last_login`` to avoid spamming
    ex-employees and abandoned accounts. Users with ``last_login=NULL``
    (just-created, never authenticated) are excluded — they cannot see
    the notification anyway. A lookback of ``0`` disables the filter
    and reverts to the legacy "every active user" behaviour.
    """
    qs = User.objects.filter(is_active=True)
    lookback = settings.notification_recipient_lookback_days
    if lookback > 0:
        cutoff = timezone.now() - timedelta(days=lookback)
        qs = qs.filter(last_login__gte=cutoff)
    return qs


def _auto_dismiss_stale(today: date) -> int:
    """Mark notifications older than the threshold as dismissed.

    Keeps the inbox finite without operator intervention. Returns the
    number of rows touched so the management command can log it.
    """
    cutoff = today - timedelta(days=_STALE_THRESHOLD_DAYS)
    return Notification.objects.filter(
        event_date__lt=cutoff, dismissed_at__isnull=True,
    ).update(dismissed_at=timezone.now())


# ── Per-kind event collectors ────────────────────────────────────────────────

def _birthday_events(today: date) -> Iterable[_Event]:
    from pets.models import Pet
    pets = Pet.objects.filter(
        birth_date__isnull=False,
        birth_date__month=today.month,
        birth_date__day=today.day,
    ).select_related('owner')
    for pet in pets:
        years = today.year - pet.birth_date.year
        yield _Event(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=pet,
            event_date=today,
            payload=_base_payload(pet) | {'age_years': years},
        )


def _arrival_events(today: date) -> Iterable[_Event]:
    tomorrow = today + timedelta(days=1)
    for sched in _schedules_starting_on(today):
        yield _Event(
            kind=Notification.KIND_PET_ARRIVING_TODAY,
            pet=sched.pet, event_date=today, schedule=sched,
            payload=_schedule_payload(sched),
        )
    for sched in _schedules_starting_on(tomorrow):
        yield _Event(
            kind=Notification.KIND_PET_ARRIVING_TOMORROW,
            pet=sched.pet, event_date=tomorrow, schedule=sched,
            payload=_schedule_payload(sched),
        )


def _egress_events(today: date) -> Iterable[_Event]:
    tomorrow = today + timedelta(days=1)
    for sched in _schedules_ending_on(today):
        yield _Event(
            kind=Notification.KIND_PET_EGRESS_TODAY,
            pet=sched.pet, event_date=today, schedule=sched,
            payload=_schedule_payload(sched),
        )
    for sched in _schedules_ending_on(tomorrow):
        yield _Event(
            kind=Notification.KIND_PET_EGRESS_TOMORROW,
            pet=sched.pet, event_date=tomorrow, schedule=sched,
            payload=_schedule_payload(sched),
        )


def _vaccination_due_events(today: date) -> Iterable[_Event]:
    from pets.models import Vaccination, VaccinationType
    types_by_name = {
        vt.name: vt for vt in VaccinationType.objects.filter(enabled=True)
    }
    # Latest vaccination per (pet, vax_type). Doing this in-DB avoids
    # loading every historical row into Python.
    latest = (
        Vaccination.objects
        .values('pet_id', 'vax_type')
        .annotate(latest_date=Max('date'))
    )
    pet_ids = {row['pet_id'] for row in latest}
    pets_by_id = {
        p.id: p for p in
        _pets_with_owner(pet_ids)
    }
    for row in latest:
        vt = types_by_name.get(row['vax_type'])
        if vt is None or vt.due_after_days == 0:
            continue
        due = row['latest_date'] + timedelta(days=vt.due_after_days)
        if due > today:
            continue
        pet = pets_by_id.get(row['pet_id'])
        if pet is None:
            continue
        # Find the actual Vaccination row that pinned the latest date,
        # so we can FK it on the notification.
        vax = Vaccination.objects.filter(
            pet_id=row['pet_id'], vax_type=row['vax_type'],
            date=row['latest_date'],
        ).order_by('-id').first()
        yield _Event(
            kind=Notification.KIND_VACCINATION_DUE,
            pet=pet, event_date=due, vaccination=vax,
            payload=_base_payload(pet) | {
                'vax_type': vt.name,
                'vax_label': vt.label,
                'due_date': due.isoformat(),
                'last_date': row['latest_date'].isoformat(),
            },
        )


def _deworming_due_events(today: date, settings) -> Iterable[_Event]:
    from pets.models import Pet
    days = settings.deworming_default_due_days
    if days == 0:
        return
    cutoff = today - timedelta(days=days)
    qs = Pet.objects.filter(
        last_internal_deworming_date__isnull=False,
        last_internal_deworming_date__lte=cutoff,
    ).select_related('owner')
    for pet in qs:
        due = pet.last_internal_deworming_date + timedelta(days=days)
        yield _Event(
            kind=Notification.KIND_DEWORMING_INTERNAL_DUE,
            pet=pet, event_date=due,
            payload=_base_payload(pet) | {
                'side': 'internal',
                'due_date': due.isoformat(),
                'last_date': pet.last_internal_deworming_date.isoformat(),
            },
        )
    qs = Pet.objects.filter(
        last_external_deworming_date__isnull=False,
        last_external_deworming_date__lte=cutoff,
    ).select_related('owner')
    for pet in qs:
        due = pet.last_external_deworming_date + timedelta(days=days)
        yield _Event(
            kind=Notification.KIND_DEWORMING_EXTERNAL_DUE,
            pet=pet, event_date=due,
            payload=_base_payload(pet) | {
                'side': 'external',
                'due_date': due.isoformat(),
                'last_date': pet.last_external_deworming_date.isoformat(),
            },
        )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _schedules_starting_on(d: date):
    from pets.models import Schedule
    return (
        Schedule.objects
        .filter(start_date=d, status__in=['scheduled', 'checked_in'])
        .select_related('pet', 'pet__owner')
    )


def _schedules_ending_on(d: date):
    from pets.models import Schedule
    return (
        Schedule.objects
        .filter(end_date=d, status__in=['scheduled', 'checked_in'])
        .select_related('pet', 'pet__owner')
    )


def _pets_with_owner(pet_ids):
    from pets.models import Pet
    return Pet.objects.filter(id__in=pet_ids).select_related('owner')


def _base_payload(pet) -> dict:
    owner = pet.owner
    return {
        'pet_name': pet.name,
        'owner_first_name': owner.first_name if owner else '',
        'owner_last_name': owner.last_name if owner else '',
    }


def _schedule_payload(schedule) -> dict:
    return _base_payload(schedule.pet) | {
        'start_date': schedule.start_date.isoformat(),
        'end_date': schedule.end_date.isoformat(),
        'start_time': schedule.start_time.strftime('%H:%M'),
        'end_time': schedule.end_time.strftime('%H:%M'),
    }
