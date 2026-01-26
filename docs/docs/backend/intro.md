# Backend Architecture

## Overview

The backend is built using Django 5.1 with Django REST Framework (DRF), providing a robust REST API for the Happy Calendar application. It handles all business logic, data validation, authentication, and conflict detection algorithms.

## Core Technologies

- **Django 5.1**: Web framework with ORM and admin interface
- **Django REST Framework**: API toolkit for building RESTful APIs
- **PostgreSQL**: Primary database for data persistence
- **JWT Authentication**: Token-based authentication with blacklisting
- **OpenAPI Documentation**: drf-spectacular for automatic API docs
- **CORS Support**: Cross-origin resource sharing for frontend integration

## Application Structure

The backend is organized into Django apps, each handling specific domains:

```
backend/
├── nursery/                 # Main Django project
│   ├── settings.py         # Configuration and settings
│   ├── urls.py             # URL routing configuration
│   ├── wsgi.py             # WSGI application entry point
│   └── asgi.py             # ASGI application entry point
├── accounts/                # User authentication and management
│   ├── models.py           # Custom User model
│   ├── views.py            # Authentication views
│   ├── serializers.py      # User serialization
│   └── urls.py             # Auth URL patterns
├── pets/                    # Pet and owner management
│   ├── models.py           # Pet, Owner, Schedule models
│   ├── views.py            # API viewsets
│   ├── serializers.py      # Model serializers
│   ├── urls.py             # API URL patterns
│   └── utils.py            # Conflict detection logic
├── translations/            # Internationalization
│   ├── en.json             # English translations
│   ├── es.json             # Spanish translations
│   └── views.py            # Translation API
├── Dockerfile              # Container configuration
├── manage.py               # Django management commands
└── requirements.txt        # Python dependencies
```

## Django Configuration

### Settings Structure

The settings are organized for different environments with environment variable support:

```python
# Core Django settings
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']  # Configure properly for production

# Installed applications
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    # Local apps
    'accounts',
    'pets',
]
```

### Database Configuration

PostgreSQL is used as the primary database with connection pooling:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'nursery'),
        'USER': os.environ.get('POSTGRES_USER', 'nursery'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'nursery'),
        'HOST': os.environ.get('POSTGRES_HOST', 'db'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}
