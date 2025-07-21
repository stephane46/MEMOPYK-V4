# MEMOPYK - Replit Project Documentation

## Overview

MEMOPYK is a full-stack memory film platform being rebuilt from scratch. Currently in Phase 1 - minimal React + TypeScript + Vite setup with uploaded MEMOPYK visual assets. The rebuild follows systematic documentation to avoid previous technical failures and implement the complete platform incrementally.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 21, 2025)

### Phase 1 Completed
✓ 1.1 Project Initialization - Basic folder structure created
✓ 1.2 Dependencies Installation - All critical packages verified installed
✓ 1.3a Visual Assets Setup - MEMOPYK assets copied to public directory
✓ 1.3b Missing Radix UI packages installed
✓ 1.4 Configuration Files - TypeScript compilation successful
→ Phase 2: Environment & Infrastructure - Next phase starting

### Completed Tasks Detail
- Project structure: client/, server/, shared/, config files present
- Dependencies: React, Vite, TypeScript, Drizzle, Express, Supabase, Tailwind verified
- Visual assets: Primary logo, favicon, and images copied from MEMOPYK assets folder
- Database schema: Complete MEMOPYK schema with 5 tables (users, memories, mediaFiles, comments, analytics)
- Storage interface: Comprehensive in-memory storage with all CRUD operations
- API routes: Complete REST API with authentication and CRUD operations
- Secrets: SESSION_SECRET, DATABASE_URL, SUPABASE_* added

### Current Status
- Backend API infrastructure complete and type-safe
- All database operations implemented
- Authentication endpoints ready
- Memory, media, comment, and analytics APIs functional
- Health check endpoint available
- Workflow setup will be addressed in systematic rebuild plan

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL store
- **Build Tool**: esbuild for production builds

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express backend application  
├── shared/          # Shared types, schemas, and utilities
├── migrations/      # Database migration files
└── dist/           # Production build output
```

## Key Components

### Database Layer
- **ORM**: Drizzle ORM provides type-safe database operations
- **Schema**: Centralized schema definitions in `shared/schema.ts`
- **Migrations**: Automated database migrations via `drizzle-kit`
- **Connection**: Neon serverless PostgreSQL with connection pooling

### API Layer
- **Framework**: Express.js with TypeScript
- **Routing**: Centralized route registration in `server/routes.ts`
- **Middleware**: Request logging, JSON parsing, error handling
- **Storage Interface**: Abstracted storage layer with in-memory fallback

### Frontend Layer
- **Components**: Comprehensive UI component library from shadcn/ui
- **State Management**: TanStack Query for API state and caching
- **Routing**: Client-side routing (implementation pending)
- **Forms**: React Hook Form with Zod schema validation

### Development Tools
- **Hot Reload**: Vite dev server with HMR support
- **Type Checking**: Strict TypeScript configuration
- **Error Handling**: Runtime error overlay for development
- **Code Quality**: Shared TypeScript configuration across packages

## Data Flow

### Request Lifecycle
1. Client makes HTTP requests to `/api/*` endpoints
2. Express middleware logs requests and handles CORS
3. Route handlers interact with storage interface
4. Storage layer uses Drizzle ORM for database operations
5. Responses are serialized and sent back to client
6. TanStack Query manages client-side caching and state

### Authentication Flow
- Session-based authentication using PostgreSQL session store
- Credentials stored securely with connect-pg-simple
- Session validation middleware (to be implemented)

### Data Validation
- Zod schemas in shared package for consistent validation
- Frontend form validation using React Hook Form resolvers
- Backend request validation using shared schemas

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection**: Via `@neondatabase/serverless` driver
- **Configuration**: Environment variable `DATABASE_URL`

### UI Components
- **Radix UI**: Unstyled, accessible component primitives
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **Replit Integration**: Cartographer plugin for code navigation
- **Error Handling**: Runtime error modal for development
- **Bundle Analysis**: Source maps for debugging

## Deployment Strategy

### Build Process
1. Frontend builds to `dist/public` using Vite
2. Backend builds to `dist/` using esbuild
3. Shared types compiled and included in both builds
4. Static assets served from Express in production

### Environment Configuration
- **Development**: Vite dev server with Express API proxy
- **Production**: Express serves static files and API routes
- **Database**: Automatic migration on deployment via `db:push`

### Hosting Considerations
- **Static Assets**: Served by Express in production
- **API Routes**: Express server handles all `/api/*` requests
- **Database**: Neon serverless PostgreSQL with automatic scaling
- **Sessions**: Persistent session storage in PostgreSQL

### Scripts
- `dev`: Development server with hot reload
- `build`: Production build for both frontend and backend  
- `start`: Production server startup
- `db:push`: Deploy database schema changes

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout the stack, and developer-friendly tooling for rapid iteration.