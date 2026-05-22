from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AfterSalesRequestViewSet

router = DefaultRouter()
router.register(r'', AfterSalesRequestViewSet, basename='after-sales')

urlpatterns = [
    path('', include(router.urls)),
]
