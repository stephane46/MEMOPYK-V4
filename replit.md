# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform designed to transform personal photos and videos into cinematic memory films. Its core purpose is to offer a seamless and intuitive experience for creating and managing cherished memory films. Key capabilities include a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing tools, and real-time preview capabilities. The project aims to capture a market niche for personalized, high-quality video memories.

## Recent Changes  
- **August 6, 2025**: **BULLETPROOF HERO VIDEO CACHE SYSTEM COMPLETE** - Successfully resolved critical cache issue where admin interface showed false positives ("Just cached" while server timestamps proved videos weren't refreshed). Implemented comprehensive verification system in `/api/video-cache/force` and `/api/video-cache/force-all` endpoints that verify actual caching before reporting success. System now checks file existence, size validation (minimum 1KB), timestamp verification, and post-download confirmation. Admin interface will now show accurate cache status without false positives. Both endpoints provide detailed verification results including file size, timestamps, and success confirmation for each video processed.
- **August 6, 2025**: **BADGE LAYOUT SYSTEM PERFECTED** - Completed comprehensive badge system overhaul with perfect responsive alignment. Standardized all format badges to use "Format Recommandé"/"Recommended Format" as consistent first line with format type as prominent second line. Fixed responsive alignment issues where Social Media badges were misaligned on desktop vs mobile. Implemented precise positioning using overlay spacing (`right-2 sm:right-4`) to match price badge alignment exactly. Title and badge now appear on same horizontal line with balanced spacing across all screen sizes. User confirmed layout is "Perfect".
- **August 6, 2025**: **ADMIN TEMPLATE SIMPLIFICATION COMPLETE** - Streamlined Format Badge Manager templates to use standardized platform labels exclusively. Updated all predefined templates to use "Recommended Format"/"Format Recommandé" removing confusing platform variations. Admin interface now focuses on managing format types only (Mobile Stories, Instagram Posts, TV & Desktop) with consistent user experience.
- **August 6, 2025**: **GALLERY ORDERING SYSTEM FULLY OPERATIONAL** - Successfully resolved critical ordering bug that was causing new videos to appear in wrong positions. Fixed database field mapping inconsistencies between frontend (order_index) and database schema (orderIndex). Updated updateGalleryItemOrder function in hybrid-storage.ts to properly sync both Supabase database and JSON file storage. Created missing gallery-items.json file that was causing "Gallery item not found" API errors. User confirmed admin interface ordering buttons are now functional and has redeployed the system with all fixes.
- **August 6, 2025**: **COMPLETE CROPPING SYSTEM SUCCESS** - Fully resolved all cropping functionality after comprehensive debugging. Fixed missing database import in hybrid-storage.ts that was causing 500 errors, created missing gallery-items.json file for hybrid storage fallback system, and implemented proper loading spinner with user feedback. Cropping workflow now fully operational: database saves, position calculations, and cross-environment sync all confirmed working. Crop percentages successfully updating (verified: 5.22%, 11.11%, 0%) demonstrating end-to-end functionality.

## User Preferences
Preferred communication style: Simple, everyday language.

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
    - **Responsive Design**: Adaptive to all screen sizes, including advanced mobile optimizations (responsive grids, touch-friendly overlays, optimized text sizing, 44px touch targets). Includes PWA features like lazy loading and network status detection.
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
- **Hybrid Storage System**: JSON fallback for all data, complementing PostgreSQL for data persistence and synchronization across environments.
- **Universal Video Proxy**: Manages all video serving, including range requests, local caching, and fallback to Supabase CDN.
- **Image Proxy**: Handles image loading, resolves CORS issues, and prioritizes static cropped images.
- **Cache Management**: Smart caching for hero videos (immediate preload) and direct CDN streaming for gallery videos.
- **Bilingual Support**: Comprehensive French/English content management for UI, data, and SEO.
- **Modular API Design**: RESTful API for various content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of static images for gallery thumbnails upon upload.
- **Real-time Analytics**: Backend system for tracking visitors, performance, and engagement with IP management.
- **Direct Supabase Upload System**: Facilitates large file uploads by bypassing deployment limits.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings.
- **Deployment Optimizations**: Includes fast health check endpoints, production video cache preloading for hero videos, comprehensive error handling, and routing priorities to prevent static file serving interference.

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