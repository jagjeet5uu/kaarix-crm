from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ProductReservationViewSet

router = DefaultRouter()
router.register(r'', ProductReservationViewSet, basename='reservation')

urlpatterns = [
    path('', include(router.urls)),
]
