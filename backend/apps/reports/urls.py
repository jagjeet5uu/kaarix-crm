from django.urls import path

from .views import (
    DashboardView,
    FinancialSummaryView,
    FollowUpsView,
    InventorySummaryView,
    LeadsByStageView,
    SalespersonPerformanceView,
    StockAgingView,
    SyncErrorsView,
)

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('inventory-summary/', InventorySummaryView.as_view(), name='inventory-summary'),
    path('stock-aging/', StockAgingView.as_view(), name='stock-aging'),
    path('leads-by-stage/', LeadsByStageView.as_view(), name='leads-by-stage'),
    path('follow-ups/', FollowUpsView.as_view(), name='follow-ups'),
    path('salesperson-performance/', SalespersonPerformanceView.as_view(), name='salesperson-performance'),
    path('financial-summary/', FinancialSummaryView.as_view(), name='financial-summary'),
    path('sync-errors/', SyncErrorsView.as_view(), name='sync-errors'),
]
