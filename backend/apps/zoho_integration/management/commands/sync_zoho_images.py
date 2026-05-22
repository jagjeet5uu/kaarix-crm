"""
Management command to sync product images from Zoho Books.

For every Product that has a zoho_item_id and no primary image yet,
this command fetches the image binary from the Zoho Books API and
saves it as a ProductImage (stored in Django media/).

Usage:
    python manage.py sync_zoho_images            # sync all products missing images
    python manage.py sync_zoho_images --all      # re-sync even products that already have images
    python manage.py sync_zoho_images --limit 50 # only process first N products
"""

import logging
import os
import time
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)

# Map Zoho content-type → file extension
CONTENT_TYPE_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
}


class Command(BaseCommand):
    help = 'Sync product images from Zoho Books API.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            dest='sync_all',
            help='Re-sync even products that already have images.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Maximum number of products to process.',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.3,
            help='Seconds to wait between API calls (default: 0.3). '
                 'Increase if hitting Zoho rate limits.',
        )

    def handle(self, *args, **options):
        from apps.products.models import Product, ProductImage
        from apps.zoho_integration.client import ZohoClient, ZohoAPIError
        from apps.accounts.models import User

        sync_all = options['sync_all']
        limit = options['limit']
        delay = options['delay']

        admin_user = User.objects.filter(is_superuser=True).first()

        # --- Build queryset ---
        qs = Product.objects.filter(
            zoho_item_id__isnull=False,
        ).exclude(zoho_item_id='')

        if not sync_all:
            # Only products that have no images at all
            from django.db.models import Count
            products_with_images = (
                ProductImage.objects.values_list('product_id', flat=True).distinct()
            )
            qs = qs.exclude(pk__in=products_with_images)

        qs = qs.order_by('id')

        if limit:
            qs = qs[:limit]

        total = qs.count()
        self.stdout.write(
            self.style.WARNING(
                f'\n[ZOHO IMAGE SYNC] {total} products to process '
                f'(sync_all={sync_all}, limit={limit or "none"}, delay={delay}s)\n'
            )
        )

        if total == 0:
            self.stdout.write('Nothing to do.')
            return

        client = ZohoClient()
        fetched = 0
        skipped = 0
        errors = 0

        for i, product in enumerate(qs, start=1):
            try:
                result = client.get_item_image(product.zoho_item_id)

                if result is None:
                    # No image on Zoho side
                    skipped += 1
                    if i % 50 == 0 or i == total:
                        self.stdout.write(
                            f'  [{i}/{total}] {product.item_name[:40]} — no image'
                        )
                    time.sleep(delay)
                    continue

                image_bytes, content_type = result
                if not image_bytes:
                    skipped += 1
                    time.sleep(delay)
                    continue

                ext = CONTENT_TYPE_EXT.get(content_type.split(';')[0].strip(), '.jpg')
                filename = f'zoho_{product.zoho_item_id}{ext}'
                relative_path = f'products/{product.pk}/{filename}'

                # Save via Django storage
                saved_path = default_storage.save(
                    relative_path, ContentFile(image_bytes)
                )

                # Build the file_url — use absolute URL if possible
                if hasattr(settings, 'MEDIA_URL'):
                    file_url = settings.MEDIA_URL.rstrip('/') + '/' + saved_path
                else:
                    file_url = '/' + saved_path

                # If using GCS (production), file_url is the full GCS URL
                if hasattr(default_storage, 'url'):
                    try:
                        file_url = default_storage.url(saved_path)
                    except Exception:
                        pass

                # Mark any existing primary images as non-primary
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
                if i % 10 == 0 or i == total:
                    self.stdout.write(
                        f'  [{i}/{total}] ✓ {product.item_name[:50]}'
                    )

            except ZohoAPIError as exc:
                err_text = str(exc)
                # Zoho rate-limit: code 43 or HTTP 429
                is_rate_limited = (
                    exc.status_code == 429
                    or '"code":43' in err_text
                    or 'exceeded the maximum' in err_text
                )
                if is_rate_limited:
                    self.stderr.write(
                        f'  [{i}/{total}] Rate limited — sleeping 60s before retrying...'
                    )
                    time.sleep(60)
                    # Retry once after waiting
                    try:
                        result = client.get_item_image(product.zoho_item_id)
                        if result:
                            image_bytes, content_type = result
                            ext = CONTENT_TYPE_EXT.get(content_type.split(';')[0].strip(), '.jpg')
                            filename = f'zoho_{product.zoho_item_id}{ext}'
                            relative_path = f'products/{product.pk}/{filename}'
                            saved_path = default_storage.save(relative_path, ContentFile(image_bytes))
                            file_url = settings.MEDIA_URL.rstrip('/') + '/' + saved_path
                            try:
                                file_url = default_storage.url(saved_path)
                            except Exception:
                                pass
                            ProductImage.objects.update_or_create(
                                product=product, file_name=filename,
                                defaults={'file_url': file_url, 'file_type': content_type.split(';')[0].strip(),
                                          'is_primary': True, 'uploaded_by': admin_user},
                            )
                            fetched += 1
                            self.stdout.write(f'  [{i}/{total}] ✓ retry ok: {product.item_name[:50]}')
                        else:
                            skipped += 1
                    except Exception:
                        errors += 1
                        self.stderr.write(f'  [{i}/{total}] retry failed for {product.zoho_item_id}')
                else:
                    errors += 1
                    self.stderr.write(
                        f'  [{i}/{total}] API error for {product.zoho_item_id}: {exc}'
                    )
                    if exc.status_code and exc.status_code >= 500:
                        time.sleep(5)

            except Exception as exc:
                errors += 1
                self.stderr.write(
                    f'  [{i}/{total}] Unexpected error for {product.item_name}: {exc}'
                )

            time.sleep(delay)

        self.stdout.write(
            self.style.SUCCESS(
                f'\n[DONE] Image sync complete:\n'
                f'  Fetched:  {fetched}\n'
                f'  Skipped (no image): {skipped}\n'
                f'  Errors:   {errors}\n'
                f'  Total:    {total}'
            )
        )
