# Desktop Gallery Issue Analysis

## Root Cause: Property Name Mismatch

The desktop gallery was failing because of a fundamental TypeScript property access error:

### API Response (snake_case):
```json
{
  "static_image_url_en": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/AAA_002_0000014-C.jpg",
  "static_image_url_fr": "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/VitaminSeaC-C.jpg"
}
```

### Code Trying to Access (camelCase):
```typescript
item.staticImageUrlEn || item.static_image_url_en || ''
```

### Runtime Result:
- `item.staticImageUrlEn` = `undefined` (property doesn't exist)
- Falls back to `item.static_image_url_en` = correct URL
- BUT the undefined check in conditional logic was causing issues

## Files in this folder:
1. `GallerySection.tsx` - Desktop gallery component with type errors
2. `LazyImage.tsx` - Image loading component (working correctly)  
3. `MobileEnhancedGallery.tsx` - Mobile version (working correctly)

## TypeScript Errors:
86 errors all related to property name mismatches between interface definition (snake_case) and usage (camelCase).

## Solution:
Fix all property access in GallerySection.tsx to use snake_case names consistently, matching the API response format.