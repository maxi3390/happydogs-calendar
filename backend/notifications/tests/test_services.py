from datetime import date, timedelta
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from feature_flags.models import FeatureFlag
from notifications.models import Notification
from notifications.services import generate_for_date
from nursery_settings.models import NurserySetting
from pets.models import Vaccination, VaccinationType

from tests.factories import (
    create_owner,
    create_pet,
    create_schedule,
    create_user,
)


def _set_vax_type(name, **defaults):
    """Create or update a VaccinationType. Several types are seeded by
    a data migration, so tests use ``update_or_create`` instead of
    ``create``."""
    obj, _ = VaccinationType.objects.update_or_create(
        name=name, defaults={'label': defaults.get('label', name.title()),
                             'enabled': True, **defaults},
    )
    return obj


TODAY = date(2025, 6, 15)


class _BaseGenerateTest(TestCase):
    """Common fixtures: enable the master flag, create two staff users
    so the cross-recipient fan-out is exercised, and pin a deterministic
    ``today``.
    """

    def setUp(self):
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': True},
        )
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.owner = create_owner(email='o@example.com', phone='+1234567890')


class FeatureFlagGuardTests(_BaseGenerateTest):
    def test_master_flag_off_short_circuits(self):
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': False},
        )
        create_pet(owner=self.owner, birth_date=TODAY)
        result = generate_for_date(TODAY)
        self.assertEqual(result.created_count, 0)
        self.assertFalse(Notification.objects.exists())


class BirthdayEventTests(_BaseGenerateTest):
    def test_creates_one_row_per_active_user(self):
        create_pet(
            owner=self.owner, name='Luna',
            birth_date=date(TODAY.year - 3, TODAY.month, TODAY.day),
        )
        result = generate_for_date(TODAY)
        # 1 event × 2 users
        self.assertEqual(result.created_count, 2)
        self.assertEqual(
            Notification.objects.filter(
                kind=Notification.KIND_PET_BIRTHDAY,
            ).count(),
            2,
        )
        notif = Notification.objects.filter(recipient_user=self.alice).first()
        self.assertEqual(notif.payload['pet_name'], 'Luna')
        self.assertEqual(notif.payload['age_years'], 3)
        self.assertEqual(notif.event_date, TODAY)

    def test_non_matching_birth_date_skipped(self):
        create_pet(owner=self.owner, birth_date=TODAY + timedelta(days=1))
        result = generate_for_date(TODAY)
        self.assertEqual(result.created_count, 0)

    def test_re_running_is_idempotent(self):
        create_pet(
            owner=self.owner,
            birth_date=date(TODAY.year - 2, TODAY.month, TODAY.day),
        )
        first = generate_for_date(TODAY)
        second = generate_for_date(TODAY)
        self.assertEqual(first.created_count, 2)
        self.assertEqual(second.created_count, 0)
        self.assertEqual(second.existing_count, 2)
        self.assertEqual(Notification.objects.count(), 2)

    def test_disabled_birthdays_skips(self):
        s = NurserySetting.load()
        s.notifications_birthdays_enabled = False
        s.save()
        create_pet(
            owner=self.owner,
            birth_date=date(TODAY.year - 1, TODAY.month, TODAY.day),
        )
        result = generate_for_date(TODAY)
        self.assertEqual(result.created_count, 0)


class ArrivalEgressEventTests(_BaseGenerateTest):
    def setUp(self):
        super().setUp()
        self.pet = create_pet(owner=self.owner, name='Max')

    def test_arrival_today(self):
        sched = create_schedule(
            pet=self.pet, start_date=TODAY,
            end_date=TODAY + timedelta(days=2),
        )
        generate_for_date(TODAY)
        kinds = list(
            Notification.objects.values_list('kind', flat=True).distinct()
        )
        self.assertIn(Notification.KIND_PET_ARRIVING_TODAY, kinds)
        notif = Notification.objects.filter(
            kind=Notification.KIND_PET_ARRIVING_TODAY,
            recipient_user=self.alice,
        ).first()
        self.assertEqual(notif.schedule_id, sched.id)
        self.assertEqual(notif.event_date, TODAY)

    def test_arrival_tomorrow(self):
        tomorrow = TODAY + timedelta(days=1)
        create_schedule(
            pet=self.pet, start_date=tomorrow,
            end_date=tomorrow + timedelta(days=1),
        )
        generate_for_date(TODAY)
        self.assertTrue(
            Notification.objects.filter(
                kind=Notification.KIND_PET_ARRIVING_TOMORROW,
                event_date=tomorrow,
            ).exists()
        )

    def test_egress_today(self):
        create_schedule(
            pet=self.pet,
            start_date=TODAY - timedelta(days=2),
            end_date=TODAY,
        )
        generate_for_date(TODAY)
        self.assertTrue(
            Notification.objects.filter(
                kind=Notification.KIND_PET_EGRESS_TODAY,
            ).exists()
        )

    def test_completed_schedule_ignored(self):
        create_schedule(
            pet=self.pet, start_date=TODAY, end_date=TODAY,
            status='completed',
        )
        result = generate_for_date(TODAY)
        # Pet has no birthday today, no vaccinations, no deworming → 0 events.
        self.assertEqual(result.created_count, 0)

    def test_disabled_arrivals_skips_arrival_only(self):
        s = NurserySetting.load()
        s.notifications_arrivals_enabled = False
        s.save()
        create_schedule(pet=self.pet, start_date=TODAY, end_date=TODAY)
        generate_for_date(TODAY)
        self.assertFalse(
            Notification.objects.filter(
                kind=Notification.KIND_PET_ARRIVING_TODAY,
            ).exists()
        )
        # Egress on the same day should still fire.
        self.assertTrue(
            Notification.objects.filter(
                kind=Notification.KIND_PET_EGRESS_TODAY,
            ).exists()
        )


