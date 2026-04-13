from django.urls import path
from .views import get_nursery_settings, update_nursery_settings, upload_logo, delete_logo

urlpatterns = [
    path('settings/', get_nursery_settings, name='nursery_settings_get'),
    path('settings/update/', update_nursery_settings, name='nursery_settings_update'),
    path('settings/upload_logo/', upload_logo, name='nursery_settings_upload_logo'),
    path('settings/delete_logo/', delete_logo, name='nursery_settings_delete_logo'),
]
