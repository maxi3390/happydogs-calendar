"""Selection logic for the env-driven file-storage backend.

The production code path reads ``S3_*`` env vars at module import time.
Re-importing settings under different env states is fragile (Django
caches a lot of state across imports), so the dispatch is factored
into ``_build_storages_config(env, media_root)`` and these tests call
it directly with synthetic environments.

Spec: ``openspec/specs/backend/file-storage/spec.md``.
"""
from pathlib import Path

from django.test import SimpleTestCase

from nursery.settings import _build_storages_config


_FAKE_MEDIA = Path('/tmp/test-media')

_FULL_S3_ENV = {
    'S3_ENDPOINT_URL': 'http://garage:3900',
    'S3_ACCESS_KEY_ID': 'GKtest',
    'S3_SECRET_ACCESS_KEY': 'sekret',
    'S3_BUCKET_NAME': 'happy-calendar-test',
}


class FullConfigSelectsS3Tests(SimpleTestCase):
    """All four required vars set → ``S3Storage`` with the operator's options."""

    def test_full_config_picks_s3_backend(self):
        storages, level, msg = _build_storages_config(_FULL_S3_ENV, _FAKE_MEDIA)
        self.assertEqual(
            storages['default']['BACKEND'],
            'storages.backends.s3.S3Storage',
        )
        self.assertEqual(level, 'info')
        self.assertIn('S3', msg)
        self.assertIn('garage:3900', msg)
        self.assertIn('happy-calendar-test', msg)

    def test_full_config_propagates_required_vars_into_options(self):
        storages, _, _ = _build_storages_config(_FULL_S3_ENV, _FAKE_MEDIA)
        opts = storages['default']['OPTIONS']
        self.assertEqual(opts['bucket_name'], 'happy-calendar-test')
        self.assertEqual(opts['access_key'], 'GKtest')
        self.assertEqual(opts['secret_key'], 'sekret')
        self.assertEqual(opts['endpoint_url'], 'http://garage:3900')

    def test_full_config_uses_canonical_defaults(self):
        # Optional vars unset → documented defaults apply.
        storages, _, _ = _build_storages_config(_FULL_S3_ENV, _FAKE_MEDIA)
        opts = storages['default']['OPTIONS']
        self.assertEqual(opts['region_name'], 'garage')
        self.assertEqual(opts['addressing_style'], 'path')
        self.assertFalse(opts['querystring_auth'])
        self.assertEqual(opts['default_acl'], 'public-read')

    def test_optional_vars_override_defaults(self):
        storages, _, _ = _build_storages_config(
            {
                **_FULL_S3_ENV,
                'S3_REGION_NAME': 'us-east-1',
                'S3_ADDRESSING_STYLE': 'virtual',
                'S3_QUERYSTRING_AUTH': 'True',
            },
            _FAKE_MEDIA,
        )
        opts = storages['default']['OPTIONS']
        self.assertEqual(opts['region_name'], 'us-east-1')
        self.assertEqual(opts['addressing_style'], 'virtual')
        self.assertTrue(opts['querystring_auth'])

    def test_public_endpoint_drives_browser_facing_urls(self):
        storages, _, _ = _build_storages_config(
            {
                **_FULL_S3_ENV,
                'S3_PUBLIC_ENDPOINT_URL': 'https://s3.example.com',
            },
            _FAKE_MEDIA,
        )
        opts = storages['default']['OPTIONS']
        # ``custom_domain`` is the host (no scheme); ``url_protocol``
        # carries the colon-suffixed scheme.
        self.assertEqual(opts['custom_domain'], 's3.example.com')
        self.assertEqual(opts['url_protocol'], 'https:')

    def test_public_endpoint_falls_back_to_internal_when_unset(self):
        # Single-host deployments without Traefik set only the internal
        # endpoint; the browser-facing URL re-uses it.
        storages, _, _ = _build_storages_config(_FULL_S3_ENV, _FAKE_MEDIA)
        opts = storages['default']['OPTIONS']
        self.assertEqual(opts['custom_domain'], 'garage:3900')
        self.assertEqual(opts['url_protocol'], 'http:')


class NoConfigFallsBackToFilesystemTests(SimpleTestCase):
    """No S3 vars set → quiet ``FileSystemStorage`` fallback."""

    def test_empty_env_picks_filesystem(self):
        storages, level, msg = _build_storages_config({}, _FAKE_MEDIA)
        self.assertEqual(
            storages['default']['BACKEND'],
            'django.core.files.storage.FileSystemStorage',
        )
        self.assertEqual(level, 'info')
        self.assertIn('filesystem', msg)
        self.assertIn(str(_FAKE_MEDIA), msg)

    def test_empty_strings_treated_as_unset(self):
        # An operator who clears a var to '' (typical .env edit) gets
        # the same quiet-FS path as truly-unset, no warning.
        storages, level, _ = _build_storages_config(
            {key: '' for key in (
                'S3_ENDPOINT_URL', 'S3_ACCESS_KEY_ID',
                'S3_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME',
            )},
            _FAKE_MEDIA,
        )
        self.assertEqual(
            storages['default']['BACKEND'],
            'django.core.files.storage.FileSystemStorage',
        )
        self.assertEqual(level, 'info')


class PartialConfigFallsBackWithWarningTests(SimpleTestCase):
    """A half-applied env update logs a warning but doesn't crash boot."""

    def test_only_endpoint_set_logs_missing_credentials(self):
        storages, level, msg = _build_storages_config(
            {'S3_ENDPOINT_URL': 'http://garage:3900'},
            _FAKE_MEDIA,
        )
        self.assertEqual(
            storages['default']['BACKEND'],
            'django.core.files.storage.FileSystemStorage',
        )
        self.assertEqual(level, 'warning')
        self.assertIn('S3_ACCESS_KEY_ID', msg)
        self.assertIn('S3_SECRET_ACCESS_KEY', msg)
        self.assertIn('S3_BUCKET_NAME', msg)

    def test_missing_one_var_still_falls_back(self):
        # Three of four set → still treated as partial.
        env = dict(_FULL_S3_ENV)
        del env['S3_BUCKET_NAME']
        storages, level, msg = _build_storages_config(env, _FAKE_MEDIA)
        self.assertEqual(
            storages['default']['BACKEND'],
            'django.core.files.storage.FileSystemStorage',
        )
        self.assertEqual(level, 'warning')
        self.assertIn('S3_BUCKET_NAME', msg)
        self.assertNotIn('S3_ENDPOINT_URL', msg)

    def test_warning_lists_missing_vars_alphabetically(self):
        # Stable ordering keeps the log line greppable for ops.
        _, _, msg = _build_storages_config(
            {'S3_BUCKET_NAME': 'b'},
            _FAKE_MEDIA,
        )
        # All three missing names appear and in sorted order so ops
        # tooling can rely on the format.
        for missing_key in (
            'S3_ACCESS_KEY_ID', 'S3_ENDPOINT_URL', 'S3_SECRET_ACCESS_KEY',
        ):
            self.assertIn(missing_key, msg)
        self.assertLess(msg.index('S3_ACCESS_KEY_ID'), msg.index('S3_ENDPOINT_URL'))
