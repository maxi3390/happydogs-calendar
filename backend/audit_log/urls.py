from django.urls import path

from .views import (
    AuditLogActivityView,
    MedicalNoteHistoryView,
    OwnerHistoryView,
    PetHistoryView,
    VaccinationHistoryView,
)


urlpatterns = [
    path('pets/<int:pk>/history/', PetHistoryView.as_view(), name='pet-history'),
    path('owners/<int:pk>/history/', OwnerHistoryView.as_view(), name='owner-history'),
    path(
        'pets/<int:pet_id>/medical-notes/<int:pk>/history/',
        MedicalNoteHistoryView.as_view(),
        name='medical-note-history',
    ),
    path(
        'pets/<int:pet_id>/vaccinations/<int:pk>/history/',
        VaccinationHistoryView.as_view(),
        name='vaccination-history',
    ),
    # Cross-entity activity feed for /admin/activity. See
    # openspec/specs/backend/audit-log/spec.md for the contract.
    path('audit-log/activity/', AuditLogActivityView.as_view(), name='audit-log-activity'),
]
