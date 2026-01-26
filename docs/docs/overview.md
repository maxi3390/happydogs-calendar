# Overview

## What is Happy Calendar?

Happy Calendar is a comprehensive schedule management system designed specifically for pet nurseries. It provides a robust platform for managing pets, owners, and their schedules while automatically detecting and preventing potential conflicts between incompatible pets based on their behavioral characteristics.

## Key Features

### Pet Management
- **Comprehensive Pet Profiles**: Track detailed information including species, temperament, dominance level, size, breed, age, and special care notes
- **Behavioral Assessment**: Use a 1-10 dominance scale and temperament categories (calm, playful, aggressive, anxious, friendly)
- **Owner Association**: Link pets to their registered owners for streamlined management

### Owner Management
- **Complete Owner Records**: Store contact information, emergency contacts, and address details
- **Pet Relationships**: View all pets associated with an owner
- **Bulk Operations**: Create schedules for all of an owner's pets simultaneously

### Intelligent Scheduling
- **Conflict Detection**: Automatic detection of potential conflicts based on:
  - Aggressive pets cannot be scheduled with others
  - High dominance pets (level > 7) cannot be together
  - Size and dominance combinations that may cause issues
  - Cross-species temperament incompatibilities
  - Anxious pets with highly playful pets under certain conditions
- **Multi-Pet Scheduling**: Batch create schedules for multiple pets with individual conflict checking
- **Status Management**: Track schedules through their lifecycle (Scheduled → Checked In → Completed/Cancelled)

### User Interface
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Multiple Calendar Views**: Monthly overview, weekly detail, and daily schedule panels
- **Visual Conflict Indicators**: Clear warnings for scheduling conflicts
- **Dark Mode Support**: Full dark mode with system preference detection

### Internationalization
- **Multi-Language Support**: English and Spanish translations
- **Dynamic Language Switching**: Real-time UI updates without page refresh
- **Persistent Preferences**: Language choices saved in localStorage

### User Management
- **Role-Based Access Control**: Admin and User roles with different permissions
- **JWT Authentication**: Secure token-based authentication system
- **Profile Management**: User registration, login, password changes, and profile updates
- **Admin Panel**: User management for administrators

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom components
- **Icons**: Lucide React
- **State Management**: React hooks and context
- **Internationalization**: Custom translation system

### Backend
- **Framework**: Django 5.1 with Django REST Framework
- **Database**: PostgreSQL 16
- **Authentication**: JWT tokens with blacklisting
- **API Documentation**: drf-spectacular for OpenAPI 3.0
- **Serialization**: DRF serializers with validation

### Infrastructure
- **Containerization**: Docker and Docker Compose
- **Development**: Hot-reload for both frontend and backend
- **Testing**: Playwright for end-to-end frontend testing
- **Backend Documentation**: [Backend](backend/intro)
- **Frontend Documentation**: [Frontend](frontend/intro)

## System Architecture

The application follows a modern microservices-inspired architecture within a containerized environment:

┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (Next.js)     │◄──►│   (Django)      │
│   Port 3000     │    │   Port 8000     │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                   │
          ┌─────────────────┐
          │   Database      │
          │ (PostgreSQL)    │
          │   Port 5432     │
          └─────────────────┘

### Data Flow

1. **User Interaction**: Users interact with the React frontend through various pages and components
2. **API Requests**: Frontend makes HTTP requests to the Django REST API
3. **Business Logic**: Backend processes requests, validates data, and handles conflict detection
4. **Database Operations**: Data is stored and retrieved from PostgreSQL
5. **Response**: Results are returned to the frontend for display

### Key Components

- **Calendar System**: Handles date/time operations and schedule management
- **Conflict Detection Engine**: Analyzes pet characteristics to prevent incompatible pairings
- **Authentication System**: Manages user sessions and permissions
- **Translation System**: Provides multi-language support
- **Responsive UI**: Adapts to different screen sizes and devices

## Business Logic

### Conflict Detection Rules

The system implements sophisticated rules to ensure pet safety and well-being:

1. **Aggressive Temperament Rule**: Pets marked as aggressive cannot be scheduled with any other pets
2. **Dominance Threshold Rule**: Pets with dominance levels above 7 cannot be scheduled together
3. **Size-Dominance Compatibility Rule**: Large differences in size combined with high dominance differences trigger warnings
4. **Cross-Species Rules**: Certain temperament combinations between different species are incompatible
5. **Behavioral Compatibility Rules**: Anxious pets are protected from highly playful pets under specific dominance conditions

### Scheduling Workflow

1. **Pet Selection**: Choose pets to schedule (single or multiple)
2. **Time Slot Selection**: Pick date and time for the schedule
3. **Conflict Check**: System automatically validates against all rules
4. **Schedule Creation**: If no conflicts, schedule is created with appropriate status
5. **Status Updates**: Track progress through check-in and completion

## Development and Deployment

### Local Development
- **Docker Compose**: Single command to start all services
- **Hot Reload**: Automatic code reloading for both frontend and backend
- **Database Migrations**: Automatic Django migrations on startup
- **API Documentation**: Live Swagger UI and ReDoc interfaces

### Production Considerations
- **Scalability**: Containerized architecture supports horizontal scaling
- **Security**: JWT authentication with token blacklisting
- **Performance**: Optimized database queries and efficient conflict detection algorithms
- **Monitoring**: Comprehensive logging and error handling

## Getting Started

See the [Quick Start Guide](deployment.md) for detailed setup instructions.

## API Reference

Complete API documentation is available at `/api/docs/` when the backend is running.

## Testing

The application includes comprehensive end-to-end tests using Playwright, covering:
- Navigation flows
- Calendar interactions
- Pet management operations
- Scheduling workflows
- Language switching functionality
