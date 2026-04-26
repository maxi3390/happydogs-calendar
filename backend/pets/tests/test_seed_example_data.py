"""Tests for the `seed_example_data` management command.

The command lives at ``backend/pets/management/commands/seed_example_data.py``.
Covered spec: ``openspec/specs/tooling/seed/spec.md``.
"""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from feature_flags.models import FeatureFlag
from notifications.models import (
    Notification,
    NotificationPreference,
    NotificationTemplate,
)
from pets.models import (
    MedicalNote,
    Owner,
    Pet,
    Schedule,
    Vaccination,
    VaccinationType,
    Vet,
)
from pets.management.commands import seed_example_data as seed_module
from tests.factories import create_owner, create_pet

User = get_user_model()


EXPECTED_COUNTS = {
    'users': len(seed_module.SEED_USERS),
    'vaccination_types': len(seed_module.SEED_VACCINATION_TYPES),
    'vets': len(seed_module.SEED_VETS),
    'owners': len(seed_module.SEED_OWNERS),
    'pets': len(seed_module.SEED_PETS),
    'vaccinations': len(seed_module._seed_vaccinations()),
    'medical_notes': len(seed_module.SEED_MEDICAL_NOTES),
    'schedules': len(seed_module._seed_schedules()),
}


def _seed_counts():
    """Return the counts of seed-owned rows currently in the DB."""
    seed_owner_emails = [o['email'] for o in seed_module.SEED_OWNERS]
    seed_user_emails = [u['email'] for u in seed_module.SEED_USERS]
    seed_vax_names = [v['name'] for v in seed_module.SEED_VACCINATION_TYPES]
    seed_vet_names = [v['name'] for v in seed_module.SEED_VETS]
    owner_ids = list(
        Owner.objects.filter(email__in=seed_owner_emails).values_list('id', flat=True)
    )
    pet_ids = list(
        Pet.objects.filter(
            owner_id__in=owner_ids,
            name__in=[p['name'] for p in seed_module.SEED_PETS],
        ).values_list('id', flat=True)
    )
    return {
        'users': User.objects.filter(email__in=seed_user_emails).count(),
        'vaccination_types': VaccinationType.objects.filter(name__in=seed_vax_names).count(),
        'vets': Vet.objects.filter(name__in=seed_vet_names).count(),
        'owners': Owner.objects.filter(email__in=seed_owner_emails).count(),
        'pets': Pet.objects.filter(id__in=pet_ids).count(),
        'vaccinations': Vaccination.objects.filter(pet_id__in=pet_ids).count(),
        'medical_notes': MedicalNote.objects.filter(pet_id__in=pet_ids).count(),
        'schedules': Schedule.objects.filter(pet_id__in=pet_ids).count(),
    }


# Django forces DEBUG=False during tests, which would always trip the
# production guard. Simulate a development shell by overriding it.
@override_settings(DEBUG=True)
class SeedExampleDataEmptyDBTests(TestCase):

    def test_empty_db_creates_exactly_expected_counts(self):
        out = StringIO()
        call_command('seed_example_data', stdout=out)

        self.assertEqual(_seed_counts(), EXPECTED_COUNTS)
        self.assertIn('Seed complete', out.getvalue())

    def test_quiet_suppresses_summary(self):
        out = StringIO()
        call_command('seed_example_data', '--quiet', stdout=out)

        self.assertEqual(out.getvalue(), '')
        self.assertEqual(_seed_counts(), EXPECTED_COUNTS)

    def test_seed_password_is_set_on_created_users(self):
        call_command('seed_example_data', '--quiet')
        sofia = User.objects.get(email='sofia@happydogs.example')
        self.assertTrue(sofia.check_password(seed_module.SEED_USER_PASSWORD))


