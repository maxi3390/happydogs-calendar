from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from domain.files.validators import validate_file_size, validate_image_type


class Pet(models.Model):
    TEMPERAMENT_CHOICES = [
        ('calm', 'Calm'),
        ('playful', 'Playful'),
        ('aggressive', 'Aggressive'),
        ('anxious', 'Anxious'),
        ('friendly', 'Friendly'),
    ]

    SPECIES_CHOICES = [
        ('dog', 'Dog'),
        ('cat', 'Cat'),
        ('bird', 'Bird'),
        ('rabbit', 'Rabbit'),
        ('other', 'Other'),
    ]

    SEX_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

    SIZE_CHOICES = [
        ('small', 'Small'),
        ('medium', 'Medium'),
        ('large', 'Large'),
    ]

    name = models.CharField(max_length=100)
    species = models.CharField(max_length=20, choices=SPECIES_CHOICES, default='dog')
    breed = models.CharField(max_length=100, blank=True)
    age = models.PositiveIntegerField(help_text="Age in years")
    temperament = models.CharField(max_length=20, choices=TEMPERAMENT_CHOICES, default='friendly')
    dominance_level = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Dominance level from 1 (submissive) to 10 (very dominant)"
    )
    size = models.CharField(max_length=10, choices=SIZE_CHOICES, default='medium')
    neutered = models.BooleanField(default=False)
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, default='male')
    birth_date = models.DateField(null=True, blank=True, help_text="Date of birth (dd/mm/yyyy)")
    special_notes = models.TextField(blank=True)
    owner = models.ForeignKey(
        'pets.Owner', on_delete=models.CASCADE, related_name='pets', null=True, blank=True
    )
    profile_picture = models.ImageField(
        upload_to='profile_pictures/pets/',
        blank=True,
        null=True,
        validators=[validate_file_size, validate_image_type],
        help_text="Profile picture (JPEG, PNG, GIF, WEBP — max 5 MB)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'pets'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.species})"

    def is_compatible_with(self, other_pet):
        """
        Check if this pet is compatible with another pet based on dominance and temperament rules.
        Returns a tuple (is_compatible, reason)
        """
        # Rule 1: Aggressive pets should not be with other pets
        if self.temperament == 'aggressive' or other_pet.temperament == 'aggressive':
            return False, "Aggressive pets cannot be scheduled together with other pets"

        # Rule 2: Two highly dominant pets (>7) should not be together
        if self.dominance_level > 7 and other_pet.dominance_level > 7:
            return False, "Two highly dominant pets cannot be scheduled together"

        # Rule 3: Large size difference with high dominance difference
        size_order = {'small': 1, 'medium': 2, 'large': 3}
        size_diff = abs(size_order[self.size] - size_order[other_pet.size])
        dominance_diff = abs(self.dominance_level - other_pet.dominance_level)

        if size_diff >= 2 and dominance_diff >= 5:
            return False, "Large size difference with significant dominance difference poses a risk"

        # Rule 4: Different species with incompatible temperaments
        if self.species != other_pet.species:
            incompatible_temps = [('aggressive', 'anxious'), ('aggressive', 'calm')]
            temps = (self.temperament, other_pet.temperament)
            if temps in incompatible_temps or temps[::-1] in incompatible_temps:
                return False, "Incompatible temperaments between different species"

        # Rule 5: Anxious pets should not be with playful/energetic pets if dominance diff > 4
        if ('anxious' in [self.temperament, other_pet.temperament] and
            'playful' in [self.temperament, other_pet.temperament] and
            dominance_diff > 4):
            return False, "Anxious pets may be stressed by highly playful pets with different dominance levels"

        return True, "Compatible"
