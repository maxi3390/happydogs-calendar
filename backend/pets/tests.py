from datetime import date, time, timedelta
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Pet, Schedule


class PetModelTests(TestCase):
    """Tests for the Pet model"""

    def setUp(self):
        self.pet1 = Pet.objects.create(
            name="Buddy",
            species="dog",
            breed="Golden Retriever",
            age=3,
            temperament="friendly",
            dominance_level=5,
            size="large",
            owner_name="John Doe",
            owner_phone="555-1234"
        )
        self.pet2 = Pet.objects.create(
            name="Whiskers",
            species="cat",
            breed="Persian",
            age=2,
            temperament="calm",
            dominance_level=3,
            size="medium",
            owner_name="Jane Smith",
            owner_phone="555-5678"
        )

    def test_pet_creation(self):
        """Test pet is created correctly"""
        self.assertEqual(self.pet1.name, "Buddy")
        self.assertEqual(self.pet1.species, "dog")
        self.assertEqual(self.pet1.dominance_level, 5)

    def test_pet_str_representation(self):
        """Test pet string representation"""
        self.assertEqual(str(self.pet1), "Buddy (dog)")

    def test_compatible_pets(self):
        """Test compatibility check between friendly pets"""
        is_compatible, reason = self.pet1.is_compatible_with(self.pet2)
        self.assertTrue(is_compatible)

    def test_aggressive_pet_incompatibility(self):
        """Test that aggressive pets are incompatible with others"""
        aggressive_pet = Pet.objects.create(
            name="Rex",
            species="dog",
            age=4,
            temperament="aggressive",
            dominance_level=8,
            size="large",
            owner_name="Test Owner",
            owner_phone="555-0000"
        )
        is_compatible, reason = aggressive_pet.is_compatible_with(self.pet1)
        self.assertFalse(is_compatible)
        self.assertIn("aggressive", reason.lower())

    def test_high_dominance_incompatibility(self):
        """Test that two highly dominant pets are incompatible"""
        dominant_pet1 = Pet.objects.create(
            name="Alpha",
            species="dog",
            age=5,
            temperament="friendly",
            dominance_level=9,
            size="large",
            owner_name="Test Owner",
            owner_phone="555-0000"
        )
        dominant_pet2 = Pet.objects.create(
            name="Beta",
            species="dog",
            age=4,
            temperament="friendly",
            dominance_level=8,
            size="large",
            owner_name="Test Owner",
            owner_phone="555-0000"
        )
        is_compatible, reason = dominant_pet1.is_compatible_with(dominant_pet2)
        self.assertFalse(is_compatible)
        self.assertIn("dominant", reason.lower())


class ScheduleModelTests(TestCase):
    """Tests for the Schedule model"""

    def setUp(self):
        self.pet = Pet.objects.create(
            name="Buddy",
            species="dog",
            age=3,
            temperament="friendly",
            dominance_level=5,
            size="medium",
            owner_name="John Doe",
            owner_phone="555-1234"
        )
        self.today = date.today()
        self.schedule = Schedule.objects.create(
            pet=self.pet,
            start_date=self.today,
            end_date=self.today,
            start_time=time(9, 0),
            end_time=time(17, 0),
            status="scheduled"
        )

    def test_schedule_creation(self):
        """Test schedule is created correctly"""
        self.assertEqual(self.schedule.pet, self.pet)
        self.assertEqual(self.schedule.start_date, self.today)
        self.assertEqual(self.schedule.status, "scheduled")

    def test_schedule_str_single_day(self):
        """Test schedule string representation for single day"""
        expected = f"Buddy - {self.today} (09:00:00 to 17:00:00)"
        self.assertEqual(str(self.schedule), expected)

    def test_schedule_str_multi_day(self):
        """Test schedule string representation for multi-day"""
        tomorrow = self.today + timedelta(days=1)
        self.schedule.end_date = tomorrow
        self.schedule.save()
        expected = f"Buddy - {self.today} to {tomorrow} (09:00:00 to 17:00:00)"
        self.assertEqual(str(self.schedule), expected)

    def test_overlapping_schedules(self):
        """Test finding overlapping schedules"""
        pet2 = Pet.objects.create(
            name="Rex",
            species="dog",
            age=4,
            temperament="friendly",
            dominance_level=5,
            size="medium",
            owner_name="Test",
            owner_phone="555-0000"
        )
        Schedule.objects.create(
            pet=pet2,
            start_date=self.today,
            end_date=self.today,
            start_time=time(10, 0),
            end_time=time(15, 0),
            status="scheduled"
        )
        overlapping = self.schedule.get_overlapping_schedules()
        self.assertEqual(overlapping.count(), 1)


