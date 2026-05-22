from rest_framework import serializers

from apps.customers.serializers import CustomerListSerializer
from .models import Quotation, QuotationItem


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = [
            'id', 'quotation', 'product', 'item_name', 'sku',
            'quantity', 'unit_price', 'discount', 'tax_rate', 'total',
        ]
        read_only_fields = ['id', 'total']


class QuotationSerializer(serializers.ModelSerializer):
    customer_detail = CustomerListSerializer(source='customer', read_only=True)
    items = QuotationItemSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    attached_image = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'customer', 'customer_detail', 'lead',
            'created_by', 'created_by_name', 'status', 'subtotal', 'discount',
            'tax', 'total', 'notes', 'zoho_estimate_id', 'zoho_invoice_id',
            'valid_until', 'attached_image', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'quotation_number', 'created_at', 'updated_at', 'created_by_name', 'attached_image']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None

    def get_attached_image(self, obj):
        if not obj.attached_image:
            return None
        url = obj.attached_image.url
        if url.startswith('http'):
            return url
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(url)
        from django.conf import settings
        api_url = getattr(settings, 'NEXT_PUBLIC_API_URL', 'http://localhost:8000')
        return f"{api_url.rstrip('/')}{url}"

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class QuotationCreateSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True)

    class Meta:
        model = Quotation
        fields = [
            'customer', 'lead', 'status', 'discount', 'tax', 'notes',
            'valid_until', 'items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        quotation = Quotation.objects.create(**validated_data)
        for item_data in items_data:
            QuotationItem.objects.create(quotation=quotation, **item_data)
        quotation.recalculate_totals()
        return quotation
