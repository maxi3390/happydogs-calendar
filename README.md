# Happy Pet Nursery - Schedule Management System

A calendar-based schedule management system for pet nurseries. The system allows you to add pets with their behavioral characteristics (temperament, dominance level) and schedule them while automatically detecting potential conflicts between incompatible pets.

## Features

- **Pet Management**: Add and manage pets with detailed profiles including:
  - Species (dog, cat, bird, rabbit, other)
  - Temperament (calm, playful, aggressive, anxious, friendly)
  - Dominance level (1-10 scale)
  - Size (small, medium, large)
  - Owner information

- **Smart Scheduling**: Create schedules with automatic conflict detection based on:
  - Aggressive pets cannot be scheduled with others
  - Two highly dominant pets (>7) cannot be together
  - Large size differences with significant dominance differences are flagged
  - Incompatible temperaments between different species are detected
  - Anxious pets are protected from highly playful pets with dominance differences

- **Calendar Interface**: Visual calendar with:
  - Monthly view with schedule indicators
  - Conflict warnings displayed on calendar days
  - Daily schedule details view
  - Quick status updates for schedules

## Tech Stack

- **Frontend**: Next.js 15 with React 19, TailwindCSS, Lucide icons
- **Backend**: Django 5.1 with Django REST Framework
- **Database**: PostgreSQL 16
- **Container**: Docker & Docker Compose

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
- `GET /api/pets/` - List all pets
- `POST /api/pets/` - Create a new pet
- `GET /api/pets/{id}/` - Get pet details
- `PATCH /api/pets/{id}/` - Update a pet
- `DELETE /api/pets/{id}/` - Delete a pet
- `GET /api/pets/{id}/compatibility/` - Check compatibility with other pets

### Schedules
- `GET /api/schedules/` - List schedules (supports filters: date, start_date, end_date, pet_id, status)
- `POST /api/schedules/` - Create a new schedule
- `GET /api/schedules/{id}/` - Get schedule details
- `PATCH /api/schedules/{id}/` - Update a schedule
- `DELETE /api/schedules/{id}/` - Delete a schedule
- `POST /api/schedules/check_conflicts/` - Check for conflicts before creating
- `GET /api/schedules/daily_summary/?date=YYYY-MM-DD` - Get daily summary

## Conflict Detection Rules

The system automatically detects potential conflicts when scheduling pets together:

1. **Aggressive Pets**: Pets with "aggressive" temperament cannot be scheduled with any other pets
2. **High Dominance**: Two pets with dominance levels > 7 cannot be together
3. **Size + Dominance**: Large size difference (2+ levels) combined with dominance difference >= 5 is flagged
4. **Cross-Species Temperament**: Certain temperament combinations between different species are incompatible
5. **Anxious + Playful**: Anxious pets should not be with highly playful pets if dominance differs by > 4

## Development

### Backend Development

The backend uses Django with hot-reload enabled. Changes to Python files will automatically restart the server.

```bash
# Access Django shell
docker-compose exec backend python manage.py shell

# Create superuser for admin access
docker-compose exec backend python manage.py createsuperuser
```

Admin panel is available at: http://localhost:8000/admin/

### Frontend Development

The frontend is built with Next.js in standalone mode for production. For development with hot-reload, you can modify the docker-compose.yml to use `npm run dev` instead.

## Stopping the Application

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

## License

MIT
