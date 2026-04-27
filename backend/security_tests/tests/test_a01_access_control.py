"""OWASP A01:2021 — Broken Access Control.

The single biggest source of "we shipped a regression and didn't notice"
in this codebase is a viewset growing a new ``@action`` or losing its
``permission_classes``. These tests hit a representative URL for every
ViewSet / view in the project and assert the documented authorisation
contract holds.

Three buckets:

1. **Public** — endpoints we deliberately expose without auth (login,
   register, public translations / settings logo). Anonymous GET
   SHALL succeed.
2. **Authenticated** — most CRUD endpoints. Anonymous GET SHALL be
   401/403. Authenticated non-admin SHALL succeed.
3. **Admin-only** — user management, audit-log history reads, settings
   mutation. Non-admin SHALL be 403.

A test failure here is always a real authorisation hole.
"""
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import auth_client, create_admin, create_user


# ──────────────────────────────────────────────────────────────────────
# Hand-curated URL inventory.
#
# When you add a new ViewSet or view, add a representative URL here so
# the access-control walk covers it. The detail-route id 999999 is a
# placeholder — admins-allowed expects 200 OR 404 (resource missing
# AFTER the permission check passed); anonymous expects 401/403.
# ──────────────────────────────────────────────────────────────────────

PUBLIC_URLS = (
    '/api/auth/register/',         # POST is the public path; GET 405 is OK.
    '/api/auth/login/',
    '/api/translations/',
    '/api/translations/en/',
    '/api/languages/',
    '/api/settings/',              # Logo URL endpoint, deliberately public.
)

AUTH_REQUIRED_URLS = (
    '/api/owners/',
    '/api/pets/',
    '/api/schedules/',
    '/api/vaccination-types/',
    '/api/documents/',
    '/api/medical-notes/',
    '/api/vets/',
    '/api/pet-incompatibilities/',
    '/api/auth/profile/',
    '/api/users/me/',
    '/api/feature-flags/',         # auth req for read; admin-only for write.
    '/api/notifications/',
    '/api/notification-templates/',
)

ADMIN_ONLY_URLS = (
    '/api/users/',
    '/api/pets/999999/history/',
    '/api/owners/999999/history/',
    '/api/pets/999999/medical-notes/999999/history/',
    '/api/pets/999999/vaccinations/999999/history/',
)


# ──────────────────────────────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────────────────────────────

class A01_PublicUrlsServeAnonymous(TestCase):
    """Endpoints we deliberately expose SHALL respond to anonymous GETs."""

    def setUp(self):
        self.client = APIClient()

    def test_public_urls_do_not_require_auth(self):
        violations: list[str] = []
        for url in PUBLIC_URLS:
            resp = self.client.get(url)
            # 200 (resource served), 404 (resource not yet created),
            # 405 (GET not allowed but no auth challenge), 400
            # (validation error on missing body — login/register are
            # POST-only) — all of those are acceptable for a "public"
            # URL because none of them indicate the auth layer
            # rejected the call.
            if resp.status_code in (200, 400, 404, 405):
                continue
            violations.append(
                f"{url} returned {resp.status_code} for an anonymous GET; "
                f"expected 200/400/404/405."
            )
        self.assertEqual(violations, [], '\n'.join(violations))


class A01_AuthRequiredUrlsRejectAnonymous(TestCase):
    """Authenticated routes SHALL reject anonymous GETs with 401/403."""

    def setUp(self):
        self.client = APIClient()

    def test_protected_urls_require_auth(self):
        violations: list[str] = []
        for url in AUTH_REQUIRED_URLS:
            resp = self.client.get(url)
            if resp.status_code in (401, 403):
                continue
            violations.append(
                f"{url} returned {resp.status_code} for an anonymous GET; "
                f"expected 401/403."
            )
        self.assertEqual(violations, [], '\n'.join(violations))


class A01_AuthenticatedSucceedsOnAuthRequired(TestCase):
    """Authenticated non-admin SHALL succeed on auth-required reads."""

    def setUp(self):
        self.password = 'StaffPass123!'
        self.user = create_user()
        self.user.set_password(self.password)
        self.user.save()
        self.client = APIClient()
        auth_client(self.client, self.user, self.password)

    def test_auth_required_urls_succeed_for_staff(self):
        violations: list[str] = []
        for url in AUTH_REQUIRED_URLS:
            resp = self.client.get(url)
            # 200 = list / detail served. 404 = endpoint exists but
            # this user has no row to read. Both indicate the auth
            # check passed.
            if resp.status_code in (200, 404):
                continue
            violations.append(
                f"{url} returned {resp.status_code} for an authenticated "
                f"non-admin GET; expected 200/404."
            )
        self.assertEqual(violations, [], '\n'.join(violations))


class A01_AdminOnlyUrlsBlockNonAdmin(TestCase):
    """Admin-only routes SHALL return 403 for non-admin staff."""

    def setUp(self):
        self.password = 'StaffPass123!'
        self.user = create_user()
        self.user.set_password(self.password)
        self.user.save()
        self.client = APIClient()
        auth_client(self.client, self.user, self.password)

    def test_non_admin_blocked(self):
        violations: list[str] = []
        for url in ADMIN_ONLY_URLS:
            resp = self.client.get(url)
            if resp.status_code == status.HTTP_403_FORBIDDEN:
                continue
            violations.append(
                f"{url} returned {resp.status_code} for a non-admin GET; "
                f"expected 403."
            )
        self.assertEqual(violations, [], '\n'.join(violations))


class A01_AdminAllowedOnAdminOnly(TestCase):
    """Admin staff SHALL pass the permission check on admin-only reads.

    A 404 is fine here — it means "permission check passed; resource
    999999 not found," which is the desired outcome for the
    access-control assertion. A 401/403 would indicate the admin role
    is not actually granting access.
    """

    def setUp(self):
        self.password = 'AdminPass123!'
        self.admin = create_admin()
        self.admin.set_password(self.password)
        self.admin.save()
        self.client = APIClient()
        auth_client(self.client, self.admin, self.password)

    def test_admin_allowed(self):
        violations: list[str] = []
        for url in ADMIN_ONLY_URLS:
            resp = self.client.get(url)
            if resp.status_code in (200, 404):
                continue
            violations.append(
                f"{url} returned {resp.status_code} for an admin GET; "
                f"expected 200/404."
            )
        self.assertEqual(violations, [], '\n'.join(violations))
