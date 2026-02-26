from django.urls import path
from .views import get_nursery_settings, update_nursery_settings

urlpatterns = [
    path('settings/', get_nursery_settings, name='nursery_settings_get'),
    path('settings/update/', update_nursery_settings, name='nursery_settings_update'),
]
