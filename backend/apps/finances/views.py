from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    SalesInvoice, CustomerPayment, VendorPayment,
    VendorCredit, SalesQuote, SalesOrder,
    JournalEntry, Deposit, ChartOfAccount,
)
from .serializers import (
    SalesInvoiceSerializer, SalesInvoiceListSerializer,
    CustomerPaymentSerializer, VendorPaymentSerializer,
    VendorCreditSerializer, SalesQuoteSerializer,
    SalesOrderSerializer, JournalEntrySerializer,
    DepositSerializer, ChartOfAccountSerializer,
)


class SalesInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SalesInvoice.objects.prefetch_related('items').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'customer_name', 'salesperson']
    filterset_fields = ['status']
    ordering_fields = ['invoice_date', 'due_date', 'total', 'balance', 'created_at']
    ordering = ['-invoice_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return SalesInvoiceListSerializer
        return SalesInvoiceSerializer


class CustomerPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = CustomerPayment.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['payment_number', 'customer_name', 'invoice_number', 'reference_number']
    filterset_fields = ['mode']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']
    serializer_class = CustomerPaymentSerializer


class VendorPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = VendorPayment.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['payment_number', 'vendor_name', 'bill_number', 'reference_number']
    filterset_fields = ['mode']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']
    serializer_class = VendorPaymentSerializer


class VendorCreditViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = VendorCredit.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['credit_number', 'vendor_name', 'associated_bill_number']
    filterset_fields = ['status']
    ordering_fields = ['credit_date', 'total', 'balance', 'created_at']
    ordering = ['-credit_date']
    serializer_class = VendorCreditSerializer


class SalesQuoteViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SalesQuote.objects.prefetch_related('items').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['quote_number', 'customer_name']
    filterset_fields = ['status']
    ordering_fields = ['quote_date', 'total', 'created_at']
    ordering = ['-quote_date']
    serializer_class = SalesQuoteSerializer


class SalesOrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SalesOrder.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['order_number', 'customer_name']
    filterset_fields = ['status']
    ordering_fields = ['order_date', 'total', 'created_at']
    ordering = ['-order_date']
    serializer_class = SalesOrderSerializer


class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = JournalEntry.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['journal_number', 'reference_number', 'notes']
    filterset_fields = ['status', 'journal_type']
    ordering_fields = ['journal_date', 'total', 'created_at']
    ordering = ['-journal_date']
    serializer_class = JournalEntrySerializer


class DepositViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Deposit.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['from_account', 'to_account', 'reference', 'description']
    filterset_fields = ['transaction_type', 'payment_mode']
    ordering_fields = ['transaction_date', 'total', 'created_at']
    ordering = ['-transaction_date']
    serializer_class = DepositSerializer


class ChartOfAccountViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = ChartOfAccount.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['account_name', 'account_code', 'description']
    filterset_fields = ['account_type', 'account_status']
    ordering = ['account_type', 'account_name']
    serializer_class = ChartOfAccountSerializer
