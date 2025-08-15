# GA4 Video Analytics Implementation Tracker

## Overview
Migrating all video analytics to GA4 only (no custom backend writes). Implementing comprehensive video tracking for the Video Gallery with proper i18n support.

## Step 1 - GA4 Event Schema + Code Implementation
**Status**: ✅ COMPLETE  
**Started**: 2025-08-15T08:58:00Z
**Completed**: 2025-08-15T09:17:00Z

### Requirements Checklist
- [x] **Event Implementation**: 6 video events (open, start, pause, progress, complete, watch_time)
- [x] **Event Parameters**: All required parameters (video_id, locale, position_sec, etc.)
- [x] **Data Quality Rules**: Milestone dedupe, tolerance, batching, locale handling
- [ ] **GA4 Custom Definitions**: Create custom dimensions and metrics in GA4 Admin (Manual Task)
- [x] **Debug Mode Integration**: Use existing ga_dev toggle for debug_mode parameter
- [ ] **Testing**: Verify in GA4 Realtime/DebugView

### Event Schema to Implement

#### Events:
1. `video_open` - when overlay/modal opens
2. `video_start` - first actual playback 
3. `video_pause` - when paused
4. `video_progress` - milestones 25/50/75/100% (once per session/video)
5. `video_complete` - at ≥90% or ended
6. `video_watch_time` - batched seconds watched

#### Parameters (all events unless noted):
- `video_id` (string) - filename slug (stable across locales)
- `video_title` (string, optional) - display title
- `locale` (string) - fr-FR or en-US
- `gallery` (string) - "Video Gallery"
- `player` (string) - "html5"
- `position_sec` (number) - current time
- `duration_sec` (number) - video duration
- `percent` (number) - 25|50|75|100 (progress only)
- `watch_time_sec` (number) - seconds batch (watch_time only)
- `debug_mode` (boolean) - from ga_dev toggle

### Implementation Tasks
- [x] **Hook Integration**: Connected to VideoOverlay.tsx component
- [x] **Event Logic**: Implemented milestone tracking with deduplication (±1% tolerance)
- [x] **Watch Time Batching**: Accumulate and send on pause/ended/visibility change
- [x] **Locale Detection**: Read from route (/fr-FR, /en-US) or localStorage fallback
- [x] **Debug Mode**: Integrated with existing ga_dev system (debug_mode parameter)
- [ ] **Testing Setup**: Verify events fire correctly in test mode

### GA4 Admin Setup (Manual Task)
- [ ] **Custom Dimensions** (Event scope):
  - video_id
  - video_title
  - locale
  - gallery
  - player  
  - percent
  - position_sec
- [ ] **Custom Metric** (Event scope):
  - watch_time_sec (Number)

### Testing Criteria
- [ ] GA4 Realtime shows events with correct parameters
- [ ] Custom definitions visible in GA4 UI
- [ ] Debug mode (debug_mode=true) marks test hits correctly
- [ ] All 6 events fire appropriately during video interaction
- [ ] Milestone deduplication working (each fires once per session/video)
- [ ] Watch time batching accumulates correctly

### Files Modified
- [x] `client/src/lib/analytics.ts` - Added 6 GA4 video event functions
- [x] `client/src/hooks/useGA4VideoAnalytics.ts` - Created new GA4 video tracking hook
- [x] `client/src/components/gallery/VideoOverlay.tsx` - Integrated all video event tracking
- Video gallery components - Main overlay component updated

### Code Implementation Complete
All GA4 video events are now implemented:
- ✅ **video_open**: Tracks when modal/overlay opens
- ✅ **video_start**: Tracks first playback (with deduplication)
- ✅ **video_pause**: Tracks pause events with current position
- ✅ **video_progress**: Tracks 25/50/75/100% milestones (once per session)
- ✅ **video_complete**: Tracks completion at ≥90% or video end
- ✅ **video_watch_time**: Batched watch time on pause/ended/page hide

---

## Step 2 - Testing & Validation
**Status**: 🔄 IN PROGRESS  
**Started**: 2025-08-15T09:35:00Z
**Goal**: Verify all 6 video events fire correctly in test mode

