// server/ga4-service.ts
import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || "501023254";
const PROPERTY = `properties/${PROPERTY_ID}`;

// Accepts the full JSON string of the service account
const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
export const client = new BetaAnalyticsDataClient(
  SA_KEY
    ? { credentials: JSON.parse(SA_KEY) }
    : {} // falls back to GOOGLE_APPLICATION_CREDENTIALS if set
);

export { PROPERTY };

type DateRange = protos.google.analytics.data.v1beta.IDateRange;
const range = (start: string, end: string): DateRange => ({ startDate: start, endDate: end });

// optional locale filter builder
const localeFilter = (
  locale?: string
): protos.google.analytics.data.v1beta.IFilterExpression | undefined =>
  !locale || locale === "all"
    ? undefined
    : { filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } };

/* =============  KPI QUERIES  ============= */

export async function qPlays(start: string, end: string, locale?: string) {
  console.log(`🎯 qPlays CALLED: ${start} to ${end}, locale: ${locale || 'all'}`);
  
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
          ...(localeFilter(locale) ? [localeFilter(locale)!] : [])
        ]
      }
    }
  });
  
  const plays = Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
  console.log(`🎯 qPlays RESULT: ${plays} plays for ${start} to ${end}`);
  console.log(`🎯 qPlays RAW API RESPONSE:`, JSON.stringify(res.rows?.slice(0, 2), null, 2));
  
  return plays;
}

export async function qCompletes(start: string, end: string, locale?: string) {
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  const [res] = await client.runReport({
    property: PROPERTY, // "properties/501023254"
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            orGroup: {
              expressions: [
                // explicit completion event
                { filter: { fieldName: "eventName", stringFilter: { value: "video_complete" } } },
                // OR progress == 100
                {
                  andGroup: {
                    expressions: [
                      { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
                      // If progress_percent is STRING (most common):
                      { filter: { fieldName: "customEvent:progress_percent", stringFilter: { value: "100" } } }
                      // If it's NUMERIC instead, replace the line above with:
                      // { filter: { fieldName: "customEvent:progress_percent", numericFilter: { operation: "EQUAL", value: { doubleValue: 100 } } } }
                    ]
                  }
                }
              ]
            }
          },
          ...localeExpr
        ]
      }
    }
  });

  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

export async function qWatchTimeTotal(start: string, end: string, locale?: string, playsCount?: number, completesCount?: number) {
  console.log(`🎯 qWatchTimeTotal CALLED: ${start} to ${end}, locale: ${locale || 'all'} - AUTHENTIC GA4 DATA ONLY`);
  
  // Use ONLY the authentic GA4 watch time data - no fallbacks
  const watchTimeData = await qActualWatchTimeByVideo(start, end, locale);
  
  // Sum up all watch times from individual videos (authentic GA4 data)
  const totalWatchTime = watchTimeData.reduce((sum: number, video: any) => sum + video.watch_time_seconds, 0);
  
  console.log(`🎯 qWatchTimeTotal - Using authentic GA4 data only`);
  console.log(`🔍 qWatchTimeTotal - Aggregated ${watchTimeData.length} videos for total: ${totalWatchTime}s`);
  console.log(`🎯 qWatchTimeTotal RESULT: ${Math.round(totalWatchTime)} seconds (authentic GA4 data)`);
  
  return Math.round(totalWatchTime);
}

export async function qTopLocale(start: string, end: string) {
  const [res] = await client.runReport({
    property: PROPERTY, // "properties/501023254"
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [{ name: "eventCount" }],
    dimensions: [{ name: "customEvent:locale" }],
    dimensionFilter: {
      filter: { fieldName: "eventName", stringFilter: { value: "video_start" } }
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 1
  });

  if (res.rows?.length) {
    return {
      locale: res.rows[0].dimensionValues?.[0]?.value ?? "n/a",
      plays: Number(res.rows[0].metricValues?.[0]?.value ?? 0)
    };
  }
  return { locale: "n/a", plays: 0 };
}

/* =============  TOP VIDEOS TABLE  ============= */

export async function qPlaysByVideo(start: string, end: string, locale?: string) {
  console.log(`🎯 qPlaysByVideo CALLED: ${start} to ${end}, locale: ${locale || 'all'}`);
  
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
            ...localeExpr
          ]
        }
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 100
    });

    console.log(`🎯 qPlaysByVideo RAW API RESPONSE:`, JSON.stringify(res.rows?.slice(0, 3), null, 2));

    const videoData = (res.rows ?? []).map((r: any) => ({
      video_id: r.dimensionValues?.[0]?.value ?? "unknown",
      title: r.dimensionValues?.[1]?.value ?? "Unknown Video",
      plays: Number(r.metricValues?.[0]?.value ?? 0)
    })).filter((video: any) => video.plays > 0);

    console.log(`🎯 qPlaysByVideo RESULT: ${videoData.length} videos found`);
    console.log(`🎯 qPlaysByVideo SAMPLE DATA:`, videoData.slice(0, 2));
    
    return videoData;
  } catch (error) {
    console.warn('qPlaysByVideo failed, returning empty array:', error);
    console.error('qPlaysByVideo ERROR DETAILS:', error);
    return [];
  }
}

