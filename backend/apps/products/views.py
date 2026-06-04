import os
import tempfile

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit_logs.utils import create_audit_log
from .models import ImportLog, Product, ProductCertificate, ProductImage
from .serializers import (
    ImportLogSerializer, ProductCertificateSerializer,
    ProductImageSerializer, ProductListSerializer, ProductSerializer,
)
from .tasks import process_csv_import


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('created_by').prefetch_related('images', 'certificates').all()
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'inventory_status', 'metal_type', 'metal_purity', 'certification_type', 'is_active']
    search_fields = ['item_name', 'sku', 'description', 'stone_type']
    ordering_fields = ['created_at', 'selling_price', 'item_name', 'inventory_status']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def perform_create(self, serializer):
        product = serializer.save(created_by=self.request.user)
        create_audit_log(
            user=self.request.user,
            action='product_status_changed',
            entity_type='Product',
            entity_id=str(product.id),
            new_value={'action': 'created', 'status': product.inventory_status},
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.inventory_status
        product = serializer.save()
        if old_status != product.inventory_status:
            create_audit_log(
                user=self.request.user,
                action='product_status_changed',
                entity_type='Product',
                entity_id=str(product.id),
                old_value={'inventory_status': old_status},
                new_value={'inventory_status': product.inventory_status},
                ip_address=self.request.META.get('REMOTE_ADDR'),
            )

    @action(detail=False, methods=['get'])
    def available(self, request):
        products = self.filter_queryset(
            self.get_queryset().filter(inventory_status='available', is_active=True)
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def reserved(self, request):
        products = self.filter_queryset(
            self.get_queryset().filter(inventory_status='reserved')
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sold(self, request):
        products = self.filter_queryset(
            self.get_queryset().filter(inventory_status='sold')
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def missing_sku(self, request):
        products = self.filter_queryset(
            self.get_queryset().filter(sku__isnull=True, is_active=True)
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def missing_certification(self, request):
        products = self.filter_queryset(
            self.get_queryset().filter(certification_type='none', is_active=True)
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post'])
    def reprice(self, request):
        """
        GET  → preview what prices would change (dry-run).
        POST → apply the new prices to all eligible products.

        Query/body params:
          making_pct  (float, default 0)  — making charges as % of metal cost
          gst_pct     (float, default 3)  — GST %
        """
        import decimal
        from django.core.cache import cache

        prices = cache.get('goldapi_prices_daily')
        if not prices:
            return Response(
                {'error': 'Live gold prices are not cached yet. They refresh every morning at 9 AM IST. '
                          'Try hitting the gold-prices endpoint first to seed the cache.'},
                status=503,
            )

        def _param(key, default):
            val = (request.data.get(key) if request.method == 'POST'
                   else request.query_params.get(key))
            try:
                return decimal.Decimal(str(val)) if val is not None else decimal.Decimal(str(default))
            except Exception:
                return decimal.Decimal(str(default))

        making_pct = _param('making_pct', 0)
        gst_pct    = _param('gst_pct', 3)

        PURITY_MAP = {
            '24k': ('gold',   '24k'),
            '22k': ('gold',   '22k'),
            '18k': ('gold',   '18k'),
            '14k': ('gold',   '14k'),
            '925': ('silver', '999'),
        }

        products = (
            Product.objects
            .filter(net_weight__isnull=False, metal_purity__in=PURITY_MAP.keys(), is_active=True)
            .exclude(inventory_status='sold')
            .values('id', 'item_name', 'sku', 'metal_purity', 'net_weight',
                    'selling_price', 'making_charges')
        )

        changes = []
        for p in products:
            metal, key = PURITY_MAP[p['metal_purity']]
            try:
                rate = decimal.Decimal(str(prices[metal]['per_gram'][key]))
            except (KeyError, TypeError):
                continue

            net_w      = decimal.Decimal(str(p['net_weight']))
            metal_cost = rate * net_w

            # Use product's stored making_charges (flat ₹) if set, else % of metal cost
            if p['making_charges']:
                making = decimal.Decimal(str(p['making_charges']))
            else:
                making = metal_cost * making_pct / 100

            pre_tax   = metal_cost + making
            gst_amt   = pre_tax * gst_pct / 100
            new_price = round(pre_tax + gst_amt, 2)

            changes.append({
                'id':           p['id'],
                'item_name':    p['item_name'],
                'sku':          p['sku'] or '—',
                'metal_purity': p['metal_purity'],
                'net_weight':   float(net_w),
                'rate':         float(rate),
                'old_price':    float(p['selling_price']) if p['selling_price'] else None,
                'new_price':    float(new_price),
            })

        if request.method == 'GET':
            return Response({
                'count':       len(changes),
                'making_pct':  float(making_pct),
                'gst_pct':     float(gst_pct),
                'changes':     changes,
            })

        # POST — apply
        ids_prices = {c['id']: c['new_price'] for c in changes}
        updated = 0
        for prod_id, new_price in ids_prices.items():
            Product.objects.filter(id=prod_id).update(selling_price=new_price)
            updated += 1

        return Response({
            'updated': updated,
            'message': f'{updated} product(s) repriced to today\'s live gold rates.',
        })

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV.'}, status=status.HTTP_400_BAD_REQUEST)

        # Save file temporarily
        media_dir = os.path.join('media', 'imports')
        os.makedirs(media_dir, exist_ok=True)
        file_path = os.path.join(media_dir, f"import_{csv_file.name}")
        with open(file_path, 'wb+') as f:
            for chunk in csv_file.chunks():
                f.write(chunk)

        import_log = ImportLog.objects.create(
            filename=csv_file.name,
            file_path=os.path.abspath(file_path),
            uploaded_by=request.user,
            status='pending',
        )

        process_csv_import.delay(import_log.id, os.path.abspath(file_path))

        return Response(
            {
                'import_log_id': import_log.id,
                'message': 'CSV import started. Check the import log for progress.',
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=['get'])
    def import_logs(self, request):
        logs = ImportLog.objects.all().order_by('-started_at')
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = ImportLogSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ImportLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='import-logs/(?P<log_id>[^/.]+)')
    def import_log_detail(self, request, log_id=None):
        try:
            log = ImportLog.objects.get(id=log_id)
        except ImportLog.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ImportLogSerializer(log).data)

    @action(detail=True, methods=['post'], url_path='images')
    def upload_image(self, request, pk=None):
        product = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Save image to media
        media_dir = os.path.join('media', 'products', str(product.id))
        os.makedirs(media_dir, exist_ok=True)
        file_path = os.path.join(media_dir, image_file.name)
        with open(file_path, 'wb+') as f:
            for chunk in image_file.chunks():
                f.write(chunk)

        is_primary = request.data.get('is_primary', 'false').lower() == 'true'
        if is_primary:
            product.images.update(is_primary=False)

        relative_url = f'/media/products/{product.id}/{image_file.name}'
        img = ProductImage.objects.create(
            product=product,
            file_url=request.build_absolute_uri(relative_url),
            file_name=image_file.name,
            file_type=image_file.content_type,
            is_primary=is_primary,
            uploaded_by=request.user,
        )
        return Response(ProductImageSerializer(img).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='certificates')
    def upload_certificate(self, request, pk=None):
        product = self.get_object()
        cert_file = request.FILES.get('certificate')
        if not cert_file:
            return Response({'error': 'No certificate provided.'}, status=status.HTTP_400_BAD_REQUEST)

        media_dir = os.path.join('media', 'certificates', str(product.id))
        os.makedirs(media_dir, exist_ok=True)
        file_path = os.path.join(media_dir, cert_file.name)
        with open(file_path, 'wb+') as f:
            for chunk in cert_file.chunks():
                f.write(chunk)

        relative_url = f'/media/certificates/{product.id}/{cert_file.name}'
        cert = ProductCertificate.objects.create(
            product=product,
            certificate_type=request.data.get('certificate_type', 'generic'),
            certificate_number=request.data.get('certificate_number', ''),
            file_url=request.build_absolute_uri(relative_url),
            file_name=cert_file.name,
            uploaded_by=request.user,
        )
        return Response(ProductCertificateSerializer(cert).data, status=status.HTTP_201_CREATED)
