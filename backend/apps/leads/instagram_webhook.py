"""
Instagram DM Webhook handler.
Receives POST from Meta/Instagram when a user sends a DM to the business account.
Creates a Lead in the CRM with source='instagram'.

Setup in Meta Business Suite:
  Callback URL: https://your-domain.com/api/webhooks/instagram/
  Verify Token: value of INSTAGRAM_VERIFY_TOKEN in .env
  Subscriptions: messages
"""
import json
import logging

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class InstagramWebhookView(View):

    def get(self, request):
        """Webhook verification by Meta."""
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        verify_token = getattr(settings, 'INSTAGRAM_VERIFY_TOKEN', '')
        if mode == 'subscribe' and token == verify_token:
            logger.info('Instagram webhook verified successfully.')
            return HttpResponse(challenge, content_type='text/plain')
        return HttpResponse('Verification failed', status=403)

    def post(self, request):
        """Handle incoming Instagram DM events."""
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        logger.info(f'Instagram webhook received: {json.dumps(data)[:500]}')

        for entry in data.get('entry', []):
            for event in entry.get('messaging', []):
                self._handle_message_event(event)

        return JsonResponse({'status': 'ok'})

    def _handle_message_event(self, event):
        """Parse a messaging event and create/update a lead."""
        sender_id = event.get('sender', {}).get('id', '')
        message = event.get('message', {})
        text = message.get('text', '')

        if not sender_id or not text:
            return

        # Skip echo (messages we sent)
        if message.get('is_echo'):
            return

        logger.info(f'Instagram DM from {sender_id}: {text[:100]}')

        try:
            from apps.leads.models import Lead, LeadActivity
            from apps.customers.models import Customer
            from apps.accounts.models import User

            admin = User.objects.filter(is_superuser=True).first()

            # Check if we already have a lead for this Instagram sender
            existing = Lead.objects.filter(
                instagram_sender_id=sender_id,
                stage__in=['new_inquiry', 'contacted', 'requirement_collected'],
            ).order_by('-created_at').first()

            if existing:
                # Add activity to existing lead
                LeadActivity.objects.create(
                    lead=existing,
                    user=admin,
                    activity_type='note',
                    note=f'Instagram DM: {text[:500]}',
                )
                logger.info(f'Updated existing lead #{existing.id} with new DM')
            else:
                # Find or create a placeholder Customer for this Instagram sender.
                # We use 'ig_<sender_id>' as a unique mobile placeholder.
                placeholder_mobile = f'ig_{sender_id}'
                customer, _ = Customer.objects.get_or_create(
                    mobile=placeholder_mobile,
                    defaults={
                        'first_name': f'Instagram User',
                        'last_name': sender_id[-6:],
                        'lead_source': 'instagram',
                        'created_by': admin,
                    },
                )

                lead = Lead.objects.create(
                    customer=customer,
                    instagram_sender_id=sender_id,
                    source='instagram',
                    stage='new_inquiry',
                    notes=f'First DM: {text[:500]}',
                    created_by=admin,
                )
                LeadActivity.objects.create(
                    lead=lead,
                    user=admin,
                    activity_type='note',
                    note=f'Instagram DM received: {text[:500]}',
                )
                logger.info(f'Created new lead #{lead.id} from Instagram DM')

        except Exception as e:
            logger.exception(f'Error creating lead from Instagram DM: {e}')
