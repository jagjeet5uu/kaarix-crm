import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('kaarix_crm')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'expire-reservations-hourly': {
        'task': 'apps.reservations.tasks.expire_reservations',
        'schedule': crontab(minute=0),
    },
    'zoho-sync-morning': {
        'task': 'apps.zoho_integration.tasks.sync_all_items',
        'schedule': crontab(hour=8, minute=0),   # 8:00 AM IST
    },
    'zoho-sync-afternoon': {
        'task': 'apps.zoho_integration.tasks.sync_all_items',
        'schedule': crontab(hour=14, minute=0),  # 2:00 PM IST
    },
    'zoho-sync-evening': {
        'task': 'apps.zoho_integration.tasks.sync_all_items',
        'schedule': crontab(hour=20, minute=0),  # 8:00 PM IST
    },
    'zoho-sync-contacts-daily': {
        'task': 'apps.zoho_integration.tasks.sync_all_contacts',
        'schedule': crontab(hour=8, minute=5),   # 8:05 AM IST daily
    },
    'zoho-sync-images-nightly': {
        'task': 'apps.zoho_integration.tasks.sync_item_images',
        'schedule': crontab(hour=22, minute=0),  # 10:00 PM IST nightly
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
