import json
import os
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db.models import Q
from django.conf import settings
from .models import Owner, Pet, Schedule
from .serializers import (
    OwnerSerializer,
    OwnerListSerializer,
    OwnerWithPetsSerializer,
    PetSerializer,
    PetListSerializer,
    ScheduleSerializer,
    ScheduleCreateSerializer,
    ConflictCheckSerializer,
    BatchScheduleCreateSerializer
)


class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.all()
    serializer_class = OwnerSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return OwnerSerializer
        if self.action == 'retrieve':
            return OwnerWithPetsSerializer
        return OwnerSerializer

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        """Get simplified owner list for dropdowns"""
        owners = Owner.objects.all()
        serializer = OwnerListSerializer(owners, many=True)
        return Response(serializer.data)


class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.select_related('owner').all()
    serializer_class = PetSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return PetListSerializer
        return PetSerializer

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


class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()

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
