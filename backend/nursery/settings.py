import logging
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'simple_history',
    'accounts',
    'pets',
    'nursery_settings',
    'data_portability',
    'feature_flags',
    'notifications',
    'audit_log',
    'security_tests',
]

AUTH_USER_MODEL = 'accounts.User'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'simple_history.middleware.HistoryRequestMiddleware',
]

ROOT_URLCONF = 'nursery.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nursery.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'nursery'),
        'USER': os.environ.get('POSTGRES_USER', 'nursery'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'nursery'),
        'HOST': os.environ.get('POSTGRES_HOST', 'db'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── File storage backend ────────────────────────────────────────────────────
# Pick the Django ``STORAGES['default']`` backend at startup based on the
# four required ``S3_*`` env vars. When all are present the backend uses
# any S3-compatible bucket (Garage / MinIO / AWS S3 / …). When none — or
# only some — are set it falls back to ``FileSystemStorage`` and writes
# under ``MEDIA_ROOT`` exactly as before, so a fresh checkout / a
# half-applied env update never bricks uploads. See
# ``openspec/specs/backend/file-storage/spec.md`` for the full contract.

_S3_REQUIRED_KEYS = (
    'S3_ENDPOINT_URL',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME',
)


def _build_storages_config(env, media_root):
    """Build the ``STORAGES`` dict from an environment mapping.

    Pulled out of module-level code so the selection-logic tests can
    exercise it directly without re-importing settings — testing a
    Django settings module under ``override_settings`` would only
    validate the override path, not the env-var dispatch we care about.

    Returns ``(storages, log_level, log_message)`` so the caller can
    decide *how* to surface the chosen backend; tests assert all three.
    """
    raw = {key: env.get(key, '').strip() for key in _S3_REQUIRED_KEYS}
    present = {k: v for k, v in raw.items() if v}
    missing = sorted(k for k, v in raw.items() if not v)

    fs_storages = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }

    if not missing:
        # All four required vars set — build the S3 config.
        public_endpoint = (
            env.get('S3_PUBLIC_ENDPOINT_URL', '').strip()
            or raw['S3_ENDPOINT_URL']
        )
        # ``custom_domain`` for django-storages is a host (no scheme);
        # the backend prepends ``https://`` unconditionally unless
        # ``url_protocol`` is also set. Splitting both so
        # ``http://garage:3900`` and ``https://s3.example.com`` both
        # round-trip cleanly.
        if '://' in public_endpoint:
            proto, _, host = public_endpoint.partition('://')
            custom_domain = host
            url_protocol = f'{proto}:'
        else:
            custom_domain = public_endpoint
            url_protocol = 'https:'

        s3_storages = {
            'default': {
                'BACKEND': 'storages.backends.s3.S3Storage',
                'OPTIONS': {
                    'bucket_name': raw['S3_BUCKET_NAME'],
                    'access_key': raw['S3_ACCESS_KEY_ID'],
                    'secret_key': raw['S3_SECRET_ACCESS_KEY'],
                    'endpoint_url': raw['S3_ENDPOINT_URL'],
                    'region_name': env.get('S3_REGION_NAME', 'garage').strip() or 'garage',
                    'addressing_style': env.get('S3_ADDRESSING_STYLE', 'path').strip() or 'path',
                    'querystring_auth': env.get('S3_QUERYSTRING_AUTH', 'False') == 'True',
                    'custom_domain': custom_domain,
                    'url_protocol': url_protocol,
                    # Mirror today's "every uploaded file is publicly
                    # readable via /media" behaviour.
                    'default_acl': 'public-read',
                    'file_overwrite': False,
                },
            },
            'staticfiles': {
                'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
            },
        }
        msg = (
            f'File storage: S3 (endpoint={raw["S3_ENDPOINT_URL"]}, '
            f'bucket={raw["S3_BUCKET_NAME"]})'
        )
        return s3_storages, 'info', msg

    if present:
        # Half-applied env update — fall back to FS but flag loudly so
        # the operator notices something's off.
        msg = (
            'S3 partially configured but credentials missing — falling back '
            f'to filesystem. Missing: {", ".join(missing)}'
        )
        return fs_storages, 'warning', msg

    # Nothing set — pure filesystem path, the historical default.
    return fs_storages, 'info', f'File storage: filesystem (MEDIA_ROOT={media_root})'


_logger = logging.getLogger(__name__)
STORAGES, _storage_log_level, _storage_log_message = _build_storages_config(
    os.environ, MEDIA_ROOT,
)
getattr(_logger, _storage_log_level)(_storage_log_message)

# Upload validation constants
MAX_UPLOAD_SIZE_MB = 5
MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_DOCUMENT_TYPES = ALLOWED_IMAGE_TYPES + [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_ALL_ORIGINS = True

# ── Email ───────────────────────────────────────────────────────────────────
# The notifications app uses Django's send_mail() for owner-staff
# delivery. Defaults are dev-friendly: console backend prints messages
# to stdout. In production set EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# along with EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD /
# EMAIL_USE_TLS through environment variables.
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '25'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'False') == 'True'
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL', 'happy-calendar@localhost',
)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'nursery.pagination.StandardPagination',
    'PAGE_SIZE': 50,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Happy Pet Nursery API',
    'DESCRIPTION': '''
API for managing pet nursery schedules with automatic conflict detection.

## Features
- **Pet Management**: Create and manage pets with behavioral profiles
- **Owner Management**: Register owners and link them to their pets
- **Smart Scheduling**: Create schedules with automatic conflict detection
- **Multi-Pet Scheduling**: Batch create schedules for multiple pets
- **Translations**: Multi-language support (EN/ES)

## Conflict Detection Rules
The system automatically detects potential conflicts when scheduling pets together:
1. Aggressive pets cannot be scheduled with any other pets
2. Two pets with dominance levels > 7 cannot be together
3. Large size difference with high dominance difference is flagged
4. Certain cross-species temperament combinations are incompatible
5. Anxious pets should not be with highly playful pets if dominance differs significantly
''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {'name': 'auth', 'description': 'Authentication endpoints (register, login, logout)'},
        {'name': 'users', 'description': 'User management (admin only)'},
        {'name': 'pets', 'description': 'Pet management endpoints'},
        {'name': 'owners', 'description': 'Owner management endpoints'},
        {'name': 'schedules', 'description': 'Schedule management with conflict detection'},
        {'name': 'translations', 'description': 'Internationalization endpoints'},
    ],
}
