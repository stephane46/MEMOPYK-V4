import express from "express";
import { randomUUID } from "crypto";

const router = express.Router();

// Use VITE_GA_MEASUREMENT_ID since it's already available
const MID = process.env.VITE_GA_MEASUREMENT_ID; // e.g., G-JLRWHE1HV4
const API_SECRET = process.env.GA_API_SECRET; // Optional - can work without it

router.post("/ga4/mp", express.json(), async (req, res) => {
  try {
    if (!MID) {
      return res.status(500).json({ error: "GA4 Measurement ID not configured" });
    }
    
    const { client_id, user_id, events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "events array required" });
    }

    // Generate/persist a client_id if not provided
    const cid = String(client_id || randomUUID());

    // Basic allowlist for security
    const allowed = new Set(["video_start", "video_progress", "video_complete"]);
    for (const e of events) {
      if (!allowed.has(e?.name)) {
        return res.status(400).json({ error: `event not allowed: ${e?.name}` });
      }
    }

    const payload = {
      client_id: cid,
      user_id,
      non_personalized_ads: false,
      events,
    };

    // Use production endpoint when no API_SECRET (avoids warnings)
    const base = API_SECRET
      ? "https://www.google-analytics.com/debug/mp/collect"
      : "https://www.google-analytics.com/mp/collect";

    // Build URL with API_SECRET if available
    let url = `${base}?measurement_id=${encodeURIComponent(MID)}`;
    if (API_SECRET) {
      url += `&api_secret=${encodeURIComponent(API_SECRET)}`;
    }

    console.log(`🎯 [GA4 MP] Sending to ${base}:`, JSON.stringify(payload, null, 2));

    const gaResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await gaResponse.text();
    if (!gaResponse.ok) {
      console.error(`❌ [GA4 MP] Error ${gaResponse.status}:`, text);
      return res.status(gaResponse.status).json({ error: "GA4 MP error", body: text });
    }

    // In debug mode, GA returns validationMessages
    let debug: any = undefined;
    try { 
      debug = JSON.parse(text); 
    } catch {
      // Production returns empty body, which is expected
    }

    console.log(`✅ [GA4 MP] Success - events sent for client ${cid}`);
    res.json({ ok: true, client_id: cid, debug });
  } catch (err: any) {
    console.error('❌ [GA4 MP] Server error:', err);
    res.status(500).json({ error: "server error", message: String(err?.message || err) });
  }
});

export default router;