### External Test Mode Activation (CRITICAL)
**Reference**: See `GA4_TEST_MODE_ACTIVATION_GUIDE.md` for detailed instructions

The key insight: **Test mode must be activated BEFORE visiting the site** to avoid contaminating production analytics.

### Testing Checklist (Dev/Test Mode)
**Preparation:**
- [x] **CRITICAL**: Activate test mode BEFORE visiting site to avoid production contamination
  - ✅ Using Method 1: Visit site with `?ga_dev=1` parameter
- [x] Test mode activation verified via URL parameter detection
- [x] Added initTestMode() to App.tsx for proper branding display
- [x] Keep console open to see video event confirmations
- [x] Verify test mode: Hard refresh cleared localStorage - reinitializing via URL parameter
- [ ] Open GA4 → Realtime → Debug View → verify debug_mode events appear

**Starting Video Event Testing:**
**Time**: 2025-08-15T10:10:45Z  
**Method**: URL parameter reinitializing after hard refresh

**Test Each Event:**
- [✅] **video_open**: SUCCESS! Event fired correctly
  - ✅ Console shows: `📹 GA4 Video: video_open` with correct parameters
  - ✅ Video ID: PomGalleryC.mp4, Locale: fr-FR, Title: "L'été de Pom"
  - ✅ Video overlay opened and is buffering
- [🔄] **video_start**: Ready to test - please click Play button
  - Expect: Fires only once per video session
  - Parameters: video_id, locale, current_time
- [ ] **video_pause**: Pause at random point
  - Expect: Shows current_time in seconds, fires on every pause
- [ ] **video_progress**: Play past 25%, 50%, 75%, 100%
  - Expect: Each milestone fires once per session
  - Parameter: progress_percent
- [ ] **video_complete**: Reach ≥90% or natural end
  - Expect: One event per full view
- [ ] **video_watch_time**: Pause or finish video
  - Expect: watch_time_seconds is accurate

**Cross-Language Test:**
- [ ] Test in French: `https://memopyk.com/fr-FR/?ga_dev=1`
- [ ] Test in English: `https://memopyk.com/en-US/?ga_dev=1`  
- [ ] Confirm locale parameter matches path (fr-FR vs en-US)

**Important Notes:**
- ⚠️ **URL Parameter Method**: Most reliable - test mode activates BEFORE analytics fire
- ⚠️ **External Activation**: Never enable test mode while already on MEMOPYK site
- ⚠️ **Production Safety**: Test mode persists in localStorage until manually disabled

---

## Step 3 - GA4 Admin Setup
**Status**: ⏸️ PENDING (Manual Task)
**Goal**: Create custom dimensions and metrics in GA4 Admin

### Custom Dimensions to Create (scope = Event)
**Location**: GA4 Admin → Custom definitions → Create custom dimensions
- [ ] **video_id**: Stores filename or unique ID of video
- [ ] **locale**: Stores language code (fr-FR, en-US)
- [ ] **progress_percent**: Quartile milestone (25, 50, 75, 100)
- [ ] **current_time**: Time position at pause/start (seconds)

### Custom Metrics to Create (scope = Event)  
**Location**: GA4 Admin → Custom definitions → Create custom metrics
- [ ] **watch_time_seconds**: Total watch time per session (number)

### Verification After Setup
- [ ] Re-run tests in non-dev mode to ensure GA4 stores real data
- [ ] Check GA4 → Explore → Create table with:
  - Rows: video_id
  - Columns: locale  
  - Metrics: watch_time_seconds, count of video_complete
  - Breakdown by progress_percent for milestone analysis

---

## Step 4 - Final Deployment
**Status**: ⏸️ PENDING
**Goal**: Deploy with confirmed GA4 video analytics

### Final Checks
- [ ] All events tested and verified in GA4 Realtime
- [ ] Custom dimensions and metrics created and working
- [ ] Cross-language functionality confirmed
- [ ] Console logs clean (no errors)
- [ ] Supabase video tracking remains disabled (feature flag OFF)

---

## Notes
- Site is i18n: fr-FR and en-US
- Video Gallery has max 6 items, periodically updated
- Keep existing GA4 base tracking (page_view + SPA routes) 
- Keep existing developer/test-mode toggle
- Data quality rules include milestone dedupe and tolerance (±1%)