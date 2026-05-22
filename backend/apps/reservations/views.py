from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit_logs.utils import create_audit_log
from .models import ProductReservation
from .serializers import ProductReservationSerializer


class ProductReservationViewSet(viewsets.ModelViewSet):
    queryset = ProductReservation.objects.select_related(
        'product', 'customer', 'lead', 'reserved_by'
    ).all()
    serializer_class = ProductReservationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'product', 'lead']
    search_fields = ['customer__first_name', 'customer__last_name', 'product__item_name', 'product__sku']
    ordering_fields = ['created_at', 'reserved_until']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status not in ('active',):
            return Response(
                {'error': f'Cannot cancel reservation with status: {reservation.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reservation.status = 'cancelled'
        reservation.save()

        # Free the product
        product = reservation.product
        product.inventory_status = 'available'
        product.save()

        create_audit_log(
            user=request.user,
            action='reservation_cancelled',
            entity_type='ProductReservation',
            entity_id=str(reservation.id),
            new_value={'status': 'cancelled', 'product_id': product.id},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(ProductReservationSerializer(reservation).data)

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status != 'active':
            return Response(
                {'error': 'Can only extend active reservations.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_until = request.data.get('reserved_until')
        if not new_until:
            return Response({'error': 'reserved_until is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from dateutil.parser import parse as parse_dt
            reservation.reserved_until = parse_dt(new_until)
            reservation.save()
        except Exception as e:
            return Response({'error': f'Invalid date format: {e}'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductReservationSerializer(reservation).data)

    @action(detail=True, methods=['post'])
    def convert_to_sale(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status != 'active':
            return Response(
                {'error': 'Can only convert active reservations.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reservation.status = 'converted_to_sale'
        reservation.save()

        # Mark product as sold
        product = reservation.product
        product.inventory_status = 'sold'
        product.save()

        # Update lead stage
        if reservation.lead:
            lead = reservation.lead
            lead.stage = 'invoice_created'
            lead.save()

        create_audit_log(
            user=request.user,
            action='product_sold',
            entity_type='ProductReservation',
            entity_id=str(reservation.id),
            new_value={
                'status': 'converted_to_sale',
                'product_id': product.id,
                'product_name': product.item_name,
            },
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(ProductReservationSerializer(reservation).data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Reservations expiring within 24 hours."""
        from datetime import timedelta
        deadline = timezone.now() + timedelta(hours=24)
        reservations = self.get_queryset().filter(
            status='active', reserved_until__lte=deadline
        )
        serializer = ProductReservationSerializer(reservations, many=True)
        return Response(serializer.data)
