import io

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit_logs.utils import create_audit_log
from apps.leads.models import LeadActivity
from .models import Quotation, QuotationItem
from .serializers import QuotationCreateSerializer, QuotationItemSerializer, QuotationSerializer


class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.select_related(
        'customer', 'lead', 'created_by'
    ).prefetch_related('items__product').all()
    serializer_class = QuotationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'lead']
    search_fields = ['quotation_number', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['created_at', 'total', 'status']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return QuotationSerializer

    def perform_create(self, serializer):
        quotation = serializer.save()
        create_audit_log(
            user=self.request.user,
            action='quotation_created',
            entity_type='Quotation',
            entity_id=str(quotation.id),
            new_value={'quotation_number': quotation.quotation_number, 'total': str(quotation.total)},
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
        if quotation.lead:
            LeadActivity.objects.create(
                lead=quotation.lead,
                user=self.request.user,
                activity_type='quotation_sent',
                note=f'Quotation {quotation.quotation_number} created',
            )

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        quotation = self.get_object()
        quotation.status = 'sent'
        quotation.save()
        if quotation.lead:
            quotation.lead.stage = 'quotation_sent'
            quotation.lead.save()
            LeadActivity.objects.create(
                lead=quotation.lead,
                user=request.user,
                activity_type='quotation_sent',
                note=f'Quotation {quotation.quotation_number} sent to customer',
            )
        return Response(QuotationSerializer(quotation).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        quotation = self.get_object()
        quotation.status = 'accepted'
        quotation.save()
        return Response(QuotationSerializer(quotation).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        quotation = self.get_object()
        quotation.status = 'rejected'
        quotation.save()
        return Response(QuotationSerializer(quotation).data)

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        quotation = self.get_object()
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib import colors
            from django.http import HttpResponse

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []

            elements.append(Paragraph(f"QUOTATION - {quotation.quotation_number}", styles['Title']))
            elements.append(Spacer(1, 0.5 * cm))
            elements.append(Paragraph(f"Customer: {quotation.customer.full_name}", styles['Normal']))
            elements.append(Paragraph(f"Date: {quotation.created_at.strftime('%d %B %Y')}", styles['Normal']))
            if quotation.valid_until:
                elements.append(Paragraph(f"Valid Until: {quotation.valid_until}", styles['Normal']))
            elements.append(Spacer(1, 0.5 * cm))

            table_data = [['Item', 'SKU', 'Qty', 'Unit Price', 'Discount', 'Tax%', 'Total']]
            for item in quotation.items.all():
                table_data.append([
                    item.item_name, item.sku, str(item.quantity),
                    f"₹{item.unit_price:,.2f}", f"₹{item.discount:,.2f}",
                    f"{item.tax_rate}%", f"₹{item.total:,.2f}",
                ])

            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.beige, colors.white]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 0.5 * cm))
            elements.append(Paragraph(f"Subtotal: ₹{quotation.subtotal:,.2f}", styles['Normal']))
            elements.append(Paragraph(f"Discount: ₹{quotation.discount:,.2f}", styles['Normal']))
            elements.append(Paragraph(f"Tax: ₹{quotation.tax:,.2f}", styles['Normal']))
            elements.append(Paragraph(f"Total: ₹{quotation.total:,.2f}", styles['Heading2']))
            if quotation.notes:
                elements.append(Spacer(1, 0.5 * cm))
                elements.append(Paragraph(f"Notes: {quotation.notes}", styles['Normal']))

            doc.build(elements)
            buffer.seek(0)
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{quotation.quotation_number}.pdf"'
            return response

        except ImportError:
            return Response({'error': 'reportlab not installed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='attach_image', parser_classes=[MultiPartParser, FormParser])
    def attach_image(self, request, pk=None):
        quotation = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if quotation.attached_image:
            try:
                import os
                if quotation.attached_image.path and os.path.exists(quotation.attached_image.path):
                    os.remove(quotation.attached_image.path)
            except Exception:
                pass
        quotation.attached_image = image_file
        quotation.save()
        return Response(QuotationSerializer(quotation, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def convert_to_zoho_estimate(self, request, pk=None):
        quotation = self.get_object()
        try:
            from apps.zoho_integration.client import ZohoClient
            client = ZohoClient()

            line_items = []
            for item in quotation.items.all():
                line_items.append({
                    'name': item.item_name,
                    'description': item.sku or '',
                    'quantity': item.quantity,
                    'rate': float(item.unit_price),
                    'discount': float(item.discount),
                    'tax_percentage': float(item.tax_rate),
                })

            data = {
                'customer_id': quotation.customer.zoho_contact_id,
                'reference_number': quotation.quotation_number,
                'line_items': line_items,
                'notes': quotation.notes,
            }
            result = client.create_estimate(data)
            if result.get('estimate'):
                quotation.zoho_estimate_id = result['estimate']['estimate_id']
                quotation.save()
                return Response({'zoho_estimate_id': quotation.zoho_estimate_id})
            return Response({'error': 'Failed to create estimate in Zoho.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def convert_to_zoho_invoice(self, request, pk=None):
        quotation = self.get_object()
        try:
            from apps.zoho_integration.client import ZohoClient
            client = ZohoClient()

            line_items = []
            for item in quotation.items.all():
                line_items.append({
                    'name': item.item_name,
                    'description': item.sku or '',
                    'quantity': item.quantity,
                    'rate': float(item.unit_price),
                    'discount': float(item.discount),
                    'tax_percentage': float(item.tax_rate),
                })

            data = {
                'customer_id': quotation.customer.zoho_contact_id,
                'reference_number': quotation.quotation_number,
                'line_items': line_items,
                'notes': quotation.notes,
            }
            result = client.create_invoice(data)
            if result.get('invoice'):
                quotation.zoho_invoice_id = result['invoice']['invoice_id']
                quotation.status = 'converted'
                quotation.save()

                if quotation.lead:
                    quotation.lead.stage = 'invoice_created'
                    quotation.lead.save()
                    LeadActivity.objects.create(
                        lead=quotation.lead,
                        user=request.user,
                        activity_type='invoice_created',
                        note=f'Invoice created in Zoho: {quotation.zoho_invoice_id}',
                    )

                create_audit_log(
                    user=request.user,
                    action='invoice_created',
                    entity_type='Quotation',
                    entity_id=str(quotation.id),
                    new_value={'zoho_invoice_id': quotation.zoho_invoice_id},
                    ip_address=request.META.get('REMOTE_ADDR'),
                )
                return Response({'zoho_invoice_id': quotation.zoho_invoice_id})
            return Response({'error': 'Failed to create invoice in Zoho.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        quotation = self.get_object()
        data = request.data.copy()
        data['quotation'] = quotation.id
        serializer = QuotationItemSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        quotation.recalculate_totals()
        return Response(QuotationSerializer(quotation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='items/(?P<item_id>[^/.]+)')
    def remove_item(self, request, pk=None, item_id=None):
        quotation = self.get_object()
        QuotationItem.objects.filter(id=item_id, quotation=quotation).delete()
        quotation.recalculate_totals()
        return Response(QuotationSerializer(quotation).data)
