"""
Management command to clear all dummy data and import real business data
from a Zoho Books ZIP export for MIRAYA BESPOKE JEWELLERY LLP.

Usage:
    python manage.py import_miraya_data --zip "C:\\Users\\JagjeetSingh\\Downloads\\MIRAYA BESPOKE JEWELLERY LLP_2026-05-21.zip"
"""

import csv
import io
import re
import zipfile
from datetime import date
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clean_mobile(val):
    """Normalise a phone number to a 10-digit Indian mobile string."""
    if not val:
        return ''
    digits = re.sub(r'\D', '', str(val))
    # Strip leading country code +91 / 0091 / 91
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith('0') and len(digits) == 11:
        digits = digits[1:]
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def parse_price(raw):
    """Parse 'INR 1,23,456.78' or '68641.50' → Decimal or None."""
    if not raw:
        return None
    cleaned = re.sub(r'[^\d.]', '', raw.replace(',', ''))
    try:
        return Decimal(cleaned) if cleaned else None
    except InvalidOperation:
        return None


def parse_date(raw):
    """Try several common date formats and return a date or None."""
    if not raw or not raw.strip():
        return None
    raw = raw.strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%d-%b-%Y', '%d %b %Y'):
        try:
            from datetime import datetime
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def parse_description(desc):
    """
    Extract metal_type, metal_purity, gross_weight, net_weight from
    free-text description.  Returns a dict.
    """
    result = {
        'metal_type': '',
        'metal_purity': '',
        'gross_weight': None,
        'net_weight': None,
    }
    if not desc:
        return result

    text = desc.replace('\n', ' ')

    # Metal purity (check more specific patterns first)
    if re.search(r'14\s*[kK][tT]?', text):
        result['metal_type'] = 'gold'
        result['metal_purity'] = '14k'
    elif re.search(r'18\s*[kK][tT]?', text):
        result['metal_type'] = 'gold'
        result['metal_purity'] = '18k'
    elif re.search(r'22\s*[kK][tT]?', text):
        result['metal_type'] = 'gold'
        result['metal_purity'] = '22k'
    elif re.search(r'24\s*[kK][tT]?', text):
        result['metal_type'] = 'gold'
        result['metal_purity'] = '24k'
    elif re.search(r'\bplatinum\b', text, re.I):
        result['metal_type'] = 'platinum'
        result['metal_purity'] = '950'
    elif re.search(r'\b925\b', text):
        result['metal_type'] = 'silver'
        result['metal_purity'] = '925'
    elif re.search(r'\bsilver\b', text, re.I):
        result['metal_type'] = 'silver'
        result['metal_purity'] = '925'
    elif re.search(r'\bgold\b', text, re.I):
        result['metal_type'] = 'gold'
        # purity unknown; leave blank

    # Gross weight — "G.Wt. 5.2g", "GW: 5.2 gm", "gross weight 5.2g"
    m = re.search(
        r'(?:gross\s*weight|g\.?\s*wt\.?|gw)[:\s\-]+(\d+\.?\d*)\s*(?:g|gm|grams?)',
        text, re.I
    )
    if m:
        try:
            result['gross_weight'] = Decimal(m.group(1))
        except InvalidOperation:
            pass

    # Net weight
    m = re.search(
        r'(?:net\s*weight|n\.?\s*wt\.?|nw)[:\s\-]+(\d+\.?\d*)\s*(?:g|gm|grams?)',
        text, re.I
    )
    if m:
        try:
            result['net_weight'] = Decimal(m.group(1))
        except InvalidOperation:
            pass

    return result


CATEGORY_MAP = {
    'Rings': 'rings',
    'Ring': 'rings',
    'Bracelets': 'bracelets',
    'Bracelet': 'bracelets',
    'Cocktail Earrings': 'cocktail_earrings',
    'Solitaire Earrings': 'solitaire_earrings',
    'Small Earrings': 'small_earrings',
    'Earrings': 'cocktail_earrings',
    'Pendant Chain': 'pendant_chain',
    'Pendant': 'pendant_chain',
    'Pendants': 'pendants',
    'Necklaces': 'necklaces',
    'Necklace': 'necklaces',
    'Chains': 'chains',
    'Chain': 'chains',
    'White Beads Chain': 'chains',
    'Yellow Beads Chain': 'chains',
    'Black Beads Chain': 'chains',
    'White Gold Chain': 'chains',
    'Yellow Gold Chain': 'chains',
    'Bangles': 'bangles',
    'Nose Pins': 'nose_pins',
    'Ear Cuffs': 'ear_cuffs',
}

