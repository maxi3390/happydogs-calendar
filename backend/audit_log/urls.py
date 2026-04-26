from django.urls import path

from .views import (
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
]
