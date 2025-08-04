# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform that transforms personal photos and videos into cinematic memory films. It features a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, image reframing tools, and real-time preview capabilities. The platform aims to provide a seamless and intuitive experience for creating and managing cherished memory films.

## Recent Changes (August 2025)
- **IMAGE QUALITY FIX v1.0.117**: Public gallery image quality RESOLVED
- **Root Cause Identified**: Public gallery prioritized 300x200 static thumbnails over high-resolution original images
- **Fix Applied**: Modified both desktop and mobile gallery components to prioritize original high-quality images like admin interface
- **Quality Improvement**: Public gallery now displays same high-resolution images (4032x3024) as admin interface instead of low-quality thumbnails
- **User Experience Enhanced**: Visitors now see crisp, high-quality gallery images matching admin preview quality
- **Admin Interface Cleaned**: Removed debugging popup alerts for smoother admin workflow
- **CRITICAL BREAKTHROUGH v1.0.116**: Alt+Tab scroll navigation issue RESOLVED
- **Complete Field Mapping Audit v1.0.114**: Achieved 100% field synchronization across ALL 7 sections (84 total fields)
- **Cross-Environment Sync Confirmed**: Admin changes properly synchronize between production and preview environments

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with CSS custom properties
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**:
    - **Typography**: Poppins (sans-serif) for general text, Playfair Display (serif) for hero video overlay text.
    - **Color Scheme**: MEMOPYK brand palette (Dark Blue #2A4759, Orange #D67C4A, Navy #011526, Cream #F2EBDC, Sky Blue #89BAD9).
    - **Responsive Design**: Adapts to all screen sizes, including advanced mobile optimizations for gallery, FAQ, video lightbox, and hero sections (e.g., responsive grids, touch-friendly overlays, optimized text sizing, 44px touch targets). Includes progressive web app features like lazy loading, network status detection, and device orientation optimization.
    - **Navigation**: Customer journey-focused anchor-based scrolling navigation on the homepage ("Comment ça marche", "Galerie", "Devis", "Rendez-vous"). Logo acts as home button with language routing.
    - **Image Cropping**: Inline drag-and-reposition interface with real-time visual feedback. Features a dual badge system (✂️ Recadré EN/FR for manual, ✂️ Auto EN/FR for automatic 300x200 thumbnails).
    - **Video Display**: Minimal controls for gallery videos (play/pause, scrubber, volume), 2/3 screen size lightbox with blurred background, no black bars. Hero videos use a cache system for fast loading, while gallery videos stream directly from CDN for reliability.
    - **Admin Interface**: Streamlined content management, professional field labeling, clear visual indicators. Includes a responsive font size system with desktop, tablet, and mobile controls and real-time preview, using CSS clamp().

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL store

### Key Architectural Decisions
- **Hybrid Storage System**: JSON fallback for all data, complementing PostgreSQL. Complete field mapping ensures all 36 database columns sync properly between environments.
- **Universal Video Proxy**: Handles all video serving, range requests, local caching, and fallback to Supabase CDN.
- **Image Proxy**: Manages image loading, resolves CORS issues, prioritizes static cropped images.
- **Cache Management**: Smart caching for hero videos (immediate preload). Gallery videos use direct CDN streaming for production reliability.
- **Bilingual Support**: Comprehensive French/English content management (UI, data, SEO).
- **Modular API Design**: RESTful API for content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of 300x200 static images for gallery thumbnails, ensuring all uploads are auto-processed.
- **Real-time Analytics**: Backend system for tracking visitors, performance, and engagement, with IP management tools.
- **Direct Supabase Upload System**: Bypasses deployment limits for large file uploads.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings.
- **Deployment Optimizations**: Fast health check endpoints (/ and /health), production video cache preloading disabled for faster startup, optimized server timeouts, proper routing priorities to prevent static file serving interference.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting.
- **Supabase**: Used for video and image storage (CDN).

### UI Components
- **Radix UI**: Unstyled, accessible component primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.

### Development Tools
- **Vite**: Frontend build tool.
- **Express.js**: Backend web framework.
- **Drizzle ORM**: Type-safe database ORM.
- **Zod**: Schema validation library.
- **React-Quill**: Rich text editor.
- **DOMPurify**: HTML sanitization library.
- **Crypto-js**: Client-side MD5 hashing.
- **Multer**: Node.js middleware for file uploads.