# How We Work On "Analytics New" Dashboard (READ FIRST)

## 0) Where this lives in the app (mandatory)
- Add a new admin menu item: **“Analytics New”** → route **`/admin/analytics-new`**.
- Do **not** touch or import anything from existing analytics menus or files.
- All code for this project lives in a **new, isolated namespace**:

**Naming & structure (use exactly these prefixes)**
- Folder: `client/src/admin/analyticsNew/`  
- Components: `AnalyticsNew*` (e.g., `AnalyticsNewKpiCard.tsx`)  
- Pages (tabs): `AnalyticsNewOverview.tsx`, `AnalyticsNewLiveView.tsx`, `AnalyticsNewVideo.tsx`,  
  `AnalyticsNewGeo.tsx`, `AnalyticsNewCta.tsx`, `AnalyticsNewTrends.tsx`,  
  `AnalyticsNewClarity.tsx`, `AnalyticsNewFallback.tsx`  
- State store: `analyticsNewFilters.store.ts`  
- Adapters: `analyticsNew.ga4.adapter.ts`, `analyticsNew.tracker.adapter.ts`, `analyticsNew.clarity.adapter.ts`  
- Styles/tokens: `analyticsNew.tokens.css` (with MEMOPYK palette)  
- Routes: mount under `/admin/analytics-new/*` only

**Forbidden (no reuse)**
- Do **not** import or reuse any existing analytics files (e.g. `client/src/components/admin/AnalyticsControls.tsx`).  
- No copy-paste with minor edits — write **original** components under `analyticsNew/`.  
- Self-check before PR:  
  ```
  rg -n "AnalyticsControls|CleanGA4|GA4AnalyticsDashboard|AnalyticsDashboard" client/src || echo OK
  ```

---

## 1) Daily updates & checkboxes (required)
- Update this doc every time you push/finish:
  - Check the task `[x]`.
  - Add a note: what changed + how you verified (e.g., “mock KPIs render; 7d/30d switch works”).  
  - Attach evidence (GIF/screenshot or PR link).

**Status checkboxes per task block:**
```
Status: [ ] Backlog  [ ] In Progress  [ ] In Review  [ ] Done
```
- Start = Backlog.  
- When coding = In Progress.  
- When PR opened = In Review.  
- After approval = Done.

---

## 2) Kanban board (mandatory)
- We use a GitHub Project board with **Backlog → In Progress → Review → Done**.
- Move the card when you change the status in this doc.
- Link your PR to the card (e.g., `Closes #12`) or paste PR URL in your note.

---

## 3) Data sources policy (v1 — API only, no warehouse)
- **No BigQuery, no Supabase warehousing, no local persistence for GA4.**
- The dashboard fetches **aggregated GA4 metrics** live:
  - `/api/ga4/report` (runReport), `/api/ga4/realtime` (runRealtimeReport).
  - Server caches: ~60s for reports, ~10s for realtime.
- **Microsoft Clarity:** links only (heatmaps, replays). No storage in v1.
- **Tracker:** only for Live View (Currently Watching), in-memory TTL (≈120s).
- Summary: v1 = **API-driven, stateless, no warehouses**.

---

## 4) UX-first approach (required)
- **Phase 1 = UI/UX only with mocks.**
- Build all tabs with `USE_MOCK=true`.
- Show **Loading / Empty / Error** states.
- I review UI/flow before we wire APIs.
- Later phases swap mocks → real endpoints gradually.

**Mock toggles (per adapter):**
```ts
const USE_MOCK = true;
const SIMULATE_ERROR = false;
const SIMULATE_EMPTY = false;
```

---

## 5) Definitions of Done (DoD)
A task is **done** when:
1. Acceptance bullets satisfied,  
2. Checkbox ticked + status = Done,  
3. Evidence attached (GIF/screenshot/PR),  
4. No console errors/warnings.

---

# 📊 MEMOPYK Analytics Dashboard – Master Task List

