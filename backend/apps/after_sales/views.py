import os

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit_logs.utils import create_audit_log
from .models import AfterSalesImage, AfterSalesRequest
from .serializers import (
    AfterSalesImageSerializer, AfterSalesRequestListSerializer, AfterSalesRequestSerializer,
)


class AfterSalesRequestViewSet(viewsets.ModelViewSet):
    queryset = AfterSalesRequest.objects.select_related(
        'customer', 'product', 'assigned_staff', 'created_by'
    ).prefetch_related('images').all()
    serializer_class = AfterSalesRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'request_type', 'customer', 'assigned_staff']
    search_fields = ['customer__first_name', 'customer__last_name', 'invoice_reference', 'notes']
    ordering_fields = ['created_at', 'received_date', 'status']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return AfterSalesRequestListSerializer
        return AfterSalesRequestSerializer

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        create_audit_log(
            user=self.request.user,
            action='after_sales_status_changed',
            entity_type='AfterSalesRequest',
            entity_id=str(instance.id),
            new_value={'action': 'created', 'status': instance.status, 'type': instance.request_type},
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()
        if old_status != instance.status:
            create_audit_log(
                user=self.request.user,
                action='after_sales_status_changed',
                entity_type='AfterSalesRequest',
                entity_id=str(instance.id),
                old_value={'status': old_status},
                new_value={'status': instance.status},
                ip_address=self.request.META.get('REMOTE_ADDR'),
            )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        instance = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status is required.'}, status=status.HTTP_400_BAD_REQUEST)
        valid_statuses = [s[0] for s in AfterSalesRequest.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Valid: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_status = instance.status
        instance.status = new_status
        if new_status == 'delivered':
            from django.utils import timezone
            instance.delivered_date = timezone.now().date()
        instance.save()

        create_audit_log(
            user=request.user,
            action='after_sales_status_changed',
            entity_type='AfterSalesRequest',
            entity_id=str(instance.id),
            old_value={'status': old_status},
            new_value={'status': new_status},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(AfterSalesRequestSerializer(instance).data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        instance = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

        image_type = request.data.get('image_type', 'before')
        media_dir = os.path.join('media', 'after_sales', str(instance.id))
        os.makedirs(media_dir, exist_ok=True)
        file_path = os.path.join(media_dir, image_file.name)
        with open(file_path, 'wb+') as f:
            for chunk in image_file.chunks():
                f.write(chunk)

        img = AfterSalesImage.objects.create(
            after_sales_request=instance,
            image_type=image_type,
            file_url=f'/media/after_sales/{instance.id}/{image_file.name}',
            file_name=image_file.name,
            uploaded_by=request.user,
        )
        return Response(AfterSalesImageSerializer(img).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def in_progress(self, request):
        instances = self.filter_queryset(
            self.get_queryset().filter(status__in=['received', 'inspection', 'in_progress'])
        )
        page = self.paginate_queryset(instances)
        if page is not None:
            serializer = AfterSalesRequestListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(AfterSalesRequestListSerializer(instances, many=True).data)

    @action(detail=False, methods=['get'])
    def ready_for_delivery(self, request):
        instances = self.filter_queryset(
            self.get_queryset().filter(status='ready')
        )
        page = self.paginate_queryset(instances)
        if page is not None:
            serializer = AfterSalesRequestListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(AfterSalesRequestListSerializer(instances, many=True).data)
