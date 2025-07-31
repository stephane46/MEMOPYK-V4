# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform currently undergoing a complete rebuild. The project is in Phase 1, focusing on a minimal React + TypeScript + Vite setup integrated with MEMOPYK visual assets. The overarching goal is to create a robust, scalable platform by systematically documenting and incrementally implementing features, addressing past technical challenges. The business vision is to provide a reliable and high-performance platform for memory film creation, with significant market potential for personalized video content.

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
- Unified Bucket Strategy: All videos (hero and gallery) use single `memopyk-videos` bucket for consistency
- Fixed URL Extraction: Gallery section properly extracts filenames from full URLs for proxy compatibility
- Cached Proxy System: Both hero and gallery videos use video proxy for fast cached serving (50ms load times)
- Database Cleanup: All gallery items point to correct `memopyk-videos` bucket URLs
- Old Bucket Removed: `memopyk-gallery` bucket and all 66 files completely deleted from Supabase
- Consistent Performance: Gallery videos now match hero video performance with cached serving
- Simplified Architecture: Single bucket, single proxy system, unified caching for all video content

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