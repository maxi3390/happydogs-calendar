from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PetViewSet, ScheduleViewSet

router = DefaultRouter()
router.register(r'pets', PetViewSet)
router.register(r'schedules', ScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
