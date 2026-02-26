from datetime import date, time
from django.test import TestCase
from rest_framework.test import APIClient
from nursery_settings.models import NurserySetting
from tests.factories import create_schedule, create_pet, auth_client


class NurserySettingModelTest(TestCase):
    def test_singleton_create(self):
        s = NurserySetting.load()
        self.assertEqual(s.pk, 1)
        self.assertEqual(s.daily_booking_limit, 0)

    def test_singleton_enforced(self):
        s1 = NurserySetting(daily_booking_limit=5)
        s1.save()
        s2 = NurserySetting(daily_booking_limit=10)
        s2.save()
        self.assertEqual(NurserySetting.objects.count(), 1)
        self.assertEqual(NurserySetting.load().daily_booking_limit, 10)

    def test_load_returns_same_instance(self):
        s1 = NurserySetting.load()
        s1.daily_booking_limit = 7
        s1.save()
        s2 = NurserySetting.load()
        self.assertEqual(s2.daily_booking_limit, 7)


class NurserySettingAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = auth_client(self.client)

    def test_get_settings(self):
        NurserySetting.load()
        resp = self.client.get('/api/settings/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['daily_booking_limit'], 0)

    def test_update_settings(self):
        NurserySetting.load()
        resp = self.client.patch('/api/settings/update/', {'daily_booking_limit': 15}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['daily_booking_limit'], 15)
        self.assertEqual(NurserySetting.load().daily_booking_limit, 15)

    def test_update_settings_put(self):
        NurserySetting.load()
        resp = self.client.put('/api/settings/update/', {'daily_booking_limit': 20}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['daily_booking_limit'], 20)


class DailyCountAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = auth_client(self.client)
        self.today = date.today().isoformat()

    def test_daily_count_requires_date(self):
        resp = self.client.get('/api/schedules/daily_count/')
        self.assertEqual(resp.status_code, 400)

    def test_daily_count_no_schedules(self):
        resp = self.client.get(f'/api/schedules/daily_count/?date={self.today}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 0)
        self.assertEqual(resp.data['limit'], 0)
        self.assertFalse(resp.data['limit_reached'])
        self.assertFalse(resp.data['limit_exceeded'])

    def test_daily_count_with_schedules(self):
        pet1 = create_pet()
        pet2 = create_pet()
        create_schedule(pet=pet1, start_date=date.today(), end_date=date.today())
        create_schedule(pet=pet2, start_date=date.today(), end_date=date.today())

        resp = self.client.get(f'/api/schedules/daily_count/?date={self.today}')
        self.assertEqual(resp.data['count'], 2)

    def test_daily_count_limit_reached(self):
        settings = NurserySetting.load()
        settings.daily_booking_limit = 2
        settings.save()

        pet1 = create_pet()
        pet2 = create_pet()
        create_schedule(pet=pet1, start_date=date.today(), end_date=date.today())
        create_schedule(pet=pet2, start_date=date.today(), end_date=date.today())

        resp = self.client.get(f'/api/schedules/daily_count/?date={self.today}')
        self.assertEqual(resp.data['count'], 2)
        self.assertEqual(resp.data['limit'], 2)
        self.assertTrue(resp.data['limit_reached'])
        self.assertFalse(resp.data['limit_exceeded'])

    def test_daily_count_limit_exceeded(self):
        settings = NurserySetting.load()
        settings.daily_booking_limit = 1
        settings.save()

        pet1 = create_pet()
        pet2 = create_pet()
        create_schedule(pet=pet1, start_date=date.today(), end_date=date.today())
        create_schedule(pet=pet2, start_date=date.today(), end_date=date.today())

        resp = self.client.get(f'/api/schedules/daily_count/?date={self.today}')
        self.assertEqual(resp.data['count'], 2)
        self.assertTrue(resp.data['limit_reached'])
        self.assertTrue(resp.data['limit_exceeded'])

    def test_daily_count_unlimited_when_zero(self):
        settings = NurserySetting.load()
        settings.daily_booking_limit = 0
        settings.save()

        pet = create_pet()
        create_schedule(pet=pet, start_date=date.today(), end_date=date.today())

        resp = self.client.get(f'/api/schedules/daily_count/?date={self.today}')
        self.assertFalse(resp.data['limit_reached'])
        self.assertFalse(resp.data['limit_exceeded'])

    def test_daily_count_excludes_cancelled(self):
        pet1 = create_pet()
        pet2 = create_pet()
        create_schedule(pet=pet1, start_date=date.today(), end_date=date.today(), status='scheduled')
        create_schedule(pet=pet2, start_date=date.today(), end_date=date.today(), status='cancelled')

        resp = self.client.get(f'/api/schedules/daily_count/?date={self.today}')
        self.assertEqual(resp.data['count'], 1)
