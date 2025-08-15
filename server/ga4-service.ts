import { BetaAnalyticsDataClient } from '@google-analytics/data';

interface GA4Config {
  propertyId: string;
  credentials: any;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache for GA4 responses (10 minutes TTL)
const responseCache = new Map<string, CachedResponse>();

export class GA4Service {
  private client: BetaAnalyticsDataClient;
  private propertyId: string;
  private cacheKeyPrefix = 'ga4_';
  private cacheTTLMs = 10 * 60 * 1000; // 10 minutes

  constructor(config: GA4Config) {
    this.propertyId = config.propertyId;
    
    // Initialize GA4 client with service account credentials
    this.client = new BetaAnalyticsDataClient({
      credentials: config.credentials
    });
  }

  /**
   * Generate cache key for a query
   */
  private getCacheKey(endpoint: string, params: Record<string, any>): string {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `${this.cacheKeyPrefix}${endpoint}_${paramStr}`;
  }

  /**
   * Get cached response if valid
   */
  private getCachedResponse(cacheKey: string): any | null {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    if (cached) {
      responseCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Cache a response
   */
  private setCachedResponse(cacheKey: string, data: any): void {
    responseCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.cacheTTLMs
    });
  }

  /**
   * Create dimension filter for gallery videos only
   */
  private createGalleryFilter(locale?: string) {
    const filters = [
      {
        filter: {
          fieldName: 'customEvent:gallery',
          stringFilter: {
            matchType: 'EXACT' as const,
            value: 'Video Gallery'
          }
        }
      }
    ];

    if (locale && locale !== 'all') {
      filters.push({
        filter: {
          fieldName: 'customEvent:locale', 
          stringFilter: {
            matchType: 'EXACT' as const,
            value: locale
          }
        }
      });
    }

    return {
      andGroup: { expressions: filters }
    };
  }

