from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ZohoAuthView, ZohoCallbackView, ZohoSyncViewSet

router = DefaultRouter()
router.register(r'sync', ZohoSyncViewSet, basename='zoho-sync')

urlpatterns = [
    path('auth/', ZohoAuthView.as_view(), name='zoho-auth'),
    path('callback/', ZohoCallbackView.as_view(), name='zoho-callback'),
    path('oauth/callback/', ZohoCallbackView.as_view(), name='zoho-oauth-callback'),
    path('', include(router.urls)),
]
