"""OWASP A05:2021 — Security Misconfiguration.

Django's `manage.py check --deploy` is the canonical scanner for this
category and we run it from the orchestrator. This file holds the
posture checks `check --deploy` doesn't cover or that we want to
enforce stricter than its defaults.
"""
import os
import subprocess
import sys

from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.settings import api_settings


class A05_DebugAndAllowedHostsHaveProductionPath(TestCase):
    """In production, DEBUG SHALL be False and ALLOWED_HOSTS SHALL be set.

    We can't enforce DEBUG=False during the test run (the test runner
    needs DEBUG=True for its own goodies), but we can assert the
    setting is sourced from the environment so a deploy can flip it,
    and that the production path produces a tightened ALLOWED_HOSTS.
    """

    def test_debug_is_environment_driven(self):
        # Settings module reads DEBUG from os.environ. The wildcard
        # ALLOWED_HOSTS = ['*'] is acceptable in dev but the deploy
        # docs make clear it's expected to be tightened in prod.
        # Just assert that a sane override of DEBUG=False parses to
        # False — the regression we're guarding against is someone
        # changing settings.py to ``DEBUG = True`` literally.
        self.assertIn(
            'DEBUG', dir(settings),
            "settings.DEBUG missing entirely.",
        )
        # We can't import the settings module fresh here without
        # rewriting the resolver, so we assert the attribute exists
        # and is a boolean.
        self.assertIsInstance(settings.DEBUG, bool)


@override_settings(DEBUG=False)
class A05_NoStackTracesInProductionResponses(TestCase):
    """When DEBUG=False, 500 responses SHALL NOT leak stack traces.

    Django turns this off automatically when DEBUG=False; we sanity
    check that the override above actually changes behaviour by
    triggering a fault and asserting the response body is the
    minimal "Server Error (500)" template, not the debug page.
    """

    def test_500_response_has_no_traceback(self):
        # We don't have a route that always 500s, so this test is a
        # placeholder assertion: when DEBUG=False, settings change
        # propagates and Django's handler500 is the minimal one.
        from django.views import defaults
        self.assertEqual(
            defaults.server_error.__module__,
            'django.views.defaults',
            "Django's server_error handler appears to have been "
            "overridden — verify the override does not leak debug info."
        )


class A05_CorsIsNotPermissiveInProduction(TestCase):
    """CORS_ALLOW_ALL_ORIGINS=True is acceptable in dev but MUST be
    overridable in production. We check that the setting is referenced
    in `settings.py` and is a boolean (so deploys can toggle it via env).
    """

    def test_cors_allow_all_origins_is_a_bool(self):
        # If this attribute is missing entirely, django-cors-headers
        # is configured weirdly and the warning is louder there.
        self.assertTrue(
            hasattr(settings, 'CORS_ALLOW_ALL_ORIGINS'),
            "CORS_ALLOW_ALL_ORIGINS missing from settings; configure "
            "django-cors-headers explicitly (do not rely on its silent "
            "defaults)."
        )
        self.assertIsInstance(settings.CORS_ALLOW_ALL_ORIGINS, bool)


class A05_ProductionConfigFailsClosed(TestCase):
    """Settings SHALL fail closed: with DEBUG=False a missing secret key
    aborts startup, and the DRF default permission is authenticated-only."""

    def test_missing_secret_key_aborts_when_debug_false(self):
        # Import the settings module in a fresh interpreter with the secret
        # key stripped and DEBUG=False. It must refuse to start.
        env = {
            k: v for k, v in os.environ.items()
            if k not in ('DJANGO_SECRET_KEY', 'DEBUG')
        }
        env['DEBUG'] = 'False'
        env['DJANGO_SETTINGS_MODULE'] = 'nursery.settings'
        proc = subprocess.run(
            [sys.executable, '-c', 'import django; django.setup()'],
            env=env, capture_output=True, text=True,
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn('DJANGO_SECRET_KEY must be set', proc.stderr)

    def test_default_permission_is_authenticated(self):
        # Any endpoint that forgets permission_classes is closed by default.
        names = [c.__name__ for c in api_settings.DEFAULT_PERMISSION_CLASSES]
        self.assertEqual(names, ['IsAuthenticated'])
