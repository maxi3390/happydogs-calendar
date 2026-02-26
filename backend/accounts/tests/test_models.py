from django.test import TestCase
from django.contrib.auth import get_user_model
from tests.factories import create_user, create_admin

User = get_user_model()


class UserModelTests(TestCase):

    def test_create_user(self):
        user = create_user(email='test@example.com')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.role, 'user')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)

    def test_create_user_no_email_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', password='pass')

    def test_email_normalized(self):
        user = create_user(email='Test@EXAMPLE.COM')
        self.assertEqual(user.email, 'Test@example.com')

    def test_create_superuser(self):
        su = User.objects.create_superuser(
            email='super@example.com', password='SuperPass123!',
            first_name='Super', last_name='Admin')
        self.assertTrue(su.is_staff)
        self.assertTrue(su.is_superuser)
        self.assertEqual(su.role, 'admin')

    def test_create_superuser_not_staff_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='bad@example.com', password='pass',
                first_name='A', last_name='B', is_staff=False)

    def test_create_superuser_not_superuser_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='bad@example.com', password='pass',
                first_name='A', last_name='B', is_superuser=False)

    def test_str_representation(self):
        user = create_user(email='hello@example.com')
        self.assertEqual(str(user), 'hello@example.com')

    def test_full_name_property(self):
        user = create_user(first_name='John', last_name='Doe')
        self.assertEqual(user.full_name, 'John Doe')

    def test_is_admin_property(self):
        admin = create_admin()
        user = create_user()
        self.assertTrue(admin.is_admin)
        self.assertFalse(user.is_admin)

    def test_ordering(self):
        u1 = create_user(email='first@example.com')
        u2 = create_user(email='second@example.com')
        users = list(User.objects.all())
        # Ordered by -created_at, so u2 first
        self.assertEqual(users[0], u2)
        self.assertEqual(users[1], u1)

    def test_username_field_is_email(self):
        self.assertEqual(User.USERNAME_FIELD, 'email')