```

### REST Framework Configuration

DRF is configured with JWT authentication and OpenAPI documentation:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

## Data Models

### User Model (Custom)

Extends Django's AbstractUser with role-based permissions:

```python
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('user', 'User'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def is_admin(self):
        return self.role == 'admin'
```

### Pet Model

Comprehensive pet profile with behavioral characteristics:

```python
class Pet(models.Model):
    SPECIES_CHOICES = [
        ('dog', 'Dog'),
        ('cat', 'Cat'),
        ('bird', 'Bird'),
        ('rabbit', 'Rabbit'),
        ('other', 'Other'),
    ]
    TEMPERAMENT_CHOICES = [
        ('calm', 'Calm'),
        ('playful', 'Playful'),
        ('aggressive', 'Aggressive'),
        ('anxious', 'Anxious'),
        ('friendly', 'Friendly'),
    ]
    SIZE_CHOICES = [
        ('small', 'Small'),
        ('medium', 'Medium'),
        ('large', 'Large'),
    ]

    name = models.CharField(max_length=100)
    species = models.CharField(max_length=20, choices=SPECIES_CHOICES)
    breed = models.CharField(max_length=100, blank=True)
    age = models.PositiveIntegerField()
    size = models.CharField(max_length=10, choices=SIZE_CHOICES)
    temperament = models.CharField(max_length=20, choices=TEMPERAMENT_CHOICES)
    dominance_level = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    special_notes = models.TextField(blank=True)
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name='pets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
```

### Owner Model

Owner information with contact details:

```python
class Owner(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    emergency_contact = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
```

### Schedule Model

Schedule entries with status tracking:

```python
class Schedule(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('checked_in', 'Checked In'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='schedules')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_schedules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['start_time', 'end_time']),
            models.Index(fields=['pet', 'start_time']),
        ]

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError('End time must be after start time')
```

## Conflict Detection System

### Core Algorithm

The conflict detection is implemented in `pets/utils.py` with a comprehensive rule engine:

```python
def check_pet_compatibility(pet1: Pet, pet2: Pet) -> List[str]:
    """
    Check compatibility between two pets based on multiple rules.
    Returns a list of conflict messages.
    """
    conflicts = []

    # Rule 1: Aggressive pets cannot be with others
    if pet1.temperament == 'aggressive' or pet2.temperament == 'aggressive':
        conflicts.append("Aggressive pets cannot be scheduled with other pets")

    # Rule 2: High dominance pets cannot be together
    if pet1.dominance_level > 7 and pet2.dominance_level > 7:
        conflicts.append("Two pets with high dominance levels cannot be together")

    # Rule 3: Size and dominance combination
    size_diff = abs(SIZE_ORDER[pet1.size] - SIZE_ORDER[pet2.size])
    dominance_diff = abs(pet1.dominance_level - pet2.dominance_level)

    if size_diff >= 2 and dominance_diff >= 5:
        conflicts.append("Large size difference with high dominance difference may cause issues")

    # Rule 4: Cross-species temperament rules
    if pet1.species != pet2.species:
        if _check_cross_species_conflict(pet1, pet2):
            conflicts.append("Cross-species temperament combination is incompatible")

    # Rule 5: Anxious and playful combination
    if ((pet1.temperament == 'anxious' and pet2.temperament == 'playful') or
        (pet2.temperament == 'anxious' and pet1.temperament == 'playful')):
        anxious_pet = pet1 if pet1.temperament == 'anxious' else pet2
        playful_pet = pet2 if pet2.temperament == 'playful' else pet1

        if dominance_diff > 4:
            conflicts.append("Anxious pets should not be with highly playful pets when dominance levels differ significantly")

    return conflicts
```

### Batch Conflict Checking

For multi-pet scheduling, the system checks all pet combinations:

```python
def check_schedule_conflicts(pets: List[Pet], start_time: datetime, end_time: datetime) -> Dict[str, List[str]]:
    """
    Check for conflicts when scheduling multiple pets together.
    Returns a dictionary mapping pet names to their conflict lists.
    """
    conflicts = {}

    # Check each pet against all others
    for i, pet1 in enumerate(pets):
        pet_conflicts = []
        for j, pet2 in enumerate(pets):
            if i != j:  # Don't check pet against itself
                pet_conflicts.extend(check_pet_compatibility(pet1, pet2))

        # Check for existing schedules at the same time
        overlapping_schedules = Schedule.objects.filter(
            pet=pet1,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exclude(status='cancelled')

        if overlapping_schedules.exists():
            pet_conflicts.append("Pet already has a schedule at this time")

        if pet_conflicts:
            conflicts[pet1.name] = list(set(pet_conflicts))  # Remove duplicates

    return conflicts
```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login with JWT tokens
- `POST /api/auth/logout/` - Logout with token blacklisting
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/profile/` - Get current user profile
- `PATCH /api/auth/profile/` - Update user profile
- `PUT /api/auth/change-password/` - Change password

### Pet Management

- `GET /api/pets/` - List pets (with filtering)
- `POST /api/pets/` - Create new pet
- `GET /api/pets/{id}/` - Get pet details
- `PATCH /api/pets/{id}/` - Update pet
- `DELETE /api/pets/{id}/` - Delete pet
- `GET /api/pets/{id}/compatibility/` - Check compatibility with other pets

### Owner Management

- `GET /api/owners/` - List owners
- `POST /api/owners/` - Create owner
- `GET /api/owners/{id}/` - Get owner details
- `PATCH /api/owners/{id}/` - Update owner
- `DELETE /api/owners/{id}/` - Delete owner
- `GET /api/owners/{id}/with_pets/` - Get owner with all pets

### Schedule Management

- `GET /api/schedules/` - List schedules (with date filters)
- `POST /api/schedules/` - Create schedule
- `GET /api/schedules/{id}/` - Get schedule details
- `PATCH /api/schedules/{id}/` - Update schedule
- `DELETE /api/schedules/{id}/` - Delete schedule
- `POST /api/schedules/check_conflicts/` - Check conflicts before scheduling
- `GET /api/schedules/daily_summary/?date=YYYY-MM-DD` - Get daily schedule summary
- `POST /api/schedules/batch_create/` - Create multiple schedules

### Translation Endpoints

- `GET /api/translations/{language}/` - Get translations for language
- `GET /api/translations/` - Get default (English) translations
- `GET /api/languages/` - Get available languages

### Admin Endpoints

- `GET /api/users/` - List all users (admin only)
- `GET /api/users/{id}/` - Get user details (admin only)
- `PATCH /api/users/{id}/` - Update user role/status (admin only)
- `DELETE /api/users/{id}/` - Delete user (admin only)

## Serialization

### Pet Serializer

```python
class PetSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    age_display = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'species', 'breed', 'age', 'age_display',
            'size', 'temperament', 'dominance_level', 'special_notes',
            'owner', 'owner_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_age_display(self, obj):
        if obj.age == 1:
            return "1 year old"
        return f"{obj.age} years old"

    def validate_dominance_level(self, value):
        if not 1 <= value <= 10:
            raise serializers.ValidationError("Dominance level must be between 1 and 10")
        return value
```

### Schedule Serializer with Validation

```python
class ScheduleSerializer(serializers.ModelSerializer):
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    owner_name = serializers.CharField(source='pet.owner.name', read_only=True)
    conflicts = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id', 'start_time', 'end_time', 'status', 'pet', 'pet_name',
            'owner_name', 'created_by', 'conflicts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_conflicts(self, obj):
        # Check conflicts for this schedule
        return check_schedule_conflicts([obj.pet], obj.start_time, obj.end_time)

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError("End time must be after start time")

            # Check for conflicts
            pet = data.get('pet')
            if pet:
                conflicts = check_schedule_conflicts([pet], start_time, end_time)
                if conflicts:
                    raise serializers.ValidationError({
                        'conflicts': conflicts
                    })

        return data
```

## Authentication & Permissions

### Custom Permissions

```python
class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow read access to all users, write access to admins only.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_admin()

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allow access to pet/owner data for owners or admins.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin():
            return True

        # For pet objects, check if user owns the pet's owner
        if hasattr(obj, 'owner'):
            return obj.owner.user == request.user
        return False
```

### JWT Configuration

The JWT setup provides secure token-based authentication:

- Access tokens: 60 minutes lifetime
- Refresh tokens: 7 days lifetime
- Automatic token rotation
- Token blacklisting on logout
- Bearer token authentication

## Internationalization

### Translation Files Structure

Translations are stored in JSON files with nested structure:

```json
// backend/translations/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "pets": {
    "name": "Name",
    "species": "Species",
    "temperament": "Temperament",
    "dominanceLevel": "Dominance Level"
  },
  "validation": {
    "required": "This field is required",
    "invalidEmail": "Please enter a valid email address"
  }
}
```

### API Response

```python
class TranslationView(APIView):
    def get(self, request, language):
        try:
            with open(f'translations/{language}.json', 'r') as f:
                translations = json.load(f)
            return Response(translations)
        except FileNotFoundError:
            return Response(
                {'error': f'Translations for language {language} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
```

## Database Optimization

### Indexes

Critical indexes are defined on frequently queried fields:

```python
class Meta:
    indexes = [
        models.Index(fields=['start_time', 'end_time']),
        models.Index(fields=['pet', 'start_time']),
        models.Index(fields=['status']),
    ]
```

### Query Optimization

Views use `select_related` and `prefetch_related` for efficient queries:

```python
def get_queryset(self):
    return Schedule.objects.select_related(
        'pet', 'pet__owner', 'created_by'
    ).prefetch_related('pet__schedules')
```

## Error Handling

### Custom Exception Handler

```python
def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data['status_code'] = response.status_code
        response.data['detail'] = response.data.get('detail', str(exc))

    return response
```

### Validation Errors

Serializers provide detailed validation with field-specific error messages:

```python
{
  "dominance_level": ["Dominance level must be between 1 and 10"],
  "start_time": ["Start time cannot be in the past"],
  "conflicts": {
    "Fluffy": ["Aggressive pets cannot be scheduled with other pets"]
  }
}
```

## Testing

### Model Tests

```python
class PetModelTest(TestCase):
    def setUp(self):
        self.owner = Owner.objects.create(name="John Doe", email="john@example.com")
        self.pet = Pet.objects.create(
            name="Fluffy",
            species="dog",
            age=3,
            size="medium",
            temperament="friendly",
            dominance_level=5,
            owner=self.owner
        )

    def test_pet_creation(self):
        self.assertEqual(self.pet.name, "Fluffy")
        self.assertEqual(self.pet.owner.name, "John Doe")

    def test_dominance_level_validation(self):
        with self.assertRaises(ValidationError):
            Pet.objects.create(
                name="Bad Dog",
                species="dog",
                age=2,
                size="large",
                temperament="aggressive",
                dominance_level=15,  # Invalid
                owner=self.owner
            )
```

### API Tests

```python
class PetAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

    def test_pet_list(self):
        response = self.client.get('/api/pets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pet_create(self):
        data = {
            'name': 'New Pet',
            'species': 'cat',
            'age': 2,
            'size': 'small',
            'temperament': 'calm',
            'dominance_level': 3,
            'owner': self.owner.id
        }
        response = self.client.post('/api/pets/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

## Deployment

### Docker Configuration

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "nursery.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Environment Variables

- `DEBUG`: Enable/disable debug mode
- `DJANGO_SECRET_KEY`: Secret key for Django
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_HOST`: Database host
- `POSTGRES_PORT`: Database port

## Performance Monitoring

### Query Optimization

The application uses Django Debug Toolbar in development and implements query optimization:

- N+1 query prevention with `select_related` and `prefetch_related`
- Database indexing on critical fields
- Efficient conflict detection algorithms
- Caching for translation data

### Scalability Considerations

- Stateless API design for horizontal scaling
- Database connection pooling
- Background task processing for heavy operations
- CDN integration for static assets

## Security Measures

### Authentication Security
- JWT token expiration and refresh
- Password hashing with Django's auth system
- Token blacklisting for secure logout

### API Security
- CORS configuration
- Input validation and sanitization
- SQL injection prevention through ORM
- Rate limiting (recommended)

### Data Protection
- Secure database connections
- Audit logging for sensitive operations
- Data encryption at rest (recommended for production)

This backend architecture provides a solid foundation for the pet nursery scheduling system, with comprehensive business logic, security measures, and scalability considerations.
