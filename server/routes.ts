import type { Express } from "express";
import { createServer, type Server } from "http";
import { hybridStorage } from "./hybrid-storage";
import { z } from "zod";
import { videoCache } from "./video-cache";
import { createReadStream, existsSync, statSync } from 'fs';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters")
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Configure multer for file uploads
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
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

  // Update hero video order
  app.patch("/api/hero-videos/:id/reorder", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { order_index } = req.body;
      
      if (!order_index || order_index < 1) {
        return res.status(400).json({ error: "Valid order_index is required" });
      }
      
      const result = await hybridStorage.updateHeroVideoOrder(videoId, order_index);
      res.json({ success: true, video: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to update video order" });
    }
  });

  // Gallery Items - CRUD operations with file upload support
  app.get("/api/gallery", async (req, res) => {
    try {
      const items = await hybridStorage.getGalleryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get gallery items" });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const item = await hybridStorage.createGalleryItem(req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create gallery item" });
    }
  });

  app.patch("/api/gallery/:id", async (req, res) => {
    try {
      const itemId = req.params.id;
      const updates = req.body;
      const item = await hybridStorage.updateGalleryItem(itemId, updates);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update gallery item" });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      console.log(`🗑️ Deleting gallery item with ID: ${itemId}`);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid gallery item ID" });
      }
      
      const deletedItem = await hybridStorage.deleteGalleryItem(itemId);
      console.log(`✅ Successfully deleted gallery item: ${deletedItem.title_en || 'Untitled'}`);
      
      res.json({ success: true, deleted: deletedItem });
    } catch (error) {
      console.error('Gallery deletion error:', error);
      res.status(500).json({ error: `Failed to delete gallery item: ${error.message}` });
    }
  });

  app.patch("/api/gallery/:id/reorder", async (req, res) => {
    try {
      const itemId = req.params.id;
      const { orderIndex } = req.body;
      const item = await hybridStorage.updateGalleryItemOrder(itemId, orderIndex);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder gallery item" });
    }
  });

  // Upload gallery video endpoint
  app.post("/api/gallery/upload-video", uploadVideo.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `gallery_${timestamp}_${originalName}`;

      console.log(`📤 Uploading gallery video: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);

      // Upload to Supabase storage (gallery bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-gallery')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
      
      res.json({ 
        success: true, 
        url: videoUrl,
        filename: filename 
      });

    } catch (error) {
      console.error('Gallery video upload error:', error);
      res.status(500).json({ error: "Failed to upload gallery video" });
    }
  });

  // Upload gallery image/thumbnail endpoint  
  app.post("/api/gallery/upload-image", uploadImage.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `gallery_thumb_${timestamp}_${originalName}`;

      console.log(`📤 Uploading gallery image: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);

      // Upload to Supabase storage (gallery bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-gallery')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const imageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
      
      res.json({ 
        success: true, 
        url: imageUrl,
        filename: filename,
        width: req.body.width || null,
        height: req.body.height || null
      });

    } catch (error) {
      console.error('Gallery image upload error:', error);
      res.status(500).json({ error: "Failed to upload gallery image" });
    }
  });

  // Hero Text Settings
  app.get("/api/hero-text", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const heroText = await hybridStorage.getHeroTextSettings(language);
      res.json(heroText);
    } catch (error) {
      res.status(500).json({ error: "Failed to get hero text" });
    }
  });

  // Create new hero text
  app.post("/api/hero-text", async (req, res) => {
    try {
      const { title_fr, title_en, subtitle_fr, subtitle_en, font_size } = req.body;
      
      if (!title_fr || !title_en) {
        return res.status(400).json({ error: "French and English titles are required" });
      }
      
      const newText = await hybridStorage.createHeroText({
        title_fr,
        title_en,
        subtitle_fr: subtitle_fr || '',
        subtitle_en: subtitle_en || '',
        font_size: font_size || 48,
        is_active: false
      });
      
      res.status(201).json({ success: true, text: newText });
    } catch (error) {
      console.error('Create hero text error:', error);
      res.status(500).json({ error: "Failed to create hero text" });
    }
  });

  // Update hero text
  app.patch("/api/hero-text/:id", async (req, res) => {
    try {
      const textId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedText = await hybridStorage.updateHeroText(textId, updateData);
      res.json({ success: true, text: updatedText });
    } catch (error) {
      console.error('Update hero text error:', error);
      res.status(500).json({ error: "Failed to update hero text" });
    }
  });

  // Apply hero text to site (set as active)
  app.patch("/api/hero-text/:id/apply", async (req, res) => {
    try {
      const textId = parseInt(req.params.id);
      const { font_size } = req.body;
      
      await hybridStorage.deactivateAllHeroTexts();
      
      const appliedText = await hybridStorage.updateHeroText(textId, {
        is_active: true,
        font_size: font_size || 48
      });
      
      res.json({ success: true, text: appliedText });
    } catch (error) {
      console.error('Apply hero text error:', error);
      res.status(500).json({ error: "Failed to apply hero text" });
    }
  });

  // Delete hero text
  app.delete("/api/hero-text/:id", async (req, res) => {
    try {
      const textId = parseInt(req.params.id);
      
      await hybridStorage.deleteHeroText(textId);
      res.json({ success: true, message: "Hero text deleted successfully" });
    } catch (error) {
      console.error('Delete hero text error:', error);
      res.status(500).json({ error: "Failed to delete hero text" });
    }
  });

  // Gallery Items - Gallery content  
  app.get("/api/gallery", async (req, res) => {
    try {
      const items = await hybridStorage.getGalleryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get gallery items" });
    }
  });

  // FAQ Content - Frequently asked questions
  app.get("/api/faq", async (req, res) => {
    try {
      const faqs = await hybridStorage.getFAQContent();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ content" });
    }
  });

  // Contact Information - Contact details and form submissions
  app.get("/api/contact", async (req, res) => {
    try {
      const contact = await hybridStorage.getContactInfo();
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contact info" });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const result = contactFormSchema.parse(req.body);
      // In a real implementation, this would send email or store in database
      console.log("📧 Contact form submission:", result);
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || "Invalid form data" });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // CTA Content - Call-to-action content
  app.get("/api/cta", async (req, res) => {
    try {
      const cta = await hybridStorage.getCTAContent();
      res.json(cta);
    } catch (error) {
      res.status(500).json({ error: "Failed to get CTA content" });
    }
  });

  // Legal Documents - Terms, privacy policy, etc.
  app.get("/api/legal/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const legal = await hybridStorage.getLegalDocument(type);
      res.json(legal);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal document" });
    }
  });

  // SEO Settings - Meta tags and SEO configuration
  app.get("/api/seo", async (req, res) => {
    try {
      const seo = await hybridStorage.getSEOSettings();
      res.json(seo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get SEO settings" });
    }
  });

  // Video streaming proxy with caching system
  app.get("/api/video-proxy", async (req, res) => {
    try {
      const { url, filename } = req.query;
      
      if (!filename) {
        return res.status(400).json({ error: "filename parameter is required" });
      }

      const videoFilename = filename as string;
      const range = req.headers.range;

      // Check if video exists in cache
      const cachedVideo = videoCache.getCachedVideoPath(videoFilename);
      
      if (cachedVideo && existsSync(cachedVideo)) {
        console.log(`📦 Serving from cache: ${videoFilename}`);
        
        const stat = statSync(cachedVideo);
        const fileSize = stat.size;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;

          const stream = createReadStream(cachedVideo, { start, end });
          
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'range, content-type',
            'Cache-Control': 'public, max-age=86400'
          });
          
          stream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          });
          
          createReadStream(cachedVideo).pipe(res);
        }
        return;
      }

      // Construct Supabase CDN URL from filename
      let videoUrl: string;
      
      if (videoFilename.startsWith('gallery_')) {
        videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${videoFilename}`;
      } else {
        videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-hero/${videoFilename}`;
      }

      console.log(`Video proxy: Constructed URL from filename '${videoFilename}' -> '${videoUrl}'`);
      console.log(`Video proxy: Final encoded URL: ${videoUrl}`);

      // Fetch from Supabase CDN with range support
      const headers: Record<string, string> = {
        'User-Agent': 'MEMOPYK-VideoProxy/1.0'
      };

      if (range) {
        headers['Range'] = range;
      }

      const response = await fetch(videoUrl, { headers });
      
      if (!response.ok) {
        console.error(`Video proxy error: ${response.status} ${response.statusText} for ${videoUrl}`);
        return res.status(response.status).json({ 
          error: `Video not available: ${response.statusText}`,
          url: videoUrl,
          status: response.status 
        });
      }

      // Stream the response and optionally cache it
      const contentType = response.headers.get('content-type') || 'video/mp4';
      const contentLength = response.headers.get('content-length');
      const acceptRanges = response.headers.get('accept-ranges');
      const contentRange = response.headers.get('content-range');

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'range, content-type');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);

      // Set appropriate status code
      res.status(range && response.status === 206 ? 206 : 200);

      // Stream response to client and cache if it's a full video request (no range)
      if (!range && response.body) {
        // Cache the video for future requests
        videoCache.cacheVideoStream(videoFilename, response.body as any).catch(console.error);
      }

      // @ts-ignore - Node.js streams compatibility
      response.body?.pipe(res);

    } catch (error) {
      console.error('Video proxy error:', error);
      res.status(500).json({ error: "Video streaming failed" });
    }
  });

  // Video cache health endpoint
  app.get("/api/video-proxy/health", async (req, res) => {
    try {
      const stats = await videoCache.getCacheStats();
      res.json({
        status: "healthy",
        cache: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const dashboard = await hybridStorage.getAnalyticsDashboard();
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics dashboard" });
    }
  });

  app.post("/api/analytics/video-view", async (req, res) => {
    try {
      // Simple tracking acknowledgment - analytics is optional for now
      console.log('Video view tracked:', req.body);
      res.json({ success: true, message: "Video view logged" });
    } catch (error) {
      console.error('Video view tracking error:', error);
      res.status(500).json({ error: "Failed to track video view" });
    }
  });

  app.post("/api/analytics/session", async (req, res) => {
    try {
      const { session_id, language, user_agent, screen_resolution } = req.body;
      const result = await hybridStorage.trackSession(session_id, language, user_agent, screen_resolution);
      res.json({ success: true, sessionId: result.id });
    } catch (error) {
      console.error('Session tracking error:', error);
      res.status(500).json({ error: "Failed to track session" });
    }
  });

  // Gallery file upload endpoints
  app.post("/api/gallery/upload-video", uploadVideo.single('video'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      // Upload to Supabase storage
      const filename = `gallery_video_${Date.now()}_${file.originalname}`;
      const { data, error } = await supabase.storage
        .from('memopyk-gallery')
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ error: "Failed to upload video to storage" });
      }

      const publicUrl = supabase.storage
        .from('memopyk-gallery')
        .getPublicUrl(filename).data.publicUrl;
      
      res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });

  app.post("/api/gallery/upload-image", uploadImage.single('image'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Upload to Supabase storage
      const filename = `gallery_image_${Date.now()}_${file.originalname}`;
      const { data, error } = await supabase.storage
        .from('memopyk-gallery')
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ error: "Failed to upload image to storage" });
      }

      const publicUrl = supabase.storage
        .from('memopyk-gallery')
        .getPublicUrl(filename).data.publicUrl;
      
      res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Video cache stats endpoint
  app.get("/api/video-cache/stats", async (req, res) => {
    try {
      const stats = await videoCache.getCacheStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get cache stats" });
    }
  });

  return createServer(app);
}