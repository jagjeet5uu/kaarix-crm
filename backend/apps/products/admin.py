from django.contrib import admin

from .models import ImportLog, ImportLogItem, Product, ProductCertificate, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ['created_at']


class ProductCertificateInline(admin.TabularInline):
    model = ProductCertificate
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'item_name', 'sku', 'category', 'selling_price',
        'inventory_status', 'certification_type', 'is_active', 'created_at',
    ]
    list_filter = ['category', 'inventory_status', 'metal_type', 'metal_purity', 'certification_type', 'is_active']
    search_fields = ['item_name', 'sku', 'zoho_item_id', 'description']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'margin']
    inlines = [ProductImageInline, ProductCertificateInline]
    fieldsets = (
        ('Basic Info', {'fields': ('item_name', 'sku', 'zoho_item_id', 'description', 'category', 'subcategory')}),
        ('Pricing', {'fields': ('selling_price', 'purchase_price', 'making_charges', 'hsn_code', 'margin')}),
        ('Physical', {'fields': ('gross_weight', 'net_weight', 'diamond_weight', 'metal_type', 'metal_purity', 'stone_type')}),
        ('Certification', {'fields': ('certification_type', 'certification_number')}),
        ('Status', {'fields': ('inventory_status', 'zoho_status', 'is_active', 'date_of_purchase')}),
        ('Meta', {'fields': ('created_by', 'created_at', 'updated_at')}),
    )


class ImportLogItemInline(admin.TabularInline):
    model = ImportLogItem
    extra = 0
    readonly_fields = ['created_at']
    can_delete = False


@admin.register(ImportLog)
class ImportLogAdmin(admin.ModelAdmin):
    list_display = [
        'filename', 'status', 'total_rows', 'imported_rows', 'error_count',
        'uploaded_by', 'started_at', 'completed_at',
    ]
    list_filter = ['status']
    readonly_fields = [
        'started_at', 'completed_at', 'total_rows', 'imported_rows',
        'skipped_rows', 'error_count', 'missing_sku_count', 'duplicate_sku_count',
    ]
    inlines = [ImportLogItemInline]
