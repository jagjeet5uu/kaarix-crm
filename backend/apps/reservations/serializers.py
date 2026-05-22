from rest_framework import serializers

from apps.customers.serializers import CustomerListSerializer
from apps.products.serializers import ProductListSerializer
from .models import ProductReservation


class ProductReservationSerializer(serializers.ModelSerializer):
    customer_detail = CustomerListSerializer(source='customer', read_only=True)
    product_detail = ProductListSerializer(source='product', read_only=True)
    reserved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReservation
        fields = [
            'id', 'product', 'product_detail', 'customer', 'customer_detail',
            'lead', 'reserved_by', 'reserved_by_name', 'reserved_at', 'reserved_until',
            'advance_amount', 'status', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reserved_at', 'created_at', 'updated_at', 'reserved_by_name']

    def get_reserved_by_name(self, obj):
        if obj.reserved_by:
            return obj.reserved_by.full_name
        return None

    def validate(self, attrs):
        product = attrs.get('product')
        if product and product.inventory_status != 'available':
            raise serializers.ValidationError(
                f"Product is not available. Current status: {product.inventory_status}"
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['reserved_by'] = request.user

        reservation = super().create(validated_data)

        # Set product status to reserved
        product = reservation.product
        product.inventory_status = 'reserved'
        product.save()

        # Update lead stage if lead is associated
        if reservation.lead:
            lead = reservation.lead
            lead.stage = 'reserved'
            lead.save()
            from apps.leads.models import LeadActivity
            LeadActivity.objects.create(
                lead=lead,
                user=request.user if request else None,
                activity_type='reservation_created',
                note=f'Product {product.item_name} reserved until {reservation.reserved_until}',
            )

        from apps.audit_logs.utils import create_audit_log
        create_audit_log(
            user=request.user if request else None,
            action='product_reserved',
            entity_type='ProductReservation',
            entity_id=str(reservation.id),
            new_value={
                'product_id': product.id,
                'product_name': product.item_name,
                'customer': reservation.customer.full_name,
                'reserved_until': str(reservation.reserved_until),
            },
        )

        return reservation
