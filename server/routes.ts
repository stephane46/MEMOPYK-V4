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
        res.setHeader('X-Storage', deliveryHeaders['X-Storage']);
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
      res.setHeader('X-Storage', deliveryHeaders['X-Storage']);
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
          console.error(`❌ Sharp processing failed for direct upload:`, autoGenError.message, autoGenError.stack);
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
        console.error(`❌ Sharp processing failed:`, autoGenError.message, autoGenError.stack);
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
      const { font_size, font_size_desktop, font_size_tablet, font_size_mobile } = req.body;
      
      await hybridStorage.deactivateAllHeroTexts();
      
      const updateData: any = {
        is_active: true,
        font_size: font_size || font_size_desktop || 48
      };
      
      // Add responsive font sizes if provided
      if (font_size_desktop) updateData.font_size_desktop = font_size_desktop;
      if (font_size_tablet) updateData.font_size_tablet = font_size_tablet;
      if (font_size_mobile) updateData.font_size_mobile = font_size_mobile;
      
      const appliedText = await hybridStorage.updateHeroText(textId, updateData);
      
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
      
      // Use simple redirect to video proxy - this bypasses internal forwarding issues
      const targetUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
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

  // SIMPLIFIED VIDEO PROXY - Fixed for Gallery Videos v1.0.51
  app.get("/api/video-proxy", async (req, res) => {
    const filename = req.query.filename as string;
    
    console.log(`🎬 VIDEO PROXY v1.0.51 - SIMPLIFIED APPROACH`);
    console.log(`   - Filename: "${filename}"`);
    console.log(`   - Range: "${req.headers.range}"`);
    
    if (!filename) {
      console.log(`❌ Missing filename parameter`);
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      // Simple filename-based approach - direct Supabase streaming for gallery videos
      const encodedFilename = encodeURIComponent(filename);
      const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
      
      // Check if this is a hero video that should use cache
      const isHeroVideo = filename.includes('VideoHero') || filename.includes('Hero');
      
      if (isHeroVideo) {
        // Use existing cache logic for hero videos
        let cachedVideo = videoCache.getCachedVideoPath(filename);
        
        if (cachedVideo && existsSync(cachedVideo)) {
          console.log(`📦 Serving hero video from cache: ${filename}`);
          return serveVideoFromCache(cachedVideo, req, res);
        } else {
          console.log(`🚨 Hero video not cached, downloading: ${filename}`);
          await videoCache.downloadAndCacheVideo(filename, supabaseUrl);
          cachedVideo = videoCache.getCachedVideoPath(filename);
          if (cachedVideo && existsSync(cachedVideo)) {
            return serveVideoFromCache(cachedVideo, req, res);
          }
        }
      }
      
      // For gallery videos or if hero video cache fails, stream directly from Supabase
      console.log(`🌐 Streaming directly from Supabase: ${filename}`);
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(supabaseUrl, {
        headers: {
          'Range': req.headers.range || 'bytes=0-',
          'User-Agent': 'MEMOPYK-VideoProxy/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch video from Supabase: ${response.status} ${response.statusText}`);
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
        'Cache-Control': 'public, max-age=3600'
      };
      
      if (contentRange) headers['Content-Range'] = contentRange;
      if (contentLength) headers['Content-Length'] = contentLength;
      if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
      
      const statusCode = response.status === 206 ? 206 : 200;
      res.writeHead(statusCode, headers);
      
      if (response.body) {
        response.body.pipe(res);
      } else {
        res.end();
      }
      
    } catch (error: any) {
      console.error(`❌ Video proxy error for ${filename}:`, error);
      res.status(500).json({ 
        error: "Video proxy failed",
        filename,
        message: error.message,
        version: "v1.0.51-simplified"
      });
    }
  });
  
  // Helper function to serve video from cache
  function serveVideoFromCache(cachedVideo: string, req: any, res: any) {
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
      
      const stream = createReadStream(cachedVideo);
      stream.pipe(res);
    }
  }

  // Image serving endpoint for cached images
            
            const statusCode = response.status === 206 ? 206 : 200;
            res.writeHead(statusCode, headers);
            
            if (response.body) {
              response.body.pipe(res);
            } else {
              res.end();
            }
            return;
            
          } catch (streamError: any) {
            console.error(`❌ DIRECT STREAM FAILED for ${decodedFilename}: ${streamError.message}`);
            return res.status(500).json({ 
              error: `Video not available - cache and stream both failed`,
              filename: decodedFilename,
              details: `Cache: ${downloadError.message}, Stream: ${streamError.message}`,
              version: "v1.0.40-universal-fallback",
              timestamp: Date.now()
            });
          }
        }
      }
      
      // At this point, video MUST be cached - serve only from local storage
      if (cachedVideo && existsSync(cachedVideo)) {
        console.log(`📦 Serving from LOCAL cache (MANDATORY): ${videoFilename}`);
        
        const stat = statSync(cachedVideo);
        const fileSize = stat.size;
        console.log(`   - File size: ${fileSize} bytes`);

        if (range) {
          console.log(`   - Processing range request: ${range}`);
          const parts = range.replace(/bytes=/, "").split("-");
          // CRITICAL FIX: Handle empty end range properly (e.g., "bytes=0-")
          const start = parseInt(parts[0], 10) || 0;
          let end = fileSize - 1;
          
          if (parts[1] && parts[1].trim()) {
            const parsedEnd = parseInt(parts[1], 10);
            if (!isNaN(parsedEnd)) {
              end = parsedEnd;
            }
          }
          
          // PRODUCTION BUG FIX: Validate that we don't have NaN values or invalid ranges
          if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
            console.error(`🚨 INVALID RANGE: start=${start}, end=${end}, range=${range}, fileSize=${fileSize}`);
            return res.status(416).json({ 
              error: "Invalid range request",
              debug: { start, end, range, fileSize },
              version: "v1.0.50-route-entry-debug"
            });
          }
          
          const chunksize = (end - start) + 1;
          console.log(`   - Range: ${start}-${end}, chunk size: ${chunksize}`);

          // TIMEOUT SAFEGUARD v1.0.50 - Comprehensive debug before streaming
          console.log(`🎯 PRODUCTION STREAM DEBUG v1.0.50-route-entry-debug - About to serve video:`, {
            filename: videoFilename,
            fullPath: cachedVideo,
            fileExists: existsSync(cachedVideo),
            fileStats: existsSync(cachedVideo) ? statSync(cachedVideo) : 'FILE_NOT_FOUND',
            rangeStart: start,
            rangeEnd: end,
            chunkSize: chunksize,
            cwd: process.cwd(),
            __dirname: __dirname,
            nodeEnv: process.env.NODE_ENV,
            version: "v1.0.50-route-entry-debug"
          });

          // Test file existence just before reading
          if (!existsSync(cachedVideo)) {
            console.error(`❌ CRITICAL: File does not exist at path: ${cachedVideo}`);
            return res.status(500).json({ 
              error: 'Cached video file not found',
              path: cachedVideo,
              filename: videoFilename
            });
          }

          let stream;
          try {
            console.log(`🔥 CREATING READ STREAM for: ${cachedVideo}`);
            stream = createReadStream(cachedVideo, { start, end });
            console.log(`✅ READ STREAM CREATED successfully for: ${videoFilename}`);
            
            // Add comprehensive stream error handling BEFORE piping
            stream.on('error', (streamError: any) => {
              console.error(`❌ STREAM ERROR DURING PIPE for ${videoFilename}:`, {
                error: streamError.message,
                code: streamError.code,
                stack: streamError.stack,
                filename: videoFilename,
                path: cachedVideo,
                headersSent: res.headersSent,
                timestamp: new Date().toISOString()
              });
              
              // Log to production error system
              logProductionError(streamError, {
                type: 'stream_pipe_error',
                filename: videoFilename,
                path: cachedVideo,
                headersSent: res.headersSent,
                phase: 'during_pipe_operation'
              });
              
              if (!res.headersSent) {
                res.status(500).json({
                  error: 'Stream pipe error',
                  details: streamError.message,
                  code: streamError.code,
                  filename: videoFilename,
                  version: 'v1.0.50-route-entry-debug'
                });
              }
            });
            
          } catch (streamCreateError: any) {
            console.error(`❌ FAILED TO CREATE READ STREAM for ${cachedVideo}:`, streamCreateError.message);
            
            // Log to production error system
            logProductionError(streamCreateError, {
              type: 'createReadStream_failure',
              filename: videoFilename,
              path: cachedVideo,
              fileExists: existsSync(cachedVideo),
              workingDirectory: process.cwd(),
              dirname: __dirname,
              nodeEnv: process.env.NODE_ENV
            });
            
            return res.status(500).json({ 
              error: 'Failed to create read stream',
              details: streamCreateError.message,
              filename: videoFilename,
              path: cachedVideo,
              version: 'v1.0.50-route-entry-debug'
            });
          }
          
          // PRE-PIPE DIAGNOSTIC v1.0.47 - Silent fast stream failure analysis
          console.log(`[PROXY] 🔍 Entering pre-pipe diagnostic for ${videoFilename}`);
          console.log(`[PROXY] Stream readable:`, stream.readable);
          console.log(`[PROXY] Stream destroyed:`, stream.destroyed);
          console.log(`[PROXY] Response writable:`, res.writable);
          console.log(`[PROXY] Response headersSent:`, res.headersSent);
          
          // Add detailed stream event monitoring BEFORE pipe
          stream.on("data", (chunk) => {
            console.log(`[PROXY] Stream read successful – chunk size:`, chunk.length, `for ${videoFilename}`);
          });
          stream.on("end", () => {
            console.log(`[PROXY] Stream ended cleanly for ${videoFilename}`);
          });
          stream.on("error", (err) => {
            console.error(`[PROXY] Stream emitted error for ${videoFilename}:`, err);
            logProductionError(err, {
              type: 'stream_data_error',
              filename: videoFilename,
              phase: 'pre_pipe_stream_monitoring'
            });
          });
          
          console.log(`[PROXY] Pre-pipe status for ${videoFilename}:`, {
            headersSent: res.headersSent,
            resWritable: res.writable,
            streamReadable: stream.readable,
            start, end, chunksize,
            timestamp: new Date().toISOString()
          });
          
          // Verify res.headersSent before setting headers
          if (res.headersSent) {
            console.error(`[PROXY] HEADERS ALREADY SENT for ${videoFilename} - Cannot set response headers`);
            logProductionError(new Error('Headers already sent'), {
              type: 'headers_already_sent',
              filename: videoFilename,
              phase: 'pre_header_check'
            });
            return;
          }
          
          // Set headers with comprehensive error handling
          console.log(`[PROXY] About to write headers for ${videoFilename}`);
          try {
            const deliveryHeaders = bypassCache ? createCacheMissHeaders('supabase') : createCacheHitHeaders('supabase', getCacheAge(cachedVideo));
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'range, content-type',
              'Cache-Control': 'public, max-age=86400',
              'X-Delivery': deliveryHeaders['X-Delivery'],
              'X-Upstream': deliveryHeaders['X-Upstream'],
              'X-Storage': deliveryHeaders['X-Storage'],
              'X-Content-Bytes': fileSize.toString()
            });
            console.log(`[PROXY] Headers written successfully for ${videoFilename}`);
          } catch (headerError: any) {
            console.error(`[PROXY] writeHead error for ${videoFilename}:`, headerError);
            logProductionError(headerError, {
              type: 'write_head_error',
              filename: videoFilename,
              headersSent: res.headersSent,
              phase: 'write_head_operation'
            });
            return;
          }
          
          // Add comprehensive error listeners BEFORE piping
          stream.on('error', (error) => {
            console.error(`[PROXY] Stream error during pipe for ${videoFilename}:`, error);
            logProductionError(error, {
              type: 'stream_error_during_pipe',
              filename: videoFilename,
              phase: 'stream_pipe_operation',
              errorDetails: {
                errorType: error.constructor.name,
                errorMessage: error.message,
                errorCode: (error as any).code || 'unknown'
              }
            });
            
            if (!res.headersSent) {
              res.status(500).json({ 
                error: 'Stream error during pipe',
                details: error.message,
                code: (error as any).code || 'unknown',
                filename: videoFilename,
                version: 'v1.0.50-route-entry-debug'
              });
            }
          });
          
          res.on('error', (error) => {
            console.error(`[PROXY] Response stream error for ${videoFilename}:`, error);
            logProductionError(error, {
              type: 'response_stream_error',
              filename: videoFilename,
              phase: 'response_writing',
              errorDetails: {
                errorType: error.constructor.name,
                errorMessage: error.message,
                errorCode: (error as any).code || 'unknown'
              }
            });
          });
          
          // v1.0.48 ENHANCED PIPE LOGGING - Before and after pipe operation
          console.log(`[PROXY] 🔧 IMMEDIATELY BEFORE stream.pipe(res) for ${videoFilename}`);
          console.log(`[PROXY] Pre-pipe response state:`, {
            statusCode: res.statusCode,
            finished: res.finished,
            writableEnded: res.writableEnded,
            destroyed: res.destroyed,
            headersSent: res.headersSent
          });
          
          try {
            stream.pipe(res);
            console.log(`[PROXY] ✅ IMMEDIATELY AFTER stream.pipe(res) succeeded for ${videoFilename}`);
            console.log(`[PROXY] Post-pipe response state:`, {
              statusCode: res.statusCode,
              finished: res.finished,
              writableEnded: res.writableEnded,
              destroyed: res.destroyed,
              headersSent: res.headersSent
            });
            
            // TIMEOUT SAFEGUARD v1.0.46 - Detect silent stream failures
            const startTime = Date.now();
            let timeoutTriggered = false;
            
            // Monitor response lifecycle every 500ms
            const lifecycleMonitor = setInterval(() => {
              const elapsed = Date.now() - startTime;
              console.log(`[PROXY] Lifecycle monitor for ${videoFilename} at ${elapsed}ms:`, {
                headersSent: res.headersSent,
                finished: res.finished,
                writableEnded: res.writableEnded,
                destroyed: res.destroyed
              });
            }, 500);
            
            // Timeout safeguard after 3 seconds
            const timeoutSafeguard = setTimeout(() => {
              clearInterval(lifecycleMonitor);
              
              if (!res.finished && !res.writableEnded && !res.destroyed) {
                timeoutTriggered = true;
                console.warn(`[PROXY] TIMEOUT SAFEGUARD TRIGGERED for ${videoFilename} - Stream appears to have stalled`);
                console.warn(`[PROXY] Response state:`, {
                  headersSent: res.headersSent,
                  finished: res.finished,
                  writableEnded: res.writableEnded,
                  destroyed: res.destroyed,
                  elapsed: Date.now() - startTime
                });
                
                logProductionError(new Error('Stream timeout - silent failure detected'), {
                  type: 'stream_timeout_safeguard',
                  filename: videoFilename,
                  phase: 'timeout_after_pipe',
                  elapsedMs: Date.now() - startTime,
                  responseState: {
                    headersSent: res.headersSent,
                    finished: res.finished,
                    writableEnded: res.writableEnded,
                    destroyed: res.destroyed
                  }
                });
                
                // Force response completion to prevent hanging
                try {
                  if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                  }
                  if (!res.finished) {
                    res.end(JSON.stringify({
                      error: 'Stream timeout - silent failure detected',
                      filename: videoFilename,
                      version: 'v1.0.50-route-entry-debug',
                      elapsedMs: Date.now() - startTime
                    }));
                  }
                } catch (forceEndError: any) {
                  console.error(`[PROXY] Failed to force response end:`, forceEndError.message);
                }
              }
            }, 3000);
            
            // v1.0.48 ENHANCED RESPONSE LIFECYCLE LOGGING
            res.on('finish', () => {
              console.log(`[PROXY] 🏁 Response FINISH event for ${videoFilename} after ${Date.now() - startTime}ms`, {
                statusCode: res.statusCode,
                finished: res.finished,
                writableEnded: res.writableEnded,
                destroyed: res.destroyed,
                headersSent: res.headersSent
              });
              if (!timeoutTriggered) {
                clearTimeout(timeoutSafeguard);
                clearInterval(lifecycleMonitor);
              }
            });
            
            res.on('close', () => {
              console.log(`[PROXY] 🔒 Response CLOSE event for ${videoFilename} after ${Date.now() - startTime}ms`, {
                statusCode: res.statusCode,
                finished: res.finished,
                writableEnded: res.writableEnded,
                destroyed: res.destroyed,
                headersSent: res.headersSent
              });
              if (!timeoutTriggered) {
                clearTimeout(timeoutSafeguard);
                clearInterval(lifecycleMonitor);
              }
            });
            
            res.on('end', () => {
              console.log(`[PROXY] 🏆 Response END event for ${videoFilename} after ${Date.now() - startTime}ms`, {
                statusCode: res.statusCode,
                finished: res.finished,
                writableEnded: res.writableEnded,
                destroyed: res.destroyed,
                headersSent: res.headersSent
              });
            });
            
          } catch (pipeError: any) {
            console.error(`[PROXY] pipe error for ${videoFilename}:`, pipeError);
            logProductionError(pipeError, {
              type: 'pipe_synchronous_error',
              filename: videoFilename,
              phase: 'pipe_call_execution'
            });
          }
        } else {
          console.log(`   - Serving full file (no range)`);
          
          // FINAL-STAGE LOGGING v1.0.45 - Pre-pipe verification for full file
          console.log(`[PROXY] Pre-pipe status for full file ${videoFilename}:`, {
            headersSent: res.headersSent,
            resWritable: res.writable,
            fileSize,
            timestamp: new Date().toISOString()
          });
          
          if (res.headersSent) {
            console.error(`[PROXY] HEADERS ALREADY SENT for full file ${videoFilename}`);
            logProductionError(new Error('Headers already sent for full file'), {
              type: 'headers_already_sent_full_file',
              filename: videoFilename,
              phase: 'pre_header_check_full_file'
            });
            return;
          }
          
          console.log(`[PROXY] About to write headers for full file ${videoFilename}`);
          try {
            const deliveryHeaders = bypassCache ? createCacheMissHeaders('supabase') : createCacheHitHeaders('supabase', getCacheAge(cachedVideo));
            res.writeHead(200, {
              'Content-Length': fileSize,
              'Content-Type': 'video/mp4',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400',
              'X-Delivery': deliveryHeaders['X-Delivery'],
              'X-Upstream': deliveryHeaders['X-Upstream'],
              'X-Storage': deliveryHeaders['X-Storage'],
              'X-Content-Bytes': fileSize.toString()
            });
            console.log(`[PROXY] Headers written successfully for full file ${videoFilename}`);
          } catch (headerError: any) {
            console.error(`[PROXY] writeHead error for full file ${videoFilename}:`, headerError);
            logProductionError(headerError, {
              type: 'write_head_error_full_file',
              filename: videoFilename,
              phase: 'write_head_operation_full_file'
            });
            return;
          }
          
          const stream = createReadStream(cachedVideo);
          
          // Add comprehensive error listeners BEFORE piping (full file)
          stream.on('error', (error) => {
            console.error(`[PROXY] Stream error during full file pipe for ${videoFilename}:`, error);
            logProductionError(error, {
              type: 'stream_error_during_full_file_pipe',
              filename: videoFilename,
              phase: 'full_file_stream_pipe_operation',
              errorDetails: {
                errorType: error.constructor.name,
                errorMessage: error.message,
                errorCode: (error as any).code || 'unknown'
              }
            });
            
            if (!res.headersSent) {
              res.status(500).json({ 
                error: 'Full file stream error during pipe',
                details: error.message,
                code: (error as any).code || 'unknown',
                filename: videoFilename,
                version: 'v1.0.50-route-entry-debug'
              });
            }
          });
          
          res.on('error', (error) => {
            console.error(`[PROXY] Response stream error for full file ${videoFilename}:`, error);
            logProductionError(error, {
              type: 'response_stream_error_full_file',
              filename: videoFilename,
              phase: 'full_file_response_writing',
              errorDetails: {
                errorType: error.constructor.name,
                errorMessage: error.message,
                errorCode: (error as any).code || 'unknown'
              }
            });
          });
          
          // Pipe full file with detailed logging
          console.log(`[PROXY] About to start full file pipe operation for ${videoFilename}`);
          try {
            stream.pipe(res);
            console.log(`[PROXY] stream.pipe(res) succeeded for full file ${videoFilename}`);
          } catch (pipeError: any) {
            console.error(`[PROXY] pipe error for full file ${videoFilename}:`, pipeError);
            logProductionError(pipeError, {
              type: 'pipe_synchronous_error_full_file',
              filename: videoFilename,
              phase: 'full_file_pipe_call_execution'
            });
          }
        }
        return;
      }

      // This should NEVER happen - videos must always be served from cache
      console.error(`🚨 CRITICAL ERROR: Failed to cache video ${videoFilename} - cannot serve`);
      return res.status(500).json({ 
        error: `Critical caching failure - video cannot be served`,
        filename: videoFilename,
        message: "All videos must be served from local cache only"
      });

    } catch (error: any) {
      const filename = String(req.query.filename || 'unknown');
      console.error(`❌ VIDEO PROXY FATAL ERROR for ${filename}:`, error);
      console.error(`   - Error type: ${error.constructor.name}`);
      console.error(`   - Error message: ${error.message}`);
      console.error(`   - Error stack: ${error.stack}`);
      console.error(`   - Range header: ${req.headers.range}`);
      console.error(`   - Accept header: ${req.headers.accept}`);
      console.error(`   - Accept-Encoding: ${req.headers['accept-encoding']}`);
      console.error(`   - Connection: ${req.headers.connection}`);
      console.error(`   - sec-ch-ua-mobile: ${req.headers['sec-ch-ua-mobile']}`);
      console.error(`   - sec-ch-ua-platform: ${req.headers['sec-ch-ua-platform']}`);
      console.error(`   - sec-fetch-dest: ${req.headers['sec-fetch-dest']}`);
      console.error(`   - sec-fetch-mode: ${req.headers['sec-fetch-mode']}`);
      console.error(`   - Cache-Control: ${req.headers['cache-control']}`);
      console.error(`   - Pragma: ${req.headers.pragma}`);
      console.error(`   - Production Debug - Gallery Video Fix v1.0.18 - FULL HEADERS`);
      console.error(`   - COMPLETE HEADERS: ${JSON.stringify(req.headers, null, 2)}`);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Video streaming failed",
          filename: filename,
          details: error.message,
          version: "v1.0.45-final-stage-logging",
          rangeHeader: req.headers.range,
          acceptHeader: req.headers.accept,
          acceptEncoding: req.headers['accept-encoding'],
          connection: req.headers.connection,
          secChUaMobile: req.headers['sec-ch-ua-mobile'],
          secChUaPlatform: req.headers['sec-ch-ua-platform'],
          fullHeaders: req.headers,
          timestamp: new Date().toISOString()
        });
      }
    }
  });



  // GALLERY DEBUG: Test actual gallery URLs
  app.get("/api/debug/gallery-urls", async (req, res) => {
    try {
      const galleryItems = await hybridStorage.getGalleryItems();
      const urlTests = [];
      
      for (const item of galleryItems) {
        if (item.video_url_en) {
          // Extract filename the same way frontend does
          let filename = item.video_url_en.includes('/') ? item.video_url_en.split('/').pop() : item.video_url_en;
          
          try {
            const decodedFilename = decodeURIComponent(filename || '');
            filename = decodedFilename;
          } catch (e) {
            // If decoding fails, use original filename
          }
          
          const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename || '')}`;
          const cachedPath = await videoCache.getCachedVideoPath(filename || '');
          
          urlTests.push({
            itemTitle: item.title_en,
            originalUrl: item.video_url_en,
            extractedFilename: filename,
            generatedProxyUrl: proxyUrl,
            cachedPath: cachedPath,
            cacheExists: cachedPath ? require('fs').existsSync(cachedPath) : false
          });
        }
      }
      
      res.json({
        debug: "Gallery URL Analysis",
        timestamp: new Date().toISOString(),
        urlTests,
        instructions: "Compare originalUrl vs generatedProxyUrl vs cachedPath"
      });
      
    } catch (error: any) {
      res.json({
        debug: "Gallery URL debug error",
        error: error.message
      });
    }
  });

  // DEBUG ENDPOINT: Capture gallery video error logs
  app.get("/api/debug/gallery-video-error", async (req, res) => {
    const errorLogs: any[] = [];
    const originalConsoleError = console.error;
    
    // Capture console.error output
    console.error = (...args) => {
      errorLogs.push({
        timestamp: new Date().toISOString(),
        message: args.join(' ')
      });
      originalConsoleError(...args);
    };
    
    try {
      // Simulate video element request with video-specific Accept header
      const testReq = {
        query: { filename: 'gallery_Our_vitamin_sea_rework_2_compressed.mp4' },
        headers: {
          'accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'range': 'bytes=0-',
          'user-agent': 'Mozilla/5.0 (debug-test) VideoElement/Debug'
        },
        method: 'GET'
      };
      
      const testRes = {
        headersSent: false,
        writeHead: () => {},
        status: (code: number) => ({
          json: (data: any) => {
            errorLogs.push({
              timestamp: new Date().toISOString(),
              type: 'response',
              statusCode: code,
              data: data
            });
          }
        })
      };

      // Try to trigger the same error
      const filename = testReq.query.filename;
      const cachedVideo = await videoCache.getCachedVideoPath(filename);
      
      if (cachedVideo && existsSync(cachedVideo)) {
        const fileSize = statSync(cachedVideo).size;
        const stream = createReadStream(cachedVideo, { start: 0, end: fileSize - 1 });
        
        // Force an error to test error handling
        stream.destroy();
        
        setTimeout(() => {
          console.error = originalConsoleError;
          
          res.json({
            debug: "Gallery Video Error Investigation v1.0.17",
            timestamp: new Date().toISOString(),
            testRequest: {
              filename: filename,
              headers: testReq.headers,
              method: testReq.method
            },
            cacheInfo: {
              cachedPath: cachedVideo,
              exists: existsSync(cachedVideo),
              fileSize: fileSize
            },
            capturedLogs: errorLogs,
            instructions: "Check capturedLogs for enhanced v1.0.17 error details"
          });
        }, 100);
        
      } else {
        console.error = originalConsoleError;
        res.json({
          debug: "Gallery video not cached",
          filename: filename,
          cachePath: cachedVideo,
          capturedLogs: errorLogs
        });
      }
      
    } catch (error: any) {
      console.error = originalConsoleError;
      res.json({
        debug: "Debug endpoint error",
        error: error.message,
        capturedLogs: errorLogs
      });
    }
  });

  // Image proxy endpoint for serving cached images (Gallery Video Test)
  app.get("/api/image-proxy", async (req, res) => {
    console.log(`🖼️ PRODUCTION IMAGE PROXY ROUTE HIT! - ${new Date().toISOString()}`);
    console.log(`🖼️ Raw request URL: ${req.url}`);
    console.log(`🖼️ Filename param: ${req.query.filename}`);
    console.log(`🖼️ NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🖼️ User-Agent: ${req.headers['user-agent']}`);
    console.log(`🖼️ Current working directory: ${process.cwd()}`);
    
    try {
      const filename = req.query.filename as string;
      if (!filename) {
        console.log(`🖼️ PRODUCTION ERROR: Missing filename parameter`);
        return res.status(400).json({ error: "filename parameter required" });
      }

      // Clean filename of any query parameters or encoding
      const cleanFilename = decodeURIComponent(filename).split('?')[0];
      console.log(`🖼️ PRODUCTION: Processing image: ${cleanFilename}`);
      console.log(`🖼️ PRODUCTION: Original filename: ${filename}`);
      console.log(`🖼️ PRODUCTION: Clean filename: ${cleanFilename}`);

      // Check if image is cached
      const cachedImagePath = videoCache.getCachedImagePath(cleanFilename);
      console.log(`🖼️ PRODUCTION: Expected cache path: ${cachedImagePath}`);
      
      // Check if cache directory exists
      const cacheDir = require('path').join(process.cwd(), 'server/cache/images');
      console.log(`🖼️ PRODUCTION: Cache directory path: ${cacheDir}`);
      console.log(`🖼️ PRODUCTION: Cache directory exists: ${existsSync(cacheDir)}`);
      
      if (existsSync(cacheDir)) {
        try {
          const files = require('fs').readdirSync(cacheDir);
          console.log(`🖼️ PRODUCTION: Cache directory contains ${files.length} files:`, files.slice(0, 10));
        } catch (dirListError: any) {
          console.log(`🖼️ PRODUCTION: Error listing cache directory:`, dirListError.message);
        }
      }
      
      if (!cachedImagePath || !existsSync(cachedImagePath)) {
        console.log(`🔄 PRODUCTION: Image not cached, attempting download: ${cleanFilename}`);
        console.log(`🔄 PRODUCTION: Cache path exists check: ${cachedImagePath ? existsSync(cachedImagePath) : 'null path'}`);
        
        try {
          // Try to download and cache the image
          console.log(`📥 PRODUCTION: Starting download for: ${cleanFilename}`);
          await videoCache.downloadAndCacheImage(cleanFilename);
          
          // Get the newly cached path
          const newCachedPath = videoCache.getCachedImagePath(cleanFilename);
          console.log(`📦 PRODUCTION: New cached path: ${newCachedPath}`);
          console.log(`📦 PRODUCTION: New cached path exists: ${newCachedPath ? existsSync(newCachedPath) : 'null path'}`);
          
          if (!newCachedPath || !existsSync(newCachedPath)) {
            throw new Error('Failed to cache image');
          }
          
          console.log(`✅ PRODUCTION: Image successfully cached: ${cleanFilename}`);
          return serveImageFromCache(newCachedPath, cleanFilename, res);
          
        } catch (downloadError: any) {
          console.warn(`⚠️ PRODUCTION: Image download failed for ${cleanFilename}:`, downloadError.message);
          console.warn(`⚠️ PRODUCTION: Download error stack:`, downloadError.stack);
          
          // Fallback to direct Supabase URL
          const directUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodeURIComponent(cleanFilename)}`;
          console.log(`🔄 PRODUCTION FALLBACK: Redirecting to direct URL: ${directUrl}`);
          
          return res.redirect(directUrl);
        }
      }

      // Serve from cache
      console.log(`📦 PRODUCTION: Serving image from cache: ${cleanFilename}`);
      console.log(`📦 PRODUCTION: Cache file path: ${cachedImagePath}`);
      console.log(`📦 PRODUCTION: Cache file exists: ${existsSync(cachedImagePath)}`);
      
      if (existsSync(cachedImagePath)) {
        const stats = require('fs').statSync(cachedImagePath);
        console.log(`📦 PRODUCTION: Cache file size: ${stats.size} bytes`);
        console.log(`📦 PRODUCTION: Cache file modified: ${stats.mtime}`);
      }
      
      return serveImageFromCache(cachedImagePath, cleanFilename, res);

    } catch (error: any) {
      console.error(`❌ PRODUCTION IMAGE PROXY ERROR:`, error.message);
      console.error(`❌ PRODUCTION ERROR STACK:`, error.stack);
      res.status(500).json({ 
        error: "Image proxy failed",
        details: error.message,
        version: "v1.0-production-debug",
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Helper function to serve images from cache
  function serveImageFromCache(imagePath: string, filename: string, res: any) {
    try {
      console.log(`🖼️ PRODUCTION: serveImageFromCache called`);
      console.log(`🖼️ PRODUCTION: imagePath: ${imagePath}`);
      console.log(`🖼️ PRODUCTION: filename: ${filename}`);
      console.log(`🖼️ PRODUCTION: imagePath exists: ${existsSync(imagePath)}`);
      
      const stat = statSync(imagePath);
      const fileSize = stat.size;
      
      console.log(`🖼️ PRODUCTION: File size: ${fileSize} bytes`);
      console.log(`🖼️ PRODUCTION: File modified: ${stat.mtime}`);
      
      // Determine content type based on file extension
      const ext = filename.toLowerCase().split('.').pop();
      let contentType = 'image/jpeg'; // default
      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'webp') contentType = 'image/webp';
      
      console.log(`🖼️ PRODUCTION: Content type: ${contentType}`);
      console.log(`🖼️ PRODUCTION: Serving ${filename} (${fileSize} bytes) as ${contentType}`);
      
      const stream = createReadStream(imagePath);
      
      // Add error handling for stream
      stream.on('error', (error) => {
        console.error(`🖼️ PRODUCTION: Stream error for ${filename}:`, error);
      });
      
      stream.on('open', () => {
        console.log(`🖼️ PRODUCTION: Stream opened successfully for ${filename}`);
      });
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fileSize,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'X-Delivery': 'cache-hit',
        'X-Upstream': 'vps-storage',
        'X-Storage': 'local-cache',
        'X-Content-Bytes': fileSize.toString(),
        'X-Production-Debug': 'v1.0',
        'X-Cache-Path': imagePath
      });
      
      stream.on('error', (error) => {
        console.error(`❌ Image stream error for ${filename}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Image stream failed' });
        }
      });
      
      stream.pipe(res);
      
    } catch (error: any) {
      console.error(`❌ Serve image error for ${filename}:`, error);
      res.status(500).json({ error: 'Failed to serve cached image' });
    }
  }

  // Video cache health endpoint
  app.get("/api/video-proxy/health", async (req, res) => {
    try {
      const stats = await videoCache.getCacheStats();
      res.json({
        status: "healthy",
        cache: stats,
        timestamp: new Date().toISOString(),
        deployment: {
          version: "Gallery Video Fix v1.0.10 - MAXIMUM DEBUG DEPLOYMENT",
          urlEncoding: "Fixed double encoding bug + extensive production debugging",
          limits: "5000MB video, 5000MB image",
          debug: "Maximum debugging enabled for production troubleshooting",
          timestamp: Date.now()
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // Cache gallery videos endpoint
  app.post("/api/video-cache/cache-gallery-videos", async (req, res) => {
    try {
      console.log("🎬 Manual gallery video caching requested via admin panel");
      
      // Import hybrid storage to get gallery items
      const { hybridStorage } = await import('./hybrid-storage');
      const galleryItems = await hybridStorage.getGalleryItems();
      
      const galleryVideos = galleryItems
        .filter(item => item.video_url_en)
        .map(item => item.video_url_en!.split('/').pop()!)
        .filter(filename => filename);

      console.log(`📋 Found ${galleryVideos.length} gallery videos to cache`);
      
      let cached = 0;
      let skipped = 0;
      
      for (const filename of galleryVideos) {
        try {
          if (!videoCache.isVideoCached(filename)) {
            console.log(`⬇️ Caching gallery video: ${filename}`);
            const encodedFilename = encodeURIComponent(filename);
            const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${encodedFilename}`;
            console.log(`   - Original filename: ${filename}`);
            console.log(`   - Encoded for URL: ${encodedFilename}`);
            console.log(`   - Supabase URL: ${videoUrl}`);
            await videoCache.downloadAndCacheVideo(filename, videoUrl);
            cached++;
          } else {
            console.log(`✅ Gallery video already cached: ${filename}`);
            skipped++;
          }
        } catch (error) {
          console.error(`❌ Failed to cache gallery video ${filename}:`, error);
        }
      }
      
      const stats = await videoCache.getCacheStats();
      console.log(`🎬 Gallery video caching complete! Cached: ${cached}, Skipped: ${skipped}`);
      
      res.json({
        success: true,
        message: `Gallery video caching complete`,
        cached,
        skipped,
        totalFound: galleryVideos.length,
        cacheStats: stats
      });
      
    } catch (error: any) {
      console.error('Gallery video caching error:', error);
      res.status(500).json({ 
        error: "Failed to cache gallery videos",
        details: error.message 
      });
    }
  });

  // Admin authentication endpoint
  app.post("/api/auth/login", (req, res) => {
    console.log("🔐 AUTH LOGIN REQUEST RECEIVED:", req.body);
    try {
      const { username, password } = req.body;
      
      console.log(`🔐 Login attempt - Username: "${username}", Password: "${password ? '[PROVIDED]' : '[MISSING]'}"`);
      
      if (username === "admin" && password === "memopyk2025admin") {
        console.log("✅ Authentication successful");
        res.json({ 
          success: true, 
          message: "Authentication successful",
          token: "memopyk-admin-token-" + Date.now()
        });
      } else {
        console.log("❌ Authentication failed - Invalid credentials");
        res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }
    } catch (error) {
      console.error("❌ Authentication error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Authentication error" 
      });
    }
  });

  // Debug endpoint to verify auth route is registered
  app.get("/api/auth/test", (req, res) => {
    console.log("🔐 Auth test endpoint hit");
    res.json({
      message: "Auth routes are properly registered",
      timestamp: new Date().toISOString(),
      available_endpoints: ["/api/auth/login", "/api/auth/test"]
    });
  });

  // Emergency manual cache gallery video endpoint
  app.post("/api/video-cache/emergency-gallery", async (req, res) => {
    try {
      console.log("🚨 EMERGENCY GALLERY VIDEO CACHING INITIATED");
      
      // Force cache the gallery video that's causing 500 errors
      const galleryVideoFilename = "gallery_Our_vitamin_sea_rework_2_compressed.mp4";
      
      // Use video cache system to download and cache
      await videoCache.downloadAndCacheVideo(galleryVideoFilename);
      
      console.log("✅ EMERGENCY CACHE COMPLETE - Gallery video now cached");
      
      res.json({
        success: true,
        message: "Gallery video emergency caching complete",
        filename: galleryVideoFilename,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("❌ EMERGENCY CACHE FAILED:", error);
      res.status(500).json({
        success: false,
        error: "Emergency cache failed",
        details: error.message
      });
    }
  });

  // Production deployment test endpoint
  app.get("/api/deployment-test", (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    res.json({
      status: "Production deployment test",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      galleryCodeDeployed: fs.existsSync(path.join(__dirname, '../client/src/components/sections/GallerySection.tsx')),
      routesFileDeployed: fs.existsSync(__filename),
      cacheDirectoryExists: fs.existsSync(path.join(__dirname, 'cache/videos')),
      message: "If you see this in production with updated timestamp, latest code is deployed"
    });
  });

  // Analytics endpoints - Complete implementation
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const dashboard = await hybridStorage.getAnalyticsDashboard(
        dateFrom as string, 
        dateTo as string
      );
      res.json(dashboard);
    } catch (error) {
      console.error('Analytics dashboard error:', error);
      res.status(500).json({ error: "Failed to get analytics dashboard" });
    }
  });

  app.get("/api/analytics/views", async (req, res) => {
    try {
      const { dateFrom, dateTo, videoId } = req.query;
      const views = await hybridStorage.getAnalyticsViews(
        dateFrom as string,
        dateTo as string,
        videoId as string
      );
      res.json(views);
    } catch (error) {
      console.error('Analytics views error:', error);
      res.status(500).json({ error: "Failed to get analytics views" });
    }
  });

  app.get("/api/analytics/sessions", async (req, res) => {
    try {
      const { dateFrom, dateTo, language } = req.query;
      const sessions = await hybridStorage.getAnalyticsSessions(
        dateFrom as string,
        dateTo as string,
        language as string
      );
      res.json(sessions);
    } catch (error) {
      console.error('Analytics sessions error:', error);
      res.status(500).json({ error: "Failed to get analytics sessions" });
    }
  });

  app.get("/api/analytics/settings", async (req, res) => {
    try {
      const settings = await hybridStorage.getAnalyticsSettings();
      res.json(settings);
    } catch (error) {
      console.error('Analytics settings error:', error);
      res.status(500).json({ error: "Failed to get analytics settings" });
    }
  });

  app.patch("/api/analytics/settings", async (req, res) => {
    try {
      const updatedSettings = await hybridStorage.updateAnalyticsSettings(req.body);
      res.json({ success: true, settings: updatedSettings });
    } catch (error) {
      console.error('Analytics settings update error:', error);
      res.status(500).json({ error: "Failed to update analytics settings" });
    }
  });

  app.post("/api/analytics/video-view", async (req, res) => {
    try {
      const viewData = await hybridStorage.createAnalyticsView(req.body);
      console.log('📊 Video view tracked:', req.body.video_id, req.body.video_type);
      res.json({ success: true, view: viewData });
    } catch (error) {
      console.error('Video view tracking error:', error);
      res.status(500).json({ error: "Failed to track video view" });
    }
  });

  app.post("/api/analytics/session", async (req, res) => {
    try {
      const sessionData = await hybridStorage.createAnalyticsSession(req.body);
      console.log('📊 Session tracked:', sessionData.session_id);
      res.json({ success: true, session: sessionData });
    } catch (error) {
      console.error('Session tracking error:', error);
      res.status(500).json({ error: "Failed to track session" });
    }
  });

  app.post("/api/analytics/reset", async (req, res) => {
    try {
      await hybridStorage.resetAnalyticsData();
      res.json({ success: true, message: "Analytics data reset successfully" });
    } catch (error) {
      console.error('Analytics reset error:', error);
      res.status(500).json({ error: "Failed to reset analytics data" });
    }
  });

  // Data clearing endpoints for granular control
  app.post("/api/analytics/clear/sessions", async (req, res) => {
    try {
      await hybridStorage.clearAnalyticsSessions();
      res.json({ success: true, message: "Analytics sessions cleared successfully" });
    } catch (error) {
      console.error('Clear sessions error:', error);
      res.status(500).json({ error: "Failed to clear analytics sessions" });
    }
  });

  app.post("/api/analytics/clear/views", async (req, res) => {
    try {
      await hybridStorage.clearAnalyticsViews();
      res.json({ success: true, message: "Analytics views cleared successfully" });
    } catch (error) {
      console.error('Clear views error:', error);
      res.status(500).json({ error: "Failed to clear analytics views" });
    }
  });

  app.post("/api/analytics/clear/realtime-visitors", async (req, res) => {
    try {
      await hybridStorage.clearRealtimeVisitors();
      res.json({ success: true, message: "Real-time visitors cleared successfully" });
    } catch (error) {
      console.error('Clear real-time visitors error:', error);
      res.status(500).json({ error: "Failed to clear real-time visitors" });
    }
  });

  app.post("/api/analytics/clear/performance-metrics", async (req, res) => {
    try {
      await hybridStorage.clearPerformanceMetrics();
      res.json({ success: true, message: "Performance metrics cleared successfully" });
    } catch (error) {
      console.error('Clear performance metrics error:', error);
      res.status(500).json({ error: "Failed to clear performance metrics" });
    }
  });

  app.post("/api/analytics/clear/engagement-heatmap", async (req, res) => {
    try {
      await hybridStorage.clearEngagementHeatmap();
      res.json({ success: true, message: "Engagement heatmap cleared successfully" });
    } catch (error) {
      console.error('Clear engagement heatmap error:', error);
      res.status(500).json({ error: "Failed to clear engagement heatmap" });
    }
  });

  app.post("/api/analytics/clear/conversion-funnel", async (req, res) => {
    try {
      await hybridStorage.clearConversionFunnel();
      res.json({ success: true, message: "Conversion funnel data cleared successfully" });
    } catch (error) {
      console.error('Clear conversion funnel error:', error);
      res.status(500).json({ error: "Failed to clear conversion funnel data" });
    }
  });

  app.post("/api/analytics/clear/all", async (req, res) => {
    try {
      await hybridStorage.clearAllAnalyticsData();
      res.json({ success: true, message: "All analytics data cleared successfully" });
    } catch (error) {
      console.error('Clear all analytics data error:', error);
      res.status(500).json({ error: "Failed to clear all analytics data" });
    }
  });

  // IP Management endpoints
  app.get('/api/analytics/active-ips', async (req, res) => {
    try {
      const activeIps = await hybridStorage.getActiveViewerIps();
      res.json(activeIps);
    } catch (error) {
      console.error('Active IPs fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch active IPs' });
    }
  });

  app.post('/api/analytics/exclude-ip', async (req, res) => {
    try {
      const { ipAddress, comment } = req.body;
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      const settings = await hybridStorage.addExcludedIp(ipAddress, comment || '');
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Exclude IP error:', error);
      res.status(500).json({ error: 'Failed to exclude IP address' });
    }
  });

  app.patch('/api/analytics/exclude-ip/:ipAddress/comment', async (req, res) => {
    try {
      const { ipAddress } = req.params;
      const { comment } = req.body;
      const decodedIp = decodeURIComponent(ipAddress);
      
      if (!comment && comment !== '') {
        return res.status(400).json({ error: 'Comment is required' });
      }
      
      const settings = await hybridStorage.updateExcludedIpComment(decodedIp, comment);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Update IP comment error:', error);
      res.status(500).json({ error: 'Failed to update IP comment' });
    }
  });

  // Test Data Management Endpoints
  app.post('/api/analytics/test-data/generate', async (req, res) => {
    try {
      const result = await hybridStorage.generateTestAnalyticsData();
      res.json({ success: true, result });
    } catch (error) {
      console.error('Generate test data error:', error);
      res.status(500).json({ error: 'Failed to generate test data' });
    }
  });

  app.post('/api/analytics/test-data/clear', async (req, res) => {
    try {
      const result = await hybridStorage.clearTestDataOnly();
      res.json({ success: true, result });
    } catch (error) {
      console.error('Clear test data error:', error);
      res.status(500).json({ error: 'Failed to clear test data' });
    }
  });

  app.get('/api/analytics/test-data/status', async (req, res) => {
    try {
      const status = await hybridStorage.getTestDataStatus();
      res.json({ success: true, status });
    } catch (error) {
      console.error('Test data status error:', error);
      res.status(500).json({ error: 'Failed to get test data status' });
    }
  });

  // Historical threshold recalculation endpoint
  app.post('/api/analytics/recalculate-completions', async (req, res) => {
    try {
      const { threshold } = req.body;
      
      if (!threshold || threshold < 0 || threshold > 100) {
        return res.status(400).json({ error: 'Invalid threshold. Must be between 0 and 100.' });
      }
      
      const result = await hybridStorage.recalculateHistoricalCompletions(threshold);
      res.json({ success: true, result });
    } catch (error) {
      console.error('Error recalculating historical completions:', error);
      res.status(500).json({ error: 'Failed to recalculate historical completions' });
    }
  });

  // Time-series Analytics Endpoint
  app.get('/api/analytics/time-series', async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const timeSeriesData = await hybridStorage.getTimeSeriesData(
        dateFrom as string,
        dateTo as string
      );
      res.json(timeSeriesData);
    } catch (error) {
      console.error('Time-series analytics error:', error);
      res.status(500).json({ error: 'Failed to get time-series analytics data' });
    }
  });

  // Enhanced Video Analytics Endpoints
  app.get('/api/analytics/video-engagement/:videoId?', async (req, res) => {
    try {
      const { videoId } = req.params;
      const { dateFrom, dateTo } = req.query;
      
      const metrics = await hybridStorage.getVideoEngagementMetrics(
        videoId === 'all' ? undefined : videoId,
        dateFrom as string,
        dateTo as string
      );
      
      res.json({ success: true, metrics });
    } catch (error) {
      console.error('Video engagement metrics error:', error);
      res.status(500).json({ error: 'Failed to get video engagement metrics' });
    }
  });

  app.get('/api/analytics/unique-views', async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const uniqueViews = await hybridStorage.getUniqueVideoViews(
        dateFrom as string,
        dateTo as string
      );
      
      res.json({ success: true, uniqueViews });
    } catch (error) {
      console.error('Unique views analytics error:', error);
      res.status(500).json({ error: 'Failed to get unique views analytics' });
    }
  });

  app.get('/api/analytics/re-engagement', async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const reEngagement = await hybridStorage.getVideoReEngagementAnalytics(
        dateFrom as string,
        dateTo as string
      );
      
      res.json({ success: true, reEngagement });
    } catch (error) {
      console.error('Re-engagement analytics error:', error);
      res.status(500).json({ error: 'Failed to get re-engagement analytics' });
    }
  });

  app.delete('/api/analytics/exclude-ip/:ipAddress', async (req, res) => {
    try {
      const { ipAddress } = req.params;
      const decodedIp = decodeURIComponent(ipAddress);
      const settings = await hybridStorage.removeExcludedIp(decodedIp);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Remove excluded IP error:', error);
      res.status(500).json({ error: 'Failed to remove excluded IP address' });
    }
  });

  app.get("/api/analytics/export", async (req, res) => {
    try {
      const { format = 'json', dateFrom, dateTo } = req.query;
      const dashboard = await hybridStorage.getAnalyticsDashboard(
        dateFrom as string,
        dateTo as string
      );
      
      if (format === 'csv') {
        // Simple CSV export
        const sessions = await hybridStorage.getAnalyticsSessions(dateFrom as string, dateTo as string);
        const views = await hybridStorage.getAnalyticsViews(dateFrom as string, dateTo as string);
        
        const csvData = [
          'Type,Date,Country,Language,VideoID,WatchTime,CompletionRate',
          ...sessions.map((s: any) => `Session,${s.created_at},${s.country},${s.language},,,`),
          ...views.map((v: any) => `View,${v.created_at},,${v.language},${v.video_id},${v.watch_time},${v.completion_rate}`)
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics_export.csv');
        res.send(csvData);
      } else {
        res.json(dashboard);
      }
    } catch (error) {
      console.error('Analytics export error:', error);
      res.status(500).json({ error: "Failed to export analytics data" });
    }
  });

  // Real-time Analytics Endpoints
  app.get("/api/analytics/realtime-visitors", async (req, res) => {
    try {
      const visitors = await hybridStorage.getRealtimeVisitors();
      res.json(visitors);
    } catch (error) {
      console.error('Get realtime visitors error:', error);
      res.status(500).json({ error: "Failed to get realtime visitors" });
    }
  });

  app.post("/api/analytics/realtime-visitors", async (req, res) => {
    try {
      const visitor = await hybridStorage.createRealtimeVisitor(req.body);
      res.json({ success: true, visitor });
    } catch (error) {
      console.error('Create realtime visitor error:', error);
      res.status(500).json({ error: "Failed to create realtime visitor" });
    }
  });

  app.patch("/api/analytics/realtime-visitors/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { currentPage } = req.body;
      const visitor = await hybridStorage.updateVisitorActivity(sessionId, currentPage);
      res.json({ success: true, visitor });
    } catch (error) {
      console.error('Update visitor activity error:', error);
      res.status(500).json({ error: "Failed to update visitor activity" });
    }
  });

  app.delete("/api/analytics/realtime-visitors/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await hybridStorage.deactivateVisitor(sessionId);
      res.json({ success: true, message: "Visitor deactivated" });
    } catch (error) {
      console.error('Deactivate visitor error:', error);
      res.status(500).json({ error: "Failed to deactivate visitor" });
    }
  });

  // Performance Monitoring Endpoints
  app.get("/api/analytics/performance-metrics", async (req, res) => {
    try {
      const { metricType, from, to } = req.query;
      const timeRange = from && to ? { from: from as string, to: to as string } : undefined;
      const metrics = await hybridStorage.getPerformanceMetrics(metricType as string, timeRange);
      res.json(metrics);
    } catch (error) {
      console.error('Get performance metrics error:', error);
      res.status(500).json({ error: "Failed to get performance metrics" });
    }
  });

  app.post("/api/analytics/performance-metrics", async (req, res) => {
    try {
      const metric = await hybridStorage.recordPerformanceMetric(req.body);
      res.json({ success: true, metric });
    } catch (error) {
      console.error('Record performance metric error:', error);
      res.status(500).json({ error: "Failed to record performance metric" });
    }
  });

  app.get("/api/analytics/system-health", async (req, res) => {
    try {
      const health = await hybridStorage.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({ error: "Failed to get system health" });
    }
  });

  // Engagement Heatmap Endpoints
  app.get("/api/analytics/engagement-heatmap", async (req, res) => {
    try {
      const { pageUrl, from, to } = req.query;
      if (!pageUrl) {
        return res.status(400).json({ error: "pageUrl parameter is required" });
      }
      
      const timeRange = from && to ? { from: from as string, to: to as string } : undefined;
      const events = await hybridStorage.getEngagementHeatmap(pageUrl as string, timeRange);
      res.json(events);
    } catch (error) {
      console.error('Get engagement heatmap error:', error);
      res.status(500).json({ error: "Failed to get engagement heatmap" });
    }
  });

  app.post("/api/analytics/engagement-heatmap", async (req, res) => {
    try {
      const event = await hybridStorage.recordEngagementEvent(req.body);
      res.json({ success: true, event });
    } catch (error) {
      console.error('Record engagement event error:', error);
      res.status(500).json({ error: "Failed to record engagement event" });
    }
  });

  // Conversion Funnel Endpoints
  app.get("/api/analytics/conversion-funnel", async (req, res) => {
    try {
      const { from, to } = req.query;
      const timeRange = from && to ? { from: from as string, to: to as string } : undefined;
      const funnel = await hybridStorage.getConversionFunnel(timeRange);
      res.json(funnel);
    } catch (error) {
      console.error('Get conversion funnel error:', error);
      res.status(500).json({ error: "Failed to get conversion funnel" });
    }
  });

  app.post("/api/analytics/conversion-funnel", async (req, res) => {
    try {
      const step = await hybridStorage.recordConversionStep(req.body);
      res.json({ success: true, step });
    } catch (error) {
      console.error('Record conversion step error:', error);
      res.status(500).json({ error: "Failed to record conversion step" });
    }
  });

  app.get("/api/analytics/funnel-analytics", async (req, res) => {
    try {
      const { from, to } = req.query;
      const timeRange = from && to ? { from: from as string, to: to as string } : undefined;
      const analytics = await hybridStorage.getFunnelAnalytics(timeRange);
      res.json(analytics);
    } catch (error) {
      console.error('Get funnel analytics error:', error);
      res.status(500).json({ error: "Failed to get funnel analytics" });
    }
  });

  // ==================== SEO MANAGEMENT API ROUTES ====================
  
  // SEO Settings Management
  app.get('/api/seo/settings', async (req, res) => {
    try {
      const { page } = req.query;
      const settings = await hybridStorage.getSeoSettings(page as string);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Get SEO settings error:', error);
      res.status(500).json({ error: 'Failed to get SEO settings' });
    }
  });

  app.post('/api/seo/settings', async (req, res) => {
    try {
      const seoSettingsSchema = z.object({
        page: z.string().min(1),
        urlSlugEn: z.string().optional(),
        urlSlugFr: z.string().optional(),
        metaTitleEn: z.string().optional(),
        metaTitleFr: z.string().optional(),
        metaDescriptionEn: z.string().optional(),
        metaDescriptionFr: z.string().optional(),
        metaKeywordsEn: z.string().optional(),
        metaKeywordsFr: z.string().optional(),
        ogTitleEn: z.string().optional(),
        ogTitleFr: z.string().optional(),
        ogDescriptionEn: z.string().optional(),
        ogDescriptionFr: z.string().optional(),
        ogImageUrl: z.string().optional(),
        ogType: z.string().optional(),
        twitterCard: z.string().optional(),
        twitterTitleEn: z.string().optional(),
        twitterTitleFr: z.string().optional(),
        twitterDescriptionEn: z.string().optional(),
        twitterDescriptionFr: z.string().optional(),
        twitterImageUrl: z.string().optional(),
        canonicalUrl: z.string().optional(),
        robotsIndex: z.boolean().optional(),
        robotsFollow: z.boolean().optional(),
        robotsNoArchive: z.boolean().optional(),
        robotsNoSnippet: z.boolean().optional(),
        priority: z.string().optional(),
        changeFreq: z.string().optional(),
        isActive: z.boolean().optional()
      });

      const validatedData = seoSettingsSchema.parse(req.body);
      const settings = await hybridStorage.createSeoSettings(validatedData);
      res.json({ success: true, settings });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Create SEO settings error:', error);
      res.status(500).json({ error: 'Failed to create SEO settings' });
    }
  });

  app.patch('/api/seo/settings/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;
      const settings = await hybridStorage.updateSeoSettings(pageId, req.body);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Update SEO settings error:', error);
      res.status(500).json({ error: 'Failed to update SEO settings' });
    }
  });

  app.delete('/api/seo/settings/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;
      await hybridStorage.deleteSeoSettings(pageId);
      res.json({ success: true, message: 'SEO settings deleted' });
    } catch (error) {
      console.error('Delete SEO settings error:', error);
      res.status(500).json({ error: 'Failed to delete SEO settings' });
    }
  });

  // SEO Keywords Management
  app.get('/api/seo/keywords', async (req, res) => {
    try {
      const { keyword, language } = req.query;
      const keywords = await hybridStorage.getSeoKeywords(keyword as string, language as string);
      res.json({ success: true, keywords });
    } catch (error) {
      console.error('Get SEO keywords error:', error);
      res.status(500).json({ error: 'Failed to get SEO keywords' });
    }
  });

  app.post('/api/seo/keywords', async (req, res) => {
    try {
      const keywordSchema = z.object({
        keyword: z.string().min(1),
        language: z.enum(['en', 'fr']),
        searchVolume: z.number().optional(),
        difficulty: z.number().min(0).max(100).optional(),
        targetPage: z.string().optional(),
        isTargeted: z.boolean().default(true),
        competitorUrls: z.array(z.string()).optional()
      });

      const validatedData = keywordSchema.parse(req.body);
      const keyword = await hybridStorage.createSeoKeyword(validatedData);
      res.json({ success: true, keyword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Create SEO keyword error:', error);
      res.status(500).json({ error: 'Failed to create SEO keyword' });
    }
  });

  app.patch('/api/seo/keywords/:keywordId', async (req, res) => {
    try {
      const { keywordId } = req.params;
      const keyword = await hybridStorage.updateSeoKeyword(parseInt(keywordId), req.body);
      res.json({ success: true, keyword });
    } catch (error) {
      console.error('Update SEO keyword error:', error);
      res.status(500).json({ error: 'Failed to update SEO keyword' });
    }
  });

  app.delete('/api/seo/keywords/:keywordId', async (req, res) => {
    try {
      const { keywordId } = req.params;
      await hybridStorage.deleteSeoKeyword(parseInt(keywordId));
      res.json({ success: true, message: 'SEO keyword deleted' });
    } catch (error) {
      console.error('Delete SEO keyword error:', error);
      res.status(500).json({ error: 'Failed to delete SEO keyword' });
    }
  });

  // SEO Redirects Management
  app.get('/api/seo/redirects', async (req, res) => {
    try {
      const { fromPath } = req.query;
      const redirects = await hybridStorage.getSeoRedirects(fromPath as string);
      res.json({ success: true, redirects });
    } catch (error) {
      console.error('Get SEO redirects error:', error);
      res.status(500).json({ error: 'Failed to get SEO redirects' });
    }
  });

  app.post('/api/seo/redirects', async (req, res) => {
    try {
      const redirectSchema = z.object({
        fromPath: z.string().min(1),
        toPath: z.string().min(1),
        redirectType: z.number().int().min(300).max(399).default(301),
        description: z.string().optional(),
        isActive: z.boolean().default(true)
      });

      const validatedData = redirectSchema.parse(req.body);
      const redirect = await hybridStorage.createSeoRedirect(validatedData);
      res.json({ success: true, redirect });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Create SEO redirect error:', error);
      res.status(500).json({ error: 'Failed to create SEO redirect' });
    }
  });

  app.patch('/api/seo/redirects/:redirectId', async (req, res) => {
    try {
      const { redirectId } = req.params;
      const redirect = await hybridStorage.updateSeoRedirect(parseInt(redirectId), req.body);
      res.json({ success: true, redirect });
    } catch (error) {
      console.error('Update SEO redirect error:', error);
      res.status(500).json({ error: 'Failed to update SEO redirect' });
    }
  });

  app.delete('/api/seo/redirects/:redirectId', async (req, res) => {
    try {
      const { redirectId } = req.params;
      await hybridStorage.deleteSeoRedirect(parseInt(redirectId));
      res.json({ success: true, message: 'SEO redirect deleted' });
    } catch (error) {
      console.error('Delete SEO redirect error:', error);
      res.status(500).json({ error: 'Failed to delete SEO redirect' });
    }
  });

  // Track redirect hits
  app.post('/api/seo/redirects/:redirectId/hit', async (req, res) => {
    try {
      const { redirectId } = req.params;
      const { userAgent, referer } = req.body;
      await hybridStorage.trackRedirectHit(parseInt(redirectId), userAgent, referer);
      res.json({ success: true, message: 'Redirect hit tracked' });
    } catch (error) {
      console.error('Track redirect hit error:', error);
      res.status(500).json({ error: 'Failed to track redirect hit' });
    }
  });

  // SEO Audit Logs
  app.get('/api/seo/audit-logs', async (req, res) => {
    try {
      const { pageId, limit } = req.query;
      const logs = await hybridStorage.getSeoAuditLogs(
        pageId as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json({ success: true, logs });
    } catch (error) {
      console.error('Get SEO audit logs error:', error);
      res.status(500).json({ error: 'Failed to get SEO audit logs' });
    }
  });

  app.post('/api/seo/audit-logs', async (req, res) => {
    try {
      const auditSchema = z.object({
        pageId: z.string().min(1),
        action: z.string().min(1),
        field: z.string().min(1),
        oldValue: z.string().optional(),
        newValue: z.string().optional(),
        adminUser: z.string().min(1),
        changeReason: z.string().optional()
      });

      const validatedData = auditSchema.parse(req.body);
      const log = await hybridStorage.createSeoAuditLog(validatedData);
      res.json({ success: true, log });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Create SEO audit log error:', error);
      res.status(500).json({ error: 'Failed to create SEO audit log' });
    }
  });

  // SEO Image Metadata Management
  app.get('/api/seo/images', async (req, res) => {
    try {
      const { imageUrl } = req.query;
      const images = await hybridStorage.getSeoImageMeta(imageUrl as string);
      res.json({ success: true, images });
    } catch (error) {
      console.error('Get SEO image metadata error:', error);
      res.status(500).json({ error: 'Failed to get SEO image metadata' });
    }
  });

  app.post('/api/seo/images', async (req, res) => {
    try {
      const imageSchema = z.object({
        imageUrl: z.string().url(),
        altTextEn: z.string().optional(),
        altTextFr: z.string().optional(),
        titleEn: z.string().optional(),
        titleFr: z.string().optional(),
        caption: z.string().optional(),
        isLazyLoaded: z.boolean().default(true),
        compressionLevel: z.number().min(1).max(100).default(80),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        fileSize: z.number().positive().optional(),
        format: z.string().optional(),
        seoFriendlyName: z.string().optional()
      });

      const validatedData = imageSchema.parse(req.body);
      const image = await hybridStorage.createSeoImageMeta(validatedData);
      res.json({ success: true, image });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Create SEO image metadata error:', error);
      res.status(500).json({ error: 'Failed to create SEO image metadata' });
    }
  });

  app.patch('/api/seo/images/:imageId', async (req, res) => {
    try {
      const { imageId } = req.params;
      const image = await hybridStorage.updateSeoImageMeta(parseInt(imageId), req.body);
      res.json({ success: true, image });
    } catch (error) {
      console.error('Update SEO image metadata error:', error);
      res.status(500).json({ error: 'Failed to update SEO image metadata' });
    }
  });

  app.delete('/api/seo/images/:imageId', async (req, res) => {
    try {
      const { imageId } = req.params;
      await hybridStorage.deleteSeoImageMeta(parseInt(imageId));
      res.json({ success: true, message: 'SEO image metadata deleted' });
    } catch (error) {
      console.error('Delete SEO image metadata error:', error);
      res.status(500).json({ error: 'Failed to delete SEO image metadata' });
    }
  });

  // SEO Global Settings Management
  app.get('/api/seo/global-settings', async (req, res) => {
    try {
      const settings = await hybridStorage.getSeoGlobalSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Get SEO global settings error:', error);
      res.status(500).json({ error: 'Failed to get SEO global settings' });
    }
  });

  app.patch('/api/seo/global-settings', async (req, res) => {
    try {
      const globalSchema = z.object({
        robotsTxt: z.string().optional(),
        sitemapEnabled: z.boolean().optional(),
        sitemapFrequency: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).optional(),
        defaultMetaTitle: z.string().optional(),
        defaultMetaDescription: z.string().optional(),
        isMaintenanceMode: z.boolean().optional()
      });

      const validatedData = globalSchema.parse(req.body);
      const settings = await hybridStorage.updateSeoGlobalSettings(validatedData);
      res.json({ success: true, settings });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('Update SEO global settings error:', error);
      res.status(500).json({ error: 'Failed to update SEO global settings' });
    }
  });

  // SEO Utilities and Tools
  app.get('/api/seo/sitemap.xml', async (req, res) => {
    try {
      const sitemap = await hybridStorage.generateSitemap();
      res.setHeader('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Generate sitemap error:', error);
      res.status(500).json({ error: 'Failed to generate sitemap' });
    }
  });

  app.get('/api/seo/robots.txt', async (req, res) => {
    try {
      const robotsTxt = await hybridStorage.generateRobotsTxt();
      res.setHeader('Content-Type', 'text/plain');
      res.send(robotsTxt);
    } catch (error) {
      console.error('Generate robots.txt error:', error);
      res.status(500).json({ error: 'Failed to generate robots.txt' });
    }
  });

  app.get('/api/seo/score/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;
      const score = await hybridStorage.calculateSeoScore(pageId);
      res.json({ success: true, score });
    } catch (error) {
      console.error('Calculate SEO score error:', error);
      res.status(500).json({ error: 'Failed to calculate SEO score' });
    }
  });

  app.get('/api/seo/performance-report', async (req, res) => {
    try {
      const report = await hybridStorage.getSeoPerformanceReport();
      res.json({ success: true, report });
    } catch (error) {
      console.error('Get SEO performance report error:', error);
      res.status(500).json({ error: 'Failed to get SEO performance report' });
    }
  });

  app.post('/api/seo/validate-meta', async (req, res) => {
    try {
      const validation = await hybridStorage.validateMetaTags(req.body);
      res.json({ success: true, validation });
    } catch (error) {
      console.error('Validate meta tags error:', error);
      res.status(500).json({ error: 'Failed to validate meta tags' });
    }
  });

  // Hero video upload endpoint
  app.post("/api/hero-videos/upload", uploadVideo.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      // Use original filename - clean but preserve structure  
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = originalName; // No prefix for hero videos - use exact name

      console.log(`📤 Uploading hero video: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

      // Clear cache if file exists (for overwrite scenario)
      videoCache.clearSpecificFile(filename);

      // Upload to Supabase storage (memopyk-videos unified bucket) with overwrite enabled
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      res.json({ 
        success: true, 
        url: videoUrl,
        filename: filename 
      });

    } catch (error) {
      console.error('Hero video upload error:', error);
      res.status(500).json({ error: "Failed to upload hero video" });
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

  // Force cache specific video endpoint
  app.post("/api/video-cache/cache-video", async (req, res) => {
    try {
      const { filename } = req.body;
      
      if (!filename) {
        return res.status(400).json({ error: "filename is required" });
      }

      // Construct Supabase CDN URL from filename (unified bucket)
      const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;

      console.log(`🔄 Force caching video: ${filename} from ${videoUrl}`);

      // Download and cache the video
      await videoCache.downloadAndCacheVideo(filename, videoUrl);
      
      const stats = await videoCache.getCacheStats();
      res.json({ 
        success: true, 
        message: `Video ${filename} cached successfully`,
        stats 
      });
    } catch (error) {
      console.error('Force cache error:', error);
      res.status(500).json({ error: "Failed to cache video" });
    }
  });

  // Cache refresh endpoint - cache all hero videos
  app.post("/api/video-cache/refresh", async (req, res) => {
    try {
      console.log('🔄 Admin-triggered cache refresh for all hero videos...');
      
      const heroVideos = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
      const cached: string[] = [];
      const errors: string[] = [];

      for (const filename of heroVideos) {
        try {
          const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
          console.log(`🔄 Caching hero video: ${filename} from ${videoUrl}`);
          
          // Download and cache the video
          await videoCache.downloadAndCacheVideo(filename, videoUrl);
          cached.push(filename);
        } catch (error: any) {
          console.error(`❌ Failed to cache ${filename}:`, error);
          errors.push(`${filename}: ${error.message}`);
        }
      }

      const stats = await videoCache.getCacheStats();
      
      res.json({ 
        success: errors.length === 0,
        message: `Cached ${cached.length} of ${heroVideos.length} hero videos`,
        cached,
        errors,
        stats 
      });
    } catch (error) {
      console.error('Cache refresh error:', error);
      res.status(500).json({ error: "Failed to refresh video cache" });
    }
  });

  // Intelligent cleanup endpoint - removes only outdated/orphaned files
  app.post("/api/video-cache/clear", async (req, res) => {
    try {
      console.log('🧹 Admin-triggered intelligent cache cleanup...');
      
      const result = await videoCache.intelligentCleanup();
      const stats = await videoCache.getCacheStats();
      
      res.json({ 
        success: true,
        message: `Intelligent cleanup complete: ${result.videosRemoved} videos, ${result.imagesRemoved} images removed`,
        removed: result,
        stats 
      });
    } catch (error) {
      console.error('Intelligent cleanup error:', error);
      res.status(500).json({ error: "Failed to perform intelligent cleanup" });
    }
  });

  // Clear cache endpoint with immediate repopulation (for automated systems)
  app.post("/api/video-cache/clear-and-reload", async (req, res) => {
    try {
      console.log('🗑️ System-triggered cache clear with immediate preload...');
      
      await videoCache.clearCache(); // Uses original method with immediate preload
      const stats = await videoCache.getCacheStats();
      
      res.json({ 
        success: true,
        message: "Cache cleared and immediately repopulated for instant visitor performance",
        stats 
      });
    } catch (error) {
      console.error('Cache clear and reload error:', error);
      res.status(500).json({ error: "Failed to clear and reload video cache" });
    }
  });

  // Removed redundant smart gallery cache endpoint - use individual cache buttons or BULLETPROOF All Media Cache instead

  // Get cache status for specific videos (admin interface visual indicators)
  app.post("/api/video-cache/status", async (req, res) => {
    try {
      const { filenames } = req.body;
      if (!Array.isArray(filenames)) {
        return res.status(400).json({ error: "filenames must be an array" });
      }
      
      const status = videoCache.getVideoCacheStatus(filenames);
      res.json({ success: true, status });
    } catch (error) {
      console.error('Cache status error:', error);
      res.status(500).json({ error: "Failed to get cache status" });
    }
  });

  // Force cache specific video (admin interface - with bulletproof verification)
  app.post("/api/video-cache/force", async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ error: "filename is required" });
      }
      
      console.log(`🔄 BULLETPROOF CACHE v1.0 - Admin-forced cache refresh for: ${filename}`);
      
      // STEP 1: Get original file timestamp to verify actual refresh
      const cacheFilePath = videoCache.getCachedFilePath(filename);
      let originalTimestamp = null;
      let originalExists = false;
      
      if (existsSync(cacheFilePath)) {
        const originalStats = statSync(cacheFilePath);
        originalTimestamp = originalStats.mtime.getTime();
        originalExists = true;
        console.log(`📂 ORIGINAL FILE: Exists=${originalExists}, Timestamp=${new Date(originalTimestamp).toISOString()}`);
      } else {
        console.log(`📂 ORIGINAL FILE: Does not exist - will be fresh download`);
      }
      
      // STEP 2: Remove from cache if exists
      videoCache.clearSpecificFile(filename);
      console.log(`🗑️ CACHE CLEARED: Removed existing cache file`);
      
      // STEP 3: Download fresh copy with verification
      console.log(`⬇️ DOWNLOAD START: Fetching fresh copy of ${filename}...`);
      await videoCache.downloadAndCacheVideo(filename);
      console.log(`✅ DOWNLOAD COMPLETE: File downloaded to cache`);
      
      // STEP 4: BULLETPROOF VERIFICATION - Ensure file was actually cached
      const postCacheExists = existsSync(cacheFilePath);
      if (!postCacheExists) {
        throw new Error(`CACHE VERIFICATION FAILED: File ${filename} not found after download`);
      }
      
      const postCacheStats = statSync(cacheFilePath);
      const newTimestamp = postCacheStats.mtime.getTime();
      const newSize = postCacheStats.size;
      
      // STEP 5: Verify timestamp changed (or file is new)
      const actuallyRefreshed = !originalExists || newTimestamp > originalTimestamp;
      if (!actuallyRefreshed) {
        throw new Error(`TIMESTAMP VERIFICATION FAILED: File timestamp didn't update (Old: ${originalTimestamp}, New: ${newTimestamp})`);
      }
      
      // STEP 6: Verify file has reasonable size (not empty or corrupted)
      if (newSize < 1000) { // Less than 1KB is likely corrupt
        throw new Error(`SIZE VERIFICATION FAILED: File size ${newSize} bytes is too small, likely corrupt`);
      }
      
      console.log(`🎯 BULLETPROOF SUCCESS: File ${filename} cached and verified`);
      console.log(`   - File exists: ${postCacheExists}`);
      console.log(`   - File size: ${(newSize / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   - Timestamp: ${new Date(newTimestamp).toISOString()}`);
      console.log(`   - Actually refreshed: ${actuallyRefreshed}`);
      
      res.json({ 
        success: true, 
        message: `Video ${filename} cached and verified successfully`,
        filename: filename,
        verification: {
          exists: postCacheExists,
          size: newSize,
          sizeMB: `${(newSize / 1024 / 1024).toFixed(1)}MB`,
          timestamp: new Date(newTimestamp).toISOString(),
          actuallyRefreshed: actuallyRefreshed,
          originalExists: originalExists
        }
      });
    } catch (error: any) {
      console.error(`❌ BULLETPROOF CACHE FAILED for ${req.body.filename}:`, error);
      res.status(500).json({ 
        error: "Failed to force cache video with verification",
        filename: req.body.filename,
        details: error.message
      });
    }
  });

  // Force cache ALL videos (with bulletproof verification for each)
  app.post("/api/video-cache/force-all", async (req, res) => {
    try {
      console.log(`🚀 BULLETPROOF CACHE ALL v1.0 - Admin-triggered force cache all videos...`);
      
      // Get all hero videos
      const heroVideos = await hybridStorage.getHeroVideos();
      const heroFilenames = heroVideos
        .map(v => v.url_en)
        .filter(url => url && url.trim() !== ''); // Filter out undefined and empty strings
      
      // Get all gallery videos  
      const galleryItems = await hybridStorage.getGalleryItems();
      const galleryFilenames = galleryItems
        .filter(item => item.video_url_en)
        .map(item => {
          const url = item.video_url_en!;
          // Extract filename from URL or use as-is if it's already a filename
          return url.includes('/') ? url.split('/').pop()! : url;
        })
        .filter(filename => filename && filename.trim() !== ''); // Filter out undefined and empty strings
      
      const allVideos = [...heroFilenames, ...galleryFilenames];
      console.log(`📊 Found videos to cache:`, {
        heroFilenames,
        galleryFilenames,
        totalVideos: allVideos.length
      });
      
      const cached: string[] = [];
      const errors: string[] = [];
      const verificationResults: Array<{filename: string; success: boolean; size: number; timestamp: string}> = [];
      
      for (const filename of allVideos) {
        if (!filename || filename.trim() === '') {
          console.log(`⚠️ Skipping invalid filename: ${filename}`);
          continue;
        }
        
        try {
          console.log(`🔄 BULLETPROOF PROCESSING: ${filename}`);
          
          // Get original state for verification
          const cacheFilePath = videoCache.getCachedFilePath(filename);
          const originalExists = existsSync(cacheFilePath);
          let originalTimestamp = 0;
          
          if (originalExists) {
            originalTimestamp = statSync(cacheFilePath).mtime.getTime();
          }
          
          // Force refresh: remove old cache and download fresh
          videoCache.clearSpecificFile(filename);
          await videoCache.downloadAndCacheVideo(filename);
          
          // BULLETPROOF VERIFICATION - Ensure file was actually cached
          const postCacheExists = existsSync(cacheFilePath);
          if (!postCacheExists) {
            throw new Error(`File not found after download`);
          }
          
          const postCacheStats = statSync(cacheFilePath);
          const newTimestamp = postCacheStats.mtime.getTime();
          const newSize = postCacheStats.size;
          
          // Verify timestamp changed (or file is new)
          const actuallyRefreshed = !originalExists || newTimestamp > originalTimestamp;
          if (!actuallyRefreshed) {
            throw new Error(`Timestamp didn't update (Old: ${originalTimestamp}, New: ${newTimestamp})`);
          }
          
          // Verify file has reasonable size (not empty or corrupted)
          if (newSize < 1000) {
            throw new Error(`File size ${newSize} bytes is too small`);
          }
          
          cached.push(filename);
          verificationResults.push({
            filename,
            success: true,
            size: newSize,
            timestamp: new Date(newTimestamp).toISOString()
          });
          
          console.log(`✅ BULLETPROOF SUCCESS: ${filename} (${(newSize / 1024 / 1024).toFixed(1)}MB)`);
        } catch (error: any) {
          const errorMsg = `${filename}: ${error.message}`;
          errors.push(errorMsg);
          verificationResults.push({
            filename,
            success: false,
            size: 0,
            timestamp: new Date().toISOString()
          });
          console.error(`❌ BULLETPROOF FAILED for ${filename}:`, error);
        }
      }
      
      console.log(`🎯 BULLETPROOF CACHE ALL COMPLETE: ${cached.length}/${allVideos.length} videos verified successfully`);
      if (errors.length > 0) {
        console.log(`❌ Verification failures:`, errors);
      }
      
      const stats = videoCache.getCacheStats();
      res.json({ 
        success: true,
        message: `Bulletproof cached and verified ${cached.length}/${allVideos.length} videos`,
        cached: cached,
        errors: errors,
        totalProcessed: allVideos.length,
        verification: verificationResults,
        cacheStats: stats
      });
    } catch (error: any) {
      console.error('❌ BULLETPROOF CACHE ALL FATAL ERROR:', error);
      res.status(500).json({ 
        error: "Failed to bulletproof cache all videos",
        details: error.message
      });
    }
  });

  // BULLETPROOF Force cache ALL MEDIA - Heroes, Gallery Videos, Gallery Images
  app.post("/api/video-cache/force-all-media", async (req, res) => {
    try {
      console.log(`🚀 BULLETPROOF ALL MEDIA v2.0 - Admin-triggered complete media caching...`);
      
      const result = await videoCache.forceCacheAllMedia();
      
      if (result.success) {
        const { stats, videoVerification, imageVerification } = result;
        console.log(`✅ BULLETPROOF ALL MEDIA SUCCESS: ${stats.videos.successful}/${stats.videos.attempted} videos, ${stats.images.successful}/${stats.images.attempted} images in ${stats.processingTime}`);
        
        res.json({
          success: true,
          message: result.message,
          stats,
          verification: {
            videos: videoVerification,
            images: imageVerification
          },
          processingTime: stats.processingTime
        });
      } else {
        console.error(`❌ BULLETPROOF ALL MEDIA FAILED: ${result.message}`);
        res.status(500).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
      
    } catch (error: any) {
      console.error(`❌ BULLETPROOF ALL MEDIA ENDPOINT ERROR:`, error);
      res.status(500).json({ 
        success: false,
        error: "Failed to force cache all media with verification",
        details: error.message
      });
    }
  });

  // Debug logging endpoint
  app.post('/api/debug-log', (req, res) => {
    const { type, data } = req.body;
    console.log(`🐛 DEBUG [${type}]:`, JSON.stringify(data, null, 2));
    res.json({ logged: true });
  });

  // Image Cache Management Routes
  app.get('/api/image-cache/stats', (req, res) => {
    try {
      const stats = videoCache.getImageCacheStats();
      res.json(stats);
    } catch (error) {
      console.error('Image cache stats error:', error);
      res.status(500).json({ error: 'Failed to get image cache stats' });
    }
  });

  app.post('/api/image-cache/clear', (req, res) => {
    try {
      videoCache.clearImageCache();
      res.json({ success: true, message: 'Image cache cleared successfully' });
    } catch (error) {
      console.error('Image cache clear error:', error);
      res.status(500).json({ error: 'Failed to clear image cache' });
    }
  });

  // Unified Cache Stats (Videos + Images) with Storage Management
  app.get('/api/unified-cache/stats', (req, res) => {
    try {
      const unifiedStats = videoCache.getUnifiedCacheStats();
      console.log(`📊 Unified cache stats: ${unifiedStats.total.sizeMB}MB/${unifiedStats.total.limitMB}MB (${unifiedStats.total.usagePercent}%) - Auto-cleanup: ${unifiedStats.management.maxCacheDays} days`);
      res.json(unifiedStats);
    } catch (error) {
      console.error('Unified cache stats error:', error);
      res.status(500).json({ error: 'Failed to get unified cache stats' });
    }
  });

  // Get detailed cache breakdown by content type
  app.get('/api/cache/breakdown', (req, res) => {
    try {
      const breakdown = videoCache.getDetailedCacheBreakdown();
      console.log(`📊 Cache breakdown: ${breakdown.heroVideos.count} Hero Videos, ${breakdown.galleryVideos.count} Gallery Videos, ${breakdown.galleryStaticImages.count} Static Images`);
      res.json(breakdown);
    } catch (error) {
      console.error('Cache breakdown error:', error);
      res.status(500).json({ error: 'Failed to get cache breakdown' });
    }
  });

  // Cleanup orphaned static images
  app.post('/api/cache/cleanup-orphaned-static-images', async (req, res) => {
    try {
      console.log('🧹 Starting orphaned static image cleanup...');
      
      // Get current gallery items to find referenced static images
      const galleryItems = await hybridStorage.getGalleryItems();
      console.log(`Found ${galleryItems.length} gallery items`);
      
      // Extract referenced static image filenames
      const referencedStaticImages = new Set<string>();
      galleryItems.forEach(item => {
        if (item.static_image_url_en) {
          const filename = item.static_image_url_en.split('/').pop();
          if (filename) referencedStaticImages.add(filename);
        }
        if (item.static_image_url_fr) {
          const filename = item.static_image_url_fr.split('/').pop();
          if (filename) referencedStaticImages.add(filename);
        }
      });
      
      console.log('Referenced static images:', Array.from(referencedStaticImages));
      
      // Get all cached static images
      const cacheImagesPath = path.join(__dirname, '../server/cache/images');
      if (!existsSync(cacheImagesPath)) {
        return res.json({ message: 'No image cache directory found', cleaned: 0 });
      }
      
      const cachedImages = readdirSync(cacheImagesPath).filter(file => 
        file.match(/\.(jpg|jpeg|png|webp)$/i)
      );
      
      console.log('Cached images:', cachedImages);
      
      // Find orphaned images (cached but not referenced)
      const orphanedImages = cachedImages.filter(filename => 
        !referencedStaticImages.has(filename)
      );
      
      console.log('Orphaned images to remove:', orphanedImages);
      
      // Remove orphaned images
      let cleanedCount = 0;
      for (const orphanedImage of orphanedImages) {
        const imagePath = path.join(cacheImagesPath, orphanedImage);
        try {
          unlinkSync(imagePath);
          console.log(`✅ Removed orphaned image: ${orphanedImage}`);
          cleanedCount++;
        } catch (error) {
          console.error(`❌ Failed to remove ${orphanedImage}:`, error);
        }
      }
      
      console.log(`🧹 Cleanup complete: removed ${cleanedCount} orphaned images`);
      
      res.json({
        message: `Successfully cleaned up ${cleanedCount} orphaned static images`,
        cleaned: cleanedCount,
        orphanedImages: orphanedImages,
        referencedImages: Array.from(referencedStaticImages)
      });
      
    } catch (error) {
      console.error('Orphaned image cleanup error:', error);
      res.status(500).json({ error: 'Failed to cleanup orphaned images' });
    }
  });

  // Image proxy endpoint for serving cached images
  app.get('/api/image-proxy', async (req, res) => {
    try {
      const filename = req.query.filename as string;
      
      if (!filename) {
        return res.status(400).json({ error: 'Missing image URL parameter' });
      }

      console.log(`🖼️ IMAGE PROXY REQUEST for: ${filename}`);
      
      // Check if image is cached
      const cachedImagePath = videoCache.getCachedImagePath(filename);
      
      if (cachedImagePath) {
        console.log(`📦 Serving image from LOCAL cache: ${filename}`);
        
        // Set appropriate headers for image serving
        const ext = filename.toLowerCase().split('.').pop();
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                        ext === 'png' ? 'image/png' : 
                        ext === 'webp' ? 'image/webp' : 'image/jpeg';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('ETag', `"${Date.now()}"`);
        // Performance test headers
        const stats = fs.statSync(cachedImagePath);
        const deliveryHeaders = createCacheHitHeaders('supabase', getCacheAge(cachedImagePath));
        res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
        res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
        res.setHeader('X-Storage', deliveryHeaders['X-Storage']);
        res.setHeader('X-Content-Bytes', stats.size.toString());
        res.sendFile(cachedImagePath);
      } else {
        console.log(`🌐 Image not cached, downloading and caching: ${filename}`);
        
        // Performance test headers for cache miss
        const deliveryHeaders = createCacheMissHeaders('supabase');
        res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
        res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
        res.setHeader('X-Storage', deliveryHeaders['X-Storage']);
        
        // Download and cache the image
        await videoCache.downloadAndCacheImage(filename);
        
        // Serve the now-cached image
        const newCachedPath = videoCache.getCachedImagePath(filename);
        if (newCachedPath) {
          console.log(`📦 Serving newly cached image: ${filename}`);
          const ext = filename.toLowerCase().split('.').pop();
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                          ext === 'png' ? 'image/png' : 
                          ext === 'webp' ? 'image/webp' : 'image/jpeg';
          
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('ETag', `"${Date.now()}"`);
          const deliveryHeaders = createCacheMissHeaders('supabase');
          res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
          res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
          res.setHeader('X-Storage', deliveryHeaders['X-Storage']);
          res.sendFile(newCachedPath);
        } else {
          console.error(`❌ Failed to cache and serve image: ${filename}`);
          res.status(500).json({ error: 'Failed to serve image' });
        }
      }
    } catch (error: any) {
      console.error('Image proxy error:', error);
      res.status(500).json({ error: 'Image proxy failed', details: error.message });
    }
  });

  // Comprehensive diagnostic endpoint - captures all system information in one place
  app.get("/api/debug/system-info", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Get version info
      let versionInfo = "Unknown";
      try {
        const versionPath = path.join(process.cwd(), 'VERSION');
        if (fs.existsSync(versionPath)) {
          versionInfo = fs.readFileSync(versionPath, 'utf8').trim();
        }
      } catch (e) {
        versionInfo = "Version file not found";
      }

      // Get package.json version
      let packageVersion = "Unknown";
      try {
        const packagePath = path.join(process.cwd(), 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        packageVersion = packageData.version || "No version in package.json";
      } catch (e) {
        packageVersion = "Package.json not readable";
      }

      // Get build info
      let buildInfo = {};
      try {
        const buildPath = path.join(process.cwd(), 'dist');
        const buildExists = fs.existsSync(buildPath);
        if (buildExists) {
          const buildStats = fs.statSync(buildPath);
          buildInfo = {
            exists: true,
            lastModified: buildStats.mtime.toISOString(),
            size: buildStats.size
          };
        } else {
          buildInfo = { exists: false };
        }
      } catch (e) {
        buildInfo = { error: e.message };
      }

      // Get gallery items info
      let galleryInfo = {};
      try {
        const galleryItems = await hybridStorage.getGalleryItems();
        galleryInfo = {
          count: galleryItems.length,
          videoFilenames: galleryItems.map(item => ({
            id: item.id,
            title: item.title_en,
            videoFilename: item.video_filename || item.video_url_en,
            hasVideo: !!(item.video_filename || item.video_url_en)
          }))
        };
      } catch (e) {
        galleryInfo = { error: e.message };
      }

      // Get hero videos info
      let heroInfo = {};
      try {
        const heroVideos = await hybridStorage.getHeroVideos();
        heroInfo = {
          count: heroVideos.length,
          videoFilenames: heroVideos.map(video => ({
            id: video.id,
            title: video.title_en,
            filename: video.url_en,
            isActive: video.is_active
          }))
        };
      } catch (e) {
        heroInfo = { error: e.message };
      }

      // Get cache info
      let cacheInfo = {};
      try {
        const cacheStats = await videoCache.getCacheStats();
        cacheInfo = cacheStats;
      } catch (e) {
        cacheInfo = { error: e.message };
      }

      // Environment info
      const envInfo = {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        currentTime: new Date().toISOString(),
        uptime: process.uptime()
      };

      // File system info
      let fileSystemInfo = {};
      try {
        const cacheDir = path.join(process.cwd(), 'server', 'cache', 'videos');
        const cacheDirExists = fs.existsSync(cacheDir);
        let cacheFiles = [];
        if (cacheDirExists) {
          cacheFiles = fs.readdirSync(cacheDir).map(file => {
            const filePath = path.join(cacheDir, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              size: stats.size,
              lastModified: stats.mtime.toISOString()
            };
          });
        }
        fileSystemInfo = {
          cacheDirectoryExists: cacheDirExists,
          cacheFiles: cacheFiles,
          cacheFileCount: cacheFiles.length
        };
      } catch (e) {
        fileSystemInfo = { error: e.message };
      }

      // Test gallery video URLs directly
      let galleryVideoTests = {};
      try {
        const galleryItems = await hybridStorage.getGalleryItems();
        const testResults = [];
        
        for (const item of galleryItems.slice(0, 3)) { // Test first 3 items
          const videoFilename = item.video_filename || item.video_url_en;
          if (videoFilename) {
            try {
              const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${videoFilename}`;
              const cacheExists = videoCache.isVideoCachedByFilename(videoFilename);
              
              testResults.push({
                title: item.title_en,
                filename: videoFilename,
                supabaseUrl: supabaseUrl,
                cacheExists: cacheExists,
                cachePath: cacheExists ? await videoCache.getCachedVideoPath(videoFilename) : null
              });
            } catch (e) {
              testResults.push({
                title: item.title_en,
                filename: videoFilename,
                error: e.message
              });
            }
          }
        }
        
        galleryVideoTests = { results: testResults };
      } catch (e) {
        galleryVideoTests = { error: e.message };
      }

      const systemInfo = {
        timestamp: new Date().toISOString(),
        environment: envInfo,
        versions: {
          file: versionInfo,
          package: packageVersion
        },
        build: buildInfo,
        gallery: galleryInfo,
        hero: heroInfo,
        cache: cacheInfo,
        fileSystem: fileSystemInfo,
        galleryVideoTests: galleryVideoTests,
        platform: {
          hostname: require('os').hostname(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        }
      };

      res.json(systemInfo);
    } catch (error) {
      res.status(500).json({
        error: "Failed to get system info",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // CRITICAL: File existence verification for deployment debugging
  app.get('/api/debug/cache-files', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const cacheDir = path.join(process.cwd(), 'server', 'cache', 'videos');
      const galleryFiles = ['VitaminSeaC.mp4', 'PomGalleryC.mp4', 'safari-1.mp4'];
      const heroFiles = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
      
      const fileStatus = {};
      
      // Check if cache directory exists
      const cacheDirExists = fs.existsSync(cacheDir);
      fileStatus.cacheDirectory = {
        path: cacheDir,
        exists: cacheDirExists,
        absolutePath: path.resolve(cacheDir)
      };
      
      if (cacheDirExists) {
        const cachedFiles = fs.readdirSync(cacheDir);
        fileStatus.cachedFiles = cachedFiles;
        
        // Check each gallery file
        for (const filename of galleryFiles) {
          const cacheFile = videoCache.getVideoCacheFilePath(filename);
          const exists = fs.existsSync(cacheFile);
          const size = exists ? fs.statSync(cacheFile).size : 0;
          
          fileStatus[filename] = {
            exists,
            size,
            path: cacheFile,
            relativePath: path.relative(process.cwd(), cacheFile)
          };
        }
        
        // Check each hero file
        for (const filename of heroFiles) {
          const cacheFile = videoCache.getVideoCacheFilePath(filename);
          const exists = fs.existsSync(cacheFile);
          const size = exists ? fs.statSync(cacheFile).size : 0;
          
          fileStatus[filename] = {
            exists,
            size,
            path: cacheFile,
            relativePath: path.relative(process.cwd(), cacheFile)
          };
        }
      }
      
      res.json({
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        workingDirectory: process.cwd(),
        cacheStats: videoCache.getCacheStats(),
        fileStatus
      });
      
    } catch (error) {
      console.error('❌ Cache files debug error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Stream Limit Testing System v1.0.48 - Automated video file size testing
  app.get('/api/test-stream-limits', async (req, res) => {
    console.log('[STREAM-TEST] 🧪 Starting automated stream limit testing...');
    
    const results: any[] = [];
    const testSizes = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100]; // MB
    let maxStreamableSize = 0;
    let consecutiveFailures = 0;
    
    try {
      // Use fs functions that are already imported
      const { createWriteStream, unlinkSync } = require('fs');
      
      for (const sizeMB of testSizes) {
        console.log(`[STREAM-TEST] 📊 Testing ${sizeMB}MB file...`);
        
        // Generate test file path
        const testFilename = `stream-test-${sizeMB}MB.mp4`;
        const testFilePath = path.join(__dirname, 'cache', 'videos', testFilename);
        
        try {
          // Create dummy MP4 file of specified size
          const fileSizeBytes = sizeMB * 1024 * 1024;
          
          // Create minimal MP4 header (valid but minimal)
          const mp4Header = Buffer.from([
            0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
            0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
            0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
            0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31
          ]);
          
          // Write file with padding
          const writeStream = createWriteStream(testFilePath);
          writeStream.write(mp4Header);
          
          // Pad with zeros to reach target size
          const paddingSize = fileSizeBytes - mp4Header.length;
          const chunkSize = 1024 * 1024; // 1MB chunks
          const paddingBuffer = Buffer.alloc(Math.min(chunkSize, paddingSize), 0);
          
          for (let i = 0; i < Math.ceil(paddingSize / chunkSize); i++) {
            const remainingBytes = paddingSize - (i * chunkSize);
            const writeSize = Math.min(chunkSize, remainingBytes);
            writeStream.write(paddingBuffer.slice(0, writeSize));
          }
          
          writeStream.end();
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          console.log(`[STREAM-TEST] ✅ Created test file: ${testFilename} (${sizeMB}MB)`);
          
          // Test streaming via createReadStream (same function used in video proxy)
          const testResult = await new Promise<any>((resolve) => {
            const startTime = Date.now();
            let responseStatus = 200;
            let responseFinished = false;
            let responseClosed = false;
            
            // Test file streaming using imported createReadStream function
            const testStream = createReadStream(testFilePath, { 
              start: 0, 
              end: Math.min(1024 * 1024, fileSizeBytes - 1) // Test first 1MB
            });
            
            testStream.on('data', (chunk) => {
              // Successful chunk reading
            });
            
            testStream.on('end', () => {
              responseFinished = true;
              responseStatus = 200;
              resolve({
                status: responseStatus,
                success: true,
                duration: Date.now() - startTime,
                finished: responseFinished,
                closed: responseClosed
              });
            });
            
            testStream.on('error', (error: any) => {
              responseStatus = 500;
              resolve({
                status: responseStatus,
                success: false,
                duration: Date.now() - startTime,
                error: error.message,
                finished: responseFinished,
                closed: responseClosed
              });
            });
            
            // Timeout after 15 seconds
            setTimeout(() => {
              if (!responseFinished) {
                responseStatus = 500;
                testStream.destroy();
                resolve({
                  status: responseStatus,
                  success: false,
                  duration: Date.now() - startTime,
                  error: 'Timeout after 15 seconds',
                  finished: responseFinished,
                  closed: responseClosed
                });
              }
            }, 15000);
          });
          
          results.push({
            sizeMB: sizeMB,
            status: testResult.status,
            success: testResult.success,
            duration: testResult.duration,
            details: testResult
          });
          
          console.log(`[STREAM-TEST] 📋 ${sizeMB}MB: Status ${testResult.status}, Duration: ${testResult.duration}ms`);
          
          if (testResult.success && testResult.status === 200) {
            maxStreamableSize = sizeMB;
            consecutiveFailures = 0;
          } else {
            consecutiveFailures++;
            console.log(`[STREAM-TEST] ❌ Failure detected for ${sizeMB}MB (consecutive: ${consecutiveFailures})`);
          }
          
          // Clean up test file
          try {
            unlinkSync(testFilePath);
            console.log(`[STREAM-TEST] 🗑️ Cleaned up test file: ${testFilename}`);
          } catch (cleanupError: any) {
            console.warn(`[STREAM-TEST] ⚠️ Could not clean up ${testFilename}:`, cleanupError.message);
          }
          
          // Stop after 2 consecutive failures
          if (consecutiveFailures >= 2) {
            console.log(`[STREAM-TEST] 🛑 Stopping after ${consecutiveFailures} consecutive failures`);
            break;
          }
          
        } catch (fileError: any) {
          console.error(`[STREAM-TEST] ❌ Error creating/testing ${sizeMB}MB file:`, fileError.message);
          results.push({
            sizeMB: sizeMB,
            status: 500,
            success: false,
            duration: 0,
            error: fileError.message
          });
          consecutiveFailures++;
          
          if (consecutiveFailures >= 2) break;
        }
      }
      
      const summary = {
        maxStreamableSizeMB: maxStreamableSize,
        tested: results,
        totalTests: results.length,
        successfulTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        testTimestamp: new Date().toISOString(),
        platform: 'Replit',
        version: 'v1.0.50-route-entry-debug',
        recommendation: maxStreamableSize > 0 
          ? `Consider limiting uploads to ${maxStreamableSize}MB for reliable streaming`
          : 'No reliable streaming threshold found - investigate infrastructure limits'
      };
      
      console.log(`[STREAM-TEST] 📊 FINAL RESULTS: Max streamable size: ${maxStreamableSize}MB`);
      console.log(`[STREAM-TEST] 📈 Success rate: ${summary.successfulTests}/${summary.totalTests} tests passed`);
      
      res.json(summary);
      
    } catch (error: any) {
      console.error('[STREAM-TEST] ❌ Stream limit testing failed:', error);
      res.status(500).json({
        error: 'Stream limit testing failed',
        message: error.message,
        maxStreamableSizeMB: 0,
        tested: results,
        testTimestamp: new Date().toISOString()
      });
    }
  });

  // Image comparison page route
  app.get("/image-comparison", (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../public/image_comparison.html');
      
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.status(404).send('Image comparison page not found');
      }
    } catch (error) {
      console.error('Error serving image comparison page:', error);
      res.status(500).send('Error loading image comparison page');
    }
  });

  // Fresh reframe status page route
  app.get("/fresh-reframe-status", (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../public/fresh_reframe_status.html');
      
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.status(404).send('Fresh reframe status page not found');
      }
    } catch (error) {
      console.error('Error serving fresh reframe status page:', error);
      res.status(500).send('Error loading fresh reframe status page');
    }
  });

  // Reframe success page route
  app.get("/reframe-success", (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../public/reframe_success.html');
      
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.status(404).send('Reframe success page not found');
      }
    } catch (error) {
      console.error('Error serving reframe success page:', error);
      res.status(500).send('Error loading reframe success page');
    }
  });

  // Reframe diagnosis page route
  app.get("/reframe-diagnosis", (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../public/reframe_diagnosis.html');
      
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.status(404).send('Reframe diagnosis page not found');
      }
    } catch (error) {
      console.error('Error serving reframe diagnosis page:', error);
      res.status(500).send('Error loading reframe diagnosis page');
    }
  });

  // Reframe test v1.0.108 page route
  app.get("/reframe-test", (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../public/reframe_test_v108.html');
      
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.status(404).send('Reframe test page not found');
      }
    } catch (error) {
      console.error('Error serving reframe test page:', error);
      res.status(500).send('Error loading reframe test page');
    }
  });

  // Deployment Management Routes
  app.post("/api/deployment/create-marker", async (req, res) => {
    try {
      const { description, keep = 10 } = req.body;
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: "Description is required" });
      }

      const { spawn } = require('child_process');
      const scriptPath = path.join(__dirname, '../scripts/create-deployment-marker.js');
      
      // Use enhanced deployment marker for better cache-busting
      const enhancedScriptPath = path.join(__dirname, '../scripts/enhanced-deployment-marker.js');
      const useEnhanced = fs.existsSync(enhancedScriptPath);
      
      const child = spawn('node', [
        useEnhanced ? enhancedScriptPath : scriptPath,
        `--description=${description.trim()}`,
        `--keep=${String(keep)}`,
        '--aggressive',
        '--verify'
      ]);

      let output = '';
      let error = '';

      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          // Extract filename from output
          const filenameMatch = output.match(/FORCE_CLEAN_DEPLOYMENT_([^.]+\.txt)/);
          const filename = filenameMatch ? filenameMatch[0] : 
                          output.match(/([^/\\]+\.txt)/) ? output.match(/([^/\\]+\.txt)/)[1] : 'unknown';
          
          res.json({
            success: true,
            message: "Deployment marker created successfully",
            filename: filename,
            output: output.trim()
          });
        } else {
          res.status(500).json({
            error: "Failed to create deployment marker",
            details: error || output,
            code: code
          });
        }
      });

    } catch (error: any) {
      res.status(500).json({
        error: "Internal server error",
        details: error.message
      });
    }
  });

  app.post("/api/deployment/cleanup", async (req, res) => {
    try {
      const { keep = 10 } = req.body;
      
      const { spawn } = require('child_process');
      const scriptPath = path.join(__dirname, '../scripts/create-deployment-marker.js');
      
      const child = spawn('node', [
        scriptPath,
        '--cleanup',
        `--keep=${String(keep)}`
      ]);

      let output = '';
      let error = '';

      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          // Extract deleted count from output
          const deletedMatch = output.match(/deleted (\d+)\/\d+ old markers/);
          const deletedCount = deletedMatch ? parseInt(deletedMatch[1]) : 0;
          
          res.json({
            success: true,
            message: "Cleanup completed successfully",
            deletedCount: deletedCount,
            output: output.trim()
          });
        } else {
          res.status(500).json({
            error: "Cleanup failed",
            details: error || output,
            code: code
          });
        }
      });

    } catch (error: any) {
      res.status(500).json({
        error: "Internal server error",
        details: error.message
      });
    }
  });

  app.get("/api/deployment/markers", async (req, res) => {
    try {
      const markersDir = path.join(__dirname, '../.deployment_markers');
      const rootDir = path.join(__dirname, '..');
      
      let allMarkers: any[] = [];

      // Read from .deployment_markers directory (existing markers)
      if (fs.existsSync(markersDir)) {
        const oldFiles = fs.readdirSync(markersDir)
          .filter((file: string) => file.startsWith('FORCE_CLEAN_DEPLOYMENT_') && file.endsWith('.txt'))
          .map((file: string) => {
            const filePath = path.join(markersDir, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Extract description from content
            const descMatch = content.match(/Description: (.+)/);
            const description = descMatch ? descMatch[1] : 'No description';
            
            // Extract version from filename
            const versionMatch = file.match(/v1\.0-(.+)\.txt$/);
            const version = versionMatch ? versionMatch[1] : 'unknown';

            return {
              filename: file,
              description: description,
              timestamp: stats.mtime.toISOString(),
              version: version
            };
          });
        allMarkers = [...allMarkers, ...oldFiles];
      }

      // Read from root directory (new DEPLOYMENT_READY files)
      if (fs.existsSync(rootDir)) {
        const newFiles = fs.readdirSync(rootDir)
          .filter((file: string) => file.startsWith('DEPLOYMENT_READY_v1.0.') && file.endsWith('.md'))
          .map((file: string) => {
            const filePath = path.join(rootDir, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Extract description from content (look for first line after #)
            const titleMatch = content.match(/# DEPLOYMENT READY v1\.0\.\d+ - (.+)/);
            const description = titleMatch ? titleMatch[1] : 'New deployment marker';
            
            // Extract version from filename
            const versionMatch = file.match(/DEPLOYMENT_READY_v1\.0\.(\d+)/);
            const version = versionMatch ? `1.0.${versionMatch[1]}` : 'unknown';

            return {
              filename: file,
              description: description,
              timestamp: stats.mtime.toISOString(),
              version: version
            };
          });
        allMarkers = [...allMarkers, ...newFiles];
      }

      // Sort by timestamp (newest first)
      allMarkers.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({ markers: allMarkers });

    } catch (error: any) {
      res.status(500).json({
        error: "Failed to load deployment markers",
        details: error.message
      });
    }
  });

  // Debug logging endpoint for crop issue analysis
  app.post('/api/debug-log', (req, res) => {
    const { message } = req.body;
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}`;
    
    console.log(`[CROP DEBUG] ${logEntry}`);
    
    // Write to debug file
    const fs = require('fs');
    try {
      fs.appendFileSync('crop-debug.log', logEntry + '\n');
    } catch (error) {
      console.error('Failed to write debug log:', error);
    }
    
    res.json({ success: true });
  });

  // Read debug log endpoint
  app.get('/api/debug-log', (req, res) => {
    const fs = require('fs');
    try {
      const log = fs.readFileSync('crop-debug.log', 'utf8');
      res.json({ log });
    } catch (error) {
      res.json({ log: 'No debug log found or error reading log' });
    }
  });

  // Download missing static images endpoint
  app.post('/api/cache/download-static-images', async (req, res) => {
    try {
      console.log('🚀 Manual static image download triggered');
      const result = await videoCache.downloadMissingStaticImages();
      res.json({
        success: result.errors.length === 0,
        message: `Downloaded ${result.downloaded} of ${result.total} static images`,
        ...result
      });
    } catch (error) {
      console.error('❌ Static image download failed:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  // Import test routes
  const testRouter = (await import('./test-routes')).default;
  app.use('/api', testRouter);

  console.log("📋 Video proxy, image proxy, cache endpoints, diagnostic endpoint, stream testing, image comparison page, deployment management, and system test routes registered");

  return createServer(app);
}