@override_settings(DEBUG=True)
class SeedExampleDataIdempotencyTests(TestCase):

    def test_second_run_does_not_duplicate_rows(self):
        call_command('seed_example_data', '--quiet')
        first = _seed_counts()

        call_command('seed_example_data', '--quiet')
        second = _seed_counts()

        self.assertEqual(first, second)
        self.assertEqual(second, EXPECTED_COUNTS)

    def test_second_run_reports_zero_created(self):
        call_command('seed_example_data', '--quiet')

        out = StringIO()
        call_command('seed_example_data', stdout=out)

        for line in out.getvalue().splitlines():
            if 'created=' in line:
                # Only 'created=0' is acceptable on the second pass.
                self.assertIn('created=0', line, f'unexpected line: {line!r}')


@override_settings(DEBUG=True)
class SeedExampleDataDoesNotClobberForeignRowsTests(TestCase):

    def test_unrelated_rows_survive_a_seed_run(self):
        foreign_owner = create_owner(
            email='not.seeded@example.com',
            first_name='Foreign', last_name='Owner',
        )
        foreign_pet = create_pet(owner=foreign_owner, name='ExternalBuddy')
        foreign_user = User.objects.create_user(
            email='user.not.seeded@example.com',
            password='x',
            first_name='X', last_name='Y',
        )

        call_command('seed_example_data', '--quiet')

        self.assertTrue(Owner.objects.filter(pk=foreign_owner.pk).exists())
        self.assertTrue(Pet.objects.filter(pk=foreign_pet.pk).exists())
        self.assertTrue(User.objects.filter(pk=foreign_user.pk).exists())
        self.assertEqual(_seed_counts(), EXPECTED_COUNTS)


@override_settings(DEBUG=True)
class SeedExampleDataResetTests(TestCase):

    def test_reset_recreates_seeded_rows_even_after_tampering(self):
        call_command('seed_example_data', '--quiet')

        rocco = Pet.objects.get(owner__email='luis.fernandez@seed.example', name='Rocco')
        rocco.temperament = 'aggressive'
        rocco.save()

        luna = Pet.objects.get(owner__email='maria.lopez@seed.example', name='Luna')
        luna.delete()

        call_command('seed_example_data', '--reset', '--quiet')

        rocco = Pet.objects.get(owner__email='luis.fernandez@seed.example', name='Rocco')
        self.assertEqual(rocco.temperament, 'friendly')
        self.assertTrue(
            Pet.objects.filter(owner__email='maria.lopez@seed.example', name='Luna').exists()
        )
        self.assertEqual(_seed_counts(), EXPECTED_COUNTS)

    def test_reset_leaves_non_seed_rows_alone(self):
        foreign_owner = create_owner(
            email='keep.me@example.com',
            first_name='Keep', last_name='Me',
        )
        foreign_pet = create_pet(owner=foreign_owner, name='Tangent')

        call_command('seed_example_data', '--quiet')
        call_command('seed_example_data', '--reset', '--quiet')

        self.assertTrue(Owner.objects.filter(pk=foreign_owner.pk).exists())
        self.assertTrue(Pet.objects.filter(pk=foreign_pet.pk).exists())


class SeedExampleDataProductionGuardTests(TestCase):

    @override_settings(DEBUG=False)
    def test_refuses_when_debug_false_without_flag(self):
        before = _seed_counts()

        with self.assertRaises(CommandError) as ctx:
            call_command('seed_example_data')
        self.assertIn('--allow-production', str(ctx.exception))

        # State must be unchanged — spec: "database SHALL be unchanged".
        self.assertEqual(_seed_counts(), before)

    @override_settings(DEBUG=False)
    def test_allows_when_flag_is_set(self):
        call_command('seed_example_data', '--allow-production', '--quiet')
        self.assertEqual(_seed_counts(), EXPECTED_COUNTS)


