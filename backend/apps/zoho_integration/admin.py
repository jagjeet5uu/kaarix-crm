from django.contrib import admin

from .models import WebhookLog, ZohoSyncLog, ZohoToken


@admin.register(ZohoToken)
class ZohoTokenAdmin(admin.ModelAdmin):
    list_display = ['organization_id', 'token_type', 'expires_at', 'is_expired', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']

    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True


@admin.register(ZohoSyncLog)
class ZohoSyncLogAdmin(admin.ModelAdmin):
    list_display = ['module', 'direction', 'status', 'zoho_id', 'local_id', 'retry_count', 'created_at']
    list_filter = ['module', 'direction', 'status']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = ['source', 'event_type', 'status', 'received_at', 'processed_at']
    list_filter = ['source', 'status']
    readonly_fields = ['received_at', 'processed_at']
    ordering = ['-received_at']
