# GA4 Video Analytics Implementation Tracker

## Overview
Migrating all video analytics to GA4 only (no custom backend writes). Implementing comprehensive video tracking for the Video Gallery with proper i18n support.

## Step 1 - GA4 Event Schema + Admin Setup
**Status**: 🔄 IN PROGRESS  
**Started**: 2025-08-15T08:58:00Z

### Requirements Checklist
- [ ] **Event Implementation**: 6 video events (open, start, pause, progress, complete, watch_time)
- [ ] **Event Parameters**: All required parameters (video_id, locale, position_sec, etc.)
- [ ] **Data Quality Rules**: Milestone dedupe, tolerance, batching, locale handling
- [ ] **GA4 Custom Definitions**: Create custom dimensions and metrics in GA4 Admin
- [ ] **Debug Mode Integration**: Use existing ga_dev toggle for debug_mode parameter
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
- [ ] **Hook Integration**: Connect to existing video gallery components
- [ ] **Event Logic**: Implement milestone tracking with deduplication
- [ ] **Watch Time Batching**: Accumulate and send on pause/ended/visibility change
- [ ] **Locale Detection**: Read from route (/fr-FR, /en-US) or localStorage
- [ ] **Debug Mode**: Integrate with existing ga_dev system
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

### Files to Modify
- `client/src/lib/analytics.ts` - Add video event functions
- `client/src/hooks/useVideoAnalytics.ts` - Update/create video tracking hook
- `client/src/components/gallery/VideoOverlay.tsx` - Add event firing
- Video gallery components - Integrate tracking calls

---

## Step 2 - TBD
**Status**: ⏳ PENDING

## Step 3 - TBD  
**Status**: ⏳ PENDING

---

## Notes
- Site is i18n: fr-FR and en-US
- Video Gallery has max 6 items, periodically updated
- Keep existing GA4 base tracking (page_view + SPA routes) 
- Keep existing developer/test-mode toggle
- Data quality rules include milestone dedupe and tolerance (±1%)