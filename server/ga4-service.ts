// server/ga4-service.ts
import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || "501023254";
const PROPERTY = `properties/${PROPERTY_ID}`;

// Accepts the full JSON string of the service account
const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
const client = new BetaAnalyticsDataClient(
  SA_KEY
    ? { credentials: JSON.parse(SA_KEY) }
    : {} // falls back to GOOGLE_APPLICATION_CREDENTIALS if set
);

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

export async function qWatchTimeTotal(start: string, end: string, locale?: string) {
  console.log(`🎯 qWatchTimeTotal CALLED: ${start} to ${end}, locale: ${locale || 'all'}`);
  
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  try {
    // Get video progress events with duration and position data
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:percent" },
        { name: "customEvent:duration_sec" },
        { name: "customEvent:position_sec" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
            ...localeExpr
          ]
        }
      }
    });

    console.log(`🎯 qWatchTimeTotal RAW API RESPONSE:`, JSON.stringify(res.rows?.slice(0, 5), null, 2));

    // Calculate actual watch time based on progress milestones
    let totalWatchTime = 0;
    const progressData = (res.rows ?? []).map(r => ({
      video_id: r.dimensionValues?.[0]?.value ?? "",
      percent: Number(r.dimensionValues?.[1]?.value ?? 0),
      duration_sec: Number(r.dimensionValues?.[2]?.value ?? 0),
      position_sec: Number(r.dimensionValues?.[3]?.value ?? 0),
      count: Number(r.metricValues?.[0]?.value ?? 0)
    }));

    console.log(`🎯 qWatchTimeTotal PARSED DATA:`, progressData.slice(0, 3));

    // Calculate watch time based on actual position data
    // Each progress event represents watching to that specific position
    for (const data of progressData) {
      if (data.position_sec > 0) {
        // Use the actual position reached, multiplied by event count
        totalWatchTime += data.position_sec * data.count;
      }
    }

    console.log(`🎯 qWatchTimeTotal RESULT: ${totalWatchTime} seconds total watch time`);
    return totalWatchTime;
  } catch (error) {
    console.warn('Failed to get watch time from video_progress events:', error);
    console.error('qWatchTimeTotal ERROR DETAILS:', error);
    return 0;
  }
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

    const videoData = (res.rows ?? []).map(r => ({
      video_id: r.dimensionValues?.[0]?.value ?? "unknown",
      title: r.dimensionValues?.[1]?.value ?? "Unknown Video",
      plays: Number(r.metricValues?.[0]?.value ?? 0)
    })).filter(video => video.plays > 0);

    console.log(`🎯 qPlaysByVideo RESULT: ${videoData.length} videos found`);
    console.log(`🎯 qPlaysByVideo SAMPLE DATA:`, videoData.slice(0, 2));
    
    return videoData;
  } catch (error) {
    console.warn('qPlaysByVideo failed, returning empty array:', error);
    console.error('qPlaysByVideo ERROR DETAILS:', error);
    return [];
  }
}

export async function qWatchTimeByVideo(start: string, end: string, locale?: string) {
  console.log(`🎯 qWatchTimeByVideo CALLED: ${start} to ${end}, locale: ${locale || 'all'}`);
  
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
        { name: "customEvent:video_title" },
        { name: "customEvent:position_sec" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
            ...localeExpr
          ]
        }
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 100
    });

    console.log(`🎯 qWatchTimeByVideo RAW API RESPONSE:`, JSON.stringify(res.rows?.slice(0, 3), null, 2));

    // Aggregate watch time by video
    const videoWatchTime = new Map<string, { title: string; totalWatchTime: number }>();
    
    (res.rows ?? []).forEach(r => {
      const videoId = r.dimensionValues?.[0]?.value ?? "unknown";
      const videoTitle = r.dimensionValues?.[1]?.value ?? "Unknown Video";
      const positionSec = Number(r.dimensionValues?.[2]?.value ?? 0);
      const eventCount = Number(r.metricValues?.[0]?.value ?? 0);
      
      if (positionSec > 0) {
        if (!videoWatchTime.has(videoId)) {
          videoWatchTime.set(videoId, { title: videoTitle, totalWatchTime: 0 });
        }
        const existing = videoWatchTime.get(videoId)!;
        existing.totalWatchTime += positionSec * eventCount;
      }
    });

    const result = Array.from(videoWatchTime.entries()).map(([videoId, data]) => ({
      video_id: videoId,
      title: data.title,
      watch_time_seconds: data.totalWatchTime
    })).filter(video => video.watch_time_seconds > 0);

    console.log(`🎯 qWatchTimeByVideo RESULT: ${result.length} videos with watch time`);
    console.log(`🎯 qWatchTimeByVideo SAMPLE DATA:`, result.slice(0, 2));
    
    return result;
  } catch (error) {
    console.warn('qWatchTimeByVideo failed, returning empty array:', error);
    console.error('qWatchTimeByVideo ERROR DETAILS:', error);
    return [];
  }
}

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
    qWatchTimeByVideo(start, end, locale),        // [{ video_id, title, watch_time_seconds }]
    qProgressByVideo(start, end, locale)          // Map<video_id, { title, p50, p100 }>
  ]);

  // Index watch time for quick lookup
  const wtById = new Map<string, number>();
  wt.forEach(r => wtById.set(r.video_id, r.watch_time_seconds ?? 0));

  // Build rows off the plays spine (ensures stable ordering)
  const rows = plays.map(p => {
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
  // Active users now
  const [users] = await client.runRealtimeReport({
    property: PROPERTY,
    metrics: [{ name: "activeUsers" }]
  });

  // Recent events breakdown (focusing on video events)
  const [events] = await client.runRealtimeReport({
    property: PROPERTY,
    metrics: [{ name: "eventCount" }],
    dimensions: [{ name: "eventName" }],
    limit: 20
  });

  const activeUsers = Number(users.rows?.[0]?.metricValues?.[0]?.value ?? 0);
  const lastEvents = (events.rows ?? [])
    .map(r => ({
      eventName: r.dimensionValues?.[0]?.value ?? "",
      count: Number(r.metricValues?.[0]?.value ?? 0)
    }))
    .filter(e => e.eventName.startsWith("video_"));

  return { activeUsers, lastEvents };
}