from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'mobile', 'email', 'city', 'customer_type', 'lead_source', 'created_at']
    list_filter = ['customer_type', 'lead_source', 'preferred_metal', 'city']
    search_fields = ['first_name', 'last_name', 'mobile', 'email']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Info', {'fields': ('first_name', 'last_name', 'mobile', 'email', 'city', 'address')}),
        ('Classification', {'fields': ('customer_type', 'lead_source', 'zoho_contact_id')}),
        ('Preferences', {'fields': (
            'preferred_category', 'preferred_metal',
            'preferred_budget_min', 'preferred_budget_max',
            'ring_size', 'bracelet_size',
        )}),
        ('Personal Dates', {'fields': ('birthday', 'anniversary')}),
        ('Notes', {'fields': ('notes',)}),
        ('Meta', {'fields': ('created_by', 'created_at', 'updated_at')}),
    )