class VaccinationDueEventTests(_BaseGenerateTest):
    def test_due_event_fires_on_or_after_due_date(self):
        _set_vax_type('rabies', label='Rabies', due_after_days=365)
        pet = create_pet(owner=self.owner, name='Rex')
        last = TODAY - timedelta(days=365)
        Vaccination.objects.create(pet=pet, vax_type='rabies', date=last)
        generate_for_date(TODAY)
        notif = Notification.objects.filter(
            kind=Notification.KIND_VACCINATION_DUE,
            recipient_user=self.alice,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.event_date, TODAY)
        self.assertEqual(notif.payload['vax_type'], 'rabies')
        self.assertEqual(notif.payload['vax_label'], 'Rabies')
        self.assertEqual(notif.vaccination.pet_id, pet.id)

    def test_not_yet_due_skipped(self):
        _set_vax_type('rabies', due_after_days=365)
        pet = create_pet(owner=self.owner)
        Vaccination.objects.create(
            pet=pet, vax_type='rabies',
            date=TODAY - timedelta(days=100),
        )
        generate_for_date(TODAY)
        self.assertFalse(
            Notification.objects.filter(
                kind=Notification.KIND_VACCINATION_DUE,
            ).exists()
        )

    def test_non_recurring_type_skipped(self):
        # due_after_days=0 means "never recurs".
        _set_vax_type('dhpp', due_after_days=0)
        pet = create_pet(owner=self.owner)
        Vaccination.objects.create(
            pet=pet, vax_type='dhpp',
            date=TODAY - timedelta(days=10000),
        )
        generate_for_date(TODAY)
        self.assertFalse(
            Notification.objects.filter(
                kind=Notification.KIND_VACCINATION_DUE,
            ).exists()
        )

    def test_uses_latest_vaccination(self):
        _set_vax_type('rabies', due_after_days=30)
        pet = create_pet(owner=self.owner)
        # Old one is past due; new one is not. Generator must use the latest.
        Vaccination.objects.create(
            pet=pet, vax_type='rabies',
            date=TODAY - timedelta(days=400),
        )
        Vaccination.objects.create(
            pet=pet, vax_type='rabies',
            date=TODAY - timedelta(days=10),
        )
        generate_for_date(TODAY)
        self.assertFalse(
            Notification.objects.filter(
                kind=Notification.KIND_VACCINATION_DUE,
            ).exists()
        )


class DewormingDueEventTests(_BaseGenerateTest):
    def test_internal_due(self):
        create_pet(
            owner=self.owner, name='Toby',
            last_internal_deworming_date=TODAY - timedelta(days=90),
        )
        generate_for_date(TODAY)
        notif = Notification.objects.filter(
            kind=Notification.KIND_DEWORMING_INTERNAL_DUE,
            recipient_user=self.alice,
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.payload['side'], 'internal')

    def test_external_not_yet_due(self):
        create_pet(
            owner=self.owner,
            last_external_deworming_date=TODAY - timedelta(days=10),
        )
        generate_for_date(TODAY)
        self.assertFalse(
            Notification.objects.filter(
                kind=Notification.KIND_DEWORMING_EXTERNAL_DUE,
            ).exists()
        )

    def test_respects_settings_default(self):
        s = NurserySetting.load()
        s.deworming_default_due_days = 30
        s.save()
        create_pet(
            owner=self.owner,
            last_internal_deworming_date=TODAY - timedelta(days=30),
        )
        generate_for_date(TODAY)
        self.assertTrue(
            Notification.objects.filter(
                kind=Notification.KIND_DEWORMING_INTERNAL_DUE,
            ).exists()
        )


class AutoCleanupTests(_BaseGenerateTest):
    def test_old_notifications_get_dismissed(self):
        pet = create_pet(owner=self.owner)
        old = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=pet,
            event_date=TODAY - timedelta(days=8),
            recipient_user=self.alice,
            payload={'pet_name': pet.name},
        )
        recent = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=pet,
            event_date=TODAY - timedelta(days=3),
            recipient_user=self.alice,
            payload={'pet_name': pet.name},
        )
        generate_for_date(TODAY)
        old.refresh_from_db()
        recent.refresh_from_db()
        self.assertIsNotNone(old.dismissed_at)
        self.assertIsNone(recent.dismissed_at)


class FanOutTests(_BaseGenerateTest):
    def test_inactive_users_skipped(self):
        self.bob.is_active = False
        self.bob.save()
        create_pet(
            owner=self.owner,
            birth_date=date(TODAY.year - 1, TODAY.month, TODAY.day),
        )
        result = generate_for_date(TODAY)
        # Only Alice receives a row.
        self.assertEqual(result.created_count, 1)
        self.assertEqual(
            Notification.objects.values_list('recipient_user_id', flat=True).first(),
            self.alice.id,
        )


class CommandTests(_BaseGenerateTest):
    def test_handles_today_override(self):
        create_pet(
            owner=self.owner,
            birth_date=date(2020, 6, 15),
        )
        out = StringIO()
        call_command('generate_notifications', '--today', '2025-06-15', stdout=out)
        self.assertIn('Generated 2', out.getvalue())
        self.assertEqual(Notification.objects.count(), 2)

    def test_invalid_today_raises(self):
        with self.assertRaises(CommandError):
            call_command('generate_notifications', '--today', 'not-a-date')

    def test_default_today_runs_against_system_date(self):
        # Smoke test only — no events scheduled, so no rows; we just
        # verify the command executes without error.
        out = StringIO()
        call_command('generate_notifications', stdout=out)
        self.assertIn('Generated 0', out.getvalue())
