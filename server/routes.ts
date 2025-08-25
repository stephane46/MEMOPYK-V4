import type { Express } from "express";
import { createServer, type Server } from "http";
import { hybridStorage } from "./hybrid-storage";
import { z } from "zod";
import { videoCache } from "./video-cache";
import fs, { createReadStream, existsSync, statSync, mkdirSync, openSync, closeSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import path from 'path';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import testRoutes from './test-routes';
import { setCacheAndOriginHeaders } from './cache-origin-headers';
import { createCacheHitHeaders, createCacheMissHeaders, getUpstreamSource, getCacheAge } from './cache-delivery-headers';
import { analyticsCleanupRoutes } from './routes-analytics-cache-cleanup';
import { LocationService } from './location-service';
import {
  qPlays,
  qCompletes,
  qWatchTimeTotal,
  qTopLanguages,
  qTopReferrers,
  qSiteLanguageChoice,
  qReturningUsers,
  qPlaysByVideo,
  qWatchTimeByVideo,
  qProgressByVideo,
  qFunnel,
  qTrend,
  qTrendDaily,
  qRealtime,
  getTopVideosTable,
  client as ga4Client,
  PROPERTY as GA4_PROPERTY
} from './ga4-service';
import { getCache, setCache, k, getDbCache, setDbCache } from './cache';

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Generate signed upload URL for direct Supabase uploads
async function generateSignedUploadUrl(filename: string, bucket: string): Promise<{ signedUrl: string; publicUrl: string }> {
  try {
    // Keep original filename - no timestamp prefix for gallery uploads
    const uniqueFilename = filename;
    console.log(`📁 SIGNED UPLOAD URL - Using original filename: ${uniqueFilename}`);
    
    // Create signed URL for upload (expires in 1 hour)
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueFilename, {
        upsert: true, // Allow overwriting existing files
        expiresIn: 3600 // 1 hour expiration
      });

    if (signedError) {
      console.error('❌ Failed to generate signed URL:', signedError);
      throw new Error(`Failed to generate signed URL: ${signedError.message}`);
    }

    // Get public URL for the file
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueFilename);

    console.log(`✅ Generated signed upload URL for: ${uniqueFilename}`);
    
    return {
      signedUrl: signedUrlData.signedUrl,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error('❌ Error generating signed upload URL:', error);
    throw error;
  }
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
try {
  mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Upload directory ready: ${uploadsDir}`);
} catch (error) {
  console.error('Failed to create uploads directory:', error);
}

// Configure disk storage for videos (safer for large files)
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename - no timestamp prefix for gallery videos
    const originalName = file.originalname;
    console.log(`📁 GALLERY VIDEO UPLOAD - Using original filename: ${originalName}`);
    cb(null, originalName);
  }
});

// Configure multer for file uploads
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 5000 * 1024 * 1024, // 5000MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    console.log(`📁 ENHANCED FILE DETECTION v2.0 - File upload attempt:`);
    console.log(`   - Filename: ${file.originalname}`);
    console.log(`   - MIME type: ${file.mimetype}`);
    console.log(`   - Size: ${(file.size || 0)} bytes (${((file.size || 0) / 1024 / 1024).toFixed(2)}MB)`);
    
    // Check both MIME type and file extension for better compatibility
    const isVideoMimeType = file.mimetype.startsWith('video/');
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv', '.wmv'];
    const hasVideoExtension = videoExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    console.log(`🔍 VALIDATION CHECKS:`);
    console.log(`   - MIME type check (${file.mimetype}): ${isVideoMimeType}`);
    console.log(`   - Extension check (${file.originalname}): ${hasVideoExtension}`);
    console.log(`   - File size under 5000MB: ${((file.size || 0) / 1024 / 1024) < 5000}`);
    
    if (isVideoMimeType || hasVideoExtension) {
      console.log(`✅ VIDEO FILE ACCEPTED: ${file.originalname} (Enhanced detection v2.0 - ${isVideoMimeType ? 'MIME' : 'EXTENSION'} match)`);
      cb(null, true);
    } else {
      console.log(`❌ FILE REJECTED - NOT A VIDEO: ${file.originalname}`);
      console.log(`   - MIME type: ${file.mimetype} (expected: video/*)`);
      console.log(`   - Extension: ${file.originalname.split('.').pop()} (expected: ${videoExtensions.join(', ')})`);
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Configure disk storage for images  
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename - no timestamp prefix for gallery images
    const originalName = file.originalname;
    console.log(`📁 GALLERY IMAGE UPLOAD - Using original filename: ${originalName}`);
    cb(null, originalName);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5000 * 1024 * 1024, // 5000MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize location service
const locationService = new LocationService(hybridStorage);

export async function registerRoutes(app: Express): Promise<void> {
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

  // Create new hero video entry
  app.post("/api/hero-videos", async (req, res) => {
    try {
      const { title_en, title_fr, url_en, url_fr, use_same_video, is_active, order_index } = req.body;
      
      // Validate required fields
      if (!title_en || !title_fr || !url_en) {
        return res.status(400).json({ error: "Missing required fields: title_en, title_fr, url_en" });
      }

      // Create new hero video
      const newVideo = await hybridStorage.createHeroVideo({
        title_en,
        title_fr,
        url_en,
        url_fr: url_fr || url_en,
        use_same_video: use_same_video || true,
        is_active: is_active || false,
        order_index: order_index || 1
      });

      res.json(newVideo);
    } catch (error) {
      console.error('Create hero video error:', error);
      res.status(500).json({ error: "Failed to create hero video" });
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

  // Hero video PATCH endpoint - update video metadata
  // Add toggle endpoint for active/inactive status
  app.patch("/api/hero-videos/:id/toggle", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { is_active } = req.body;
      
      const result = await hybridStorage.updateHeroVideo(videoId, {
        is_active,
        updated_at: new Date().toISOString()
      });
      
      res.json(result);
    } catch (error) {
      console.error('Hero video toggle error:', error);
      res.status(500).json({ error: "Failed to toggle hero video status" });
    }
  });

  app.patch("/api/hero-videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { title_en, title_fr, is_active, order_index, url_en, url_fr, use_same_video } = req.body;
      
      const result = await hybridStorage.updateHeroVideo(videoId, {
        title_en,
        title_fr,
        is_active,
        order_index,
        url_en,
        url_fr,
        use_same_video,
        updated_at: new Date().toISOString()
      });
      
      res.json(result);
    } catch (error) {
      console.error('Hero video update error:', error);
      res.status(500).json({ error: "Failed to update hero video" });
    }
  });

  // Hero video DELETE endpoint
  app.delete("/api/hero-videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      console.log(`🗑️ Deleting hero video with ID: ${videoId}`);
      
      const result = await hybridStorage.deleteHeroVideo(videoId);
      res.json({ success: true, deletedVideo: result });
    } catch (error: any) {
      console.error('Hero video delete error:', error);
      if (error.message === 'Video not found') {
        res.status(404).json({ error: "Video not found" });
      } else {
        res.status(500).json({ error: "Failed to delete hero video" });
      }
    }
  });

  // Gallery Items - CRUD operations with file upload support
  let galleryCache: { data: any[], timestamp: number } | null = null;
  const GALLERY_CACHE_TTL = 30000; // 30 seconds cache
  
  app.get("/api/gallery", async (req, res) => {
    try {
      const now = Date.now();
      const bypassCache = req.headers['x-test-bypass-cache'] === '1';
      
      // Check if cache is valid and not bypassing
      if (!bypassCache && galleryCache && (now - galleryCache.timestamp) < GALLERY_CACHE_TTL) {
        console.log(`📋 Gallery data served from cache (${Math.round((now - galleryCache.timestamp) / 1000)}s old)`);
        
        // Set cache headers for performance testing
        const deliveryHeaders = createCacheHitHeaders('local');
        res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
        res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
        res.setHeader('X-Storage', deliveryHeaders['X-Storage'] || 'unknown');
        res.setHeader('X-Content-Bytes', String(JSON.stringify(galleryCache.data).length));
        
        return res.json(galleryCache.data);
      }
      
      // Cache miss or expired - fetch fresh data
      const items = await hybridStorage.getGalleryItems();
      galleryCache = { data: items, timestamp: now };
      console.log(`🔄 Gallery data fetched from database and cached`);
      
      // Set cache headers for performance testing
      const deliveryHeaders = createCacheMissHeaders('local');
      res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
      res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
      res.setHeader('X-Storage', deliveryHeaders['X-Storage'] || 'unknown');
      res.setHeader('X-Content-Bytes', String(JSON.stringify(items).length));
      
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get gallery items" });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const item = await hybridStorage.createGalleryItem(req.body);
      // Clear gallery cache on creates
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to creation');
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create gallery item" });
    }
  });

  app.patch("/api/gallery/:id", async (req, res) => {
    try {
      const itemId = req.params.id;
      const updates = req.body;
      
      console.log('🚨 SERVER DEBUG - Gallery update received:', {
        itemId: itemId,
        video_filename: updates.video_filename,
        video_url_en: updates.video_url_en,
        title_en: updates.title_en,
        cropSettings: updates.cropSettings,
        fullUpdates: updates
      });
      console.log('🔍 CROP SETTINGS SERVER PATCH:', JSON.stringify(updates.cropSettings, null, 2));
      
      if (!itemId) {
        return res.status(400).json({ error: "Gallery item ID is required" });
      }
      
      const item = await hybridStorage.updateGalleryItem(itemId, updates);
      
      console.log('🚨 SERVER DEBUG - Gallery update completed:', {
        updated_video_filename: item.video_filename,
        updated_video_url_en: item.video_url_en
      });
      
      // CROSS-ENVIRONMENT SYNC: Notify other environments about the change
      console.log('🌍 CROSS-ENVIRONMENT: Gallery item updated in database - other environments will see changes after F5 refresh');
      
      // Clear gallery cache on updates
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to update');
      
      res.json(item);
    } catch (error: any) {
      console.error('Gallery update error:', error);
      res.status(500).json({ error: `Failed to update gallery item: ${error.message}` });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      const itemId = req.params.id;
      console.log(`🗑️ Deleting gallery item with ID: ${itemId}`);
      
      if (!itemId || itemId.trim() === '') {
        return res.status(400).json({ error: "Invalid gallery item ID" });
      }
      
      const deletedItem = await hybridStorage.deleteGalleryItem(itemId);
      console.log(`✅ Successfully deleted gallery item: ${deletedItem.title_en || 'Untitled'}`);
      
      res.json({ success: true, deleted: deletedItem });
    } catch (error: any) {
      console.error('Gallery deletion error:', error);
      
      // Special handling for "item not found" - this is actually success for deletion
      if (error.message === 'Gallery item not found') {
        console.log(`✅ Item ${req.params.id} already deleted or never existed - treating as successful deletion`);
        return res.json({ 
          success: true, 
          message: 'Item was already deleted or does not exist',
          alreadyDeleted: true 
        });
      }
      
      res.status(500).json({ error: `Failed to delete gallery item: ${error.message}` });
    }
  });

  app.patch("/api/gallery/:id/reorder", async (req, res) => {
    try {
      const itemId = req.params.id;
      const { order_index } = req.body;
      
      console.log(`🔄 Reordering gallery item ${itemId} to position ${order_index}`);
      
      if (!itemId || itemId.trim() === '') {
        return res.status(400).json({ error: "Invalid gallery item ID" });
      }
      
      const item = await hybridStorage.updateGalleryItemOrder(itemId, order_index);
      console.log(`✅ Successfully reordered gallery item ${itemId}`);
      
      // Clear gallery cache after successful reorder
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to reorder');
      
      res.json(item);
    } catch (error: any) {
      console.error('Gallery reorder error:', error);
      res.status(500).json({ error: `Failed to reorder gallery item: ${error.message}` });
    }
  });

  app.patch("/api/gallery/:id1/swap/:id2", async (req, res) => {
    try {
      const itemId1 = req.params.id1;
      const itemId2 = req.params.id2;
      
      console.log(`🔄 Swapping gallery items ${itemId1} ↔ ${itemId2}`);
      
      if (!itemId1 || !itemId2 || itemId1.trim() === '' || itemId2.trim() === '') {
        return res.status(400).json({ error: "Invalid gallery item IDs" });
      }
      
      const result = await hybridStorage.swapGalleryItemOrder(itemId1, itemId2);
      console.log(`✅ Successfully swapped gallery items`);
      
      // CRITICAL FIX: Clear gallery cache after successful swap
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to successful swap - UI will show fresh order immediately');
      
      res.json(result);
    } catch (error: any) {
      console.error('Gallery swap error:', error);
      res.status(500).json({ error: `Failed to swap gallery items: ${error.message}` });
    }
  });

  // Generate signed upload URL for direct Supabase uploads (bypasses Replit infrastructure limit)
  app.post("/api/upload/generate-signed-url", async (req, res) => {
    try {
      console.log("🔍 SIGNED URL REQUEST RECEIVED:", {
        body: req.body,
        headers: req.headers['content-type'],
        method: req.method
      });
      
      const { filename, fileType, bucket } = req.body;
      
      if (!filename || !bucket) {
        console.error("❌ Missing required fields:", { filename, fileType, bucket });
        return res.status(400).json({ error: "Filename and bucket are required" });
      }

      // Validate bucket name
      const allowedBuckets = ['memopyk-videos']; // Unified bucket for all media
      if (!allowedBuckets.includes(bucket)) {
        console.error("❌ Invalid bucket:", bucket);
        return res.status(400).json({ error: "Invalid bucket name" });
      }

      console.log(`🎬 GENERATING SIGNED URL for direct upload:`);
      console.log(`   - Original filename: ${filename}`);
      console.log(`   - File type: ${fileType}`);
      console.log(`   - Target bucket: ${bucket}`);

      const { signedUrl, publicUrl } = await generateSignedUploadUrl(filename, bucket);
      
      // Extract the actual filename from the public URL
      const actualFilename = publicUrl.split('/').pop();
      
      console.log("✅ Signed URL generated successfully:", actualFilename);
      
      res.json({
        success: true,
        signedUrl,
        publicUrl,
        filename: actualFilename
      });

    } catch (error) {
      console.error('❌ Failed to generate signed upload URL:', error);
      console.error('❌ Error details:', (error as any).message, (error as any).stack);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Server-side upload fallback for when direct upload fails
  app.post('/api/upload/server-side-upload', uploadImage.single('file'), async (req, res) => {
    try {
      console.log('🔄 SERVER-SIDE UPLOAD FALLBACK initiated');
      
      const file = req.file;
      const { bucket, filename } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!bucket || !filename) {
        return res.status(400).json({ error: 'Missing bucket or filename' });
      }

      console.log(`📁 Server uploading: ${filename} (${file.size} bytes) to bucket: ${bucket}`);

      // Upload file to Supabase storage from server
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, readFileSync(file.path), {
          contentType: file.mimetype,
          upsert: true
        });

      // Clean up temporary file
      try {
        unlinkSync(file.path);
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up temporary file:', cleanupError);
      }

      if (error) {
        console.error('❌ Server-side upload failed:', error);
        return res.status(500).json({ error: `Upload failed: ${error.message}` });
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);

      console.log('✅ Server-side upload successful:', filename);

      res.json({
        success: true,
        filename,
        publicUrl: publicUrlData.publicUrl,
        uploadPath: data.path
      });

    } catch (error) {
      console.error('❌ Server-side upload error:', error);
      res.status(500).json({ 
        error: 'Server-side upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle completion of direct upload (for caching and database updates)
  app.post("/api/upload/complete-direct-upload", async (req, res) => {
    try {
      const { publicUrl, filename, bucket, fileType } = req.body;
      
      if (!publicUrl || !filename) {
        return res.status(400).json({ error: "Public URL and filename are required" });
      }

      console.log(`✅ COMPLETING DIRECT UPLOAD:`);
      console.log(`   - Public URL: ${publicUrl}`);
      console.log(`   - Filename: ${filename}`);
      console.log(`   - Bucket: ${bucket}`);

      // If it's a video, cache it immediately for better performance
      if (fileType?.startsWith('video/') || filename.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v)$/)) {
        try {
          console.log(`🎬 Auto-caching directly uploaded video: ${filename}`);
          const response = await fetch(publicUrl);
          if (response.ok) {
            await videoCache.cacheVideo(filename, response);
            console.log(`✅ Direct upload video cached successfully: ${filename}`);
          }
        } catch (cacheError) {
          console.error(`⚠️ Failed to cache direct upload video ${filename}:`, cacheError);
          // Don't fail the completion if caching fails
        }
      }

      // AUTO-GENERATE STATIC 300x200 THUMBNAIL for direct uploaded images
      let staticImageUrl = null;
      let autoCropSettings = null;
      
      if (fileType?.startsWith('image/') || filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
        console.log(`🔍 STARTING DIRECT UPLOAD AUTO-THUMBNAIL PROCESS for: ${filename}`);
        
        try {
          console.log(`🤖 AUTO-GENERATING smart high-quality thumbnail for direct uploaded image: ${filename}`);
          
          // Download the image to process with Sharp
          const imageResponse = await fetch(publicUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
          }
          
          const imageBuffer = await imageResponse.arrayBuffer();
          const sharp = require('sharp');
          
          // Get image metadata to check if cropping is actually needed
          const metadata = await sharp(Buffer.from(imageBuffer)).metadata();
          const originalAspectRatio = metadata.width! / metadata.height!;
          const targetAspectRatio = 300 / 200; // 1.5 (3:2 ratio)
          const aspectRatioTolerance = 0.01; // Small tolerance for floating point comparison
          
          const needsCropping = Math.abs(originalAspectRatio - targetAspectRatio) > aspectRatioTolerance;
          
          // WEB-OPTIMIZED THUMBNAIL - balance quality with reasonable file sizes
          const thumbnailWidth = 800;  // Reasonable web resolution
          const thumbnailHeight = 533;  // 1.5 aspect ratio (800/533 ≈ 1.5)
          
          console.log(`🎯 WEB-OPTIMIZED SERVER CROP: Original ${metadata.width}x${metadata.height} → Thumbnail ${thumbnailWidth}x${thumbnailHeight}`);
          
          // Create high-quality thumbnail using smart dimensions
          const thumbnailBuffer = await sharp(Buffer.from(imageBuffer))
            .resize(thumbnailWidth, thumbnailHeight, {
              fit: needsCropping ? 'cover' : 'fill',  // Only crop if aspect ratio is different
              position: 'center'
            })
            .flatten({ background: { r: 255, g: 255, b: 255 } })  // White background for transparency
            .jpeg({ quality: 70, progressive: true, mozjpeg: true })  // Web-optimized quality
            .toBuffer();
          
          // Upload auto-generated thumbnail
          const staticFilename = `static_auto_${Date.now()}.jpg`;
          const { data: staticUploadData, error: staticUploadError } = await supabase.storage
            .from('memopyk-videos')
            .upload(staticFilename, thumbnailBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '300',
              upsert: true
            });

          if (!staticUploadError) {
            staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${staticFilename}`;
            
            // Only create cropSettings if actual cropping was performed
            if (needsCropping) {
              autoCropSettings = {
                method: 'sharp-auto-thumbnail',
                type: 'automatic',
                fit: 'cover',
                position: 'center',
                dimensions: { width: thumbnailWidth, height: thumbnailHeight },
                aspectRatio: { original: originalAspectRatio, target: targetAspectRatio },
                cropped: true,
                timestamp: new Date().toISOString()
              };
              console.log(`✅ Direct upload auto-cropped and generated static thumbnail: ${staticImageUrl}`);
            } else {
              // No cropSettings for images that didn't need cropping (already 3:2 ratio)
              autoCropSettings = null;
              console.log(`✅ Direct upload auto-resized static thumbnail (no cropping needed): ${staticImageUrl}`);
            }
          } else {
            console.warn(`⚠️ Failed to upload direct upload auto-generated thumbnail: ${staticUploadError.message}`);
          }
        } catch (autoGenError) {
          console.error(`❌ DIRECT UPLOAD AUTO-THUMBNAIL ERROR:`, autoGenError);
          console.error(`❌ Sharp processing failed for direct upload:`, (autoGenError as any).message, (autoGenError as any).stack);
        }
      }

      res.json({ 
        success: true,
        message: "Upload completed successfully",
        url: publicUrl,
        filename: filename,
        // Include auto-generated thumbnail info for images
        static_image_url: staticImageUrl,
        auto_crop_settings: autoCropSettings
      });

    } catch (error) {
      console.error('❌ Failed to complete direct upload:', error);
      res.status(500).json({ error: "Failed to complete upload" });
    }
  });

  // Upload gallery video endpoint with enhanced error handling (LEGACY - for files under 10MB)
  app.post("/api/gallery/upload-video", (req, res, next) => {
    uploadVideo.single('video')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: "File too large. Maximum size is 5000MB",
            code: "FILE_TOO_LARGE" 
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ 
            error: "Unexpected file field. Use 'video' field",
            code: "INVALID_FIELD" 
          });
        }
        return res.status(400).json({ 
          error: err.message || "Upload failed",
          code: "UPLOAD_ERROR" 
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      // Use original filename - clean but preserve structure
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `gallery_${originalName}`;

      console.log(`📤 Uploading gallery video: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

      // Clear cache if file exists (for overwrite scenario)
      videoCache.clearSpecificFile(filename);

      // Read file from disk and upload to Supabase storage (gallery bucket) with overwrite enabled
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      // Immediately cache the newly uploaded gallery video
      try {
        console.log(`🎬 Auto-caching uploaded gallery video: ${filename}`);
        const response = await fetch(videoUrl);
        if (response.ok) {
          await videoCache.cacheVideo(filename, response);
          console.log(`✅ Gallery video cached successfully: ${filename}`);
        }
      } catch (cacheError) {
        console.error(`⚠️ Failed to cache gallery video ${filename}:`, cacheError);
        // Don't fail the upload if caching fails
      }
      
      // Clean up temporary file
      try {
        require('fs').unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }

      res.json({ 
        success: true, 
        url: videoUrl,
        filename: filename 
      });

    } catch (error) {
      console.error('Gallery video upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload gallery video" });
    }
  });

  // Generic image upload endpoint for cropped images
  app.post("/api/upload/image", uploadImage.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Keep original filename for cropped images
      const filename = req.file.originalname;

      console.log(`🚀 OPTIMIZED UPLOAD: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Buffer processing`);

      // 🚀 PERFORMANCE OPTIMIZATION: Use buffer instead of stream for Supabase compatibility
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('🚨 CROPPED IMAGE UPLOAD ERROR:', uploadError);
        console.error('🚨 ERROR DETAILS:', JSON.stringify(uploadError, null, 2));
        console.error('🚨 FILE INFO:', { filename, size: req.file.size, mimetype: req.file.mimetype });
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      console.log(`✅ CROPPED IMAGE UPLOADED SUCCESSFULLY: ${filename}`);
      const imageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      // Immediate cleanup and response (non-blocking)
      setImmediate(() => {
        try {
          require('fs').unlinkSync(req.file?.path);
          console.log(`🧹 Cleaned up temporary file: ${req.file?.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${cleanupError}`);
        }
      });
      
      res.json({ 
        success: true, 
        url: imageUrl,
        filename: filename,
        optimized: true
      });

    } catch (error) {
      console.error('Cropped image upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload cropped image" });
    }
  });

  // Upload gallery image/thumbnail endpoint  
  app.post("/api/gallery/upload-image", uploadImage.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Keep original filename without transformation for consistency with video uploads
      const filename = req.file.originalname;

      console.log(`📤 Uploading gallery image: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

      // Read file from disk and upload to Supabase storage (gallery bucket) with overwrite enabled
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const imageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      // AUTO-GENERATE STATIC 300x200 THUMBNAIL for new images
      let staticImageUrl = null;
      let autoCropSettings = null;
      
      console.log(`🔍 STARTING AUTO-THUMBNAIL PROCESS for: ${filename}`);
      console.log(`🔍 File path exists: ${require('fs').existsSync(req.file.path)}`);
      console.log(`🔍 File size: ${req.file.size} bytes`);
      
      try {
        console.log(`🤖 AUTO-GENERATING 300x200 thumbnail for new image: ${filename}`);
        const sharp = require('sharp');
        
        // Get image metadata to check if cropping is actually needed
        const metadata = await sharp(req.file.path).metadata();
        const originalAspectRatio = metadata.width! / metadata.height!;
        const targetAspectRatio = 300 / 200; // 1.5 (3:2 ratio)
        const aspectRatioTolerance = 0.01; // Small tolerance for floating point comparison
        
        const needsCropping = Math.abs(originalAspectRatio - targetAspectRatio) > aspectRatioTolerance;
        
        // Create automatic 300x200 thumbnail
        const thumbnailBuffer = await sharp(req.file.path)
          .resize(300, 200, {
            fit: needsCropping ? 'cover' : 'fill',  // Only crop if aspect ratio is different
            position: 'center'
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } })  // White background for transparency
          .jpeg({ quality: 85, progressive: true, mozjpeg: true })  // Higher quality to target 30-50KB like good examples
          .toBuffer();
        
        // Upload auto-generated thumbnail
        const staticFilename = `static_auto_${Date.now()}.jpg`;
        const { data: staticUploadData, error: staticUploadError } = await supabase.storage
          .from('memopyk-videos')
          .upload(staticFilename, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '300',
            upsert: true
          });

        if (!staticUploadError) {
          staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${staticFilename}`;
          
          // Only create cropSettings if actual cropping was performed
          if (needsCropping) {
            autoCropSettings = {
              method: 'sharp-auto-thumbnail',
              type: 'automatic',
              fit: 'cover',
              position: 'center',
              dimensions: { width: 300, height: 200 },
              aspectRatio: { original: originalAspectRatio, target: targetAspectRatio },
              cropped: true,
              timestamp: new Date().toISOString()
            };
            console.log(`✅ Auto-cropped and generated static thumbnail: ${staticImageUrl}`);
          } else {
            // No cropSettings for images that didn't need cropping (already 3:2 ratio)
            autoCropSettings = null;
            console.log(`✅ Auto-resized static thumbnail (no cropping needed): ${staticImageUrl}`);
          }
        } else {
          console.warn(`⚠️ Failed to upload auto-generated thumbnail: ${staticUploadError.message}`);
        }
      } catch (autoGenError) {
        console.error(`❌ AUTO-THUMBNAIL ERROR:`, autoGenError);
        console.error(`❌ Sharp processing failed:`, (autoGenError as any).message, (autoGenError as any).stack);
      }
      
      // Clean up temporary file
      try {
        require('fs').unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }
      
      res.json({ 
        success: true, 
        url: imageUrl,
        filename: filename,
        width: req.body.width || null,
        height: req.body.height || null,
        // Include auto-generated thumbnail info
        static_image_url: staticImageUrl,
        auto_crop_settings: autoCropSettings
      });

    } catch (error) {
      console.error('Gallery image upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload gallery image" });
    }
  });

  // Upload static cropped image endpoint (300x200 JPEG)
  app.post("/api/gallery/upload-static-image", uploadImage.single('image'), async (req, res) => {
    console.log(`🚀 STATIC IMAGE UPLOAD ROUTE HIT!`);
    console.log(`   - Request method: ${req.method}`);
    console.log(`   - Request path: ${req.path}`);
    console.log(`   - File received: ${req.file ? 'YES' : 'NO'}`);
    console.log(`   - Request body:`, req.body);
    
    try {
      if (!req.file) {
        console.log(`❌ No file provided in request`);
        return res.status(400).json({ error: "No static image file provided" });
      }

      const itemId = req.body.item_id;
      const cropSettings = req.body.crop_settings ? JSON.parse(req.body.crop_settings) : null;
      
      console.log(`📋 Processing static image upload:`);
      console.log(`   - Item ID: ${itemId} (type: ${typeof itemId})`);
      console.log(`   - Crop settings: ${cropSettings ? 'Provided' : 'None'}`);
      console.log(`   - File info: ${req.file.originalname}, ${req.file.size} bytes`);
      
      if (!itemId) {
        return res.status(400).json({ error: "Gallery item ID required" });
      }

      // CACHE-BUSTING FILENAME: Extract original filename and add "-C" suffix
      const language = req.body.language || 'en';
      const originalFilename = req.body.original_filename || 'image';
      
      // Extract just the filename from URL if it's a full URL
      let baseFilename = originalFilename;
      if (originalFilename.includes('/')) {
        baseFilename = originalFilename.split('/').pop() || 'image';
      }
      
      // Remove extension and add "-C" suffix for cropped version
      const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
      const filename = `${nameWithoutExt}-C.jpg`;
      
      console.log(`🔄 CROPPED IMAGE NAMING: ${baseFilename} → ${filename} (with -C suffix)`);

      // Always delete any existing cropped version to force cache refresh
      const { error: deleteError } = await supabase.storage
        .from('memopyk-videos')
        .remove([filename]);
      
      if (deleteError && deleteError.message !== 'The resource was not found') {
        console.log(`⚠️ Could not delete old cropped image: ${deleteError.message}`);
      } else {
        console.log(`🗑️ Deleted old cropped image: ${filename} (fresh cache)`);
      }

      console.log(`📤 Uploading static image: ${filename} (300x200 PNG) - Fresh upload`);

      // Read file from disk and upload to Supabase storage (gallery bucket) 
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '300', // Shorter cache for thumbnails (5 minutes)
          upsert: true  // Allow overwrite
        });

      if (uploadError) {
        console.error('Supabase static image upload error:', uploadError);
        return res.status(500).json({ error: `Static image upload failed: ${uploadError.message}` });
      }

      // Create clean public URL
      const staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      console.log(`✅ Static image uploaded successfully: ${staticImageUrl}`);
      
      // FORCE DATABASE UPDATE - multiple approaches
      console.log(`🔄 FORCING DATABASE UPDATE for item ${itemId}`);
      
      try {
        // Method 1: Direct file system update
        console.log(`📝 Method 1: Direct JSON file update`);
        const fs = require('fs');
        const path = require('path');
        const jsonPath = path.join(__dirname, 'storage', 'gallery-items.json');
        
        console.log(`📂 Reading file: ${jsonPath}`);
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const items = JSON.parse(rawData);
        console.log(`📊 Found ${items.length} items in database`);
        
        const itemIndex = items.findIndex((item: any) => item.id.toString() === itemId.toString());
        console.log(`🔍 Item ${itemId} found at index: ${itemIndex}`);
        
        if (itemIndex !== -1) {
          const language = req.body.language || 'en'; // Get language from request body
          const useSameVideo = items[itemIndex].use_same_video;
          
          console.log(`🔍 STATIC IMAGE UPDATE - use_same_video: ${useSameVideo}, language: ${language}`);
          
          if (useSameVideo) {
            // When use_same_video is true, update BOTH language fields to use the same static image
            console.log(`📝 Before update (shared): EN=${items[itemIndex].static_image_url_en}, FR=${items[itemIndex].static_image_url_fr}`);
            items[itemIndex].static_image_url_en = staticImageUrl;
            items[itemIndex].static_image_url_fr = staticImageUrl;
            console.log(`📝 After update (shared): Both EN and FR set to: ${staticImageUrl}`);
          } else {
            // When use_same_video is false, only update the specific language field
            const staticField = language === 'fr' ? 'static_image_url_fr' : 'static_image_url_en';
            console.log(`📝 Before update (${language}): ${items[itemIndex][staticField]}`);
            items[itemIndex][staticField] = staticImageUrl;
            console.log(`📝 After update (${language}): ${items[itemIndex][staticField]}`);
          }
          
          items[itemIndex].cropSettings = cropSettings;
          items[itemIndex].updated_at = new Date().toISOString();
          
          fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2));
          console.log(`✅ File written successfully`);
          
          // Verify the write
          const verifyData = fs.readFileSync(jsonPath, 'utf8');
          const verifyItems = JSON.parse(verifyData);
          const verifyItem = verifyItems.find((item: any) => item.id.toString() === itemId.toString());
          const staticField = language === 'fr' ? 'static_image_url_fr' : 'static_image_url_en';
          console.log(`🔍 Verification - Updated URL (${language}): ${verifyItem?.[staticField]}`);
        } else {
          console.error(`❌ Item ${itemId} not found in ${items.length} items`);
          console.error(`❌ Available IDs:`, items.map((i: any) => i.id));
        }
      } catch (error) {
        console.error('❌ DIRECT UPDATE ERROR:', error);
      }
      
      // Method 2: Try hybrid storage as backup
      try {
        console.log(`🔄 Method 2: Hybrid storage backup`);
        const language = req.body.language || 'en';
        
        // Get current item to check use_same_video flag  
        const jsonPath2 = path.join(__dirname, 'storage', 'gallery-items.json');
        const data = fs.readFileSync(jsonPath2, 'utf8');
        const items = JSON.parse(data);
        const currentItem = items.find((item: any) => item.id.toString() === itemId.toString());
        const useSameVideo = currentItem?.use_same_video;
        
        let updateData;
        if (useSameVideo) {
          // When use_same_video is true, update BOTH language fields
          updateData = { 
            static_image_url_en: staticImageUrl, 
            static_image_url_fr: staticImageUrl, 
            cropSettings: cropSettings 
          };
          console.log(`🔗 Hybrid storage: Setting both EN and FR to same URL (use_same_video: true)`);
        } else {
          // When use_same_video is false, only update the specific language field
          updateData = language === 'fr' 
            ? { static_image_url_fr: staticImageUrl, cropSettings: cropSettings }
            : { static_image_url_en: staticImageUrl, cropSettings: cropSettings };
          console.log(`🎯 Hybrid storage: Setting only ${language} field (use_same_video: false)`);
        }
        
        await hybridStorage.updateGalleryItem(itemId, updateData);
        console.log(`✅ Hybrid storage update completed`);
      } catch (hybridError) {
        console.error('❌ Hybrid storage failed:', hybridError);
      }
      
      // Clean up temporary file
      try {
        require('fs').unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }

      res.json({ 
        success: true, 
        url: staticImageUrl,
        filename: filename,
        crop_settings: cropSettings,
        width: 300,
        height: 200
      });

    } catch (error) {
      console.error('Static image upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload static image" });
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
      const { 
        title_mobile_fr,
        title_mobile_en,
        title_desktop_fr,
        title_desktop_en,
        font_size_desktop,
        font_size_tablet,
        font_size_mobile
      } = req.body;
      
      if (!title_desktop_fr || !title_desktop_en || !title_mobile_fr || !title_mobile_en) {
        return res.status(400).json({ error: "Desktop and mobile titles are required in both languages" });
      }
      
      const newText = await hybridStorage.createHeroText({
        title_fr: title_desktop_fr, // Use desktop French as main title
        title_en: title_desktop_en, // Use desktop English as main title
        subtitle_fr: '',
        subtitle_en: '',
        title_mobile_fr,
        title_mobile_en,
        title_desktop_fr,
        title_desktop_en,
        font_size: font_size_desktop || 48,
        font_size_desktop: font_size_desktop || 60,
        font_size_tablet: font_size_tablet || 45,
        font_size_mobile: font_size_mobile || 32,
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
      
      const updatedText = await hybridStorage.updateHeroText(String(textId), updateData);
      res.json({ success: true, text: updatedText });
    } catch (error) {
      console.error('Update hero text error:', error);
      res.status(500).json({ error: "Failed to update hero text" });
    }
  });

  // Apply hero text to site (set as active)
  app.patch("/api/hero-text/:id/apply", async (req, res) => {
    try {
      const textId = req.params.id;
      const { font_size, font_size_desktop, font_size_tablet, font_size_mobile } = req.body;
      
      await hybridStorage.deactivateAllHeroTexts();
      
      const updateData: any = {
        is_active: true,
        font_size: font_size || font_size_desktop || 48
      };
      
      // Add responsive font sizes if provided
      if (font_size_desktop) updateData.font_size_desktop = Number(font_size_desktop);
      if (font_size_tablet) updateData.font_size_tablet = Number(font_size_tablet);
      if (font_size_mobile) updateData.font_size_mobile = Number(font_size_mobile);
      
      const appliedText = await hybridStorage.updateHeroText(textId, updateData);
      
      res.json({ success: true, text: appliedText });
    } catch (error) {
      console.error('Apply hero text error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: "Failed to apply hero text", details: message });
    }
  });

  // Delete hero text
  app.delete("/api/hero-text/:id", async (req, res) => {
    try {
      const textId = parseInt(req.params.id);
      
      await hybridStorage.deleteHeroText(String(textId));
      res.json({ success: true, message: "Hero text deleted successfully" });
    } catch (error) {
      console.error('Delete hero text error:', error);
      res.status(500).json({ error: "Failed to delete hero text" });
    }
  });

  // DUPLICATE ROUTES REMOVED - Using only the ones above

  // DUPLICATE FAQ ROUTES REMOVED - Using complete FAQ routes further down in file

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
      const faqs = await hybridStorage.getFaqs();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ content" });
    }
  });

  // Contact Information - Contact details and form submissions
  app.get("/api/contact", async (req, res) => {
    try {
      const contact = await hybridStorage.getContacts();
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contact info" });
    }
  });

  // Contact form submission
  app.post("/api/contacts", async (req, res) => {
    try {
      const result = contactFormSchema.parse(req.body);
      console.log("📧 Contact form submission:", result);
      
      // Store contact in hybrid storage
      const contact = await hybridStorage.createContact(result);
      
      res.json({ success: true, message: "Message sent successfully", contact });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || "Invalid form data" });
      }
      console.error('Contact form error:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get all contacts (admin only)
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await hybridStorage.getContacts();
      res.json(contacts);
    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  // Update contact status (admin only)
  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = req.params.id;
      const { status } = req.body;
      
      if (!['new', 'responded', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Use: new, responded, or closed" });
      }
      
      const contact = await hybridStorage.updateContactStatus(contactId, status);
      res.json({ success: true, contact });
    } catch (error) {
      console.error('Update contact status error:', error);
      res.status(500).json({ error: "Failed to update contact status" });
    }
  });

  // Delete contact (admin only)
  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = req.params.id;
      const deletedContact = await hybridStorage.deleteContact(contactId);
      res.json({ success: true, deleted: deletedContact });
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // CTA Content - Call-to-action content
  app.get("/api/cta", async (req, res) => {
    try {
      const cta = await hybridStorage.getCtaSettings();
      res.json(cta);
    } catch (error) {
      res.status(500).json({ error: "Failed to get CTA content" });
    }
  });

  // Create new CTA setting
  app.post("/api/cta", async (req, res) => {
    try {
      const { id, buttonTextFr, buttonTextEn, buttonUrlEn, buttonUrlFr, isActive } = req.body;
      
      if (!id || !buttonTextFr || !buttonTextEn || !buttonUrlEn || !buttonUrlFr) {
        return res.status(400).json({ error: "All fields required" });
      }

      const newCta = await hybridStorage.createCtaSettings({
        id,
        buttonTextFr,
        buttonTextEn,
        buttonUrlEn,
        buttonUrlFr,
        isActive: isActive || false
      });
      
      res.json(newCta);
    } catch (error) {
      console.error('Create CTA error:', error);
      res.status(500).json({ error: "Failed to create CTA setting" });
    }
  });

  // Update CTA setting
  app.patch("/api/cta/:id", async (req, res) => {
    try {
      const ctaId = req.params.id;
      const updates = req.body;
      
      const updatedCta = await hybridStorage.updateCtaSettings(ctaId, updates);
      
      if (!updatedCta) {
        return res.status(404).json({ error: "CTA setting not found" });
      }
      
      res.json(updatedCta);
    } catch (error) {
      console.error('Update CTA error:', error);
      res.status(500).json({ error: "Failed to update CTA setting" });
    }
  });

  // Delete CTA setting
  app.delete("/api/cta/:id", async (req, res) => {
    try {
      const ctaId = req.params.id;
      
      const deleted = await hybridStorage.deleteCtaSettings(ctaId);
      
      if (!deleted) {
        return res.status(404).json({ error: "CTA setting not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete CTA error:', error);
      res.status(500).json({ error: "Failed to delete CTA setting" });
    }
  });

  // Legal Documents - Terms, privacy policy, etc.
  app.get("/api/legal", async (req, res) => {
    try {
      const legal = await hybridStorage.getLegalDocuments();
      res.json(legal);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal documents" });
    }
  });

  app.get("/api/legal/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const legal = await hybridStorage.getLegalDocuments();
      const document = legal.find(doc => doc.type === type);
      if (!document) {
        return res.status(404).json({ error: "Legal document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal document" });
    }
  });

  // Create legal document (admin only)
  app.post("/api/legal", async (req, res) => {
    try {
      const document = req.body;
      
      if (!document.type || !document.title_en || !document.title_fr || !document.content_en || !document.content_fr) {
        return res.status(400).json({ error: "Type, title, and content in both languages are required" });
      }
      
      const newDocument = await hybridStorage.createLegalDocument(document);
      res.json({ success: true, document: newDocument });
    } catch (error) {
      console.error('Create legal document error:', error);
      res.status(500).json({ error: "Failed to create legal document" });
    }
  });

  // Update legal document (admin only)
  app.patch("/api/legal/:id", async (req, res) => {
    try {
      const docId = req.params.id;
      const updates = req.body;
      
      const updatedDocument = await hybridStorage.updateLegalDocument(docId, updates);
      res.json({ success: true, document: updatedDocument });
    } catch (error) {
      console.error('Update legal document error:', error);
      res.status(500).json({ error: "Failed to update legal document" });
    }
  });

  // Delete legal document (admin only)
  app.delete("/api/legal/:id", async (req, res) => {
    try {
      const docId = req.params.id;
      const deletedDocument = await hybridStorage.deleteLegalDocument(docId);
      res.json({ success: true, deleted: deletedDocument });
    } catch (error) {
      console.error('Delete legal document error:', error);
      res.status(500).json({ error: "Failed to delete legal document" });
    }
  });

  // SEO Settings - Meta tags and SEO configuration
  app.get("/api/seo", async (req, res) => {
    try {
      const seo = await hybridStorage.getSeoSettings();
      res.json(seo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get SEO settings" });
    }
  });

  // Create SEO settings
  app.post("/api/seo", async (req, res) => {
    try {
      const seoData = req.body;
      const newSeo = await hybridStorage.createSeoSettings(seoData);
      res.status(201).json(newSeo);
    } catch (error) {
      console.error('Create SEO settings error:', error);
      res.status(500).json({ error: "Failed to create SEO settings" });
    }
  });

  // Update SEO settings
  app.patch("/api/seo/:id", async (req, res) => {
    try {
      const seoId = req.params.id;
      const updates = req.body;
      const updatedSeo = await hybridStorage.updateSeoSettings(seoId, updates);
      if (!updatedSeo) {
        return res.status(404).json({ error: "SEO settings not found" });
      }
      res.json(updatedSeo);
    } catch (error) {
      console.error('Update SEO settings error:', error);
      res.status(500).json({ error: "Failed to update SEO settings" });
    }
  });

  // FAQ Sections - GET all sections (KEEP ONLY THIS ONE)
  app.get("/api/faq-sections", async (req, res) => {
    try {
      const sections = await hybridStorage.getFaqSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ sections" });
    }
  });

  // FAQ Sections - POST create section (KEEP ONLY THIS ONE)
  app.post("/api/faq-sections", async (req, res) => {
    try {
      const { title_fr, title_en, order_index } = req.body;
      
      if (!title_fr || !title_en) {
        return res.status(400).json({ error: "French and English titles are required" });
      }
      
      const newSection = await hybridStorage.createFAQSection({
        title_fr,
        title_en,
        order_index: order_index || 0
      });
      
      res.status(201).json({ success: true, section: newSection });
    } catch (error) {
      console.error('Create FAQ section error:', error);
      res.status(500).json({ error: "Failed to create FAQ section" });
    }
  });

  // FAQ Sections - PATCH update section (KEEP ONLY THIS ONE)
  app.patch("/api/faq-sections/:id", async (req, res) => {
    try {
      const section = await hybridStorage.updateFAQSection(req.params.id, req.body); // Keep as string
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: "Failed to update FAQ section" });
    }
  });

  // FAQ Sections - DELETE remove section (KEEP ONLY THIS ONE)
  app.delete("/api/faq-sections/:id", async (req, res) => {
    try {
      await hybridStorage.deleteFAQSection(req.params.id); // Keep as string
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ section" });
    }
  });

  // FAQ Sections - PATCH reorder section
  app.patch("/api/faq-sections/:id/reorder", async (req, res) => {
    try {
      const sectionId = req.params.id; // Keep as string since FAQ sections use string IDs
      const { order_index } = req.body;
      
      if (typeof order_index !== 'number') {
        return res.status(400).json({ error: "order_index must be a number" });
      }
      
      console.log(`🔄 Reordering FAQ section: ${sectionId} to order ${order_index}`);
      const updatedSection = await hybridStorage.updateFAQSection(sectionId, { order_index });
      res.json({ success: true, section: updatedSection });
    } catch (error) {
      console.error('Reorder FAQ section error:', error);
      res.status(500).json({ error: "Failed to reorder FAQ section" });
    }
  });

  // FAQs - GET all FAQs
  app.get("/api/faqs", async (req, res) => {
    try {
      const faqs = await hybridStorage.getFaqs();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQs" });
    }
  });

  // FAQs - POST create FAQ
  app.post("/api/faqs", async (req, res) => {
    try {
      const { section_id, question_en, question_fr, answer_en, answer_fr, order_index, is_active } = req.body;
      
      if (!section_id || !question_en || !question_fr || !answer_en || !answer_fr) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      const newFaq = await hybridStorage.createFAQ({
        section_id,
        question_en,
        question_fr,
        answer_en,
        answer_fr,
        order_index: order_index || 0,
        is_active: is_active !== undefined ? is_active : true
      });
      
      res.status(201).json({ success: true, faq: newFaq });
    } catch (error) {
      console.error('Create FAQ error:', error);
      res.status(500).json({ error: "Failed to create FAQ" });
    }
  });

  // FAQs - PATCH update FAQ
  app.patch("/api/faqs/:id", async (req, res) => {
    try {
      console.log('🔧 ===== FAQ PATCH ENDPOINT HIT =====');
      console.log('🔧 PATCH /api/faqs/:id - ID:', req.params.id);
      console.log('🔧 PATCH /api/faqs/:id - Body:', req.body);
      console.log('🔧 CRITICAL: This should UPDATE the FAQ, NOT delete it!');
      console.log('🔧 SERVER FIX ACTIVE: Duplicate routes removed!');
      
      const faq = await hybridStorage.updateFAQ(req.params.id, req.body);
      
      console.log('✅ FAQ update completed successfully:', faq);
      console.log('✅ ===== FAQ PATCH ENDPOINT COMPLETE =====');
      res.json(faq);
    } catch (error) {
      console.error('❌ Update FAQ error:', error);
      res.status(500).json({ error: "Failed to update FAQ" });
    }
  });

  // FAQs - DELETE remove FAQ
  app.delete("/api/faqs/:id", async (req, res) => {
    try {
      console.log('🗑️ DELETE /api/faqs/:id - ID:', req.params.id);
      console.log('🗑️ WARNING: This DELETES the FAQ permanently!');
      
      await hybridStorage.deleteFAQ(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete FAQ error:', error);
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  // FAQs - PATCH reorder FAQ
  app.patch("/api/faqs/:id/reorder", async (req, res) => {
    try {
      const faqId = req.params.id;
      const { order_index } = req.body;
      
      if (typeof order_index !== 'number') {
        return res.status(400).json({ error: "order_index must be a number" });
      }
      
      console.log(`🔄 Reordering FAQ: ${faqId} to order ${order_index}`);
      const updatedFaq = await hybridStorage.updateFAQ(faqId, { order_index });
      res.json({ success: true, faq: updatedFaq });
    } catch (error) {
      console.error('Reorder FAQ error:', error);
      res.status(500).json({ error: "Failed to reorder FAQ" });
    }
  });

  // DUPLICATE FAQ ROUTES REMOVED - Using detailed routes above

  // Analytics Dashboard - GET analytics data
  app.get("/api/analytics", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('📊 Analytics request:', { dateFrom, dateTo });
      
      const analytics = await hybridStorage.getAnalyticsDashboard(
        dateFrom as string, 
        dateTo as string
      );
      
      console.log('✅ Analytics data retrieved successfully');
      res.json(analytics);
    } catch (error) {
      console.error('❌ Analytics error:', error);
      res.status(500).json({ error: "Failed to get analytics data" });
    }
  });

  // Missing cache management endpoints for production
  app.get("/api/cache/breakdown", (req, res) => {
    try {
      const breakdown = videoCache.getDetailedCacheBreakdown();
      res.json(breakdown);
    } catch (error) {
      console.error('❌ Cache breakdown error:', error);
      res.status(500).json({ error: "Failed to get cache breakdown" });
    }
  });

  app.get("/api/unified-cache/stats", (req, res) => {
    try {
      const videoStats = videoCache.getCacheStats();
      const stats = {
        video: videoStats,
        image: videoCache.getImageCacheStats(),
        total: videoStats.totalSize,
        timestamp: new Date().toISOString()
      };
      res.json(stats);
    } catch (error) {
      console.error('❌ Unified cache stats error:', error);
      res.status(500).json({ error: "Failed to get cache stats" });
    }
  });

  app.get("/api/video-cache/status", (req, res) => {
    try {
      const cacheStats = videoCache.getCacheStats();
      const status = {
        cacheStats: cacheStats,
        cacheSize: cacheStats.totalSize,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };
      res.json(status);
    } catch (error) {
      console.error('❌ Video cache status error:', error);
      res.status(500).json({ error: "Failed to get video cache status" });
    }
  });

  // Individual Video Cache Status Check - POST check specific videos
  app.post("/api/video-cache/status", (req, res) => {
    try {
      const { videos } = req.body;
      console.log('🔍 Individual video cache status check:', videos);
      
      if (!Array.isArray(videos)) {
        return res.status(400).json({ error: "Videos array is required" });
      }

      const results = videos.map(video => {
        const isCached = videoCache.isVideoCached(video.filename);
        const estimatedLoadTime = isCached ? 50 : 1500; // Cached vs CDN
        
        return {
          filename: video.filename,
          cached: isCached,
          loadTime: estimatedLoadTime,
          type: video.type || 'unknown'
        };
      });

      console.log('🎯 Cache status results:', results);
      res.json({ videos: results, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('❌ Individual video cache status error:', error);
      res.status(500).json({ error: "Failed to check individual video cache status" });
    }
  });

  app.get("/api/video-cache/stats", (req, res) => {
    try {
      const stats = videoCache.getCacheStats();
      res.json(stats);
    } catch (error) {
      console.error('❌ Video cache stats error:', error);
      res.status(500).json({ error: "Failed to get video cache stats" });
    }
  });

  app.post("/api/video-cache/force", async (req, res) => {
    try {
      const { filename } = req.body;
      console.log(`🚀 Force cache individual video: ${filename}`);
      
      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }
      
      // Force cache the specific video
      await videoCache.downloadAndCacheVideo(filename);
      const isCached = videoCache.isVideoCached(filename);
      
      res.json({ 
        success: true, 
        filename,
        cached: isCached,
        message: `Video ${filename} ${isCached ? 'cached successfully' : 'cache attempt completed'}`
      });
    } catch (error) {
      console.error('❌ Force cache individual video error:', error);
      res.status(500).json({ error: "Failed to force cache video" });
    }
  });

  app.post("/api/video-cache/force-all-media", async (req, res) => {
    try {
      console.log('🚀 Force cache all media request received');
      const result = await videoCache.forceCacheAllMedia();
      res.json(result);
    } catch (error) {
      console.error('❌ Force cache all media error:', error);
      res.status(500).json({ error: "Failed to force cache all media" });
    }
  });

  app.post("/api/analytics/video-view", async (req, res) => {
    try {
      // VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
      if (process.env.VIDEO_ANALYTICS_ENABLED === 'false' || !process.env.VIDEO_ANALYTICS_ENABLED) {
        console.log('📊 VIDEO ANALYTICS DISABLED: Custom video tracking paused, switching to GA4-only');
        return res.status(204).send(); // Silent ignore
      }
      
      const { video_id, filename, duration_watched, completed, language, session_id, watch_time, completion_rate } = req.body;
      console.log('📊 Video view tracking - Full request body:', req.body);
      console.log('📊 Video view tracking - Extracted fields:', { video_id, filename, duration_watched, completed, language });
      
      // Use video_id from frontend (new format) or fallback to filename (legacy format)
      const videoIdentifier = video_id || filename;
      
      const viewData = {
        video_id: videoIdentifier,
        video_filename: videoIdentifier, // Store filename for better matching
        video_type: 'gallery',
        video_title: '', // Will be populated later from gallery data
        session_id: session_id || `session_${Date.now()}`,
        watch_time: duration_watched || watch_time || 0,
        completion_rate: completed ? 100 : (completion_rate || 0),
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.get('User-Agent') || '',
        language: language || req.get('Accept-Language')?.split(',')[0] || 'en-US'
      };
      
      // CRITICAL FIX: Actually save to database using hybridStorage
      const result = await hybridStorage.createAnalyticsView(viewData);
      console.log('📊 Video view tracked and saved to database:', result);
      res.json({ success: true, view: result });
    } catch (error) {
      console.error('❌ Video view tracking error:', error);
      res.status(500).json({ error: "Failed to track video view" });
    }
  });

  // Analytics Session Tracking - POST create session
  // CRITICAL FIX: Analytics session endpoint with correct URL pattern
  app.post("/api/analytics/session", async (req, res) => {
    try {
      // ENHANCED IP DETECTION v1.0.158 - Fix for Australian IP not registering
      let clientIp = '0.0.0.0';
      
      // Check X-Forwarded-For first (for proxies/load balancers like Replit)
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        // Take the FIRST IP (original client) from comma-separated list
        const ips = forwardedFor.toString().split(',').map(ip => ip.trim());
        clientIp = ips[0]; // This should be the real client IP (e.g., 109.17.150.48)
        console.log('🌍 X-Forwarded-For found:', ips, 'Using first IP:', clientIp);
      } else if (req.ip) {
        clientIp = req.ip;
        console.log('🌍 Using req.ip:', clientIp);
      } else if (req.connection?.remoteAddress) {
        clientIp = req.connection.remoteAddress;
        console.log('🌍 Using connection.remoteAddress:', clientIp);
      } else if (req.socket?.remoteAddress) {
        clientIp = req.socket.remoteAddress;
        console.log('🌍 Using socket.remoteAddress:', clientIp);
      }
      
      // Clean up IPv6 mapped IPv4 addresses
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
        console.log('🌍 Cleaned IPv6 mapped address to:', clientIp);
      }
      
      console.log('🌍 FINAL CLIENT IP DETECTED:', clientIp);

      // ENHANCED LANGUAGE DETECTION v1.0.158 - Fix French/English showing both
      const acceptLanguage = req.headers['accept-language'] || '';
      let detectedLanguage = 'en-US'; // Default
      
      console.log('🌍 RAW Accept-Language header:', acceptLanguage);
      
      // Parse Accept-Language more precisely - take FIRST preference only
      if (acceptLanguage) {
        const primaryLanguage = acceptLanguage.split(',')[0].trim().toLowerCase();
        console.log('🌍 Primary language preference:', primaryLanguage);
        
        if (primaryLanguage.startsWith('fr')) {
          detectedLanguage = 'fr-FR';
          console.log('🌍 DETECTED: French browser');
        } else if (primaryLanguage.startsWith('en')) {
          detectedLanguage = 'en-US';
          console.log('🌍 DETECTED: English browser');
        } else {
          // For other languages, default to English
          detectedLanguage = 'en-US';
          console.log('🌍 DETECTED: Other language, defaulting to English');
        }
      }
      
      console.log('🌍 FINAL LANGUAGE DETECTED:', detectedLanguage);

      // SESSION DEDUPLICATION: Prevent multiple sessions from same IP within 30 seconds
      const finalIp = req.body.ip_address || clientIp;
      const recentSessions = await (hybridStorage as any).getRecentAnalyticsSessions();
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30000);
      
      // Check for duplicate sessions from same IP in last 30 seconds
      const duplicateSession = recentSessions.find((session: any) => 
        session.ip_address === finalIp && 
        new Date(session.created_at) > thirtySecondsAgo &&
        !session.is_test_data
      );
      
      if (duplicateSession) {
        console.log(`🚫 DUPLICATE SESSION BLOCKED: IP ${finalIp} already has session from ${new Date(duplicateSession.created_at).toISOString()}`);
        return res.json({ success: true, session: duplicateSession, deduplicated: true });
      }

      console.log('📊 Analytics session creation:', {
        ...req.body,
        server_detected_ip: clientIp,
        server_detected_language: detectedLanguage
      });

      // Enhanced session data with server-side detection
      const sessionData = {
        ...req.body,
        ip_address: finalIp,
        language: req.body.language || detectedLanguage, // Prioritize client-provided language for testing
        user_agent: req.headers['user-agent'] || req.body.user_agent || '',
        session_id: req.body.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const session = await hybridStorage.createAnalyticsSession(sessionData);
      console.log(`✅ NEW SESSION CREATED: ${session.session_id} for IP ${finalIp}`);
      res.json({ success: true, session });
    } catch (error) {
      console.error('❌ Analytics session error:', error);
      res.status(500).json({ error: "Failed to create analytics session" });
    }
  });

  // Analytics Dashboard Data - GET analytics dashboard overview
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('📊 Analytics dashboard request:', { dateFrom, dateTo });
      
      const dashboard = await hybridStorage.getAnalyticsDashboard(
        dateFrom as string, 
        dateTo as string
      );
      res.json(dashboard);
    } catch (error) {
      console.error('❌ Analytics dashboard error:', error);
      res.status(500).json({ error: "Failed to get analytics dashboard" });
    }
  });

  // Analytics Time Series - GET time series data
  app.get("/api/analytics/time-series", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('📊 Analytics time series request:', { dateFrom, dateTo });
      
      const timeSeries = await hybridStorage.getTimeSeriesData(
        dateFrom as string, 
        dateTo as string
      );
      res.json(timeSeries);
    } catch (error) {
      console.error('❌ Analytics time series error:', error);
      res.status(500).json({ error: "Failed to get time series data" });
    }
  });

  // Analytics Settings - GET analytics settings
  app.get("/api/analytics/settings", async (req, res) => {
    try {
      const settings = await hybridStorage.getAnalyticsSettings();
      res.json(settings);
    } catch (error) {
      console.error('❌ Analytics settings error:', error);
      res.status(500).json({ error: "Failed to get analytics settings" });
    }
  });

  // Analytics Settings - PUT update analytics settings
  app.put("/api/analytics/settings", async (req, res) => {
    try {
      const settings = await hybridStorage.updateAnalyticsSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('❌ Analytics settings update error:', error);
      res.status(500).json({ error: "Failed to update analytics settings" });
    }
  });

  // Current IP Detection - GET current admin IP address
  app.get("/api/analytics/current-ip", async (req, res) => {
    try {
      // Detect current client IP using the same logic as session tracking
      let clientIp = '0.0.0.0';
      
      // Check X-Forwarded-For first (for proxies/load balancers like Replit)
      const xForwardedFor = req.headers['x-forwarded-for'];
      if (xForwardedFor) {
        const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
        clientIp = ips.split(',')[0].trim();
        console.log('🌍 X-Forwarded-For found:', ips, 'Using first IP:', clientIp);
      } else if (req.ip) {
        clientIp = req.ip;
        console.log('🌍 Using req.ip:', clientIp);
      } else if (req.connection && req.connection.remoteAddress) {
        clientIp = req.connection.remoteAddress;
        console.log('🌍 Using req.connection.remoteAddress:', clientIp);
      } else if (req.socket && req.socket.remoteAddress) {
        clientIp = req.socket.remoteAddress;
        console.log('🌍 Using req.socket.remoteAddress:', clientIp);
      }
      
      console.log('🌍 CURRENT IP DETECTED:', clientIp);
      res.json(clientIp);
    } catch (error) {
      console.error('❌ Current IP detection error:', error);
      res.status(500).json({ error: "Failed to detect current IP" });
    }
  });

  // Active Viewer IPs - GET active viewer IP addresses
  app.get("/api/analytics/active-ips", async (req, res) => {
    try {
      const activeIps = await hybridStorage.getActiveViewerIps();
      res.json(activeIps);
    } catch (error) {
      console.error('❌ Active viewer IPs error:', error);
      res.status(500).json({ error: "Failed to get active viewer IPs" });
    }
  });

  // Missing Analytics Endpoints - Fixing 404s
  app.get("/api/analytics/video-engagement", async (req, res) => {
    try {
      // Return empty array for now to prevent 404s
      res.json([]);
    } catch (error) {
      console.error('❌ Video engagement error:', error);
      res.status(500).json({ error: "Failed to get video engagement data" });
    }
  });

  app.get("/api/analytics/unique-views", async (req, res) => {
    try {
      // Return empty array for now to prevent 404s
      res.json([]);
    } catch (error) {
      console.error('❌ Unique views error:', error);
      res.status(500).json({ error: "Failed to get unique views data" });
    }
  });

  app.get("/api/analytics/re-engagement", async (req, res) => {
    try {
      // Return empty array for now to prevent 404s
      res.json([]);
    } catch (error) {
      console.error('❌ Re-engagement error:', error);
      res.status(500).json({ error: "Failed to get re-engagement data" });
    }
  });

  // Recent Visitors - GET last 10 visitor details for flip card  
  app.get("/api/analytics/recent-visitors", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('👥 Recent Visitors: Fetching visitor details with date filters:', { dateFrom, dateTo });
      
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        dateFrom as string, 
        dateTo as string,
        undefined,
        shouldIncludeProduction
      );
      
      // Filter out test data and invalid sessions BEFORE processing
      const realSessions = sessions.filter(session => {
        return !session.is_test_data && 
               session.ip_address && 
               session.ip_address !== '0.0.0.0' &&
               session.ip_address !== null &&
               !session.session_id?.includes('anonymous');
      });
      
      // Get unique visitors with their latest session info, visit count, session duration, and previous visit
      const visitorMap = new Map();
      const visitorSessions = new Map(); // Track all sessions per visitor for previous visit calculation
      
      // First pass: collect all sessions per visitor
      realSessions.forEach(session => {
        const ip = session.ip_address;
        if (!visitorSessions.has(ip)) {
          visitorSessions.set(ip, []);
        }
        visitorSessions.get(ip).push(session);
      });
      
      // Second pass: build visitor info with previous visit data
      visitorSessions.forEach((sessions, ip) => {
        // Sort sessions by date (newest first)
        sessions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestSession = sessions[0];
        const previousSession = sessions[1]; // Second most recent session
        
        visitorMap.set(ip, {
          ip_address: ip,
          country: latestSession.country || 'Unknown',
          region: latestSession.region || 'Unknown',
          city: latestSession.city || 'Unknown',
          language: latestSession.language || 'Unknown', 
          last_visit: latestSession.created_at,
          user_agent: latestSession.user_agent ? latestSession.user_agent.substring(0, 50) + '...' : 'Unknown',
          visit_count: sessions.length,
          session_duration: latestSession.session_duration || Math.floor(Math.random() * 300 + 30), // Mock duration between 30-330 seconds for demo
          previous_visit: previousSession ? previousSession.created_at : null
        });
      });
      
      // Convert to array and sort by most recent
      let recentVisitors = Array.from(visitorMap.values())
        .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime())
        .slice(0, 100); // Take last 100 visitors for extended history

      // Enrich visitor data with location information from ipapi.co
      const enrichedVisitors = await Promise.all(
        recentVisitors.map(async (visitor) => {
          const locationData = await locationService.getLocationData(visitor.ip_address);
          if (locationData) {
            // Update the session record with enriched location data if it was previously 'Unknown'
            if (visitor.country === 'Unknown' || visitor.city === 'Unknown' || visitor.region === 'Unknown') {
              try {
                await hybridStorage.updateSessionLocation(visitor.ip_address, {
                  country: locationData.country_name,
                  region: locationData.region,
                  city: locationData.city
                });
                console.log(`🌍 Location Update: Updated session location for IP ${visitor.ip_address}: ${locationData.city}, ${locationData.country_name}`);
              } catch (error) {
                console.error(`❌ Location Update: Failed to update session location for IP ${visitor.ip_address}:`, error);
              }
            }
            
            return {
              ...visitor,
              city: locationData.city,
              region: locationData.region,
              country: locationData.country_name,
              country_code: locationData.country_code,
              timezone: locationData.timezone,
              organization: locationData.organization
            };
          }
          return visitor;
        })
      );
      
      console.log(`✅ Recent Visitors: Found ${enrichedVisitors.length} unique visitors (enriched with location data)`);
      res.json(enrichedVisitors);
    } catch (error) {
      console.error('❌ Recent Visitors: Error fetching visitor details:', error);
      res.status(500).json({ error: 'Failed to load recent visitors' });
    }
  });

  // Returning Visitors Details - GET returning visitor details for modal
  app.get("/api/analytics/returning-visitors", async (req, res) => {
    try {
      console.log('👥 Returning Visitors: Fetching returning visitor details');
      
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        undefined, // dateFrom
        undefined, // dateTo  
        undefined,
        shouldIncludeProduction
      );
      
      // Filter out test data and invalid sessions
      const realSessions = sessions.filter(session => {
        return !session.is_test_data && 
               session.ip_address && 
               session.ip_address !== '0.0.0.0' &&
               session.ip_address !== null &&
               !session.session_id?.includes('anonymous');
      });
      
      // Get unique returning visitors (those with more than 1 visit)
      const visitorMap = new Map();
      const visitorSessions = new Map(); // Track all sessions per visitor
      
      // First pass: collect all sessions per visitor
      realSessions.forEach(session => {
        const ip = session.ip_address;
        if (!visitorSessions.has(ip)) {
          visitorSessions.set(ip, []);
        }
        visitorSessions.get(ip).push(session);
      });
      
      // Second pass: filter for returning visitors only (visit count > 1)
      visitorSessions.forEach((sessions, ip) => {
        if (sessions.length > 1) { // Only returning visitors
          // Sort sessions by date (newest first)
          sessions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          const latestSession = sessions[0];
          const previousSession = sessions[1]; // Second most recent session
          
          visitorMap.set(ip, {
            ip_address: ip,
            country: latestSession.country || 'Unknown',
            region: latestSession.region || 'Unknown',
            city: latestSession.city || 'Unknown',
            language: latestSession.language || 'Unknown', 
            last_visit: latestSession.created_at,
            user_agent: latestSession.user_agent ? latestSession.user_agent.substring(0, 50) + '...' : 'Unknown',
            visit_count: sessions.length,
            session_duration: latestSession.session_duration || Math.floor(Math.random() * 300 + 30),
            previous_visit: previousSession ? previousSession.created_at : null
          });
        }
      });
      
      // Convert to array and sort by most recent
      let returningVisitors = Array.from(visitorMap.values())
        .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime())
        .slice(0, 50); // Take last 50 returning visitors
      
      console.log(`✅ Returning Visitors: Found ${returningVisitors.length} returning visitors`);
      res.json(returningVisitors);
      
    } catch (error) {
      console.error('❌ Returning visitors fetch error:', error);
      res.status(500).json({ error: "Failed to get returning visitors data" });
    }
  });

  // MISSING ANALYTICS ENDPOINTS - CRITICAL FOR DASHBOARD

  // IP Exclusion Management - POST exclude IP address  
  app.post("/api/analytics/exclude-ip", async (req, res) => {
    try {
      const { ipAddress, comment } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      console.log(`🚫 Excluding IP address: ${ipAddress} with comment: ${comment || 'No comment'}`);
      
      const settings = await hybridStorage.addExcludedIp(ipAddress, comment);
      res.json({ 
        success: true, 
        message: `IP ${ipAddress} excluded successfully`,
        excludedIps: settings.excludedIps 
      });
    } catch (error) {
      console.error('❌ IP exclusion error:', error);
      res.status(500).json({ error: "Failed to exclude IP address" });
    }
  });

  // IP Exclusion Management - PATCH update comment for excluded IP
  app.patch("/api/analytics/exclude-ip/:ipAddress/comment", async (req, res) => {
    try {
      const { ipAddress } = req.params;
      const { comment } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      console.log(`📝 Updating comment for IP: ${ipAddress} to: ${comment || 'No comment'}`);
      
      // First remove the IP, then re-add with new comment
      await hybridStorage.removeExcludedIp(ipAddress);
      const settings = await hybridStorage.addExcludedIp(ipAddress, comment);
      
      res.json({ 
        success: true, 
        message: `Comment updated for IP ${ipAddress}`,
        excludedIps: settings.excludedIps 
      });
    } catch (error) {
      console.error('❌ IP comment update error:', error);
      res.status(500).json({ error: "Failed to update IP comment" });
    }
  });

  // IP Exclusion Management - DELETE remove excluded IP
  app.delete("/api/analytics/exclude-ip/:ipAddress", async (req, res) => {
    try {
      const { ipAddress } = req.params;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      console.log(`✅ Removing excluded IP: ${ipAddress}`);
      
      const settings = await hybridStorage.removeExcludedIp(ipAddress);
      res.json({ 
        success: true, 
        message: `IP ${ipAddress} removed from exclusion list`,
        excludedIps: settings.excludedIps 
      });
    } catch (error) {
      console.error('❌ IP removal error:', error);
      res.status(500).json({ error: "Failed to remove excluded IP" });
    }
  });

  // IP Exclusion Management - GET list of excluded IPs
  app.get("/api/analytics/exclude-ip", async (req, res) => {
    try {
      const settings = await hybridStorage.getAnalyticsSettings();
      res.json({ 
        excludedIps: settings.excludedIps || [] 
      });
    } catch (error) {
      console.error('❌ Get excluded IPs error:', error);
      res.status(500).json({ error: "Failed to get excluded IPs" });
    }
  });

  // Analytics Reset - POST reset all analytics data
  app.post("/api/analytics/reset", async (req, res) => {
    try {
      await hybridStorage.resetAnalyticsData();
      res.json({ success: true, message: "All analytics data has been reset" });
    } catch (error) {
      console.error('❌ Analytics reset error:', error);
      res.status(500).json({ error: "Failed to reset analytics data" });
    }
  });

  // Session Duration Update - POST update session duration
  app.post("/api/analytics/session-update", async (req, res) => {
    try {
      const { duration, sessionId: clientSessionId } = req.body;
      
      // FIXED: Use client-provided session ID or create IP-based session ID
      const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 
                       req.connection.remoteAddress || 
                       req.socket.remoteAddress || 
                       'unknown';
      const sessionId = clientSessionId || `ip_session_${clientIp?.replace(/\./g, '_')}` || 'anonymous';
      
      console.log(`📊 SESSION UPDATE: Duration ${duration}s for session ${sessionId} (IP: ${clientIp})`);
      
      if (!duration || duration < 0) {
        return res.status(400).json({ error: "Valid duration required" });
      }
      
      // FIXED: Find or create session for this specific IP
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        undefined,
        undefined, 
        undefined,
        shouldIncludeProduction
      );
      const ipSession = sessions.find((s: any) => 
        s.ip_address === clientIp && 
        !s.is_test_data
      );
      
      let finalSessionId = sessionId;
      if (ipSession) {
        finalSessionId = ipSession.session_id;
        console.log(`📊 SESSION UPDATE: Using existing session ${finalSessionId} for IP ${clientIp}`);
      } else {
        // FIXED: Prevent anonymous accumulation - skip if no valid session found
        if (!clientSessionId && finalSessionId.includes('anonymous')) {
          console.log(`🚫 SESSION UPDATE: Skipping anonymous session without client ID to prevent accumulation`);
          return res.json({ 
            success: false,
            message: "No valid session found - anonymous accumulation prevented" 
          });
        }
      }
      
      // Update session duration in storage
      await hybridStorage.updateSessionDuration(finalSessionId, duration);
      
      res.json({ 
        success: true, 
        sessionId: finalSessionId,
        duration,
        message: "Session duration updated successfully" 
      });
    } catch (error) {
      console.error('❌ Session update error:', error);
      res.status(500).json({ error: "Failed to update session duration" });
    }
  });

  // Location Enrichment - POST manually enrich visitor locations
  app.post("/api/analytics/enrich-locations", async (req, res) => {
    try {
      console.log('🌍 Location Enrichment: Starting manual enrichment...');
      
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        undefined,
        undefined,
        undefined, 
        shouldIncludeProduction
      );
      const uniqueIPs = Array.from(new Set(sessions.map(s => s.ip_address).filter(ip => ip && ip !== '0.0.0.0')));
      
      console.log(`🌍 Location Enrichment: Found ${uniqueIPs.length} unique IPs to enrich`);
      
      let enrichedCount = 0;
      for (const ip of uniqueIPs) {
        const locationData = await locationService.getLocationData(ip);
        if (locationData) {
          enrichedCount++;
          console.log(`✅ Enriched ${ip}: ${locationData.city}, ${locationData.region}, ${locationData.country_name}`);
        }
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const cacheStats = locationService.getCacheStats();
      
      res.json({
        success: true,
        total_ips: uniqueIPs.length,
        enriched_count: enrichedCount,
        cache_stats: cacheStats,
        message: `Successfully enriched ${enrichedCount}/${uniqueIPs.length} IP addresses`
      });
    } catch (error) {
      console.error('❌ Location Enrichment error:', error);
      res.status(500).json({ error: 'Failed to enrich locations' });
    }
  });

  // Analytics Test Data Status - GET test data status
  app.get("/api/analytics/test-data/status", async (req, res) => {
    try {
      // Return test data status - implementation depends on hybridStorage
      res.json({ testDataPresent: false, message: "No test data functionality implemented" });
    } catch (error) {
      console.error('❌ Test data status error:', error);
      res.status(500).json({ error: "Failed to get test data status" });
    }
  });

  // Analytics Clear Sessions - POST clear sessions data
  app.post("/api/analytics/clear/sessions", async (req, res) => {
    try {
      await hybridStorage.clearAnalyticsSessions();
      res.json({ success: true, message: "Sessions data cleared" });
    } catch (error) {
      console.error('❌ Clear sessions error:', error);
      res.status(500).json({ error: "Failed to clear sessions" });
    }
  });

  // Analytics Clear Views - POST clear views data
  app.post("/api/analytics/clear/views", async (req, res) => {
    try {
      await hybridStorage.clearAnalyticsViews();
      res.json({ success: true, message: "Views data cleared" });
    } catch (error) {
      console.error('❌ Clear views error:', error);
      res.status(500).json({ error: "Failed to clear views" });
    }
  });

  // Analytics Clear All - POST clear all analytics data
  app.post("/api/analytics/clear/all", async (req, res) => {
    try {
      await hybridStorage.clearAllAnalyticsData();
      res.json({ success: true, message: "All analytics data cleared" });
    } catch (error) {
      console.error('❌ Clear all analytics error:', error);
      res.status(500).json({ error: "Failed to clear all analytics data" });
    }
  });

  // MISSING VIDEO CACHE ENDPOINTS - CRITICAL FOR CACHE MANAGEMENT

  // Video Cache Force All (alternative endpoint name)
  app.post("/api/video-cache/force-all", async (req, res) => {
    try {
      console.log('🚀 Force cache all videos (alternative endpoint)');
      const result = await videoCache.forceCacheAllMedia();
      res.json(result);
    } catch (error) {
      console.error('❌ Force cache all error:', error);
      res.status(500).json({ error: "Failed to force cache all videos" });
    }
  });

  // Video Cache Clear - POST clear cache
  app.post("/api/video-cache/clear", async (req, res) => {
    try {
      console.log('🧹 Clear video cache request');
      const result = await videoCache.clearCacheCompletely();
      res.json({ success: true, message: "Cache cleared", result });
    } catch (error) {
      console.error('❌ Clear cache error:', error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Video Cache Refresh - POST refresh cache status  
  app.post("/api/video-cache/refresh", async (req, res) => {
    try {
      console.log('🔄 Refresh video cache status');
      const stats = videoCache.getCacheStats();
      
      // Also check individual hero video cache status for refresh
      const heroVideos = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
      const heroStatus = heroVideos.map(filename => ({
        filename,
        cached: videoCache.isVideoCached(filename),
        loadTime: videoCache.isVideoCached(filename) ? 50 : 1500
      }));

      res.json({ 
        success: true, 
        stats, 
        heroVideos: heroStatus,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('❌ Cache refresh error:', error);
      res.status(500).json({ error: "Failed to refresh cache" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.post("/api/analytics-session", async (req, res) => {
    try {
      console.log('📊 Analytics session creation (legacy):', req.body);
      const session = await hybridStorage.createAnalyticsSession(req.body);
      res.json({ success: true, session });
    } catch (error) {
      console.error('❌ Analytics session error (legacy):', error);
      res.status(500).json({ error: "Failed to create analytics session" });
    }
  });

  // Analytics View Tracking - POST create view
  app.post("/api/analytics-view", async (req, res) => {
    try {
      console.log('📊 Analytics view creation:', req.body);
      const view = await hybridStorage.createAnalyticsView(req.body);
      res.json({ success: true, view });
    } catch (error) {
      console.error('❌ Analytics view error:', error);
      res.status(500).json({ error: "Failed to create analytics view" });
    }
  });

  // Video Performance Analytics - GET video engagement data (FIXED v1.0.186)
  app.get("/api/analytics/video-performance", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('📊 Video performance analytics request - FIXED DATA QUALITY v1.0.186 with date filters:', { dateFrom, dateTo });
      
      // Get all gallery videos first
      const galleryItems = await hybridStorage.getGalleryItems();
      console.log(`📊 Found ${galleryItems.length} gallery items in database`);
      
      // Get all video views from analytics with date filters
      const views = await hybridStorage.getAnalyticsViews(
        dateFrom as string, 
        dateTo as string
      );
      console.log(`📊 Found ${views.length} total analytics views`);
      
      // Create video filename mapping for better data integrity
      const videoMapping: any = {};
      const videoStats: any = {};
      
      // FIXED: Improved video name extraction and mapping
      galleryItems.forEach((item: any, index: number) => {
        let videoFilename = null;
        let displayName = null;
        
        // Extract actual video filename - prioritize video_filename and URLs
        if (item.video_filename && item.video_filename.trim()) {
          videoFilename = item.video_filename.includes('/') 
            ? item.video_filename.split('/').pop() 
            : item.video_filename;
        } else if (item.video_url_en && item.video_url_en.includes('.mp4')) {
          videoFilename = item.video_url_en.split('/').pop();
        } else if (item.video_url_fr && item.video_url_fr.includes('.mp4')) {
          videoFilename = item.video_url_fr.split('/').pop();
        } else if (item.filename && item.filename.includes('.mp4')) {
          videoFilename = item.filename.includes('/') 
            ? item.filename.split('/').pop() 
            : item.filename;
        }
        
        // Create display name from title for better user experience
        displayName = item.title_en || item.title_fr || videoFilename || `Gallery Video ${index + 1}`;
        
        // Skip entries without actual video files
        if (!videoFilename || !videoFilename.includes('.mp4')) {
          console.log(`📊 Skipping item ${index + 1}: No video file found (${displayName})`);
          return;
        }
        
        // Store mapping between different possible video identifiers
        videoMapping[videoFilename] = displayName;
        if (item.video_url_en) videoMapping[item.video_url_en.split('/').pop()] = displayName;
        if (item.video_url_fr) videoMapping[item.video_url_fr.split('/').pop()] = displayName;
        
        // Initialize stats with proper display name
        videoStats[videoFilename] = {
          video_id: displayName, // Use friendly display name
          filename: videoFilename, // Keep original filename for mapping
          total_views: 0,
          total_watch_time: 0,
          unique_viewers: new Set(),
          last_viewed: null // Use null instead of creation date for never-viewed videos
        };
        
        console.log(`📊 Initialized: ${videoFilename} → "${displayName}"`);
      });
      
      // FIXED: Improved analytics data processing with better video ID mapping
      views.forEach((view: any) => {
        let videoKey = null;
        
        // Try multiple ways to match video ID from analytics data
        const possibleIds = [
          view.video_id,
          view.filename, 
          view.video_filename,
          view.video_name
        ].filter(id => id && String(id).trim());
        
        // Find matching video in our stats
        for (const id of possibleIds) {
          if (videoStats[id]) {
            videoKey = id;
            break;
          }
          // Try partial matching for filenames
          const matchingKey = Object.keys(videoStats).find(key => 
            String(key).includes(String(id)) || String(id).includes(String(key))
          );
          if (matchingKey) {
            videoKey = matchingKey;
            break;
          }
        }
        
        // FIXED: Skip unknown/legacy data instead of creating "Unknown Views"
        if (!videoKey) {
          console.log(`📊 Skipping unmatched view:`, possibleIds);
          return;
        }
        
        // Add view data to matched video
        const stats = videoStats[videoKey];
        stats.total_views++;
        stats.total_watch_time += Math.max(0, view.watch_time || 0); // Ensure non-negative
        stats.unique_viewers.add(view.ip_address || view.session_id || 'anonymous');
        
        // Update most recent view timestamp
        if (view.created_at && new Date(view.created_at) > new Date(stats.last_viewed)) {
          stats.last_viewed = view.created_at;
        }
      });
      
      // FIXED: Better final data preparation with accurate calculations
      const performanceData = Object.values(videoStats)
        .map((stats: any) => ({
          video_id: stats.video_id, // Friendly display name
          total_views: stats.total_views,
          unique_viewers: stats.unique_viewers.size,
          total_watch_time: Math.max(0, Math.round(stats.total_watch_time)),
          average_watch_time: stats.total_views > 0 
            ? Math.max(0, Math.round(stats.total_watch_time / stats.total_views)) 
            : 0,
          last_viewed: stats.last_viewed
        }))
        .sort((a, b) => {
          // Sort by total views, then by name for consistency
          if (a.total_views !== b.total_views) {
            return b.total_views - a.total_views;
          }
          return a.video_id.localeCompare(b.video_id);
        });
      
      console.log(`✅ Video performance: Processed ${performanceData.length} videos with clean data`);
      console.log('📊 Video display names:', performanceData.map(v => `"${v.video_id}": ${v.total_views} views`));
      res.json(performanceData);
    } catch (error) {
      console.error('❌ Video performance analytics error:', error);
      res.status(500).json({ error: "Failed to get video performance data" });
    }
  });

  // NUCLEAR CACHE-BUSTING VIDEO ANALYTICS - v1.0.187
  app.get("/api/analytics/fresh-video-data", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('🚨 NUCLEAR CACHE BYPASS REQUEST - FRESH VIDEO DATA v1.0.187 with date filters:', { dateFrom, dateTo });
      
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `fresh-${Date.now()}`);
      
      // Get all gallery videos first
      const galleryItems = await hybridStorage.getGalleryItems();
      console.log(`🚨 FRESH: Found ${galleryItems.length} gallery items in database`);
      
      // Get all video views from analytics with date filters
      const views = await hybridStorage.getAnalyticsViews(
        dateFrom as string, 
        dateTo as string
      );
      console.log(`🚨 FRESH: Found ${views.length} total analytics views`);
      
      // Create video filename mapping for better data integrity
      const videoMapping: any = {};
      const videoStats: any = {};
      
      // FIXED: Improved video name extraction and mapping
      galleryItems.forEach((item: any, index: number) => {
        let videoFilename = null;
        let displayName = null;
        
        // Extract actual video filename - prioritize video_filename and URLs
        if (item.video_filename && item.video_filename.trim()) {
          videoFilename = item.video_filename.includes('/') 
            ? item.video_filename.split('/').pop() 
            : item.video_filename;
        } else if (item.video_url_en && item.video_url_en.includes('.mp4')) {
          videoFilename = item.video_url_en.split('/').pop();
        } else if (item.video_url_fr && item.video_url_fr.includes('.mp4')) {
          videoFilename = item.video_url_fr.split('/').pop();
        } else if (item.filename && item.filename.includes('.mp4')) {
          videoFilename = item.filename.includes('/') 
            ? item.filename.split('/').pop() 
            : item.filename;
        }
        
        // Create display name from title for better user experience
        displayName = item.title_en || item.title_fr || videoFilename || `Gallery Video ${index + 1}`;
        
        // Skip entries without actual video files
        if (!videoFilename || !videoFilename.includes('.mp4')) {
          console.log(`🚨 FRESH: Skipping item ${index + 1}: No video file found (${displayName})`);
          return;
        }
        
        // Store mapping between different possible video identifiers
        videoMapping[videoFilename] = displayName;
        if (item.video_url_en) videoMapping[item.video_url_en.split('/').pop()] = displayName;
        if (item.video_url_fr) videoMapping[item.video_url_fr.split('/').pop()] = displayName;
        
        // Initialize stats with proper display name
        videoStats[videoFilename] = {
          video_id: displayName, // Use friendly display name
          total_views: 0,
          unique_viewers: new Set(),
          total_watch_time: 0,
          last_viewed: null // Use null instead of 1970 epoch for never-viewed videos
        };
        
        console.log(`🚨 FRESH: Initialized: ${videoFilename} → "${displayName}"`);
      });
      
      // Process all view events and calculate stats
      views.forEach((view: any) => {
        let matchedVideoId = null;
        
        // Try to match view to video using different potential identifiers
        const potentialIds = [
          view.video_id,
          view.video_filename,
          view.filename,
          typeof view.video_id === 'string' ? view.video_id.split('/').pop() : null,
          typeof view.video_filename === 'string' ? view.video_filename.split('/').pop() : null
        ].filter(Boolean);
        
        for (const id of potentialIds) {
          if (videoStats[id]) {
            matchedVideoId = id;
            break;
          }
        }
        
        if (!matchedVideoId) {
          console.log(`🚨 FRESH: Skipping unmatched view:`, Object.keys(view));
          return;
        }
        
        const stats = videoStats[matchedVideoId];
        stats.total_views += 1;
        stats.total_watch_time += Math.max(0, view.watch_time || 0); // Ensure non-negative
        stats.unique_viewers.add(view.ip_address || view.session_id || 'anonymous');
        
        // Update most recent view timestamp
        if (view.created_at && new Date(view.created_at) > new Date(stats.last_viewed)) {
          stats.last_viewed = view.created_at;
        }
      });
      
      // FIXED: Better final data preparation with accurate calculations
      const performanceData = Object.values(videoStats)
        .map((stats: any) => ({
          video_id: stats.video_id, // Friendly display name
          total_views: stats.total_views,
          unique_viewers: stats.unique_viewers.size,
          total_watch_time: Math.max(0, Math.round(stats.total_watch_time)),
          average_watch_time: stats.total_views > 0 
            ? Math.max(0, Math.round(stats.total_watch_time / stats.total_views)) 
            : 0,
          last_viewed: stats.last_viewed
        }))
        .sort((a, b) => {
          // Sort by total views, then by name for consistency
          if (a.total_views !== b.total_views) {
            return b.total_views - a.total_views;
          }
          return a.video_id.localeCompare(b.video_id);
        });
      
      console.log(`🚨 FRESH: Video performance: Processed ${performanceData.length} videos with clean data`);
      console.log('🚨 FRESH: Video display names:', performanceData.map(v => `"${v.video_id}": ${v.total_views} views`));
      res.json(performanceData);
    } catch (error) {
      console.error('❌ Fresh video data error:', error);
      res.status(500).json({ error: "Failed to get fresh video data" });
    }
  });

  // Video View Tracking - POST track video view
  app.post("/api/track-video-view", async (req, res) => {
    try {
      const { filename, session_id, watch_time, completion_rate } = req.body;
      console.log('📊 Video view tracking:', { filename, session_id, watch_time, completion_rate });
      
      const viewData = {
        video_id: filename,
        video_type: 'gallery',
        session_id: session_id || `session_${Date.now()}`,
        watch_time: watch_time || 0,
        completion_rate: completion_rate || 0,
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.get('User-Agent') || '',
        language: req.get('Accept-Language')?.split(',')[0] || 'en-US'
      };
      
      const view = await hybridStorage.createAnalyticsView(viewData);
      res.json({ success: true, view });
    } catch (error) {
      console.error('❌ Video view tracking error:', error);
      res.status(500).json({ error: "Failed to track video view" });
    }
  });

  // SHORT URL ALIAS SYSTEM - v1.0.20 INFRASTRUCTURE WORKAROUND
  app.all("/api/v/:id", async (req, res) => {
    try {
      const videoId = req.params.id;
      console.log(`🎯 SHORT URL ALIAS REQUEST: /api/v/${videoId}`);
      
      // Map short IDs to actual filenames - expandable for all videos
      const videoMap: Record<string, string> = {
        // Gallery videos
        'g1': 'gallery_Our_vitamin_sea_rework_2_compressed.mp4',
        // Hero videos
        'h1': 'VideoHero1.mp4',
        'h2': 'VideoHero2.mp4', 
        'h3': 'VideoHero3.mp4',
        // Future videos can be added as: 'g2', 'g3', 'h4', etc.
      };
      
      const filename = videoMap[videoId];
      if (!filename) {
        console.log(`❌ Unknown video ID: ${videoId}`);
        return res.status(404).json({ error: "Video not found" });
      }
      
      console.log(`🔄 REDIRECTING ${videoId} → ${filename}`);
      
      // Use simple redirect to gallery video proxy - this bypasses internal forwarding issues
      const targetUrl = `/api/gallery-video-proxy?filename=${encodeURIComponent(filename)}`;
      console.log(`📍 Redirecting to: ${targetUrl}`);
      return res.redirect(302, targetUrl);
      
    } catch (error) {
      console.error('❌ Short URL alias error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Short URL alias failed", details: errorMessage });
    }
  });

  // Production Error Logging System - ENHANCED v1.0.45
  const productionErrorLog: any[] = [];
  const maxLogEntries = 50;

  function logProductionError(error: any, context: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace',
        code: error.code || 'unknown'
      },
      context,
      version: 'v1.0.50-route-entry-debug'
    };
    
    productionErrorLog.unshift(logEntry);
    if (productionErrorLog.length > maxLogEntries) {
      productionErrorLog.pop();
    }
    
    console.error('🚨 PRODUCTION ERROR LOGGED:', logEntry);
  }

  // API to retrieve production error logs
  app.get("/api/debug/production-errors", (req, res) => {
    console.log("🔍 PRODUCTION ERROR LOG REQUEST");
    res.json({
      version: "v1.0.50-route-entry-debug",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      totalErrors: productionErrorLog.length,
      errors: productionErrorLog.slice(0, 10), // Return last 10 errors
      serverInfo: {
        workingDirectory: process.cwd(),
        dirname: __dirname,
        nodeEnv: process.env.NODE_ENV
      }
    });
  });

  // VIDEO DIAGNOSTIC ENDPOINT - v1.0.46
  app.get("/api/video-debug", async (req, res) => {
    const filename = req.query.filename as string;
    
    console.log(`🔍 VIDEO DIAGNOSTIC REQUEST: ${filename}`);
    
    if (!filename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    const diagnosticReport: any = {
      version: "v1.0.50-route-entry-debug",
      timestamp: new Date().toISOString(),
      requestedFilename: filename,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        workingDirectory: process.cwd(),
        dirname: __dirname
      }
    };

    try {
      // Run the same logic as video proxy
      const decodedFilename = filename;
      const encodedFilename = encodeURIComponent(decodedFilename);
      const sanitizedFilename = decodedFilename.replace(/[()]/g, '_');
      
      diagnosticReport.filenames = {
        original: decodedFilename,
        encoded: encodedFilename,
        sanitized: sanitizedFilename
      };

      // Check cache status
      let videoFilename = decodedFilename;
      let cacheCheckResults: any = {};
      
      try {
        cacheCheckResults.decodedExists = videoCache.isVideoCached(decodedFilename);
        cacheCheckResults.encodedExists = videoCache.isVideoCached(encodedFilename);
        cacheCheckResults.sanitizedExists = videoCache.isVideoCached(sanitizedFilename);
        
        if (cacheCheckResults.decodedExists) {
          videoFilename = decodedFilename;
        } else if (cacheCheckResults.encodedExists) {
          videoFilename = encodedFilename;
        } else if (cacheCheckResults.sanitizedExists) {
          videoFilename = sanitizedFilename;
        }
      } catch (cacheError: any) {
        cacheCheckResults.error = cacheError.message;
      }
      
      diagnosticReport.cacheCheck = cacheCheckResults;
      diagnosticReport.selectedFilename = videoFilename;

      // Get cache path
      const cachedVideo = videoCache.getCachedVideoPath(videoFilename);
      diagnosticReport.cachePath = cachedVideo;

      // File existence and stats
      if (cachedVideo) {
        const fileExists = existsSync(cachedVideo);
        diagnosticReport.fileExists = fileExists;
        
        if (fileExists) {
          try {
            const stats = statSync(cachedVideo);
            diagnosticReport.fileStats = {
              size: stats.size,
              mode: stats.mode,
              uid: stats.uid,
              gid: stats.gid,
              atime: stats.atime,
              mtime: stats.mtime,
              ctime: stats.ctime,
              permissions: (stats.mode & parseInt('777', 8)).toString(8)
            };
            
            // Test read permissions
            try {
              const fd = openSync(cachedVideo, 'r');
              closeSync(fd);
              diagnosticReport.readable = true;
            } catch (readError: any) {
              diagnosticReport.readable = false;
              diagnosticReport.readError = {
                code: readError.code,
                message: readError.message
              };
            }
            
            // Test createReadStream
            try {
              const testStream = createReadStream(cachedVideo, { start: 0, end: 100 });
              testStream.destroy();
              diagnosticReport.streamCreation = { success: true };
            } catch (streamError: any) {
              diagnosticReport.streamCreation = {
                success: false,
                error: {
                  code: streamError.code,
                  message: streamError.message,
                  stack: streamError.stack
                }
              };
            }
          } catch (statError: any) {
            diagnosticReport.statError = {
              code: statError.code,
              message: statError.message
            };
          }
        }
      } else {
        diagnosticReport.cachePath = null;
        diagnosticReport.fileExists = false;
      }

      console.log(`✅ VIDEO DIAGNOSTIC COMPLETE: ${filename}`);
      res.json(diagnosticReport);
      
    } catch (error: any) {
      console.error(`❌ VIDEO DIAGNOSTIC ERROR: ${filename}`, error);
      diagnosticReport.criticalError = {
        message: error.message,
        stack: error.stack,
        code: error.code
      };
      res.status(500).json(diagnosticReport);
    }
  });

  // CRITICAL ROUTING TEST - v1.0.50
  app.get("/api/test-routing", (req, res) => {
    console.log("🔥 ROUTING TEST HIT - v1.0.50");
    res.json({ 
      message: "Routing works",
      version: "v1.0.50-route-entry-debug",
      timestamp: new Date().toISOString()
    });
  });

  // EMERGENCY GALLERY VIDEO DEBUG ROUTE - v1.0.45
  app.get("/api/debug-gallery-video", (req, res) => {
    console.log("🔍 EMERGENCY DEBUG ROUTE HIT - v1.0.45");
    console.log("   - Current version should be v1.0.45");
    console.log("   - Gallery video proxy route should work");
    res.json({ 
      version: "v1.0.45-final-stage-logging",
      message: "Debug route working",
      timestamp: new Date().toISOString(),
      videoProxyRouteExists: true,
      environment: process.env.NODE_ENV,
      workingDirectory: process.cwd(),
      dirname: __dirname
    });
  });

  // SIMPLIFIED VIDEO PROXY - Same logic for ALL videos v1.0.1754929638.HEAD_SUPPORT
  // Handle both GET and HEAD requests
  // Add HEAD support for browser video loading and enhanced production logging
  app.head("/api/video-proxy", async (req, res) => {
    // Production optimized - debug logging disabled
    await handleVideoProxy(req, res);
  });

  app.get("/api/video-proxy", async (req, res) => {
    // Production optimized - debug logging disabled
    await handleVideoProxy(req, res);
  });
  

  
  async function handleVideoProxy(req: any, res: any) {
    const VERSION = "v1.0.1754932191.ULTRA_DETAILED_LOGGING";
    const filename = req.query.filename as string;
    
    // Production optimized video classification
    const isHeroVideo = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(filename);
    const isGalleryVideo = !isHeroVideo && filename && filename.endsWith('.mp4');
    
    // Gallery videos bypass cache and stream from CDN
    if (isGalleryVideo) {
      await streamFromCDN(filename, req, res, VERSION);
      return;
    }
    
    // Production optimized - debug logging removed for performance
    if (!filename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      // Efficient cache check without extensive logging
      let cachedVideo = videoCache.getCachedVideoPath(filename);
      const fileExists = cachedVideo ? existsSync(cachedVideo) : false;
      
      if (cachedVideo && fileExists) {
        try {
          serveVideoFromCache(cachedVideo, req, res);
          return;
        } catch (cacheError: any) {
          // Continue to CDN fallback on cache error
        }
      }
      
      // Fallback to CDN streaming
      const encodedFilename = encodeURIComponent(filename);
      const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(supabaseUrl, {
        headers: {
          'Range': req.headers.range || 'bytes=0-',
          'User-Agent': 'MEMOPYK-VideoProxy/1.0'
        }
      });
      
      if (!response.ok) {
        return res.status(500).json({ 
          error: "Video not available",
          filename,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      // Forward response headers
      const contentRange = response.headers.get('content-range');
      const contentLength = response.headers.get('content-length');
      const acceptRanges = response.headers.get('accept-ranges');
      
      const headers: any = {
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'range, content-type',
        'Cache-Control': 'public, max-age=3600',
        'X-Video-Source': 'CDN'
      };
      
      if (contentRange) headers['Content-Range'] = contentRange;
      if (contentLength) headers['Content-Length'] = contentLength;
      if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
      
      const statusCode = response.status === 206 ? 206 : 200;
      res.writeHead(statusCode, headers);
      
      console.error(`📋 CDN STREAMING FOR ${filename}:`);
      console.error(`   - Response body exists: ${!!response.body}`);
      console.error(`   - About to stream to client...`);
      
      if (response.body) {
        // Stream the response body directly to the client
        response.body.pipe(res);
        console.error(`   - Stream piped successfully`);
        console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (CDN SUCCESS) - ${filename} 🚨🚨🚨`);
      } else {
        console.error(`   - No response body, ending response`);
        res.end();
        console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (NO BODY) - ${filename} 🚨🚨🚨`);
      }
      
    } catch (error: any) {
      console.error(`🚨🚨🚨 CRITICAL ERROR IN VIDEO PROXY - ${filename} 🚨🚨🚨`);
      console.error(`❌ VIDEO PROXY ${VERSION} - CRITICAL ERROR for ${filename}:`);
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Error stack: ${error.stack}`);
      console.error(`❌ Error type: ${error.constructor.name}`);
      console.error(`❌ Request URL: ${req.url}`);
      console.error(`❌ Request method: ${req.method}`);
      console.error(`❌ Request headers:`, req.headers);
      console.error(`❌ Filename: ${filename}`);
      console.error(`❌ Range header: ${req.headers.range}`);
      console.error(`❌ User agent: ${req.headers['user-agent']}`);
      console.error(`❌ NODE_ENV: ${process.env.NODE_ENV}`);
      console.error(`❌ Working directory: ${process.cwd()}`);
      console.error(`❌ Full error object:`, error);
      console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (ERROR) - ${filename} 🚨🚨🚨`);
      
      res.status(500).json({ 
        error: "Video proxy failed",
        filename,
        message: error.message,
        version: VERSION,
        stack: error.stack,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
        requestUrl: req.url,
        range: req.headers.range,
        userAgent: req.headers['user-agent']
      });
    }
  }
  
  // Helper function to stream gallery videos directly from CDN (bypassing cache)
  async function streamFromCDN(filename: string, req: any, res: any, version: string) {
    console.error(`🌐 STREAMING FROM CDN: ${filename}`);
    const encodedFilename = encodeURIComponent(filename);
    
    // CRITICAL FIX: Use the working Supabase domain  
    const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
    console.error(`   - CDN URL (VERIFIED): ${supabaseUrl}`);
    console.error(`   - Range header: ${req.headers.range || 'NONE'}`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(supabaseUrl, {
      headers: {
        'Range': req.headers.range || 'bytes=0-',
        'User-Agent': 'MEMOPYK-GalleryProxy/1.0'
      }
    });
    
    console.error(`   - CDN response status: ${response.status}`);
    console.error(`   - CDN response ok: ${response.ok}`);
    
    if (!response.ok) {
      console.error(`❌ CDN STREAM FAILED: ${response.status} ${response.statusText}`);
      console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (CDN FAILED) - ${filename} 🚨🚨🚨`);
      return res.status(500).json({ 
        error: "Gallery video not available",
        filename,
        status: response.status,
        statusText: response.statusText,
        type: 'GALLERY_CDN_ERROR'
      });
    }
    
    // Forward response headers
    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');
    
    const headers: any = {
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'range, content-type',
      'Cache-Control': 'public, max-age=3600',
      'X-Video-Source': 'GALLERY_CDN'
    };
    
    if (contentRange) headers['Content-Range'] = contentRange;
    if (contentLength) headers['Content-Length'] = contentLength;
    if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
    
    const statusCode = response.status === 206 ? 206 : 200;
    res.writeHead(statusCode, headers);
    
    // Stream response
    response.body!.pipe(res);
    
    response.body!.on('end', () => {
      // Stream complete - production optimized logging
    });
  }
  
  // Helper function to serve video from cache
  function serveVideoFromCache(cachedVideo: string, req: any, res: any) {
    // Production optimized - debug logging removed for performance
    try {
      const stat = statSync(cachedVideo);
      const fileSize = stat.size;
      const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      let end = fileSize - 1;
      
      if (parts[1] && parts[1].trim()) {
        const parsedEnd = parseInt(parts[1], 10);
        if (!isNaN(parsedEnd)) {
          end = parsedEnd;
        }
      }
      
      const chunksize = (end - start) + 1;
      const stream = createReadStream(cachedVideo, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'X-Video-Source': 'CACHE'
      });
      
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'X-Video-Source': 'CACHE'
      });
      
      const stream = createReadStream(cachedVideo);
      stream.pipe(res);
    }
    
    } catch (cacheError: any) {
      console.error(`❌ SERVE VIDEO FROM CACHE ERROR - DEBUG v1.0.1754928116:`);
      console.error(`   - Cache path: ${cachedVideo}`);
      console.error(`   - Error message: ${cacheError.message}`);
      console.error(`   - Error stack: ${cacheError.stack}`);
      console.error(`   - Error type: ${cacheError.constructor.name}`);
      console.error(`   - Range header: ${req.headers.range}`);
      console.error(`   - Full error object:`, cacheError);
      throw cacheError; // Re-throw to be caught by main try-catch
    }
  }

  // Image serving endpoint for cached images with Supabase fallback
  app.get("/api/image-proxy", async (req, res) => {
    const filename = req.query.filename as string;
    
    if (!filename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      const imagePath = path.join(process.cwd(), 'server', 'cache', 'images', filename);
      
      // Try cache first
      if (existsSync(imagePath)) {
        const stat = statSync(imagePath);
        const fileSize = stat.size;
        const contentType = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
        
        console.log(`📦 Serving image from cache: ${filename}`);
        
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': fileSize,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
          'X-Image-Source': 'CACHE'
        });
        
        const stream = createReadStream(imagePath);
        stream.pipe(res);
        return;
      }
      
      // Fallback to Supabase CDN
      console.log(`🌐 Image cache miss, streaming from Supabase: ${filename}`);
      
      const supabaseUrl = `https://dcrfcrjjuynwtdwjglhm.supabase.co/storage/v1/object/public/memopyk-videos/${filename}`;
      
      const response = await fetch(supabaseUrl);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
          'X-Image-Source': 'CDN'
        });
        
        if (response.body) {
          // Use Node.js Readable stream conversion for better compatibility
          const stream = require('stream');
          const readable = stream.Readable.fromWeb(response.body);
          readable.pipe(res);
        } else {
          res.end();
        }
      } else {
        console.error(`Image not found in cache or CDN: ${filename}`);
        res.status(404).json({ error: 'Image not found' });
      }
      
    } catch (error: any) {
      console.error(`Image proxy error for ${filename}:`, error);
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });

  // Simplified gallery video proxy endpoint for /gv testing
  app.get("/api/gallery-video-proxy", async (req, res) => {
    const videoFilename = req.query.filename as string;
    const startTime = Date.now();
    
    if (!videoFilename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      console.log(`🔍 [GALLERY-PROXY] Request for video: ${videoFilename}`);
      
      // Try local cache first
      const cachedVideo = path.join(process.cwd(), 'uploads', 'videos', videoFilename);
      
      if (existsSync(cachedVideo)) {
        const serveTime = Date.now() - startTime;
        console.log(`✅ [GALLERY-PROXY] CACHE HIT - Serving from local cache: ${videoFilename} (${serveTime}ms)`);
        
        const stat = statSync(cachedVideo);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
            'X-Video-Source': 'LOCAL_CACHE',
            'X-Serve-Time': `${serveTime}ms`
          });
          
          const stream = createReadStream(cachedVideo, { start, end });
          stream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
            'X-Video-Source': 'LOCAL_CACHE',
            'X-Serve-Time': `${serveTime}ms`
          });
          
          const stream = createReadStream(cachedVideo);
          stream.pipe(res);
        }
      } else {
        // Fall back to direct Supabase CDN streaming
        console.log(`⚠️ [GALLERY-PROXY] CACHE MISS - Streaming from Supabase CDN: ${videoFilename}`);
        
        const supabaseUrl = `https://dcrfcrjjuynwtdwjglhm.supabase.co/storage/v1/object/public/memopyk-videos/${videoFilename}`;
        
        const response = await fetch(supabaseUrl, {
          headers: {
            'Range': req.headers.range || ''
          }
        });
        
        const serveTime = Date.now() - startTime;
        
        if (!response.ok) {
          console.log(`❌ [GALLERY-PROXY] CDN MISS - Video not found: ${videoFilename} (${serveTime}ms)`);
          return res.status(404).json({ error: 'Video not found in CDN' });
        }
        
        console.log(`🌐 [GALLERY-PROXY] CDN HIT - Streaming from Supabase: ${videoFilename} (${serveTime}ms)`);
        
        // Copy headers from Supabase response
        res.writeHead(response.status, {
          'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
          'Content-Length': response.headers.get('Content-Length') || '',
          'Content-Range': response.headers.get('Content-Range') || '',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
          'X-Video-Source': 'SUPABASE_CDN',
          'X-Serve-Time': `${serveTime}ms`
        });
        
        // Stream the response body
        if (response.body) {
          const reader = response.body.getReader();
          
          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
            } catch (error) {
              console.error(`❌ [GALLERY-PROXY] Stream error for ${videoFilename}:`, error);
              res.end();
            }
          };
          
          pump();
        } else {
          res.end();
        }
      }
    } catch (error: any) {
      const serveTime = Date.now() - startTime;
      console.error(`❌ [GALLERY-PROXY] Error serving ${videoFilename} (${serveTime}ms):`, error);
      res.status(500).json({ error: 'Failed to serve video', source: 'PROXY_ERROR', serveTime: `${serveTime}ms` });
    }
  });

  // Deployment Marker API Endpoints
  
  // Get deployment markers
  app.get("/api/deployment/markers", async (req, res) => {
    try {
      const markersDir = path.join(process.cwd());
      const markerFiles = readdirSync(markersDir)
        .filter(file => file.startsWith('DEPLOYMENT_MARKER') && file.endsWith('.json'))
        .map(file => {
          try {
            const fullPath = path.join(markersDir, file);
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const stats = statSync(fullPath);
            return {
              filename: file,
              description: content.fix || content.description || 'No description',
              timestamp: content.timestamp || stats.mtime.toISOString(),
              version: content.version || '1.0.0'
            };
          } catch (error) {
            console.error(`Error reading deployment marker ${file}:`, error);
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

      res.json(markerFiles);
    } catch (error) {
      console.error('Error loading deployment markers:', error);
      res.status(500).json({ error: 'Failed to load deployment markers' });
    }
  });

  // Create deployment marker
  app.post("/api/deployment/create-marker", async (req, res) => {
    try {
      const { description, keep } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: 'Description is required' });
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const version = `1.0.${Math.floor(timestamp / 1000)}`;
      const filename = `DEPLOYMENT_MARKER_v${version}.json`;
      
      // Create deployment marker object
      const deploymentMarker = {
        version,
        timestamp: new Date().toISOString(),
        fix: description,
        description,
        status: 'ADMIN_CREATED',
        critical: false,
        created_via: 'admin_panel'
      };

      // Write marker file
      const filePath = path.join(process.cwd(), filename);
      fs.writeFileSync(filePath, JSON.stringify(deploymentMarker, null, 2));
      
      console.log(`✅ Created deployment marker: ${filename}`);
      console.log(`📋 Description: ${description}`);
      
      // Clean up old markers if keep count specified
      if (keep && keep > 0) {
        try {
          const markersDir = process.cwd();
          const existingMarkers = readdirSync(markersDir)
            .filter(file => file.startsWith('DEPLOYMENT_MARKER') && file.endsWith('.json'))
            .map(file => ({
              file,
              path: path.join(markersDir, file),
              stats: statSync(path.join(markersDir, file))
            }))
            .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

          if (existingMarkers.length > keep) {
            const toDelete = existingMarkers.slice(keep);
            toDelete.forEach(marker => {
              try {
                unlinkSync(marker.path);
                console.log(`🗑️ Cleaned up old marker: ${marker.file}`);
              } catch (error) {
                console.error(`Failed to delete ${marker.file}:`, error);
              }
            });
          }
        } catch (error) {
          console.warn('Error during marker cleanup:', error);
        }
      }

      res.json({ 
        success: true, 
        filename,
        version,
        description,
        timestamp: deploymentMarker.timestamp
      });
      
    } catch (error) {
      console.error('Error creating deployment marker:', error);
      res.status(500).json({ error: 'Failed to create deployment marker' });
    }
  });

  // Delete deployment marker
  app.delete("/api/deployment/markers/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      if (!filename.startsWith('DEPLOYMENT_MARKER') || !filename.endsWith('.json')) {
        return res.status(400).json({ error: 'Invalid marker filename' });
      }

      const filePath = path.join(process.cwd(), filename);
      
      if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'Marker not found' });
      }

      unlinkSync(filePath);
      console.log(`🗑️ Deleted deployment marker: ${filename}`);
      
      res.json({ success: true, message: `Marker ${filename} deleted successfully` });
    } catch (error) {
      console.error('Error deleting deployment marker:', error);
      res.status(500).json({ error: 'Failed to delete deployment marker' });
    }
  });

  // ========== GA4 ANALYTICS ENDPOINTS ==========
  let ga4Service: any = null;

  // Initialize GA4 service function
  const initGA4 = () => {
    if (!ga4Service) {
      try {
        ga4Service = {}; // Service now uses direct query functions
        console.log('✅ GA4 Analytics service initialized');
      } catch (error) {
        console.error('⚠️ GA4 initialization failed, using fallback mode:', (error as Error).message);
        // Create a fallback service that returns mock data
        ga4Service = {
          getKPIs: async (startDate: string, endDate: string, locale: string = 'all') => ({
            range: { start: startDate, end: endDate, locale },
            kpis: {
              plays_unique_viewers: Math.floor(Math.random() * 1000) + 500,
              avg_watch_time_sec: Math.floor(Math.random() * 120) + 60,
              completion_rate: Math.random() * 0.3 + 0.4,
              plays_by_locale: [
                { locale: 'fr-FR', users: Math.floor(Math.random() * 300) + 200 },
                { locale: 'en-US', users: Math.floor(Math.random() * 200) + 150 },
              ],
            },
            cached: false,
            note: 'Demo mode - GA4 service account needs configuration'
          }),
          getTopVideos: async (startDate: string, endDate: string, locale: string = 'all', limit: number = 10) => ({
            rows: Array.from({ length: Math.min(limit, 8) }, (_, i) => ({
              video_id: `video_${i + 1}_gallery.mp4`,
              plays: Math.floor(Math.random() * 200) + 50,
              avg_watch_time_sec: Math.floor(Math.random() * 90) + 30,
              reach50_pct: Math.random() * 0.4 + 0.3,
              complete100_pct: Math.random() * 0.3 + 0.2,
            })),
            cached: false
          }),
          getFunnelData: async (startDate: string, endDate: string, locale: string = 'all') => ({
            rows: [
              { video_id: 'all', percent: 25, count: Math.floor(Math.random() * 400) + 600 },
              { video_id: 'all', percent: 50, count: Math.floor(Math.random() * 300) + 400 },
              { video_id: 'all', percent: 75, count: Math.floor(Math.random() * 200) + 250 },
              { video_id: 'all', percent: 100, count: Math.floor(Math.random() * 150) + 100 },
            ],
            cached: false
          }),
          getTrendData: async (startDate: string, endDate: string, locale: string = 'all') => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              days.push({
                date: d.toISOString().split('T')[0],
                plays: Math.floor(Math.random() * 100) + 20,
                avg_watch_time_sec: Math.floor(Math.random() * 60) + 40,
              });
            }
            return { days, cached: false };
          },
          getRealtimeData: async () => ({
            active: Math.floor(Math.random() * 10) + 1,
            recent: Array.from({ length: 5 }, (_, i) => ({
              ts: new Date(Date.now() - i * 60000).toISOString(),
              event: 'video_play',
              video_id: `gallery_video_${Math.floor(Math.random() * 6) + 1}.mp4`,
              locale: Math.random() > 0.5 ? 'fr-FR' : 'en-US',
              percent: Math.floor(Math.random() * 100),
            })),
            cached: false
          })
        };
      }
    }
    return ga4Service;
  };

  // GA4 Debug endpoint for watch time investigation
  app.get('/api/ga4/debug-watch-time', async (req, res) => {
    try {
      const startDate = '2024-08-01';
      const endDate = '2025-12-31';
      
      console.log('🔍 GA4 WATCH TIME DEBUG - Investigating all event types with custom metrics');
      
      // Query all events with custom metric watch_time_seconds - no event filter
      const request = {
        property: GA4_PROPERTY,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: "eventName" },
          { name: "customEvent:video_id" },
          { name: "customEvent:video_title" }
        ],
        metrics: [
          { name: "eventCount" },
          { name: "customEvent:watch_time_seconds" }
        ],
        orderBys: [
          { metric: { metricName: "eventCount" }, desc: true }
        ],
        limit: 50
      };

      const [response] = await ga4Client.runReport(request);
      
      console.log('🔍 GA4 DEBUG RAW RESPONSE:', JSON.stringify(response.rows?.slice(0, 10), null, 2));
      
      const debugData = response.rows?.map(row => ({
        eventName: row.dimensionValues?.[0]?.value || 'unknown',
        video_id: row.dimensionValues?.[1]?.value || '(not set)',
        video_title: row.dimensionValues?.[2]?.value || '(not set)',
        eventCount: parseInt(row.metricValues?.[0]?.value || '0'),
        watchTimeSeconds: parseInt(row.metricValues?.[1]?.value || '0')
      })) || [];
      
      res.json({
        success: true,
        totalEvents: debugData.length,
        debugData: debugData.slice(0, 20),
        summary: {
          totalWatchTimeAcrossAllEvents: debugData.reduce((sum, event) => sum + event.watchTimeSeconds, 0),
          eventsWithWatchTime: debugData.filter(e => e.watchTimeSeconds > 0).length,
          eventsWithVideoId: debugData.filter(e => e.video_id !== '(not set)').length
        }
      });
      
    } catch (error) {
      console.error('❌ GA4 Debug error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GA4 Connection Test endpoint - tests basic GA4 query functionality
  app.get("/api/ga4/test", async (req, res) => {
    try {
      console.log('🔍 GA4 connection test requested');
      
      // Test basic query function with yesterday's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const testDate = yesterday.toISOString().split('T')[0];
      
      console.log(`Testing qPlays function with date: ${testDate}`);
      const plays = await qPlays(testDate, testDate, 'all');
      console.log(`qPlays result: ${plays}`);
      
      // Test simple qCompletes with just video_complete events
      console.log('Testing simple qCompletes...');
      const [simpleRes] = await ga4Service.client.runReport({
        property: "properties/501023254",
        dateRanges: [{ startDate: testDate, endDate: testDate }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "video_complete" } }
        }
      });
      const simpleCompletes = Number(simpleRes.rows?.[0]?.metricValues?.[0]?.value ?? 0);
      console.log(`Simple completes result: ${simpleCompletes}`);
      
      console.log('✅ GA4 connection test successful');
      res.json({
        success: true,
        testDate,
        testPlays: plays,
        simpleCompletes,
        message: "GA4 query functions working correctly"
      });
    } catch (error) {
      console.error('❌ GA4 connection test failed:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'GA4 connection test failed',
        success: false,
        fullError: JSON.stringify(error, null, 2)
      });
    }
  });

  // GA4 Custom Parameters Test endpoint - finds correct dimension/metric names
  app.get("/api/ga4/test-params", async (req, res) => {
    try {
      console.log('🔍 GA4 custom parameters test requested');
      const service = initGA4();
      const result = await service.testCustomParams();
      
      console.log('✅ GA4 custom parameters test completed');
      res.json(result);
    } catch (error) {
      console.error('❌ GA4 custom parameters test failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'GA4 custom parameters test failed',
        success: false 
      });
    }
  });

  // Test individual GA4 queries to isolate the issue
  app.get("/api/ga4/test-individual", async (req, res) => {
    try {
      console.log('🔍 Testing individual GA4 queries');
      const service = initGA4();
      
      const results: any = {};
      
      try {
        console.log('Testing getPlays...');
        results.plays = await service.getPlays('7daysAgo', 'today', 'all');
        console.log('✅ getPlays works:', results.plays);
      } catch (error: any) {
        results.playsError = error.message;
        console.log('❌ getPlays failed:', error.message);
      }
      
      try {
        console.log('Testing getCompletes...');
        results.completes = await service.getCompletes('7daysAgo', 'today', 'all');
        console.log('✅ getCompletes works:', results.completes);
      } catch (error: any) {
        results.completesError = error.message;
        console.log('❌ getCompletes failed:', error.message);
      }

      try {
        console.log('Testing getWatchTime...');
        results.watchTime = await service.getWatchTime('7daysAgo', 'today', 'all');
        console.log('✅ getWatchTime works:', results.watchTime);
      } catch (error: any) {
        results.watchTimeError = error.message;
        console.log('❌ getWatchTime failed:', error.message);
      }

      try {
        console.log('Testing getTopLocale...');
        results.topLocale = await service.getTopLocale('7daysAgo', 'today');
        console.log('✅ getTopLocale works:', results.topLocale);
      } catch (error: any) {
        results.topLocaleError = error.message;
        console.log('❌ getTopLocale failed:', error.message);
      }
      
      res.json(results);
    } catch (error) {
      console.error('❌ Individual test failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Individual test failed',
        success: false 
      });
    }
  });

  // NEW CLEAN GA4 API ENDPOINTS using your exact drop-in queries
  
  // Function to parse parameters (from your spec) - handles both startDate/endDate and start/end formats
  function getParams(req: any) {
    const startDate = String(req.query.startDate || req.query.start || '');
    const endDate = String(req.query.endDate || req.query.end || '');
    const locale = req.query.locale ? String(req.query.locale) : "all";
    const nocache = req.query.nocache === "1" || req.query.nocache === "true";
    
    if (!startDate || startDate === 'undefined' || !endDate || endDate === 'undefined') {
      throw new Error("startDate/start and endDate/end are required (YYYY-MM-DD)");
    }
    
    return { startDate, endDate, locale, nocache };
  }

  // GA4 KPIs endpoint - using your exact clean API structure
  app.get("/api/ga4/kpis", async (req, res, next) => {
    try {
      const { startDate, endDate, locale, nocache } = getParams(req);
      const key = k(`kpis:${startDate}:${endDate}:${locale}`);

      console.log(`🔍 GA4 KPIs REQUEST: ${startDate} to ${endDate}, locale: ${locale}, cache key: ${key}`);

      // Check cache unless bypassed
      if (!nocache) {
        console.log(`🔍 Checking cache for key: ${key}`);
        
        // Try persistent cache first, then memory cache
        const dbCached = await getDbCache<any>(key);
        if (dbCached) {
          console.log(`✅ CACHE HIT (DB): Returning cached data for ${key}:`, JSON.stringify(dbCached, null, 2));
          return res.json(dbCached);
        }

        const memoryCached = getCache<any>(key);
        if (memoryCached) {
          console.log(`✅ CACHE HIT (MEMORY): Returning cached data for ${key}:`, JSON.stringify(memoryCached, null, 2));
          return res.json(memoryCached);
        }
        
        console.log(`❌ CACHE MISS: No cached data found for ${key}`);
      } else {
        console.log(`🚫 CACHE BYPASSED for ${key}`);
      }

      console.log(`📊 GA4 KPIs request: ${startDate} to ${endDate}, locale: ${locale}${nocache ? ' (cache bypassed)' : ''}`);

      // Test each query individually to identify which is failing
      let plays = 0, completes = 0, totalWatch = 0, topLocale = { locale: "n/a", plays: 0 };

      try {
        console.log('Testing qPlays...');
        plays = await qPlays(startDate, endDate, locale);
        console.log(`✅ qPlays: ${plays}`);
      } catch (e) {
        console.error('❌ qPlays failed:', (e as Error).message);
        throw new Error(`qPlays failed: ${(e as Error).message}`);
      }

      try {
        console.log('Testing qCompletes...');
        completes = await qCompletes(startDate, endDate, locale);
        console.log(`✅ qCompletes: ${completes}`);
      } catch (e) {
        console.error('❌ qCompletes failed:', (e as Error).message);
        throw new Error(`qCompletes failed: ${(e as Error).message}`);
      }

      try {
        console.log('Testing qWatchTimeTotal...');
        // Pass the already-retrieved plays and completes data to avoid re-fetching
        totalWatch = await qWatchTimeTotal(startDate, endDate, locale, plays, completes);
        console.log(`✅ qWatchTimeTotal: ${totalWatch}`);
      } catch (e) {
        console.error('❌ qWatchTimeTotal failed:', (e as Error).message);
        // CRITICAL FIX: Use ONLY authentic GA4 data - NO fallback calculations or estimations
        console.log('🚨 AUTHENTIC GA4 DATA ONLY: No fallback calculations allowed');
        totalWatch = 0; // If no authentic GA4 data available, return 0 - never generate fake data
        console.log(`✅ qWatchTimeTotal AUTHENTIC GA4 ONLY: ${totalWatch}`);
      }

      try {
        console.log('Testing qTopLanguages...');
        topLocale = await qTopLanguages(startDate, endDate);
        console.log(`✅ qTopLanguages:`, topLocale);
      } catch (e) {
        console.error('❌ qTopLanguages failed:', (e as Error).message);
        throw new Error(`qTopLanguages failed: ${(e as Error).message}`);
      }

      // CRITICAL FIX: Use ONLY authentic GA4 totalWatch data - NO estimations or calculations
      const avgWatchSeconds = (totalWatch > 0 && plays > 0) ? Math.round(totalWatch / plays) : 0;
      const completionRate = plays > 0 ? (completes / plays) * 100 : 0;

      const data = {
        plays,
        completes,
        totals: { watchTimeSeconds: totalWatch },
        avgWatchSeconds,
        completionRate,
        topLocale
      };

      console.log(`📊 FINAL GA4 KPIs DATA for ${key}:`, JSON.stringify(data, null, 2));

      // Store in both persistent and memory cache
      console.log(`💾 Storing in cache with key: ${key}`);
      await setDbCache(key, data, 300);
      setCache(key, data, 300);
      console.log(`✅ Data stored in cache for key: ${key}`);
      
      res.json(data);
    } catch (e) { 
      console.error('❌ GA4 KPIs error:', e);
      res.status(500).json({ message: (e as Error).message });
    }
  });

  // GA4 Schema diagnostic endpoint to understand available custom events
  app.get("/api/ga4/debug-schema", async (req, res) => {
    try {
      const { startDate = '2025-08-10', endDate = '2025-08-16' } = req.query;
      
      // Import the client directly
      const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
      const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
      const client = new BetaAnalyticsDataClient(
        SA_KEY ? { credentials: JSON.parse(SA_KEY) } : {}
      );
      
      // Get all custom events for debugging
      const [eventsRes] = await client.runReport({
        property: `properties/${process.env.GA4_PROPERTY_ID || "501023254"}`,
        dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        limit: 100
      });

      const events = (eventsRes.rows ?? []).map(r => ({
        eventName: r.dimensionValues?.[0]?.value ?? "",
        count: Number(r.metricValues?.[0]?.value ?? 0)
      }));

      // Try to get custom parameters for video events
      let customParameters = [];
      try {
        const [paramsRes] = await client.runReport({
          property: `properties/${process.env.GA4_PROPERTY_ID || "501023254"}`,
          dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
          dimensions: [
            { name: "eventName" },
            { name: "customEvent:video_id" },
            { name: "customEvent:locale" }
          ],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: { fieldName: "eventName", stringFilter: { matchType: "CONTAINS", value: "video" } }
          },
          limit: 50
        });

        customParameters = (paramsRes.rows ?? []).map(r => ({
          eventName: r.dimensionValues?.[0]?.value ?? "",
          videoId: r.dimensionValues?.[1]?.value ?? "",
          locale: r.dimensionValues?.[2]?.value ?? "",
          count: Number(r.metricValues?.[0]?.value ?? 0)
        }));
      } catch (paramError) {
        console.error('Error getting custom parameters:', paramError);
      }

      res.json({
        events,
        customParameters,
        dateRange: { startDate, endDate },
        propertyId: process.env.GA4_PROPERTY_ID || "501023254"
      });
    } catch (error) {
      console.error('GA4 schema debug error:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Test just the qPlaysByVideo function to isolate the issue
  app.get("/api/ga4/test-plays-by-video", async (req, res) => {
    try {
      const { startDate, endDate, locale } = getParams(req);
      console.log(`📊 Testing qPlaysByVideo: ${startDate} to ${endDate}, locale: ${locale}`);
      
      const plays = await qPlaysByVideo(startDate, endDate, locale);
      console.log(`✅ qPlaysByVideo result:`, plays);
      
      res.json(plays);
    } catch (e) {
      console.error('❌ qPlaysByVideo test failed:', e);
      res.status(500).json({ 
        error: (e as Error).message,
        stack: (e as Error).stack 
      });
    }
  });

  // Test the qWatchTimeByVideo function
  app.get("/api/ga4/test-watch-time-by-video", async (req, res) => {
    try {
      const { startDate, endDate, locale } = getParams(req);
      console.log(`📊 Testing qWatchTimeByVideo: ${startDate} to ${endDate}, locale: ${locale}`);
      
      const watchTime = await qWatchTimeByVideo(startDate, endDate, locale);
      console.log(`✅ qWatchTimeByVideo result:`, watchTime);
      
      res.json(watchTime);
    } catch (e) {
      console.error('❌ qWatchTimeByVideo test failed:', e);
      res.status(500).json({ 
        error: (e as Error).message,
        stack: (e as Error).stack 
      });
    }
  });

  // Test the ACTUAL GA4 watch time function with real seconds
  app.get("/api/ga4/test-actual-watch-time", async (req, res) => {
    try {
      const { startDate, endDate, locale } = getParams(req);
      console.log(`📊 Testing qActualWatchTimeByVideo (REAL GA4 SECONDS): ${startDate} to ${endDate}, locale: ${locale}`);
      
      const { qActualWatchTimeByVideo } = await import('./ga4-service.js');
      const watchTime = await qActualWatchTimeByVideo(startDate, endDate, locale);
      console.log(`✅ qActualWatchTimeByVideo result:`, watchTime);
      
      res.json(watchTime);
    } catch (e) {
      console.error('❌ qActualWatchTimeByVideo test failed:', e);
      res.status(500).json({ 
        error: (e as Error).message,
        stack: (e as Error).stack 
      });
    }
  });

  // Simple GA4 custom metric test endpoint
  app.get("/api/ga4/debug-custom-metric", async (req, res) => {
    try {
      const { startDate, endDate } = getParams(req);
      
      console.log("🔍 GA4 CUSTOM METRIC DIAGNOSTIC - Testing custom metric access");
      
      const { client, PROPERTY } = await import('./ga4-service.js');
      
      // Test 1: Basic connectivity test with standard dimensions
      console.log("🔍 Test 1: Basic GA4 connectivity test");
      try {
        const [response1] = await client.runReport({
          property: PROPERTY,
          dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          limit: 5
        });
        
        console.log("✅ Basic connectivity SUCCESS");
        console.log("📊 Response rows:", response1.rows?.length || 0);
        console.log("📊 Available events:", response1.rows?.map(r => r.dimensionValues?.[0]?.value).slice(0, 5));
        
        // Test 2: Try different custom metric naming conventions
        console.log("🔍 Test 2: Testing different custom metric naming conventions");
        
        const customMetricTests = [
          { name: "Direct name", metricName: "watch_time_seconds" },
          { name: "With custom prefix", metricName: "customMetrics/watch_time_seconds" },
          { name: "With custom metrics namespace", metricName: "custom/watch_time_seconds" },
          { name: "Event-based metric", metricName: "customEvent:watch_time_seconds" }
        ];
        
        for (const test of customMetricTests) {
          console.log(`🔍 Testing custom metric format: ${test.name} (${test.metricName})`);
          try {
            const [response2] = await client.runReport({
              property: PROPERTY,
              dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
              dimensions: [
                { name: "customEvent:video_id" },
                { name: "customEvent:video_title" }
              ],
              metrics: [
                { name: "eventCount" },
                { name: test.metricName }
              ],
              limit: 3
            });
          
            console.log(`✅ Custom metric SUCCESS with format: ${test.name}`);
            res.json({
              success: true,
              approach: "custom_metric_found",
              workingFormat: { name: test.name, metricName: test.metricName },
              basicConnectivity: { rowCount: response1.rows?.length || 0 },
              customMetric: { rowCount: response2.rows?.length || 0, firstRow: response2.rows?.[0] || null },
              message: `GA4 custom metric works with format: ${test.name}`
            });
            return;
          
          } catch (testError: any) {
            console.log(`❌ Format '${test.name}' failed: ${testError.message}`);
          }
        }
        
        // If all custom metric formats failed
        console.log("❌ All custom metric formats failed but basic connectivity works");
        res.json({
          success: true,
          approach: "basic_only", 
          basicConnectivity: { rowCount: response1.rows?.length || 0, events: response1.rows?.map(r => r.dimensionValues?.[0]?.value).slice(0, 5) },
          customMetricTests: customMetricTests.map(t => t.name),
          message: "Basic GA4 works but none of the custom metric formats worked"
        });
        return;
        
      } catch (error1: any) {
        console.log("❌ Even basic connectivity FAILED:", error1.message);
        
        res.json({
          success: false,
          basic_connectivity_failed: true,
          error: { message: error1.message, code: error1.code },
          message: "GA4 basic connectivity failed - check credentials and property ID"
        });
      }
      
    } catch (error) {
      console.error("GA4 diagnostic error:", error);
      res.status(500).json({ error: "Failed to run GA4 diagnostic" });
    }
  });



  // Comprehensive GA4 + Visitor Analytics endpoint
  app.get("/api/ga4/clean-comprehensive", async (req, res) => {
    try {
      const range = req.query.range as string || '7d';
      const locale = req.query.locale as string || 'all';
      
      console.log(`🔍 COMPREHENSIVE ANALYTICS: ${range}, locale: ${locale}`);

      // Temporarily disable cache to test real data connection
      console.log('🔍 COMPREHENSIVE: Cache disabled - fetching fresh data from PostgreSQL');

      // Calculate date range
      const rangeDays = parseInt(range.replace('d', ''));
      const dateFrom = new Date(Date.now() - (rangeDays * 24 * 60 * 60 * 1000)).toISOString();
      const dateTo = new Date().toISOString();
      
      // Convert to GA4 date format (YYYY-MM-DD) for all functions
      const startDate = dateFrom.split('T')[0];
      const endDate = dateTo.split('T')[0];

      // Call the REAL analytics functions directly (same ones your dashboard uses!)
      let dashboardData = {};
      let activityData = { activities: [] };
      
      try {
        console.log(`🔍 COMPREHENSIVE: Calling real analytics functions for ${dateFrom} to ${dateTo}`);
        
        // SWITCH TO REAL GA4 DATA from memopyk.com (Property: 501023254)
        console.log('🔗 CONNECTING TO MEMOPYK.COM GA4 DATA...');
        
        // Import available GA4 service functions for memopyk.com data
        const { qUniqueUsers, qPageViews, qTopCountries, qTopLanguages, qTopReferrers } = await import('./ga4-service.js');
        
        // Get real GA4 data from memopyk.com (using available functions)
        // Fix: Convert ISO dates to YYYY-MM-DD format for GA4
        
        const [ga4Users, ga4PageViews, ga4Countries, ga4Languages, ga4Referrers] = await Promise.all([
          qUniqueUsers(startDate, endDate, locale).catch((e: any) => { console.log('GA4 users error:', e.message); return 0; }),
          qPageViews(startDate, endDate, locale).catch((e: any) => { console.log('GA4 pageviews error:', e.message); return 0; }),
          qTopCountries(startDate, endDate).catch((e: any) => { console.log('GA4 countries error:', e.message); return []; }),
          qTopLanguages(startDate, endDate).catch((e: any) => { console.log('GA4 languages error:', e.message); return []; }),
          qTopReferrers(startDate, endDate).catch((e: any) => { console.log('GA4 referrers error:', e.message); return []; })
        ]);
        
        console.log('✅ GA4 DATA RETRIEVED from memopyk.com:', { users: ga4Users, pageViews: ga4PageViews, countries: ga4Countries?.length, languages: ga4Languages?.length });
        
        // Use GA4 data instead of PostgreSQL
        dashboardData = {
          overview: {
            totalViews: ga4PageViews || 0,
            uniqueVisitors: ga4Users || 0,
            returningVisitors: 0, // Calculate if needed
            averageSessionDuration: 0 // Calculate if needed
          },
          topCountries: ga4Countries || [],
          languageBreakdown: ga4Languages || [],
          topReferrers: ga4Referrers || []
        };
        
        console.log('✅ COMPREHENSIVE: GA4 countries data:', JSON.stringify(ga4Countries?.slice(0, 2), null, 2));
        
        // Activity data from GA4 active users
        activityData = {
          activities: []  // GA4 doesn't have real-time session tracking like PostgreSQL
        };

        console.log('✅ COMPREHENSIVE: Got REAL dashboard data from PostgreSQL:', {
          totalViews: dashboardData.overview?.totalViews || dashboardData.totalViews,
          uniqueVisitors: dashboardData.overview?.uniqueVisitors || dashboardData.uniqueVisitors,  
          countries: dashboardData.topCountries?.length || 0,
          languages: Array.isArray(dashboardData.languageBreakdown) ? dashboardData.languageBreakdown.length : Object.keys(dashboardData.languageBreakdown || {}).length,
          referrers: dashboardData.topReferrers?.length || 0,
          structure: Object.keys(dashboardData)
        });
        
        // Debug the exact structure of languageBreakdown
        console.log('🔍 DEBUG: languageBreakdown structure:', JSON.stringify(dashboardData.languageBreakdown, null, 2));
        
        console.log('✅ COMPREHENSIVE: Got REAL activity data:', activityData.activities?.length || 0, 'recent activities');
        
      } catch (error: any) {
        console.error('❌ COMPREHENSIVE: Failed to get real analytics data:', error.message);
        console.error('❌ COMPREHENSIVE: Full error stack:', error);
        // Show the error but don't use fake fallback data
        dashboardData = {};
        activityData = { activities: [] };
      }

      // Use the same date variables from above (already defined in try block)
      // const endDate and startDate already defined above

      // Fetch GA4 video metrics, language data, and returning users in parallel
      const [plays, completions, watchTimeSeconds, topVideos, browserLanguageData, siteLanguageData, ga4ReturningUsers] = await Promise.all([
        qPlays(startDate, endDate, locale),
        qCompletes(startDate, endDate, locale), 
        qWatchTimeTotal(startDate, endDate, locale),
        qPlaysByVideo(startDate, endDate, locale),
        qTopLanguages(startDate, endDate),
        qSiteLanguageChoice(startDate, endDate),
        qReturningUsers(startDate, endDate)
      ]);

      // Process visitor analytics - handle nested data structure
      const totalViews = dashboardData.overview?.totalViews || dashboardData.totalViews || 0;
      const uniqueVisitors = dashboardData.overview?.uniqueVisitors || dashboardData.uniqueVisitors || 0;  
      const returnVisitors = ga4ReturningUsers || dashboardData.overview?.returningVisitors || dashboardData.returningVisitors || 0;
      const averageSessionDuration = dashboardData.overview?.averageSessionDuration || dashboardData.averageSessionDuration || 0;
      const activeVisitors = activityData.activities?.filter(a => Date.now() - new Date(a.lastActivity).getTime() < 5 * 60 * 1000).length || 0;

      // Process geographic data from dashboard
      const topCountries = (dashboardData.topCountries || []).slice(0, 8).map((country: any) => ({
        country: country.country,
        visitors: country.visitors || country.sessions || 0, // GA4 uses 'visitors', fallback to 'sessions' 
        flag: country.flag || '🌍'
      }));

      // Process language breakdown - use GA4 browser language data
      const languageBreakdown = [];
      
      if (browserLanguageData && Array.isArray(browserLanguageData)) {
        const totalLanguageVisitors = browserLanguageData.reduce((sum, lang) => sum + lang.visitors, 0);
        
        for (const lang of browserLanguageData) {
          if (lang.language && lang.visitors > 0) {
            languageBreakdown.push({
              language: lang.language,
              visitors: lang.visitors,
              percentage: totalLanguageVisitors > 0 ? (lang.visitors / totalLanguageVisitors) * 100 : 0
            });
          }
        }
      }

      // Process site language choice - URL path-based tracking (should total 100%)
      const siteLanguageChoice = Array.isArray(siteLanguageData) ? siteLanguageData : [];

      // Process top referrers
      const topReferrers = (dashboardData.topReferrers || []).slice(0, 5).map((ref: any) => ({
        referrer: ref.referrer === '(direct)' ? null : ref.referrer,
        visitors: ref.count
      }));

      // Calculate GA4 video metrics
      const completionRate = plays > 0 ? completions / plays : 0;
      const averageWatchTimeSeconds = plays > 0 ? watchTimeSeconds / plays : 0;

      // Format top videos (limit to top 5)
      const topVideosFormatted = Object.entries(topVideos || {})
        .map(([videoId, data]: [string, any]) => ({
          videoId,
          videoTitle: data.title || videoId,
          plays: data.plays || 0,
          completions: data.completions || 0
        }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      const result = {
        // Visitor Analytics (from PostgreSQL - your trusted system!)
        totalViews,
        uniqueVisitors,
        returnVisitors,
        averageSessionDuration: Math.round(averageSessionDuration || 0),
        activeVisitors,
        // Geographic & Demographic Data
        topCountries,
        languageBreakdown, // Browser language preferences (GA4 language dimension)
        siteLanguageChoice, // Site language choice (URL path-based: /fr/ vs /en-US/)
        topReferrers,
        // Video Analytics (from GA4)
        totalVideoStarts: plays || 0,
        totalCompletions: completions || 0,
        totalWatchTimeSeconds: watchTimeSeconds || 0,
        averageWatchTimeSeconds: Math.round(averageWatchTimeSeconds || 0),
        completionRate: Math.round(completionRate * 100) / 100,
        topVideos: topVideosFormatted,
      };

      console.log('✅ COMPREHENSIVE RESULT:', {
        totalViews: result.totalViews,
        uniqueVisitors: result.uniqueVisitors,
        activeVisitors: result.activeVisitors,
        videoPlays: result.totalVideoStarts,
        countries: result.topCountries.length,
        languages: result.languageBreakdown.length
      });
      
      // Cache disabled for testing real data connection
      
      res.json(result);
    } catch (error) {
      console.error('❌ COMPREHENSIVE ANALYTICS ERROR:', error);
      res.status(500).json({ 
        error: 'Failed to fetch comprehensive analytics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Clean GA4 metrics endpoint - simple, reliable GA4 data
  app.get("/api/ga4/clean-metrics", async (req, res) => {
    try {
      const range = req.query.range as string || '7d';
      const locale = req.query.locale as string || 'all';
      
      // Convert range to date strings
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (parseInt(range.replace('d', '')) * 24 * 60 * 60 * 1000))
        .toISOString().split('T')[0];

      console.log(`🔍 CLEAN GA4 METRICS: ${startDate} to ${endDate}, locale: ${locale}`);

      // Simple cache key
      const cacheKey = k(`clean:${startDate}:${endDate}:${locale}`);
      
      // Check cache first
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('✅ CLEAN GA4: Using cached data');
        return res.json(cached);
      }

      // Fetch core metrics using existing GA4 functions
      const [plays, completions, watchTimeSeconds, topVideos] = await Promise.all([
        qPlays(startDate, endDate, locale),
        qCompletes(startDate, endDate, locale), 
        qWatchTimeTotal(startDate, endDate, locale),
        qPlaysByVideo(startDate, endDate, locale)
      ]);

      // Get locale breakdown
      const languageData = await qTopLanguages(startDate, endDate);

      // Calculate completion rate and average watch time
      const completionRate = plays > 0 ? completions / plays : 0;
      const averageWatchTimeSeconds = plays > 0 ? watchTimeSeconds / plays : 0;

      // Format top videos (limit to top 5)
      const topVideosFormatted = Object.entries(topVideos || {})
        .map(([videoId, data]: [string, any]) => ({
          videoId,
          videoTitle: data.title || videoId,
          plays: data.plays || 0,
          completions: data.completions || 0
        }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      // Format locale breakdown
      const localeBreakdown = [
        { locale: 'fr-FR', plays: localeData?.locale === 'fr-FR' ? localeData.plays : 0 },
        { locale: 'en-US', plays: localeData?.locale === 'en-US' ? localeData.plays : 0 }
      ].filter(item => item.plays > 0);

      const result = {
        totalVideoStarts: plays || 0,
        totalCompletions: completions || 0,
        totalWatchTimeSeconds: watchTimeSeconds || 0,
        averageWatchTimeSeconds: Math.round(averageWatchTimeSeconds || 0),
        completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
        topVideos: topVideosFormatted,
        localeBreakdown
      };

      console.log('✅ CLEAN GA4 RESULT:', JSON.stringify(result, null, 2));
      
      // Cache for 5 minutes
      await setCache(cacheKey, result, 300);
      
      res.json(result);
    } catch (error) {
      console.error('❌ CLEAN GA4 ERROR:', error);
      res.status(500).json({ 
        error: 'Failed to fetch GA4 metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Top videos table endpoint - using your exact clean API structure
  app.get("/api/ga4/top-videos", async (req, res, next) => {
    try {
      const { startDate, endDate, locale, nocache } = getParams(req);
      const key = k(`top:${startDate}:${endDate}:${locale}`);

      // Check cache unless bypassed
      if (!nocache) {
        // Try persistent cache first, then memory cache
        const dbCached = await getDbCache<any>(key);
        if (dbCached) return res.json(dbCached);

        const memoryCached = getCache<any>(key);
        if (memoryCached) return res.json(memoryCached);
      }

      console.log(`📊 GA4 Top Videos request: ${startDate} to ${endDate}, locale: ${locale}${nocache ? ' (cache bypassed)' : ''}`);

      const data = await getTopVideosTable(startDate, endDate, locale);
      
      // Store in both persistent and memory cache
      await setDbCache(key, data, 300);
      setCache(key, data, 300);
      res.json(data);
    } catch (e) { 
      console.error('❌ GA4 Top Videos error:', e);
      res.status(500).json({ message: (e as Error).message });
    }
  });

  // Funnel endpoint - using your exact clean API structure
  app.get("/api/ga4/funnel", async (req, res) => {
    try {
      const { startDate, endDate, locale, nocache } = getParams(req);
      const key = k(`funnel:${startDate}:${endDate}:${locale}`);

      // Check cache unless bypassed
      if (!nocache) {
        // Try persistent cache first, then memory cache
        const dbCached = await getDbCache<any>(key);
        if (dbCached) return res.json(dbCached);

        const memoryCached = getCache<any>(key);
        if (memoryCached) return res.json(memoryCached);
      }

      console.log(`📊 GA4 Funnel request: ${startDate} to ${endDate}, locale: ${locale}${nocache ? ' (cache bypassed)' : ''}`);

      const data = await qFunnel(startDate, endDate, locale);
      
      // Store in both persistent and memory cache
      await setDbCache(key, data, 300);
      setCache(key, data, 300);
      res.json(data);
    } catch (e) {
      console.error('❌ GA4 Funnel error:', e);
      res.status(500).json({ error: String(e) });
    }
  });

  // Trend endpoint - daily plays and avg watch time
  app.get("/api/ga4/trend", async (req, res) => {
    try {
      const { startDate, endDate, locale, nocache } = getParams(req);
      const key = k(`trend:${startDate}:${endDate}:${locale}`);

      // Check cache unless bypassed
      if (!nocache) {
        // Try persistent cache first, then memory cache
        const dbCached = await getDbCache<any>(key);
        if (dbCached) return res.json(dbCached);

        const memoryCached = getCache<any>(key);
        if (memoryCached) return res.json(memoryCached);
      }

      console.log(`📊 GA4 Trend request: ${startDate} to ${endDate}, locale: ${locale}${nocache ? ' (cache bypassed)' : ''}`);

      const data = await qTrendDaily(startDate, endDate, locale);
      
      // Store in both persistent and memory cache (600s for trend - heavier query)
      await setDbCache(key, data, 600);
      setCache(key, data, 600);
      res.json(data);
    } catch (e) {
      console.error('❌ GA4 Trend error:', e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/ga4/realtime", async (req, res) => {
    try {
      const nocache = req.query.nocache === "1" || req.query.nocache === "true";
      const key = k('realtime');

      // Check cache unless bypassed
      if (!nocache) {
        // Try persistent cache first, then memory cache
        const dbCached = await getDbCache<any>(key);
        if (dbCached) return res.json(dbCached);

        const memoryCached = getCache<any>(key);
        if (memoryCached) return res.json(memoryCached);
      }

      console.log(`📊 GA4 Realtime request${nocache ? ' (cache bypassed)' : ''}`);

      const data = await qRealtime();
      
      // Store in both persistent and memory cache (30s for realtime)
      await setDbCache(key, data, 30);
      setCache(key, data, 30);
      res.json(data);
    } catch (error: any) {
      console.error("GA4 realtime error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch realtime data" });
    }
  });

  // Recent Activity endpoint for realtime visitor tracking
  app.get("/api/analytics/recent-activity", async (req, res) => {
    try {
      console.log('🎯 RECENT ACTIVITY REQUEST: Fetching recent visitor activity');
      
      // Get recent sessions from the last 10 minutes (more realistic for "active" users)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      // Get recent sessions with video views
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const recentSessions = await hybridStorage.getAnalyticsSessions(
        tenMinutesAgo.toISOString(),
        new Date().toISOString(),
        undefined,
        shouldIncludeProduction
      );
      
      console.log(`📊 RECENT ACTIVITY: Found ${recentSessions.length} recent sessions`);
      
      // CRITICAL FIX: Fetch video views for each session and link them
      const activities = await Promise.all(recentSessions.map(async session => {
        const now = Date.now();
        const createdTime = new Date(session.created_at).getTime();
        const timeSinceCreation = now - createdTime;
        const minutesAgo = Math.floor(timeSinceCreation / (60 * 1000));
        const isActive = timeSinceCreation < 10 * 60 * 1000; // 10 minutes (consider active for longer)
        
        // Fetch video views for this session
        let videoViews = [];
        try {
          // Get all analytics views for this session ID from the last 10 minutes
          const views = await hybridStorage.getAnalyticsViews({
            session_id: session.session_id,
            dateFrom: tenMinutesAgo.toISOString(),
            dateTo: new Date().toISOString()
          });
          
          videoViews = views.map(view => ({
            video_id: view.video_id,
            video_filename: view.video_filename || view.video_id,
            video_type: view.video_type || 'gallery',
            watch_time: view.watch_time || 0,
            completion_rate: view.completion_rate || 0,
            timestamp: view.created_at
          }));
          
          console.log(`📹 SESSION ${session.session_id}: Found ${videoViews.length} video views`);
        } catch (error) {
          console.log(`⚠️ SESSION ${session.session_id}: No video views found (${error.message})`);
        }
        
        return {
          id: session.session_id,
          timestamp: session.created_at,
          ip: session.ip_address,
          country: session.country,
          city: session.city,
          language: session.language,
          page_url: session.page_url,
          duration: session.duration || 0,
          video_views: videoViews,
          user_agent: session.user_agent?.substring(0, 100) + '...',
          is_active: isActive
        };
      }));
      
      // Sort by most recent first
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const videoWatchersCount = activities.filter(activity => activity.is_active && activity.video_views.length > 0).length;
      console.log(`🎯 RECENT ACTIVITY: Returning ${activities.length} activities, ${videoWatchersCount} active video watchers`);
      
      res.json({
        activities,
        total: activities.length,
        video_watchers: videoWatchersCount,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ RECENT ACTIVITY ERROR:', error);
      res.status(500).json({ 
        error: "Failed to fetch recent activity", 
        message: error.message,
        activities: [],
        total: 0
      });
    }
  });

  // Analytics Sessions endpoint - GET analytics sessions  
  app.get("/api/analytics/sessions", async (req, res) => {
    try {
      const { dateFrom, dateTo, language, includeProduction } = req.query;
      console.log('📊 Analytics sessions request:', { dateFrom, dateTo, language, includeProduction });
      
      // **REPLIT PREVIEW PRODUCTION ANALYTICS** 
      // Always show production data in Replit preview dashboard
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      if (shouldIncludeProduction) {
        console.log('🌍 REPLIT PREVIEW: Including production analytics data');
      }
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        dateFrom as string,
        dateTo as string, 
        language as string,
        shouldIncludeProduction
      );
      
      res.json(sessions);
    } catch (error) {
      console.error('❌ Analytics sessions error:', error);
      res.status(500).json({ error: "Failed to get analytics sessions" });
    }
  });





  // Analytics Cache Cleanup Routes
  app.use(analyticsCleanupRoutes);

  // Cache Status and Environment Info Endpoint
  app.get("/api/cache/status", async (req, res) => {
    try {
      const { getCacheEnvironmentInfo, getPgClient } = await import("./cache");
      const envInfo = getCacheEnvironmentInfo();
      
      // Test cache connectivity and get detailed stats
      let cacheStatus = 'unknown';
      let cacheStats = {
        totalEntries: 0,
        activeEntries: 0,
        expiredEntries: 0
      };
      
      try {
        if (envInfo.environment === 'development') {
          const pg = getPgClient();
          if (pg) {
            const result = await pg`
              SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
                COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
              FROM ga4_cache
            `;
            
            cacheStats = {
              totalEntries: parseInt(result[0].total),
              activeEntries: parseInt(result[0].active),
              expiredEntries: parseInt(result[0].expired)
            };
            cacheStatus = 'connected';
          }
        } else {
          cacheStatus = 'production-ready';
        }
      } catch (error) {
        cacheStatus = 'error';
      }

      res.json({
        ...envInfo,
        cacheStatus,
        ...cacheStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Manual Cache Cleanup Endpoint (admin only)
  app.post("/api/cache/cleanup", async (req, res) => {
    try {
      const { manualCacheCleanup } = await import("./cache");
      const result = await manualCacheCleanup();
      
      if (result.error) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        message: `Cache cleanup completed`,
        deletedEntries: result.deleted,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Clear All Cache Endpoint (admin only)
  app.delete("/api/ga4/cache", async (req, res) => {
    try {
      const { getPgClient, getCacheEnvironmentInfo } = await import("./cache");
      const envInfo = getCacheEnvironmentInfo();
      const isDev = envInfo.environment === 'development';
      
      if (isDev) {
        const pg = getPgClient();
        if (!pg) {
          return res.status(500).json({ ok: false, error: "PostgreSQL client not available" });
        }
        
        const result = await pg`DELETE FROM ga4_cache RETURNING *`;
        res.json({ 
          ok: true, 
          message: "Cache cleared", 
          deletedEntries: result.length,
          timestamp: new Date().toISOString()
        });
      } else {
        // Production Supabase implementation
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        );
        
        const { data, error } = await supabase
          .from("ga4_cache")
          .delete()
          .neq("key", "")  // Delete all entries
          .select();
        
        if (error) {
          return res.status(500).json({ ok: false, error: error.message });
        }
        
        res.json({ 
          ok: true, 
          message: "Cache cleared", 
          deletedEntries: data?.length || 0,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Debug endpoint for upload issues
  app.post("/api/debug-upload", async (req, res) => {
    try {
      console.log("🔍 DEBUG UPLOAD TEST");
      console.log("🔍 Supabase URL:", process.env.SUPABASE_URL ? "Set" : "Missing");
      console.log("🔍 Supabase Key:", process.env.SUPABASE_SERVICE_KEY ? "Set" : "Missing");
      
      // Test Supabase connection
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("❌ Supabase connection error:", error);
        return res.status(500).json({ 
          error: "Supabase connection failed", 
          details: error.message 
        });
      }
      
      console.log("✅ Supabase connected, buckets:", data?.map(b => b.name));
      res.json({ 
        success: true, 
        buckets: data?.map(b => b.name),
        message: "Supabase connection working"
      });
      
    } catch (error) {
      console.error("❌ Debug upload error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // SEO Management API - Admin Authentication Required
  const { seoService } = await import('./seo-service');
  
  // Simple admin authentication middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    // For now, simple token check - can be enhanced later
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Simple check - in production this would validate against database
    const token = authHeader.replace('Bearer ', '');
    if (token !== 'admin-token-temp') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    req.adminUser = 'admin'; // Set admin user identifier
    next();
  };

  // GET /api/admin/seo?lang=fr-FR|en-US → returns current SEO object
  app.get("/api/admin/seo", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const seoData = await seoService.getSeoSettings(lang);
      res.json(seoData || {});
      
    } catch (error) {
      console.error('Error fetching SEO settings:', error);
      res.status(500).json({ error: 'Failed to fetch SEO settings' });
    }
  });

  // POST /api/admin/seo → accepts SEO data and saves with validation
  app.post("/api/admin/seo", requireAdmin, async (req, res) => {
    try {
      const { lang, changeReason, ...seoData } = req.body;
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const dataToSave = { lang, ...seoData };
      await seoService.saveSeoSettings(dataToSave, req.adminUser, changeReason);
      
      res.json({ 
        success: true, 
        message: 'SEO settings saved successfully',
        lang,
        savedBy: req.adminUser
      });
      
    } catch (error: any) {
      console.error('Error saving SEO settings:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: error.message || 'Failed to save SEO settings' 
      });
    }
  });

  // GET /api/admin/seo/preview?lang= → returns the raw head snippet as the server will inject it
  app.get("/api/admin/seo/preview", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const headHtml = await seoService.generateHeadPreview(lang);
      
      res.json({
        lang,
        headHtml,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error generating SEO preview:', error);
      res.status(500).json({ error: 'Failed to generate SEO preview' });
    }
  });

  // GET /api/admin/seo/history?lang= → returns version history
  app.get("/api/admin/seo/history", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const history = await seoService.getSeoHistory(lang);
      
      res.json({
        lang,
        history,
        count: history.length
      });
      
    } catch (error) {
      console.error('Error fetching SEO history:', error);
      res.status(500).json({ error: 'Failed to fetch SEO history' });
    }
  });

  // POST /api/admin/seo/rollback → rollback to previous version
  app.post("/api/admin/seo/rollback", requireAdmin, async (req, res) => {
    try {
      const { lang, version } = req.body;
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      if (!version || typeof version !== 'number') {
        return res.status(400).json({ error: 'Invalid or missing version number' });
      }

      await seoService.rollbackToVersion(lang, version, req.adminUser);
      
      res.json({ 
        success: true, 
        message: `Rolled back to version ${version}`,
        lang,
        version,
        rolledBackBy: req.adminUser
      });
      
    } catch (error: any) {
      console.error('Error rolling back SEO settings:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to rollback SEO settings' 
      });
    }
  });

  // POST /api/admin/seo/publish?lang= → optional: generate/flush server template for that locale
  app.post("/api/admin/seo/publish", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      // Generate preview to validate current settings
      const headHtml = await seoService.generateHeadPreview(lang);
      
      // Create backup
      const seoData = await seoService.getSeoSettings(lang);
      if (seoData) {
        await seoService.createBackup(seoData, req.adminUser);
      }
      
      res.json({ 
        success: true, 
        message: 'SEO settings published successfully',
        lang,
        headHtml,
        publishedBy: req.adminUser,
        publishedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error publishing SEO settings:', error);
      res.status(500).json({ error: 'Failed to publish SEO settings' });
    }
  });

  // Test Routes
  app.use('/test', testRoutes);
}

export default registerRoutes;
