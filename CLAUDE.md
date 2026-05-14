# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NIE Publication Tracker — a Research Publication Management & Analytics Platform for colleges. A monorepo with a React + Vite frontend and Node.js + Express backend.

## Development Commands

### Root
```bash
npm run install:all     # Install all dependencies (frontend + backend)
npm run dev:frontend    # Start frontend (port 5173)
npm run dev:backend     # Start backend (port 5000)
npm run db:setup        # Prisma generate + push
```

### Backend
```bash
cd backend
npm run dev             # nodemon dev server
npm run db:generate     # Prisma client generation
npm run db:push         # Push schema to DB (no migration)
npm run db:migrate      # Run Prisma migrations
npm run db:studio       # Prisma Studio (GUI)
npm run db:seed         # Seed database
```

### Frontend
```bash
cd frontend
npm run dev             # Vite dev server
npm run build           # Production build
npm run lint            # ESLint
```

## Architecture

### Backend (Node.js + Express, ESM)
- **Routes → Controllers → Services** pattern
- Controllers handle HTTP, services contain business logic, routes define API endpoints under `/api/v1/`
- Prisma ORM with PostgreSQL; schema in `backend/prisma/schema.prisma`
- JWT auth with session blacklisting; `auth.middleware.js` protects routes
- Rate limiting: strict on `/api/v1/auth` (20 req/15min in prod), generous on general API
- Validation via `express-validator` in `src/validations/`
- Excel import uses `multer` + `xlsx` library
- All routes follow: `/api/v1/{resource}`

### Frontend (React 18 + Vite, ESM)
- **React Router 6** with nested routes under `DashboardLayout`
- **ProtectedRoute**, **AdminRoute**, **PublicRoute** wrappers in `App.jsx`
- Admin routes gated to roles: ADMIN, HOD, REVIEWER
- API client in `src/lib/utils.js` (axios-based); services in `src/services/`
- Auth stored in context (`AuthContext.jsx`); theme in `ThemeContext.jsx`
- UI components in `src/components/ui/` (shadcn-style, class-variance-authority)
- Recharts used for analytics; Tailwind CSS + Tailwind Animate for styling

### Database Schema (PostgreSQL via Prisma)
- **User** — roles: ADMIN, HOD, FACULTY, REVIEWER
- **Publication** — tracks status workflow (DRAFT → SUBMITTED → UNDER_REVIEW → ACCEPTED → PUBLISHED); soft-delete with `isDeleted`
- **StatusTransition** — audit trail for publication status changes
- **CoAuthor** — links publications to co-authors (can reference existing users or external names)
- **Review** — reviewer feedback on publications
- **Notification** — user notifications with types (PUBLICATION_SUBMITTED, APPROVED, REJECTED, etc.)
- **ActivityLog** — admin audit log
- **Faculty** — links users to departments

## API Structure

All endpoints prefixed with `/api/v1/`:
- `/auth` — register, login, logout, me, forgot-password
- `/users` — user management
- `/publications` — CRUD + filters/search
- `/departments` — department management
- `/analytics` — dashboard stats, publication/faculty analytics
- `/workflow` — status transitions and reviews
- `/import` — Excel bulk import

## Important Patterns

- Backend uses `src/utils/response.util.js` for consistent API responses `{ success, message, data }`
- Frontend services return data directly (axios interceptor unwraps the response)
- Publications are soft-deleted (`isDeleted` flag), not hard-deleted
- Analytics service aggregates publication data across the institute