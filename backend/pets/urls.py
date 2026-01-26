from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OwnerViewSet, PetViewSet, ScheduleViewSet, get_translations, get_available_languages

router = DefaultRouter()
router.register(r'owners', OwnerViewSet)
router.register(r'pets', PetViewSet)
router.register(r'schedules', ScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('translations/<str:language>/', get_translations, name='get_translations'),
    path('translations/', get_translations, name='get_translations_default'),
    path('languages/', get_available_languages, name='get_available_languages'),
]
