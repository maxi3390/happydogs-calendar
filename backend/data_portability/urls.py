from django.urls import path

from .views import export_csv_view, export_json_view, import_view

urlpatterns = [
    path('data-portability/export/json', export_json_view, name='data_portability_export_json'),
    path('data-portability/export/csv', export_csv_view, name='data_portability_export_csv'),
    path('data-portability/import', import_view, name='data_portability_import'),
]
