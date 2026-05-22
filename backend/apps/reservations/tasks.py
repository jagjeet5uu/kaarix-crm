import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def expire_reservations():
    """Find all active reservations past their reserved_until time and expire them."""
    from apps.reservations.models import ProductReservation
    from apps.audit_logs.utils import create_audit_log

    now = timezone.now()
    expired = ProductReservation.objects.filter(
        status='active',
        reserved_until__lt=now,
    ).select_related('product')

    count = 0
    for reservation in expired:
        reservation.status = 'expired'
        reservation.save()

        # Free the product
        product = reservation.product
        if product.inventory_status == 'reserved':
            product.inventory_status = 'available'
            product.save()

        create_audit_log(
            user=None,
            action='reservation_cancelled',
            entity_type='ProductReservation',
            entity_id=str(reservation.id),
            old_value={'status': 'active'},
            new_value={
                'status': 'expired',
                'product_id': product.id,
                'product_name': product.item_name,
                'auto_expired': True,
            },
        )
        count += 1

    if count:
        logger.info(f"Auto-expired {count} reservations.")
    return count
