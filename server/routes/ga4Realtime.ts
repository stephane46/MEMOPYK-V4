import type { Request, Response } from "express";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

// Initialize GA4 client with same credentials approach as existing GA4 service
const initGA4Client = () => {
  try {
    // Use GA4_SERVICE_ACCOUNT_KEY (full JSON) like the existing ga4-service.ts
    const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
    
    console.log("🔑 [GA4 Realtime] Initializing client with service account JSON");
    
    return new BetaAnalyticsDataClient(
      SA_KEY
        ? { credentials: JSON.parse(SA_KEY) }
        : {} // falls back to GOOGLE_APPLICATION_CREDENTIALS if set
    );
  } catch (error) {
    console.error("❌ [GA4 Realtime] Failed to initialize client:", error);
    throw error;
  }
};

let client: BetaAnalyticsDataClient;

const property = `properties/${process.env.GA4_PROPERTY_ID}`;

export async function getRealtimeTopVideos(req: Request, res: Response) {
  try {
    if (!client) {
      client = initGA4Client();
    }
    
    console.log("🔍 [GA4 Realtime] Fetching top videos with dimensional breakdown...");
    
    // Query for video_start events with customEvent dimensions for videoId and title
    const [response] = await client.runRealtimeReport({
      property,
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            matchType: "EXACT",
            value: "video_start"
          }
        }
      },
      orderBys: [{
        metric: { metricName: "eventCount" },
        desc: true
      }],
      limit: 50
    });

    const topVideosRt = (response.rows || []).map(row => ({
      videoId: row.dimensionValues?.[0]?.value || "unknown",
      title: row.dimensionValues?.[1]?.value || "Unknown Title",
      playsRt: Number(row.metricValues?.[0]?.value || 0)
    })).filter(video => video.videoId !== "unknown" && video.playsRt > 0);
    
    console.log(`✅ [GA4 Realtime] Found ${topVideosRt.length} top videos with plays`);

    res.json({ 
      topVideosRt
    });
  } catch (error: any) {
    console.error("❌ [GA4 Realtime] Error fetching top videos:", error);
    res.status(500).json({ 
      error: "Failed to fetch realtime top videos",
      message: error.message 
    });
  }
}

export async function getRealtimeVideoProgress(req: Request, res: Response) {
  try {
    if (!client) {
      client = initGA4Client();
    }
    
    const videoId = String(req.query.videoId || "");
    if (!videoId) {
      return res.status(400).json({ error: "videoId parameter required" });
    }

    console.log(`🔍 [GA4 Realtime] Fetching progress funnel for video: ${videoId}`);
    
    // Query for video_progress events with progress_percent dimension for specific videoId
    const [response] = await client.runRealtimeReport({
      property,
      dimensions: [{ name: "customEvent:progress_percent" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: "eventName",
                stringFilter: {
                  matchType: "EXACT",
                  value: "video_progress"
                }
              }
            },
            {
              filter: {
                fieldName: "customEvent:video_id",
                stringFilter: {
                  matchType: "EXACT",
                  value: videoId
                }
              }
            }
          ]
        }
      },
      orderBys: [{
        dimension: { dimensionName: "customEvent:progress_percent" }
      }],
      limit: 50
    });

    // Map GA4 data to progress buckets {10,25,50,75,90}
    const bucketCounts = new Map<number, number>();
    const targetBuckets = [10, 25, 50, 75, 90];
    
    // Initialize all buckets to 0
    targetBuckets.forEach(bucket => bucketCounts.set(bucket, 0));
    
    // Process GA4 response data
    (response.rows || []).forEach(row => {
      const progressPercent = Number(row.dimensionValues?.[0]?.value || 0);
      const count = Number(row.metricValues?.[0]?.value || 0);
      
      // Map to appropriate bucket
      if (progressPercent >= 10 && progressPercent < 25) {
        bucketCounts.set(10, bucketCounts.get(10)! + count);
      } else if (progressPercent >= 25 && progressPercent < 50) {
        bucketCounts.set(25, bucketCounts.get(25)! + count);
      } else if (progressPercent >= 50 && progressPercent < 75) {
        bucketCounts.set(50, bucketCounts.get(50)! + count);
      } else if (progressPercent >= 75 && progressPercent < 90) {
        bucketCounts.set(75, bucketCounts.get(75)! + count);
      } else if (progressPercent >= 90) {
        bucketCounts.set(90, bucketCounts.get(90)! + count);
      }
    });
    
    const funnelRt = targetBuckets.map(bucket => ({
      bucket,
      count: bucketCounts.get(bucket) || 0
    }));

    console.log(`✅ [GA4 Realtime] Progress funnel for ${videoId}:`, funnelRt);
    res.json({ 
      funnelRt
    });
  } catch (error: any) {
    console.error("❌ [GA4 Realtime] Error fetching video progress:", error);
    res.status(500).json({ 
      error: "Failed to fetch realtime video progress",
      message: error.message 
    });
  }
}