@override_settings(DEBUG=True)
class SeedExampleDataVetWiringTests(TestCase):
    """Cover Vet rows, Owner primary/emergency vet FKs, Pet vet_override."""

    def test_every_seeded_owner_has_primary_vet(self):
        call_command('seed_example_data', '--quiet')

        seeded_owners = Owner.objects.filter(
            email__in=[o['email'] for o in seed_module.SEED_OWNERS]
        )
        self.assertEqual(seeded_owners.count(), len(seed_module.SEED_OWNERS))
        for owner in seeded_owners:
            self.assertIsNotNone(
                owner.primary_vet_id,
                f'owner {owner.email} has no primary_vet',
            )

    def test_at_least_four_owners_have_emergency_vet(self):
        call_command('seed_example_data', '--quiet')

        with_emergency = Owner.objects.filter(
            email__in=[o['email'] for o in seed_module.SEED_OWNERS],
            emergency_vet__isnull=False,
        ).count()
        self.assertGreaterEqual(with_emergency, 4)

    def test_owner_vet_fks_match_seed_dataset(self):
        call_command('seed_example_data', '--quiet')

        for data in seed_module.SEED_OWNERS:
            owner = Owner.objects.get(email=data['email'])
            expected_primary = data.get('primary_vet_name')
            if expected_primary:
                self.assertIsNotNone(owner.primary_vet_id)
                self.assertEqual(owner.primary_vet.name, expected_primary)
            else:
                self.assertIsNone(owner.primary_vet_id)

            expected_emergency = data.get('emergency_vet_name')
            if expected_emergency:
                self.assertIsNotNone(owner.emergency_vet_id)
                self.assertEqual(owner.emergency_vet.name, expected_emergency)
            else:
                self.assertIsNone(owner.emergency_vet_id)

    def test_pets_with_vet_override_differ_from_owner_primary(self):
        call_command('seed_example_data', '--quiet')

        pets_with_override = Pet.objects.filter(
            owner__email__in=[o['email'] for o in seed_module.SEED_OWNERS],
            vet_override__isnull=False,
        )
        self.assertGreaterEqual(pets_with_override.count(), 2)
        for pet in pets_with_override:
            self.assertIsNotNone(pet.owner, 'override pets should have an owner in the seed')
            self.assertNotEqual(
                pet.vet_override_id, pet.owner.primary_vet_id,
                f'override for {pet.name} matches the owner primary_vet '
                '— intent is to demonstrate divergence',
            )

    def test_effective_vet_prefers_override_then_owner_primary(self):
        call_command('seed_example_data', '--quiet')

        bugs = Pet.objects.get(owner__email='maria.lopez@seed.example', name='Bugs')
        self.assertEqual(bugs.effective_vet.name, 'Exotic Animals Specialist')

        # A pet with no override but an owner primary_vet falls back to it.
        rocco = Pet.objects.get(owner__email='luis.fernandez@seed.example', name='Rocco')
        self.assertIsNone(rocco.vet_override_id)
        self.assertEqual(rocco.effective_vet.name, 'General Vet Clinic')

    def test_reset_removes_and_recreates_seeded_vets(self):
        call_command('seed_example_data', '--quiet')
        self.assertEqual(
            Vet.objects.filter(name__in=[v['name'] for v in seed_module.SEED_VETS]).count(),
            len(seed_module.SEED_VETS),
        )

        call_command('seed_example_data', '--reset', '--quiet')

        self.assertEqual(
            Vet.objects.filter(name__in=[v['name'] for v in seed_module.SEED_VETS]).count(),
            len(seed_module.SEED_VETS),
        )
        # Owner FKs survive because they were re-created pointing at the fresh vets.
        ana = Owner.objects.get(email='ana.garcia@seed.example')
        self.assertEqual(ana.primary_vet.name, 'Feline Health Practice')

    def test_reset_leaves_non_seed_vets_alone(self):
        # Pre-existing non-seed vet created out of band.
        foreign_vet = Vet.objects.create(name='Some Other Clinic', phone='x')

        call_command('seed_example_data', '--quiet')
        call_command('seed_example_data', '--reset', '--quiet')

        self.assertTrue(Vet.objects.filter(pk=foreign_vet.pk).exists())


