from django.db import models


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('product_status_changed', 'Product Status Changed'),
        ('product_reserved', 'Product Reserved'),
        ('reservation_cancelled', 'Reservation Cancelled'),
        ('product_sold', 'Product Sold'),
        ('quotation_created', 'Quotation Created'),
        ('invoice_created', 'Invoice Created in Zoho'),
        ('customer_updated', 'Customer Updated'),
        ('lead_stage_changed', 'Lead Stage Changed'),
        ('after_sales_status_changed', 'After Sales Status Changed'),
        ('sync_failed', 'Sync Failed'),
        ('sync_retried', 'Sync Retried'),
        ('user_login', 'User Login'),
        ('csv_import', 'CSV Import'),
    ]

    user = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=100)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']

    def __str__(self):
        user_str = self.user.username if self.user else 'System'
        return f"{user_str} - {self.action} on {self.entity_type} #{self.entity_id}"
