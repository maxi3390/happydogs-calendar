from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OwnerViewSet, PetViewSet, ScheduleViewSet

router = DefaultRouter()
router.register(r'owners', OwnerViewSet)
router.register(r'pets', PetViewSet)
router.register(r'schedules', ScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
