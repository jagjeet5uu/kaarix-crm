from rest_framework.routers import DefaultRouter

from .views import VendorViewSet, ExpenseViewSet, BillViewSet

router = DefaultRouter()
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = router.urls
