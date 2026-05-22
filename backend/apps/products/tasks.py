import csv
import logging
import os
from datetime import datetime

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

CATEGORY_MAP = {
    'rings': 'rings',
    'ring': 'rings',
    'solitaire rings': 'solitaire_rings',
    'solitaire ring': 'solitaire_rings',
    'small earrings': 'small_earrings',
    'small earring': 'small_earrings',
    'cocktail earrings': 'cocktail_earrings',
    'cocktail earring': 'cocktail_earrings',
    'solitaire earrings': 'solitaire_earrings',
    'solitaire earring': 'solitaire_earrings',
    'bracelets': 'bracelets',
    'bracelet': 'bracelets',
    'bangles': 'bangles',
    'bangle': 'bangles',
    'necklaces': 'necklaces',
    'necklace': 'necklaces',
    'pendants': 'pendants',
    'pendant': 'pendants',
    'chains': 'chains',
    'chain': 'chains',
    'pendant chain': 'pendant_chain',
    'nose pins': 'nose_pins',
    'nose pin': 'nose_pins',
    'ear cuffs': 'ear_cuffs',
    'ear cuff': 'ear_cuffs',
    'packaging': 'packaging',
    'packaging material': 'packaging',
    'earrings': 'cocktail_earrings',
    'earring': 'cocktail_earrings',
}

INVENTORY_MAP = {
    'available': 'available',
    'sold': 'sold',
    'returned': 'returned',
    'reserved': 'reserved',
    'under service': 'under_service',
    'archived': 'archived',
    '': 'available',
}

CERT_MAP = {
    'yes': 'generic',
    'yes - generic': 'generic',
    'igi': 'igi',
    'sgl': 'sgl',
    'hallmark': 'hallmark',
    'no': 'none',
    'none': 'none',
    '': 'none',
    'unknown': 'unknown',
}


def parse_price(value):
    """Strip 'INR ' prefix and commas, return float or None."""
    if not value:
        return None
    value = str(value).strip()
    value = value.replace('INR ', '').replace('INR', '').replace(',', '').strip()
    try:
        result = float(value)
        return result if result > 0 else None
    except (ValueError, TypeError):
        return None


def parse_date(value):
    """Parse YYYY-MM-DD date string."""
    if not value:
        return None
    value = str(value).strip()
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def normalize_inventory_status(raw_value, item_name=''):
    """Normalize inventory status from CSV."""
    raw_lower = (raw_value or '').strip().lower()

    # Check item name prefixes
    name_upper = item_name.upper()
    if name_upper.startswith('SOLD'):
        return 'sold'
    if name_upper.startswith('RETURNED'):
        return 'returned'

    return INVENTORY_MAP.get(raw_lower, 'available')


def normalize_certification(raw_value):
    """Normalize certification type from CSV."""
    raw_lower = (raw_value or '').strip().lower()
    return CERT_MAP.get(raw_lower, 'none')


def normalize_category(raw_value):
    """Normalize product category from CSV."""
    raw_lower = (raw_value or '').strip().lower()
    return CATEGORY_MAP.get(raw_lower, 'other')


