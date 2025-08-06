# MEMOPYK Desktop Gallery - Technical Specifications

## System Overview

### Architecture Components
```
Frontend (React + TypeScript + Vite)
    ↓ HTTP Requests
Backend (Node.js + Express)
    ↓ Database Queries  
PostgreSQL Database (Neon)
    ↓ File Storage
Supabase CDN Storage
```

### Data Flow
1. **API Request**: Frontend requests `/api/gallery`
2. **Database Query**: Backend queries PostgreSQL for gallery items
3. **Data Transform**: Raw database response (snake_case) returned to frontend
4. **Component Render**: GallerySection.tsx processes data for display
5. **Image Loading**: LazyImage component loads from Supabase CDN URLs

## API Response Structure

### Endpoint: GET /api/gallery
```json
{
  "id": "fe696b9e-6fd5-4c54-bf73-018439c95999",
  "title_en": "The summer of Pom",
  "title_fr": "L'été de Pom", 
  "price_en": "USD 225",
  "price_fr": "225 €",
  "source_en": "50 photos & 22 videos",
  "source_fr": "50 photos & 22 videos",
  "duration_en": "3 minutes",
  "duration_fr": "3 minutes",
  "situation_en": "The Client is the dogsitters...",
  "situation_fr": "Ce film montre les vacances d'été...",
  "story_en": "This film shows the summer vacation...",
  "story_fr": "Ce film montre les vacances d'été...",
  "sorry_message_en": "Sorry, we cannot show you...",
  "sorry_message_fr": "Désolé, nous ne pouvons pas...",
  "format_platform_en": "Social Media",
  "format_platform_fr": "Réseaux Sociaux",
  "format_type_en": "Mobile Stories", 
  "format_type_fr": "Stories Mobiles",
  "video_url_en": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/PomGalleryC.mp4",
  "video_url_fr": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/PomGalleryC.mp4",
  "video_filename": "PomGalleryC.mp4",
  "video_width": 1920,
  "video_height": 1080,
  "video_orientation": "landscape",
  "image_url_en": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/AAA_002_0000014.jpg",
  "image_url_fr": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/AAA_002_0000014.jpg",
  "static_image_url_en": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/AAA_002_0000014-C.jpg",
  "static_image_url_fr": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/VitaminSeaC-C.jpg",
  "static_image_url": null,
  "use_same_video": false,
  "order_index": 1,
  "is_active": true
}
```

### Key Fields for Image Display
- `static_image_url_en`: Cropped English thumbnail (300x200, 3:2 aspect ratio)
- `static_image_url_fr`: Cropped French thumbnail (300x200, 3:2 aspect ratio)  
- `image_url_en`: Original English image (full resolution)
- `image_url_fr`: Original French image (full resolution)
- `use_same_video`: Boolean indicating if same video used for both languages

## Image Processing Pipeline

### 1. Original Upload
- User uploads high-resolution images via admin interface
- Images stored in Supabase storage with original filenames
- Example: `AAA_002_0000014.jpg` (3024x2016 pixels)

### 2. Automated Cropping
- Sharp.js processes uploaded images
- Generates 300x200 thumbnails with 3:2 aspect ratio
- Adds `-C` suffix to indicate cropped version
- Example: `AAA_002_0000014-C.jpg` (300x200 pixels)

### 3. Database Storage
- Original and cropped URLs stored in separate database fields
- `image_url_*`: Points to original high-resolution image
- `static_image_url_*`: Points to cropped thumbnail

## Component Architecture

### GallerySection.tsx (Desktop - AFFECTED)
```typescript
interface GalleryItem {
  // Snake_case properties matching API response
  static_image_url_en: string | null;
  static_image_url_fr: string | null;
  image_url_en: string;
  image_url_fr: string;
  use_same_video: boolean;
  // ... other properties
}

// Image URL resolution logic
const getImageUrl = (item: GalleryItem) => {
  // Priority 1: Use cropped thumbnails
  let staticImageUrl = '';
  if (item.use_same_video) {
    staticImageUrl = item.static_image_url_en || '';
  } else {
    staticImageUrl = language === 'fr-FR' 
      ? item.static_image_url_fr || ''
      : item.static_image_url_en || '';
  }
  
  // Priority 2: Fallback to original images
  if (!staticImageUrl) {
    // ... fallback logic
  }
}
```

