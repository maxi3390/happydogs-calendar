from datetime import date, time, timedelta
from django.test import TestCase
from tests.factories import create_owner, create_pet, create_schedule, create_vaccination_type, create_vaccination
from pets.models import Owner, Pet, Schedule, VaccinationType, Vaccination


class OwnerModelTests(TestCase):

    def test_str_representation(self):
        owner = create_owner(first_name='John', last_name='Doe')
        self.assertEqual(str(owner), 'John Doe')

    def test_full_name_property(self):
        owner = create_owner(first_name='Jane', last_name='Smith')
        self.assertEqual(owner.full_name, 'Jane Smith')

    def test_ordering(self):
        o2 = create_owner(first_name='Zoe', last_name='Beta')
        o1 = create_owner(first_name='Alice', last_name='Alpha')
        owners = list(Owner.objects.all())
        self.assertEqual(owners[0], o1)
        self.assertEqual(owners[1], o2)


class PetModelTests(TestCase):

    def setUp(self):
        self.owner = create_owner()

    def test_creation_and_str(self):
        pet = create_pet(owner=self.owner, name='Buddy', species='dog')
        self.assertEqual(str(pet), 'Buddy (dog)')

    def test_ordering(self):
        p2 = create_pet(name='Ziggy')
        p1 = create_pet(name='Alpha')
        pets = list(Pet.objects.all())
        self.assertEqual(pets[0], p1)
        self.assertEqual(pets[1], p2)

    # ── Compatibility rules ────────────────────────────────────────────

    def test_compatible_friendly_pets(self):
        p1 = create_pet(temperament='friendly', dominance_level=5, size='medium')
        p2 = create_pet(temperament='calm', dominance_level=3, size='medium')
        ok, reason = p1.is_compatible_with(p2)
        self.assertTrue(ok)

    def test_aggressive_incompatible(self):
        p1 = create_pet(temperament='aggressive', dominance_level=8, size='large')
        p2 = create_pet(temperament='friendly', dominance_level=5, size='medium')
        ok, reasons = p1.is_compatible_with(p2)
        self.assertFalse(ok)
        self.assertTrue(any('Aggressive' in r for r in reasons))

    def test_aggressive_other_side(self):
        p1 = create_pet(temperament='friendly', dominance_level=5)
        p2 = create_pet(temperament='aggressive', dominance_level=8)
        ok, _ = p1.is_compatible_with(p2)
        self.assertFalse(ok)

    def test_two_high_dominance_incompatible(self):
        p1 = create_pet(temperament='friendly', dominance_level=9, size='large')
        p2 = create_pet(temperament='friendly', dominance_level=8, size='large')
        ok, reasons = p1.is_compatible_with(p2)
        self.assertFalse(ok)
        self.assertTrue(any('dominant' in r.lower() for r in reasons))

    def test_high_dominance_boundary(self):
        """Dominance 7 is NOT > 7, so two pets at 7 are compatible."""
        p1 = create_pet(temperament='friendly', dominance_level=7)
        p2 = create_pet(temperament='friendly', dominance_level=7)
        ok, _ = p1.is_compatible_with(p2)
        self.assertTrue(ok)

    def test_size_and_dominance_diff_incompatible(self):
        p1 = create_pet(size='small', dominance_level=1, temperament='calm')
        p2 = create_pet(size='large', dominance_level=7, temperament='calm')
        ok, reasons = p1.is_compatible_with(p2)
        self.assertFalse(ok)
        self.assertTrue(any('size' in r.lower() for r in reasons))

    def test_size_diff_without_dominance_diff_ok(self):
        p1 = create_pet(size='small', dominance_level=5, temperament='calm')
        p2 = create_pet(size='large', dominance_level=5, temperament='calm')
        ok, _ = p1.is_compatible_with(p2)
        self.assertTrue(ok)

    def test_cross_species_incompatible_temperaments(self):
        p1 = create_pet(species='dog', temperament='aggressive', dominance_level=5, size='medium')
        p2 = create_pet(species='cat', temperament='anxious', dominance_level=5, size='medium')
        # Aggressive already triggers rule 1 first
        ok, _ = p1.is_compatible_with(p2)
        self.assertFalse(ok)

    def test_anxious_playful_high_dominance_diff(self):
        p1 = create_pet(temperament='anxious', dominance_level=2, size='medium')
        p2 = create_pet(temperament='playful', dominance_level=7, size='medium')
        ok, reasons = p1.is_compatible_with(p2)
        self.assertFalse(ok)
        self.assertTrue(any('Anxious' in r for r in reasons))

    def test_anxious_playful_low_dominance_diff_ok(self):
        p1 = create_pet(temperament='anxious', dominance_level=5, size='medium')
        p2 = create_pet(temperament='playful', dominance_level=6, size='medium')
        ok, _ = p1.is_compatible_with(p2)
        self.assertTrue(ok)


