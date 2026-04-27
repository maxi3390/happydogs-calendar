"""OWASP A02:2021 — Cryptographic Failures.

Application-level posture: passwords ARE hashed (not stored plain) and
the hash uses a vetted algorithm. Deploy-time crypto posture
(``DJANGO_SECRET_KEY`` length, the configured ``PASSWORD_HASHERS``,
HSTS / cookie-secure flags) is covered by ``manage.py check --deploy``,
which the security orchestrator runs separately and feeds into the
report under A02 / A05.
"""
from django.test import TestCase

from tests.factories import create_user


class A02_PasswordsHashedAtRest(TestCase):
    """``User.password`` SHALL be a salted hash, never plaintext.

    The test runner overrides ``PASSWORD_HASHERS`` to MD5 for speed,
    so the assertion accepts any of Django's hashed prefixes (md5,
    pbkdf2_sha256, argon2, bcrypt, scrypt) — what we are catching is
    a regression where the password ends up stored verbatim, NOT a
    weak-algorithm regression. The latter is enforced by deploy-time
    config and surfaced through ``check --deploy`` in the report.
    """

    KNOWN_HASH_PREFIXES = (
        'argon2$', 'pbkdf2_sha256$', 'pbkdf2_sha1$',
        'bcrypt$', 'scrypt$', 'md5$',
    )

    def test_password_is_hashed_after_create(self):
        plaintext = 'PlaintextWouldBeBad123!'
        user = create_user(password=plaintext)
        self.assertNotEqual(
            user.password, plaintext,
            "User.password stored verbatim — passwords are not hashed at rest."
        )
        self.assertTrue(
            any(user.password.startswith(p) for p in self.KNOWN_HASH_PREFIXES),
            f"User password starts with an unrecognised algo prefix: "
            f"{user.password.split('$', 1)[0]!r}"
        )
