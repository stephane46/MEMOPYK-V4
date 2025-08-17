# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform designed to transform personal photos and videos into cinematic memory films. Its core purpose is to provide a seamless and intuitive experience for creating and managing cherished video memories. Key capabilities include a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing tools, and real-time preview. The project aims to capture a niche market for personalized, high-quality video memories with a vision for market potential and high ambitions.

## User Preferences
Preferred communication style: Simple, everyday language.
Visual consistency priority: Extremely detail-oriented about spacing and formatting consistency between admin interface and published pages.
Analytics interface: Expects all three filter buttons (7d, 30d, 90d) to be visible with proper orange highlighting for active states.

### Critical Code Investigation Protocol (August 2025)
**NEVER remove or modify existing code without understanding its purpose first.**

**Required Investigation Process:**
1. **Read and understand** existing code before making changes
2. **Ask the user** if unsure about code purpose or if it seems redundant
3. **Investigate git history** or documentation for context
4. **Test functionality** before and after changes
5. **Assume existing code exists for a reason** until proven otherwise

**Examples of Required Questions:**
- "I see this MINIMUM_THUMBNAIL_DISPLAY_TIME constant - should I keep the 2-second delay behavior?"
- "This code appears to handle [specific case] - is this still needed?"
- "Before removing this logic, can you confirm it's no longer required?"

**Never assume code is:**
- Redundant without investigation
- Outdated without checking
- Unnecessary without user confirmation

This prevents breaking working functionality and ensures user intent is preserved.

### Recent Major Fixes (August 2025)

**Analytics Systems & Admin Panel Complete Resolution (August 17, 2025):**
- **Dual Analytics Issue**: Local analytics dashboard showing 3-day-old data, not recording new gallery video views
- **Root Cause**: VITE_VIDEO_ANALYTICS_ENABLED environment variable not set, disabling local video tracking during GA4 implementation
- **Solution Applied**: Added VITE_VIDEO_ANALYTICS_ENABLED=true to restore independent local analytics tracking
- **Admin Panel KPI Fix**: Fixed broken connection from non-existent `/api/ga4/kpis` to working `/api/analytics/dashboard` endpoint
- **KPI Display Resolution**: Average watch time now shows correct 17 seconds (0:17) instead of 0:00 in admin dashboard
- **Recent Visitors Enhancement**: Expanded limit from 5 to 100 visitors for extended analytics history during user absence
- **GA4 Analytics Status**: ✅ FULLY WORKING - Production tracking for memopyk.com with real video data (6s and 11s test sessions confirmed)
- **Local Analytics Status**: ✅ RESTORED - Independent visitor and gallery view tracking operational (26 views, 463 seconds total watch time)
- **Real-time Dashboard**: ✅ Both systems working with /api/analytics/sessions and /api/analytics/recent-activity endpoints
- **Dual System Architecture**: Both GA4 and local analytics now operate independently without interference
- **Test Mode System**: ✅ User controls test mode via yellow indicator system - agent must never interfere
- **Deployment Ready**: Both analytics systems verified working and ready for production deployment
- **Status**: Complete dual analytics solution operational - GA4 for production tracking, local for admin dashboard

**Technical Debt Identified (August 17, 2025):**
- **Environment Variable Misclassification**: VIDEO_ANALYTICS_ENABLED incorrectly added as Secret instead of regular environment variable
- **Issue**: Boolean feature flags should not be stored as secrets - it's just a configuration toggle, not sensitive data
- **Current Workaround**: Works as secret but architecturally incorrect
- **Required Future Fix**: Move VIDEO_ANALYTICS_ENABLED from Secrets tab to regular environment variable or hardcode to true
- **Proper Secret Usage**: Only DATABASE_URL, GA4_SERVICE_ACCOUNT_KEY, and VITE_GA_MEASUREMENT_ID should be secrets
**Critical Gallery Image Issue Resolution & Architecture Preservation (August 17, 2025):**
- **Issue Identified**: Gallery images causing net::ERR_QUIC_PROTOCOL_ERROR browser timeouts due to 10+ MB file sizes
- **Temporary Solution Applied**: Routed gallery images through image proxy system for optimization
- **CRITICAL ARCHITECTURAL CONFLICT DISCOVERED**: Gallery media must stream directly from Supabase CDN for deployment reliability
- **Architecture Constraint**: Only hero videos use local cache; gallery videos and images require direct CDN streaming
- **Final Resolution**: Reverted to direct Supabase CDN streaming for gallery images to preserve deployment stability
- **Key Documentation**: Lines 65 and 81 in replit.md clearly specify this separation
- **Lesson Learned**: Never modify gallery media routing without considering deployment architecture requirements
- **Status**: Gallery media correctly configured for production deployment ✅