@override_settings(DEBUG=True)
class SeedExampleDataNotificationsTests(TestCase):
    """Cover NotificationTemplate, NotificationPreference, and the
    pet/vaccination/schedule fields the notifications cron consumes."""

    def test_notification_templates_are_seeded(self):
        call_command('seed_example_data', '--quiet')
        for tpl_data in seed_module.SEED_NOTIFICATION_TEMPLATES:
            tpl = NotificationTemplate.objects.get(scope=tpl_data['scope'])
            self.assertEqual(tpl.email_subject, tpl_data['email_subject'])
            self.assertEqual(tpl.email_body, tpl_data['email_body'])
            self.assertEqual(tpl.whatsapp_text, tpl_data['whatsapp_text'])

    def test_notification_preferences_cover_both_states(self):
        call_command('seed_example_data', '--quiet')
        prefs = list(
            NotificationPreference.objects.filter(
                user__email__in=[u['email'] for u in seed_module.SEED_USERS]
            ).values_list('email_enabled', flat=True)
        )
        self.assertEqual(len(prefs), len(seed_module.SEED_USERS))
        self.assertIn(True, prefs)
        self.assertIn(False, prefs)

    def test_pet_birthday_today(self):
        call_command('seed_example_data', '--quiet')
        from datetime import date
        today = date.today()
        # At least one seeded pet's birth_date matches today's month-day.
        match = Pet.objects.filter(
            birth_date__month=today.month,
            birth_date__day=today.day,
        ).count()
        self.assertGreaterEqual(match, 1)

    def test_deworming_dates_are_due(self):
        call_command('seed_example_data', '--quiet')
        from datetime import date, timedelta
        from nursery_settings.models import NurserySetting
        cutoff = date.today() - timedelta(
            days=NurserySetting.load().deworming_default_due_days,
        )
        self.assertGreaterEqual(
            Pet.objects.filter(
                last_internal_deworming_date__lte=cutoff,
            ).count(),
            1,
        )
        self.assertGreaterEqual(
            Pet.objects.filter(
                last_external_deworming_date__lte=cutoff,
            ).count(),
            1,
        )

    def test_master_flag_off_creates_no_notifications(self):
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': False},
        )
        call_command('seed_example_data', '--quiet')
        self.assertEqual(Notification.objects.count(), 0)

    def test_master_flag_on_materialises_notifications(self):
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': True},
        )
        call_command('seed_example_data', '--quiet')
        self.assertGreater(Notification.objects.count(), 0)
        kinds = set(
            Notification.objects.values_list('kind', flat=True).distinct()
        )
        # The seeded fixture is hand-tuned to fire at least these kinds.
        self.assertIn(Notification.KIND_PET_BIRTHDAY, kinds)
        self.assertIn(Notification.KIND_DEWORMING_INTERNAL_DUE, kinds)
        self.assertIn(Notification.KIND_DEWORMING_EXTERNAL_DUE, kinds)

    def test_reset_clears_seed_owned_notification_rows(self):
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': True},
        )
        # Foreign pet + a notification on it that should survive --reset.
        from datetime import date
        foreign = create_pet(
            owner=create_owner(email='outside@example.com'),
            name='Outside',
        )
        outside_notif = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=foreign,
            event_date=date.today(),
            recipient_user=User.objects.create_user(
                email='outside.user@example.com', password='x',
                first_name='X', last_name='Y',
            ),
            payload={'pet_name': 'Outside'},
        )

        call_command('seed_example_data', '--quiet')
        self.assertGreater(Notification.objects.count(), 1)

        call_command('seed_example_data', '--reset', '--quiet')

        # The out-of-band notification SHOULD survive --reset (it's not
        # tied to a seed-owned pet).
        self.assertTrue(Notification.objects.filter(pk=outside_notif.pk).exists())
        # The seeded templates / preferences SHOULD have been re-created.
        self.assertEqual(
            NotificationTemplate.objects.filter(
                scope__in=[t['scope'] for t in seed_module.SEED_NOTIFICATION_TEMPLATES],
            ).count(),
            len(seed_module.SEED_NOTIFICATION_TEMPLATES),
        )
