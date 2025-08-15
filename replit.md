# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform designed to transform personal photos and videos into cinematic memory films. Its core purpose is to provide a seamless and intuitive experience for creating and managing cherished video memories. Key capabilities include a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing tools, and real-time preview. The project aims to capture a niche market for personalized, high-quality video memories with a vision for market potential and high ambitions.

## User Preferences
Preferred communication style: Simple, everyday language.
Visual consistency priority: Extremely detail-oriented about spacing and formatting consistency between admin interface and published pages.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: shadcn/ui (built on Radix UI).
- **Styling**: Tailwind CSS with CSS custom properties.
- **State Management**: TanStack Query.
- **Form Handling**: React Hook Form with Zod validation.
- **UI/UX Decisions**:
    - **Typography**: Poppins for general text, Playfair Display for hero video overlay text.
    - **Color Scheme**: MEMOPYK brand palette (Dark Blue #2A4759, Orange #D67C4A, Navy #011526, Cream #F2EBDC, Sky Blue #89BAD9).
    - **Responsive Design**: Adaptive to all screen sizes, with advanced mobile optimizations and PWA features.
    - **Navigation**: Customer journey-focused anchor-based scrolling on the homepage; logo acts as home button with language routing.
    - **Image Cropping**: Inline drag-and-reposition interface with real-time visual feedback and dual badge system.
    - **Video Display**: Minimal controls for gallery videos, 2/3 screen size lightbox with blurred background. Hero videos use a cache system for fast loading; gallery videos stream directly from CDN.
    - **Admin Interface**: Streamlined content management, professional field labeling, clear visual indicators, responsive font size system with real-time preview.
    - **Silent Loading Experience**: Eliminated all loading states for seamless content display.
    - **Instant Thumbnail-to-Video System**: Professional YouTube/Netflix-style loading with immediate thumbnail display during video buffering.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Database Provider**: Hybrid system with Supabase PostgreSQL (VPS) as primary and JSON fallback.
- **Session Management**: Express sessions with PostgreSQL store.

### Key Architectural Decisions
- **Hybrid Storage System**: JSON fallback for all data, complementing PostgreSQL for data persistence and synchronization.
- **Universal Video Proxy**: Manages video serving, range requests, local caching, and fallback to Supabase CDN.
- **Image Proxy**: Handles image loading, resolves CORS issues, and prioritizes static cropped images.
- **Cache Management**: Smart caching for hero videos (immediate preload) and direct CDN streaming for gallery videos. Persistent video element system for instant gallery video startup.
- **Bilingual Support**: Comprehensive French/English content management for UI, data, and SEO. Automatic language detection.
- **Modular API Design**: RESTful API for various content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of static images for gallery thumbnails upon upload.
- **Real-time Analytics**: Backend system for tracking visitors, performance, and engagement with IP management and accurate session/view tracking, including IP exclusion and geolocation enrichment.
- **Google Analytics Integration**: Pattern A dual implementation with static HTML tag (immediate load) and React SPA tracking (route changes). GA4 tracking with manual page_view control, custom event tracking, and comprehensive user behavior analytics. Successfully resolved timing issues with retry mechanism and eliminated duplicate loading by removing dynamic script injection. Clean and elegant developer mode interface with user-friendly terminology (August 2025).
- **Bundle Optimization System**: Comprehensive dependency cleanup removing 74 unused packages (16MB reduction). Eliminated Uppy file upload components, Passport authentication, and unused Radix UI components while maintaining essential functionality. Bundle size reduced from 476MB to 460MB for faster deployments (August 2025).
- **Direct Supabase Upload System**: Facilitates large file uploads bypassing deployment limits.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings.
- **Deployment Optimizations**: Fast health check endpoints, production video cache preloading, comprehensive error handling, routing priorities, and automated public asset copying.
- **Visitor Classification & Analytics Accuracy**: Implemented 30-second session deduplication and proper classification logic for new/returning visitors. Video analytics precisely track watch duration and completion metrics, excluding admin page visits.
- **Professional Flag System**: Comprehensive 255-country solution using SVG flags with dynamic country mapping and a three-tier fallback system.

## External Dependencies

### Database
- **Supabase PostgreSQL**: Primary production database.
- **Neon Database**: Development/staging database.
- **Supabase Storage**: For video and image storage (CDN).

### UI Components
- **Radix UI**: Unstyled, accessible component primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.
- **svg-country-flags**: Professional country flag library (hampusborgos/country-flags).

### Development Tools
- **Vite**: Frontend build tool.
- **Express.js**: Backend web framework.
- **Drizzle ORM**: Type-safe database ORM.
- **Zod**: Schema validation library.
- **React-Quill**: Rich text editor.
- **DOMPurify**: HTML sanitization library.
- **Crypto-js**: Client-side MD5 hashing.
- **Multer**: Node.js middleware for file uploads.