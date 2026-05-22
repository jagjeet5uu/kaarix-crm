import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

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
    'django_filters',
    'drf_spectacular',
    'celery',
    'django_celery_beat',
    'apps.accounts',
    'apps.customers',
    'apps.leads',
    'apps.products',
    'apps.reservations',
    'apps.quotations',
    'apps.after_sales',
    'apps.zoho_integration',
    'apps.reports',
    'apps.audit_logs',
    'apps.purchases',
    'apps.finances',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.audit_logs.middleware.AuditLogMiddleware',
]

ROOT_URLCONF = 'config.urls'
AUTH_USER_MODEL = 'accounts.User'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

WSGI_APPLICATION = 'config.wsgi.application'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'apps.common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'jewelry_crm'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'Asia/Kolkata'

# Celery Beat — Zoho sync schedule (2x per day: 1 PM and 11 PM IST)
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'zoho-sync-afternoon': {
        'task': 'apps.zoho_integration.tasks.sync_all_items',
        'schedule': crontab(hour=13, minute=0),   # 1:00 PM IST
    },
    'zoho-sync-night': {
        'task': 'apps.zoho_integration.tasks.sync_all_items',
        'schedule': crontab(hour=23, minute=0),   # 11:00 PM IST
    },
    'zoho-sync-contacts-afternoon': {
        'task': 'apps.zoho_integration.tasks.sync_all_contacts',
        'schedule': crontab(hour=13, minute=5),   # 1:05 PM IST
    },
    'zoho-sync-contacts-night': {
        'task': 'apps.zoho_integration.tasks.sync_all_contacts',
        'schedule': crontab(hour=23, minute=5),   # 11:05 PM IST
    },
    'zoho-sync-images-nightly': {
        'task': 'apps.zoho_integration.tasks.sync_item_images',
        'schedule': crontab(hour=23, minute=15),  # 11:15 PM IST nightly
    },
}

CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True

GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME', '')
GCS_PROJECT_ID = os.environ.get('GCS_PROJECT_ID', '')

ZOHO_CLIENT_ID = os.environ.get('ZOHO_CLIENT_ID', '')
ZOHO_CLIENT_SECRET = os.environ.get('ZOHO_CLIENT_SECRET', '')
ZOHO_REFRESH_TOKEN = os.environ.get('ZOHO_REFRESH_TOKEN', '')
ZOHO_ORGANIZATION_ID = os.environ.get('ZOHO_ORGANIZATION_ID', '')
ZOHO_API_DOMAIN = os.environ.get('ZOHO_API_DOMAIN', 'https://www.zohoapis.in')
ZOHO_REDIRECT_URI = os.environ.get('ZOHO_REDIRECT_URI', 'http://localhost:8000/api/zoho/callback')

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Instagram Webhook
INSTAGRAM_VERIFY_TOKEN = os.environ.get('INSTAGRAM_VERIFY_TOKEN', 'miraya_instagram_webhook_2026')
INSTAGRAM_PAGE_ACCESS_TOKEN = os.environ.get('INSTAGRAM_PAGE_ACCESS_TOKEN', '')
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

SPECTACULAR_SETTINGS = {
    'TITLE': 'Kaarix CRM API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
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
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
