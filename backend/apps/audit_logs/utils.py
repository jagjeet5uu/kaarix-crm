import logging

logger = logging.getLogger(__name__)


def create_audit_log(
    user,
    action,
    entity_type,
    entity_id,
    old_value=None,
    new_value=None,
    ip_address=None,
):
    """
    Utility to create an AuditLog entry.

    Args:
        user: accounts.User instance or None
        action: str - one of AuditLog.ACTION_CHOICES keys
        entity_type: str - e.g. 'Product', 'Lead', 'Customer'
        entity_id: str - PK of the entity
        old_value: dict or None
        new_value: dict or None
        ip_address: str or None
    """
    try:
        from apps.audit_logs.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
        )
    except Exception as e:
        # Audit log failure should never break the main operation
        logger.warning(f"Failed to create audit log: {e}")
