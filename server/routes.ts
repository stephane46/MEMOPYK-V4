import type { Express } from "express";
import { createServer, type Server } from "http";
import { hybridStorage } from "./hybrid-storage";
import { z } from "zod";
import { videoCache } from "./video-cache";
import fs, { createReadStream, existsSync, statSync, mkdirSync, openSync, closeSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import testRoutes from './test-routes';
import { setCacheAndOriginHeaders } from './cache-origin-headers';
import { createCacheHitHeaders, createCacheMissHeaders, getUpstreamSource, getCacheAge } from './cache-delivery-headers';
import { analyticsCleanupRoutes } from './routes-analytics-cache-cleanup';

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
        upsert: true // Allow overwriting existing files
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
      const { filename, fileType, bucket } = req.body;
      
      if (!filename || !bucket) {
        return res.status(400).json({ error: "Filename and bucket are required" });
      }

      // Validate bucket name
      const allowedBuckets = ['memopyk-videos']; // Unified bucket for all media
      if (!allowedBuckets.includes(bucket)) {
        return res.status(400).json({ error: "Invalid bucket name" });
      }

      console.log(`🎬 GENERATING SIGNED URL for direct upload:`);
      console.log(`   - Original filename: ${filename}`);
      console.log(`   - File type: ${fileType}`);
      console.log(`   - Target bucket: ${bucket}`);

      const { signedUrl, publicUrl } = await generateSignedUploadUrl(filename, bucket);
      
      // Extract the actual filename from the public URL
      const actualFilename = publicUrl.split('/').pop();
      
      res.json({
        success: true,
        signedUrl,
        publicUrl,
        filename: actualFilename
      });

    } catch (error) {
      console.error('❌ Failed to generate signed upload URL:', error);
      res.status(500).json({ error: "Failed to generate upload URL" });
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
          .jpeg({ quality: 100, progressive: true })  // 100% quality as requested
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
        const jsonPath = path.join(__dirname, 'data', 'gallery-items.json');
        
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
          
          items[itemIndex].crop_settings = cropSettings;
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
        const jsonPath = path.join(__dirname, '..', 'server', 'data', 'gallery.json');
        const data = fs.readFileSync(jsonPath, 'utf8');
        const items = JSON.parse(data);
        const currentItem = items.find((item: any) => item.id.toString() === itemId.toString());
        const useSameVideo = currentItem?.use_same_video;
        
        let updateData;
        if (useSameVideo) {
          // When use_same_video is true, update BOTH language fields
          updateData = { 
            static_image_url_en: staticImageUrl, 
            static_image_url_fr: staticImageUrl, 
            crop_settings: cropSettings 
          };
          console.log(`🔗 Hybrid storage: Setting both EN and FR to same URL (use_same_video: true)`);
        } else {
          // When use_same_video is false, only update the specific language field
          updateData = language === 'fr' 
            ? { static_image_url_fr: staticImageUrl, crop_settings: cropSettings }
            : { static_image_url_en: staticImageUrl, crop_settings: cropSettings };
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
      const textId = parseInt(req.params.id);
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
      
      const appliedText = await hybridStorage.updateHeroText(String(textId), updateData);
      
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

      console.log('📊 Analytics session creation:', {
        ...req.body,
        server_detected_ip: clientIp,
        server_detected_language: detectedLanguage
      });

      // Enhanced session data with server-side detection
      const sessionData = {
        ...req.body,
        ip_address: clientIp,
        language: detectedLanguage, // Use server-detected language, not client localStorage
        user_agent: req.headers['user-agent'] || req.body.user_agent || '',
        session_id: req.body.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const session = await hybridStorage.createAnalyticsSession(sessionData);
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

  // Recent Visitors - GET last 10 visitor details for flip card
  app.get("/api/analytics/recent-visitors", async (req, res) => {
    try {
      console.log('👥 Recent Visitors: Fetching last 10 visitor details...');
      
      const sessions = await hybridStorage.getAnalyticsSessions();
      
      // Get unique visitors with their latest session info
      const visitorMap = new Map();
      
      sessions.forEach(session => {
        const ip = session.ip_address;
        if (!visitorMap.has(ip) || new Date(session.created_at) > new Date(visitorMap.get(ip).created_at)) {
          visitorMap.set(ip, {
            ip_address: ip,
            country: session.country || 'Unknown',
            language: session.language || 'Unknown', 
            last_visit: session.created_at,
            user_agent: session.user_agent ? session.user_agent.substring(0, 50) + '...' : 'Unknown'
          });
        }
      });
      
      // Convert to array and sort by most recent
      const recentVisitors = Array.from(visitorMap.values())
        .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime())
        .slice(0, 10); // Take last 10 visitors
      
      console.log(`✅ Recent Visitors: Found ${recentVisitors.length} unique visitors`);
      res.json(recentVisitors);
    } catch (error) {
      console.error('❌ Recent Visitors: Error fetching visitor details:', error);
      res.status(500).json({ error: 'Failed to load recent visitors' });
    }
  });

  // MISSING ANALYTICS ENDPOINTS - CRITICAL FOR DASHBOARD

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
      const { duration } = req.body;
      const sessionId = (req as any).session?.id || 'anonymous';
      
      console.log(`📊 SESSION UPDATE: Duration ${duration}s for session ${sessionId}`);
      
      if (!duration || duration < 0) {
        return res.status(400).json({ error: "Valid duration required" });
      }
      
      // Update session duration in storage
      await hybridStorage.updateSessionDuration(sessionId, duration);
      
      res.json({ 
        success: true, 
        sessionId,
        duration,
        message: "Session duration updated successfully" 
      });
    } catch (error) {
      console.error('❌ Session update error:', error);
      res.status(500).json({ error: "Failed to update session duration" });
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
    // FORCE PRODUCTION LOGGING - This MUST appear in production logs
    console.error(`🚨 PRODUCTION FORCE LOG HEAD: Video proxy HEAD request for ${req.query.filename} at ${new Date().toISOString()}`);
    await handleVideoProxy(req, res);
  });

  app.get("/api/video-proxy", async (req, res) => {
    // FORCE PRODUCTION LOGGING - This MUST appear in production logs
    console.error(`🚨 PRODUCTION FORCE LOG GET: Video proxy GET request for ${req.query.filename} at ${new Date().toISOString()}`);
    await handleVideoProxy(req, res);
  });
  

  
  async function handleVideoProxy(req: any, res: any) {
    const VERSION = "v1.0.1754932191.ULTRA_DETAILED_LOGGING";
    const filename = req.query.filename as string;
    
    // ULTRA DETAILED LOGGING FOR PRODUCTION COMPARISON
    console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG START - ${filename} 🚨🚨🚨`);
    console.error(`📋 REQUEST METADATA:`);
    console.error(`   - Timestamp: ${new Date().toISOString()}`);
    console.error(`   - Version: ${VERSION}`);
    console.error(`   - Filename: "${filename}"`);
    console.error(`   - Method: ${req.method}`);
    console.error(`   - Full URL: ${req.url}`);
    console.error(`   - Query: ${JSON.stringify(req.query)}`);
    
    console.error(`📋 ENVIRONMENT DETAILS:`);
    console.error(`   - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.error(`   - NODE_VERSION: ${process.version}`);
    console.error(`   - Working Directory: ${process.cwd()}`);
    console.error(`   - __dirname: ${__dirname}`);
    console.error(`   - Platform: ${process.platform}`);
    console.error(`   - Architecture: ${process.arch}`);
    
    console.error(`📋 REQUEST HEADERS (FULL):`);
    Object.keys(req.headers).forEach(key => {
      console.error(`   - ${key}: "${req.headers[key]}"`);
    });
    
    console.error(`📋 VIDEO TYPE CLASSIFICATION:`);
    const isHeroVideo = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(filename);
    const isGalleryVideo = !isHeroVideo && filename && filename.endsWith('.mp4');
    console.error(`   - Is Hero Video: ${isHeroVideo}`);
    console.error(`   - Is Gallery Video: ${isGalleryVideo}`);
    console.error(`   - Video Category: ${isHeroVideo ? 'HERO' : isGalleryVideo ? 'GALLERY' : 'UNKNOWN'}`);
    
    // CRITICAL: Gallery videos MUST bypass cache and stream from CDN
    if (isGalleryVideo) {
      console.error(`🚨 GALLERY VIDEO DETECTED: ${filename} - FORCING CDN STREAM (BYPASSING CACHE)`);
      console.log(`🌐 GALLERY VIDEO: Bypassing cache, streaming directly from Supabase CDN`);
      // Skip cache check and go directly to CDN streaming
      await streamFromCDN(filename, req, res, VERSION);
      return;
    }
    
    console.log(`🎬 VIDEO PROXY ${VERSION} - HERO VIDEO CACHE APPROACH`);
    console.log(`   - Filename: "${filename}"`);
    console.log(`   - Range: "${req.headers.range}"`);
    console.log(`   - User Agent: "${req.headers['user-agent']}"`);
    console.log(`   - Referer: "${req.headers.referer}"`);
    console.log(`   - Origin: "${req.headers.origin}"`);
    console.log(`   - Accept: "${req.headers.accept}"`);
    console.log(`   - Method: ${req.method}`);
    console.log(`   - Full URL: ${req.url}`);
    console.log(`   - Query: ${JSON.stringify(req.query)}`);
    
    if (!filename) {
      console.log(`❌ Missing filename parameter`);
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      console.log(`🔍 STARTING VIDEO PROXY PROCESSING FOR: ${filename}`);
      console.log(`🔍 NODE VERSION: ${process.version}`);
      console.log(`🔍 ENVIRONMENT: ${process.env.NODE_ENV}`);
      console.log(`🔍 WORKING DIR: ${process.cwd()}`);
      console.log(`🔍 __DIRNAME: ${__dirname}`);
      // ULTRA DETAILED CACHE ANALYSIS
      console.error(`📋 CACHE ANALYSIS FOR ${filename}:`);
      console.log(`🔍 Cache check for: ${filename}`);
      let cachedVideo = videoCache.getCachedVideoPath(filename);
      console.log(`🔍 Cache path result: ${cachedVideo}`);
      console.error(`   - Cache Path: ${cachedVideo || 'NULL'}`);
      
      const fileExists = cachedVideo ? existsSync(cachedVideo) : false;
      console.log(`🔍 File exists check: ${fileExists}`);
      console.error(`   - File Exists: ${fileExists}`);
      
      if (cachedVideo && fileExists) {
        try {
          const stats = statSync(cachedVideo);
          console.error(`   - File Size: ${stats.size} bytes`);
          console.error(`   - File Modified: ${stats.mtime}`);
          console.error(`   - File Permissions: ${stats.mode.toString(8)}`);
          console.error(`   - Is File: ${stats.isFile()}`);
          console.error(`   - Is Directory: ${stats.isDirectory()}`);
        } catch (statError: any) {
          console.error(`   - Stat Error: ${statError.message || statError}`);
        }
        
        console.log(`📦 Serving video from cache: ${filename}`);
        console.error(`📋 ATTEMPTING CACHE SERVE FOR ${filename}`);
        console.log(`🎯 CALLING serveVideoFromCache with path: ${cachedVideo}`);
        try {
          console.log(`🔄 EXECUTING serveVideoFromCache function...`);
          console.error(`   - About to call serveVideoFromCache`);
          serveVideoFromCache(cachedVideo, req, res);
          console.log(`✅ SUCCESSFULLY CALLED serveVideoFromCache`);
          console.error(`   - serveVideoFromCache called successfully`);
          console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (CACHE SUCCESS) - ${filename} 🚨🚨🚨`);
          return;
        } catch (cacheError: any) {
          console.error(`❌ CACHE SERVE ERROR for ${filename}:`, cacheError);
          console.error(`❌ Cache path: ${cachedVideo}`);
          console.error(`❌ Error details:`, cacheError.message);
          console.error(`❌ Error stack:`, cacheError.stack);
          console.error(`❌ Error type:`, cacheError.constructor.name);
          console.error(`📋 CACHE SERVE FAILED - FALLING BACK TO CDN`);
          // Continue to CDN fallback
        }
      } else {
        console.error(`📋 CACHE MISS - NO CACHED FILE FOR ${filename}`);
        console.error(`   - Cache path was: ${cachedVideo || 'NULL'}`);
        console.error(`   - File exists was: ${fileExists}`);
      }
      
      // ULTRA DETAILED CDN FALLBACK
      console.log(`🌐 Video not cached, streaming directly from Supabase: ${filename}`);
      console.error(`📋 CDN FALLBACK FOR ${filename}:`);
      const encodedFilename = encodeURIComponent(filename);
      const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
      console.error(`   - Original filename: ${filename}`);
      console.error(`   - Encoded filename: ${encodedFilename}`);
      console.error(`   - Supabase URL: ${supabaseUrl}`);
      console.error(`   - Range header: ${req.headers.range || 'NONE'}`);
      
      const fetch = (await import('node-fetch')).default;
      console.error(`   - About to fetch from Supabase...`);
      const response = await fetch(supabaseUrl, {
        headers: {
          'Range': req.headers.range || 'bytes=0-',
          'User-Agent': 'MEMOPYK-VideoProxy/1.0'
        }
      });
      
      console.error(`   - Supabase response status: ${response.status}`);
      console.error(`   - Supabase response statusText: ${response.statusText}`);
      console.error(`   - Supabase response ok: ${response.ok}`);
      console.error(`   - Supabase response headers:`);
      response.headers.forEach((value, key) => {
        console.error(`     - ${key}: ${value}`);
      });
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch video from Supabase: ${response.status} ${response.statusText}`);
        console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (CDN FAILED) - ${filename} 🚨🚨🚨`);
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
      console.error(`✅ GALLERY CDN STREAM COMPLETE: ${filename}`);
      console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (GALLERY CDN SUCCESS) - ${filename} 🚨🚨🚨`);
    });
  }
  
  // Helper function to serve video from cache
  function serveVideoFromCache(cachedVideo: string, req: any, res: any) {
    console.log(`🔍 SERVE VIDEO FROM CACHE - DEBUG v1.0.1754928116:`);
    console.log(`   - Cache path: ${cachedVideo}`);
    console.log(`   - File exists: ${existsSync(cachedVideo)}`);
    console.log(`   - Range header: ${req.headers.range}`);
    
    try {
      const stat = statSync(cachedVideo);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      console.log(`   - File size: ${fileSize} bytes`);
      console.log(`   - File modified: ${stat.mtime}`);
      console.log(`   - Processing range: ${range}`);
    
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

  // Analytics Cache Cleanup Routes
  app.use(analyticsCleanupRoutes);

  // Test Routes
  app.use('/test', testRoutes);
}

export default registerRoutes;
