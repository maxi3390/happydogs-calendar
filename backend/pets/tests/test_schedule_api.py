from datetime import date, time, timedelta
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_pet, create_schedule
from pets.models import Schedule


class ScheduleCRUDTests(APITestCase):
    """Basic CRUD tests for schedules."""

    def setUp(self):
        self.pet = create_pet(name='Buddy')
        self.today = date.today()
        self.schedule = create_schedule(
            pet=self.pet, start_date=self.today, end_date=self.today,
            start_time=time(9, 0), end_time=time(17, 0),
        )
        self.list_url = reverse('schedule-list')
        self.detail_url = reverse('schedule-detail', args=[self.schedule.id])

    def test_list_schedules(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_schedule(self):
        tomorrow = self.today + timedelta(days=1)
        data = {
            'pet': self.pet.id,
            'start_date': str(tomorrow),
            'end_date': str(tomorrow),
            'start_time': '10:00',
            'end_time': '16:00',
            'status': 'scheduled',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Schedule.objects.count(), 2)

    def test_retrieve_schedule(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pet'], self.pet.id)
        self.assertIn('pet_details', response.data)

    def test_update_schedule_status(self):
        response = self.client.patch(
            self.detail_url, {'status': 'checked_in'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.status, 'checked_in')

    def test_full_update_schedule(self):
        tomorrow = self.today + timedelta(days=1)
        data = {
            'pet': self.pet.id,
            'start_date': str(tomorrow),
            'end_date': str(tomorrow),
            'start_time': '08:00',
            'end_time': '12:00',
            'status': 'scheduled',
        }
        response = self.client.put(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_schedule(self):
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Schedule.objects.count(), 0)


class ScheduleValidationTests(APITestCase):
    """Validation edge-cases for schedule creation."""

    def setUp(self):
        self.pet = create_pet()
        self.today = date.today()
        self.list_url = reverse('schedule-list')

    def test_invalid_time_range(self):
        data = {
            'pet': self.pet.id,
            'start_date': str(self.today),
            'end_date': str(self.today),
            'start_time': '17:00',
            'end_time': '09:00',
            'status': 'scheduled',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_date_range(self):
        tomorrow = self.today + timedelta(days=1)
        data = {
            'pet': self.pet.id,
            'start_date': str(tomorrow),
            'end_date': str(self.today),
            'start_time': '09:00',
            'end_time': '17:00',
            'status': 'scheduled',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_schedule_returns_warnings_on_conflict(self):
        aggressive = create_pet(temperament='aggressive', dominance_level=8, size='large')
        create_schedule(pet=aggressive, start_date=self.today, end_date=self.today,
                        start_time=time(9, 0), end_time=time(17, 0))
        data = {
            'pet': self.pet.id,
            'start_date': str(self.today),
            'end_date': str(self.today),
            'start_time': '10:00',
            'end_time': '15:00',
            'status': 'scheduled',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('warnings', response.data)


class ScheduleFilterTests(APITestCase):
    """Tests for queryset filtering."""

    def setUp(self):
        self.pet = create_pet()
        self.today = date.today()
        self.tomorrow = self.today + timedelta(days=1)
        self.schedule = create_schedule(
            pet=self.pet, start_date=self.today, end_date=self.today,
            start_time=time(9, 0), end_time=time(17, 0),
        )
        self.list_url = reverse('schedule-list')

    def test_filter_by_date(self):
        response = self.client.get(self.list_url, {'date': str(self.today)})
        self.assertEqual(len(response.data), 1)

    def test_filter_by_date_no_match(self):
        response = self.client.get(self.list_url, {'date': str(self.tomorrow)})
        self.assertEqual(len(response.data), 0)

    def test_filter_by_date_range(self):
        response = self.client.get(self.list_url, {
            'start_date': str(self.today),
            'end_date': str(self.tomorrow),
        })
        self.assertEqual(len(response.data), 1)

    def test_filter_by_pet_id(self):
        pet2 = create_pet()
        create_schedule(pet=pet2, start_date=self.tomorrow, end_date=self.tomorrow)
        response = self.client.get(self.list_url, {'pet_id': self.pet.id})
        self.assertEqual(len(response.data), 1)

    def test_filter_by_status(self):
        create_schedule(pet=self.pet, start_date=self.tomorrow, end_date=self.tomorrow,
                        status='completed')
        response = self.client.get(self.list_url, {'status': 'scheduled'})
        self.assertEqual(len(response.data), 1)


class ConflictCheckAPITests(APITestCase):
    """Tests for the check_conflicts action."""

    def setUp(self):
        self.aggressive = create_pet(
            name='Rex', temperament='aggressive', dominance_level=8, size='large')
        self.friendly = create_pet(
            name='Buddy', temperament='friendly', dominance_level=5, size='medium')
        self.today = date.today()
        create_schedule(pet=self.aggressive, start_date=self.today, end_date=self.today,
                        start_time=time(9, 0), end_time=time(17, 0))
        self.url = reverse('schedule-check-conflicts')

    def _check(self, pet, start_date, end_date, start_time, end_time, **extra):
        data = {
            'pet_id': pet.id,
            'start_date': str(start_date),
            'end_date': str(end_date),
            'start_time': start_time,
            'end_time': end_time,
            **extra,
        }
        return self.client.post(self.url, data, format='json')

    def test_conflict_detected(self):
        response = self._check(self.friendly, self.today, self.today, '10:00', '15:00')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['has_conflicts'])
        self.assertEqual(len(response.data['conflicts']), 1)

    def test_no_conflict_different_time(self):
        response = self._check(self.friendly, self.today, self.today, '18:00', '20:00')
        self.assertFalse(response.data['has_conflicts'])

    def test_no_conflict_different_date(self):
        tomorrow = self.today + timedelta(days=1)
        response = self._check(self.friendly, tomorrow, tomorrow, '10:00', '15:00')
        self.assertFalse(response.data['has_conflicts'])

    def test_conflict_check_nonexistent_pet(self):
        data = {
            'pet_id': 9999,
            'start_date': str(self.today),
            'end_date': str(self.today),
            'start_time': '10:00',
            'end_time': '15:00',
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_conflict_check_with_exclude(self):
        sched = create_schedule(
            pet=self.friendly, start_date=self.today, end_date=self.today,
            start_time=time(10, 0), end_time=time(15, 0))
        response = self._check(
            self.friendly, self.today, self.today, '10:00', '15:00',
            exclude_schedule_id=sched.id)
        # Only the aggressive schedule should be checked
        self.assertTrue(response.data['has_conflicts'])


class DailySummaryAPITests(APITestCase):
    """Tests for the daily_summary action."""

    def setUp(self):
        self.today = date.today()
        p1 = create_pet()
        p2 = create_pet()
        create_schedule(pet=p1, start_date=self.today, end_date=self.today,
                        start_time=time(9, 0), end_time=time(12, 0), status='scheduled')
        create_schedule(pet=p2, start_date=self.today, end_date=self.today,
                        start_time=time(13, 0), end_time=time(17, 0), status='checked_in')
        self.url = reverse('schedule-daily-summary')

    def test_daily_summary(self):
        response = self.client.get(self.url, {'date': str(self.today)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_schedules'], 2)
        self.assertEqual(response.data['by_status']['scheduled'], 1)
        self.assertEqual(response.data['by_status']['checked_in'], 1)

    def test_daily_summary_requires_date(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_daily_summary_empty_day(self):
        tomorrow = self.today + timedelta(days=1)
        response = self.client.get(self.url, {'date': str(tomorrow)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_schedules'], 0)


class BatchCreateTests(APITestCase):
    """Tests for the batch_create action."""

    def setUp(self):
        self.pet1 = create_pet(name='Alpha')
        self.pet2 = create_pet(name='Beta')
        self.today = date.today()
        self.url = reverse('schedule-batch-create')

    def _batch_data(self, pet_ids, **overrides):
        data = {
            'pet_ids': pet_ids,
            'start_date': str(self.today),
            'end_date': str(self.today),
            'start_time': '09:00',
            'end_time': '17:00',
            'status': 'scheduled',
        }
        data.update(overrides)
        return data

    def test_batch_create_success(self):
        data = self._batch_data([self.pet1.id, self.pet2.id])
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['created_count'], 2)
        self.assertEqual(Schedule.objects.count(), 2)

    def test_batch_create_missing_pet(self):
        data = self._batch_data([self.pet1.id, 9999])
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_batch_create_with_conflicts(self):
        aggressive = create_pet(temperament='aggressive', dominance_level=8, size='large')
        data = self._batch_data([self.pet1.id, aggressive.id])
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('warnings', response.data)

    def test_batch_create_invalid_time(self):
        data = self._batch_data([self.pet1.id], start_time='17:00', end_time='09:00')
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_batch_create_empty_pet_ids(self):
        data = self._batch_data([])
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MultiDayScheduleTests(APITestCase):
    """Tests for multi-day schedule functionality."""

    def setUp(self):
        self.pet = create_pet(name='Buddy')
        self.today = date.today()
        self.list_url = reverse('schedule-list')

    def test_create_multi_day_schedule(self):
        end_date = self.today + timedelta(days=3)
        data = {
            'pet': self.pet.id,
            'start_date': str(self.today),
            'end_date': str(end_date),
            'start_time': '09:00',
            'end_time': '17:00',
            'status': 'scheduled',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_multi_day_appears_on_middle_day(self):
        end_date = self.today + timedelta(days=3)
        create_schedule(pet=self.pet, start_date=self.today, end_date=end_date)
        middle = self.today + timedelta(days=1)
        response = self.client.get(self.list_url, {'date': str(middle)})
        self.assertEqual(len(response.data), 1)

    def test_multi_day_conflict_detection(self):
        aggressive = create_pet(temperament='aggressive', dominance_level=8, size='large')
        end_date = self.today + timedelta(days=3)
        create_schedule(pet=aggressive, start_date=self.today, end_date=end_date,
                        start_time=time(9, 0), end_time=time(17, 0))
        middle = self.today + timedelta(days=1)
        url = reverse('schedule-check-conflicts')
        data = {
            'pet_id': self.pet.id,
            'start_date': str(middle),
            'end_date': str(middle),
            'start_time': '10:00',
            'end_time': '15:00',
        }
        response = self.client.post(url, data, format='json')
        self.assertTrue(response.data['has_conflicts'])
