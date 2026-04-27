"""OWASP A07:2021 — Identification and Authentication Failures.

Asserts on the configured auth posture:

- Password validators include the four Django defaults (length, common,
  numeric, similarity) so trivial passwords are rejected at registration.
- JWT access-token lifetime is bounded (≤ 60 minutes) so a leaked token
  has a short blast radius.
- Refresh tokens rotate and the previous refresh is blacklisted so a
  leaked refresh can't be replayed indefinitely.
"""
from datetime import timedelta

from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from tests.factories import create_user


class A07_PasswordValidatorsAreConfigured(TestCase):
    REQUIRED_VALIDATORS = {
        'django.contrib.auth.password_validation.MinimumLengthValidator',
        'django.contrib.auth.password_validation.CommonPasswordValidator',
        'django.contrib.auth.password_validation.NumericPasswordValidator',
        (
            'django.contrib.auth.password_validation.'
            'UserAttributeSimilarityValidator'
        ),
    }

    def test_all_four_default_validators_are_active(self):
        configured = {
            entry['NAME'] for entry in settings.AUTH_PASSWORD_VALIDATORS
        }
        missing = self.REQUIRED_VALIDATORS - configured
        self.assertFalse(
            missing,
            f"Missing required password validators: {sorted(missing)}",
        )


class A07_JwtLifetimesAreBounded(TestCase):
    def test_access_token_lifetime_is_at_most_60_minutes(self):
        access_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
        self.assertIsInstance(access_lifetime, timedelta)
        self.assertLessEqual(
            access_lifetime, timedelta(minutes=60),
            f"ACCESS_TOKEN_LIFETIME is {access_lifetime}; cap at 60 min."
        )

    def test_refresh_rotation_is_enabled(self):
        # Without rotation, a leaked refresh token works forever.
        self.assertTrue(
            settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS'),
            "ROTATE_REFRESH_TOKENS=True is required so refreshes don't "
            "stay valid forever after a leak."
        )

    def test_blacklist_after_rotation_is_enabled(self):
        # Rotation alone isn't enough — the previous refresh has to be
        # blacklisted so it can't be replayed.
        self.assertTrue(
            settings.SIMPLE_JWT.get('BLACKLIST_AFTER_ROTATION'),
            "BLACKLIST_AFTER_ROTATION=True is required so the prior "
            "refresh token can't be re-used after rotation."
        )


class A07_LogoutBlacklistsRefreshToken(TestCase):
    """A successful logout SHALL blacklist the refresh token.

    Replays of the same refresh after logout MUST fail.
    """

    def setUp(self):
        self.password = 'AuthTest123!'
        self.user = create_user()
        self.user.set_password(self.password)
        self.user.save()
        self.client = APIClient()

    def test_logout_blacklists_refresh_token(self):
        # Login to get tokens.
        login = self.client.post(
            reverse('login'),
            {'email': self.user.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(login.status_code, 200, login.data)
        refresh = login.data['tokens']['refresh']
        access = login.data['tokens']['access']

        # Authenticate and logout.
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        logout = self.client.post(reverse('logout'), {'refresh': refresh}, format='json')
        self.assertIn(logout.status_code, (200, 205, 204), logout.data)

        # The blacklisted refresh MUST NOT be usable any more.
        replay = self.client.post(
            reverse('token_refresh'), {'refresh': refresh}, format='json',
        )
        self.assertEqual(
            replay.status_code, 401,
            "Refresh token was still valid after logout; the blacklist "
            "is misconfigured."
        )


class A07_TamperedJwtRejected(TestCase):
    """A token with a flipped signature byte SHALL be rejected as 401."""

    def test_tampered_access_token_returns_401(self):
        user = create_user()
        access = str(RefreshToken.for_user(user).access_token)
        # Flip a byte in the MIDDLE of the signature segment so the
        # change reliably mutates the underlying HMAC bytes (a flip at
        # the very last position can be a no-op if the base64 char
        # represents only padding bits).
        header, payload, signature = access.split('.')
        mid = len(signature) // 2
        tampered_sig = (
            signature[:mid]
            + ('A' if signature[mid] != 'A' else 'B')
            + signature[mid + 1:]
        )
        tampered = f'{header}.{payload}.{tampered_sig}'
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {tampered}')
        resp = client.get('/api/auth/profile/')
        self.assertEqual(resp.status_code, 401, resp.content)
