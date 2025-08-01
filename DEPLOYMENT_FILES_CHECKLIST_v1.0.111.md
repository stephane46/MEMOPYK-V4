# DEPLOYMENT FILES CHECKLIST v1.0.111

## CRITICAL FILES FOR DEPLOYMENT

### 1. MODIFIED FILES (Must Deploy)
```
client/src/components/sections/GallerySection.tsx
client/src/components/admin/GalleryManagementNew.tsx
```

### 2. CORE SYSTEM FILES (Required for Full Deployment)
```
package.json
package-lock.json
drizzle.config.ts
components.json
tsconfig.json
vite.config.ts
tailwind.config.ts
```

### 3. SERVER FILES
```
server/routes.ts
server/hybrid-storage.ts
server/vite.ts
server/db.ts
server/storage.ts
```

### 4. SHARED SCHEMA
```
shared/schema.ts
```

### 5. CLIENT CORE FILES
```
client/src/App.tsx
client/src/main.tsx
client/src/index.css
client/src/contexts/LanguageContext.tsx
client/src/lib/queryClient.ts
client/src/lib/utils.ts
```

### 6. ADMIN COMPONENTS
```
client/src/components/admin/GalleryManagementNew.tsx
client/src/components/admin/FAQManagementWorking.tsx
client/src/components/admin/LegalDocumentManagement.tsx
client/src/components/admin/CtaManagement.tsx
client/src/components/admin/AnalyticsDashboard.tsx
client/src/components/admin/VideoCacheStatus.tsx
client/src/components/admin/SeoManagement.tsx
client/src/components/admin/SystemTestDashboard.tsx
client/src/components/admin/SimpleImageCropper.tsx
client/src/components/admin/DirectUpload.tsx
client/src/components/admin/FormatBadgeManager.tsx
```

### 7. PUBLIC SECTIONS
```
client/src/components/sections/GallerySection.tsx
client/src/components/sections/HeroVideoSection.tsx
client/src/components/sections/KeyVisualSection.tsx
client/src/components/sections/HowItWorksSection.tsx
client/src/components/sections/WhyMemopykSection.tsx
client/src/components/sections/FAQSection.tsx
client/src/components/sections/CtaSection.tsx
```

### 8. UI COMPONENTS
```
client/src/components/ui/button.tsx
client/src/components/ui/form.tsx
client/src/components/ui/input.tsx
client/src/components/ui/label.tsx
client/src/components/ui/select.tsx
client/src/components/ui/textarea.tsx
client/src/components/ui/dialog.tsx
client/src/components/ui/toast.tsx
client/src/components/ui/badge.tsx
client/src/components/ui/card.tsx
client/src/components/ui/switch.tsx
client/src/components/ui/separator.tsx
client/src/components/ui/progress.tsx
client/src/components/ui/rich-text-editor.tsx
client/src/components/ui/LazyImage.tsx
```

### 9. PAGES
```
client/src/pages/AdminPage.tsx
client/src/pages/AdminLogin.tsx
```

### 10. MOBILE COMPONENTS
```
client/src/components/mobile/MobileEnhancedGallery.tsx
client/src/components/mobile/MobileOptimizationIndicator.tsx
```

### 11. GALLERY COMPONENTS
```
client/src/components/gallery/VideoOverlay.tsx
```

### 12. HOOKS
```
client/src/hooks/use-toast.ts
client/src/hooks/useVideoAnalytics.ts
client/src/hooks/useNetworkStatus.ts
client/src/hooks/useDeviceOrientation.ts
client/src/hooks/useIntersectionObserver.ts
```

### 13. UTILITIES
```
client/src/lib/sanitize-html.ts
client/src/lib/date-utils.ts
```

### 14. STATIC FILES
```
public/logo.svg
client/src/components/ui/rich-text-editor.css
```

## DEPLOYMENT VERIFICATION COMMANDS

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start

# Database push (if schema changes)
npm run db:push
```

## POST-DEPLOYMENT VERIFICATION

1. Check admin loads: `https://your-domain.com/admin`
2. Check public gallery: `https://your-domain.com/`
3. Verify console shows `v1.0.110` cache key
4. Test admin editing functionality
5. Confirm changes appear immediately on public site

## CRITICAL CACHE SYNCHRONIZATION CHECK

Both admin and public sites should show in console:
```
🚨 CACHE SYNCHRONIZATION FIX v1.0.110
✅ Public site now uses same cache key as admin
📋 Cache invalidation synchronized between admin and public
🎯 Gallery data loading with synchronized query keys
```