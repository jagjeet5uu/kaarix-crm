from rest_framework import serializers

from .models import ImportLog, ImportLogItem, Product, ProductCertificate, ProductImage


def _make_absolute_url(url, context):
    if not url:
        return None
    if url.startswith('http'):
        return url
    request = context.get('request') if context else None
    if request:
        return request.build_absolute_uri(url)
    from django.conf import settings
    api_url = getattr(settings, 'NEXT_PUBLIC_API_URL', 'http://localhost:8000')
    return f"{api_url.rstrip('/')}{url}"


class ProductImageSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'file_url', 'file_name', 'file_type', 'is_primary', 'gcs_path', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_file_url(self, obj):
        return _make_absolute_url(obj.file_url, self.context)


class ProductCertificateSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductCertificate
        fields = ['id', 'product', 'certificate_type', 'certificate_number', 'file_url', 'file_name', 'gcs_path', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_file_url(self, obj):
        return _make_absolute_url(obj.file_url, self.context)


class ProductSerializer(serializers.ModelSerializer):
    margin = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    certificates = ProductCertificateSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'zoho_item_id', 'item_name', 'sku', 'description',
            'category', 'subcategory', 'selling_price', 'purchase_price',
            'gross_weight', 'net_weight', 'diamond_weight',
            'metal_type', 'metal_purity', 'stone_type',
            'certification_type', 'certification_number',
            'inventory_status', 'zoho_status', 'date_of_purchase',
            'hsn_code', 'making_charges', 'is_active',
            'margin', 'images', 'certificates', 'primary_image',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'margin', 'primary_image']

    def get_margin(self, obj):
        return obj.margin

    def _make_absolute(self, url):
        if not url:
            return None
        if url.startswith('http'):
            return url
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(url)
        from django.conf import settings
        api_url = getattr(settings, 'NEXT_PUBLIC_API_URL', 'http://localhost:8000')
        return f"{api_url.rstrip('/')}{url}"

    def get_primary_image(self, obj):
        # Use prefetched cache — never hit DB per-product
        images = obj.images.all()
        primary = next((img for img in images if img.is_primary), None)
        if primary:
            return self._make_absolute(primary.file_url)
        first = next(iter(images), None)
        return self._make_absolute(first.file_url) if first else None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    margin = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'item_name', 'sku', 'category', 'selling_price',
            'inventory_status', 'certification_type', 'metal_type', 'metal_purity',
            'primary_image', 'margin', 'is_active',
        ]

    def _make_absolute(self, url):
        if not url:
            return None
        if url.startswith('http'):
            return url
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(url)
        from django.conf import settings
        api_url = getattr(settings, 'NEXT_PUBLIC_API_URL', 'http://localhost:8000')
        return f"{api_url.rstrip('/')}{url}"

    def get_primary_image(self, obj):
        # Use prefetched cache — never hit DB per-product
        images = obj.images.all()
        primary = next((img for img in images if img.is_primary), None)
        if primary:
            return self._make_absolute(primary.file_url)
        first = next(iter(images), None)
        return self._make_absolute(first.file_url) if first else None

    def get_margin(self, obj):
        return obj.margin


class ImportLogSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ImportLog
        fields = [
            'id', 'filename', 'status', 'total_rows', 'imported_rows',
            'skipped_rows', 'error_count', 'missing_sku_count', 'duplicate_sku_count',
            'missing_cert_count', 'invalid_price_count', 'uploaded_by', 'uploaded_by_name',
            'started_at', 'completed_at', 'error_detail',
        ]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.full_name
        return None


class ImportLogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportLogItem
        fields = ['id', 'import_log', 'row_number', 'sku', 'item_name', 'status', 'error_message', 'created_at']
        read_only_fields = fields
