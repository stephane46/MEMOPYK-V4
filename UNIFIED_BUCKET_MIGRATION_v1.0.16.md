# UNIFIED BUCKET MIGRATION v1.0.16 - Complete System Architecture

## Overview
Migration from fragmented bucket system to unified `memopyk-videos` bucket containing ALL media assets.

## BEFORE (Fragmented System)
```
Buckets:
- memopyk-gallery (poorly named, contained both videos AND images)
- Different handling for hero videos vs gallery videos
- Admin interface inconsistency

Hero Video Management:
- Filename-based storage (VideoHero1.mp4)
- Manual filename entry field
- Unified video proxy routing (/api/video-proxy?filename=)

Gallery Management:
- Full URL storage (complex Supabase URLs)
- No manual entry field
- Direct CDN streaming (slower)
```

## AFTER (Unified System v1.0.16)
```
Single Bucket:
- memopyk-videos (clear naming, ALL media types)
- Contains: Hero videos, Gallery videos, Gallery images, Static images

Unified Admin Interface:
- Filename-based storage for ALL content types
- Manual filename entry field for both Hero and Gallery management
- Consistent video proxy routing for ALL videos
- Unified cache system for ALL media assets

File Examples in memopyk-videos:
- VideoHero1.mp4, VideoHero2.mp4, VideoHero3.mp4
- gallery_Our_vitamin_sea_rework_2_compressed.mp4
- static_1753304723805.png
- static_123456789.jpg
```

## Technical Changes Applied

### 1. Video Cache System (server/video-cache.ts)
```javascript
// BEFORE
const fullVideoUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${encodedFilename}`;

// AFTER
const fullVideoUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
```

### 2. Image Cache System (server/video-cache.ts)
```javascript
// BEFORE
const fullImageUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;

// AFTER
const fullImageUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
```

### 3. Gallery Management Admin Interface
- Added manual `video_filename` field to match Hero Video pattern
- Blue-highlighted section explaining unified bucket system
- Clear examples showing all media types in single bucket

### 4. Database Schema Support
- `video_filename` field already added to gallery_items table
- Supports transition from URL-based to filename-based storage

## Migration Strategy

### Phase 1: Bucket Creation (Supabase Admin)
1. Create new `memopyk-videos` bucket in Supabase
2. Set public access policies matching existing bucket
3. Copy all files from `memopyk-gallery` to `memopyk-videos`
4. Verify all files accessible in new bucket

### Phase 2: System Update (Already Applied)
1. ✅ Update video-cache.ts for unified bucket URLs
2. ✅ Update image proxy for unified bucket URLs  
3. ✅ Add manual filename field to Gallery Management
4. ✅ Update admin interface documentation

### Phase 3: Data Migration (Next Step)
1. Update existing gallery items to use video_filename field
2. Test video proxy routing with both hero and gallery videos
3. Verify image proxy works with unified bucket
4. Update cache preloading to use unified bucket

### Phase 4: Legacy Cleanup (Future)
1. Remove old memopyk-gallery bucket after verification
2. Remove legacy URL fields from database (keep for compatibility initially)
3. Update documentation to reflect unified system

## Benefits Achieved

### 1. Administrative Simplicity
- Single bucket to manage instead of multiple buckets
- Consistent filename-based approach for all media
- Unified cache status reporting

### 2. Performance Consistency  
- All videos served through optimized video proxy
- All images served through optimized image proxy
- Unified cache system with consistent performance

### 3. Developer Experience
- Clear naming convention (memopyk-videos = all media)
- Consistent admin interface patterns
- Reduced cognitive load for content management

### 4. System Scalability
- Single bucket approach scales better
- Unified cache management
- Simplified backup and migration procedures

## Next Steps
1. **Create memopyk-videos bucket in Supabase admin**
2. **Copy existing files to new bucket**
3. **Test video/image proxy with unified bucket**
4. **Update gallery items to use filename field**
5. **Verify cache system works with unified bucket**

## Success Criteria
- [x] Unified bucket system implemented in code
- [ ] memopyk-videos bucket created and populated
- [ ] All videos accessible via /api/video-proxy
- [ ] All images accessible via /api/image-proxy  
- [ ] Admin interface provides consistent experience
- [ ] Cache system works with unified bucket
- [ ] Performance maintains ~50ms local cache speeds