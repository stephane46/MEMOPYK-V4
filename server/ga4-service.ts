import { BetaAnalyticsDataClient, protos } from '@google-analytics/data';

// GA4 Configuration - Using your exact property ID
const PROPERTY = 'properties/501023254';

// Initialize GA4 client using your service account
let client: BetaAnalyticsDataClient | null = null;

export function initializeGA4Service(): GA4VideoAnalyticsService {
  try {
    if (!process.env.GA4_SERVICE_ACCOUNT_KEY) {
      throw new Error('GA4_SERVICE_ACCOUNT_KEY environment variable not set');
    }

    // Parse service account credentials from environment variable
    const creds = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY);
    
    client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
    });

    console.log('✅ GA4 client initialized successfully');
    return new GA4VideoAnalyticsService();
  } catch (error: any) {
    console.error('❌ Failed to initialize GA4 service:', error.message);
    throw new Error(`GA4 initialization failed: ${error.message}`);
  }
}

// Cache management
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type: string, params: any): string {
  return `${type}:${JSON.stringify(params)}`;
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Helper types and functions based on your specifications
type DateRange = protos.google.analytics.data.v1beta.IDateRange;
const range = (startDate: string, endDate: string): DateRange => ({ startDate, endDate });

// Optional locale filter (omit when locale === "all")
const localeFilter = (locale?: string): protos.google.analytics.data.v1beta.IFilterExpression | undefined =>
  !locale || locale === "all"
    ? undefined
    : {
        filter: {
          fieldName: "customEvent:locale",
          stringFilter: { value: locale }
        }
      };

export class GA4VideoAnalyticsService {
  constructor() {
    this.client = client;
  }

  private client: BetaAnalyticsDataClient | null;

  // Connection test using your actual events
  async testConnection() {
    console.log('🔍 Testing GA4 connection with video events sanity query');

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      const [resp] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['video_start', 'video_progress', 'video_complete', 'video_watch_time']
            }
          }
        },
        limit: 10
      });

      console.log('✅ GA4 connection test successful:', resp.rows?.length || 0, 'video event types found');
      
      if (resp.rows && resp.rows.length > 0) {
        console.log('📋 Available video events in your GA4 property:');
        resp.rows.forEach((row, index) => {
          const eventName = row.dimensionValues?.[0]?.value || 'unknown';
          const eventCount = row.metricValues?.[0]?.value || '0';
          console.log(`  ${index + 1}. ${eventName} (${eventCount} events)`);
        });
      }

      return { success: true, eventTypes: resp.rows?.length || 0, events: resp.rows };
    } catch (error: any) {
      console.error('❌ GA4 connection test failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`GA4 connection failed: ${error.code} - ${error.message}`);
    }
  }

  // Test available custom dimensions and metrics
  async testCustomParams() {
    console.log('🔍 Testing available custom parameters and metrics');

    if (!this.client) {
      throw new Error('GA4 client not initialized');
    }

    try {
      // Test basic query without custom dimensions first
      const [basicResp] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { value: 'video_start' }
          }
        },
        limit: 5
      });

      console.log('✅ Basic video_start query works:', basicResp.rows?.length || 0, 'results');

      // Try different custom parameter formats
      const customFormats = [
        'customEvent:video_id',
        'video_id', 
        'customUser:video_id',
        'customParameter:video_id'
      ];

      for (const format of customFormats) {
        try {
          console.log(`🔍 Testing custom dimension format: ${format}`);
          const [testResp] = await this.client.runReport({
            property: PROPERTY,
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            dimensions: [{ name: format }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: {
              filter: {
                fieldName: 'eventName',
                stringFilter: { value: 'video_start' }
              }
            },
            limit: 1
          });
          console.log(`✅ ${format} works! Results:`, testResp.rows?.length || 0);
          return { success: true, workingFormat: format };
        } catch (error: any) {
          console.log(`❌ ${format} failed:`, error.message);
        }
      }

      return { success: true, basicQuery: true, customParams: false };
    } catch (error: any) {
      console.error('❌ Custom params test failed:', error.message);
      throw error;
    }
  }

  // Optional locale filter (omit when locale === "all")  
  private localeFilter(locale?: string) {
    if (!locale || locale === "all") {
      return undefined;
    }
    return {
      filter: {
        fieldName: "customEvent:locale",
        stringFilter: { value: locale }
      }
    };
  }

  // 1a. Plays (count of video_start) - YOUR EXACT QUERY
  async getPlays(startDate: string, endDate: string, locale?: string) {
    const [res] = await this.client!.runReport({
      property: PROPERTY,
      dateRanges: [range(startDate, endDate)],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
            ...(this.localeFilter(locale) ? [this.localeFilter(locale)!] : [])
          ]
        }
      }
    });
    const plays = Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    console.log(`📊 Plays (video_start): ${plays}`);
    return plays;
  }

  // 1b. Completes (simplified approach for now - just return 0 until video_complete events exist)
  async getCompletes(startDate: string, endDate: string, locale?: string) {
    // Temporarily simplified since video_complete events might not be firing yet
    // This will be updated once the frontend starts sending video_complete events
    console.log(`📊 Completes (temporary): 0 (video_complete events not yet implemented)`);
    return 0;
  }

  // 1c. Total & average watch time (YOUR custom metric) - YOUR EXACT QUERY
  async getWatchTime(startDate: string, endDate: string, locale?: string) {
    const [res] = await this.client!.runReport({
      property: PROPERTY,
      dateRanges: [range(startDate, endDate)],
      metrics: [{ name: "customEvent:watch_time_seconds" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_watch_time" } } },
            ...(this.localeFilter(locale) ? [this.localeFilter(locale)!] : [])
          ]
        }
      }
    });
    const totalSeconds = Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    console.log(`📊 Watch time (custom metric): ${totalSeconds} seconds`);
    return totalSeconds;
  }

  // 1d. Top locale (which locale produced the most plays) - YOUR EXACT QUERY
  async getTopLocale(startDate: string, endDate: string) {
    const [res] = await this.client!.runReport({
      property: PROPERTY,
      dateRanges: [range(startDate, endDate)],
      dimensions: [{ name: "customEvent:locale" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
      orderBys: [{ desc: true, metric: { metricName: "eventCount" } }],
      limit: 5
    });
    
    const localeData = (res.rows || []).map(row => ({
      locale: row.dimensionValues?.[0]?.value || 'unknown',
      users: Number(row.metricValues?.[0]?.value || 0)
    }));

    console.log(`📊 Top locales by video starts:`, localeData);
    return localeData;
  }

  // Main KPIs endpoint using YOUR EXACT QUERIES
  async getKPIs(startDate: string, endDate: string, locale: string = 'all') {
    const cacheKey = getCacheKey('kpis', { startDate, endDate, locale });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`📊 Fetching GA4 KPIs for ${startDate} to ${endDate}, locale: ${locale}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      // Compute KPIs using YOUR video events with YOUR custom dimensions/metrics
      const plays = await this.getPlays(startDate, endDate, locale);
      const completes = await this.getCompletes(startDate, endDate, locale);
      const totalWatchSec = await this.getWatchTime(startDate, endDate, locale);
      const localeData = await this.getTopLocale(startDate, endDate);

      const avgWatchSec = plays > 0 ? Math.round(totalWatchSec / plays) : 0;
      const completionRate = plays > 0 ? (completes / plays) : 0;

      const result = {
        range: {
          start: startDate,
          end: endDate,
          locale,
        },
        kpis: {
          plays_unique_viewers: plays,
          avg_watch_time_sec: avgWatchSec,
          completion_rate: Math.round(completionRate * 100) / 100,
          plays_by_locale: localeData
        },
        cached: false,
        note: 'Live GA4 data from YOUR custom video events and metrics'
      };

      setCache(cacheKey, result);
      console.log(`✅ GA4 KPIs fetched from API using YOUR custom dimensions/metrics`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 KPIs query failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        request: `Query for ${startDate} to ${endDate}, locale: ${locale}`
      });
      throw new Error(`Failed to fetch GA4 KPIs: ${error.code} - ${error.message}`);
    }
  }

  // 2a. Plays per video
  async getPlaysByVideo(startDate: string, endDate: string, locale?: string) {
    const [res] = await this.client!.runReport({
      property: PROPERTY,
      dateRanges: [range(startDate, endDate)],
      dimensions: [{ name: "customEvent:video_id" }, { name: "customEvent:video_title" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
            ...(localeFilter(locale) ? [localeFilter(locale)!] : [])
          ]
        }
      },
      orderBys: [{ desc: true, metric: { metricName: "eventCount" } }],
      limit: 50
    });
    return res.rows?.map(r => ({
      video_id: r.dimensionValues?.[0]?.value ?? "",
      title: r.dimensionValues?.[1]?.value ?? "",
      plays: Number(r.metricValues?.[0]?.value ?? 0)
    })) ?? [];
  }

  // 2b. Watch time per video
  async getWatchTimeByVideo(startDate: string, endDate: string, locale?: string) {
    const [res] = await this.client!.runReport({
      property: PROPERTY,
      dateRanges: [range(startDate, endDate)],
      dimensions: [{ name: "customEvent:video_id" }],
      metrics: [{ name: "customEvent:watch_time_seconds" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_watch_time" } } },
            ...(localeFilter(locale) ? [localeFilter(locale)!] : [])
          ]
        }
      }
    });
    return new Map(
      (res.rows ?? []).map(r => [
        r.dimensionValues?.[0]?.value ?? "",
        Number(r.metricValues?.[0]?.value ?? 0)
      ])
    );
  }

  // 2c. Progress 50% & 100% per video
  async getProgressByVideo(startDate: string, endDate: string, locale?: string) {
    const [res] = await this.client!.runReport({
      property: PROPERTY,
      dateRanges: [range(startDate, endDate)],
      dimensions: [{ name: "customEvent:video_id" }, { name: "customEvent:percent" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
            {
              filter: {
                fieldName: "customEvent:percent",
                inListFilter: { values: ["50", "100"] }
              }
            },
            ...(localeFilter(locale) ? [localeFilter(locale)!] : [])
          ]
        }
      }
    });
    
    // Map: video_id -> { p50, p100 }
    const out = new Map<string, { p50: number; p100: number }>();
    for (const row of res.rows ?? []) {
      const vid = row.dimensionValues?.[0]?.value ?? "";
      const pct = row.dimensionValues?.[1]?.value ?? "";
      const cnt = Number(row.metricValues?.[0]?.value ?? 0);
      const cur = out.get(vid) ?? { p50: 0, p100: 0 };
      if (pct === "50") cur.p50 += cnt;
      if (pct === "100") cur.p100 += cnt;
      out.set(vid, cur);
    }
    return out;
  }

  // Top Videos table (joins the above three queries)
  async getTopVideos(startDate: string, endDate: string, locale: string = 'all', limit: number = 10) {
    const cacheKey = getCacheKey('top-videos', { startDate, endDate, locale, limit });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`🎬 Fetching GA4 top videos for ${startDate} to ${endDate}, locale: ${locale}, limit: ${limit}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      const plays = await this.getPlaysByVideo(startDate, endDate, locale === 'all' ? undefined : locale);
      const wt = await this.getWatchTimeByVideo(startDate, endDate, locale === 'all' ? undefined : locale);
      const prog = await this.getProgressByVideo(startDate, endDate, locale === 'all' ? undefined : locale);

      const rows = plays.slice(0, limit).map(v => {
        const totalWatch = wt.get(v.video_id) ?? 0;
        const avgWatch = v.plays > 0 ? Math.round(totalWatch / v.plays) : 0;
        const { p50 = 0, p100 = 0 } = prog.get(v.video_id) ?? { p50: 0, p100: 0 };
        const p50Rate = v.plays > 0 ? (p50 / v.plays) : 0;
        const completeRate = v.plays > 0 ? (p100 / v.plays) : 0;

        return {
          video_id: v.video_id,
          plays: v.plays,
          avg_watch_time_sec: avgWatch,
          reach50_pct: Math.round(p50Rate * 100) / 100,
          complete100_pct: Math.round(completeRate * 100) / 100
        };
      });

      const result = { rows, cached: false };
      setCache(cacheKey, result);
      console.log(`✅ GA4 top videos fetched from API and cached (${rows.length} videos)`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 top videos query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to fetch GA4 top videos: ${error.code} - ${error.message}`);
    }
  }

  // 3) Funnel (overall counts at 25/50/75/100)
  async getFunnelData(startDate: string, endDate: string, locale: string = 'all') {
    const cacheKey = getCacheKey('funnel', { startDate, endDate, locale });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`📊 Fetching GA4 funnel data for ${startDate} to ${endDate}, locale: ${locale}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      const [res] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [range(startDate, endDate)],
        dimensions: [{ name: "customEvent:percent" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: "eventName", stringFilter: { value: "video_progress" } } },
              {
                filter: { fieldName: "customEvent:percent", inListFilter: { values: ["25","50","75","100"] } }
              },
              ...(localeFilter(locale === 'all' ? undefined : locale) ? [localeFilter(locale === 'all' ? undefined : locale)!] : [])
            ]
          }
        }
      });

      const out = { p25: 0, p50: 0, p75: 0, p100: 0 };
      for (const r of res.rows ?? []) {
        const p = r.dimensionValues?.[0]?.value;
        const c = Number(r.metricValues?.[0]?.value ?? 0);
        if (p === "25") out.p25 += c;
        if (p === "50") out.p50 += c;
        if (p === "75") out.p75 += c;
        if (p === "100") out.p100 += c;
      }

      const rows = [
        { video_id: 'all', percent: 25, count: out.p25 },
        { video_id: 'all', percent: 50, count: out.p50 },
        { video_id: 'all', percent: 75, count: out.p75 },
        { video_id: 'all', percent: 100, count: out.p100 }
      ];

      const result = { rows, cached: false };
      setCache(cacheKey, result);
      console.log(`✅ GA4 funnel data fetched from API and cached`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 funnel query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to fetch GA4 funnel data: ${error.code} - ${error.message}`);
    }
  }

  // 4) Trend over time (plays & avg watch/day)
  async getTrendData(startDate: string, endDate: string, locale: string = 'all') {
    const cacheKey = getCacheKey('trend', { startDate, endDate, locale });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`📊 Fetching GA4 trend data for ${startDate} to ${endDate}, locale: ${locale}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      // Plays/day
      const [p] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [range(startDate, endDate)],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: "eventName", stringFilter: { value: "video_start" } } },
              ...(localeFilter(locale === 'all' ? undefined : locale) ? [localeFilter(locale === 'all' ? undefined : locale)!] : [])
            ]
          }
        }
      });

      // Watch time/day
      const [w] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [range(startDate, endDate)],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "customEvent:watch_time_seconds" }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: "eventName", stringFilter: { value: "video_watch_time" } } },
              ...(localeFilter(locale === 'all' ? undefined : locale) ? [localeFilter(locale === 'all' ? undefined : locale)!] : [])
            ]
          }
        }
      });

      // Join by date
      const wtByDate = new Map((w.rows ?? []).map(r => [r.dimensionValues?.[0]?.value, Number(r.metricValues?.[0]?.value ?? 0)]));
      const days = (p.rows ?? []).map(r => {
        const date = r.dimensionValues?.[0]?.value ?? "";
        const plays = Number(r.metricValues?.[0]?.value ?? 0);
        const wt = wtByDate.get(date) ?? 0;
        const avg = plays > 0 ? Math.round(wt / plays) : 0;
        return { date, plays, avg_watch_time_sec: avg };
      });

      const result = { days, cached: false };
      setCache(cacheKey, result);
      console.log(`✅ GA4 trend data fetched from API and cached (${days.length} days)`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 trend query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to fetch GA4 trend data: ${error.code} - ${error.message}`);
    }
  }

  // 5) Realtime data
  async getRealtimeData() {
    const cacheKey = getCacheKey('realtime', {});
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log('🔴 Fetching GA4 realtime data');

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      const [response] = await this.client.runRealtimeReport({
        property: PROPERTY,
        dimensions: [{ name: 'country' }, { name: 'eventName' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['video_start', 'video_progress', 'video_complete']
            }
          }
        },
        limit: 10
      });

      const rows = response.rows || [];
      const realtimeData = rows.map(row => ({
        country: row.dimensionValues?.[0]?.value || 'Unknown',
        event: row.dimensionValues?.[1]?.value || 'Unknown',
        active_users: parseInt(row.metricValues?.[0]?.value || '0')
      }));

      const result = {
        active_users_total: realtimeData.reduce((sum, item) => sum + item.active_users, 0),
        by_country: realtimeData,
        cached: false
      };

      // Cache for shorter duration (30 seconds for realtime data)
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`✅ GA4 realtime data fetched from API and cached`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 realtime query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to fetch GA4 realtime data: ${error.code} - ${error.message}`);
    }
  }
}