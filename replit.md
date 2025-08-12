# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform that transforms personal photos and videos into cinematic memory films. Its core purpose is to provide a seamless and intuitive experience for creating and managing cherished memory films. Key capabilities include a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing tools, and real-time preview. The project aims to capture a niche market for personalized, high-quality video memories.

## User Preferences
Preferred communication style: Simple, everyday language.
Visual consistency priority: Extremely detail-oriented about spacing and formatting consistency between admin interface and published pages.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: shadcn/ui (built on Radix UI).
- **Styling**: Tailwind CSS with CSS custom properties.
- **State Management**: TanStack Query.
- **Form Handling**: React Hook Form with Zod validation.
- **UI/UX Decisions**:
    - **Typography**: Poppins for general text, Playfair Display for hero video overlay text.
    - **Color Scheme**: MEMOPYK brand palette (Dark Blue #2A4759, Orange #D67C4A, Navy #011526, Cream #F2EBDC, Sky Blue #89BAD9).
    - **Responsive Design**: Adaptive to all screen sizes, including advanced mobile optimizations (responsive grids, touch-friendly overlays, optimized text sizing, 44px touch targets) and PWA features.
    - **Navigation**: Customer journey-focused anchor-based scrolling on the homepage. Logo acts as home button with language routing.
    - **Image Cropping**: Inline drag-and-reposition interface with real-time visual feedback and a dual badge system for manual/automatic crops.
    - **Video Display**: Minimal controls for gallery videos, 2/3 screen size lightbox with blurred background. Hero videos use a cache system for fast loading; gallery videos stream directly from CDN.
    - **Admin Interface**: Streamlined content management, professional field labeling, clear visual indicators, responsive font size system with real-time preview.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Database Provider**: Neon Database (serverless PostgreSQL).
- **Session Management**: Express sessions with PostgreSQL store.

### Key Architectural Decisions
- **Hybrid Storage System**: JSON fallback for all data, complementing PostgreSQL for data persistence and synchronization.
- **Universal Video Proxy**: Manages video serving, range requests, local caching, and fallback to Supabase CDN.
- **Image Proxy**: Handles image loading, resolves CORS issues, and prioritizes static cropped images.
- **Cache Management**: Smart caching for hero videos (immediate preload) and direct CDN streaming for gallery videos.
- **Bilingual Support**: Comprehensive French/English content management for UI, data, and SEO.
- **Automatic Language Detection**: Browser language detection for new visitors - French browsers get French version, all other languages get English version.
- **Modular API Design**: RESTful API for various content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of static images for gallery thumbnails upon upload.
- **Real-time Analytics**: Backend system for tracking visitors, performance, and engagement with IP management.
- **Direct Supabase Upload System**: Facilitates large file uploads by bypassing deployment limits.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings.
- **Deployment Optimizations**: Includes fast health check endpoints, production video cache preloading for hero videos, comprehensive error handling, routing priorities, and automated public asset copying.

## Recent Changes
**August 12, 2025 - v1.0.149 Enhanced Persistent Video Elements (READY FOR DEPLOYMENT):**
- Production-ready persistent video element system with enhanced logging for complete visibility
- Added timeout scheduling and creation tracking: `🎯 SCHEDULING PRELOAD` → `🎯 TIMEOUT TRIGGERED` → `🎯 CREATING PERSISTENT VIDEO ELEMENT`
- Console verification confirms proper sequence execution with staggered 200ms intervals
- Dual architecture working: Hero videos (253.2MB server cache, ~50ms) + Gallery videos (persistent elements, <100ms)
- Memory management with cleanup on component unmount prevents bloat
- System processes 3 gallery videos (PomGalleryC.mp4, VitaminSeaC.mp4, safari-1.mp4) with intelligent fallback

**August 12, 2025 - v1.0.148 Persistent Video Element System (DEPLOYED):**
- Implemented revolutionary persistent video element system for true instant gallery video startup  
- Persistent video elements stay memory-resident for instant reuse (< 100ms startup)
- Enhanced intelligent preloading with multiple readyState detection levels
- Optimized staggered initialization (200ms intervals) for faster preloading
- Smart fallback system for non-preloaded videos with automatic detection

**August 11, 2025 - v1.0.147 Emergency Production Fixes (DEPLOYED):**
- Fixed cache operation 500 errors: Extended timeout 60s→120s for heavy operations
- Fixed gallery video performance regression: Restored smart preloading with progressive chunking
- Implemented scroll-based video chunk downloading (256KB) for instant playback
- Gallery videos use optimized proxy system with metadata preloading
- TypeScript errors resolved in cache status interface
- Added intersection observer for efficient viewport-based preloading

**August 11, 2025 - v1.0.146 Cache Status Display Fix:**
- Fixed critical cache status display bug in VideoCacheStatus.tsx
- Cache buttons worked correctly but UI didn't show updated status
- Corrected frontend data parsing to match API response format

**August 11, 2025 - v1.0.145 Complete Endpoint Implementation:**
- Added 24 missing API endpoints for cache and analytics functionality
- Fixed analytics dashboard "Failed to load analytics data" error
- Fixed individual and bulk video cache button 404 errors

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