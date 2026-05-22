from rest_framework import serializers
from .models import (
    SalesInvoice, SalesInvoiceItem,
    CustomerPayment, VendorPayment,
    VendorCredit, SalesQuote, SalesQuoteItem,
    SalesOrder, JournalEntry, Deposit, ChartOfAccount,
)


class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesInvoiceItem
        fields = ['id', 'item_name', 'sku', 'description', 'quantity', 'unit_price', 'discount', 'item_total', 'hsn_sac']
        read_only_fields = ['id']


class SalesInvoiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesInvoice
        fields = ['id', 'invoice_number', 'customer_name', 'invoice_date', 'due_date', 'status', 'total', 'balance']


class SalesInvoiceSerializer(serializers.ModelSerializer):
    items = SalesInvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = SalesInvoice
        fields = [
            'id', 'invoice_number', 'zoho_invoice_id', 'customer_name',
            'invoice_date', 'due_date', 'status', 'subtotal', 'total', 'balance',
            'salesperson', 'notes', 'items', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'items']


class CustomerPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPayment
        fields = [
            'id', 'payment_number', 'zoho_payment_id', 'customer_name',
            'payment_date', 'mode', 'amount', 'unused_amount',
            'reference_number', 'invoice_number', 'deposit_to', 'description', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class VendorPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorPayment
        fields = [
            'id', 'payment_number', 'zoho_payment_id', 'vendor_name',
            'payment_date', 'mode', 'amount',
            'reference_number', 'bill_number', 'paid_through', 'description', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class VendorCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCredit
        fields = [
            'id', 'credit_number', 'zoho_credit_id', 'vendor_name',
            'credit_date', 'status', 'subtotal', 'total', 'balance',
            'notes', 'associated_bill_number', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SalesQuoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesQuoteItem
        fields = ['id', 'item_name', 'sku', 'quantity', 'unit_price', 'item_total']
        read_only_fields = ['id']


class SalesQuoteSerializer(serializers.ModelSerializer):
    items = SalesQuoteItemSerializer(many=True, read_only=True)

    class Meta:
        model = SalesQuote
        fields = [
            'id', 'quote_number', 'zoho_quote_id', 'customer_name',
            'quote_date', 'expiry_date', 'status', 'subtotal', 'total',
            'salesperson', 'notes', 'items', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'items']


class SalesOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrder
        fields = [
            'id', 'order_number', 'zoho_order_id', 'customer_name',
            'order_date', 'expected_shipment_date', 'status',
            'subtotal', 'total', 'salesperson', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = [
            'id', 'journal_number', 'zoho_journal_id', 'journal_date',
            'journal_type', 'status', 'reference_number', 'notes',
            'total', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = [
            'id', 'transaction_date', 'transaction_type', 'from_account',
            'to_account', 'reference', 'description', 'payment_mode',
            'subtotal', 'total', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ChartOfAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccount
        fields = [
            'id', 'account_id', 'account_name', 'account_code',
            'description', 'account_type', 'account_status',
            'currency', 'parent_account',
        ]
        read_only_fields = ['id']