class PetAPITests(APITestCase):
    """Tests for Pet API endpoints"""

    def setUp(self):
        self.pet_data = {
            "name": "Buddy",
            "species": "dog",
            "breed": "Golden Retriever",
            "age": 3,
            "temperament": "friendly",
            "dominance_level": 5,
            "size": "large",
            "owner_name": "John Doe",
            "owner_phone": "555-1234",
            "special_notes": "Loves to play fetch"
        }
        self.pet = Pet.objects.create(**self.pet_data)

    def test_list_pets(self):
        """Test listing all pets"""
        url = reverse('pet-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_pet(self):
        """Test creating a new pet"""
        url = reverse('pet-list')
        new_pet_data = {
            "name": "Whiskers",
            "species": "cat",
            "breed": "Persian",
            "age": 2,
            "temperament": "calm",
            "dominance_level": 3,
            "size": "medium",
            "owner_name": "Jane Smith",
            "owner_phone": "555-5678"
        }
        response = self.client.post(url, new_pet_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pet.objects.count(), 2)
        self.assertEqual(response.data['name'], "Whiskers")

    def test_retrieve_pet(self):
        """Test retrieving a single pet"""
        url = reverse('pet-detail', args=[self.pet.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Buddy")

    def test_update_pet(self):
        """Test updating a pet"""
        url = reverse('pet-detail', args=[self.pet.id])
        updated_data = self.pet_data.copy()
        updated_data['name'] = "Buddy Jr"
        response = self.client.put(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.name, "Buddy Jr")

    def test_delete_pet(self):
        """Test deleting a pet"""
        url = reverse('pet-detail', args=[self.pet.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Pet.objects.count(), 0)

    def test_create_pet_invalid_dominance(self):
        """Test creating pet with invalid dominance level"""
        url = reverse('pet-list')
        invalid_data = self.pet_data.copy()
        invalid_data['dominance_level'] = 15  # Max is 10
        response = self.client.post(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ScheduleAPITests(APITestCase):
    """Tests for Schedule API endpoints"""

    def setUp(self):
        self.pet = Pet.objects.create(
            name="Buddy",
            species="dog",
            age=3,
            temperament="friendly",
            dominance_level=5,
            size="medium",
            owner_name="John Doe",
            owner_phone="555-1234"
        )
        self.today = date.today()
        self.schedule_data = {
            "pet": self.pet.id,
            "start_date": str(self.today),
            "end_date": str(self.today),
            "start_time": "09:00",
            "end_time": "17:00",
            "status": "scheduled",
            "notes": ""
        }
        self.schedule = Schedule.objects.create(
            pet=self.pet,
            start_date=self.today,
            end_date=self.today,
            start_time=time(9, 0),
            end_time=time(17, 0),
            status="scheduled"
        )

    def test_list_schedules(self):
        """Test listing all schedules"""
        url = reverse('schedule-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_schedule(self):
        """Test creating a new schedule"""
        url = reverse('schedule-list')
        tomorrow = self.today + timedelta(days=1)
        new_schedule_data = {
            "pet": self.pet.id,
            "start_date": str(tomorrow),
            "end_date": str(tomorrow),
            "start_time": "10:00",
            "end_time": "16:00",
            "status": "scheduled"
        }
        response = self.client.post(url, new_schedule_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Schedule.objects.count(), 2)

    def test_retrieve_schedule(self):
        """Test retrieving a single schedule"""
        url = reverse('schedule-detail', args=[self.schedule.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pet'], self.pet.id)

    def test_update_schedule_status(self):
        """Test updating schedule status"""
        url = reverse('schedule-detail', args=[self.schedule.id])
        response = self.client.patch(url, {"status": "checked_in"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.status, "checked_in")

    def test_delete_schedule(self):
        """Test deleting a schedule"""
        url = reverse('schedule-detail', args=[self.schedule.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Schedule.objects.count(), 0)

    def test_filter_schedules_by_date(self):
        """Test filtering schedules by date"""
        url = reverse('schedule-list')
        response = self.client.get(url, {'date': str(self.today)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_filter_schedules_by_date_range(self):
        """Test filtering schedules by date range"""
        url = reverse('schedule-list')
        tomorrow = self.today + timedelta(days=1)
        response = self.client.get(url, {
            'start_date': str(self.today),
            'end_date': str(tomorrow)
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_invalid_time_range(self):
        """Test creating schedule with end time before start time"""
        url = reverse('schedule-list')
        tomorrow = self.today + timedelta(days=1)
        invalid_data = {
            "pet": self.pet.id,
            "start_date": str(tomorrow),
            "end_date": str(tomorrow),
            "start_time": "17:00",
            "end_time": "09:00",  # End before start
            "status": "scheduled"
        }
        response = self.client.post(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_date_range(self):
        """Test creating schedule with end date before start date"""
        url = reverse('schedule-list')
        tomorrow = self.today + timedelta(days=1)
        invalid_data = {
            "pet": self.pet.id,
            "start_date": str(tomorrow),
            "end_date": str(self.today),  # End before start
            "start_time": "09:00",
            "end_time": "17:00",
            "status": "scheduled"
        }
        response = self.client.post(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ConflictCheckAPITests(APITestCase):
    """Tests for conflict checking functionality"""

    def setUp(self):
        self.aggressive_pet = Pet.objects.create(
            name="Rex",
            species="dog",
            age=4,
            temperament="aggressive",
            dominance_level=8,
            size="large",
            owner_name="Owner 1",
            owner_phone="555-0001"
        )
        self.friendly_pet = Pet.objects.create(
            name="Buddy",
            species="dog",
            age=3,
            temperament="friendly",
            dominance_level=5,
            size="medium",
            owner_name="Owner 2",
            owner_phone="555-0002"
        )
        self.today = date.today()
        # Create existing schedule for aggressive pet
        self.existing_schedule = Schedule.objects.create(
            pet=self.aggressive_pet,
            start_date=self.today,
            end_date=self.today,
            start_time=time(9, 0),
            end_time=time(17, 0),
            status="scheduled"
        )

    def test_conflict_detected(self):
        """Test that conflicts are detected for incompatible pets"""
        url = reverse('schedule-check-conflicts')
        data = {
            "pet_id": self.friendly_pet.id,
            "start_date": str(self.today),
            "end_date": str(self.today),
            "start_time": "10:00",
            "end_time": "15:00"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['has_conflicts'])
        self.assertEqual(len(response.data['conflicts']), 1)

    def test_no_conflict_different_time(self):
        """Test no conflict when times don't overlap"""
        url = reverse('schedule-check-conflicts')
        data = {
            "pet_id": self.friendly_pet.id,
            "start_date": str(self.today),
            "end_date": str(self.today),
            "start_time": "18:00",
            "end_time": "20:00"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['has_conflicts'])

    def test_no_conflict_different_date(self):
        """Test no conflict when dates don't overlap"""
        url = reverse('schedule-check-conflicts')
        tomorrow = self.today + timedelta(days=1)
        data = {
            "pet_id": self.friendly_pet.id,
            "start_date": str(tomorrow),
            "end_date": str(tomorrow),
            "start_time": "10:00",
            "end_time": "15:00"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['has_conflicts'])


class DailySummaryAPITests(APITestCase):
    """Tests for daily summary endpoint"""

    def setUp(self):
        self.pet1 = Pet.objects.create(
            name="Buddy",
            species="dog",
            age=3,
            temperament="friendly",
            dominance_level=5,
            size="medium",
            owner_name="Owner 1",
            owner_phone="555-0001"
        )
        self.pet2 = Pet.objects.create(
            name="Whiskers",
            species="cat",
            age=2,
            temperament="calm",
            dominance_level=3,
            size="small",
            owner_name="Owner 2",
            owner_phone="555-0002"
        )
        self.today = date.today()
        Schedule.objects.create(
            pet=self.pet1,
            start_date=self.today,
            end_date=self.today,
            start_time=time(9, 0),
            end_time=time(12, 0),
            status="scheduled"
        )
        Schedule.objects.create(
            pet=self.pet2,
            start_date=self.today,
            end_date=self.today,
            start_time=time(13, 0),
            end_time=time(17, 0),
            status="checked_in"
        )

    def test_daily_summary(self):
        """Test daily summary returns correct data"""
        url = reverse('schedule-daily-summary')
        response = self.client.get(url, {'date': str(self.today)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_schedules'], 2)
        self.assertEqual(response.data['by_status']['scheduled'], 1)
        self.assertEqual(response.data['by_status']['checked_in'], 1)

    def test_daily_summary_requires_date(self):
        """Test daily summary requires date parameter"""
        url = reverse('schedule-daily-summary')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MultiDayScheduleTests(APITestCase):
    """Tests for multi-day schedule functionality"""

    def setUp(self):
        self.pet = Pet.objects.create(
            name="Buddy",
            species="dog",
            age=3,
            temperament="friendly",
            dominance_level=5,
            size="medium",
            owner_name="Owner",
            owner_phone="555-0001"
        )
        self.today = date.today()

    def test_create_multi_day_schedule(self):
        """Test creating a multi-day schedule"""
        url = reverse('schedule-list')
        end_date = self.today + timedelta(days=3)
        data = {
            "pet": self.pet.id,
            "start_date": str(self.today),
            "end_date": str(end_date),
            "start_time": "09:00",
            "end_time": "17:00",
            "status": "scheduled"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['start_date'], str(self.today))
        self.assertEqual(response.data['end_date'], str(end_date))

    def test_multi_day_schedule_appears_on_each_day(self):
        """Test that multi-day schedule appears when filtering by any day in range"""
        end_date = self.today + timedelta(days=3)
        Schedule.objects.create(
            pet=self.pet,
            start_date=self.today,
            end_date=end_date,
            start_time=time(9, 0),
            end_time=time(17, 0),
            status="scheduled"
        )
        url = reverse('schedule-list')
        # Check middle day
        middle_day = self.today + timedelta(days=1)
        response = self.client.get(url, {'date': str(middle_day)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_multi_day_conflict_detection(self):
        """Test conflict detection works across multi-day schedules"""
        # Create existing multi-day schedule
        aggressive_pet = Pet.objects.create(
            name="Rex",
            species="dog",
            age=4,
            temperament="aggressive",
            dominance_level=8,
            size="large",
            owner_name="Owner",
            owner_phone="555-0002"
        )
        end_date = self.today + timedelta(days=3)
        Schedule.objects.create(
            pet=aggressive_pet,
            start_date=self.today,
            end_date=end_date,
            start_time=time(9, 0),
            end_time=time(17, 0),
            status="scheduled"
        )
        # Check for conflict on middle day
        url = reverse('schedule-check-conflicts')
        middle_day = self.today + timedelta(days=1)
        data = {
            "pet_id": self.pet.id,
            "start_date": str(middle_day),
            "end_date": str(middle_day),
            "start_time": "10:00",
            "end_time": "15:00"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['has_conflicts'])
