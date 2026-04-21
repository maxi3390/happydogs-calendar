"""Seed a development database with a deterministic, idempotent demo dataset.

Covered by ``openspec/specs/tooling/seed/spec.md``. Keep the dataset small
and hand-tuned — we reference the specific names, emails, and row counts
in docs, screenshots, and tests.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, time, timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from pets.models import (
    MedicalNote,
    Owner,
    Pet,
    Schedule,
    Vaccination,
    VaccinationType,
    Vet,
)

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# Seed dataset — hand-tuned on purpose. See design.md for the rationale.
# ─────────────────────────────────────────────────────────────────────────────

SEED_USERS: list[dict[str, Any]] = [
    {
        'email': 'sofia@happydogs.example',
        'first_name': 'Sofía',
        'last_name': 'Álvarez',
        'role': 'user',
    },
    {
        'email': 'carlos@happydogs.example',
        'first_name': 'Carlos',
        'last_name': 'Giménez',
        'role': 'user',
    },
]
SEED_USER_PASSWORD = 'seed1234'  # nosec: dev-only fixture; never used in production.

SEED_VACCINATION_TYPES: list[dict[str, Any]] = [
    {'name': 'rabies',        'label': 'Rabies',        'order': 1, 'enabled': True},
    {'name': 'distemper',     'label': 'Distemper',     'order': 2, 'enabled': True},
    {'name': 'parvovirus',    'label': 'Parvovirus',    'order': 3, 'enabled': True},
    {'name': 'bordetella',    'label': 'Bordetella',    'order': 4, 'enabled': True},
    {'name': 'leptospirosis', 'label': 'Leptospirosis', 'order': 5, 'enabled': True},
]

SEED_VETS: list[dict[str, Any]] = [
    {
        'name': 'General Vet Clinic',
        'phone': '+54 11 5000 0001',
        'email': 'contact@general-vet.example',
        'street': 'Av. Santa Fe 2800',
        'city': 'Palermo',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'notes': 'General practice — dogs, cats, rabbits. Open Mon–Sat 9am–8pm.',
    },
    {
        'name': 'Exotic Animals Specialist',
        'phone': '+54 11 5000 0002',
        'email': 'hello@exotic-vet.example',
        'street': 'Av. Cabildo 1500',
        'city': 'Belgrano',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'notes': 'Birds, rabbits, reptiles, small mammals. By appointment only.',
    },
    {
        'name': 'Emergency Vet Hospital 24/7',
        'phone': '+54 11 5000 0003',
        'email': 'er@emergency-vet.example',
        'street': 'Av. Las Heras 2200',
        'city': 'Recoleta',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'notes': '24/7 emergency clinic. Walk-ins welcome.',
    },
    {
        'name': 'Feline Health Practice',
        'phone': '+54 11 5000 0004',
        'email': 'cats@feline-health.example',
        'street': 'Av. Scalabrini Ortiz 3100',
        'city': 'Palermo',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'notes': 'Cats-only practice, quiet rooms designed for low stress.',
    },
    {
        'name': 'Mobile Home Vet',
        'phone': '+54 11 5000 0005',
        'email': 'book@mobile-vet.example',
        'street': '',
        'city': 'Flores',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'notes': 'House calls across CABA. No physical clinic.',
    },
]

SEED_OWNERS: list[dict[str, Any]] = [
    {
        'email': 'ana.garcia@seed.example',
        'first_name': 'Ana',
        'last_name': 'García',
        'phone': '+54 11 4000 0001',
        'street': 'Av. Cabildo 1234',
        'city': 'Belgrano',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'primary_vet_name': 'Feline Health Practice',
    },
    {
        'email': 'luis.fernandez@seed.example',
        'first_name': 'Luis',
        'last_name': 'Fernández',
        'phone': '+54 11 4000 0002',
        'street': 'Jorge Newbery 500',
        'city': 'Chacarita',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'emergency_contact': 'Marta Fernández',
        'emergency_phone': '+54 11 4000 0022',
        'primary_vet_name': 'General Vet Clinic',
        'emergency_vet_name': 'Emergency Vet Hospital 24/7',
    },
    {
        'email': 'maria.lopez@seed.example',
        'first_name': 'María',
        'last_name': 'López',
        'phone': '+54 11 4000 0003',
        'street': 'Av. Santa Fe 3100',
        'city': 'Palermo',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'primary_vet_name': 'General Vet Clinic',
        'emergency_vet_name': 'Exotic Animals Specialist',
    },
    {
        'email': 'jose.martinez@seed.example',
        'first_name': 'José',
        'last_name': 'Martínez',
        'phone': '+54 11 4000 0004',
        'street': 'Av. Corrientes 5000',
        'city': 'Almagro',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'notes': 'Prefers early morning drop-offs.',
        'primary_vet_name': 'General Vet Clinic',
        'emergency_vet_name': 'Emergency Vet Hospital 24/7',
    },
    {
        'email': 'laura.rodriguez@seed.example',
        'first_name': 'Laura',
        'last_name': 'Rodríguez',
        'phone': '+54 11 4000 0005',
        'street': 'Av. Rivadavia 7200',
        'city': 'Flores',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'primary_vet_name': 'Mobile Home Vet',
    },
    {
        'email': 'pedro.sanchez@seed.example',
        'first_name': 'Pedro',
        'last_name': 'Sánchez',
        'phone': '+54 11 4000 0006',
        'street': 'Av. Libertador 2500',
        'city': 'Recoleta',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'primary_vet_name': 'Feline Health Practice',
    },
    {
        'email': 'carolina.ruiz@seed.example',
        'first_name': 'Carolina',
        'last_name': 'Ruiz',
        'phone': '+54 11 4000 0007',
        'street': 'Av. Las Heras 1800',
        'city': 'Recoleta',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'primary_vet_name': 'General Vet Clinic',
    },
    {
        'email': 'diego.torres@seed.example',
        'first_name': 'Diego',
        'last_name': 'Torres',
        'phone': '+54 11 4000 0008',
        'street': 'Av. del Libertador 5500',
        'city': 'Núñez',
        'state': 'CABA',
        'province': 'Buenos Aires',
        'country': 'Argentina',
        'primary_vet_name': 'Exotic Animals Specialist',
        'emergency_vet_name': 'Emergency Vet Hospital 24/7',
    },
]

# Pets are keyed by (owner_email, name). Temperaments and dominance are
# chosen so the fixture exercises the compatibility rules (see
# ``Pet.is_compatible_with`` in ``domain/pets/models.py``).
SEED_PETS: list[dict[str, Any]] = [
    {
        'owner_email': 'ana.garcia@seed.example',
        'name': 'Mía', 'species': 'cat', 'breed': 'Siamese',
        'age': 4, 'temperament': 'calm', 'dominance_level': 3,
        'size': 'small', 'sex': 'female', 'neutered': True,
    },
    {
        'owner_email': 'luis.fernandez@seed.example',
        'name': 'Rocco', 'species': 'dog', 'breed': 'Labrador',
        'age': 6, 'temperament': 'friendly', 'dominance_level': 6,
        'size': 'large', 'sex': 'male', 'neutered': True,
    },
    {
        'owner_email': 'luis.fernandez@seed.example',
        'name': 'Nala', 'species': 'dog', 'breed': 'Golden Retriever',
        'age': 3, 'temperament': 'playful', 'dominance_level': 5,
        'size': 'large', 'sex': 'female', 'neutered': False,
    },
    {
        'owner_email': 'maria.lopez@seed.example',
        'name': 'Luna', 'species': 'dog', 'breed': 'Border Collie',
        'age': 2, 'temperament': 'playful', 'dominance_level': 7,
        'size': 'medium', 'sex': 'female', 'neutered': False,
    },
    {
        'owner_email': 'maria.lopez@seed.example',
        'name': 'Bugs', 'species': 'rabbit', 'breed': 'Lop',
        'age': 1, 'temperament': 'calm', 'dominance_level': 2,
        'size': 'small', 'sex': 'male', 'neutered': False,
        'vet_override_name': 'Exotic Animals Specialist',
    },
    {
        'owner_email': 'jose.martinez@seed.example',
        'name': 'Bruno', 'species': 'dog', 'breed': 'Rottweiler',
        'age': 5, 'temperament': 'aggressive', 'dominance_level': 9,
        'size': 'large', 'sex': 'male', 'neutered': False,
        'special_notes': 'Must be scheduled solo.',
    },
    {
        'owner_email': 'laura.rodriguez@seed.example',
        'name': 'Toby', 'species': 'dog', 'breed': 'Cocker Spaniel',
        'age': 8, 'temperament': 'anxious', 'dominance_level': 3,
        'size': 'medium', 'sex': 'male', 'neutered': True,
        'special_notes': 'Separation anxiety; needs a quiet corner.',
    },
    {
        'owner_email': 'pedro.sanchez@seed.example',
        'name': 'Milo', 'species': 'cat', 'breed': 'Persian',
        'age': 7, 'temperament': 'calm', 'dominance_level': 4,
        'size': 'small', 'sex': 'male', 'neutered': True,
    },
    {
        'owner_email': 'pedro.sanchez@seed.example',
        'name': 'Cleo', 'species': 'cat', 'breed': 'Bengal',
        'age': 3, 'temperament': 'playful', 'dominance_level': 6,
        'size': 'small', 'sex': 'female', 'neutered': True,
    },
    {
        'owner_email': 'carolina.ruiz@seed.example',
        'name': 'Copito', 'species': 'dog', 'breed': 'Poodle',
        'age': 2, 'temperament': 'playful', 'dominance_level': 4,
        'size': 'small', 'sex': 'male', 'neutered': True,
    },
    {
        'owner_email': 'diego.torres@seed.example',
        'name': 'Perico', 'species': 'bird', 'breed': 'Parakeet',
        'age': 2, 'temperament': 'calm', 'dominance_level': 2,
        'size': 'small', 'sex': 'male', 'neutered': False,
        'vet_override_name': 'General Vet Clinic',
    },
    {
        'owner_email': 'diego.torres@seed.example',
        'name': 'Kiki', 'species': 'dog', 'breed': 'Beagle',
        'age': 4, 'temperament': 'friendly', 'dominance_level': 5,
        'size': 'medium', 'sex': 'female', 'neutered': True,
    },
]


def _today() -> date:
    return date.today()


def _seed_vaccinations() -> list[dict[str, Any]]:
    """Computed against today() so dates stay realistic across time."""
    today = _today()
    return [
        {'owner_email': 'luis.fernandez@seed.example', 'pet_name': 'Rocco',
         'vax_type': 'rabies',        'date': today - timedelta(days=90)},
        {'owner_email': 'luis.fernandez@seed.example', 'pet_name': 'Rocco',
         'vax_type': 'distemper',     'date': today - timedelta(days=90)},
        {'owner_email': 'luis.fernandez@seed.example', 'pet_name': 'Nala',
         'vax_type': 'rabies',        'date': today - timedelta(days=45)},
        {'owner_email': 'maria.lopez@seed.example',    'pet_name': 'Luna',
         'vax_type': 'distemper',     'date': today - timedelta(days=200)},
        {'owner_email': 'maria.lopez@seed.example',    'pet_name': 'Luna',
         'vax_type': 'parvovirus',    'date': today - timedelta(days=200)},
        {'owner_email': 'ana.garcia@seed.example',     'pet_name': 'Mía',
         'vax_type': 'rabies',        'date': today - timedelta(days=365)},
        {'owner_email': 'pedro.sanchez@seed.example',  'pet_name': 'Milo',
         'vax_type': 'rabies',        'date': today - timedelta(days=30)},
        {'owner_email': 'pedro.sanchez@seed.example',  'pet_name': 'Cleo',
         'vax_type': 'rabies',        'date': today - timedelta(days=30)},
        {'owner_email': 'diego.torres@seed.example',   'pet_name': 'Kiki',
         'vax_type': 'bordetella',    'date': today - timedelta(days=60)},
        {'owner_email': 'jose.martinez@seed.example',  'pet_name': 'Bruno',
         'vax_type': 'leptospirosis', 'date': today - timedelta(days=15)},
    ]


SEED_MEDICAL_NOTES: list[dict[str, Any]] = [
    {
        'owner_email': 'luis.fernandez@seed.example', 'pet_name': 'Rocco',
        'title': 'Chicken allergy',
        'description': 'Skin reactions to chicken-based kibble. '
                       'Feed fish or lamb only.',
    },
    {
        'owner_email': 'laura.rodriguez@seed.example', 'pet_name': 'Toby',
        'title': 'Separation anxiety',
        'description': 'Triggered by long absences; respond with blanket '
                       'from home and soft music.',
    },
    {
        'owner_email': 'jose.martinez@seed.example', 'pet_name': 'Bruno',
        'title': 'Post-op follow-up',
        'description': 'Stitches removed 2026-02. Watch for inflammation '
                       'on the right hind leg.',
    },
    {
        'owner_email': 'maria.lopez@seed.example', 'pet_name': 'Bugs',
        'title': 'Dietary restriction',
        'description': 'No lettuce; prone to diarrhea. Timothy hay + '
                       'limited pellets only.',
    },
]


def _seed_schedules() -> list[dict[str, Any]]:
    today = _today()
    day = timedelta(days=1)
    return [
        # Past completed
        {
            'owner_email': 'pedro.sanchez@seed.example', 'pet_name': 'Milo',
            'start_date': today - 14 * day, 'end_date': today - 14 * day,
            'start_time': time(9, 0), 'end_time': time(17, 0),
            'status': 'completed', 'notes': 'All-day cat lounge.',
        },
        # Past cancelled
        {
            'owner_email': 'pedro.sanchez@seed.example', 'pet_name': 'Cleo',
            'start_date': today - 7 * day, 'end_date': today - 7 * day,
            'start_time': time(9, 0), 'end_time': time(12, 0),
            'status': 'cancelled',
            'notes': 'Owner cancelled the night before.',
        },
        # Today
        {
            'owner_email': 'ana.garcia@seed.example', 'pet_name': 'Mía',
            'start_date': today, 'end_date': today,
            'start_time': time(9, 0), 'end_time': time(12, 0),
            'status': 'checked_in',
        },
        # Tomorrow — Luis's two dogs, separate time slots.
        {
            'owner_email': 'luis.fernandez@seed.example', 'pet_name': 'Rocco',
            'start_date': today + day, 'end_date': today + day,
            'start_time': time(9, 0), 'end_time': time(13, 0),
            'status': 'scheduled',
        },
        {
            'owner_email': 'luis.fernandez@seed.example', 'pet_name': 'Nala',
            'start_date': today + day, 'end_date': today + day,
            'start_time': time(14, 0), 'end_time': time(18, 0),
            'status': 'scheduled',
        },
        # Next week — María's pets on the same day.
        {
            'owner_email': 'maria.lopez@seed.example', 'pet_name': 'Luna',
            'start_date': today + 7 * day, 'end_date': today + 7 * day,
            'start_time': time(9, 0), 'end_time': time(17, 0),
            'status': 'scheduled',
        },
        {
            'owner_email': 'maria.lopez@seed.example', 'pet_name': 'Bugs',
            'start_date': today + 7 * day, 'end_date': today + 7 * day,
            'start_time': time(9, 0), 'end_time': time(17, 0),
            'status': 'scheduled',
        },
        # Next week — the aggressive pet, scheduled solo.
        {
            'owner_email': 'jose.martinez@seed.example', 'pet_name': 'Bruno',
            'start_date': today + 8 * day, 'end_date': today + 8 * day,
            'start_time': time(9, 0), 'end_time': time(17, 0),
            'status': 'scheduled',
            'notes': 'Scheduled alone — aggressive temperament.',
        },
        # Overlapping pair: Toby (anxious) and Copito (playful). Dominance
        # difference is 1, so they're compatible under rule 5. Intentional
        # negative case for the conflict-detection docs.
        {
            'owner_email': 'laura.rodriguez@seed.example', 'pet_name': 'Toby',
            'start_date': today + 9 * day, 'end_date': today + 9 * day,
            'start_time': time(10, 0), 'end_time': time(15, 0),
            'status': 'scheduled',
        },
        {
            'owner_email': 'carolina.ruiz@seed.example', 'pet_name': 'Copito',
            'start_date': today + 9 * day, 'end_date': today + 9 * day,
            'start_time': time(10, 0), 'end_time': time(15, 0),
            'status': 'scheduled',
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Command implementation
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class _Tally:
    """Per-entity counts reported in the final summary."""
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    deleted: int = 0

    def bump(self, created: bool, updated: bool) -> None:
        if created:
            self.created += 1
        elif updated:
            self.updated += 1
        else:
            self.unchanged += 1


@dataclass
class _Summary:
    users: _Tally = field(default_factory=_Tally)
    vaccination_types: _Tally = field(default_factory=_Tally)
    vets: _Tally = field(default_factory=_Tally)
    owners: _Tally = field(default_factory=_Tally)
    pets: _Tally = field(default_factory=_Tally)
    vaccinations: _Tally = field(default_factory=_Tally)
    medical_notes: _Tally = field(default_factory=_Tally)
    schedules: _Tally = field(default_factory=_Tally)


class Command(BaseCommand):
    help = (
        "Populate the database with a deterministic demo dataset. "
        "Idempotent by default; use --reset to wipe the seeded rows first."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help='Delete the seeded rows (matched by natural key) before re-creating them.',
        )
        parser.add_argument(
            '--allow-production', action='store_true',
            help='Bypass the DEBUG=False safety guard. Intended for staging/demo environments.',
        )
        parser.add_argument(
            '--quiet', action='store_true',
            help='Suppress the per-entity summary line at the end.',
        )

    def handle(self, *args, **options):
        reset = options['reset']
        allow_production = options['allow_production']
        quiet = options['quiet']

        if not settings.DEBUG and not allow_production:
            raise CommandError(
                "Refusing to seed: DEBUG is False. Pass --allow-production to override "
                "(intended for staging/demo environments only)."
            )

        summary = _Summary()

        with transaction.atomic():
            if reset:
                self._reset(summary)

            self._seed_users(summary.users)
            self._seed_vaccination_types(summary.vaccination_types)
            vets_by_name = self._seed_vets(summary.vets)
            owners_by_email = self._seed_owners(summary.owners, vets_by_name)
            pets_by_key = self._seed_pets(summary.pets, owners_by_email, vets_by_name)
            self._seed_vaccinations(summary.vaccinations, pets_by_key)
            self._seed_medical_notes(summary.medical_notes, pets_by_key)
            self._seed_schedules(summary.schedules, pets_by_key)

        if not quiet:
            self._print_summary(summary)

    # ── Reset ──────────────────────────────────────────────────────────────

    def _reset(self, summary: _Summary) -> None:
        """Delete every seed-owned row so the subsequent create phase runs clean.

        Order matters: schedules / vaccinations / medical notes reference pets,
        pets reference owners, so we peel the graph from the outside in.
        """
        seed_owner_emails = [o['email'] for o in SEED_OWNERS]
        seed_pet_keys = [(p['owner_email'], p['name']) for p in SEED_PETS]

        # Resolve seed pets by (owner.email, name) so we can clean dependent rows.
        owner_ids = dict(
            Owner.objects.filter(email__in=seed_owner_emails).values_list('email', 'id')
        )
        seed_pet_ids = []
        for owner_email, pet_name in seed_pet_keys:
            owner_id = owner_ids.get(owner_email)
            if owner_id is None:
                continue
            seed_pet_ids.extend(
                Pet.objects.filter(owner_id=owner_id, name=pet_name).values_list('id', flat=True)
            )

        def _count(qs, label: str) -> int:
            _, by_model = qs.delete()
            return by_model.get(label, 0)

        summary.schedules.deleted = _count(
            Schedule.objects.filter(pet_id__in=seed_pet_ids), 'pets.Schedule',
        )
        summary.vaccinations.deleted = _count(
            Vaccination.objects.filter(pet_id__in=seed_pet_ids), 'pets.Vaccination',
        )
        summary.medical_notes.deleted = _count(
            MedicalNote.objects.filter(pet_id__in=seed_pet_ids), 'pets.MedicalNote',
        )
        summary.pets.deleted = _count(
            Pet.objects.filter(id__in=seed_pet_ids), 'pets.Pet',
        )
        summary.owners.deleted = _count(
            Owner.objects.filter(email__in=seed_owner_emails), 'pets.Owner',
        )
        # Vets are deleted AFTER the owner/pet rows so their SET_NULL FKs are
        # cleared by the preceding owner/pet deletions rather than by the vet
        # delete itself — keeps the per-entity `deleted` counts on the summary
        # attributable to the matching entity rather than to the FK cascade.
        summary.vets.deleted = _count(
            Vet.objects.filter(name__in=[v['name'] for v in SEED_VETS]),
            'pets.Vet',
        )
        summary.vaccination_types.deleted = _count(
            VaccinationType.objects.filter(
                name__in=[v['name'] for v in SEED_VACCINATION_TYPES]
            ),
            'pets.VaccinationType',
        )
        summary.users.deleted = _count(
            User.objects.filter(
                email__in=[u['email'] for u in SEED_USERS]
            ),
            User._meta.label,
        )

    # ── Users ──────────────────────────────────────────────────────────────

    def _seed_users(self, tally: _Tally) -> None:
        for data in SEED_USERS:
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': data.get('role', 'user'),
                },
            )
            updated = False
            if created:
                user.set_password(SEED_USER_PASSWORD)
                user.save()
            else:
                for field_name in ('first_name', 'last_name', 'role'):
                    new_value = data.get(field_name, getattr(user, field_name))
                    if getattr(user, field_name) != new_value:
                        setattr(user, field_name, new_value)
                        updated = True
                if updated:
                    user.save()
            tally.bump(created=created, updated=updated)

    # ── Vaccination types ──────────────────────────────────────────────────

    def _seed_vaccination_types(self, tally: _Tally) -> None:
        for data in SEED_VACCINATION_TYPES:
            obj, created = VaccinationType.objects.get_or_create(
                name=data['name'],
                defaults={'label': data['label'], 'order': data['order'], 'enabled': data['enabled']},
            )
            updated = False
            if not created:
                for field_name in ('label', 'order', 'enabled'):
                    if getattr(obj, field_name) != data[field_name]:
                        setattr(obj, field_name, data[field_name])
                        updated = True
                if updated:
                    obj.save()
            tally.bump(created=created, updated=updated)

    # ── Vets ───────────────────────────────────────────────────────────────

    def _seed_vets(self, tally: _Tally) -> dict[str, Vet]:
        by_name: dict[str, Vet] = {}
        for data in SEED_VETS:
            payload = {k: v for k, v in data.items() if k != 'name'}
            vet, created = Vet.objects.get_or_create(
                name=data['name'], defaults=payload,
            )
            updated = False
            if not created:
                for field_name, new_value in payload.items():
                    if getattr(vet, field_name) != new_value:
                        setattr(vet, field_name, new_value)
                        updated = True
                if updated:
                    vet.save()
            by_name[data['name']] = vet
            tally.bump(created=created, updated=updated)
        return by_name

    # ── Owners ─────────────────────────────────────────────────────────────

    def _seed_owners(
        self,
        tally: _Tally,
        vets_by_name: dict[str, Vet],
    ) -> dict[str, Owner]:
        by_email: dict[str, Owner] = {}
        for data in SEED_OWNERS:
            # Resolve vet FK names into FK ids before composing the payload.
            resolved = dict(data)
            primary_vet = vets_by_name[resolved.pop('primary_vet_name')] if resolved.get('primary_vet_name') else None
            emergency_vet = vets_by_name[resolved.pop('emergency_vet_name')] if resolved.get('emergency_vet_name') else None
            # Drop the *_name sentinels (if they came in as falsy) and the email lookup key.
            resolved.pop('primary_vet_name', None)
            resolved.pop('emergency_vet_name', None)
            payload = {k: v for k, v in resolved.items() if k != 'email'}
            payload['primary_vet'] = primary_vet
            payload['emergency_vet'] = emergency_vet

            owner, created = Owner.objects.get_or_create(
                email=data['email'], defaults=payload,
            )
            updated = False
            if not created:
                for field_name, new_value in payload.items():
                    if getattr(owner, field_name) != new_value:
                        setattr(owner, field_name, new_value)
                        updated = True
                if updated:
                    owner.save()
            by_email[data['email']] = owner
            tally.bump(created=created, updated=updated)
        return by_email

    # ── Pets ───────────────────────────────────────────────────────────────

    def _seed_pets(
        self,
        tally: _Tally,
        owners_by_email: dict[str, Owner],
        vets_by_name: dict[str, Vet],
    ) -> dict[tuple[str, str], Pet]:
        by_key: dict[tuple[str, str], Pet] = {}
        for data in SEED_PETS:
            owner = owners_by_email[data['owner_email']]
            resolved = dict(data)
            vet_override = vets_by_name[resolved.pop('vet_override_name')] if resolved.get('vet_override_name') else None
            resolved.pop('vet_override_name', None)
            payload = {k: v for k, v in resolved.items() if k not in ('owner_email', 'name')}
            payload['vet_override'] = vet_override

            pet, created = Pet.objects.get_or_create(
                owner=owner, name=data['name'], defaults=payload,
            )
            updated = False
            if not created:
                for field_name, new_value in payload.items():
                    if getattr(pet, field_name) != new_value:
                        setattr(pet, field_name, new_value)
                        updated = True
                if updated:
                    pet.save()
            by_key[(data['owner_email'], data['name'])] = pet
            tally.bump(created=created, updated=updated)
        return by_key

    # ── Vaccinations ───────────────────────────────────────────────────────

    def _seed_vaccinations(
        self,
        tally: _Tally,
        pets_by_key: dict[tuple[str, str], Pet],
    ) -> None:
        for data in _seed_vaccinations():
            pet = pets_by_key[(data['owner_email'], data['pet_name'])]
            _, created = Vaccination.objects.get_or_create(
                pet=pet, vax_type=data['vax_type'], date=data['date'],
            )
            tally.bump(created=created, updated=False)

    # ── Medical notes ──────────────────────────────────────────────────────

    def _seed_medical_notes(
        self,
        tally: _Tally,
        pets_by_key: dict[tuple[str, str], Pet],
    ) -> None:
        for data in SEED_MEDICAL_NOTES:
            pet = pets_by_key[(data['owner_email'], data['pet_name'])]
            note, created = MedicalNote.objects.get_or_create(
                pet=pet, title=data['title'],
                defaults={'description': data['description']},
            )
            updated = False
            if not created and note.description != data['description']:
                note.description = data['description']
                note.save(update_fields=['description', 'updated_at'])
                updated = True
            tally.bump(created=created, updated=updated)

    # ── Schedules ──────────────────────────────────────────────────────────

    def _seed_schedules(
        self,
        tally: _Tally,
        pets_by_key: dict[tuple[str, str], Pet],
    ) -> None:
        for data in _seed_schedules():
            pet = pets_by_key[(data['owner_email'], data['pet_name'])]
            payload = {
                'end_date': data['end_date'],
                'end_time': data['end_time'],
                'status': data.get('status', 'scheduled'),
                'notes': data.get('notes', ''),
            }
            obj, created = Schedule.objects.get_or_create(
                pet=pet, start_date=data['start_date'], start_time=data['start_time'],
                defaults=payload,
            )
            updated = False
            if not created:
                for field_name, new_value in payload.items():
                    if getattr(obj, field_name) != new_value:
                        setattr(obj, field_name, new_value)
                        updated = True
                if updated:
                    obj.save()
            tally.bump(created=created, updated=updated)

    # ── Summary ────────────────────────────────────────────────────────────

    def _print_summary(self, summary: _Summary) -> None:
        rows = [
            ('users', summary.users),
            ('vaccination types', summary.vaccination_types),
            ('vets', summary.vets),
            ('owners', summary.owners),
            ('pets', summary.pets),
            ('vaccinations', summary.vaccinations),
            ('medical notes', summary.medical_notes),
            ('schedules', summary.schedules),
        ]
        self.stdout.write(self.style.SUCCESS('Seed complete:'))
        for label, tally in rows:
            self.stdout.write(
                f'  {label:<18} created={tally.created:<3} '
                f'updated={tally.updated:<3} unchanged={tally.unchanged:<3} '
                f'deleted={tally.deleted}'
            )