### MobileEnhancedGallery.tsx (Mobile - WORKING)
```typescript
// Correct implementation using snake_case properties
const imageUrl = language === 'fr-FR' 
  ? item.static_image_url_fr || item.image_url_fr
  : item.static_image_url_en || item.image_url_en;
```

### LazyImage.tsx (Shared - WORKING)
```typescript
// Generic image loading component
// Handles any URL passed to it with lazy loading and error fallback
<img 
  src={currentSrc}
  alt={alt}
  onLoad={handleLoad}
  onError={handleError}
  loading="lazy"
/>
```

## Database Schema

### Table: gallery_items
```sql
CREATE TABLE gallery_items (
  id UUID PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  image_url_en TEXT,
  image_url_fr TEXT,
  static_image_url_en TEXT,
  static_image_url_fr TEXT,
  video_url_en TEXT,
  video_url_fr TEXT,
  use_same_video BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Error Analysis

### TypeScript Property Access Errors
The desktop component contains 86 compilation errors due to property name mismatches:

```typescript
// INCORRECT - These properties don't exist
item.staticImageUrlEn     // Should be: item.static_image_url_en
item.staticImageUrlFr     // Should be: item.static_image_url_fr
item.useSameVideo         // Should be: item.use_same_video
item.titleEn              // Should be: item.title_en
item.titleFr              // Should be: item.title_fr
// ... 81 more similar errors
```

### Runtime Impact
1. **Property Access**: `item.staticImageUrlEn` returns `undefined`
2. **Fallback Logic**: Code continues to `item.static_image_url_en`
3. **Conditional Logic Bug**: Undefined values affect conditional flow
4. **Result**: Wrong code paths selected, original images loaded

## CDN URL Structure

### Supabase Storage URLs
```
Base URL: https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/

Original Images:
- AAA_002_0000014.jpg (3024x2016)
- VitaminSeaC.jpg (various sizes)

Cropped Thumbnails:
- AAA_002_0000014-C.jpg (300x200)
- VitaminSeaC-C.jpg (300x200)
```

### Cache Busting Strategy
```typescript
// Implemented but ineffective due to root cause
const timestamp = Date.now();
const random = Math.random().toString(36).substring(7);
const url = `${baseUrl}?crop=static&t=${timestamp}&r=${random}&force=1`;
```

## Testing Validation

### Expected Behavior
1. **Desktop Gallery**: Should display cropped thumbnails (`-C.jpg` files)
2. **Mobile Gallery**: Should display cropped thumbnails (already working)
3. **Visual Consistency**: Both platforms show identical 3:2 aspect ratio images
4. **Performance**: Faster loading due to smaller thumbnail sizes

### Current Behavior  
1. **Desktop Gallery**: Displays original full-size images
2. **Mobile Gallery**: Correctly displays cropped thumbnails
3. **Visual Inconsistency**: Desktop shows different images than mobile
4. **Performance Impact**: Slower loading due to larger image sizes

### Validation Tests
```bash
# Test image URL accessibility
curl -I "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/AAA_002_0000014-C.jpg"
# Expected: HTTP/1.1 200 OK

# Test original image URL
curl -I "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/AAA_002_0000014.jpg"  
# Expected: HTTP/1.1 200 OK
```

Both return 200 status, confirming CDN accessibility is not the issue.

## Resolution Strategy

### Phase 1: Property Access Fix
Replace all camelCase property access with snake_case in GallerySection.tsx

### Phase 2: TypeScript Validation
Ensure zero compilation errors after property fixes

### Phase 3: Browser Testing
Verify DOM elements contain correct `-C.jpg` URLs

### Phase 4: Visual Verification
Confirm desktop gallery displays cropped 3:2 aspect ratio images

---

**Technical Specifications Version**: 1.0  
**Last Updated**: August 6, 2025  
**Component Compatibility**: React 18, TypeScript 5.x, Vite 5.x