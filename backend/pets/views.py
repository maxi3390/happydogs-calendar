import json
import os
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.conf import settings
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import Owner, Pet, Schedule, VaccinationType, Document, MedicalNote
from nursery_settings.models import NurserySetting
from .serializers import (
    OwnerSerializer,
    OwnerListSerializer,
    OwnerWithPetsSerializer,
    PetSerializer,
    PetListSerializer,
    ScheduleSerializer,
    ScheduleCreateSerializer,
    ConflictCheckSerializer,
    BatchScheduleCreateSerializer,
    VaccinationTypeSerializer,
    DocumentSerializer,
    MedicalNoteSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary="List all owners",
        description="Retrieve a list of all registered pet owners.",
        tags=['owners']
    ),
    create=extend_schema(
        summary="Create a new owner",
        description="Register a new pet owner with contact information.",
        tags=['owners']
    ),
    retrieve=extend_schema(
        summary="Get owner details",
        description="Retrieve detailed information about a specific owner including their pets.",
        tags=['owners']
    ),
    update=extend_schema(
        summary="Update owner",
        description="Update all fields of an existing owner.",
        tags=['owners']
    ),
    partial_update=extend_schema(
        summary="Partially update owner",
        description="Update specific fields of an existing owner.",
        tags=['owners']
    ),
    destroy=extend_schema(
        summary="Delete owner",
        description="Remove an owner from the system.",
        tags=['owners']
    ),
)
class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.all()
    serializer_class = OwnerSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return OwnerSerializer
        if self.action == 'retrieve':
            return OwnerWithPetsSerializer
        return OwnerSerializer

    @extend_schema(
        summary="Get owners for dropdown",
        description="Get a simplified list of owners suitable for dropdown menus.",
        responses={200: OwnerListSerializer(many=True)},
        tags=['owners']
    )
    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        """Get simplified owner list for dropdowns"""
        owners = Owner.objects.all()
        serializer = OwnerListSerializer(owners, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Upload owner profile picture",
        description="Upload or replace the profile picture for an owner.",
        request={'content': {'multipart/form-data': {'type': 'object', 'properties': {'profile_picture': {'type': 'string', 'format': 'binary'}}}}},
        tags=['owners']
    )
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_profile_picture(self, request, pk=None):
        """Upload a profile picture for an owner"""
        owner = self.get_object()
        file = request.FILES.get('profile_picture')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if owner.profile_picture:
            owner.profile_picture.delete(save=False)
        owner.profile_picture = file
        try:
            owner.full_clean()
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        owner.save()
        serializer = OwnerSerializer(owner, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Delete owner profile picture",
        description="Remove the profile picture for an owner.",
        tags=['owners']
    )
    @action(detail=True, methods=['delete'], url_path='delete_profile_picture')
    def delete_profile_picture(self, request, pk=None):
        """Delete an owner's profile picture"""
        owner = self.get_object()
        if owner.profile_picture:
            owner.profile_picture.delete(save=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(
        summary="List all pets",
        description="Retrieve a list of all registered pets with their basic information.",
        tags=['pets']
    ),
    create=extend_schema(
        summary="Create a new pet",
        description="Register a new pet with behavioral characteristics (temperament, dominance level, size).",
        tags=['pets']
    ),
    retrieve=extend_schema(
        summary="Get pet details",
        description="Retrieve detailed information about a specific pet.",
        tags=['pets']
    ),
    update=extend_schema(
        summary="Update pet",
        description="Update all fields of an existing pet.",
        tags=['pets']
    ),
    partial_update=extend_schema(
        summary="Partially update pet",
        description="Update specific fields of an existing pet.",
        tags=['pets']
    ),
    destroy=extend_schema(
        summary="Delete pet",
        description="Remove a pet from the system. This will also delete all associated schedules.",
        tags=['pets']
    ),
)
class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.select_related('owner').all()
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return PetSerializer

    @extend_schema(
        summary="Upload pet profile picture",
        description="Upload or replace the profile picture for a pet.",
        request={'content': {'multipart/form-data': {'type': 'object', 'properties': {'profile_picture': {'type': 'string', 'format': 'binary'}}}}},
        tags=['pets']
    )
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_profile_picture(self, request, pk=None):
        """Upload a profile picture for a pet"""
        pet = self.get_object()
        file = request.FILES.get('profile_picture')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if pet.profile_picture:
            pet.profile_picture.delete(save=False)
        pet.profile_picture = file
        try:
            pet.full_clean()
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        pet.save()
        serializer = PetSerializer(pet, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Delete pet profile picture",
        description="Remove the profile picture for a pet.",
        tags=['pets']
    )
    @action(detail=True, methods=['delete'], url_path='delete_profile_picture')
    def delete_profile_picture(self, request, pk=None):
        """Delete a pet's profile picture"""
        pet = self.get_object()
        if pet.profile_picture:
            pet.profile_picture.delete(save=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Check pet compatibility",
        description="Check the compatibility of a specific pet with all other registered pets based on temperament, dominance, and size.",
        responses={200: {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'pet_id': {'type': 'integer'},
                    'pet_name': {'type': 'string'},
                    'is_compatible': {'type': 'boolean'},
                    'reason': {'type': 'string', 'nullable': True}
                }
            }
        }},
        tags=['pets']
    )
    @action(detail=True, methods=['get'])
    def compatibility(self, request, pk=None):
        """Check compatibility of a pet with all other pets"""
        pet = self.get_object()
        other_pets = Pet.objects.exclude(pk=pk)

        results = []
        for other in other_pets:
            is_compatible, reason = pet.is_compatible_with(other)
            results.append({
                'pet_id': other.id,
                'pet_name': other.name,
                'is_compatible': is_compatible,
                'reason': reason
            })

        return Response(results)


