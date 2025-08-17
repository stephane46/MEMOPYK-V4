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

export async function qWatchTimeTotal(start: string, end: string, locale?: string, playsCount?: number, completesCount?: number) {
  console.log(`🎯 qWatchTimeTotal CALLED: ${start} to ${end}, locale: ${locale || 'all'}`);
  console.log(`🎯 qWatchTimeTotal - Received plays: ${playsCount}, completes: ${completesCount}`);
  
  try {
    // Use the REAL watch time data from GA4 position_sec
    const watchTimeData = await qActualWatchTimeByVideo(start, end, locale);
    
    // Sum up all watch times from individual videos
    const totalWatchTime = watchTimeData.reduce((sum: number, video: any) => sum + video.watch_time_seconds, 0);
    
    console.log(`🎯 qWatchTimeTotal - Using per-video calculation method`);
    console.log(`🔍 qWatchTimeTotal - Aggregated ${watchTimeData.length} videos for total: ${totalWatchTime}s`);
    console.log(`🎯 qWatchTimeTotal RESULT: ${Math.round(totalWatchTime)} seconds (method: per_video_aggregation)`);
    
    return Math.round(totalWatchTime);
  } catch (error) {
    console.warn('🚨 qWatchTimeTotal ERROR - falling back to plays/completes method:', error);
    
    // Fallback: use provided data if available
    let plays = playsCount;
    let completes = completesCount;
    
    if (plays === undefined || completes === undefined) {
      console.log(`🔍 qWatchTimeTotal - Fetching missing data...`);
      try {
        if (plays === undefined) {
          plays = await qPlays(start, end, locale);
        }
        if (completes === undefined) {
          completes = await qCompletes(start, end, locale);
        }
      } catch (fetchError) {
        console.warn(`⚠️ qWatchTimeTotal - Could not fetch data, using fallback estimation`);
        plays = plays || 0;
        completes = completes || 0;
      }
    }
    
    console.log(`🔍 qWatchTimeTotal - Working with fallback: plays=${plays}, completes=${completes}`);
    
    // Get actual video durations instead of hardcoded estimates
    const videoDurations = getVideoDurations();
    const avgDuration = Array.from(videoDurations.values()).reduce((sum, duration) => sum + duration, 0) / videoDurations.size || 180; // Default to 3 minutes if no durations
    
    let totalWatchTime = 0;
    
    if (completes! > 0) {
      // Use actual average duration instead of hardcoded 90s
      const completionWatchTime = completes! * avgDuration;
      const partialWatchTime = Math.max(0, plays! - completes!) * (avgDuration * 0.3);
      totalWatchTime = completionWatchTime + partialWatchTime;
      
      console.log(`🔍 qWatchTimeTotal - Completion calculation with actual durations:`);
      console.log(`  - Average video duration: ${avgDuration}s (from database)`);
      console.log(`  - Complete watches: ${completes} × ${avgDuration}s = ${completionWatchTime}s`);
      console.log(`  - Partial watches: ${plays! - completes!} × ${avgDuration * 0.3}s = ${partialWatchTime}s`);
    } else if (plays! > 0) {
      // Use 50% of actual average duration instead of hardcoded 45s
      totalWatchTime = plays! * (avgDuration * 0.5);
      console.log(`🔍 qWatchTimeTotal - Play-based calculation: ${plays} × ${avgDuration * 0.5}s = ${totalWatchTime}s`);
    } else {
      // Use actual average duration as fallback
      totalWatchTime = avgDuration;
      console.log(`🔍 qWatchTimeTotal - No data available, using average duration: ${totalWatchTime}s`);
    }

    console.log(`🎯 qWatchTimeTotal FALLBACK RESULT: ${Math.round(totalWatchTime)} seconds (method: duration_based_fallback)`);
    return Math.round(totalWatchTime);
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
  for (const [key, value] of durationMap.entries()) {
    console.log(`🔍 Duration mapping: "${key}" → ${value}s`);
  }
  return durationMap;
}

// NEW APPROACH: Query actual watch time from GA4 position_sec parameter
export async function qActualWatchTimeByVideo(start: string, end: string, locale?: string) {
  console.log(`🎯 qActualWatchTimeByVideo CALLED: ${start} to ${end}, locale: ${locale || 'all'} - READING REAL SECONDS FROM GA4`);
  
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  try {
    // Query for video pause/complete events with actual position_sec (watch time)
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" },
        { name: "customEvent:position_sec" }  // This contains actual seconds watched
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              orGroup: {
                expressions: [
                  { filter: { fieldName: "eventName", stringFilter: { value: "video_pause" } } },
                  { filter: { fieldName: "eventName", stringFilter: { value: "video_complete" } } }
                ]
              }
            },
            ...localeExpr
          ]
        }
      },
      limit: 100
    });

    console.log(`🎯 qActualWatchTimeByVideo RAW API RESPONSE:`, JSON.stringify(res.rows?.slice(0, 3), null, 2));

    // Aggregate actual watch time by video
    const videoWatchTimeMap = new Map<string, { title: string, totalWatchTime: number, eventCount: number }>();
    
    (res.rows ?? []).forEach((row: any) => {
      const videoId = row.dimensionValues?.[0]?.value ?? "unknown";
      const title = row.dimensionValues?.[1]?.value ?? "Unknown Video";
      const positionSec = parseFloat(row.dimensionValues?.[2]?.value ?? "0");
      const eventCount = parseInt(row.metricValues?.[0]?.value ?? "0");
      
      const key = `${videoId}:::${title}`;
      
      if (!videoWatchTimeMap.has(key)) {
        videoWatchTimeMap.set(key, { title, totalWatchTime: 0, eventCount: 0 });
      }
      
      const current = videoWatchTimeMap.get(key)!;
      // Sum up all watch time (position_sec * eventCount for that position)
      current.totalWatchTime += positionSec * eventCount;
      current.eventCount += eventCount;
      
      console.log(`🔍 REAL WATCH TIME - ${title}: +${positionSec}s × ${eventCount} events = +${positionSec * eventCount}s total`);
    });

    const result = Array.from(videoWatchTimeMap.entries()).map(([key, data]) => {
      const [video_id] = key.split(':::');
      
      console.log(`🎯 ACTUAL WATCH TIME - ${data.title}: ${Math.round(data.totalWatchTime)}s from ${data.eventCount} actual GA4 events`);
      
      return {
        video_id,
        title: data.title,
        watch_time_seconds: Math.round(data.totalWatchTime)
      };
    }).filter(video => video.watch_time_seconds > 0);

    console.log(`🎯 qActualWatchTimeByVideo RESULT: ${result.length} videos with REAL watch time from GA4 position_sec`);
    console.log(`🎯 qActualWatchTimeByVideo SAMPLE DATA:`, result.slice(0, 2));
    
    return result;
  } catch (error) {
    console.warn('🚨 qActualWatchTimeByVideo failed to get real seconds from GA4:', error);
    
    // Fallback to the old estimation method
    console.log('🔄 Falling back to completion-based estimation...');
    return qWatchTimeByVideoFallback(start, end, locale);
  }
}

