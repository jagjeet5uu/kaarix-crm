from django.contrib import admin

from .models import Lead, LeadActivity, LeadProduct, Task


class LeadActivityInline(admin.TabularInline):
    model = LeadActivity
    extra = 0
    readonly_fields = ['created_at']


class LeadProductInline(admin.TabularInline):
    model = LeadProduct
    extra = 0
    readonly_fields = ['added_at']


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'stage', 'source', 'assigned_to', 'follow_up_date', 'created_at']
    list_filter = ['stage', 'source', 'assigned_to']
    search_fields = ['customer__first_name', 'customer__last_name', 'customer__mobile']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [LeadActivityInline, LeadProductInline]


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ['lead', 'activity_type', 'user', 'created_at']
    list_filter = ['activity_type']
    readonly_fields = ['created_at']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'assigned_to', 'due_date', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'assigned_to']
    search_fields = ['title', 'description']
    ordering = ['due_date']
    readonly_fields = ['created_at', 'updated_at']
