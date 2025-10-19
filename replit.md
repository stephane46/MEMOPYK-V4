# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform that transforms personal photos and videos into cinematic memory films. Its core purpose is to provide a seamless and intuitive experience for creating and managing cherished video memories. Key capabilities include a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing tools, and real-time preview. The project aims to capture a niche market for personalized, high-quality video memories with significant market potential.

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

**CRITICAL: Always read replit.md documentation FIRST before making any changes to understand the existing architecture and avoid breaking working systems.**

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
- **Hybrid Storage System**: JSON fallback for most data, complementing PostgreSQL for data persistence and synchronization. Gallery data comes DIRECTLY from Supabase VPS database with NO JSON fallback.
- **Universal Video Proxy**: Manages video serving, range requests, local caching, and fallback to Supabase CDN.
- **Image Proxy**: Handles image loading, resolves CORS issues, and prioritizes static cropped images.
- **Cache Management**: Smart caching for hero videos (immediate preload) and direct CDN streaming for gallery videos. Persistent video element system for instant gallery video startup. Comprehensive persistent caching for GA4 endpoints with auto-cleanup, 24-hour retention, and admin bypass.
- **Bilingual Support**: Comprehensive French/English content management for UI, data, and SEO. Primary-language-first detection system.
- **Modular API Design**: RESTful API for various content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of static images for gallery thumbnails upon upload.
- **Unified Analytics Architecture**: Comprehensive dual-stream analytics system combining direct Supabase tracking with automated GA4 BigQuery sync. Primary analytics dashboard loads instantly from Supabase tables (analytics_sessions, analytics_views, analytics_videos) with real-time accuracy. Secondary GA4 → BigQuery → Supabase pipeline enriches data daily with Google's advanced processing. **Data Complementarity**: Supabase provides custom metrics, real-time precision, and specific MEMOPYK events; GA4 BigQuery adds demographics, acquisition channels, device details, and Google's processed analytics that complement rather than duplicate the direct tracking data.
- **Real-time Analytics**: Direct website tracking with IP management, accurate session/view tracking, IP exclusion, and geolocation enrichment. Instant dashboard loading with zero tolerance for slow queries.
- **Google Analytics Integration**: Dual implementation with GA4 JavaScript tracking and automated BigQuery export sync. Daily scheduler (00:15 Paris time) processes GA4 BigQuery exports into Supabase for enriched analytics without performance impact.
- **Bundle Optimization System**: Significant reduction in bundle size through dependency cleanup and removal of unused components.
- **Direct Supabase Upload System**: Facilitates large file uploads bypassing deployment limits.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings. Fully integrated with hybrid storage (JSON ↔ Supabase sync) with audit logging.
- **Deployment Optimizations**: Fast health check endpoints, production video cache preloading, comprehensive error handling, routing priorities, and automated public asset copying.
- **Visitor Classification & Analytics Accuracy**: Implemented 30-second session deduplication and proper classification logic for new/returning visitors. Video analytics precisely track watch duration and completion metrics, excluding admin page visits.
- **Professional Flag System**: Comprehensive 255-country solution using SVG flags with dynamic country mapping and a three-tier fallback system.
- **OpenReplay Integration**: Comprehensive session recording and user behavior analytics using OpenReplay SDK (disabled in dev for mobile compatibility).
- **Hybrid Storage Analytics Fix (v1.0.188)**: Fixed "Analytics (old)" dashboard failures by replacing direct PostgreSQL `pool.unsafe()` queries with proven hybrid storage pattern. Endpoints `/api/analytics/geo` and `/api/analytics/overview` now use `this.supabase.from()` with automatic JSON fallback, eliminating CONNECT_TIMEOUT errors when accessing Supabase VPS database.
- **VideoOverlay Re-render Fix (v1.0.200)**: CRITICAL fix for VideoOverlay constant remounting during video playback. Completely rewritten with stable React patterns: memoized props/calculations, useCallback for all event handlers, eliminated resize listeners, disabled problematic state updates in parent components (GallerySection animation observers, storage listeners, mobile detection). This fix enables proper GA4 video progress tracking (25%, 50%, 75%, 100%) that was previously impossible due to component remounting.
- **Debug Cleanup (v1.0.201)**: Comprehensive removal of debugging statements and GA debug HUD after successful VideoOverlay stabilization. Removed all console.log debugging emojis (🎬, 🚨, 💓, 🎯, 🔥) while preserving essential functionality. VideoOverlay backup retained as VideoOverlay_backup_20250905_131134.tsx.
- **Partner Intake System**: Bilingual partner directory system with Zoho CRM integration. Partners register with full profiles (services, formats, capabilities) via French (/fr-FR/partenaires/devenir) and English (/en-US/partners/join) intake forms. Backend creates Account, Contact, and Partner records in Zoho CRM (EU) using OAuth refresh-token flow with automatic token rotation. Security layer includes rate limiting (30 req/min), CSRF double-submit cookie pattern, and reCAPTCHA stub. Complex validation via shared Zod schema with progressive disclosure UX for optimal user experience.
- **Directus Blog CMS Integration**: Headless CMS integration for bilingual blog content at `/en-US/blog` and `/fr-FR/blog`. Backend authenticates with Directus API using OAuth credentials, fetches posts with M2A (Many-to-Any) blocks (rich text, headings, galleries), and maps fields (`published_at` → `publish_date`). Language normalization helpers (`toBase`, `sameLang`) in `server/helpers/lang.ts` and `client/src/lib/lang.ts` handle both BCP-47 full form (en-US, fr-FR) and base codes (en, fr) for consistent filtering. Publishing gate: only shows posts where `status === 'published'` AND `published_at <= now()`. Typography matches main site: Playfair Display (headings), Poppins (body text).

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

### Content Management
- **Directus CMS**: Headless CMS for blog content management (https://cms-blog.memopyk.org).
- **@directus/sdk**: Official Directus JavaScript SDK.
- **@directus/visual-editing**: Live visual editing support for Directus content.

## Environment Variables

### Directus CMS Integration (Blog System)
- `DIRECTUS_EMAIL`: Email for Directus API authentication (api-blog@memopyk.org)
- `DIRECTUS_PASSWORD`: Password for Directus API authentication
- `DIRECTUS_TOKEN` (optional): Static token for Directus API (currently using email/password OAuth flow)

### Configuration Notes
- Directus authentication uses OAuth token refresh flow with 15-minute expiration
- Blog endpoints automatically filter by language using normalized comparison (handles both "en" and "en-US" formats)
- CSP configured to allow Directus assets: `https://cms-blog.memopyk.org` in img-src, connect-src, media-src

### Zoho CRM Integration (Partner Intake System)
- `ZOHO_BASE_URL`: Zoho CRM API base URL (EU: `https://www.zohoapis.eu`)
- `ZOHO_AUTH_URL`: Zoho OAuth token URL (EU: `https://accounts.zoho.eu/oauth/v2/token`)
- `ZOHO_CLIENT_ID`: Zoho OAuth client ID
- `ZOHO_CLIENT_SECRET`: Zoho OAuth client secret
- `ZOHO_REFRESH_TOKEN`: Zoho OAuth refresh token for automatic token rotation
- `PARTNERS_MODULE_API` (optional): Zoho CRM module name (defaults to "Partners")

### Configuration Notes
- All Zoho credentials must be configured for the EU region (zohoapis.eu, accounts.zoho.eu)
- OAuth refresh token flow enables automatic access token rotation without user intervention
- Partner intake endpoints use rate limiting (30 requests/minute) and CSRF protection