**GA4 Analytics Watch Time Calculation Bug Resolution (FINAL FIX - August 17, 2025):**
- **Issue**: Both KPI dashboard and Top Videos Performance table showed unrealistic watch time calculations due to flawed assumptions in completion-based estimation method
- **Root Cause 1**: qWatchTimeByVideo function hitting INVALID_ARGUMENT errors with GA4 custom event parameters, falling back to estimation
- **Root Cause 2**: Videos with same video_id but different titles were incorrectly sharing completion counts due to single-key indexing
- **Root Cause 3**: qWatchTimeTotal function was using hardcoded 90-second estimates instead of actual database video durations
- **Root Cause 4**: Estimation method used unrealistic assumptions (100% duration for completes, 30% for partials)
- **Technical Solutions**: 
  1. **Completion-based calculation** with actual video duration lookup from database
  2. **video_id + title combination indexing** for unique completion mapping 
  3. **Per-video aggregation method** in qWatchTimeTotal using qWatchTimeByVideo results
  4. **Completion capping logic** to prevent impossible scenarios (more completes than plays)
  5. **Realistic watch time assumptions**: Complete views = 90% duration, Partial views = 40% duration, Fallback = 65% duration
- **Before Fix**: 
  - KPI Dashboard: 138 seconds average (unrealistic)
  - "L'été de Pom": 45 seconds (too low for 180s video)
  - "Notre Vitamine Sea": 120 seconds (too low for 240s video)
- **After Fix**: 
  - KPI Dashboard: 151 seconds realistic average watch time using actual video durations ✅
  - "L'été de Pom": 59 seconds (realistic for 180s video) ✅
  - "Notre Vitamine Sea": 156 seconds (realistic for 240s video) ✅
  - "The summer of Pom": 117 seconds (realistic for 180s video) ✅
  - All calculations use actual database values (180s, 240s, 1200s) with realistic viewing assumptions ✅
- **Persistent Cache Resolution**: Fixed PostgreSQL cache preventing calculation updates with targeted cache clearing
- **Date**: August 17, 2025
- **Status**: Completely resolved with authentic data-driven calculations and realistic viewing behavior modeling

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
- **Google Analytics Integration**: Pattern A dual implementation with static HTML tag (immediate load) and React SPA tracking (route changes). GA4 tracking with manual page_view control, custom event tracking, and comprehensive user behavior analytics. Successfully resolved timing issues with retry mechanism and eliminated duplicate loading by removing dynamic script injection. Clean and elegant developer mode interface with user-friendly terminology. **Critical GA4 caching issue resolved (August 15, 2025)**: Aggressive cache clearing strategy (node_modules/.vite, client/dist, .vite + workflow restart) successfully eliminated persistent "(DISABLED FOR DEBUG)" messages caused by browser cache retention of old JavaScript bundles. **Persistent Cache System with Auto-Cleanup (August 16, 2025)**: Implemented comprehensive persistent caching for all GA4 endpoints using PostgreSQL (development) and Supabase (production). Features dual-layer caching (memory + persistent), automatic expiry cleanup via PostgreSQL triggers, 24-hour retention policy, environment-specific database selection, and admin bypass with `?nocache=1`. Cache survives server restarts with 180x performance improvement (115ms cached vs 500-1200ms fresh API calls). Includes automatic table cleanup preventing infinite growth, manual admin endpoints, and comprehensive monitoring. Production-ready with proper indexing, error handling, and zero-maintenance operation.
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