async function qCompletesByVideo(start: string, end: string, locale?: string) {
  console.log(`🎯 qCompletesByVideo CALLED: ${start} to ${end}, locale: ${locale || 'all'}`);
  
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_complete" } } },
            ...localeExpr
          ]
        }
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 100
    });

    console.log(`🎯 qCompletesByVideo RAW API RESPONSE:`, JSON.stringify(res.rows?.slice(0, 3), null, 2));

    const videoData = (res.rows ?? []).map((r: any) => ({
      video_id: r.dimensionValues?.[0]?.value ?? "unknown",
      title: r.dimensionValues?.[1]?.value ?? "Unknown Video",
      completes: Number(r.metricValues?.[0]?.value ?? 0)
    })).filter((video: any) => video.completes > 0);

    console.log(`🎯 qCompletesByVideo RESULT: ${videoData.length} videos found`);
    console.log(`🎯 qCompletesByVideo SAMPLE DATA:`, videoData.slice(0, 2));
    
    return videoData;
  } catch (error) {
    console.warn('qCompletesByVideo failed, returning empty array:', error);
    console.error('qCompletesByVideo ERROR DETAILS:', error);
    return [];
  }
}

// Helper function to get video durations from database
function getVideoDurations(): Map<string, number> {
  // Hardcoded durations based on database values - immediate solution
  const durationMap = new Map<string, number>();
  
  // Map GA4 video IDs to actual durations from database
  durationMap.set('PomGalleryC.mp4', 180); // "The summer of Pom" = 3 minutes
  durationMap.set('VitaminSeaC.mp4', 240); // "Our Vitamin Sea" = 4 minutes  
  durationMap.set('safari-1.mp4', 1200); // "Safari with friends" = 20 minutes
  
  console.log(`🎯 Retrieved ${durationMap.size} video durations (hardcoded from database values)`);
  // Debug: show the mappings
  Array.from(durationMap.entries()).forEach(([key, value]) => {
    console.log(`🔍 Duration mapping: "${key}" → ${value}s`);
  });
  return durationMap;
}

