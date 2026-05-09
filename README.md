# NIE Publication Tracker

A production-quality Research Publication Management & Analytics Platform for colleges.

## Project Structure

```
nie-publication-tracker/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── layouts/       # Layout components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── routes/        # Route configurations
│   │   ├── context/       # React context providers
│   │   ├── lib/           # Utilities and API client
│   │   └── utils/         # Helper functions
│   └── ...
│
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/         # Utilities
│   │   ├── config/        # Configuration
│   │   └── validations/   # Request validation
│   ├── prisma/            # Database schema
│   └── ...
│
└── README.md
```

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- shadcn/ui components
- React Router 6
- Axios with interceptors
- Recharts for analytics

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Helmet security
- Winston logging

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env from example
cp .env.example .env

# Update DATABASE_URL in .env with your PostgreSQL credentials

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env from example
cp .env.example .env

# Start development server
npm run dev
```

## Features (Phase 1)

### Completed
- [x] Project structure setup
- [x] Database schema with Prisma
- [x] JWT authentication
- [x] Protected routes
- [x] Dark/light mode
- [x] Responsive sidebar navigation
- [x] Dashboard with analytics cards
- [x] Publications management
- [x] Faculty overview
- [x] Analytics dashboard
- [x] API services layer
- [x] Error handling middleware

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Publications
- `GET /api/v1/publications` - List publications
- `GET /api/v1/publications/:id` - Get publication details
- `POST /api/v1/publications` - Create publication
- `PUT /api/v1/publications/:id` - Update publication
- `DELETE /api/v1/publications/:id` - Delete publication

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard stats
- `GET /api/v1/analytics/publications` - Publication analytics
- `GET /api/v1/analytics/faculty` - Faculty analytics

## Database Models

- **User** - Users with roles (ADMIN, HOD, FACULTY, REVIEWER)
- **Publication** - Research publications
- **CoAuthor** - Publication co-authors
- **Department** - Academic departments
- **Faculty** - Faculty-department mapping
- **PublicationMetric** - Analytics metrics
- **ActivityLog** - Audit trail

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/nie_publication_tracker
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

## Design Inspiration

The UI follows a modern SaaS dashboard design inspired by:
- Linear
- Notion
- Vercel Dashboard
- Stripe Dashboard

## License

MIT