@extend_schema_view(
    list=extend_schema(
        summary="List schedules",
        description="Retrieve schedules with optional filtering by date, date range, pet, or status.",
        parameters=[
            OpenApiParameter(name='date', type=OpenApiTypes.DATE, description='Filter schedules that include this specific date'),
            OpenApiParameter(name='start_date', type=OpenApiTypes.DATE, description='Start of date range filter'),
            OpenApiParameter(name='end_date', type=OpenApiTypes.DATE, description='End of date range filter'),
            OpenApiParameter(name='pet_id', type=OpenApiTypes.INT, description='Filter by pet ID'),
            OpenApiParameter(name='status', type=OpenApiTypes.STR, description='Filter by status (scheduled, checked_in, completed, cancelled)'),
        ],
        tags=['schedules']
    ),
    create=extend_schema(
        summary="Create a schedule",
        description="Create a new schedule for a pet. The system will automatically check for conflicts with other scheduled pets and return warnings if any incompatibilities are detected.",
        tags=['schedules']
    ),
    retrieve=extend_schema(
        summary="Get schedule details",
        description="Retrieve detailed information about a specific schedule.",
        tags=['schedules']
    ),
    update=extend_schema(
        summary="Update schedule",
        description="Update all fields of an existing schedule.",
        tags=['schedules']
    ),
    partial_update=extend_schema(
        summary="Partially update schedule",
        description="Update specific fields of an existing schedule.",
        tags=['schedules']
    ),
    destroy=extend_schema(
        summary="Delete schedule",
        description="Remove a schedule from the system.",
        tags=['schedules']
    ),
)
class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ScheduleCreateSerializer
        return ScheduleSerializer

    def get_queryset(self):
        queryset = Schedule.objects.select_related('pet').all()

        date = self.request.query_params.get('date')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        pet_id = self.request.query_params.get('pet_id')
        status_filter = self.request.query_params.get('status')

        if date:
            # Get schedules that include this specific date
            queryset = queryset.filter(start_date__lte=date, end_date__gte=date)
        if start_date and end_date:
            # Get schedules that overlap with the date range
            queryset = queryset.filter(
                Q(start_date__lte=end_date) & Q(end_date__gte=start_date)
            )
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create temporary schedule to check conflicts
        temp_schedule = Schedule(**serializer.validated_data)
        conflicts = temp_schedule.check_conflicts()

        # Allow creation but include warning about conflicts
        self.perform_create(serializer)

        response_data = ScheduleSerializer(
            Schedule.objects.get(pk=serializer.instance.pk)
        ).data

        if conflicts:
            response_data['warnings'] = conflicts
            return Response(response_data, status=status.HTTP_201_CREATED)

        return Response(response_data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Check scheduling conflicts",
        description="Check for potential conflicts before creating a schedule. Returns a list of incompatible pets that are already scheduled during the specified time slot.",
        request=ConflictCheckSerializer,
        responses={200: {
            'type': 'object',
            'properties': {
                'has_conflicts': {'type': 'boolean'},
                'conflicts': {'type': 'array', 'items': {'type': 'object'}},
                'overlapping_pets_count': {'type': 'integer'}
            }
        }},
        tags=['schedules']
    )
    @action(detail=False, methods=['post'])
    def check_conflicts(self, request):
        """Check for conflicts before creating a schedule"""
        serializer = ConflictCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        try:
            pet = Pet.objects.get(pk=data['pet_id'])
        except Pet.DoesNotExist:
            return Response(
                {'error': 'Pet not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get overlapping schedules (date range overlap AND time overlap)
        overlapping_query = Schedule.objects.filter(
            Q(start_date__lte=data['end_date']) & Q(end_date__gte=data['start_date']),
            status__in=['scheduled', 'checked_in'],
            start_time__lt=data['end_time'],
            end_time__gt=data['start_time']
        )

        if 'exclude_schedule_id' in data:
            overlapping_query = overlapping_query.exclude(pk=data['exclude_schedule_id'])

        conflicts = []
        for schedule in overlapping_query:
            is_compatible, reason = pet.is_compatible_with(schedule.pet)
            if not is_compatible:
                date_range = (
                    f"{schedule.start_date}"
                    if schedule.start_date == schedule.end_date
                    else f"{schedule.start_date} to {schedule.end_date}"
                )
                conflicts.append({
                    'conflicting_pet_id': schedule.pet.id,
                    'conflicting_pet': schedule.pet.name,
                    'conflicting_schedule_id': schedule.id,
                    'reason': reason,
                    'date_range': date_range,
                    'time_slot': f"{schedule.start_time.strftime('%H:%M')} - {schedule.end_time.strftime('%H:%M')}"
                })

        return Response({
            'has_conflicts': len(conflicts) > 0,
            'conflicts': conflicts,
            'overlapping_pets_count': overlapping_query.count()
        })

    @extend_schema(
        summary="Get daily booking count and limit",
        description="Get the number of active bookings for a specific date along with the configured daily limit.",
        parameters=[
            OpenApiParameter(name='date', type=OpenApiTypes.DATE, required=True, description='Date to check (YYYY-MM-DD)')
        ],
        responses={200: {
            'type': 'object',
            'properties': {
                'date': {'type': 'string', 'format': 'date'},
                'count': {'type': 'integer'},
                'limit': {'type': 'integer'},
                'limit_reached': {'type': 'boolean'},
                'limit_exceeded': {'type': 'boolean'},
            }
        }},
        tags=['schedules']
    )
    @action(detail=False, methods=['get'])
    def daily_count(self, request):
        """Get the booking count for a specific date and the configured limit."""
        date = request.query_params.get('date')
        if not date:
            return Response(
                {'error': 'Date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_count = Schedule.objects.filter(
            start_date__lte=date, end_date__gte=date,
            status__in=['scheduled', 'checked_in']
        ).count()

        settings_obj = NurserySetting.load()
        limit = settings_obj.daily_booking_limit

        return Response({
            'date': date,
            'count': active_count,
            'limit': limit,
            'limit_reached': limit > 0 and active_count >= limit,
            'limit_exceeded': limit > 0 and active_count > limit,
        })

    @extend_schema(
        summary="Get daily schedule summary",
        description="Get a summary of all schedules for a specific date, including counts by status.",
        parameters=[
            OpenApiParameter(name='date', type=OpenApiTypes.DATE, required=True, description='Date to get summary for (YYYY-MM-DD)')
        ],
        responses={200: {
            'type': 'object',
            'properties': {
                'date': {'type': 'string', 'format': 'date'},
                'total_schedules': {'type': 'integer'},
                'by_status': {'type': 'object'},
                'schedules': {'type': 'array'}
            }
        }},
        tags=['schedules']
    )
    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Get a summary of schedules for a specific date"""
        date = request.query_params.get('date')
        if not date:
            return Response(
                {'error': 'Date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get schedules that include this date in their range
        schedules = Schedule.objects.filter(
            start_date__lte=date, end_date__gte=date
        ).select_related('pet')

        summary = {
            'date': date,
            'total_schedules': schedules.count(),
            'by_status': {},
            'schedules': ScheduleSerializer(schedules, many=True).data
        }

        for status_choice in ['scheduled', 'checked_in', 'completed', 'cancelled']:
            summary['by_status'][status_choice] = schedules.filter(status=status_choice).count()

        return Response(summary)

    @extend_schema(
        summary="Batch create schedules",
        description="Create schedules for multiple pets at once with the same time slot. Useful for scheduling group activities. Returns all created schedules and any conflict warnings.",
        request=BatchScheduleCreateSerializer,
        responses={201: {
            'type': 'object',
            'properties': {
                'created_count': {'type': 'integer'},
                'schedules': {'type': 'array'},
                'warnings': {'type': 'array'}
            }
        }},
        tags=['schedules']
    )
    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """Create schedules for multiple pets at once with the same schedule data"""
        serializer = BatchScheduleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        pet_ids = data.pop('pet_ids')

        # Verify all pets exist
        pets = Pet.objects.filter(pk__in=pet_ids)
        if pets.count() != len(pet_ids):
            found_ids = set(pets.values_list('id', flat=True))
            missing_ids = set(pet_ids) - found_ids
            return Response(
                {'error': f'Pets not found: {list(missing_ids)}'},
                status=status.HTTP_404_NOT_FOUND
            )

        created_schedules = []
        all_warnings = []

        for pet in pets:
            schedule = Schedule.objects.create(pet=pet, **data)
            conflicts = schedule.check_conflicts()
            schedule_data = ScheduleSerializer(schedule).data

            if conflicts:
                all_warnings.append({
                    'pet_id': pet.id,
                    'pet_name': pet.name,
                    'schedule_id': schedule.id,
                    'conflicts': conflicts
                })

            created_schedules.append(schedule_data)

        response_data = {
            'created_count': len(created_schedules),
            'schedules': created_schedules
        }

        if all_warnings:
            response_data['warnings'] = all_warnings

        return Response(response_data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    list=extend_schema(
        summary="List vaccination types",
        description="Retrieve all configurable vaccination types.",
        tags=['vaccination-types']
    ),
    create=extend_schema(
        summary="Create vaccination type",
        description="Add a new vaccination type.",
        tags=['vaccination-types']
    ),
    update=extend_schema(
        summary="Update vaccination type",
        description="Update a vaccination type (e.g. toggle enabled).",
        tags=['vaccination-types']
    ),
    partial_update=extend_schema(
        summary="Partially update vaccination type",
        description="Partially update a vaccination type.",
        tags=['vaccination-types']
    ),
    destroy=extend_schema(
        summary="Delete vaccination type",
        description="Remove a vaccination type.",
        tags=['vaccination-types']
    ),
)
class VaccinationTypeViewSet(viewsets.ModelViewSet):
    queryset = VaccinationType.objects.all()
    serializer_class = VaccinationTypeSerializer
    permission_classes = [IsAuthenticated]


@extend_schema_view(
    list=extend_schema(
        summary="List documents",
        description="List documents, optionally filtered by pet_id or owner_id.",
        parameters=[
            OpenApiParameter(name='pet_id', type=OpenApiTypes.INT, description='Filter by pet ID'),
            OpenApiParameter(name='owner_id', type=OpenApiTypes.INT, description='Filter by owner ID'),
        ],
        tags=['documents']
    ),
    create=extend_schema(
        summary="Upload a document",
        description="Upload a document and attach it to a pet or an owner. Supported formats: JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX. Max size: 5 MB.",
        tags=['documents']
    ),
    destroy=extend_schema(
        summary="Delete a document",
        description="Remove an uploaded document.",
        tags=['documents']
    ),
)
class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Document.objects.all()
        pet_id = self.request.query_params.get('pet_id')
        owner_id = self.request.query_params.get('owner_id')
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        return queryset

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file')
        if file_obj:
            serializer.save(original_filename=file_obj.name)
        else:
            serializer.save()


@extend_schema_view(
    list=extend_schema(
        summary="List medical notes",
        description="List medical notes, optionally filtered by pet_id.",
        parameters=[
            OpenApiParameter(name='pet_id', type=OpenApiTypes.INT, description='Filter by pet ID'),
        ],
        tags=['medical-notes']
    ),
    create=extend_schema(
        summary="Create medical note",
        description="Create a medical note linked to a pet.",
        tags=['medical-notes']
    ),
    update=extend_schema(
        summary="Update medical note",
        description="Update a medical note.",
        tags=['medical-notes']
    ),
    partial_update=extend_schema(
        summary="Partially update medical note",
        description="Partially update a medical note.",
        tags=['medical-notes']
    ),
    destroy=extend_schema(
        summary="Delete medical note",
        description="Delete a medical note.",
        tags=['medical-notes']
    ),
)
class MedicalNoteViewSet(viewsets.ModelViewSet):
    queryset = MedicalNote.objects.select_related('pet').all()
    serializer_class = MedicalNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset
        pet_id = self.request.query_params.get('pet_id')
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)
        return queryset


@extend_schema(
    summary="Get translations",
    description="Get all translation strings for a specific language. Used for internationalization of the frontend.",
    parameters=[
        OpenApiParameter(name='language', type=OpenApiTypes.STR, location=OpenApiParameter.PATH, description='Language code (en, es)')
    ],
    responses={200: {
        'type': 'object',
        'description': 'Translation dictionary with nested keys'
    }},
    tags=['translations']
)
@api_view(['GET'])
def get_translations(request, language='en'):
    """
    Get translations for a specific language.
    Supported languages: en (English), es (Spanish)
    """
    supported_languages = ['en', 'es']

    if language not in supported_languages:
        return Response(
            {'error': f'Language not supported. Supported languages: {", ".join(supported_languages)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    translations_dir = os.path.join(settings.BASE_DIR, 'translations')
    translation_file = os.path.join(translations_dir, f'{language}.json')

    try:
        with open(translation_file, 'r', encoding='utf-8') as f:
            translations = json.load(f)
        return Response(translations)
    except FileNotFoundError:
        return Response(
            {'error': f'Translation file for {language} not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except json.JSONDecodeError:
        return Response(
            {'error': 'Invalid translation file format'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="Get available languages",
    description="Get a list of all available languages for the application.",
    responses={200: {
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': {
                'code': {'type': 'string', 'example': 'en'},
                'name': {'type': 'string', 'example': 'English'},
                'nativeName': {'type': 'string', 'example': 'English'}
            }
        }
    }},
    tags=['translations']
)
@api_view(['GET'])
def get_available_languages(request):
    """
    Get list of available languages.
    """
    languages = [
        {'code': 'en', 'name': 'English', 'nativeName': 'English'},
        {'code': 'es', 'name': 'Spanish', 'nativeName': 'Español'}
    ]
    return Response(languages)
