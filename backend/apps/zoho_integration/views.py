import logging

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsAdminOrSalesManager
from .models import WebhookLog, ZohoSyncLog, ZohoToken
from .serializers import WebhookLogSerializer, ZohoSyncLogSerializer, ZohoTokenSerializer
from .tasks import process_webhook, sync_all_contacts, sync_all_items, sync_invoices, sync_item_images

logger = logging.getLogger(__name__)


class ZohoAuthView(APIView):
    """Handle Zoho OAuth flow."""
    permission_classes = [IsAdmin]

    def get(self, request):
        """Return the Zoho OAuth authorization URL."""
        auth_url = (
            f"https://accounts.zoho.in/oauth/v2/auth"
            f"?response_type=code"
            f"&client_id={settings.ZOHO_CLIENT_ID}"
            f"&scope=ZohoBooks.fullaccess.all"
            f"&redirect_uri={settings.ZOHO_REDIRECT_URI}"
            f"&access_type=offline"
        )
        return Response({'auth_url': auth_url})


class ZohoCallbackView(APIView):
    """Handle Zoho OAuth callback."""
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'No code provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .client import ZohoClient
            client = ZohoClient()
            token_data = client.exchange_code_for_tokens(code)

            from django.utils import timezone
            from datetime import timedelta
            expires_in = token_data.get('expires_in', 3600)

            ZohoToken.objects.update_or_create(
                organization_id=settings.ZOHO_ORGANIZATION_ID,
                defaults={
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data.get('refresh_token', settings.ZOHO_REFRESH_TOKEN),
                    'token_type': token_data.get('token_type', 'Bearer'),
                    'expires_at': timezone.now() + timedelta(seconds=expires_in - 60),
                    'api_domain': settings.ZOHO_API_DOMAIN,
                },
            )
            return Response({'message': 'Zoho authentication successful.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ZohoSyncViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSalesManager]

    @action(detail=False, methods=['post'], url_path='items')
    def sync_items(self, request):
        try:
            task = sync_all_items.delay()
            return Response({'task_id': task.id, 'message': 'Items sync started.'}, status=status.HTTP_202_ACCEPTED)
        except Exception as exc:
            logger.warning(f'Celery unavailable, running items sync synchronously: {exc}')
            try:
                sync_all_items()
                return Response({'message': 'Items sync complete.'}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='contacts')
    def sync_contacts(self, request):
        try:
            task = sync_all_contacts.delay()
            return Response({'task_id': task.id, 'message': 'Contacts sync started.'}, status=status.HTTP_202_ACCEPTED)
        except Exception as exc:
            logger.warning(f'Celery unavailable, running contacts sync synchronously: {exc}')
            try:
                sync_all_contacts()
                return Response({'message': 'Contacts sync complete.'}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='invoices')
    def sync_invoices_action(self, request):
        try:
            task = sync_invoices.delay()
            return Response({'task_id': task.id, 'message': 'Invoices sync started.'}, status=status.HTTP_202_ACCEPTED)
        except Exception as exc:
            logger.warning(f'Celery unavailable, running invoices sync synchronously: {exc}')
            try:
                sync_invoices()
                return Response({'message': 'Invoices sync complete.'}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='sync_images')
    def sync_images(self, request):
        """
        Trigger image sync from Zoho Books.
        Pass ?all=true to re-sync products that already have images.
        Pass ?limit=N to cap the number of products processed.
        """
        sync_all = request.query_params.get('all', '').lower() in ('true', '1', 'yes')
        limit_raw = request.query_params.get('limit')
        limit = int(limit_raw) if limit_raw and limit_raw.isdigit() else None

        try:
            task = sync_item_images.delay(sync_all=sync_all, limit=limit)
            return Response(
                {
                    'task_id': task.id,
                    'message': 'Image sync started.',
                    'sync_all': sync_all,
                    'limit': limit,
                },
                status=status.HTTP_202_ACCEPTED,
            )
        except Exception as exc:
            # Celery may not be running in dev — run synchronously as fallback
            logger.warning(f'Celery unavailable, running image sync synchronously: {exc}')
            from django.core.management import call_command
            from io import StringIO
            out = StringIO()
            call_command(
                'sync_zoho_images',
                sync_all=sync_all,
                **(({'limit': limit}) if limit else {}),
                stdout=out,
            )
            return Response(
                {'message': 'Image sync complete (sync).', 'output': out.getvalue()},
                status=status.HTTP_200_OK,
            )

    @action(detail=False, methods=['get'])
    def sync_logs(self, request):
        logs = ZohoSyncLog.objects.all().order_by('-created_at')[:50]
        serializer = ZohoSyncLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sync_errors(self, request):
        errors = ZohoSyncLog.objects.filter(status='failed').order_by('-created_at')[:50]
        serializer = ZohoSyncLogSerializer(errors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='retry/(?P<log_id>[^/.]+)')
    def retry_sync(self, request, log_id=None):
        try:
            log = ZohoSyncLog.objects.get(id=log_id)
        except ZohoSyncLog.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        log.status = 'retrying'
        log.retry_count += 1
        log.save()

        if log.module == 'items':
            sync_all_items.delay()
        elif log.module == 'contacts':
            sync_all_contacts.delay()
        elif log.module == 'invoices':
            sync_invoices.delay()

        from apps.audit_logs.utils import create_audit_log
        create_audit_log(
            user=request.user,
            action='sync_retried',
            entity_type='ZohoSyncLog',
            entity_id=str(log.id),
            new_value={'module': log.module, 'retry_count': log.retry_count},
        )
        return Response({'message': 'Retry initiated.'})

    @action(detail=False, methods=['get'])
    def token_status(self, request):
        token = ZohoToken.objects.order_by('-updated_at').first()
        if not token:
            return Response({'status': 'no_token', 'message': 'No Zoho token found.'})
        return Response(ZohoTokenSerializer(token).data)

    @action(detail=False, methods=['get'], url_path='schedule_status')
    def schedule_status(self, request):
        """Return last sync times and next scheduled sync."""
        last_item_sync = ZohoSyncLog.objects.filter(
            module='items', status='success'
        ).order_by('-created_at').first()
        last_contact_sync = ZohoSyncLog.objects.filter(
            module='contacts', status='success'
        ).order_by('-created_at').first()
        return Response({
            'last_items_sync': last_item_sync.created_at if last_item_sync else None,
            'last_contacts_sync': last_contact_sync.created_at if last_contact_sync else None,
            'schedule': '8:00 AM, 2:00 PM, 8:00 PM IST',
            'timezone': 'Asia/Kolkata',
        })
