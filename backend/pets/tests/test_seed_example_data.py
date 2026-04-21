"""Tests for the `seed_example_data` management command.

The command lives at ``backend/pets/management/commands/seed_example_data.py``.
Covered spec: ``openspec/specs/tooling/seed/spec.md``.
"""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from pets.models import (
    MedicalNote,
    Owner,
    Pet,
    Schedule,
    Vaccination,
    VaccinationType,
)
from pets.management.commands import seed_example_data as seed_module
from tests.factories import create_owner, create_pet

User = get_user_model()


EXPECTED_COUNTS = {
    'users': len(seed_module.SEED_USERS),
    'vaccination_types': len(seed_module.SEED_VACCINATION_TYPES),
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
