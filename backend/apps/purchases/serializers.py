from rest_framework import serializers

from .models import Vendor, Expense, Bill, BillItem


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'id', 'zoho_contact_id', 'name', 'company_name', 'email',
            'phone', 'mobile', 'city', 'address', 'gstin', 'notes',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VendorListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'company_name', 'email', 'phone', 'mobile', 'city', 'is_active']


class ExpenseSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'entry_number', 'expense_date', 'description', 'account',
            'vendor', 'vendor_name', 'amount', 'tax_amount', 'total',
            'reference', 'is_billable', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'vendor_name']

    def get_vendor_name(self, obj):
        if obj.vendor:
            return obj.vendor.name
        return None


class BillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillItem
        fields = ['id', 'item_name', 'sku', 'description', 'quantity', 'rate', 'total']
        read_only_fields = ['id']


class BillSerializer(serializers.ModelSerializer):
    items = BillItemSerializer(many=True, read_only=True)

    class Meta:
        model = Bill
        fields = [
            'id', 'bill_number', 'zoho_bill_id', 'vendor', 'vendor_name',
            'bill_date', 'due_date', 'status', 'subtotal', 'tax', 'total',
            'balance', 'notes', 'items', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'items']


class BillListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = [
            'id', 'bill_number', 'vendor_name', 'bill_date', 'due_date',
            'status', 'total', 'balance',
        ]
