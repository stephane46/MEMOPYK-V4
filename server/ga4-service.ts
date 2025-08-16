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
  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
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
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  const [res] = await client.runReport({
    property: PROPERTY, // "properties/501023254"
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [{ name: "customEvent:watch_time_sec" }], // Fixed to match client parameter name
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "video_watch_time" } } },
          ...localeExpr
        ]
      }
    }
  });

  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
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
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  const [res] = await client.runReport({
    property: PROPERTY, // "properties/501023254"
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
          // (optional) if you later add a custom dimension "gallery" = "Video Gallery",
          // add: { filter: { fieldName: "customEvent:gallery", stringFilter: { value: "Video Gallery" } } }
        ]
      }
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 100
  });

  return (res.rows ?? []).map(r => ({
    video_id: r.dimensionValues?.[0]?.value ?? "",
    title: r.dimensionValues?.[1]?.value ?? "",
    plays: Number(r.metricValues?.[0]?.value ?? 0)
  }));
}

export async function qWatchTimeByVideo(start: string, end: string, locale?: string) {
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  const [res] = await client.runReport({
    property: PROPERTY, // "properties/501023254"
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [
      { name: "customEvent:video_id" },
      { name: "customEvent:video_title" }
    ],
    metrics: [{ name: "customEvent:watch_time_seconds" }], // Using correct format that works
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "video_watch_time" } } },
          ...localeExpr
        ]
      }
    },
    orderBys: [{ metric: { metricName: "customEvent:watch_time_seconds" }, desc: true }],
    limit: 100
  });

  return (res.rows ?? []).map(r => ({
    video_id: r.dimensionValues?.[0]?.value ?? "",
    title: r.dimensionValues?.[1]?.value ?? "",
    watch_time_seconds: Number(r.metricValues?.[0]?.value ?? 0)
  }));
}

export async function qProgressByVideo(start: string, end: string, locale?: string) {
  const localeExpr =
    locale && locale !== "all"
      ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }]
      : [];

  const [res] = await client.runReport({
    property: PROPERTY, // "properties/501023254"
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [
      { name: "customEvent:video_id" },
      { name: "customEvent:video_title" },
      { name: "customEvent:progress_percent" }
    ],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
          {
            filter: {
              fieldName: "customEvent:progress_percent",
              inListFilter: { values: ["50", "100"] }
            }
          },
          ...localeExpr
        ]
      }
    },
    limit: 1000
  });

  // Map video_id -> { title, p50, p100 }
  const out = new Map<string, { title: string; p50: number; p100: number }>();
  for (const row of res.rows ?? []) {
    const vid = row.dimensionValues?.[0]?.value ?? "";
    const title = row.dimensionValues?.[1]?.value ?? "";
    const pct = row.dimensionValues?.[2]?.value ?? "";
    const cnt = Number(row.metricValues?.[0]?.value ?? 0);

    const cur = out.get(vid) ?? { title, p50: 0, p100: 0 };
    if (pct === "50") cur.p50 += cnt;
    if (pct === "100") cur.p100 += cnt;
    out.set(vid, cur);
  }
  return out;
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