from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'entity_type', 'entity_id', 'ip_address', 'created_at']
    list_filter = ['action', 'entity_type']
    search_fields = ['user__username', 'entity_id', 'action']
    readonly_fields = ['user', 'action', 'entity_type', 'entity_id', 'old_value', 'new_value', 'ip_address', 'created_at']
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
