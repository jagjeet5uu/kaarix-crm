from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit_logs.utils import create_audit_log
from .models import Customer
from .serializers import CustomerSerializer, CustomerListSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related('created_by').all()
    serializer_class = CustomerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer_type', 'lead_source', 'city', 'preferred_metal']
    search_fields = ['first_name', 'last_name', 'mobile', 'email', 'city']
    ordering_fields = ['created_at', 'first_name', 'last_name', 'mobile']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerSerializer

    def perform_create(self, serializer):
        customer = serializer.save(created_by=self.request.user)
        create_audit_log(
            user=self.request.user,
            action='customer_updated',
            entity_type='Customer',
            entity_id=str(customer.id),
            new_value={'action': 'created', 'name': customer.full_name},
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = CustomerSerializer(old_instance).data
        customer = serializer.save()
        create_audit_log(
            user=self.request.user,
            action='customer_updated',
            entity_type='Customer',
            entity_id=str(customer.id),
            old_value=old_data,
            new_value=CustomerSerializer(customer).data,
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    @action(detail=True, methods=['get'])
    def leads(self, request, pk=None):
        customer = self.get_object()
        from apps.leads.serializers import LeadSerializer
        leads = customer.leads.all().order_by('-created_at')
        serializer = LeadSerializer(leads, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def reservations(self, request, pk=None):
        customer = self.get_object()
        from apps.reservations.serializers import ProductReservationSerializer
        reservations = customer.reservations.all().order_by('-created_at')
        serializer = ProductReservationSerializer(reservations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def quotations(self, request, pk=None):
        customer = self.get_object()
        from apps.quotations.serializers import QuotationSerializer
        quotations = customer.quotations.all().order_by('-created_at')
        serializer = QuotationSerializer(quotations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def after_sales(self, request, pk=None):
        customer = self.get_object()
        from apps.after_sales.serializers import AfterSalesRequestSerializer
        requests_qs = customer.after_sales_requests.all().order_by('-created_at')
        serializer = AfterSalesRequestSerializer(requests_qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def birthday_today(self, request):
        from django.utils import timezone
        today = timezone.now().date()
        customers = Customer.objects.filter(birthday__month=today.month, birthday__day=today.day)
        serializer = CustomerListSerializer(customers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def anniversary_today(self, request):
        from django.utils import timezone
        today = timezone.now().date()
        customers = Customer.objects.filter(anniversary__month=today.month, anniversary__day=today.day)
        serializer = CustomerListSerializer(customers, many=True)
        return Response(serializer.data)
