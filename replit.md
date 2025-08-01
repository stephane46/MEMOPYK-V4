# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform with a comprehensive bilingual (French/English) content management system. The platform features professional video lightbox system, gallery management with reliable video streaming, language-specific upload functionality, image reframing tools, and real-time preview capabilities. Recent success: Complete resolution of critical duplicate ID bug preventing video creation - all gallery management features now fully operational with proper database integration.

## User Preferences
Preferred communication style: Simple, everyday language.

**Technical Decisions:**
- React Editor Future-Proofing: Consider TipTap as React 19 alternative to ReactQuill when needed
- Track ReactQuill updates for React 19 compatibility improvements
- Prioritize stable, tested solutions over bleeding-edge dependencies
- **Typography**: Poppins (sans-serif) everywhere EXCEPT Playfair Display (serif) ONLY for hero video overlay text

**Analytics Strategy Decision:**
- Remove hero video tracking (auto-play videos don't provide meaningful analytics)
- Focus analytics on gallery video previews and user engagement
- Track which gallery items are most popular to inform business decisions

**Gallery Video Architecture Decision - FINAL:**
- Direct CDN Streaming: Gallery videos use direct Supabase CDN URLs for reliable production playback
- Infrastructure Bypass: Avoids infrastructure blocking issues that prevented cached video serving in production
- Clean Architecture: Hero videos = cache system (50ms), Gallery videos = direct CDN (1500ms but reliable)
- Production Reliability: Eliminates HTTP 500 errors and ensures gallery videos work in all deployment environments
- Simplified Maintenance: Reduced complexity by keeping cache system only where it works (hero videos)
- Complete Functionality: Gallery lightbox, admin management, and all features working reliably
- Performance Trade-off: Accepted slower gallery video loading for guaranteed production functionality
- **Language-Specific Upload System FULLY OPERATIONAL (July 31, 2025)**: French/English image uploads work correctly, database sync fixed, public site displays correct language-specific images and videos
- **Language Prioritization Strategy (August 1, 2025)**: When switching from separate FR/EN media to shared mode, system prioritizes English (EN) content and copies it to French (FR) fields, permanently overwriting original French content
- **Critical Duplicate ID Bug RESOLVED (July 31, 2025)**: Fixed createGalleryItem function to properly insert into database with UUID generation, eliminating duplicate ID errors and ensuring new videos appear in dropdown and public site
- **Advanced Mobile Optimization COMPLETED (August 1, 2025)**: Comprehensive mobile optimization implemented for Gallery Section (responsive grid 1→2→3 columns, touch-friendly overlays), FAQ Section (responsive headers, mobile text sizing, 44px touch targets), Video Lightbox (90% viewport ratio, touch controls, dedicated close button), and Hero Section (reduced height 80vh mobile, optimized text sizing). Enhanced with progressive web app features including lazy loading, network status detection, device orientation optimization, mobile-enhanced gallery component, performance indicators, and advanced touch interactions. All components meet 44px minimum touch target requirement for accessibility.
- **Shared Mode Image Cropper Fix COMPLETED (August 1, 2025)**: Fixed critical bug where image cropper showed previous image instead of newly uploaded shared image. In shared mode, cropper now always uses English image URL as source of truth, and save operation updates both French and English static image URLs simultaneously since they share the same source image.
- **Dual Badge System for Image Processing COMPLETED (August 1, 2025)**: Implemented smart badge system with ✂️ scissors icon for both manual and automatic image processing. Green "✂️ Recadré EN/FR" badges indicate manual user cropping via reframe tool, while blue "✂️ Auto EN/FR" badges show automatic system-generated 300x200 thumbnails. System intelligently detects processing method via crop_settings to provide accurate visual feedback to users.
- **Sharp Auto-Processing Integration COMPLETED (August 1, 2025)**: Fixed critical issue where DirectUpload bypassed Sharp auto-processing. Integrated Sharp thumbnail generation into complete-direct-upload route, ensuring all image uploads (both server-side and direct-to-Supabase) automatically generate 300x200 thumbnails with proper aspect ratio detection. Auto-processing now triggers for all upload methods, resolving badge system inconsistencies where new uploads showed incorrect "Recadré" status instead of "Auto" or no badge.
- **Auto-Crop Badge System FULLY OPERATIONAL (August 1, 2025)**: Complete end-to-end auto-crop functionality working correctly. New uploads show "✂️ Auto EN/FR" badges for Sharp auto-processed images, badge updates to "✂️ Recadré EN/FR" when manual cropping performed, cropped images save correctly to database and display properly on public site. Badge logic prioritizes formData.cropSettings over selectedItem.cropSettings for accurate new upload detection.
- **Image Cropper Status - FUNCTIONAL WITH LIMITATIONS (August 1, 2025)**: Core functionality complete - users can successfully create and manage cropped images, with proper saving and public site display. Real-time preview updates during dragging partially implemented but not fully operational. Position state synchronization improvements made to SimpleImageCropper component, but live preview feedback during manual crop adjustments needs further refinement for optimal user experience.
- **CRITICAL HERO TEXT DATABASE SYNCHRONIZATION COMPLETE (August 1, 2025)**: Successfully resolved database architecture confusion and implemented proper PostgreSQL integration. Migrated production hero text data to existing `hero_text_settings` table following established schema, eliminated duplicate `hero_texts` table, and fixed hybrid storage system to use correct database table. Database connection now working perfectly with PostgreSQL returning proper production content: ID 1 "Transformez vos souvenirs en films cinématographiques" (inactive), ID 2 "Nous transformons vos photos et vidéos personnelles en films souvenirs inoubliables" (active). **CRITICAL LESSON LEARNED**: Always check existing database schema before creating new tables - fundamental development best practice for avoiding duplicate table architecture.
- **RESPONSIVE FONT SIZE SYSTEM FULLY OPERATIONAL (August 1, 2025)**: Implemented complete device-specific font controls with Desktop/Tablet/Mobile interfaces in admin panel. Database migration successfully added responsive font columns (font_size_desktop, font_size_tablet, font_size_mobile) to PostgreSQL. Hero text component now uses CSS clamp() for optimal scaling across all devices. Backend API updated to save/load responsive font parameters. Admin interface features device switching buttons, separate font size sliders for each device, and real-time preview. Font size synchronization system automatically loads device-specific values when texts are selected. System integrates with MEMOPYK design system using CSS clamp(mobile_size, tablet_size, desktop_size) for seamless responsive scaling.

**Clean Minimal Video Controls - USER REQUIREMENT FULLY ACHIEVED:**
- Three-Dots Menu Removed: Eliminated vertical menu with download, playback speed, and picture-in-picture options
- Fullscreen Button Removed: Successfully hidden the maximize/fullscreen button (four arrows icon) using CSS pseudo-elements
- Browser Controls Enabled: Restored essential browser controls with hover functionality
- Clean Interface: Gallery videos now show only play/pause, timeline scrubber, and volume controls
- Cross-Browser Compatibility: CSS rules target both WebKit and Mozilla engines for consistent appearance
- 80% Viewport Scaling: Maintained larger video size with perfect aspect ratio preservation

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation resolvers
- **UI/UX Decisions**:
    - Typography: Poppins (sans-serif) as default, Playfair Display (serif) for hero video overlay text.
    - Color Scheme: MEMOPYK brand palette (Dark Blue #2A4759, Orange #D67C4A, Navy #011526, Cream #F2EBDC, Sky Blue #89BAD9).
    - Responsive Design: Adapts to all screen sizes, including mobile-optimized layouts and touch gestures for video carousels.
    - Image Cropping: Inline drag-and-reposition interface for images, providing real-time visual feedback.
    - Video Display: Minimal controls for gallery videos, 2/3 screen size lightbox with blurred background, no black bars (object-cover).
    - Admin Interface: Streamlined content management, consistent branding, professional field labeling, clear visual indicators for status and changes.

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL store

### Project Structure
- `client/`: React frontend application
- `server/`: Express backend application
- `shared/`: Shared types, schemas, and utilities
- `migrations/`: Database migration files
- `dist/`: Production build output

### Key Architectural Decisions
- **Hybrid Storage System**: JSON fallback for all data for offline operation and redundancy, complementing PostgreSQL.
- **Universal Video Proxy**: Handles all video serving, supporting range requests, local caching, and fallback to Supabase CDN.
- **Image Proxy**: Dedicated endpoint to manage image loading, solve CORS issues, and prioritize static cropped images.
- **Cache Management**: Smart caching system for hero videos (immediate preload, 50ms load times), with explicit manual controls and automatic cleanup. Gallery videos use direct CDN streaming.
- **Bilingual Support**: Comprehensive French/English content management throughout the platform, including UI, data, and SEO.
- **Modular API Design**: RESTful API endpoints for all content types (hero videos, gallery, FAQs, legal documents, analytics).
- **Static Image Generation**: Automated cropping and generation of 300x200 static images for gallery thumbnails with direct original image mapping.
- **Real-time Analytics**: Backend system for tracking visitors, performance, and engagement, with multi-view analysis and historical recalculation capabilities.
- **IP Management System**: Tools for viewing, excluding, and managing active IP addresses for analytics privacy.
- **Direct Supabase Upload System**: Bypasses Replit deployment limits by uploading large files directly to Supabase storage.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings.
- **Advanced Mobile Features**: Progressive web app capabilities including lazy image loading with intersection observer, network status monitoring, device orientation detection, mobile-enhanced gallery with smart touch interactions, performance optimization indicators, and adaptive UI based on device capabilities.

## Known Issues - Future Refinements Needed

### Image Cropper Real-Time Preview (Low Priority)
- **Issue**: Manual crop position adjustments in admin interface don't show real-time preview updates during dragging
- **Impact**: Functional but suboptimal user experience - users must generate final image to see crop result
- **Status**: Core functionality complete (saving/loading works correctly), UI enhancement needed
- **Components**: SimpleImageCropper.tsx position state synchronization between parent and child components

### TypeScript Interface Warnings (Low Priority)  
- **Issue**: 22 LSP diagnostics in GalleryManagementNew.tsx related to interface mismatches
- **Impact**: No functional impact, development warnings only
- **Status**: All features work correctly despite TypeScript warnings
- **Components**: Interface definitions need alignment with database schema fields

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting for production data.
- **Supabase**: Used for video and image storage (CDN), signed URLs, and as a primary data source.

### UI Components
- **Radix UI**: Provides unstyled, accessible component primitives.
- **Lucide React**: Icon library for consistent iconography.
- **Tailwind CSS**: Utility-first CSS framework for styling.

### Development Tools
- **@replit/vite-plugin-cartographer**: For Replit-specific integration (though it caused issues previously).
- **Vite**: Frontend build tool.
- **Express.js**: Backend web framework.
- **Drizzle ORM**: Type-safe database ORM.
- **Zod**: Schema validation library.
- **React-Quill**: Rich text editor for content management (e.g., FAQs, legal documents).
- **DOMPurify**: HTML sanitization library for security.
- **Crypto-js**: For client-side MD5 hashing (for cache status detection).
- **Multer**: Node.js middleware for handling `multipart/form-data` (file uploads).