@shared_task(bind=True, max_retries=3)
def process_csv_import(self, import_log_id, file_path=None):
    """Process a Zoho CSV import file and create/update products."""
    from apps.products.models import ImportLog, ImportLogItem, Product
    from apps.audit_logs.utils import create_audit_log

    try:
        import_log = ImportLog.objects.get(id=import_log_id)
    except ImportLog.DoesNotExist:
        logger.error(f"ImportLog {import_log_id} not found")
        return

    import_log.status = 'processing'
    import_log.save()

    # Determine file path
    csv_file_path = file_path or import_log.file_path
    if not csv_file_path or not os.path.exists(csv_file_path):
        import_log.status = 'failed'
        import_log.error_detail = [{'error': f'File not found: {csv_file_path}'}]
        import_log.save()
        return

    items_to_create = []
    log_items = []
    total_rows = 0
    imported_rows = 0
    skipped_rows = 0
    error_count = 0
    missing_sku_count = 0
    duplicate_sku_count = 0
    missing_cert_count = 0
    invalid_price_count = 0
    error_detail = []
    seen_skus = set()

    try:
        with open(csv_file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            total_rows = len(rows)
            import_log.total_rows = total_rows
            import_log.save()

            for row_num, row in enumerate(rows, start=2):  # row 1 is header
                item_id = row.get('Item ID', '').strip()
                item_name = row.get('Item Name', '').strip()
                sku = row.get('SKU', '').strip() or None
                description = row.get('Description', '').strip()
                rate_raw = row.get('Rate', '').strip()
                purchase_rate_raw = row.get('Purchase Rate', '').strip()
                zoho_status_raw = row.get('Status', '').strip()
                product_type_raw = row.get('CF.Product Type', row.get('Product Type', '')).strip()
                date_of_purchase_raw = row.get('CF.Date of Purchase', row.get('Date of Purchase', '')).strip()
                certification_raw = row.get('CF.Certification present?', row.get('Certification present?', '')).strip()
                inventory_raw = row.get('CF.Inventory', row.get('Inventory', '')).strip()

                if not item_name:
                    log_items.append(ImportLogItem(
                        import_log=import_log, row_number=row_num,
                        sku=sku or '', item_name='',
                        status='skipped', error_message='Empty item name',
                    ))
                    skipped_rows += 1
                    continue

                # Track missing SKU
                if not sku:
                    missing_sku_count += 1

                # Track duplicate SKU
                if sku and sku in seen_skus:
                    duplicate_sku_count += 1
                    log_items.append(ImportLogItem(
                        import_log=import_log, row_number=row_num,
                        sku=sku, item_name=item_name,
                        status='skipped', error_message=f'Duplicate SKU: {sku}',
                    ))
                    skipped_rows += 1
                    continue

                if sku:
                    seen_skus.add(sku)

                # Parse price
                selling_price = parse_price(rate_raw)
                purchase_price = parse_price(purchase_rate_raw)
                if rate_raw and selling_price is None:
                    invalid_price_count += 1

                # Parse date
                date_of_purchase = parse_date(date_of_purchase_raw)

                # Normalize values
                inventory_status = normalize_inventory_status(inventory_raw, item_name)
                certification_type = normalize_certification(certification_raw)
                category = normalize_category(product_type_raw)
                zoho_status = zoho_status_raw if zoho_status_raw in ('Active', 'Inactive') else ''

                # Track missing cert (optional - cert expected but not present)
                if not certification_raw:
                    missing_cert_count += 1

                # Check if product already exists by zoho_item_id or sku
                existing = None
                if item_id:
                    existing = Product.objects.filter(zoho_item_id=item_id).first()
                if not existing and sku:
                    existing = Product.objects.filter(sku=sku).first()

                try:
                    if existing:
                        # Update existing product
                        existing.item_name = item_name
                        existing.description = description
                        existing.category = category
                        existing.selling_price = selling_price
                        existing.purchase_price = purchase_price
                        existing.inventory_status = inventory_status
                        existing.certification_type = certification_type
                        existing.zoho_status = zoho_status
                        existing.date_of_purchase = date_of_purchase
                        if item_id:
                            existing.zoho_item_id = item_id
                        existing.save()
                        log_items.append(ImportLogItem(
                            import_log=import_log, row_number=row_num,
                            sku=sku or '', item_name=item_name,
                            status='imported', error_message='Updated existing product',
                        ))
                    else:
                        # Create new product
                        product = Product(
                            zoho_item_id=item_id or None,
                            item_name=item_name,
                            sku=sku,
                            description=description,
                            category=category,
                            selling_price=selling_price,
                            purchase_price=purchase_price,
                            inventory_status=inventory_status,
                            certification_type=certification_type,
                            zoho_status=zoho_status,
                            date_of_purchase=date_of_purchase,
                            uploaded_by=import_log.uploaded_by if hasattr(Product, 'uploaded_by') else None,
                            created_by=import_log.uploaded_by,
                        )
                        items_to_create.append(product)
                        log_items.append(ImportLogItem(
                            import_log=import_log, row_number=row_num,
                            sku=sku or '', item_name=item_name,
                            status='imported',
                        ))

                    imported_rows += 1

                except Exception as e:
                    error_count += 1
                    error_msg = str(e)
                    error_detail.append({'row': row_num, 'sku': sku, 'error': error_msg})
                    log_items.append(ImportLogItem(
                        import_log=import_log, row_number=row_num,
                        sku=sku or '', item_name=item_name,
                        status='error', error_message=error_msg,
                    ))

        # Bulk create new products
        if items_to_create:
            Product.objects.bulk_create(items_to_create, ignore_conflicts=True)

        # Bulk create log items
        if log_items:
            ImportLogItem.objects.bulk_create(log_items, batch_size=500)

        import_log.status = 'completed'
        import_log.imported_rows = imported_rows
        import_log.skipped_rows = skipped_rows
        import_log.error_count = error_count
        import_log.missing_sku_count = missing_sku_count
        import_log.duplicate_sku_count = duplicate_sku_count
        import_log.missing_cert_count = missing_cert_count
        import_log.invalid_price_count = invalid_price_count
        import_log.error_detail = error_detail
        import_log.completed_at = timezone.now()
        import_log.save()

        # Create audit log
        create_audit_log(
            user=import_log.uploaded_by,
            action='csv_import',
            entity_type='ImportLog',
            entity_id=str(import_log.id),
            new_value={
                'filename': import_log.filename,
                'total_rows': total_rows,
                'imported_rows': imported_rows,
                'error_count': error_count,
            },
        )

        logger.info(
            f"CSV import {import_log_id} completed: "
            f"{imported_rows}/{total_rows} imported, {error_count} errors"
        )

    except Exception as e:
        logger.exception(f"CSV import {import_log_id} failed: {e}")
        import_log.status = 'failed'
        import_log.error_detail = [{'error': str(e)}]
        import_log.completed_at = timezone.now()
        import_log.save()
        raise self.retry(exc=e, countdown=60)
