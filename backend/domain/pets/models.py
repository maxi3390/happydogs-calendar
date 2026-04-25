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
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Weight in kg")
    last_internal_deworming_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of the last internal (intestinal) deworming treatment.",
    )
    last_external_deworming_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of the last external (flea/tick) deworming treatment.",
    )
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
    vet_override = models.ForeignKey(
        'pets.Vet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='override_for_pets',
        help_text="Overrides the owner's primary vet for this pet (e.g. specialist clinic).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'pets'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.species})"

    @property
    def effective_vet(self):
        """Return the vet responsible for this pet.

        Resolution order:
        1. ``vet_override`` if set on the pet.
        2. The owner's ``primary_vet`` when the pet has an owner with one.
        3. ``None`` otherwise.

        Reads the underlying ``_id`` columns first so the property stays
        query-free when the related records haven't been preloaded.
        """
        if self.vet_override_id is not None:
            return self.vet_override
        if self.owner_id is not None and self.owner is not None:
            return self.owner.primary_vet
        return None

    def is_compatible_with(self, other_pet):
        """
        Check compatibility. Returns (is_compatible, reasons_list).
        All triggered rules are collected; reasons_list is empty when compatible.
        """
        reasons = []
        # Rule 1: Aggressive pets should not be with other pets
        if self.temperament == 'aggressive' or other_pet.temperament == 'aggressive':
            reasons.append("Aggressive pets cannot be scheduled together with other pets")

        # Rule 2: Two highly dominant pets (>7) should not be together
        if self.dominance_level > 7 and other_pet.dominance_level > 7:
            reasons.append("Two highly dominant pets cannot be scheduled together")

        # Rule 3: Large size difference with high dominance difference
        size_order = {'small': 1, 'medium': 2, 'large': 3}
        size_diff = abs(size_order[self.size] - size_order[other_pet.size])
        dominance_diff = abs(self.dominance_level - other_pet.dominance_level)

        if size_diff >= 2 and dominance_diff >= 5:
            reasons.append("Large size difference with significant dominance difference poses a risk")

        # Rule 4: Different species with incompatible temperaments
        if self.species != other_pet.species:
            incompatible_temps = [('aggressive', 'anxious'), ('aggressive', 'calm')]
            temps = (self.temperament, other_pet.temperament)
            if temps in incompatible_temps or temps[::-1] in incompatible_temps:
                reasons.append("Incompatible temperaments between different species")

        # Rule 5: Anxious pets should not be with playful/energetic pets if dominance diff > 4
        if ('anxious' in [self.temperament, other_pet.temperament] and
            'playful' in [self.temperament, other_pet.temperament] and
            dominance_diff > 4):
            reasons.append("Anxious pets may be stressed by highly playful pets with different dominance levels")

        # Rule 6: Two same-species same-sex highly-dominant pets (>= 7)
        if (self.species == other_pet.species and
            self.sex == other_pet.sex and
            self.dominance_level >= 7 and other_pet.dominance_level >= 7):
            reasons.append("Two same-species same-sex highly-dominant pets cannot be scheduled together")

        # Custom incompatibility rules — order-independent lookup against the
        # PetIncompatibility catalog. A rule fires only when an actual schedule
        # overlap occurs (handled by the caller); is_compatible_with itself just
        # surfaces the rule's reason text when the catalog has an entry.
        if self.pk and other_pet.pk:
            lo, hi = sorted([self.pk, other_pet.pk])
            for rule in PetIncompatibility.objects.filter(pet1_id=lo, pet2_id=hi):
                reasons.append(rule.reason)

        return (len(reasons) == 0), reasons


class PetIncompatibility(models.Model):
    """A custom, per-pet-pair incompatibility rule.

    Stored order-independently: ``pet1_id`` is always the smaller id,
    ``pet2_id`` the larger. The serializer normalises before save so the
    DB-level ``unique_together`` enforces "one rule per unordered pair".
    """

    pet1 = models.ForeignKey(
        'pets.Pet', on_delete=models.CASCADE, related_name='incompatibilities_as_pet1',
    )
    pet2 = models.ForeignKey(
        'pets.Pet', on_delete=models.CASCADE, related_name='incompatibilities_as_pet2',
    )
    reason = models.TextField(help_text="Free-text reason shown alongside the conflict warning.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'pets'
        unique_together = [('pet1', 'pet2')]
        ordering = ['pet1_id', 'pet2_id']
        verbose_name = 'pet incompatibility'
        verbose_name_plural = 'pet incompatibilities'

    def __str__(self):
        return f"Incompatibility: pet#{self.pet1_id} ↔ pet#{self.pet2_id}"
