from django.contrib import admin

from .models import Quotation, QuotationItem


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 0
    readonly_fields = ['total']


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = [
        'quotation_number', 'customer', 'status', 'subtotal', 'total',
        'created_by', 'created_at',
    ]
    list_filter = ['status']
    search_fields = ['quotation_number', 'customer__first_name', 'customer__last_name']
    readonly_fields = ['quotation_number', 'created_at', 'updated_at']
    inlines = [QuotationItemInline]
