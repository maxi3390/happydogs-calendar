from django.db import models
from simple_history.models import HistoricalRecords


class Note(models.Model):
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class MedicalNote(Note):
    pet = models.ForeignKey('pets.Pet', on_delete=models.CASCADE, related_name='medical_notes')

    history = HistoricalRecords()

    class Meta:
        app_label = 'pets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pet.name} - {self.title}"
