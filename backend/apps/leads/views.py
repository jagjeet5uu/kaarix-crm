from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit_logs.utils import create_audit_log
from .models import Lead, LeadActivity, LeadProduct, Task
from .serializers import (
    LeadActivitySerializer, LeadDetailSerializer,
    LeadProductSerializer, LeadSerializer, TaskSerializer,
)


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related(
        'customer', 'assigned_to', 'created_by'
    ).prefetch_related('activities', 'shortlisted_products').all()
    serializer_class = LeadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['stage', 'source', 'assigned_to', 'customer']
    search_fields = ['customer__first_name', 'customer__last_name', 'customer__mobile', 'notes']
    ordering_fields = ['created_at', 'updated_at', 'follow_up_date', 'stage']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LeadDetailSerializer
        return LeadSerializer

    def perform_create(self, serializer):
        lead = serializer.save(created_by=self.request.user)
        LeadActivity.objects.create(
            lead=lead,
            user=self.request.user,
            activity_type='note',
            note='Lead created',
        )
        create_audit_log(
            user=self.request.user,
            action='lead_stage_changed',
            entity_type='Lead',
            entity_id=str(lead.id),
            new_value={'stage': lead.stage, 'action': 'created'},
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_update(self, serializer):
        old_stage = self.get_object().stage
        lead = serializer.save()
        if old_stage != lead.stage:
            LeadActivity.objects.create(
                lead=lead,
                user=self.request.user,
                activity_type='note',
                note=f'Stage changed from {old_stage} to {lead.stage}',
            )
            create_audit_log(
                user=self.request.user,
                action='lead_stage_changed',
                entity_type='Lead',
                entity_id=str(lead.id),
                old_value={'stage': old_stage},
                new_value={'stage': lead.stage},
                ip_address=self.request.META.get('REMOTE_ADDR'),
            )

    @action(detail=True, methods=['post'])
    def close_won(self, request, pk=None):
        lead = self.get_object()
        old_stage = lead.stage
        lead.stage = 'closed_won'
        lead.save()
        LeadActivity.objects.create(
            lead=lead, user=request.user, activity_type='note', note='Lead closed as Won',
        )
        create_audit_log(
            user=request.user, action='lead_stage_changed', entity_type='Lead',
            entity_id=str(lead.id), old_value={'stage': old_stage},
            new_value={'stage': 'closed_won'}, ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(LeadSerializer(lead).data)

    @action(detail=True, methods=['post'])
    def close_lost(self, request, pk=None):
        lead = self.get_object()
        lost_reason = request.data.get('lost_reason', '')
        old_stage = lead.stage
        lead.stage = 'closed_lost'
        lead.lost_reason = lost_reason
        lead.save()
        LeadActivity.objects.create(
            lead=lead, user=request.user, activity_type='lost_reason_added',
            note=f'Lead closed as Lost. Reason: {lost_reason}',
        )
        create_audit_log(
            user=request.user, action='lead_stage_changed', entity_type='Lead',
            entity_id=str(lead.id), old_value={'stage': old_stage},
            new_value={'stage': 'closed_lost', 'lost_reason': lost_reason},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(LeadSerializer(lead).data)

    @action(detail=True, methods=['get', 'post'])
    def activities(self, request, pk=None):
        lead = self.get_object()
        if request.method == 'GET':
            activities = lead.activities.all().order_by('-created_at')
            serializer = LeadActivitySerializer(activities, many=True)
            return Response(serializer.data)
        else:
            data = request.data.copy()
            data['lead'] = lead.id
            serializer = LeadActivitySerializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def shortlist_product(self, request, pk=None):
        lead = self.get_object()
        if request.method == 'GET':
            products = lead.shortlisted_products.all()
            serializer = LeadProductSerializer(products, many=True)
            return Response(serializer.data)
        else:
            product_id = request.data.get('product_id')
            if not product_id:
                return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            lp, created = LeadProduct.objects.get_or_create(lead=lead, product_id=product_id)
            if created:
                lead.stage = 'shortlisted'
                lead.save()
                LeadActivity.objects.create(
                    lead=lead, user=request.user, activity_type='product_shared',
                    note=f'Product ID {product_id} shortlisted',
                )
            return Response(LeadProductSerializer(lp).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='shortlist_product/(?P<product_id>[^/.]+)')
    def remove_shortlisted_product(self, request, pk=None, product_id=None):
        lead = self.get_object()
        LeadProduct.objects.filter(lead=lead, product_id=product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def change_stage(self, request, pk=None):
        lead = self.get_object()
        new_stage = request.data.get('stage')
        if not new_stage:
            return Response({'error': 'stage is required'}, status=status.HTTP_400_BAD_REQUEST)
        valid_stages = [s[0] for s in Lead.STAGES]
        if new_stage not in valid_stages:
            return Response({'error': f'Invalid stage. Valid: {valid_stages}'}, status=status.HTTP_400_BAD_REQUEST)
        old_stage = lead.stage
        lead.stage = new_stage
        lead.save()
        LeadActivity.objects.create(
            lead=lead, user=request.user, activity_type='note',
            note=f'Stage changed from {old_stage} to {new_stage}',
        )
        create_audit_log(
            user=request.user, action='lead_stage_changed', entity_type='Lead',
            entity_id=str(lead.id), old_value={'stage': old_stage},
            new_value={'stage': new_stage}, ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(LeadSerializer(lead).data)

    @action(detail=False, methods=['get'])
    def follow_ups_today(self, request):
        today = timezone.now().date()
        leads = Lead.objects.filter(
            follow_up_date=today
        ).exclude(stage__in=['closed_won', 'closed_lost'])
        if request.user.role not in ('admin', 'sales_manager'):
            leads = leads.filter(assigned_to=request.user)
        serializer = LeadSerializer(leads, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue_follow_ups(self, request):
        today = timezone.now().date()
        leads = Lead.objects.filter(
            follow_up_date__lt=today
        ).exclude(stage__in=['closed_won', 'closed_lost'])
        if request.user.role not in ('admin', 'sales_manager'):
            leads = leads.filter(assigned_to=request.user)
        serializer = LeadSerializer(leads, many=True)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related('lead', 'customer', 'assigned_to', 'created_by').all()
    serializer_class = TaskSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'assigned_to', 'lead', 'customer']
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'created_at']
    ordering = ['due_date']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role not in ('admin', 'sales_manager'):
            qs = qs.filter(assigned_to=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        completion_note = request.data.get('completion_note', '')
        task.status = 'completed'
        task.completion_note = completion_note
        task.completed_at = timezone.now()
        task.save()
        return Response(TaskSerializer(task).data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        today = timezone.now().date()
        tasks = self.get_queryset().filter(due_date__lt=today, status='pending')
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
