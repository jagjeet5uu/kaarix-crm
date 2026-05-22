from rest_framework import serializers

from apps.customers.serializers import CustomerListSerializer
from .models import Lead, LeadActivity, LeadProduct, Task


class LeadActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadActivity
        fields = ['id', 'lead', 'user', 'user_name', 'activity_type', 'note', 'created_at']
        read_only_fields = ['id', 'created_at', 'user_name']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name
        return None


class LeadProductSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()

    class Meta:
        model = LeadProduct
        fields = ['id', 'lead', 'product', 'product_name', 'product_sku', 'added_at']
        read_only_fields = ['id', 'added_at', 'product_name', 'product_sku']

    def get_product_name(self, obj):
        return obj.product.item_name if obj.product else None

    def get_product_sku(self, obj):
        return obj.product.sku if obj.product else None


class LeadSerializer(serializers.ModelSerializer):
    customer_detail = CustomerListSerializer(source='customer', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    activities_count = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'customer', 'customer_detail', 'assigned_to', 'assigned_to_name',
            'source', 'stage', 'interested_category', 'budget_min', 'budget_max',
            'occasion', 'required_date', 'follow_up_date', 'notes', 'lost_reason',
            'created_by', 'activities_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_to_name', 'activities_count']

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None

    def get_activities_count(self, obj):
        return obj.activities.count()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class LeadDetailSerializer(LeadSerializer):
    activities = LeadActivitySerializer(many=True, read_only=True)
    shortlisted_products = LeadProductSerializer(many=True, read_only=True)

    class Meta(LeadSerializer.Meta):
        fields = LeadSerializer.Meta.fields + ['activities', 'shortlisted_products']


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    lead_info = serializers.SerializerMethodField()
    customer_info = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'lead', 'lead_info', 'customer', 'customer_info',
            'assigned_to', 'assigned_to_name', 'title', 'description',
            'due_date', 'status', 'priority', 'completion_note', 'completed_at',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None

    def get_lead_info(self, obj):
        if obj.lead:
            return {'id': obj.lead.id, 'stage': obj.lead.stage}
        return None

    def get_customer_info(self, obj):
        if obj.customer:
            return {'id': obj.customer.id, 'name': obj.customer.full_name}
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)
