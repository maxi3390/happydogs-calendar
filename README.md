# Happy Pet Nursery - Schedule Management System

A calendar-based schedule management system for pet nurseries. The system allows you to add pets with their behavioral characteristics (temperament, dominance level) and schedule them while automatically detecting potential conflicts between incompatible pets.

## Features

### Pet Management
Add and manage pets with detailed profiles including:
- **Species**: Dog, cat, bird, rabbit, or other
- **Temperament**: Calm, playful, aggressive, anxious, or friendly
- **Dominance Level**: 1-10 scale for behavioral assessment
- **Size**: Small, medium, or large
- **Breed & Age**: Track breed information and age in years
- **Special Notes**: Additional care instructions or medical notes
- **Owner Association**: Link pets to registered owners

### Owner Management
Complete owner registration system:
- Contact information (name, email, phone, address)
- Emergency contact details
- View all pets associated with an owner
- Quick schedule creation for all owner's pets at once

### Smart Scheduling
Create schedules with automatic conflict detection based on:
- **Aggressive Pets**: Cannot be scheduled with any other pets
- **High Dominance**: Two pets with dominance levels > 7 cannot be together
- **Size + Dominance**: Large size difference (2+ levels) combined with dominance difference ≥ 5 is flagged
- **Cross-Species Temperament**: Certain temperament combinations between different species are incompatible
- **Anxious + Playful**: Anxious pets should not be with highly playful pets if dominance differs by > 4

### Multi-Pet Scheduling
Batch schedule multiple pets at once:
- Filter pets by owner
- Select all or specific pets
- Create schedules for multiple pets with the same time slot
- View success/failure results for each pet
- Automatic conflict detection for each pet

### Calendar Interface
Visual calendar with multiple views:
- **Monthly View**: Overview with schedule count indicators and conflict warnings
- **Weekly View**: Detailed week-by-week schedule display
- **Daily Schedule Panel**: View and manage schedules for selected day
- **Schedule Status Management**: Quick status updates (Scheduled → Checked In → Completed/Cancelled)
- **Conflict Indicators**: Visual warnings for scheduling conflicts

### Responsive Design
Fully responsive interface for all devices:
- **Mobile**: Hamburger menu, compact calendar cells, touch-friendly controls
- **Tablet**: Optimized layout with stacked controls
- **Desktop**: Full-featured side-by-side layout with all details visible

### Internationalization (i18n)
Multi-language support with dynamic language switching:
- **English** (en) - Default
- **Spanish** (es) - Español
- Browser language auto-detection
- Persistent language preference (localStorage)
- Real-time UI updates without page refresh

### Dark Mode
Full dark mode support with system preference detection and manual toggle.

## Tech Stack

- **Frontend**: Next.js 15 with React 19, TypeScript, TailwindCSS, Lucide icons
- **Backend**: Django 5.1 with Django REST Framework
- **Database**: PostgreSQL 16
- **Container**: Docker & Docker Compose
- **Styling**: TailwindCSS with dark mode support

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system

### Running the Application

1. Clone or navigate to the project directory:

```bash
cd happy-calendar
```

2. Start all services with Docker Compose:

```bash
docker-compose up --build
```

3. Wait for all services to start (this may take a few minutes on first run)

4. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000/api/

## API Endpoints

### Pets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pets/` | List all pets |
| POST | `/api/pets/` | Create a new pet |
| GET | `/api/pets/{id}/` | Get pet details |
| PATCH | `/api/pets/{id}/` | Update a pet |
| DELETE | `/api/pets/{id}/` | Delete a pet |
| GET | `/api/pets/{id}/compatibility/` | Check compatibility with other pets |

### Owners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/owners/` | List all owners |
| POST | `/api/owners/` | Create a new owner |
| GET | `/api/owners/{id}/` | Get owner details |
| PATCH | `/api/owners/{id}/` | Update an owner |
| DELETE | `/api/owners/{id}/` | Delete an owner |
| GET | `/api/owners/{id}/with_pets/` | Get owner with all their pets |

### Schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedules/` | List schedules (supports filters: date, start_date, end_date, pet_id, status) |
| POST | `/api/schedules/` | Create a new schedule |
| GET | `/api/schedules/{id}/` | Get schedule details |
| PATCH | `/api/schedules/{id}/` | Update a schedule |
| DELETE | `/api/schedules/{id}/` | Delete a schedule |
| POST | `/api/schedules/check_conflicts/` | Check for conflicts before creating |
| GET | `/api/schedules/daily_summary/?date=YYYY-MM-DD` | Get daily summary |
| POST | `/api/schedules/batch_create/` | Create schedules for multiple pets at once |

