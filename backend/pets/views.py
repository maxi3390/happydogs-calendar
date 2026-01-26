from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Pet, Schedule
from .serializers import (
    PetSerializer,
    PetListSerializer,
    ScheduleSerializer,
    ScheduleCreateSerializer,
    ConflictCheckSerializer
)


class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
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
            queryset = queryset.filter(date=date)
        if start_date and end_date:
            queryset = queryset.filter(date__gte=start_date, date__lte=end_date)
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

        # Get overlapping schedules
        overlapping_query = Schedule.objects.filter(
            date=data['date'],
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
                conflicts.append({
                    'conflicting_pet_id': schedule.pet.id,
                    'conflicting_pet': schedule.pet.name,
                    'conflicting_schedule_id': schedule.id,
                    'reason': reason,
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

        schedules = Schedule.objects.filter(date=date).select_related('pet')

        summary = {
            'date': date,
            'total_schedules': schedules.count(),
            'by_status': {},
            'schedules': ScheduleSerializer(schedules, many=True).data
        }

        for status_choice in ['scheduled', 'checked_in', 'completed', 'cancelled']:
            summary['by_status'][status_choice] = schedules.filter(status=status_choice).count()

        return Response(summary)
