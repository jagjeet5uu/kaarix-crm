from rest_framework.routers import DefaultRouter
from .views import (
    SalesInvoiceViewSet, CustomerPaymentViewSet,
    VendorPaymentViewSet, VendorCreditViewSet, SalesQuoteViewSet,
    SalesOrderViewSet, JournalEntryViewSet, DepositViewSet, ChartOfAccountViewSet,
)

router = DefaultRouter()
router.register(r'invoices', SalesInvoiceViewSet, basename='sales-invoice')
router.register(r'customer-payments', CustomerPaymentViewSet, basename='customer-payment')
router.register(r'vendor-payments', VendorPaymentViewSet, basename='vendor-payment')
router.register(r'vendor-credits', VendorCreditViewSet, basename='vendor-credit')
router.register(r'quotes', SalesQuoteViewSet, basename='sales-quote')
router.register(r'sales-orders', SalesOrderViewSet, basename='sales-order')
router.register(r'journals', JournalEntryViewSet, basename='journal')
router.register(r'deposits', DepositViewSet, basename='deposit')
router.register(r'chart-of-accounts', ChartOfAccountViewSet, basename='chart-of-account')

urlpatterns = router.urls
