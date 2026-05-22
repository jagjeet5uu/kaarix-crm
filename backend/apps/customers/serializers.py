from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'zoho_contact_id', 'first_name', 'last_name', 'full_name',
            'mobile', 'email', 'city', 'address', 'customer_type', 'lead_source',
            'birthday', 'anniversary', 'preferred_category', 'preferred_metal',
            'preferred_budget_min', 'preferred_budget_max', 'ring_size', 'bracelet_size',
            'notes', 'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name', 'created_by_name']

    def get_full_name(self, obj):
        return obj.full_name

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class CustomerListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'mobile', 'email', 'city', 'customer_type', 'created_at']

    def get_full_name(self, obj):
        return obj.full_name