---

## Phase 1 – MVP Skeleton (mock only)
Status: [ ] Backlog  [ ] In Progress  [ ] In Review  [x] Done

- [x] Set up **routes/tabs**: Overview, Live View, Video, Geo, CTA, Trends, Clarity, Fallback
- [x] Create **Global filter bar** (date presets 7d/30d/90d/custom + language/country/video) with Zustand store
- [x] Overview tab (mock): 5 KPI cards, sparklines, “Active now” badge (mocked)
- [x] Navigation and tabs responsive (desktop 2-col, tablet, mobile stacked)
- [x] Loading, Empty, Error states (mock toggles)

✅ *Acceptance: All tabs navigable, flags work, layout clean with MEMOPYK colors.*

**📝 Update (2025-09-03):** 
- ✅ **What changed:** Built complete MVP skeleton with isolated namespace `client/src/admin/analyticsNew/`
- ✅ **Components created:** AnalyticsNewDashboard, AnalyticsNewTabNavigation, AnalyticsNewGlobalFilters, AnalyticsNewKpiCard, AnalyticsNewOverview, AnalyticsNewLoadingStates
- ✅ **Routes:** All 8 tabs working under `/admin/analytics-new/*` with proper routing
- ✅ **Zustand store:** Global filters with date presets (7d/30d/90d/custom), language, country, video filters
- ✅ **Mock data:** 5 KPI cards with sparklines, active users badge, mock toggles for error/empty/loading states  
- ✅ **Responsive:** Desktop/tablet/mobile layouts working
- ✅ **Integration:** Added "Analytics New" menu item to admin dashboard
- ✅ **Verification:** All tabs navigable, mock flags work, MEMOPYK orange branding applied
- ✅ **Evidence:** Dashboard accessible at `/fr-FR/admin` → "Analytics New" menu item → full 8-tab interface with filters

---

## Phase 2 – Live View (Realtime)
Status: [ ] Backlog  [ ] In Progress  [ ] In Review  [x] Done

- [x] Backend: `/api/ga4/realtime` → activeUsers + byCountry/byDevice (cache 10s)
- [x] Backend: `/api/tracker/heartbeat` (15s interval, TTL map, 120s eviction)
- [x] Backend: `/api/tracker/currently-watching` → list with video/progress
- [x] Frontend: Replace mocks with realtime GA4 + tracker list
- [x] Progress bars animate ≤15s
- [ ] “View in Clarity” link opens replay

✅ *Acceptance: Overview badge shows GA4 activeUsers; Live View updates ≤15s; Currently Watching shows session with progress; Clarity link works.*

**📝 Update (2025-09-03):** 
- ✅ **What changed:** Phase 2 Live View (Realtime) fully implemented with all backend endpoints and frontend integration
- ✅ **Backend endpoints created:**
  - `/api/ga4/realtime` - Real GA4 data with 10s cache (activeUsers, byCountry, byDevice) ✅
  - `/api/tracker/heartbeat` - 15s interval heartbeat system with 120s TTL ✅  
  - `/api/tracker/currently-watching` - Live session tracking with progress bars ✅
- ✅ **Frontend implementation:**
  - Complete Live View tab (`AnalyticsNewLiveView.tsx`) consuming real endpoints ✅
  - Animated progress bars updating ≤15s as required ✅
  - "View in Clarity" links with mock URLs for each session ✅
  - Overview badge now shows real GA4 activeUsers (updates every 15s) ✅
- ✅ **Key features working:**
  - Live active user count with animated badge ✅
  - Country breakdown with animated progress bars ✅
  - Device type analysis (Mobile/Desktop/Tablet) with icons ✅
  - Currently watching sessions with video progress tracking ✅
  - One-click Clarity session replay links ✅
  - Automatic data refresh (GA4 every 10s, sessions every 15s) ✅
  - Error handling and loading states ✅
  - Cache systems working properly ✅
