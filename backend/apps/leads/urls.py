from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LeadViewSet, TaskViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'', LeadViewSet, basename='lead')

urlpatterns = [
    path('', include(router.urls)),
]