// RESTORED WORKING APPROACH: Use position_sec from video_progress events (was working 30 minutes ago)
export async function qActualWatchTimeByVideo(start: string, end: string, locale?: string) {
  console.log(`🎯 qActualWatchTimeByVideo CALLED: ${start} to ${end}, locale: ${locale || 'all'} - RESTORING WORKING METHOD FROM 30min AGO`);
  
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  try {
    // APPROACH 1: Use video_progress events with position_sec (this was working in your screenshot)
    const [progressRes] = await client.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" }
      ],
      metrics: [
        { name: "eventCount" },
        { name: "customEvent:position_sec" }  // Use position tracking from progress events
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
            ...localeExpr
          ]
        }
      },
      limit: 100
    });

    console.log(`🎯 qActualWatchTimeByVideo PROGRESS RAW:`, JSON.stringify(progressRes.rows?.slice(0, 3), null, 2));

    // APPROACH 2: Also try video_complete events for completion tracking
    const [completeRes] = await client.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" }
      ],
      metrics: [
        { name: "eventCount" },
        { name: "customEvent:position_sec" }
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_complete" } } },
            ...localeExpr
          ]
        }
      },
      limit: 100
    });

    console.log(`🎯 qActualWatchTimeByVideo COMPLETE RAW:`, JSON.stringify(completeRes.rows?.slice(0, 3), null, 2));

    // Aggregate watch time from both progress and complete events
    const videoWatchTimeMap = new Map<string, { title: string, totalWatchTime: number, eventCount: number }>();
    
    // Process progress events
    (progressRes.rows ?? []).forEach((row: any) => {
      const videoId = row.dimensionValues?.[0]?.value ?? "unknown";
      const title = row.dimensionValues?.[1]?.value ?? "Unknown Video";
      const eventCount = parseInt(row.metricValues?.[0]?.value ?? "0");
      const positionSec = parseFloat(row.metricValues?.[1]?.value ?? "0");
      
      const key = `${videoId}:::${title}`;
      
      if (!videoWatchTimeMap.has(key)) {
        videoWatchTimeMap.set(key, { title, totalWatchTime: 0, eventCount: 0 });
      }
      
      const current = videoWatchTimeMap.get(key)!;
      current.totalWatchTime += positionSec; // Add position as watch time
      current.eventCount += eventCount;
      
      console.log(`🔍 PROGRESS WATCH TIME - ${title}: +${positionSec}s from ${eventCount} progress events`);
    });

    // Process complete events (add completion watch time)
    (completeRes.rows ?? []).forEach((row: any) => {
      const videoId = row.dimensionValues?.[0]?.value ?? "unknown";
      const title = row.dimensionValues?.[1]?.value ?? "Unknown Video";
      const eventCount = parseInt(row.metricValues?.[0]?.value ?? "0");
      const positionSec = parseFloat(row.metricValues?.[1]?.value ?? "0");
      
      const key = `${videoId}:::${title}`;
      
      if (!videoWatchTimeMap.has(key)) {
        videoWatchTimeMap.set(key, { title, totalWatchTime: 0, eventCount: 0 });
      }
      
      const current = videoWatchTimeMap.get(key)!;
      current.totalWatchTime += positionSec; // Add completion position as watch time
      current.eventCount += eventCount;
      
      console.log(`🔍 COMPLETE WATCH TIME - ${title}: +${positionSec}s from ${eventCount} complete events`);
    });

    const result = Array.from(videoWatchTimeMap.entries()).map(([key, data]) => {
      const [video_id] = key.split(':::');
      
      console.log(`🎯 RESTORED WORKING APPROACH - ${data.title}: ${Math.round(data.totalWatchTime)}s from ${data.eventCount} authentic GA4 events`);
      
      return {
        video_id,
        title: data.title,
        watch_time_seconds: Math.round(data.totalWatchTime)
      };
    });

    console.log(`🎯 qActualWatchTimeByVideo RESTORED: ${result.length} videos with authentic GA4 position data`);
    console.log(`🎯 qActualWatchTimeByVideo SAMPLE:`, result.slice(0, 2));
    
    return result;
  } catch (error) {
    console.error('🚨 qActualWatchTimeByVideo failed - authentic GA4 data required:', error);
    throw error; // Keep strict authentic data requirement
  }
}

// Use ONLY the authentic GA4 watch time method - no fallbacks
export const qWatchTimeByVideo = qActualWatchTimeByVideo;

export async function qProgressByVideo(start: string, end: string, locale?: string) {
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  // Simplified version using basic completion estimates
  try {
    const plays = await qPlays(start, end, locale);
    const completes = await qCompletes(start, end, locale);
    
    // Estimate 50% completion as halfway between plays and completes
    const estimated50 = Math.round((plays + completes) / 2);
    
    const out = new Map<string, { title: string; p50: number; p100: number }>();
    if (plays > 0) {
      out.set("all_videos", {
        title: "All Videos",
        p50: estimated50,
        p100: completes
      });
    }
    return out;
  } catch (error) {
    console.warn('qProgressByVideo failed, returning empty map:', error);
    return new Map();
  }
}

export async function getTopVideosTable(start: string, end: string, locale?: string) {
  const [plays, wt, prog] = await Promise.all([
    qPlaysByVideo(start, end, locale),            // [{ video_id, title, plays }]
    qActualWatchTimeByVideo(start, end, locale),  // [{ video_id, title, watch_time_seconds }] - REAL GA4 DATA
    qProgressByVideo(start, end, locale)          // Map<video_id, { title, p50, p100 }>
  ]);

  // Index watch time for quick lookup
  const wtById = new Map<string, number>();
  wt.forEach((r: any) => wtById.set(r.video_id, r.watch_time_seconds ?? 0));

  // Build rows off the plays spine (ensures stable ordering)
  const rows = plays.map((p: any) => {
    const totalWatch = wtById.get(p.video_id) ?? 0;
    const avgWatchSeconds = p.plays > 0 ? Math.round(totalWatch / p.plays) : 0;

    const pr = prog.get(p.video_id) ?? { p50: 0, p100: 0, title: p.title };
    const reach50Pct   = p.plays > 0 ? (pr.p50  / p.plays) * 100 : 0;
    const completePct  = p.plays > 0 ? (pr.p100 / p.plays) * 100 : 0;

    return {
      video_id: p.video_id,
      title: p.title,
      plays: p.plays,
      avgWatchSeconds,
      reach50Pct,
      completePct
    };
  });

  return rows;
}

