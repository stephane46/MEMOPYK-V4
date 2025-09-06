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
    
    console.log("🔍 [GA4 Realtime] Fetching top videos from last 30 minutes...");
    
    // Query for video_start events with eventName dimension
    const [response] = await client.runRealtimeReport({
      property,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            value: "video_start",
            matchType: "EXACT"
          }
        }
      },
      limit: 20
    });

    const videoStarts = (response.rows || []).map(row => ({
      eventName: row.dimensionValues?.[0]?.value || "(n/a)",
      eventCount: Number(row.metricValues?.[0]?.value || 0)
    }));
    
    console.log(`✅ [GA4 Realtime] Found ${videoStarts.length} video start events`);

    res.json({ 
      success: true,
      videoStarts,
      note: "Video start events from realtime API"
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
    
    // For now, just get video_progress events (custom parameters not available in realtime)
    const [response] = await client.runRealtimeReport({
      property,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            value: "video_progress",
            matchType: "EXACT"
          }
        }
      },
      limit: 50
    });

    const progressEvents = (response.rows || []).map(row => ({
      eventName: row.dimensionValues?.[0]?.value || "(n/a)",
      eventCount: Number(row.metricValues?.[0]?.value || 0)
    }));

    console.log(`✅ [GA4 Realtime] Found ${progressEvents.length} video progress events`);
    res.json({ 
      success: true,
      progressEvents,
      videoId,
      note: "Video progress events from realtime API - custom parameters not available in realtime"
    });
  } catch (error: any) {
    console.error("❌ [GA4 Realtime] Error fetching video progress:", error);
    res.status(500).json({ 
      error: "Failed to fetch realtime video progress",
      message: error.message 
    });
  }
}