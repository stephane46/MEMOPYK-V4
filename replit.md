# MEMOPYK - Replit Project Documentation

## Overview

MEMOPYK is a full-stack memory film platform being rebuilt from scratch. Currently in Phase 1 - minimal React + TypeScript + Vite setup with uploaded MEMOPYK visual assets. The rebuild follows systematic documentation to avoid previous technical failures and implement the complete platform incrementally.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 22, 2025)

### Completed Phases
✓ Phase 1: Foundation Setup (4/4 checkpoints) - Project structure, dependencies, assets
✓ Phase 2: Environment & Infrastructure (2/2 checkpoints) - Secrets, database connections
✓ Phase 3.1: Database Schema Creation - 12 tables with bilingual structure
✓ Phase 3.2: Hybrid Storage System - JSON fallback with sample content
✓ Phase 4.1: Backend API Layer - 13 bilingual REST endpoints operational
✓ Phase 4.2: Analytics API Implementation - 8 analytics endpoints with tracking
✓ Phase 4.3: Video Proxy System - Supabase CDN streaming with range requests
→ Phase 5: Frontend Implementation - Ready to proceed

### Completed Tasks Detail
- Project structure: client/, server/, shared/, config files present
- Dependencies: React, Vite, TypeScript, Drizzle, Express, Supabase, Tailwind verified
- Visual assets: Primary logo, favicon, and images copied from MEMOPYK assets folder
- Database schema: 12 tables with bilingual French/English content structure
- Hybrid storage: server/hybrid-storage.ts with 9 JSON files containing sample bilingual content
- API endpoints: 13 REST endpoints serving bilingual MEMOPYK platform content
- Content management: Hero videos, gallery, FAQs, contacts, legal docs, CTA, SEO settings
- Secrets: SESSION_SECRET, DATABASE_URL, SUPABASE_* added and verified

### Current Status
- Phase 1 Foundation Setup: 100% complete (4/4 checkpoints)
- Phase 2 Environment & Infrastructure: 100% complete (2/2 checkpoints)  
- Phase 3.1 Database Schema Creation: 100% complete
- Phase 3.2 Hybrid Storage System: 100% complete
- Phase 4.1 Backend API Layer Implementation: 100% complete
- Phase 4.2 Analytics API Implementation: Code complete, testing required
- Phase 4.3 Video Proxy System: Code complete, testing required
- Database connections: PostgreSQL 15.8 + Supabase API with 3 storage buckets verified
- Database schema: 12 tables verified with bilingual French/English content structure
- Hybrid storage system: JSON fallback files created with sample bilingual content
- API endpoints: 23 REST endpoints - content (11), analytics (8), video proxy (2), system (2)
- Analytics system: Dashboard, tracking, export, configuration with bilingual support
- Video streaming: Supabase CDN proxy with CORS and HTTP 206 range request support
- Content ready: Wedding/family gallery samples, pricing FAQs, legal documents
- Ready for Phase 5: Frontend Implementation

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