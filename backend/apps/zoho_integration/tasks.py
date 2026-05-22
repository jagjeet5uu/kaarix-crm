import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def sync_all_items(self):
    """Sync all items from Zoho to local database."""
    from apps.zoho_integration.client import ZohoClient, ZohoAPIError
    from apps.zoho_integration.models import ZohoSyncLog
    from apps.products.models import Product
    from apps.products.tasks import normalize_category, normalize_inventory_status, normalize_certification, parse_price, parse_date

    sync_log = ZohoSyncLog.objects.create(
        module='items',
        direction='zoho_to_crm',
        status='pending',
    )

    try:
        client = ZohoClient()
        page = 1
        total_synced = 0
        total_pages = 1

        while page <= total_pages:
            response = client.get_items(page=page)
            items = response.get('items', [])
            page_context = response.get('page_context', {})
            total_pages = page_context.get('total_pages', 1)

            for item in items:
                zoho_id = item.get('item_id', '')
                item_name = item.get('name', '')
                sku = item.get('sku') or None
                rate = parse_price(str(item.get('rate', '')))
                purchase_rate = parse_price(str(item.get('purchase_rate', '')))
                zoho_status = item.get('status', '')
                description = item.get('description', '')

                # Map custom fields
                cf = {cf_field.get('label', ''): cf_field.get('value', '') for cf_field in item.get('custom_fields', [])}
                product_type = cf.get('Product Type', '')
                date_of_purchase_raw = cf.get('Date of Purchase', '')
                certification_raw = cf.get('Certification present?', '')
                inventory_raw = cf.get('Inventory', '')

                category = normalize_category(product_type)
                inventory_status = normalize_inventory_status(inventory_raw, item_name)
                certification_type = normalize_certification(certification_raw)
                date_of_purchase = parse_date(date_of_purchase_raw)

                Product.objects.update_or_create(
                    zoho_item_id=zoho_id,
                    defaults={
                        'item_name': item_name,
                        'sku': sku,
                        'description': description,
                        'selling_price': rate,
                        'purchase_price': purchase_rate,
                        'category': category,
                        'inventory_status': inventory_status,
                        'certification_type': certification_type,
                        'zoho_status': zoho_status,
                        'date_of_purchase': date_of_purchase,
                    },
                )
                total_synced += 1

            page += 1

        sync_log.status = 'success'
        sync_log.response_payload = {'total_synced': total_synced}
        sync_log.save()
        logger.info(f"Synced {total_synced} items from Zoho.")
        return total_synced

    except ZohoAPIError as e:
        sync_log.status = 'failed'
        sync_log.error_message = str(e)
        sync_log.save()
        logger.error(f"Zoho items sync failed: {e}")
        raise self.retry(exc=e, countdown=300)
    except Exception as e:
        sync_log.status = 'failed'
        sync_log.error_message = str(e)
        sync_log.save()
        logger.exception(f"Unexpected error during items sync: {e}")
        raise self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=3)
def sync_all_contacts(self):
    """Sync all contacts from Zoho to local Customer records."""
    from apps.zoho_integration.client import ZohoClient, ZohoAPIError
    from apps.zoho_integration.models import ZohoSyncLog
    from apps.customers.models import Customer

    sync_log = ZohoSyncLog.objects.create(
        module='contacts',
        direction='zoho_to_crm',
        status='pending',
    )

    try:
        client = ZohoClient()
        page = 1
        total_synced = 0
        total_pages = 1

        while page <= total_pages:
            response = client.get_contacts(page=page)
            contacts = response.get('contacts', [])
            page_context = response.get('page_context', {})
            total_pages = page_context.get('total_pages', 1)

            for contact in contacts:
                zoho_contact_id = contact.get('contact_id', '')
                full_name = contact.get('contact_name', '')
                parts = full_name.split(' ', 1)
                first_name = parts[0] if parts else full_name
                last_name = parts[1] if len(parts) > 1 else ''
                email = contact.get('email', '')
                mobile = (
                    contact.get('mobile', '')
                    or contact.get('phone', '')
                    or ''
                )

                if not mobile:
                    continue  # Mobile is required

                Customer.objects.update_or_create(
                    zoho_contact_id=zoho_contact_id,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': email,
                        'mobile': mobile,
                    },
                )
                total_synced += 1

            page += 1

        sync_log.status = 'success'
        sync_log.response_payload = {'total_synced': total_synced}
        sync_log.save()
        logger.info(f"Synced {total_synced} contacts from Zoho.")
        return total_synced

    except ZohoAPIError as e:
        sync_log.status = 'failed'
        sync_log.error_message = str(e)
        sync_log.save()
        logger.error(f"Zoho contacts sync failed: {e}")
        raise self.retry(exc=e, countdown=300)
    except Exception as e:
        sync_log.status = 'failed'
        sync_log.error_message = str(e)
        sync_log.save()
        logger.exception(f"Unexpected error during contacts sync: {e}")
        raise self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=3)
def sync_invoices(self):
    """Sync invoices from Zoho."""
    from apps.zoho_integration.client import ZohoClient, ZohoAPIError
    from apps.zoho_integration.models import ZohoSyncLog

    sync_log = ZohoSyncLog.objects.create(
        module='invoices',
        direction='zoho_to_crm',
        status='pending',
    )

    try:
        client = ZohoClient()
        response = client.get_invoices(page=1)
        invoices = response.get('invoices', [])

        sync_log.status = 'success'
        sync_log.response_payload = {'total': len(invoices)}
        sync_log.save()
        logger.info(f"Synced {len(invoices)} invoices from Zoho.")
        return len(invoices)

    except ZohoAPIError as e:
        sync_log.status = 'failed'
        sync_log.error_message = str(e)
        sync_log.save()
        raise self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=2)
