from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Vendor, Expense, Bill
from .serializers import (
    VendorSerializer, VendorListSerializer,
    ExpenseSerializer,
    BillSerializer, BillListSerializer,
)


class VendorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Vendor.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'company_name']
    filterset_fields = ['is_active']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return VendorListSerializer
        return VendorSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Expense.objects.select_related('vendor').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['entry_number', 'description', 'account', 'vendor__name']
    filterset_fields = ['vendor', 'is_billable']
    ordering_fields = ['expense_date', 'total', 'created_at']
    ordering = ['-expense_date']
    serializer_class = ExpenseSerializer


class BillViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Bill.objects.select_related('vendor').prefetch_related('items').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['bill_number', 'vendor_name']
    filterset_fields = ['vendor', 'status']
    ordering_fields = ['bill_date', 'due_date', 'total', 'created_at']
    ordering = ['-bill_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return BillListSerializer
        return BillSerializer
