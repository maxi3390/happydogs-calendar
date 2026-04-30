from .settings import *  # noqa: F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Pin file storage to in-memory regardless of host env so a developer
# with ``S3_*`` env vars set on their machine can still run the test
# suite without leaking traffic to a real bucket. The selection-logic
# tests (``test_storage_backend_selection.py``) explicitly bypass this
# override via ``override_settings`` to exercise the production paths.
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.InMemoryStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}
