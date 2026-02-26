from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import NurserySetting
from .serializers import NurserySettingSerializer


@extend_schema(
    summary="Get nursery settings",
    description="Retrieve the current nursery configuration including daily booking limit.",
    responses={200: NurserySettingSerializer},
    tags=['settings']
)
@api_view(['GET'])
def get_nursery_settings(request):
    """Get current nursery settings."""
    settings_obj = NurserySetting.load()
    serializer = NurserySettingSerializer(settings_obj)
    return Response(serializer.data)


@extend_schema(
    summary="Update nursery settings",
    description="Update the nursery configuration (e.g. daily booking limit).",
    request=NurserySettingSerializer,
    responses={200: NurserySettingSerializer},
    tags=['settings']
)
@api_view(['PUT', 'PATCH'])
def update_nursery_settings(request):
    """Update nursery settings."""
    settings_obj = NurserySetting.load()
    serializer = NurserySettingSerializer(settings_obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
