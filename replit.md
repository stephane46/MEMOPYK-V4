# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform that transforms personal photos and videos into cinematic memory films. Its core purpose is to provide a seamless and intuitive experience for creating and managing cherished video memories. Key capabilities include a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing tools, and real-time preview. The project aims to capture a niche market for personalized, high-quality video memories with significant market potential and high ambitions.

## User Preferences
Preferred communication style: Simple, everyday language.
Visual consistency priority: Extremely detail-oriented about spacing and formatting consistency between admin interface and published pages.
Analytics interface: Expects all three filter buttons (7d, 30d, 90d) to be visible with proper orange highlighting for active states.
Language detection priority: Fixed primary browser language detection with console testing capability. Enhanced cross-device compatibility prevents English users overseas from seeing French content by checking ONLY the first browser language preference.
Accessibility priority: High contrast text is essential - white text on gray backgrounds is completely unreadable and must be avoided throughout admin interface.
Modal styling: Requires solid white modal backgrounds with dark overlays for proper floating appearance. Framework components like Radix UI need precise CSS targeting to avoid affecting backdrop elements.

### Critical Code Investigation Protocol
**NEVER remove or modify existing code without understanding its purpose first.**

**Required Investigation Process:**
1. **Read and understand** existing code before making changes
2. **Ask the user** if unsure about code purpose or if it seems redundant
3. **Investigate git history** or documentation for context
4. **Test functionality** before and after changes
5. **Assume existing code exists for a reason** until proven otherwise

**Never assume code is:**
- Redundant without investigation
- Outdated without checking
- Unnecessary without user confirmation

### Recent Critical Fixes
**SEO System Field Mapping Issue (Aug 2025)**: Resolved critical bug where dynamic property assignment with bracket notation was failing in TypeScript. Replaced with explicit field assignments for proper database field mapping. All SEO fields (title, description, keywords, etc.) now save and retrieve correctly from Supabase database.

**Meta Description Display Issue (Aug 2025)**: Fixed React Hook Form persistence bug where Meta Description field wasn't displaying saved values after form reset. Issue was caused by undefined default values in form configuration. Resolved by providing complete default values for all form fields and improving form reset logic with `keepDefaultValues: false`. Meta Description field now properly displays saved content in SEO Management interface.

**Production Deployment Preparation (Aug 2025)**: Completed comprehensive deployment readiness verification. All critical systems tested and operational: SEO management with hybrid storage, video streaming platform, analytics tracking, and admin interface. Build system optimized (2623 modules transformed), all API endpoints functional, and database connections verified. Project ready for production deployment.

**Hero Video Debug Final Cleanup (Aug 2025)**: Completely eliminated all debug messages from hero video carousel system, including visual debug text overlay showing "Video X of Y" counter. Hero videos now provide a completely silent, professional transition experience between all 3 videos on both desktop and mobile platforms. All carousel functionality preserved including navigation arrows, indicator dots, and touch gestures.

**Key Visual Section Hover Effect Optimization (Aug 2025)**: Resolved hover scaling issue in Key Visual section where the call-to-action element grew properly but the border appeared "erased" due to improper transform origin. Fixed by restructuring the hover effect with `origin-left` transform origin, allowing the element to scale from its left anchor point and expand rightward into available space. This prevents left-side clipping while maintaining perfect alignment and preserving the interactive hover effect users appreciate.

**Homepage Section Reorganization (Aug 2025)**: Enhanced user flow by positioning "Comment ça marche" (How It Works) section between two Call-to-Action sections. This creates an optimal customer journey: Gallery → First CTA → Process Explanation → Second CTA → FAQ, maximizing conversion opportunities through strategic placement of actionable elements around educational content.

**Why MEMOPYK Section Dynamic Content Integration (Aug 2025)**: Successfully completed transformation from static hardcoded content to fully dynamic admin-driven system. The public website "Why choose MEMOPYK" section now fetches real-time data from `/api/why-memopyk-cards` endpoint, allowing immediate reflection of admin interface changes. All six benefit cards now use dynamic icon mapping, HTML content rendering, and proper API data structure while maintaining 100% brand compliance with official MEMOPYK color gradients.

**Deployment MIME Type Issue - PERMANENT RESOLUTION (Aug 2025)**: Resolved recurring "Expected JavaScript-or-Wasm module script but server responded with text/html" deployment error. Root cause was `public/index.html` file with development references (`/src/main.tsx`) overriding correct production references (`/assets/index-*.js`). Removed problematic development HTML from public folder. Build process protection was already in place. Deployment system was never broken - issue was in build file generation. **Resolution: Deployment now works correctly with proper MIME types.**

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
- **Cache Management**: Smart caching for hero videos (immediate preload) and direct CDN streaming for gallery videos. Persistent video element system for instant gallery video startup. Comprehensive persistent caching for GA4 endpoints with auto-cleanup, 24-hour retention, and admin bypass.
- **Bilingual Support**: Comprehensive French/English content management for UI, data, and SEO. Primary-language-first detection system.
- **Modular API Design**: RESTful API for various content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of static images for gallery thumbnails upon upload.
- **Real-time Analytics**: Backend system for tracking visitors, performance, and engagement with IP management, accurate session/view tracking, IP exclusion, and geolocation enrichment. Includes dual analytics (GA4 and local) operating independently.
- **Google Analytics Integration**: Pattern A dual implementation with static HTML tag and React SPA tracking. GA4 tracking with manual page_view control, custom event tracking, and comprehensive user behavior analytics.
- **Bundle Optimization System**: Significant reduction in bundle size through dependency cleanup and removal of unused components.
- **Direct Supabase Upload System**: Facilitates large file uploads bypassing deployment limits.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings. Fully integrated with hybrid storage (JSON ↔ Supabase sync) with audit logging.
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