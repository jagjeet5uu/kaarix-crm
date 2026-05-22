from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.leads.instagram_webhook import InstagramWebhookView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/customers/', include('apps.customers.urls')),
    path('api/leads/', include('apps.leads.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/reservations/', include('apps.reservations.urls')),
    path('api/quotations/', include('apps.quotations.urls')),
    path('api/after-sales/', include('apps.after_sales.urls')),
    path('api/zoho/', include('apps.zoho_integration.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/purchases/', include('apps.purchases.urls')),
    path('api/finances/', include('apps.finances.urls')),
    path('api/webhooks/zoho/', include('apps.zoho_integration.webhook_urls')),
    path('api/webhooks/instagram/', InstagramWebhookView.as_view(), name='instagram-webhook'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
