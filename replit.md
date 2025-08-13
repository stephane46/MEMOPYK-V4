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
- **Enhanced Visitor Analytics Display (v1.0.180)**: Completed comprehensive visitor analytics enhancement with larger country flags (32px), IP address display in subtle monospace font, previous visit date tracking with "Prev:" prefix, color-coded New/Returning visitor badges with visit counts, session duration display with timer icons, and compact card design with optimized padding and spacing. All visitor information now displays professionally in a space-efficient layout ready for production deployment.
- **IP Exclusion Management System (v1.0.184)**: Implemented comprehensive IP address exclusion functionality for analytics tracking with full CRUD operations. Features POST endpoint for excluding IPs with comments, GET endpoint for listing excluded IPs, PATCH endpoint for updating IP comments, and DELETE endpoint for removing exclusions. All endpoints properly integrated with hybrid storage system using JSON fallback when Supabase analytics_settings table is unavailable. System supports detailed IP management with timestamps, comments, and seamless admin panel integration.
- **Critical Video Gallery Cards Text Display Fix (v1.0.181)**: Resolved desktop/laptop text cutoff issue where Story and Situation descriptions were truncated at fixed height constraints. Changed height properties from fixed `h-20 overflow-hidden` to minimum height `min-h-20` for both text sections, ensuring all content displays properly while maintaining visual consistency across all screen sizes.
- **Typography Consistency & Spacing Optimization (v1.0.182)**: Unified font styling across "How it Works" cards and video gallery cards with identical `text-xs sm:text-sm leading-4` specifications. Eliminated excessive spacing in "How it Works" cards by removing rigid fixed heights and implementing natural text flow with optimized margins (`mb-3`, `pt-3`). Cards now display professional, compact spacing without visual gaps while maintaining consistent typography throughout the platform.
- **Desktop Key Visual Section Spacing Fix (v1.0.183)**: Optimized bottom padding responsiveness in KeyVisualSection with progressive reduction for larger screens: mobile/small (`pb-8`), tablet (`sm:pb-12`), laptop (`lg:pb-6`), desktop (`xl:pb-4`). Eliminated excessive spacing between Key Visual and "Comment Ça Marche" sections on desktop displays while maintaining appropriate spacing on mobile and tablet devices.
- **IP Exclusion Management System Deployment Preparation (v1.0.185)**: Completed comprehensive deployment preparation for IP exclusion endpoints after identifying admin panel "Exclude from Analytics" button failures due to missing production endpoints. All 4 CRUD endpoints (POST, GET, PATCH, DELETE) fully tested in development and ready for production deployment. Created complete deployment documentation, verification scripts, and rollback procedures. System provides seamless admin IP management with hybrid storage reliability.
- **Critical Date Filtering Analytics Fix (v1.0.186)**: Resolved major analytics date filtering inconsistency where "Today" and "Last 7 Days" filters showed different results (9 vs 0 visitors). Root cause was missing `getRecentAnalyticsSessions` method in hybrid-storage.ts causing JSON fallback failures. Created the missing method with proper date filtering logic matching the existing pattern for views. Both date ranges now consistently show accurate data (2 views, 9 visitors) from August 13, 2025. Fixed ensures reliable analytics dashboard functionality across all time periods with proper France timezone handling.
- **Never-Viewed Video Display Fix (v1.0.187)**: Eliminated confusing Unix epoch "1970" dates for videos with zero views. Updated both backend endpoints to return `null` for `last_viewed` when videos have no viewing history. Modified VideoPerformanceCard component to display "Never viewed" instead of "Last viewed 1/1/1970". Enhanced user experience by providing clear, meaningful status for unwatched content.
- **Video Performance Card UI Simplification (v1.0.188)**: Removed redundant "#1 Most Watched" badge and special golden background styling from video performance cards. Since videos are automatically sorted by view count (most to least viewed), the position itself indicates ranking. All video cards now display with consistent clean styling, creating a more professional appearance while maintaining clear hierarchy through natural sort order.
- **Critical Visitor Classification Bug Fix (v1.0.189)**: Fixed visitor tracking system that incorrectly marked first-time visitors as "Returning" due to multiple sessions being created within seconds of each visit. Implemented 30-second session deduplication in backend to prevent duplicate sessions from same IP, and changed frontend classification logic to use actual `previous_visit` dates instead of raw session counts. New visitors now correctly display as "New" while true returning visitors with historical data show as "Returning" with accurate visit counts.

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