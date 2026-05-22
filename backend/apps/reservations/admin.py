from django.contrib import admin

from .models import ProductReservation


@admin.register(ProductReservation)
class ProductReservationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'product', 'customer', 'status', 'reserved_at',
        'reserved_until', 'advance_amount', 'reserved_by',
    ]
    list_filter = ['status']
    search_fields = ['product__item_name', 'product__sku', 'customer__first_name', 'customer__last_name']
    ordering = ['-created_at']
    readonly_fields = ['reserved_at', 'created_at', 'updated_at']
