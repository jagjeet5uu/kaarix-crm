from rest_framework import serializers

from apps.customers.serializers import CustomerListSerializer
from .models import AfterSalesImage, AfterSalesRequest


class AfterSalesImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AfterSalesImage
        fields = ['id', 'after_sales_request', 'image_type', 'file_url', 'file_name', 'gcs_path', 'created_at']
        read_only_fields = ['id', 'created_at']


class AfterSalesRequestSerializer(serializers.ModelSerializer):
    customer_detail = CustomerListSerializer(source='customer', read_only=True)
    assigned_staff_name = serializers.SerializerMethodField()
    images = AfterSalesImageSerializer(many=True, read_only=True)
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = AfterSalesRequest
        fields = [
            'id', 'customer', 'customer_detail', 'product', 'product_name',
            'invoice_reference', 'request_type', 'received_date',
            'expected_delivery_date', 'delivered_date', 'status',
            'assigned_staff', 'assigned_staff_name', 'cost', 'notes',
            'images', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_staff_name', 'product_name', 'created_by']

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            return obj.assigned_staff.full_name
        return None

    def get_product_name(self, obj):
        if obj.product:
            return obj.product.item_name
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class AfterSalesRequestListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = AfterSalesRequest
        fields = [
            'id', 'customer', 'customer_name', 'request_type',
            'received_date', 'status', 'assigned_staff', 'created_at',
        ]

    def get_customer_name(self, obj):
        return obj.customer.full_name
