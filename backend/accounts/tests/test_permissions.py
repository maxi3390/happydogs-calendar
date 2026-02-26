from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from tests.factories import create_user, create_admin
from accounts.permissions import IsAdmin, IsAdminOrReadOnly, IsOwnerOrAdmin, IsAuthenticated

User = get_user_model()


class PermissionTestBase(TestCase):
    """Base with shared request factory setup."""

    def setUp(self):
        self.factory = RequestFactory()
        self.admin = create_admin()
        self.user = create_user()
        self.anon = AnonymousUser()

    def _request(self, method='GET', user=None):
        method_map = {
            'GET': self.factory.get,
            'POST': self.factory.post,
            'PUT': self.factory.put,
            'PATCH': self.factory.patch,
            'DELETE': self.factory.delete,
        }
        request = method_map[method]('/')
        request.user = user or self.anon
        return request


class IsAdminTests(PermissionTestBase):

    def setUp(self):
        super().setUp()
        self.perm = IsAdmin()

    def test_admin_allowed(self):
        request = self._request(user=self.admin)
        self.assertTrue(self.perm.has_permission(request, None))

    def test_user_denied(self):
        request = self._request(user=self.user)
        self.assertFalse(self.perm.has_permission(request, None))

    def test_anon_denied(self):
        request = self._request(user=self.anon)
        self.assertFalse(self.perm.has_permission(request, None))


class IsAdminOrReadOnlyTests(PermissionTestBase):

    def setUp(self):
        super().setUp()
        self.perm = IsAdminOrReadOnly()

    def test_admin_can_write(self):
        request = self._request(method='POST', user=self.admin)
        self.assertTrue(self.perm.has_permission(request, None))

    def test_user_can_read(self):
        request = self._request(method='GET', user=self.user)
        self.assertTrue(self.perm.has_permission(request, None))

    def test_user_cannot_write(self):
        request = self._request(method='POST', user=self.user)
        self.assertFalse(self.perm.has_permission(request, None))

    def test_anon_denied_read(self):
        request = self._request(method='GET', user=self.anon)
        self.assertFalse(self.perm.has_permission(request, None))

    def test_anon_denied_write(self):
        request = self._request(method='POST', user=self.anon)
        self.assertFalse(self.perm.has_permission(request, None))


class IsOwnerOrAdminTests(PermissionTestBase):

    def setUp(self):
        super().setUp()
        self.perm = IsOwnerOrAdmin()

    def test_admin_can_access_any_object(self):
        request = self._request(user=self.admin)
        self.assertTrue(self.perm.has_object_permission(request, None, self.user))

    def test_user_can_access_own_object(self):
        request = self._request(user=self.user)
        self.assertTrue(self.perm.has_object_permission(request, None, self.user))

    def test_user_cannot_access_other_object(self):
        other = create_user()
        request = self._request(user=self.user)
        self.assertFalse(self.perm.has_object_permission(request, None, other))

    def test_anon_denied(self):
        request = self._request(user=self.anon)
        self.assertFalse(self.perm.has_object_permission(request, None, self.user))

    def test_object_with_user_field(self):
        """Test with an object that has a 'user' attribute."""

        class FakeObj:
            def __init__(self, user):
                self.user = user

        obj = FakeObj(user=self.user)
        request = self._request(user=self.user)
        self.assertTrue(self.perm.has_object_permission(request, None, obj))

        other = create_user()
        request = self._request(user=other)
        self.assertFalse(self.perm.has_object_permission(request, None, obj))


class IsAuthenticatedTests(PermissionTestBase):

    def setUp(self):
        super().setUp()
        self.perm = IsAuthenticated()

    def test_authenticated_allowed(self):
        request = self._request(user=self.user)
        self.assertTrue(self.perm.has_permission(request, None))

    def test_anon_denied(self):
        request = self._request(user=self.anon)
        self.assertFalse(self.perm.has_permission(request, None))
