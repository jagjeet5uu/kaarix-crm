from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'entity_type', 'entity_id',
            'old_value', 'new_value', 'ip_address', 'created_at',
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name
        return 'System'
