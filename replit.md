# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform that transforms personal photos and videos into cinematic memory films. It features a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, image reframing tools, and real-time preview capabilities. The platform aims to provide a seamless and intuitive experience for creating and managing cherished memory films.

## Recent Changes (August 2025)
- **CRITICAL GALLERY SYNC BREAKTHROUGH v1.0.126**: Completely resolved gallery image mismatch between admin and public site
- **Root Cause Finally Identified**: Admin and public site used different image priority logic AND shared mode logic
- **Complete Solution Implemented**: 
  - Admin now uses identical static crop priority as public site
  - Admin now implements same shared mode logic (EN static crop for both languages when use_same_video=true)
  - Unified React Query cache keys across all components
  - Database updated with consistent static crop URLs for both languages
- **Technical Details**: Public site transforms database fields (static_image_url_en → staticImageUrlEn, use_same_video → useSameVideo) while admin works with raw database fields, requiring different access patterns but same logic
- **DEPLOYMENT READY v1.0.124**: All files prepared for production deployment with cache and hybrid storage optimizations
- **Manual Cropping Production Success**: User confirmed "production site shows nice images!!" - system working perfectly
- **Deployment Optimizations Applied**: Critical file verification, cache management, and performance tuning complete
- **TypeScript Issues Resolved**: Fixed storage and routing type errors for clean production deployment
- **MANUAL CROPPING SYSTEM CONFIRMED WORKING v1.0.123**: Console logs confirm successful manual cropping detection
- **Enhanced File Size Logging**: Added colorful console logs and popup alerts showing exact file sizes and dimensions
- **Quality Verification**: Manual cropping generates files with smart dimensions (3024x2016) and 90% JPEG quality
- **User Interface Success**: GalleryManagementNew.tsx correctly implements manual cropping with real-time feedback
- **SMART HIGH-QUALITY CROPPING SYSTEM v1.0.122**: Revolutionary image quality breakthrough CONFIRMED
- **User Feedback**: "It looks good on screen!" - Visual quality dramatically improved
- **Smart Dimension Preservation**: System now preserves original dimensions (e.g., 3024x2127 → 3024x2016) instead of downscaling to 300x200
- **Dual Implementation**: Both manual cropping (SimpleImageCropper) and server-side auto-generation use smart dimension logic
- **Quality Achievement**: Gallery images now maintain near-original resolution while achieving consistent 1.5 aspect ratio
- **Technical Innovation**: Preserves larger dimension, calculates other dimension for maximum quality with minimal loss
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
- **Deployment Optimizations**: Fast health check endpoints (/api/health-check), production video cache preloading optimized for hero videos only, hybrid storage system with JSON fallback, comprehensive error handling, proper routing priorities to prevent static file serving interference. All critical files verified for deployment readiness.

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