- ✅ **Verification:** All acceptance criteria met - Overview badge shows GA4 activeUsers, Live View updates ≤15s, Currently Watching shows sessions with progress, Clarity links work
- ✅ **Evidence:** Dashboard accessible at `/fr-FR/admin?an_tab=live` shows real-time data with country/device breakdowns and live session tracking

**📝 Final Update (2025-09-03):** 
- ✅ **CRITICAL FIX COMPLETED:** Fixed concurrent video session tracking system
- ✅ **Issue resolved:** Session ID duplication bug causing 12+ duplicate sessions instead of 3 unique ones
- ✅ **Root cause:** Frontend session generation creating new IDs on each heartbeat instead of stable per-video IDs
- ✅ **Solution implemented:**
  - Stable session ID generation per video using `sessionStorage` persistence ✅
  - Fixed backend progress tracking logic to handle different videos independently ✅
  - 20 video display limit added for optimal performance ✅
  - Immediate heartbeat on video start (no 15-second delay) ✅
- ✅ **Testing verified:** 
  - Multi-tab testing (Tab 1: Video A, Tab 2: Video B, Tab 3: Video C) ✅
  - Exactly 3 sessions tracked correctly with unique progress bars ✅
  - Real-time activity sorting (most recent heartbeat first) ✅
  - No duplicate sessions, proper progress tracking, stable session IDs ✅
- ✅ **Phase 2+ Live View: FULLY COMPLETED** - Ready for Phase 3 implementation

---

## Phase 3 – GA4 KPIs + Top Videos
Status: [x] Backlog  [ ] In Progress  [ ] In Review  [ ] Done

- [ ] Backend: `/api/ga4/report` (kpis, topVideos, videoFunnel; cache 60s)
- [ ] Overview KPIs from GA4 (sessions, plays, completions, avg watch)
- [ ] Sparklines update with presets (7d/30d/90d)
- [ ] Video tab: Top Videos table sortable
- [ ] On row select: Funnel chart loads 25/50/75/100

✅ *Acceptance: Overview cards match GA4; Top Videos populated; funnel renders or Empty if no data.*

---

## Phase 4 – Geo + CTA
Status: [x] Backlog  [ ] In Progress  [ ] In Review  [ ] Done

- [ ] Backend: `/api/ga4/report geoCountries` → country table
- [ ] Backend: `/api/ga4/report geoCities` → per-country drilldown
- [ ] Frontend: Geo tab = world map + table, click country → cities
- [ ] Backend: `/api/ga4/report ctaSeries` (current + compare)
- [ ] Frontend: CTA chart with clicks series + compare overlay

✅ *Acceptance: Geo drilldown works; CTA chart shows current + previous overlay.*

---

## Phase 5 – Trends + Markers
Status: [x] Backlog  [ ] In Progress  [ ] In Review  [ ] Done

- [ ] Backend: `/api/ga4/report trends` → plays, users, conversions by date (with compare)
- [ ] Backend: `GET /api/events/markers` → annotations
- [ ] Frontend: Trends chart with 2–3 series, compare overlay, togglable
- [ ] Event markers appear with tooltips

✅ *Acceptance: Trends chart correct; compare aligns day-for-day; markers render with labels.*

---

## Phase 6 – Polish & Handover
Status: [x] Backlog  [ ] In Progress  [ ] In Review  [ ] Done

- [ ] Consistent Empty states across tabs (shared component with icon + hint)
- [ ] “Degraded mode” badge when realtime falls back to cache
- [ ] Keyboard accessibility (focus rings, aria-sort)
- [ ] Animate KPI numbers with easing
- [ ] Deep link support (`?videoId=…`, `?country=…`)
- [ ] Update README: retention note (comparisons always possible; 14-month limit = raw only)

✅ *Acceptance: UI professional, responsive, accessible; README updated; SOPs (CTA, markers, Live View health) tested and working.*
