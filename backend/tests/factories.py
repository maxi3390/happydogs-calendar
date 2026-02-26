from datetime import date, time, timedelta
from django.contrib.auth import get_user_model
from pets.models import Owner, Pet, Schedule, Vaccination, VaccinationType

User = get_user_model()

# ── Counter for unique emails ──────────────────────────────────────────────
_counter = 0


def _next_id():
    global _counter
    _counter += 1
    return _counter


# ── User factories ─────────────────────────────────────────────────────────

def create_user(email=None, password='TestPass123!', **kwargs):
    kwargs.setdefault('first_name', 'Test')
    kwargs.setdefault('last_name', 'User')
    if email is None:
        email = f'user{_next_id()}@example.com'
    return User.objects.create_user(email=email, password=password, **kwargs)


def create_admin(email=None, password='AdminPass123!', **kwargs):
    kwargs.setdefault('first_name', 'Admin')
    kwargs.setdefault('last_name', 'User')
    kwargs['role'] = 'admin'
    if email is None:
        email = f'admin{_next_id()}@example.com'
    return User.objects.create_user(email=email, password=password, **kwargs)


# ── Owner factory ──────────────────────────────────────────────────────────

def create_owner(**kwargs):
    n = _next_id()
    kwargs.setdefault('first_name', f'Owner{n}')
    kwargs.setdefault('last_name', f'Last{n}')
    kwargs.setdefault('email', f'owner{n}@example.com')
    kwargs.setdefault('phone', f'555-{n:04d}')
    return Owner.objects.create(**kwargs)


# ── Pet factory ────────────────────────────────────────────────────────────

def create_pet(owner=None, **kwargs):
    kwargs.setdefault('name', f'Pet{_next_id()}')
    kwargs.setdefault('species', 'dog')
    kwargs.setdefault('breed', 'Mixed')
    kwargs.setdefault('age', 3)
    kwargs.setdefault('temperament', 'friendly')
    kwargs.setdefault('dominance_level', 5)
    kwargs.setdefault('size', 'medium')
    if owner is not None:
        kwargs['owner'] = owner
    return Pet.objects.create(**kwargs)


# ── Schedule factory ───────────────────────────────────────────────────────

def create_schedule(pet=None, **kwargs):
    if pet is None:
        pet = create_pet()
    today = date.today()
    kwargs.setdefault('start_date', today)
    kwargs.setdefault('end_date', today)
    kwargs.setdefault('start_time', time(9, 0))
    kwargs.setdefault('end_time', time(17, 0))
    kwargs.setdefault('status', 'scheduled')
    return Schedule.objects.create(pet=pet, **kwargs)


# ── VaccinationType factory ────────────────────────────────────────────────

def create_vaccination_type(**kwargs):
    n = _next_id()
    kwargs.setdefault('name', f'vax_{n}')
    kwargs.setdefault('label', f'Vaccination {n}')
    kwargs.setdefault('enabled', True)
    kwargs.setdefault('order', n)
    return VaccinationType.objects.create(**kwargs)


# ── Vaccination factory ────────────────────────────────────────────────────

def create_vaccination(pet=None, **kwargs):
    if pet is None:
        pet = create_pet()
    kwargs.setdefault('vax_type', 'rabies')
    kwargs.setdefault('date', date.today())
    return Vaccination.objects.create(pet=pet, **kwargs)


# ── Auth helpers ───────────────────────────────────────────────────────────

def get_auth_header(client, user=None, password='TestPass123!'):
    """Authenticate user via login endpoint and return Authorization header dict."""
    if user is None:
        user = create_user(password=password)
    from django.urls import reverse
    resp = client.post(reverse('login'), {
        'email': user.email,
        'password': password,
    }, format='json')
    token = resp.data['tokens']['access']
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


def auth_client(client, user=None, password='TestPass123!'):
    """Set credentials on the client for subsequent requests."""
    if user is None:
        user = create_user(password=password)
    from django.urls import reverse
    resp = client.post(reverse('login'), {
        'email': user.email,
        'password': password,
    }, format='json')
    token = resp.data['tokens']['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user