### Translations (i18n)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/translations/{language}/` | Get all translations for a language (en, es) |
| GET | `/api/translations/` | Get default translations (English) |
| GET | `/api/languages/` | Get list of available languages |

## Conflict Detection Rules

The system automatically detects potential conflicts when scheduling pets together:

1. **Aggressive Pets**: Pets with "aggressive" temperament cannot be scheduled with any other pets
2. **High Dominance**: Two pets with dominance levels > 7 cannot be together
3. **Size + Dominance**: Large size difference (2+ levels) combined with dominance difference >= 5 is flagged
4. **Cross-Species Temperament**: Certain temperament combinations between different species are incompatible
5. **Anxious + Playful**: Anxious pets should not be with highly playful pets if dominance differs by > 4

## Project Structure

```
happy-calendar/
├── backend/
│   ├── nursery/              # Django project settings
│   │   ├── settings.py       # Django configuration
│   │   └── urls.py           # URL routing
│   ├── pets/                 # Main application
│   │   ├── models.py         # Pet, Owner, Schedule models
│   │   ├── serializers.py    # DRF serializers
│   │   ├── views.py          # API views and viewsets
│   │   └── urls.py           # API URL routing
│   ├── translations/         # i18n translation files
│   │   ├── en.json           # English translations
│   │   └── es.json           # Spanish translations
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── page.tsx      # Main calendar page
│   │   │   ├── pets/         # Pets management page
│   │   │   ├── owners/       # Owners management page
│   │   │   └── layout.tsx    # Root layout with providers
│   │   ├── components/       # React components
│   │   │   ├── Calendar.tsx          # Monthly calendar view
│   │   │   ├── WeekView.tsx          # Weekly schedule view
│   │   │   ├── DaySchedule.tsx       # Daily schedule panel
│   │   │   ├── ScheduleForm.tsx      # Single schedule creation
│   │   │   ├── MultiPetScheduleForm.tsx  # Batch scheduling
│   │   │   ├── PetForm.tsx           # Pet creation/editing
│   │   │   ├── PetList.tsx           # Pet listing component
│   │   │   ├── OwnerForm.tsx         # Owner creation/editing
│   │   │   ├── OwnerList.tsx         # Owner listing component
│   │   │   ├── LanguageSwitcher.tsx  # Language selector
│   │   │   └── ThemeToggle.tsx       # Dark mode toggle
│   │   └── lib/
│   │       ├── api.ts            # API client and types
│   │       └── translations.tsx  # i18n context and hooks
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
└── docker-compose.yml
```

## Development

### Backend Development

The backend uses Django with hot-reload enabled. Changes to Python files will automatically restart the server.

```bash
# Access Django shell
docker-compose exec backend python manage.py shell

# Create superuser for admin access
docker-compose exec backend python manage.py createsuperuser

# Run migrations
docker-compose exec backend python manage.py migrate

# View logs
docker-compose logs -f backend
```

Admin panel is available at: http://localhost:8000/admin/

### Frontend Development

The frontend is built with Next.js in standalone mode for production. For development with hot-reload, you can modify the docker-compose.yml to use `npm run dev` instead.

```bash
# View frontend logs
docker-compose logs -f frontend

# Rebuild frontend after changes
docker-compose build frontend
docker-compose up -d frontend
```

### Adding New Translations

1. Edit the translation files in `backend/translations/`:
   - `en.json` for English
   - `es.json` for Spanish

2. Add new keys following the nested structure:
```json
{
  "section": {
    "key": "Translation text"
  }
}
```

3. Use translations in React components:
```tsx
import { useTranslation } from '@/lib/translations';

function MyComponent() {
  const { t } = useTranslation();
  return <p>{t('section.key')}</p>;
}
```

4. For dynamic values, use interpolation:
```tsx
// Translation: "Hello, {name}!"
t('greeting', { name: 'John' })  // "Hello, John!"
```

## Environment Variables

### Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000/api` |

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Django debug mode | `True` |
| `DATABASE_URL` | PostgreSQL connection string | (from docker-compose) |

## Stopping the Application

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

## Screenshots

### Main Calendar View
The main interface shows a monthly calendar with schedule indicators and a daily schedule panel.

### Multi-Pet Scheduling
Batch create schedules for multiple pets with owner filtering and conflict detection.

### Responsive Mobile View
Fully responsive design with hamburger menu and optimized touch controls.

## License

MIT
