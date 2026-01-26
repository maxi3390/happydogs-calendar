from django.contrib import admin
from .models import Owner, Pet, Schedule


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'phone', 'pet_count']
    list_filter = ['created_at']
    search_fields = ['first_name', 'last_name', 'email', 'phone']

    def pet_count(self, obj):
        return obj.pets.count()
    pet_count.short_description = 'Pets'


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ['name', 'species', 'temperament', 'dominance_level', 'size', 'owner']
    list_filter = ['species', 'temperament', 'size']
    search_fields = ['name', 'owner__first_name', 'owner__last_name']


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['pet', 'start_date', 'end_date', 'start_time', 'end_time', 'status']
    list_filter = ['start_date', 'status']
    search_fields = ['pet__name']
