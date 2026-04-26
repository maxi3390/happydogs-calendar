from django.contrib import admin
from domain.owners.models import Owner
from domain.pets.models import Pet
from domain.vaccinations.models import Vaccination
from domain.schedules.models import Schedule
from domain.documents.models import Document
from domain.notes.models import MedicalNote
from domain.vets.models import Vet


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = [
        'first_name', 'last_name', 'email', 'phone', 'city', 'province',
        'pet_count', 'primary_vet', 'emergency_vet',
    ]
    list_filter = ['created_at', 'province', 'country']
    search_fields = [
        'first_name', 'last_name', 'email', 'phone', 'street',
        'city', 'state', 'province', 'country',
    ]
    raw_id_fields = ['primary_vet', 'emergency_vet']

    def pet_count(self, obj):
        return obj.pets.count()
    pet_count.short_description = 'Pets'


class VaccinationInline(admin.TabularInline):
    model = Vaccination
    extra = 1


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'species', 'sex', 'neutered', 'birth_date', 'temperament',
        'dominance_level', 'size', 'owner', 'vet_override',
    ]
    list_filter = ['species', 'temperament', 'size', 'sex', 'neutered']
    search_fields = ['name', 'owner__first_name', 'owner__last_name']
    inlines = [VaccinationInline]
    raw_id_fields = ['owner', 'vet_override']


@admin.register(Vet)
class VetAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'city', 'province', 'country']
    list_filter = ['province', 'country', 'created_at']
    search_fields = ['name', 'phone', 'email', 'street', 'city', 'state', 'province', 'country']


@admin.register(Vaccination)
class VaccinationAdmin(admin.ModelAdmin):
    list_display = ['pet', 'vax_type', 'date']
    list_filter = ['vax_type', 'date']
    search_fields = ['pet__name']


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['pet', 'start_date', 'end_date', 'start_time', 'end_time', 'status']
    list_filter = ['start_date', 'status']
    search_fields = ['pet__name']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'pet', 'owner', 'description', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['original_filename', 'description', 'pet__name', 'owner__first_name', 'owner__last_name']


@admin.register(MedicalNote)
class MedicalNoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'pet', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['title', 'description', 'pet__name']