# Product.CERT_TYPES: none, generic, igi, sgl, hallmark, unknown
CERT_MAP = {
    'IGI': 'igi',
    'SGL': 'sgl',
    'Hallmark': 'hallmark',
    'GIA': 'unknown',   # GIA not in model choices → map to unknown
    'HKJ': 'unknown',   # HKJ not in model choices → map to unknown
    'BIS': 'unknown',   # BIS not in model choices → map to unknown
    'GSI': 'unknown',   # GSI not in model choices → map to unknown
    'Yes': 'generic',
    'No': 'none',
    '': 'none',
}

INV_MAP = {
    'Available': 'available',
    'Sold': 'sold',
    'Reserved': 'reserved',
    'Returned': 'returned',
    '': 'available',
}


class Command(BaseCommand):
    help = (
        'Clear all dummy data and import real Miraya business data from a '
        'Zoho Books ZIP export.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--zip',
            required=True,
            help='Full path to the Zoho Books ZIP export file.',
        )
        parser.add_argument(
            '--skip-clear',
            action='store_true',
            help='Skip the data-clearing step (useful for re-running imports).',
        )
        parser.add_argument(
            '--skip-customers',
            action='store_true',
            help='Skip importing Contacts.csv.',
        )
        parser.add_argument(
            '--skip-products',
            action='store_true',
            help='Skip importing Item.csv.',
        )

    # -----------------------------------------------------------------------
    # STEP 1 — Clear existing data
    # -----------------------------------------------------------------------

    def clear_data(self):
        self.stdout.write('\n[CLEAR] Deleting existing data...')

        # After-sales images before requests
        from apps.after_sales.models import AfterSalesImage, AfterSalesRequest
        n, _ = AfterSalesImage.objects.all().delete()
        self.stdout.write(f'  AfterSalesImage: {n} deleted')

        n, _ = AfterSalesRequest.objects.all().delete()
        self.stdout.write(f'  AfterSalesRequest: {n} deleted')

        # Reservations
        from apps.reservations.models import ProductReservation
        n, _ = ProductReservation.objects.all().delete()
        self.stdout.write(f'  ProductReservation: {n} deleted')

        # Quotations (items first due to FK)
        from apps.quotations.models import QuotationItem, Quotation
        n, _ = QuotationItem.objects.all().delete()
        self.stdout.write(f'  QuotationItem: {n} deleted')
        n, _ = Quotation.objects.all().delete()
        self.stdout.write(f'  Quotation: {n} deleted')

        # Leads (activities + shortlisted products + tasks first)
        from apps.leads.models import LeadActivity, LeadProduct, Task, Lead
        n, _ = LeadActivity.objects.all().delete()
        self.stdout.write(f'  LeadActivity: {n} deleted')
        n, _ = LeadProduct.objects.all().delete()
        self.stdout.write(f'  LeadProduct: {n} deleted')
        n, _ = Task.objects.all().delete()
        self.stdout.write(f'  Task: {n} deleted')
        n, _ = Lead.objects.all().delete()
        self.stdout.write(f'  Lead: {n} deleted')

        # Products (images and certificates first)
        from apps.products.models import (
            ProductImage, ProductCertificate, ImportLog, ImportLogItem, Product
        )
        n, _ = ProductImage.objects.all().delete()
        self.stdout.write(f'  ProductImage: {n} deleted')
        n, _ = ProductCertificate.objects.all().delete()
        self.stdout.write(f'  ProductCertificate: {n} deleted')
        n, _ = ImportLogItem.objects.all().delete()
        self.stdout.write(f'  ImportLogItem: {n} deleted')
        n, _ = ImportLog.objects.all().delete()
        self.stdout.write(f'  ImportLog: {n} deleted')
        n, _ = Product.objects.all().delete()
        self.stdout.write(f'  Product: {n} deleted')

        # Customers
        from apps.customers.models import Customer
        n, _ = Customer.objects.all().delete()
        self.stdout.write(f'  Customer: {n} deleted')

        # Audit logs
        try:
            from apps.audit_logs.models import AuditLog
            n, _ = AuditLog.objects.all().delete()
            self.stdout.write(f'  AuditLog: {n} deleted')
        except ImportError:
            pass

        # Zoho integration logs (keep tokens so OAuth still works)
        from apps.zoho_integration.models import ZohoSyncLog, WebhookLog
        n, _ = ZohoSyncLog.objects.all().delete()
        self.stdout.write(f'  ZohoSyncLog: {n} deleted')
        n, _ = WebhookLog.objects.all().delete()
        self.stdout.write(f'  WebhookLog: {n} deleted')
        # NOTE: ZohoToken intentionally kept — preserves OAuth auth so image sync works

        self.stdout.write(self.style.SUCCESS('[CLEAR] Done.\n'))

    # -----------------------------------------------------------------------
    # STEP 2 — Import Contacts.csv → Customers
    # -----------------------------------------------------------------------

    def import_customers(self, zf, admin_user):
        from apps.customers.models import Customer

        # Find Contacts.csv inside the ZIP (case-insensitive)
        csv_name = None
        for name in zf.namelist():
            if name.lower().endswith('contacts.csv'):
                csv_name = name
                break

        if csv_name is None:
            self.stderr.write('  [CUSTOMERS] Contacts.csv not found in ZIP — skipping.')
            return 0, 0

        self.stdout.write(f'  Reading: {csv_name}')

        imported = 0
        skipped = 0
        errors = 0
        seen_mobiles = set()

        with zf.open(csv_name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding='utf-8-sig'))
            for row_num, row in enumerate(reader, start=2):  # 2 = first data row
                try:
                    # Only import Customers (not Vendors)
                    contact_type = row.get('Contact Type', '').strip()
                    if contact_type.lower() not in ('customer', ''):
                        skipped += 1
                        continue

                    # Skip rows that are explicitly vendors
                    if contact_type.lower() == 'vendor':
                        skipped += 1
                        continue

                    # Name
                    first_name = row.get('First Name', '').strip()
                    last_name = row.get('Last Name', '').strip()

                    # Fall back to parsing Display Name
                    if not first_name:
                        display = row.get('Display Name', '').strip()
                        if display:
                            parts = display.split(None, 1)
                            first_name = parts[0]
                            last_name = parts[1] if len(parts) > 1 else ''

                    if not first_name:
                        skipped += 1
                        continue

                    # Mobile
                    mobile_raw = row.get('MobilePhone', '').strip()
                    mobile = clean_mobile(mobile_raw)
                    if not mobile:
                        # Fall back to Phone
                        phone_raw = row.get('Phone', '').strip()
                        mobile = clean_mobile(phone_raw)

                    email = row.get('EmailID', '').strip()

                    # Skip if both missing
                    if not mobile and not email:
                        skipped += 1
                        continue

                    # Skip duplicate mobiles within this import run
                    if mobile and mobile in seen_mobiles:
                        skipped += 1
                        continue
                    if mobile:
                        seen_mobiles.add(mobile)

                    # Customer type
                    sub_type = row.get('Customer Sub Type', '').strip()
                    if sub_type in ('Individual', 'Customer (Individual)'):
                        customer_type = 'retail'
                    elif sub_type in ('Business', 'Customer (Business)'):
                        customer_type = 'wholesale'
                    else:
                        customer_type = 'retail'

                    # Notes — include GSTIN if present
                    notes = row.get('Notes', '').strip()
                    gstin = row.get('GST Identification Number (GSTIN)', '').strip()
                    if gstin:
                        gstin_note = f'GSTIN: {gstin}'
                        notes = f'{notes}\n{gstin_note}'.strip() if notes else gstin_note

                    # Zoho contact ID
                    zoho_contact_id = row.get('Contact ID', '').strip() or None

                    # City / address
                    city = row.get('Billing City', '').strip()
                    address = row.get('Billing Address', '').strip()

                    # created_at
                    created_time = row.get('Created Time', '').strip()
                    created_at_val = parse_date(created_time)

                    # Build kwargs
                    kwargs = dict(
                        first_name=first_name,
                        last_name=last_name,
                        email=email,
                        city=city,
                        address=address,
                        customer_type=customer_type,
                        notes=notes,
                        created_by=admin_user,
                    )
                    # mobile must be unique and non-empty for the model;
                    # if still empty after both sources, generate a placeholder
                    # so the record isn't silently discarded.
                    if mobile:
                        kwargs['mobile'] = mobile
                    else:
                        # Use email-based placeholder (will be obviously fake)
                        placeholder = f'0000{row_num:06d}'
                        kwargs['mobile'] = placeholder

                    # zoho_contact_id
                    if zoho_contact_id:
                        kwargs['zoho_contact_id'] = zoho_contact_id

                    # Use get_or_create by zoho_contact_id if available,
                    # otherwise by mobile to be idempotent.
                    if zoho_contact_id:
                        obj, created_flag = Customer.objects.get_or_create(
                            zoho_contact_id=zoho_contact_id,
                            defaults=kwargs,
                        )
                    else:
                        obj, created_flag = Customer.objects.get_or_create(
                            mobile=kwargs['mobile'],
                            defaults=kwargs,
                        )

                    if created_flag:
                        # Manually set created_at if parseable (auto_now_add=True
                        # prevents this via create; use update after)
                        if created_at_val:
                            Customer.objects.filter(pk=obj.pk).update(
                                created_at=created_at_val
                            )
                        imported += 1
                    else:
                        skipped += 1

                except Exception as exc:
                    errors += 1
                    self.stderr.write(
                        f'  [CUSTOMERS] Row {row_num} error: {exc}'
                    )

        self.stdout.write(
            f'  Customers: {imported} imported, {skipped} skipped, {errors} errors'
        )
        return imported, skipped

    # -----------------------------------------------------------------------
    # STEP 3 — Import Item.csv → Products
    # -----------------------------------------------------------------------

    def import_products(self, zf, admin_user):
        from apps.products.models import Product

        # Find Item.csv inside the ZIP (case-insensitive)
        csv_name = None
        for name in zf.namelist():
            if name.lower().endswith('item.csv'):
                csv_name = name
                break

        if csv_name is None:
            self.stderr.write('  [PRODUCTS] Item.csv not found in ZIP — skipping.')
            return 0, 0

        self.stdout.write(f'  Reading: {csv_name}')

        batch = []
        imported = 0
        skipped = 0
        errors = 0
        BATCH_SIZE = 100

        def flush_batch(b):
            Product.objects.bulk_create(b, ignore_conflicts=True)
            return len(b)

        with zf.open(csv_name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding='utf-8-sig'))
            for row_num, row in enumerate(reader, start=2):
                try:
                    item_name = row.get('Item Name', '').strip()
                    if not item_name:
                        skipped += 1
                        continue

                    zoho_item_id = row.get('Item ID', '').strip() or None

                    # Skip if already exists (idempotent re-runs)
                    if zoho_item_id and Product.objects.filter(
                        zoho_item_id=zoho_item_id
                    ).exists():
                        skipped += 1
                        continue

                    # Category
                    cf_type = row.get('CF.Product Type', '').strip()
                    category = CATEGORY_MAP.get(cf_type, 'other')

                    # Certification
                    cf_cert = row.get('CF.Certification present?', '').strip()
                    certification_type = CERT_MAP.get(cf_cert, 'none')

                    # Inventory status
                    cf_inv = row.get('CF.Inventory', '').strip()
                    zoho_status = row.get('Status', '').strip()
                    if cf_inv in INV_MAP:
                        inventory_status = INV_MAP[cf_inv]
                    elif zoho_status == 'Inactive':
                        inventory_status = 'archived'
                    else:
                        inventory_status = 'available'

                    # Date of purchase
                    date_of_purchase = parse_date(row.get('CF.Date of Purchase', ''))

                    # Description parsing
                    desc = row.get('Description', '').strip()
                    meta = parse_description(desc)

                    # Prices
                    selling_price = parse_price(row.get('Rate', ''))
                    purchase_price = parse_price(row.get('Purchase Rate', ''))

                    # SKU / HSN
                    sku = row.get('SKU', '').strip() or None
                    hsn_code = row.get('HSN/SAC', '').strip()

                    is_active = (zoho_status == 'Active')

                    product = Product(
                        zoho_item_id=zoho_item_id,
                        item_name=item_name,
                        sku=sku,
                        description=desc,
                        category=category,
                        selling_price=selling_price,
                        purchase_price=purchase_price,
                        gross_weight=meta['gross_weight'],
                        net_weight=meta['net_weight'],
                        metal_type=meta['metal_type'],
                        metal_purity=meta['metal_purity'],
                        certification_type=certification_type,
                        inventory_status=inventory_status,
                        zoho_status=zoho_status,
                        date_of_purchase=date_of_purchase,
                        hsn_code=hsn_code,
                        is_active=is_active,
                        created_by=admin_user,
                    )
                    batch.append(product)

                    if len(batch) >= BATCH_SIZE:
                        n = flush_batch(batch)
                        imported += n
                        batch = []
                        self.stdout.write(f'    ... {imported} products imported so far')

                except Exception as exc:
                    errors += 1
                    self.stderr.write(
                        f'  [PRODUCTS] Row {row_num} error: {exc}'
                    )

        # Flush remaining
        if batch:
            n = flush_batch(batch)
            imported += n

        self.stdout.write(
            f'  Products: {imported} imported, {skipped} skipped, {errors} errors'
        )
        return imported, skipped

    # -----------------------------------------------------------------------
    # Main entry point
    # -----------------------------------------------------------------------

    def handle(self, *args, **options):
        from apps.accounts.models import User

        zip_path = options['zip']

        # Verify the ZIP exists before doing anything destructive
        try:
            zf = zipfile.ZipFile(zip_path, 'r')
        except FileNotFoundError:
            self.stderr.write(
                self.style.ERROR(f'ZIP file not found: {zip_path}')
            )
            return
        except zipfile.BadZipFile:
            self.stderr.write(
                self.style.ERROR(f'Not a valid ZIP file: {zip_path}')
            )
            return

        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            self.stderr.write(
                self.style.ERROR(
                    'No superuser found. Create one with: '
                    'python manage.py createsuperuser'
                )
            )
            return

        self.stdout.write(
            self.style.WARNING(
                f'\nImporting data for MIRAYA BESPOKE JEWELLERY LLP'
            )
        )
        self.stdout.write(f'ZIP: {zip_path}')
        self.stdout.write(f'Admin user: {admin_user.username}\n')

        # List ZIP contents for visibility
        self.stdout.write('[ZIP contents]')
        for name in sorted(zf.namelist()):
            self.stdout.write(f'  {name}')
        self.stdout.write('')

        # ── Step 1: Clear ────────────────────────────────────────────────────
        if not options['skip_clear']:
            self.clear_data()
        else:
            self.stdout.write('[CLEAR] Skipped (--skip-clear).\n')

        cust_imported = cust_skipped = 0
        prod_imported = prod_skipped = 0

        # ── Step 2: Customers ────────────────────────────────────────────────
        if not options['skip_customers']:
            self.stdout.write('[CUSTOMERS] Importing from Contacts.csv...')
            cust_imported, cust_skipped = self.import_customers(zf, admin_user)
        else:
            self.stdout.write('[CUSTOMERS] Skipped (--skip-customers).')

        # ── Step 3: Products ─────────────────────────────────────────────────
        if not options['skip_products']:
            self.stdout.write('\n[PRODUCTS] Importing from Item.csv...')
            prod_imported, prod_skipped = self.import_products(zf, admin_user)
        else:
            self.stdout.write('[PRODUCTS] Skipped (--skip-products).')

        zf.close()

        # ── Step 4: Summary ──────────────────────────────────────────────────
        self.stdout.write(
            self.style.SUCCESS(
                f'\n[DONE] Import complete:\n'
                f'  Customers: {cust_imported} imported, {cust_skipped} skipped\n'
                f'  Products:  {prod_imported} imported, {prod_skipped} skipped'
            )
        )
