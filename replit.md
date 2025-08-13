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
    - **Responsive Design**: Adaptive to all screen sizes, including advanced mobile optimizations and PWA features.
    - **Navigation**: Customer journey-focused anchor-based scrolling on the homepage. Logo acts as home button with language routing.
    - **Image Cropping**: Inline drag-and-reposition interface with real-time visual feedback and a dual badge system for manual/automatic crops.
    - **Video Display**: Minimal controls for gallery videos, 2/3 screen size lightbox with blurred background. Hero videos use a cache system for fast loading; gallery videos stream directly from CDN.
    - **Admin Interface**: Streamlined content management, professional field labeling, clear visual indicators, responsive font size system with real-time preview.

### Backend Architecture
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
- **Bilingual Support**: Comprehensive French/English content management for UI, data, and SEO. Automatic language detection based on browser settings.
- **Modular API Design**: RESTful API for various content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of static images for gallery thumbnails upon upload.
- **Real-time Analytics**: Backend system for tracking visitors, performance, and engagement with IP management and accurate session/view tracking.
- **Direct Supabase Upload System**: Facilitates large file uploads by bypassing deployment limits.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings.
- **Deployment Optimizations**: Includes fast health check endpoints, production video cache preloading for hero videos, comprehensive error handling, routing priorities, and automated public asset copying.
- **Silent Loading Experience**: Eliminated all loading states from the application; content loads seamlessly.
- **Gallery Video Fix (v1.0.167)**: Resolved critical stuttering/restarting issues by removing preloading conflicts; implemented direct CDN streaming for reliable playback.
- **Instant Thumbnail-to-Video System (v1.0.168)**: Implemented professional YouTube/Netflix-style loading with immediate thumbnail display during video buffering, creating seamless user experience with 0ms perceived delay.
- **Enhanced Thumbnail Display System (v1.0.177)**: Added 2-second minimum display time for video thumbnails to prevent jarring instant-disappear effect while maintaining responsive performance for slower connections. Features refined duration pill padding for optimal visual presentation.
- **Analytics Session Tracking Fix (v1.0.168)**: Resolved visitor counting issues; analytics now properly tracks unique visitors with 30-second deduplication window for accurate production monitoring.
- **Critical Hybrid Storage Database Fix (v1.0.175)**: Fixed analytics data targeting mismatch where sessions were created in Supabase PostgreSQL (VPS) but delete functions targeted wrong database (Neon). Admin delete button now correctly clears analytics data from Supabase PostgreSQL ensuring data consistency between development and production environments.
- **Video Performance Analytics Integration (v1.0.174)**: Implemented comprehensive video performance modal in analytics dashboard with dynamic video detection, showing all gallery videos with engagement metrics and watch statistics.
- **Location Enrichment System (v1.0.176)**: Integrated ipapi.co API for visitor geolocation enrichment, displaying "Barcelona (Catalonia)" instead of raw IP addresses in analytics dashboard. Features automatic caching, rate limiting, and comprehensive location data including city, region, country, timezone, and organization details.
- **Professional Flag System Upgrade (v1.0.178)**: Complete replacement of limited 15-country flag system with comprehensive 255-country solution using hampusborgos/country-flags repository (https://github.com/hampusborgos/country-flags). Features professional SVG flags matching official country legislation, dynamic country mapping from JSON database, smart fuzzy matching for various country name formats, and three-tier fallback system (SVG flags → Unicode emojis → globe icon). Eliminates all question mark displays for legitimate country data.
- **Country Flag Display Fix (v1.0.179)**: Resolved critical issue where CountryFlag component displayed raw country codes ("DK", "FR", "GB", "IT", "ES") instead of flag images in visitor analytics. Fixed Express static file serving for flag SVGs in both development and production environments, updated TypeScript interfaces to match API data structure, and implemented proper fallback system for Unicode flag emojis. Verified with Denmark, France, UK, Italy, and Spain flags displaying correctly as proper flag images in admin panel visitor details modal.

## External Dependencies

### Database
- **Supabase PostgreSQL**: Primary database hosted on user's VPS (https://supabase.memopyk.org).
- **Neon Database**: Development/staging database connection.
- **Supabase Storage**: Used for video and image storage (CDN).

### UI Components
- **Radix UI**: Unstyled, accessible component primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.
- **svg-country-flags**: Professional country flag library (hampusborgos/country-flags) for comprehensive international representation.

### Development Tools
- **Vite**: Frontend build tool.
- **Express.js**: Backend web framework.
- **Drizzle ORM**: Type-safe database ORM.
- **Zod**: Schema validation library.
- **React-Quill**: Rich text editor.
- **DOMPurify**: HTML sanitization library.
- **Crypto-js**: Client-side MD5 hashing.
- **Multer**: Node.js middleware for file uploads.