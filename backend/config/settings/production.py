from .base import *  # noqa
import os

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# ─── Database: Cloud SQL (PostgreSQL) ────────────────────────────────────────
# Cloud Run connects via Unix socket using the Cloud SQL Auth Proxy (built-in).
# The DB_HOST should be /cloudsql/<PROJECT>:<REGION>:<INSTANCE>
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# ─── Google Cloud Storage for media files ────────────────────────────────────
GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME', '')

DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
GS_BUCKET_NAME = GCS_BUCKET_NAME
GS_DEFAULT_ACL = None           # Use uniform bucket-level access
GS_QUERYSTRING_AUTH = False     # Serve public URLs (no signed URLs)
MEDIA_URL = f'https://storage.googleapis.com/{GCS_BUCKET_NAME}/'

# ─── Static files (whitenoise serves from Cloud Run container) ───────────────
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')  # noqa
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ─── Security ─────────────────────────────────────────────────────────────────
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# ─── Logging (structured for Cloud Logging) ──────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
