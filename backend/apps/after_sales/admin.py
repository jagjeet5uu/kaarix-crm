from django.contrib import admin

from .models import AfterSalesImage, AfterSalesRequest


class AfterSalesImageInline(admin.TabularInline):
    model = AfterSalesImage
    extra = 0
    readonly_fields = ['created_at']


@admin.register(AfterSalesRequest)
class AfterSalesRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'customer', 'request_type', 'status', 'received_date',
        'expected_delivery_date', 'assigned_staff',
    ]
    list_filter = ['status', 'request_type', 'assigned_staff']
    search_fields = ['customer__first_name', 'customer__last_name', 'invoice_reference']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [AfterSalesImageInline]