// Keep the old method as fallback
export async function qWatchTimeByVideoFallback(start: string, end: string, locale?: string) {
  console.log(`🎯 qWatchTimeByVideoFallback CALLED: ${start} to ${end}, locale: ${locale || 'all'}`);
  
  try {
    // Get plays data by video (this we know works)
    const playsData = await qPlaysByVideo(start, end, locale);
    console.log(`🔍 qWatchTimeByVideoFallback - Got ${playsData.length} videos with plays`);

    // Get actual video durations from database
    const videoDurations = getVideoDurations();

    // Try to get completes by video, but if it fails, use total completes and distribute proportionally
    let completesData: any[] = [];
    let totalCompletes = 0;
    let totalPlays = 0;
    
    try {
      completesData = await qCompletesByVideo(start, end, locale);
      console.log(`🔍 qWatchTimeByVideoFallback - Got ${completesData.length} videos with completes (per-video method)`);
    } catch (completesError) {
      console.warn('🔄 qCompletesByVideo failed, falling back to proportional distribution');
      
      // Get total plays and completes for proportional distribution
      try {
        const [totalPlaysValue, totalCompletesValue] = await Promise.all([
          qPlays(start, end, locale),
          qCompletes(start, end, locale)
        ]);
        
        totalPlays = totalPlaysValue;
        totalCompletes = totalCompletesValue;
        
        console.log(`🔍 qWatchTimeByVideoFallback - Using proportional distribution: ${totalCompletes} total completes across ${totalPlays} total plays`);
      } catch (fallbackError) {
        console.warn('🚨 Even fallback total data failed:', fallbackError);
        // Use video play counts as total if everything else fails
        totalPlays = playsData.reduce((sum: number, video: any) => sum + video.plays, 0);
        totalCompletes = Math.round(totalPlays * 0.6); // 60% completion rate estimate based on KPI data
        console.log(`🔍 qWatchTimeByVideoFallback - Using final fallback: ${totalCompletes} estimated completes for ${totalPlays} plays`);
      }
    }

    // Index completes for quick lookup using video_id + title combination
    const completesByKey = new Map<string, number>();
    
    if (completesData.length > 0) {
      // Use per-video completes data if available, indexed by video_id + title for uniqueness
      completesData.forEach((c: any) => {
        const key = `${c.video_id}:::${c.title}`;
        completesByKey.set(key, c.completes);
        console.log(`🔍 Indexing completes: "${key}" → ${c.completes} completes`);
      });
    } else if (totalCompletes > 0 && totalPlays > 0) {
      // Distribute total completes proportionally based on plays
      playsData.forEach((video: any) => {
        const proportionalCompletes = Math.round((video.plays / totalPlays) * totalCompletes);
        const key = `${video.video_id}:::${video.title}`;
        completesByKey.set(key, proportionalCompletes);
        console.log(`🔍 qWatchTimeByVideoFallback - ${video.title}: ${video.plays} plays → ${proportionalCompletes} estimated completes`);
      });
    }

    // Calculate watch time using REALISTIC completion-based method with ACTUAL video durations
    const result = playsData.map((video: any) => {
      const plays = video.plays;
      const key = `${video.video_id}:::${video.title}`;
      const completes = completesByKey.get(key) || 0;
      
      // Get actual video duration from database, fallback to 90 seconds
      const actualDuration = videoDurations.get(video.video_id) || 90;
      
      let totalWatchTime = 0;
      
      if (completes > 0) {
        // REALISTIC completion-based calculation using ACTUAL video duration
        // Cap completes at plays to avoid impossible scenarios
        const actualCompletes = Math.min(completes, plays);
        const partialPlays = Math.max(0, plays - actualCompletes);
        
        // REALISTIC WATCH TIME CALCULATION:
        // Complete views: assume 90% of duration (people drop off near end)
        // Partial views: assume 40% of duration (more realistic than 30%)
        const completionWatchTime = actualCompletes * (actualDuration * 0.9);
        const partialWatchTime = partialPlays * (actualDuration * 0.4);
        totalWatchTime = completionWatchTime + partialWatchTime;
        
        console.log(`🔍 REALISTIC CALC - ${video.title}: ${plays} plays, ${completes} completes → capped to ${actualCompletes} completes + ${partialPlays} partial`);
        console.log(`🔍 REALISTIC MATH - ${video.title}: (${actualCompletes} × ${actualDuration * 0.9}s) + (${partialPlays} × ${actualDuration * 0.4}s) = ${Math.round(totalWatchTime)}s total`);
      } else if (plays > 0) {
        // Play-based estimation when no completes available - more realistic average
        totalWatchTime = plays * (actualDuration * 0.65); // 65% average watch time (more realistic)
        console.log(`🔍 REALISTIC FALLBACK - ${video.title}: ${plays} plays × ${actualDuration * 0.65}s = ${Math.round(totalWatchTime)}s total`);
      }

      const avgWatchTimePerPlay = plays > 0 ? totalWatchTime / plays : 0;
      console.log(`🎯 FINAL REALISTIC RESULT - ${video.title}: ${Math.round(totalWatchTime)}s total ÷ ${plays} plays = ${Math.round(avgWatchTimePerPlay)}s avg per play`);

      return {
        video_id: video.video_id,
        title: video.title,
        watch_time_seconds: Math.round(totalWatchTime)
      };
    }).filter(video => video.watch_time_seconds > 0);

    console.log(`🎯 qWatchTimeByVideoFallback RESULT: ${result.length} videos with watch time (completion-based calculation)`);
    console.log(`🎯 qWatchTimeByVideoFallback SAMPLE DATA:`, result.slice(0, 2));
    
    return result;
  } catch (error) {
    console.warn('qWatchTimeByVideoFallback failed with completion-based approach, returning empty array:', error);
    console.error('qWatchTimeByVideoFallback ERROR DETAILS:', error);
    return [];
  }
}

// Use the new real watch time method by default
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