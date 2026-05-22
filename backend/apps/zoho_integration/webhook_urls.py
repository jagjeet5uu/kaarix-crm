from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import WebhookLog
from .tasks import process_webhook


@api_view(['POST'])
@permission_classes([AllowAny])
def zoho_webhook(request):
    """
    Receive Zoho webhooks.
    - Log every incoming webhook immediately
    - Return 200 immediately
    - Process asynchronously
    """
    event_type = request.headers.get('X-Zoho-Event', 'unknown')
    payload = request.data

    if not isinstance(payload, dict):
        payload = {'raw': str(payload)}

    webhook_log = WebhookLog.objects.create(
        source='zoho',
        event_type=event_type,
        payload=payload,
        status='received',
    )

    # Process asynchronously
    process_webhook.delay(webhook_log.id)

    return Response({'status': 'received', 'log_id': webhook_log.id})


urlpatterns = [
    path('', zoho_webhook, name='zoho-webhook'),
]
