import type { Express } from "express";
import { createServer, type Server } from "http";
import { hybridStorage } from "./hybrid-storage";
import { z } from "zod";
import { videoCache } from "./video-cache";
import { createReadStream, existsSync, statSync, mkdirSync } from 'fs';
import path from 'path';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

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
    // Generate unique filename with timestamp
    const uniqueFilename = `${Date.now()}-${filename}`;
    
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
    // Prepend timestamp to avoid name collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
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
    // Prepend timestamp to avoid name collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
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
      
      if (!itemId) {
        return res.status(400).json({ error: "Gallery item ID is required" });
      }
      
      const item = await hybridStorage.updateGalleryItem(itemId, updates);
      res.json(item);
    } catch (error: any) {
      console.error('Gallery update error:', error);
      res.status(500).json({ error: `Failed to update gallery item: ${error.message}` });
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
    } catch (error: any) {
      console.error('Gallery deletion error:', error);
      res.status(500).json({ error: `Failed to delete gallery item: ${error.message}` });
    }
  });

  app.patch("/api/gallery/:id/reorder", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { order_index } = req.body;
      
      console.log(`🔄 Reordering gallery item ${itemId} to position ${order_index}`);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid gallery item ID" });
      }
      
      const item = await hybridStorage.updateGalleryItemOrder(itemId, order_index);
      console.log(`✅ Successfully reordered gallery item ${itemId}`);
      
      res.json(item);
    } catch (error: any) {
      console.error('Gallery reorder error:', error);
      res.status(500).json({ error: `Failed to reorder gallery item: ${error.message}` });
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
      const allowedBuckets = ['memopyk-gallery', 'memopyk-hero-videos'];
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

      res.json({ 
        success: true,
        message: "Upload completed successfully",
        url: publicUrl,
        filename: filename
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
        .from('memopyk-gallery')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
      
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

  // Upload gallery image/thumbnail endpoint  
  app.post("/api/gallery/upload-image", uploadImage.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Use original filename - clean but preserve structure
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `gallery_thumb_${originalName}`;

      console.log(`📤 Uploading gallery image: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

      // Read file from disk and upload to Supabase storage (gallery bucket) with overwrite enabled
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-gallery')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const imageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
      
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
        height: req.body.height || null
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

      // Use consistent naming for static images - PNG for lossless quality
      const filename = `static_${itemId}.png`;

      // First, delete the old file to ensure clean CDN cache invalidation
      const { error: deleteError } = await supabase.storage
        .from('memopyk-gallery')
        .remove([filename]);
      
      if (deleteError && deleteError.message !== 'The resource was not found') {
        console.log(`⚠️ Could not delete old thumbnail: ${deleteError.message}`);
      } else {
        console.log(`🗑️ Deleted old thumbnail: ${filename}`);
      }

      console.log(`📤 Uploading static image: ${filename} (300x200 PNG) - Fresh upload`);

      // Read file from disk and upload to Supabase storage (gallery bucket) 
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-gallery')
        .upload(filename, fileBuffer, {
          contentType: 'image/png',
          cacheControl: '300', // Shorter cache for thumbnails (5 minutes)
          upsert: false  // Use explicit delete+upload for better cache invalidation
        });

      if (uploadError) {
        console.error('Supabase static image upload error:', uploadError);
        return res.status(500).json({ error: `Static image upload failed: ${uploadError.message}` });
      }

      // Add cache-busting timestamp to force fresh loads
      const timestamp = Date.now();
      const staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}?v=${timestamp}`;
      
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
          console.log(`📝 Before update: ${items[itemIndex].static_image_url}`);
          items[itemIndex].static_image_url = staticImageUrl;
          items[itemIndex].crop_settings = cropSettings;
          items[itemIndex].updated_at = new Date().toISOString();
          console.log(`📝 After update: ${items[itemIndex].static_image_url}`);
          
          fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2));
          console.log(`✅ File written successfully`);
          
          // Verify the write
          const verifyData = fs.readFileSync(jsonPath, 'utf8');
          const verifyItems = JSON.parse(verifyData);
          const verifyItem = verifyItems.find((item: any) => item.id.toString() === itemId.toString());
          console.log(`🔍 Verification - Updated URL: ${verifyItem?.static_image_url}`);
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
        await hybridStorage.updateGalleryItem(itemId, {
          static_image_url: staticImageUrl,
          crop_settings: cropSettings
        });
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
      const { id, buttonTextFr, buttonTextEn, buttonUrl, isActive } = req.body;
      
      if (!id || !buttonTextFr || !buttonTextEn || !buttonUrl) {
        return res.status(400).json({ error: "All fields required" });
      }

      const newCta = await hybridStorage.createCtaSettings({
        id,
        buttonTextFr,
        buttonTextEn,
        buttonUrl,
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

  // Video streaming proxy with caching system
  app.get("/api/video-proxy", async (req, res) => {
    try {
      const { url, filename } = req.query;
      
      console.log(`🎬 VIDEO PROXY REQUEST DEBUG:`);
      console.log(`   - Filename: "${filename}"`);
      console.log(`   - URL param: "${url}"`);
      console.log(`   - Range header: "${req.headers.range}"`);
      console.log(`   - User-Agent: "${req.headers['user-agent']}"`);
      console.log(`   - Accept: "${req.headers.accept}"`);
      
      if (!filename) {
        console.log(`❌ Missing filename parameter`);
        return res.status(400).json({ error: "filename parameter is required" });
      }

      const videoFilename = filename as string;
      const range = req.headers.range;

      // Check if video exists in cache
      let cachedVideo = videoCache.getCachedVideoPath(videoFilename);
      console.log(`   - Cache path: "${cachedVideo}"`);
      console.log(`   - Cache exists: ${cachedVideo && existsSync(cachedVideo)}`);
      
      // FORCE LOCAL CACHING - Videos MUST be served from local storage only
      if (!cachedVideo) {
        console.log(`🚨 VIDEO NOT CACHED: ${videoFilename} - FORCING download and cache before serving`);
        try {
          await videoCache.downloadAndCacheVideo(videoFilename);
          cachedVideo = videoCache.getCachedVideoPath(videoFilename);
          console.log(`✅ FORCED download successful for ${videoFilename} - now serving from cache`);
        } catch (downloadError: any) {
          console.error(`❌ CRITICAL: Failed to download ${videoFilename}: ${downloadError.message}`);
          return res.status(500).json({ 
            error: `Video caching failed - cannot serve video`,
            filename: videoFilename,
            details: downloadError.message 
          });
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
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          console.log(`   - Range: ${start}-${end}, chunk size: ${chunksize}`);

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
          
          stream.on('error', (error) => {
            console.error(`❌ Stream error for ${videoFilename}:`, error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Stream error' });
            }
          });
          
          stream.pipe(res);
        } else {
          console.log(`   - Serving full file (no range)`);
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          });
          
          const stream = createReadStream(cachedVideo);
          stream.on('error', (error) => {
            console.error(`❌ Stream error for ${videoFilename}:`, error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Stream error' });
            }
          });
          
          stream.pipe(res);
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
      console.error(`❌ VIDEO PROXY FATAL ERROR for ${req.query.filename}:`, error);
      console.error(`   - Error type: ${error.constructor.name}`);
      console.error(`   - Error message: ${error.message}`);
      console.error(`   - Stack trace:`, error.stack);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Video streaming failed",
          filename: req.query.filename,
          details: error.message 
        });
      }
    }
  });

  // Image proxy endpoint to solve CORS issues for cropping
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: "Missing image URL parameter" });
      }

      console.log(`🖼️  IMAGE PROXY REQUEST: ${imageUrl}`);

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Range');

      // Fetch image from Supabase
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      // Set proper headers
      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Content-Length', response.headers.get('content-length') || '0');

      // Stream the image
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error: any) {
      console.error(`❌ IMAGE PROXY ERROR:`, error);
      res.status(500).json({ 
        error: "Image proxy failed",
        details: error.message 
      });
    }
  });

  // Video cache health endpoint
  app.get("/api/video-proxy/health", async (req, res) => {
    try {
      const stats = await videoCache.getCacheStats();
      res.json({
        status: "healthy",
        cache: stats,
        timestamp: new Date().toISOString(),
        deployment: {
          version: "enhanced-file-detection-v2.0",
          fileFilters: "MIME+Extension checking active",
          limits: "5000MB video, 5000MB image"
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
            const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
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

      // Upload to Supabase storage (memopyk-gallery bucket) with overwrite enabled
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-gallery')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
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

      // Construct Supabase CDN URL from filename
      let videoUrl: string;
      
      if (filename.startsWith('gallery_')) {
        videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
      } else {
        videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
      }

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

  // Clear cache endpoint
  app.post("/api/video-cache/clear", async (req, res) => {
    try {
      console.log('🗑️ Admin-triggered cache clear...');
      
      videoCache.clearCache();
      const stats = await videoCache.getCacheStats();
      
      res.json({ 
        success: true,
        message: "Video cache cleared successfully",
        stats 
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      res.status(500).json({ error: "Failed to clear video cache" });
    }
  });

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

  // Force cache specific video (admin interface - when video updated with same name)
  app.post("/api/video-cache/force", async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ error: "filename is required" });
      }
      
      console.log(`🔄 Admin-forced cache refresh for: ${filename}`);
      
      // Remove from cache if exists
      videoCache.clearSpecificFile(filename);
      
      // Download fresh copy
      await videoCache.downloadAndCacheVideo(filename);
      
      res.json({ 
        success: true, 
        message: `Video ${filename} cached successfully`,
        filename: filename
      });
    } catch (error: any) {
      console.error(`Cache force error for ${req.body.filename}:`, error);
      res.status(500).json({ 
        error: "Failed to force cache video",
        filename: req.body.filename,
        details: error.message
      });
    }
  });

  // Force cache ALL videos (deployment startup equivalent)
  app.post("/api/video-cache/force-all", async (req, res) => {
    try {
      console.log(`🚀 Admin-triggered FORCE CACHE ALL videos...`);
      
      // Get all hero videos
      const heroVideos = await hybridStorage.getHeroVideos();
      const heroFilenames = heroVideos.map(v => v.filename);
      
      // Get all gallery videos  
      const galleryItems = await hybridStorage.getGalleryItems();
      const galleryFilenames = galleryItems
        .filter(item => item.video_url_en)
        .map(item => item.video_url_en!.split('/').pop()!)
        .filter(filename => filename);
      
      const allVideos = [...heroFilenames, ...galleryFilenames];
      const cached: string[] = [];
      const errors: string[] = [];
      
      for (const filename of allVideos) {
        try {
          // Force refresh: remove old cache and download fresh
          videoCache.clearSpecificFile(filename);
          await videoCache.downloadAndCacheVideo(filename);
          cached.push(filename);
          console.log(`✅ Force cached: ${filename}`);
        } catch (error: any) {
          errors.push(`${filename}: ${error.message}`);
          console.error(`❌ Failed to cache ${filename}:`, error);
        }
      }
      
      const stats = videoCache.getCacheStats();
      res.json({ 
        success: true, 
        message: `Force cached ${cached.length} videos`,
        cached: cached,
        errors: errors,
        totalVideos: allVideos.length,
        cacheStats: stats
      });
    } catch (error: any) {
      console.error('Force cache all error:', error);
      res.status(500).json({ 
        error: "Failed to force cache all videos",
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

  return createServer(app);
}