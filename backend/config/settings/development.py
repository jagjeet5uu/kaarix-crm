from .base import *  # noqa

DEBUG = True

# Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# More verbose logging in development
LOGGING['loggers']['apps']['level'] = 'DEBUG'  # noqa

# ── Local dev overrides ──────────────────────────────────────────────────────
# Use SQLite so no PostgreSQL install is needed locally
import os as _os
if _os.environ.get('USE_SQLITE', 'true').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',  # noqa: F405
        }
    }

# Use in-process Celery task execution (no Redis/worker needed locally)
if _os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'true').lower() == 'true':
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

# Serve media files locally
MEDIA_URL = '/media/'
