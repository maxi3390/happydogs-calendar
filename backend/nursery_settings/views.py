from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import NurserySetting
from .serializers import NurserySettingSerializer


@extend_schema(
    summary="Get nursery settings",
    description="Retrieve the current nursery configuration including daily booking limit and logo.",
    responses={200: NurserySettingSerializer},
    tags=['settings']
)
@api_view(['GET'])
def get_nursery_settings(request):
    """Get current nursery settings."""
    settings_obj = NurserySetting.load()
    serializer = NurserySettingSerializer(settings_obj, context={'request': request})
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
    serializer = NurserySettingSerializer(settings_obj, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@extend_schema(
    summary="Upload system logo",
    description="Upload or replace the system logo image. Accepted formats: JPEG, PNG, GIF, WEBP. Max size: 5 MB.",
    request={'content': {'multipart/form-data': {'type': 'object', 'properties': {'logo': {'type': 'string', 'format': 'binary'}}}}},
    responses={200: NurserySettingSerializer},
    tags=['settings']
)
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_logo(request):
    """Upload or replace the system logo."""
    settings_obj = NurserySetting.load()
    file = request.FILES.get('logo')
    if not file:
        return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
    if settings_obj.logo:
        settings_obj.logo.delete(save=False)
    settings_obj.logo = file
    try:
        settings_obj.full_clean()
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    settings_obj.save()
    serializer = NurserySettingSerializer(settings_obj, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    summary="Delete system logo",
    description="Remove the current system logo.",
    responses={204: None},
    tags=['settings']
)
@api_view(['DELETE'])
def delete_logo(request):
    """Delete the system logo."""
    settings_obj = NurserySetting.load()
    if settings_obj.logo:
        settings_obj.logo.delete(save=True)
    return Response(status=status.HTTP_204_NO_CONTENT)
