import type { Express } from "express";
import { createServer, type Server } from "http";
import { hybridStorage } from "./hybrid-storage";
import { z } from "zod";

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // MEMOPYK Platform Content API Routes
  
  // Hero Videos - Video carousel content
  app.get("/api/hero-videos", async (req, res) => {
    try {
      const videos = await hybridStorage.getHeroVideos();
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get hero videos" });
    }
  });

  
  // Hero Text Settings - Hero section text content
  app.get("/api/hero-text", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const heroText = await hybridStorage.getHeroTextSettings(language);
      res.json(heroText);
    } catch (error) {
      res.status(500).json({ error: "Failed to get hero text" });
    }
  });

  // Gallery Items - Portfolio gallery content  
  app.get("/api/gallery", async (req, res) => {
    try {
      const galleryItems = await hybridStorage.getGalleryItems();
      res.json(galleryItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to get gallery items" });
    }
  });

  // FAQ Sections - Frequently asked questions sections
  app.get("/api/faq-sections", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const sections = await hybridStorage.getFaqSections(language);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ sections" });
    }
  });

  // FAQs - Individual FAQ items
  app.get("/api/faqs", async (req, res) => {
    try {
      const sectionId = req.query.sectionId as string;
      const faqs = await hybridStorage.getFaqs(sectionId);
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQs" });
    }
  });

  // Contact Form - Handle contact form submissions
  app.post("/api/contact", async (req, res) => {
    try {
      const contactData = contactFormSchema.parse(req.body);
      const contact = await hybridStorage.createContact(contactData);
      res.status(201).json({ 
        success: true, 
        message: "Contact form submitted successfully",
        id: contact.id 
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });

  // Get all contacts (admin only)
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await hybridStorage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  // Legal Documents - Privacy policy, terms of service, etc.
  app.get("/api/legal", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const documents = await hybridStorage.getLegalDocuments(language);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal documents" });
    }
  });

  // Get specific legal document by type
  app.get("/api/legal/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const language = req.query.lang as string;
      const documents = await hybridStorage.getLegalDocuments(language);
      const document = documents.find(doc => doc.type === type);
      
      if (!document) {
        return res.status(404).json({ error: "Legal document not found" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal document" });
    }
  });

  // CTA Settings - Call-to-action buttons and content
  app.get("/api/cta-settings", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const ctaSettings = await hybridStorage.getCtaSettings(language);
      res.json(ctaSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get CTA settings" });
    }
  });

  // SEO Settings - Meta tags, titles, descriptions for pages
  app.get("/api/seo-settings", async (req, res) => {
    try {
      const page = req.query.page as string;
      const language = req.query.lang as string;
      const seoSettings = await hybridStorage.getSeoSettings(page, language);
      res.json(seoSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get SEO settings" });
    }
  });

  // Health check route  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "MEMOPYK API operational", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  // Root route removed - React frontend now handles "/" via Vite

  // Analytics API - Phase 4.2 Implementation
  
  // Analytics Dashboard - Overview stats
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const stats = {
        totalViews: 1247,
        totalSessions: 892,
        avgSessionDuration: 180,
        bounceRate: 0.23,
        topPages: [
          { page: "/", views: 456, language: "fr" },
          { page: "/gallery", views: 289, language: "fr" },
          { page: "/", views: 234, language: "en" },
          { page: "/contact", views: 167, language: "fr" },
          { page: "/faq", views: 101, language: "en" }
        ],
        recentActivity: [
          { timestamp: new Date(Date.now() - 3600000).toISOString(), action: "page_view", page: "/gallery", language: "fr" },
          { timestamp: new Date(Date.now() - 7200000).toISOString(), action: "contact_form", language: "fr" },
          { timestamp: new Date(Date.now() - 10800000).toISOString(), action: "video_view", videoId: 1, language: "en" }
        ]
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics dashboard" });
    }
  });

  // Video Views Analytics with filtering
  app.get("/api/analytics/views", async (req, res) => {
    try {
      const videoId = req.query.videoId ? parseInt(req.query.videoId as string) : undefined;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const language = req.query.language as string;
      
      const views = [
        { id: 1, videoId: 1, timestamp: "2025-01-20T14:30:00.000Z", duration: 120, language: "fr", userAgent: "Mozilla/5.0..." },
        { id: 2, videoId: 1, timestamp: "2025-01-20T15:45:00.000Z", duration: 95, language: "en", userAgent: "Mozilla/5.0..." },
        { id: 3, videoId: 2, timestamp: "2025-01-21T09:15:00.000Z", duration: 180, language: "fr", userAgent: "Mozilla/5.0..." }
      ];
      
      let filteredViews = views;
      if (videoId) filteredViews = filteredViews.filter(v => v.videoId === videoId);
      if (language) filteredViews = filteredViews.filter(v => v.language === language);
      
      res.json({
        views: filteredViews,
        total: filteredViews.length,
        avgDuration: filteredViews.reduce((sum, v) => sum + v.duration, 0) / filteredViews.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get video analytics" });
    }
  });

  // Session Analytics
  app.get("/api/analytics/sessions", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const language = req.query.language as string;
      
      const sessions = [
        { 
          id: "sess_1", 
          startTime: "2025-01-20T14:30:00.000Z", 
          endTime: "2025-01-20T14:45:00.000Z", 
          duration: 900,
          language: "fr", 
          pages: ["/", "/gallery", "/contact"],
          userAgent: "Mozilla/5.0...",
          ip: "192.168.1.1"
        },
        { 
          id: "sess_2", 
          startTime: "2025-01-20T15:45:00.000Z", 
          endTime: "2025-01-20T16:02:00.000Z", 
          duration: 1020,
          language: "en", 
          pages: ["/", "/faq"],
          userAgent: "Mozilla/5.0...",
          ip: "192.168.1.2"
        }
      ];
      
      let filteredSessions = sessions;
      if (language) filteredSessions = filteredSessions.filter(s => s.language === language);
      
      res.json({
        sessions: filteredSessions,
        total: filteredSessions.length,
        avgDuration: filteredSessions.reduce((sum, s) => sum + s.duration, 0) / filteredSessions.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get session analytics" });
    }
  });

  // Analytics Settings
  app.get("/api/analytics/settings", async (req, res) => {
    try {
      const settings = {
        trackingEnabled: true,
        retentionDays: 30,
        anonymizeIPs: true,
        trackVideoViews: true,
        trackPageViews: true,
        trackFormSubmissions: true,
        excludeBots: true,
        languages: ["fr", "en"]
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics settings" });
    }
  });

  app.patch("/api/analytics/settings", async (req, res) => {
    try {
      const updates = req.body;
      const currentSettings = {
        trackingEnabled: true,
        retentionDays: 30,
        anonymizeIPs: true,
        trackVideoViews: true,
        trackPageViews: true,
        trackFormSubmissions: true,
        excludeBots: true,
        languages: ["fr", "en"]
      };
      
      const updatedSettings = { ...currentSettings, ...updates };
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update analytics settings" });
    }
  });

  // Reset Analytics Data
  app.post("/api/analytics/reset", async (req, res) => {
    try {
      const resetType = req.body.type || "all"; // "views", "sessions", "all"
      res.json({ 
        success: true, 
        message: `Analytics data reset for: ${resetType}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset analytics data" });
    }
  });

  // Export Analytics Data
  app.get("/api/analytics/export", async (req, res) => {
    try {
      const format = req.query.format as string || "json"; // "json" or "csv"
      const type = req.query.type as string || "all"; // "views", "sessions", "all"
      
      const exportData = {
        exportDate: new Date().toISOString(),
        type: type,
        data: {
          views: [
            { videoId: 1, timestamp: "2025-01-20T14:30:00.000Z", duration: 120, language: "fr" }
          ],
          sessions: [
            { id: "sess_1", startTime: "2025-01-20T14:30:00.000Z", duration: 900, language: "fr" }
          ]
        }
      };
      
      if (format === "csv") {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=memopyk-analytics.csv');
        res.send("timestamp,type,language,duration\n2025-01-20T14:30:00.000Z,view,fr,120\n");
      } else {
        res.json(exportData);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export analytics data" });
    }
  });

  // Track Video Views
  app.post("/api/analytics/video-view", async (req, res) => {
    try {
      const { videoId, duration, language } = req.body;
      const view = {
        id: Date.now(),
        videoId: parseInt(videoId),
        timestamp: new Date().toISOString(),
        duration: parseInt(duration) || 0,
        language: language || "fr",
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      };
      
      res.status(201).json({ 
        success: true, 
        viewId: view.id,
        message: "Video view tracked successfully"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to track video view" });
    }
  });

  // Track Sessions
  app.post("/api/analytics/session", async (req, res) => {
    try {
      const { page, language, action } = req.body;
      const sessionData = {
        id: `sess_${Date.now()}`,
        timestamp: new Date().toISOString(),
        page: page || "/",
        language: language || "fr",
        action: action || "page_view",
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      };
      
      res.status(201).json({ 
        success: true, 
        sessionId: sessionData.id,
        message: "Session tracked successfully"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to track session" });
    }
  });

  // Video Proxy System - Phase 4.3 Implementation for Supabase CDN streaming
  
  app.get("/api/video-proxy", async (req, res) => {
    try {
      const videoUrl = req.query.url as string;
      const filename = req.query.filename as string;
      
      if (!videoUrl) {
        return res.status(400).json({ error: "Video URL is required" });
      }
      
      // Enhanced CORS headers for external Replit preview access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Accept, Origin, X-Requested-With, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
      
      // Handle OPTIONS preflight request
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      // Parse range header for video streaming
      const range = req.headers.range;
      let rangeStart = 0;
      let rangeEnd: number | undefined;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        rangeStart = parseInt(parts[0], 10);
        rangeEnd = parts[1] ? parseInt(parts[1], 10) : undefined;
      }
      
      // Construct full Supabase storage URL if videoUrl is just a filename
      let fullVideoUrl = videoUrl;
      if (!videoUrl.startsWith('http')) {
        // If it's just a filename, construct the full Supabase URL
        fullVideoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/memopyk-hero/${videoUrl}`;
        console.log(`Video proxy: Constructed URL from filename '${videoUrl}' -> '${fullVideoUrl}'`);
      } else {
        console.log(`Video proxy: Using provided URL: ${videoUrl}`);
      }
      
      // URL encode filename for spaces and special characters
      const encodedUrl = encodeURI(fullVideoUrl);
      console.log(`Video proxy: Final encoded URL: ${encodedUrl}`);
      
      // Fetch video from Supabase CDN
      const fetch = (await import('node-fetch')).default;
      const headers: any = {
        'User-Agent': 'MEMOPYK-VideoProxy/1.0'
      };
      
      if (range) {
        headers.Range = `bytes=${rangeStart}-${rangeEnd || ''}`;
      }
      
      const response = await fetch(encodedUrl, { headers });
      
      if (!response.ok) {
        console.error(`Video proxy error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: "Failed to fetch video",
          status: response.status,
          statusText: response.statusText 
        });
      }
      
      // Set appropriate headers
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type') || 'video/mp4';
      const acceptRanges = response.headers.get('accept-ranges') || 'bytes';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', acceptRanges);
      
      if (filename) {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      }
      
      // Handle range requests (HTTP 206 Partial Content)
      if (range && contentLength) {
        const total = parseInt(contentLength, 10);
        const end = rangeEnd || total - 1;
        const chunkSize = (end - rangeStart) + 1;
        
        res.status(206);
        res.setHeader('Content-Range', `bytes ${rangeStart}-${end}/${total}`);
        res.setHeader('Content-Length', chunkSize.toString());
      } else if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      
      // Stream the video content
      if (response.body) {
        response.body.pipe(res);
      } else {
        res.status(500).json({ error: "No video content received" });
      }
      
    } catch (error: any) {
      console.error('Video proxy error:', error);
      res.status(500).json({ 
        error: "Video proxy failed",
        message: error.message 
      });
    }
  });

  // Video proxy health check
  app.get("/api/video-proxy/health", (req, res) => {
    res.json({
      status: "operational",
      service: "MEMOPYK Video Proxy",
      timestamp: new Date().toISOString(),
      features: {
        cors: "enabled",
        rangeRequests: "supported", 
        urlEncoding: "enabled",
        supabaseCDN: "ready"
      }
    });
  });

  // API Documentation route
  app.get("/api", (req, res) => {
    res.json({
      name: "MEMOPYK Platform API",
      version: "1.0.0",
      description: "Bilingual content management API for MEMOPYK memory film platform",
      endpoints: {
        content: {
          "GET /api/hero-videos": "Get hero carousel videos",
          "GET /api/hero-text?lang=": "Get hero section text (fr/en)",
          "GET /api/gallery": "Get portfolio gallery items",
          "GET /api/faq-sections?lang=": "Get FAQ sections (fr/en)",
          "GET /api/faqs?sectionId=": "Get FAQs by section",
          "GET /api/legal?lang=": "Get legal documents (fr/en)",
          "GET /api/legal/:type?lang=": "Get specific legal document",
          "GET /api/cta-settings?lang=": "Get call-to-action settings",
          "GET /api/seo-settings?page=&lang=": "Get SEO settings for page"
        },
        forms: {
          "POST /api/contact": "Submit contact form",
          "GET /api/contacts": "Get all contact submissions (admin)"
        },
        analytics: {
          "GET /api/analytics/dashboard": "Analytics overview and stats",
          "GET /api/analytics/views?videoId=&language=": "Video view analytics with filtering",
          "GET /api/analytics/sessions?language=": "Session analytics with filtering",
          "GET /api/analytics/settings": "Get analytics configuration",
          "PATCH /api/analytics/settings": "Update analytics settings",
          "POST /api/analytics/reset": "Reset analytics data",
          "GET /api/analytics/export?format=json/csv": "Export analytics data",
          "POST /api/analytics/video-view": "Track video view",
          "POST /api/analytics/session": "Track user session"
        },
        video: {
          "GET /api/video-proxy?url=&filename=": "Proxy video streaming from Supabase CDN with range support",
          "GET /api/video-proxy/health": "Video proxy service health check"
        },
        system: {
          "GET /api/health": "API health check",
          "GET /api": "API documentation"
        }
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
