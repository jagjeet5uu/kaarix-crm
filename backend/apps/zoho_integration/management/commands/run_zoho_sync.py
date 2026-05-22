"""
Run a full Zoho sync immediately. Can be called by Windows Task Scheduler or cron.
Usage: python manage.py run_zoho_sync
       python manage.py run_zoho_sync --skip-images
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Run a full Zoho sync: items, contacts, and optionally images.'

    def add_arguments(self, parser):
        parser.add_argument('--skip-images', action='store_true', help='Skip image sync')
        parser.add_argument('--skip-items', action='store_true', help='Skip items sync')
        parser.add_argument('--skip-contacts', action='store_true', help='Skip contacts sync')

    def handle(self, *args, **options):
        import time
        from apps.zoho_integration.models import ZohoToken

        # Check token
        token = ZohoToken.objects.order_by('-updated_at').first()
        if not token:
            self.stderr.write(self.style.ERROR('No Zoho token. Run OAuth first.'))
            return

        self.stdout.write(self.style.WARNING('\n[ZOHO SYNC] Starting full sync...'))
        start = time.time()

        if not options['skip_items']:
            self.stdout.write('[1/3] Syncing items...')
            try:
                from apps.zoho_integration.client import ZohoClient
                from apps.products.models import Product
                from apps.products.tasks import (
                    normalize_category, normalize_inventory_status,
                    normalize_certification, parse_price, parse_date,
                )
                client = ZohoClient()
                page = 1
                total = 0
                while True:
                    resp = client.get_items(page=page)
                    items = resp.get('items', [])
                    if not items:
                        break
                    for item in items:
                        zoho_id = item.get('item_id', '')
                        cf = {
                            f.get('label', ''): f.get('value', '')
                            for f in item.get('custom_fields', [])
                        }
                        Product.objects.update_or_create(
                            zoho_item_id=zoho_id,
                            defaults={
                                'item_name': item.get('name', ''),
                                'sku': item.get('sku') or None,
                                'description': item.get('description', ''),
                                'selling_price': parse_price(str(item.get('rate', ''))),
                                'purchase_price': parse_price(str(item.get('purchase_rate', ''))),
                                'category': normalize_category(cf.get('Product Type', '')),
                                'inventory_status': normalize_inventory_status(
                                    cf.get('Inventory', ''), item.get('name', '')
                                ),
                                'certification_type': normalize_certification(
                                    cf.get('Certification present?', '')
                                ),
                                'zoho_status': item.get('status', ''),
                                'date_of_purchase': parse_date(cf.get('Date of Purchase', '')),
                                'is_active': item.get('status', '') == 'Active',
                            },
                        )
                        total += 1
                    page_ctx = resp.get('page_context', {})
                    if not page_ctx.get('has_more_page', False):
                        break
                    page += 1
                self.stdout.write(self.style.SUCCESS(f'  Items synced: {total}'))
            except Exception as e:
                self.stderr.write(f'  Items sync error: {e}')

        if not options['skip_contacts']:
            self.stdout.write('[2/3] Syncing contacts...')
            try:
                from apps.zoho_integration.client import ZohoClient
                from apps.customers.models import Customer
                client = ZohoClient()
                page = 1
                total = 0
                while True:
                    resp = client.get_contacts(page=page)
                    contacts = resp.get('contacts', [])
                    if not contacts:
                        break
                    for contact in contacts:
                        mobile = contact.get('mobile', '') or contact.get('phone', '')
                        if not mobile:
                            continue
                        full_name = contact.get('contact_name', '')
                        parts = full_name.split(' ', 1)
                        Customer.objects.update_or_create(
                            zoho_contact_id=contact.get('contact_id', ''),
                            defaults={
                                'first_name': parts[0],
                                'last_name': parts[1] if len(parts) > 1 else '',
                                'email': contact.get('email', ''),
                                'mobile': mobile,
                            },
                        )
                        total += 1
                    page_ctx = resp.get('page_context', {})
                    if not page_ctx.get('has_more_page', False):
                        break
                    page += 1
                self.stdout.write(self.style.SUCCESS(f'  Contacts synced: {total}'))
            except Exception as e:
                self.stderr.write(f'  Contacts sync error: {e}')

        if not options['skip_images']:
            self.stdout.write('[3/3] Syncing images (new only)...')
            try:
                from django.core.management import call_command
                call_command('sync_zoho_images', '--delay', '1.5')
            except Exception as e:
                self.stderr.write(f'  Images sync error: {e}')

        elapsed = time.time() - start
        self.stdout.write(self.style.SUCCESS(f'\n[DONE] Full sync completed in {elapsed:.0f}s'))
