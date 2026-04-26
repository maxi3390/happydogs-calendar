from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    NotificationViewSet,
    NotificationPreferenceView,
    NotificationTemplateViewSet,
)


router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'notification-templates', NotificationTemplateViewSet, basename='notification-template')


# Note: ``notifications/preferences/`` MUST be registered BEFORE the
# router include, otherwise the DefaultRouter catches it as
# ``notifications/{pk}/`` and routes it to NotificationViewSet's
# detail view (which 404s because there's no notification with
# pk='preferences').
urlpatterns = [
    path(
        'notifications/preferences/',
        NotificationPreferenceView.as_view({'get': 'list', 'patch': 'partial_update'}),
        name='notification-preferences',
    ),
    path('', include(router.urls)),
]