class VaccinationTypeModelTests(TestCase):

    def test_str_enabled(self):
        vt = create_vaccination_type(label='Test Vax Enabled', enabled=True)
        self.assertEqual(str(vt), 'Test Vax Enabled (enabled)')

    def test_str_disabled(self):
        vt = create_vaccination_type(label='Test Vax Disabled', enabled=False)
        self.assertEqual(str(vt), 'Test Vax Disabled (disabled)')


class VaccinationModelTests(TestCase):

    def test_str(self):
        pet = create_pet(name='Rex')
        today = date.today()
        vax = create_vaccination(pet=pet, vax_type='rabies', date=today)
        self.assertEqual(str(vax), f'Rex - rabies ({today})')


class ScheduleModelTests(TestCase):

    def test_str_single_day(self):
        pet = create_pet(name='Buddy')
        today = date.today()
        s = create_schedule(pet=pet, start_date=today, end_date=today,
                            start_time=time(9, 0), end_time=time(17, 0))
        self.assertEqual(str(s), f'Buddy - {today} (09:00:00 to 17:00:00)')

    def test_str_multi_day(self):
        pet = create_pet(name='Buddy')
        today = date.today()
        tomorrow = today + timedelta(days=1)
        s = create_schedule(pet=pet, start_date=today, end_date=tomorrow)
        self.assertIn('to', str(s))

    def test_overlapping_schedules_found(self):
        s1 = create_schedule(start_time=time(9, 0), end_time=time(17, 0))
        pet2 = create_pet()
        s2 = create_schedule(pet=pet2, start_time=time(10, 0), end_time=time(15, 0))
        overlapping = s1.get_overlapping_schedules()
        self.assertIn(s2, overlapping)

    def test_non_overlapping_time_not_found(self):
        s1 = create_schedule(start_time=time(9, 0), end_time=time(12, 0))
        pet2 = create_pet()
        s2 = create_schedule(pet=pet2, start_time=time(13, 0), end_time=time(17, 0))
        overlapping = s1.get_overlapping_schedules()
        self.assertNotIn(s2, overlapping)

    def test_non_overlapping_date_not_found(self):
        today = date.today()
        tomorrow = today + timedelta(days=1)
        s1 = create_schedule(start_date=today, end_date=today)
        pet2 = create_pet()
        s2 = create_schedule(pet=pet2, start_date=tomorrow, end_date=tomorrow)
        overlapping = s1.get_overlapping_schedules()
        self.assertNotIn(s2, overlapping)

    def test_cancelled_schedule_not_overlapping(self):
        s1 = create_schedule()
        pet2 = create_pet()
        s2 = create_schedule(pet=pet2, status='cancelled')
        overlapping = s1.get_overlapping_schedules()
        self.assertNotIn(s2, overlapping)

    def test_check_conflicts_with_incompatible(self):
        aggressive_pet = create_pet(temperament='aggressive', dominance_level=8, size='large')
        friendly_pet = create_pet(temperament='friendly', dominance_level=5, size='medium')
        create_schedule(pet=aggressive_pet)
        s2 = create_schedule(pet=friendly_pet)
        conflicts = s2.check_conflicts()
        self.assertEqual(len(conflicts), 1)
        self.assertIn('conflicting_pet', conflicts[0])

    def test_check_conflicts_none_when_compatible(self):
        p1 = create_pet(temperament='friendly', dominance_level=4)
        p2 = create_pet(temperament='calm', dominance_level=3)
        create_schedule(pet=p1)
        s2 = create_schedule(pet=p2)
        conflicts = s2.check_conflicts()
        self.assertEqual(len(conflicts), 0)
