# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform designed to transform personal photos and videos into cinematic memory films. Its core purpose is to offer a seamless and intuitive experience for creating and managing cherished memory films. Key capabilities include a bilingual (French/English) content management system, a professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing tools, and real-time preview capabilities. The project aims to capture a market niche for personalized, high-quality video memories.

## Recent Changes
- **HowItWorksSection Content Refinement Complete (January 2025)**: Completely rewrote all three steps with comprehensive service descriptions. Step 1 emphasizes collaborative uploads, all format acceptance, and analog digitization services. Step 2 details narrative arc creation, music/duration/format suggestions, and client input respect. Step 3 specifies 1-3 week timeline with 2 revision rounds included. Updated brand terminology to consistently use "films souvenirs" throughout. Enhanced descriptions provide clear understanding of MEMOPYK's thorough creative process and collaborative approach.
- **Gallery Video Ordering System Completely Fixed (January 2025)**: Resolved critical bug where admin gallery reordering arrows appeared to work but items reverted to original positions. Root cause was twofold: (1) server-side galleryCache serving stale data for 30 seconds after swaps, and (2) admin interface using GalleryManagementNew.tsx component with outdated reorderItemMutation instead of proper swap logic. Fixed by implementing cache invalidation in server routes.ts and updating GalleryManagementNew.tsx with swapItemsMutation using correct /api/gallery/:id1/swap/:id2 endpoint. Gallery reordering now works permanently with comprehensive debugging and race condition prevention.
- **Brand Terminology Update Complete (January 2025)**: Updated all footer and meta tag references from "films mémoire" to "films souvenirs" (French) and "Memory Film Creator" to "Memory Keepsake Creator" (English) across Layout.tsx, LanguageContext.tsx, and public/index.html for consistent brand messaging.
- **Performance Dashboard Header System Complete (January 2025)**: Successfully implemented new X-Delivery/X-Upstream header system replacing confusing X-Cache-Status/X-Origin headers. System now displays accurate cache delivery methods (HIT/MISS) and upstream sources (supabase/local/other) instead of misleading "Cache + local" terminology. Verified across all routes: video proxy, image proxy, and gallery API. Performance testing confirms hero videos serve from cache in ~16ms vs ~1.7s fresh fetch, while gallery videos correctly show direct CDN streaming as designed.
- **Cache System Static Image Bug Fix Complete (January 2025)**: Completely resolved persistent cache discrepancy where system showed 9 static images instead of 6 after "Cache All Again" operations. Root cause was in video-cache.ts line 968 where forceCacheAllMedia method used deprecated `static_image_url` field instead of bilingual `static_image_url_en/fr` fields. Fixed cache system to properly collect unique static images from both languages, preventing orphaned image downloads (static_auto_1754314561668.jpg, static_auto_1754315173965.jpg, static_auto_1754337679940.jpg). Cache now consistently displays exactly 6 static images matching database with zero orphaned files.
- **Bilingual Static Image Cache Sync Complete (January 2025)**: Fully resolved critical bug where gallery items with `use_same_video: true` were generating separate static images for English and French versions. Fixed server-side logic in routes.ts to enforce shared static images when flag is true. Successfully synchronized database, cleaned up 3 orphaned images from local cache, and downloaded correct referenced images. Cache system now accurately displays exactly 6 static images total (one per gallery item) with perfect bilingual URL consistency. Issue completely resolved and verified.
- **Gallery Static Image Loading Performance Fix (January 2025)**: Fixed 2-3 second delay on F5 refresh by modifying cache-busting function to use static parameters instead of random timestamps. This preserves the existing server-side cache system while enabling browser caching for better performance.
- **Gallery Content Ordering Fix (January 2025)**: Reordered gallery card content display so "Histoire du film" (Story) now appears before "Situation du client" in both admin interface and public gallery. Applied consistently across English and French sections for logical content hierarchy.
- **Gallery Source Text Translation Fix (January 2025)**: Fixed gallery card source attribution text to display proper French translation: "fournies par Client" instead of English "provided by Client" when viewing site in French. Maintains bilingual accuracy across all gallery source overlays.
- **Legal Document Spacing Fix (January 2025)**: Implemented custom CSS class `.legal-document-tight` with balanced spacing (line-height: 1.3, 0.2rem margins) to ensure published legal documents match admin interface formatting exactly. Removed automatic document titles from published pages for complete user control over content presentation.
- **Cross-Page Navigation Fix (January 2025)**: Fixed navigation anchors so clicking header menu items (like "Galerie") from legal documents or other pages now properly navigates to homepage and scrolls to the correct section using sessionStorage for smooth transitions.
- **FAQ Interactive Styling (January 2025)**: Updated FAQ section to use official MEMOPYK beige colors (bg-memopyk-cream, text-memopyk-navy) when questions are opened, with single-question behavior ensuring only one question displays special styling at a time.
- **Rich Text Editor Fix (January 2025)**: Fixed Legal Documents editor toolbar positioning with sticky positioning and proper scrollable container setup. The toolbar now stays visible when scrolling through long content, and the interface uses a clean tabbed approach (French/English) with orange selection styling.
- **Legal Documents List Simplification (January 2025)**: Removed content preview sections with scroll bars from the documents list for a cleaner, more professional admin interface that focuses on essential document metadata and actions.

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
- **Deployment Optimizations**: Includes fast health check endpoints, production video cache preloading for hero videos, comprehensive error handling, routing priorities to prevent static file serving interference, and automated public asset copying during build process to ensure all static images are available in production.

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