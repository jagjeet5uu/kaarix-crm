from django.db import models


class ZohoToken(models.Model):
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_type = models.CharField(max_length=50, default='Bearer')
    expires_at = models.DateTimeField()
    organization_id = models.CharField(max_length=100)
    api_domain = models.CharField(max_length=200, default='https://www.zohoapis.in')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Zoho Token'
        verbose_name_plural = 'Zoho Tokens'

    def __str__(self):
        return f"ZohoToken (org: {self.organization_id}, expires: {self.expires_at})"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() >= self.expires_at


class ZohoSyncLog(models.Model):
    MODULE_CHOICES = [
        ('items', 'Items'), ('contacts', 'Contacts'), ('invoices', 'Invoices'),
        ('payments', 'Payments'), ('estimates', 'Estimates'),
    ]
    DIRECTION_CHOICES = [('zoho_to_crm', 'Zoho to CRM'), ('crm_to_zoho', 'CRM to Zoho')]
    STATUS_CHOICES = [
        ('pending', 'Pending'), ('success', 'Success'), ('failed', 'Failed'), ('retrying', 'Retrying'),
    ]

    module = models.CharField(max_length=30, choices=MODULE_CHOICES)
    zoho_id = models.CharField(max_length=100, blank=True)
    local_id = models.CharField(max_length=100, blank=True)
    direction = models.CharField(max_length=20, choices=DIRECTION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    request_payload = models.JSONField(null=True, blank=True)
    response_payload = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Zoho Sync Log'
        verbose_name_plural = 'Zoho Sync Logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Sync: {self.module} {self.direction} ({self.status})"


class WebhookLog(models.Model):
    source = models.CharField(max_length=50, default='zoho')
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    status = models.CharField(max_length=20, default='received')
    error_message = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Webhook Log'
        verbose_name_plural = 'Webhook Logs'
        ordering = ['-received_at']

    def __str__(self):
        return f"Webhook: {self.source} {self.event_type} ({self.status})"
