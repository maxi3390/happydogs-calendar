from django.contrib import admin
from .models import Pet, Schedule


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ['name', 'species', 'temperament', 'dominance_level', 'size', 'owner_name']
    list_filter = ['species', 'temperament', 'size']
    search_fields = ['name', 'owner_name']


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['pet', 'date', 'start_time', 'end_time', 'status']
    list_filter = ['date', 'status']
    search_fields = ['pet__name']