def sync_item_images(self, sync_all=False, limit=None):
    """
    Fetch product images from Zoho Books and save them as ProductImage records.
    Can be called via Celery or triggered from the API.
    """
    from apps.zoho_integration.client import ZohoClient, ZohoAPIError
    from apps.zoho_integration.models import ZohoSyncLog
    from apps.products.models import Product, ProductImage
    from apps.accounts.models import User
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    from django.conf import settings
    import time

    CONTENT_TYPE_EXT = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
    }

    sync_log = ZohoSyncLog.objects.create(
        module='item_images',
        direction='zoho_to_crm',
        status='pending',
    )

    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        client = ZohoClient()

        qs = Product.objects.filter(
            zoho_item_id__isnull=False,
        ).exclude(zoho_item_id='')

        if not sync_all:
            products_with_images = ProductImage.objects.values_list(
                'product_id', flat=True
            ).distinct()
            qs = qs.exclude(pk__in=products_with_images)

        if limit:
            qs = qs[:limit]

        fetched = 0
        skipped = 0
        errors = 0

        for product in qs:
            try:
                result = client.get_item_image(product.zoho_item_id)
                if result is None:
                    skipped += 1
                    time.sleep(0.3)
                    continue

                image_bytes, content_type = result
                if not image_bytes:
                    skipped += 1
                    continue

                ext = CONTENT_TYPE_EXT.get(content_type.split(';')[0].strip(), '.jpg')
                filename = f'zoho_{product.zoho_item_id}{ext}'
                relative_path = f'products/{product.pk}/{filename}'

                saved_path = default_storage.save(
                    relative_path, ContentFile(image_bytes)
                )

                file_url = settings.MEDIA_URL.rstrip('/') + '/' + saved_path
                try:
                    file_url = default_storage.url(saved_path)
                except Exception:
                    pass

                if sync_all:
                    ProductImage.objects.filter(
                        product=product, is_primary=True
                    ).update(is_primary=False)

                ProductImage.objects.update_or_create(
                    product=product,
                    file_name=filename,
                    defaults={
                        'file_url': file_url,
                        'file_type': content_type.split(';')[0].strip(),
                        'is_primary': True,
                        'uploaded_by': admin_user,
                    },
                )
                fetched += 1

            except ZohoAPIError as e:
                errors += 1
                logger.error(f'Image fetch error for {product.zoho_item_id}: {e}')
                if e.status_code == 429:
                    time.sleep(10)
            except Exception as e:
                errors += 1
                logger.exception(f'Unexpected image error for {product.item_name}: {e}')

            time.sleep(0.3)

        sync_log.status = 'success'
        sync_log.response_payload = {
            'fetched': fetched, 'skipped': skipped, 'errors': errors
        }
        sync_log.save()
        logger.info(f'Image sync done — fetched={fetched}, skipped={skipped}, errors={errors}')
        return {'fetched': fetched, 'skipped': skipped, 'errors': errors}

    except Exception as e:
        sync_log.status = 'failed'
        sync_log.error_message = str(e)
        sync_log.save()
        logger.exception(f'Unexpected error during image sync: {e}')
        raise self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=3)
def process_webhook(self, webhook_log_id):
    """Process a Zoho webhook asynchronously."""
    from apps.zoho_integration.models import WebhookLog

    try:
        webhook_log = WebhookLog.objects.get(id=webhook_log_id)
    except WebhookLog.DoesNotExist:
        logger.error(f"WebhookLog {webhook_log_id} not found")
        return

    try:
        payload = webhook_log.payload
        event_type = webhook_log.event_type

        logger.info(f"Processing webhook: {event_type} (log #{webhook_log_id})")

        # Handle idempotency by checking zoho_id
        zoho_id = None
        if isinstance(payload, dict):
            # Try to extract zoho_id from various fields
            zoho_id = (
                payload.get('item_id')
                or payload.get('contact_id')
                or payload.get('invoice_id')
                or payload.get('estimate_id')
                or payload.get('payment_id')
            )

        if zoho_id:
            # Check if already processed
            from apps.zoho_integration.models import ZohoSyncLog
            already_processed = ZohoSyncLog.objects.filter(
                zoho_id=str(zoho_id),
                status='success',
            ).exists()
            if already_processed:
                webhook_log.status = 'skipped_duplicate'
                webhook_log.processed_at = timezone.now()
                webhook_log.save()
                return

        # Route based on event type
        if 'item' in event_type.lower():
            sync_all_items.delay()
        elif 'contact' in event_type.lower():
            sync_all_contacts.delay()
        elif 'invoice' in event_type.lower():
            sync_invoices.delay()

        webhook_log.status = 'processed'
        webhook_log.processed_at = timezone.now()
        webhook_log.save()

    except Exception as e:
        logger.exception(f"Error processing webhook {webhook_log_id}: {e}")
        webhook_log.status = 'failed'
        webhook_log.error_message = str(e)
        webhook_log.save()
        raise self.retry(exc=e, countdown=60)