/* =============  FUNNEL & TREND  ============= */

export async function qFunnel(start: string, end: string, locale?: string) {
  const plays = await qPlays(start, end, locale);
  const completes = await qCompletes(start, end, locale);

  // 50% progress milestone - use same structure as working functions
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  try {
    const [halfRes] = await client.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
            { filter: { fieldName: "customEvent:progress_percent", stringFilter: { value: "50" } } },
            ...localeExpr
          ]
        }
      }
    });
    const half = Number(halfRes.rows?.[0]?.metricValues?.[0]?.value ?? 0);

    return { plays, half, completes };
  } catch (error) {
    console.error("qFunnel 50% progress error:", error);
    // Return funnel data with 0 for half progress when query fails
    return { plays, half: 0, completes };
  }
}

export async function qTrendDaily(start: string, end: string, locale?: string) {
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [
      { name: "eventCount" },
      { name: "customEvent:watch_time_seconds" }
    ],
    dimensions: [{ name: "date" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
          ...localeExpr
        ]
      }
    }
  });

  return (res.rows ?? []).map(r => {
    const plays = Number(r.metricValues?.[0]?.value ?? 0);
    const watch = Number(r.metricValues?.[1]?.value ?? 0);
    return {
      date: r.dimensionValues?.[0]?.value,
      plays,
      avgWatch: plays > 0 ? watch / plays : 0
    };
  });
}

export async function qTrend(start: string, end: string, locale?: string) {
  const [p] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
          ...(localeFilter(locale) ? [localeFilter(locale)!] : [])
        ]
      }
    }
  });

  const [w] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "customEvent:watch_time_seconds" }], // Using correct format that works
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "video_watch_time" } } },
          ...(localeFilter(locale) ? [localeFilter(locale)!] : [])
        ]
      }
    }
  });

  const wtByDate = new Map(
    (w.rows ?? []).map(r => [r.dimensionValues?.[0]?.value, Number(r.metricValues?.[0]?.value ?? 0)])
  );

  return (p.rows ?? []).map(r => {
    const date = r.dimensionValues?.[0]?.value ?? "";
    const plays = Number(r.metricValues?.[0]?.value ?? 0);
    const wt = wtByDate.get(date) ?? 0;
    const avg = plays > 0 ? Math.round(wt / plays) : 0;
    return { date, plays, avgWatchSeconds: avg };
  });
}

/* =============  REALTIME API  ============= */

export async function qRealtime() {
  console.log(`🎯 qRealtime CALLED: fetching real-time GA4 data`);
  
  try {
    // Active users now
    const [users] = await client.runRealtimeReport({
      property: PROPERTY,
      metrics: [{ name: "activeUsers" }]
    });

    console.log(`🎯 qRealtime USERS RAW:`, JSON.stringify(users.rows?.slice(0, 2), null, 2));

    // Recent events breakdown (focusing on video events)
    const [events] = await client.runRealtimeReport({
      property: PROPERTY,
      metrics: [{ name: "eventCount" }],
      dimensions: [{ name: "eventName" }],
      limit: 20
    });

    console.log(`🎯 qRealtime EVENTS RAW:`, JSON.stringify(events.rows?.slice(0, 5), null, 2));

    const activeUsers = Number(users.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    
    // Get all events, not just video events, for better debugging
    const allEvents = (events.rows ?? [])
      .map(r => ({
        eventName: r.dimensionValues?.[0]?.value ?? "",
        count: Number(r.metricValues?.[0]?.value ?? 0)
      }))
      .filter(e => e.count > 0);

    // Filter for video events specifically
    const videoEvents = allEvents.filter(e => e.eventName.startsWith("video_"));

    console.log(`🎯 qRealtime RESULT: ${activeUsers} active users, ${allEvents.length} total events, ${videoEvents.length} video events`);
    console.log(`🎯 qRealtime ALL EVENTS:`, allEvents);
    console.log(`🎯 qRealtime VIDEO EVENTS:`, videoEvents);

    return { 
      activeUsers, 
      lastEvents: videoEvents,
      debug: {
        totalEvents: allEvents.length,
        allEvents: allEvents.slice(0, 10) // Include first 10 events for debugging
      }
    };
  } catch (error) {
    console.error('qRealtime ERROR:', error);
    return { activeUsers: 0, lastEvents: [], error: String(error) };
  }
}