  /**
   * Get KPIs for dashboard
   */
  async getKPIs(startDate: string, endDate: string, locale: string = 'all'): Promise<any> {
    const cacheKey = this.getCacheKey('kpis', { startDate, endDate, locale });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const propertyPath = `properties/${this.propertyId}`;
      const dimensionFilter = this.createGalleryFilter(locale);

      // Query 1: Video start plays (unique users)
      const [playsResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'totalUsers' }],
        dimensionFilter,
        metricFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: 'video_start'
            }
          }
        }
      });

      // Query 2: Video complete (unique users)  
      const [completersResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'totalUsers' }],
        dimensionFilter,
        metricFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: 'video_complete'
            }
          }
        }
      });

      // Query 3: Total watch time
      const [watchTimeResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'customEvent:watch_time_seconds' }],
        dimensionFilter
      });

      // Query 4: Plays by locale breakdown
      const [localeResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'customEvent:locale' }],
        metrics: [{ name: 'totalUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'customEvent:gallery',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: 'Video Gallery'
            }
          }
        },
        metricFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: 'video_start'
            }
          }
        }
      });

      // Extract values
      const playsUniqueViewers = parseInt(playsResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
      const completersUniqueViewers = parseInt(completersResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
      const totalWatchTimeSeconds = parseInt(watchTimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0');

      // Calculate derived metrics
      const avgWatchTimeSec = totalWatchTimeSeconds / Math.max(playsUniqueViewers, 1);
      const completionRate = completersUniqueViewers / Math.max(playsUniqueViewers, 1);

      // Extract locale breakdown
      const playsByLocale = localeResponse.rows?.map(row => ({
        locale: row.dimensionValues?.[0]?.value || '',
        users: parseInt(row.metricValues?.[0]?.value || '0')
      })) || [];

      const result = {
        range: { start: startDate, end: endDate, locale },
        kpis: {
          plays_unique_viewers: playsUniqueViewers,
          avg_watch_time_sec: Math.round(avgWatchTimeSec * 10) / 10,
          completion_rate: Math.round(completionRate * 1000) / 1000,
          plays_by_locale: playsByLocale
        },
        cached: false
      };

      this.setCachedResponse(cacheKey, result);
      return result;

    } catch (error) {
      console.error('GA4 KPIs query error:', error);
      throw new Error(`Failed to fetch GA4 KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top videos performance
   */
  async getTopVideos(startDate: string, endDate: string, locale: string = 'all', limit: number = 10): Promise<any> {
    const cacheKey = this.getCacheKey('top-videos', { startDate, endDate, locale, limit });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const propertyPath = `properties/${this.propertyId}`;
      const dimensionFilter = this.createGalleryFilter(locale);

      // Query 1: Video plays by video_id
      const [playsResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'customEvent:video_id' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter,
        metricFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: 'video_start'
            }
          }
        },
        limit
      });

      // Query 2: Watch time by video_id
      const [watchTimeResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'customEvent:video_id' }],
        metrics: [{ name: 'customEvent:watch_time_seconds' }],
        dimensionFilter
      });

      // Query 3: 50% progress by video_id
      const [progress50Response] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'customEvent:video_id' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter,
        metricFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT' as const,
                    value: 'video_progress'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'customEvent:percent',
                  numericFilter: {
                    operation: 'EQUAL' as const,
                    value: { doubleValue: 50 }
                  }
                }
              }
            ]
          }
        }
      });

      // Query 4: 100% progress by video_id
      const [progress100Response] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'customEvent:video_id' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter,
        metricFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT' as const,
                    value: 'video_progress'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'customEvent:percent',
                  numericFilter: {
                    operation: 'EQUAL' as const,
                    value: { doubleValue: 100 }
                  }
                }
              }
            ]
          }
        }
      });

      // Merge data by video_id
      const videoData = new Map();

      // Process plays
      playsResponse.rows?.forEach(row => {
        const videoId = row.dimensionValues?.[0]?.value || '';
        const plays = parseInt(row.metricValues?.[0]?.value || '0');
        videoData.set(videoId, { video_id: videoId, plays, total_watch_time: 0, reach50_count: 0, reach100_count: 0 });
      });

      // Process watch time
      watchTimeResponse.rows?.forEach(row => {
        const videoId = row.dimensionValues?.[0]?.value || '';
        const watchTime = parseInt(row.metricValues?.[0]?.value || '0');
        if (videoData.has(videoId)) {
          videoData.get(videoId).total_watch_time = watchTime;
        }
      });

      // Process 50% progress
      progress50Response.rows?.forEach(row => {
        const videoId = row.dimensionValues?.[0]?.value || '';
        const count = parseInt(row.metricValues?.[0]?.value || '0');
        if (videoData.has(videoId)) {
          videoData.get(videoId).reach50_count = count;
        }
      });

      // Process 100% progress
      progress100Response.rows?.forEach(row => {
        const videoId = row.dimensionValues?.[0]?.value || '';
        const count = parseInt(row.metricValues?.[0]?.value || '0');
        if (videoData.has(videoId)) {
          videoData.get(videoId).reach100_count = count;
        }
      });

      // Calculate derived metrics and format response
      const rows = Array.from(videoData.values()).map(data => ({
        video_id: data.video_id,
        plays: data.plays,
        avg_watch_time_sec: Math.round((data.total_watch_time / Math.max(data.plays, 1)) * 10) / 10,
        reach50_pct: Math.round((data.reach50_count / Math.max(data.plays, 1)) * 1000) / 1000,
        complete100_pct: Math.round((data.reach100_count / Math.max(data.plays, 1)) * 1000) / 1000
      })).sort((a, b) => b.plays - a.plays);

      const result = { rows, cached: false };
      this.setCachedResponse(cacheKey, result);
      return result;

    } catch (error) {
      console.error('GA4 Top Videos query error:', error);
      throw new Error(`Failed to fetch GA4 top videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get funnel data for watch progress
   */
  async getFunnelData(startDate: string, endDate: string, locale: string = 'all'): Promise<any> {
    const cacheKey = this.getCacheKey('funnel', { startDate, endDate, locale });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const propertyPath = `properties/${this.propertyId}`;
      const dimensionFilter = this.createGalleryFilter(locale);

      // Query progress events by video_id and percent
      const [funnelResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'customEvent:video_id' },
          { name: 'customEvent:percent' }
        ],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter,
        metricFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: 'video_progress'
            }
          }
        }
      });

      // Filter for 25, 50, 75, 100 percent values and format response
      const rows = funnelResponse.rows?.filter(row => {
        const percent = parseInt(row.dimensionValues?.[1]?.value || '0');
        return [25, 50, 75, 100].includes(percent);
      }).map(row => ({
        video_id: row.dimensionValues?.[0]?.value || '',
        percent: parseInt(row.dimensionValues?.[1]?.value || '0'),
        count: parseInt(row.metricValues?.[0]?.value || '0')
      })) || [];

      const result = { rows, cached: false };
      this.setCachedResponse(cacheKey, result);
      return result;

    } catch (error) {
      console.error('GA4 Funnel query error:', error);
      throw new Error(`Failed to fetch GA4 funnel data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get trend data over time
   */
  async getTrendData(startDate: string, endDate: string, locale: string = 'all'): Promise<any> {
    const cacheKey = this.getCacheKey('trend', { startDate, endDate, locale });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const propertyPath = `properties/${this.propertyId}`;
      const dimensionFilter = this.createGalleryFilter(locale);

      // Query 1: Daily plays
      const [playsResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter,
        metricFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: 'video_start'
            }
          }
        }
      });

      // Query 2: Daily watch time
      const [watchTimeResponse] = await this.client.runReport({
        property: propertyPath,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'customEvent:watch_time_seconds' }],
        dimensionFilter
      });

      // Merge daily data
      const dailyData = new Map();

      // Process daily plays
      playsResponse.rows?.forEach(row => {
        const date = row.dimensionValues?.[0]?.value || '';
        const plays = parseInt(row.metricValues?.[0]?.value || '0');
        dailyData.set(date, { date, plays, watch_time: 0 });
      });

      // Process daily watch time
      watchTimeResponse.rows?.forEach(row => {
        const date = row.dimensionValues?.[0]?.value || '';
        const watchTime = parseInt(row.metricValues?.[0]?.value || '0');
        if (dailyData.has(date)) {
          dailyData.get(date).watch_time = watchTime;
        } else {
          dailyData.set(date, { date, plays: 0, watch_time: watchTime });
        }
      });

      // Calculate avg watch time per day and format response
      const days = Array.from(dailyData.values()).map(data => ({
        date: data.date,
        plays: data.plays,
        avg_watch_time_sec: Math.round((data.watch_time / Math.max(data.plays, 1)) * 10) / 10
      })).sort((a, b) => a.date.localeCompare(b.date));

      const result = { days, cached: false };
      this.setCachedResponse(cacheKey, result);
      return result;

    } catch (error) {
      console.error('GA4 Trend query error:', error);
      throw new Error(`Failed to fetch GA4 trend data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get real-time data
   */
  async getRealtimeData(): Promise<any> {
    const cacheKey = this.getCacheKey('realtime', {});
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const propertyPath = `properties/${this.propertyId}`;

      // Try realtime report first
      try {
        const [realtimeResponse] = await this.client.runRealtimeReport({
          property: propertyPath,
          metrics: [{ name: 'activeUsers' }],
          dimensionFilter: {
            filter: {
              fieldName: 'customEvent:gallery',
              stringFilter: {
                matchType: 'EXACT' as const,
                value: 'Video Gallery'
              }
            }
          }
        });

        const activeUsers = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0');

        // Get recent events from last 30 minutes using regular report
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const now = new Date();

        const [recentEventsResponse] = await this.client.runReport({
          property: propertyPath,
          dateRanges: [{
            startDate: thirtyMinutesAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
          }],
          dimensions: [
            { name: 'customEvent:video_id' },
            { name: 'customEvent:locale' },
            { name: 'customEvent:percent' }
          ],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'customEvent:gallery',
              stringFilter: {
                matchType: 'EXACT' as const,
                value: 'Video Gallery'
              }
            }
          },
          metricFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: ['video_open', 'video_start', 'video_progress', 'video_complete']
              }
            }
          },
          limit: 20
        });

        const recentEvents = recentEventsResponse.rows?.map(row => ({
          ts: new Date().toISOString(), // Approximation since exact timestamp not available
          event: 'video_activity', // Simplified for now
          video_id: row.dimensionValues?.[0]?.value || '',
          locale: row.dimensionValues?.[1]?.value || '',
          percent: row.dimensionValues?.[2]?.value ? parseInt(row.dimensionValues[2].value) : undefined
        })).slice(0, 10) || [];

        const result = {
          active: activeUsers,
          recent: recentEvents,
          cached: false
        };

        this.setCachedResponse(cacheKey, result);
        return result;

      } catch (realtimeError) {
        // Fallback to approximate active users from last 30 minutes
        console.warn('Realtime report not available, using approximation');

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const now = new Date();

        const [approximateResponse] = await this.client.runReport({
          property: propertyPath,
          dateRanges: [{
            startDate: thirtyMinutesAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
          }],
          metrics: [{ name: 'totalUsers' }],
          dimensionFilter: {
            filter: {
              fieldName: 'customEvent:gallery',
              stringFilter: {
                matchType: 'EXACT' as const,
                value: 'Video Gallery'
              }
            }
          }
        });

        const approximateActive = parseInt(approximateResponse.rows?.[0]?.metricValues?.[0]?.value || '0');

        const result = {
          active: approximateActive,
          recent: [],
          cached: false
        };

        this.setCachedResponse(cacheKey, result);
        return result;
      }

    } catch (error) {
      console.error('GA4 Realtime query error:', error);
      throw new Error(`Failed to fetch GA4 realtime data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if response is cached
   */
  isCached(cacheKey: string): boolean {
    const cached = responseCache.get(cacheKey);
    return cached ? Date.now() < cached.expiresAt : false;
  }
}

// Initialize GA4 service
let ga4Service: GA4Service | null = null;

export function initializeGA4Service(): GA4Service {
  if (!ga4Service) {
    try {
      const serviceAccountKey = process.env.GA4_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('GA4_SERVICE_ACCOUNT_KEY environment variable not found');
      }

      const credentials = JSON.parse(serviceAccountKey);
      ga4Service = new GA4Service({
        propertyId: '501023254',
        credentials
      });

      console.log('✅ GA4 Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize GA4 Service:', error);
      throw error;
    }
  }

  return ga4Service;
}