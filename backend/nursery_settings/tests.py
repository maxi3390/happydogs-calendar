from datetime import date, time
from io import BytesIO
from PIL import Image as PILImage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from nursery_settings.models import NurserySetting
from tests.factories import create_schedule, create_pet, create_admin, create_user, auth_client


def _make_test_image(name='logo.png', size=(200, 200), fmt='PNG'):
    """Create a small in-memory image for testing."""
    buf = BytesIO()
    PILImage.new('RGB', size, color='green').save(buf, format=fmt)
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type=f'image/{fmt.lower()}')


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
        admin = create_admin(password='AdminPass123!')
        self.user = auth_client(self.client, admin, 'AdminPass123!')

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


class SystemLogoAPITest(TestCase):
    """Tests for the system logo upload, retrieval, and deletion endpoints."""

    def setUp(self):
        self.client = APIClient()
        admin = create_admin(password='AdminPass123!')
        self.user = auth_client(self.client, admin, 'AdminPass123!')
        NurserySetting.load()

    # ── Retrieval ───────────────────────────────────────────────────────

    def test_settings_response_includes_logo_url_field(self):
        resp = self.client.get('/api/settings/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('logo_url', resp.data)

    def test_logo_url_is_null_when_no_logo(self):
        resp = self.client.get('/api/settings/')
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data['logo_url'])

    def test_logo_url_is_present_after_upload(self):
        image = _make_test_image()
        self.client.post('/api/settings/upload_logo/', {'logo': image}, format='multipart')
        resp = self.client.get('/api/settings/')
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data['logo_url'])
        self.assertIn('logos/', resp.data['logo_url'])

    # ── Upload ──────────────────────────────────────────────────────────

    def test_upload_logo_success(self):
        image = _make_test_image()
        resp = self.client.post('/api/settings/upload_logo/', {'logo': image}, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data['logo_url'])
        settings = NurserySetting.load()
        self.assertTrue(settings.logo)

    def test_upload_logo_replaces_existing(self):
        image1 = _make_test_image('logo1.png')
        self.client.post('/api/settings/upload_logo/', {'logo': image1}, format='multipart')
        resp1 = self.client.get('/api/settings/')
        url1 = resp1.data['logo_url']

        image2 = _make_test_image('logo2.png')
        resp2 = self.client.post('/api/settings/upload_logo/', {'logo': image2}, format='multipart')
        self.assertEqual(resp2.status_code, 200)
        url2 = resp2.data['logo_url']
        self.assertNotEqual(url1, url2)

    def test_upload_logo_no_file_returns_400(self):
        resp = self.client.post('/api/settings/upload_logo/', {}, format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)

    def test_upload_logo_rejects_non_image(self):
        pdf = SimpleUploadedFile('doc.pdf', b'%PDF-1.4 fake', content_type='application/pdf')
        resp = self.client.post('/api/settings/upload_logo/', {'logo': pdf}, format='multipart')
        self.assertEqual(resp.status_code, 400)

    def test_upload_logo_rejects_oversized_file(self):
        buf = BytesIO()
        PILImage.new('RGB', (100, 100), color='red').save(buf, format='PNG')
        buf.seek(0)
        oversized = SimpleUploadedFile(
            'big.png',
            buf.read() + b'\x00' * (6 * 1024 * 1024),  # pad to >5MB
            content_type='image/png',
        )
        resp = self.client.post('/api/settings/upload_logo/', {'logo': oversized}, format='multipart')
        self.assertEqual(resp.status_code, 400)

    # ── Delete ──────────────────────────────────────────────────────────

    def test_delete_logo_success(self):
        image = _make_test_image()
        self.client.post('/api/settings/upload_logo/', {'logo': image}, format='multipart')
        resp = self.client.delete('/api/settings/delete_logo/')
        self.assertEqual(resp.status_code, 204)
        settings = NurserySetting.load()
        self.assertFalse(settings.logo)

    def test_delete_logo_clears_url(self):
        image = _make_test_image()
        self.client.post('/api/settings/upload_logo/', {'logo': image}, format='multipart')
        self.client.delete('/api/settings/delete_logo/')
        resp = self.client.get('/api/settings/')
        self.assertIsNone(resp.data['logo_url'])

    def test_delete_logo_when_none_exists(self):
        resp = self.client.delete('/api/settings/delete_logo/')
        self.assertEqual(resp.status_code, 204)

    # ── Singleton integrity ─────────────────────────────────────────────

    def test_logo_persists_across_settings_updates(self):
        image = _make_test_image()
        self.client.post('/api/settings/upload_logo/', {'logo': image}, format='multipart')
        self.client.patch('/api/settings/update/', {'daily_booking_limit': 42}, format='json')
        resp = self.client.get('/api/settings/')
        self.assertEqual(resp.data['daily_booking_limit'], 42)
        self.assertIsNotNone(resp.data['logo_url'])


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
        self.assertEqual(resp.data['daily_booking_limit'], 0)
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
        self.assertEqual(resp.data['daily_booking_limit'], 2)
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


class SettingsPermissionTest(TestCase):
    """Tests for admin-only permission on settings write endpoints."""

    def setUp(self):
        self.regular_client = APIClient()
        regular = create_user(password='UserPass123!')
        auth_client(self.regular_client, regular, 'UserPass123!')
        self.admin_client = APIClient()
        admin = create_admin(password='AdminPass123!')
        auth_client(self.admin_client, admin, 'AdminPass123!')
        self.anon_client = APIClient()
        NurserySetting.load()

    def test_get_settings_allows_unauthenticated(self):
        """GET settings is public so the login page can fetch the logo."""
        response = self.anon_client.get('/api/settings/')
        self.assertEqual(response.status_code, 200)

    def test_non_admin_cannot_update_settings(self):
        response = self.regular_client.patch(
            '/api/settings/update/', {'daily_booking_limit': 5}, format='json',
        )
        self.assertIn(response.status_code, [401, 403])

    def test_admin_can_update_settings(self):
        response = self.admin_client.patch(
            '/api/settings/update/', {'daily_booking_limit': 7}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['daily_booking_limit'], 7)

    def test_non_admin_cannot_upload_logo(self):
        image = _make_test_image()
        response = self.regular_client.post(
            '/api/settings/upload_logo/', {'logo': image}, format='multipart',
        )
        self.assertIn(response.status_code, [401, 403])

    def test_non_admin_cannot_delete_logo(self):
        response = self.regular_client.delete('/api/settings/delete_logo/')
        self.assertIn(response.status_code, [401, 403])

    def test_admin_can_upload_and_delete_logo(self):
        image = _make_test_image()
        up = self.admin_client.post(
            '/api/settings/upload_logo/', {'logo': image}, format='multipart',
        )
        self.assertEqual(up.status_code, 200)
        dl = self.admin_client.delete('/api/settings/delete_logo/')
        self.assertEqual(dl.status_code, 204)
