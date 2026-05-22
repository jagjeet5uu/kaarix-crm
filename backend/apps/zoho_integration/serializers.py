from rest_framework import serializers

from .models import WebhookLog, ZohoSyncLog, ZohoToken


class ZohoTokenSerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = ZohoToken
        fields = ['id', 'token_type', 'expires_at', 'organization_id', 'api_domain', 'is_expired', 'updated_at']
        read_only_fields = fields

    def get_is_expired(self, obj):
        return obj.is_expired


class ZohoSyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZohoSyncLog
        fields = [
            'id', 'module', 'zoho_id', 'local_id', 'direction', 'status',
            'request_payload', 'response_payload', 'error_message', 'retry_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class WebhookLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookLog
        fields = [
            'id', 'source', 'event_type', 'payload', 'status',
            'error_message', 'received_at', 'processed_at',
        ]
        read_only_fields = fields
