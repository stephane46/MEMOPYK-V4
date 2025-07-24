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
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No static image file provided" });
      }

      const itemId = req.body.item_id;
      const cropSettings = req.body.crop_settings ? JSON.parse(req.body.crop_settings) : null;
      
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
      
      // Update the gallery item with the static image URL and crop settings
      try {
        await hybridStorage.updateGalleryItem(parseInt(itemId), {
          static_image_url: staticImageUrl,
          crop_settings: cropSettings
        });
        console.log(`✅ Gallery item ${itemId} updated with static image URL`);
      } catch (updateError) {
        console.error('Failed to update gallery item with static image URL:', updateError);
        // Continue anyway since the upload succeeded
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

  // FAQ Sections endpoints
  app.get("/api/faq-sections", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const sections = await hybridStorage.getFAQSections(language);
      res.json(sections);
    } catch (error) {
      console.error('Get FAQ sections error:', error);
      res.status(500).json({ error: "Failed to get FAQ sections" });
    }
  });

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

  app.patch("/api/faq-sections/:id", async (req, res) => {
    try {
      const sectionId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedSection = await hybridStorage.updateFAQSection(sectionId, updateData);
      res.json({ success: true, section: updatedSection });
    } catch (error) {
      console.error('Update FAQ section error:', error);
      res.status(500).json({ error: "Failed to update FAQ section" });
    }
  });

  app.delete("/api/faq-sections/:id", async (req, res) => {
    try {
      const sectionId = parseInt(req.params.id);
      
      await hybridStorage.deleteFAQSection(sectionId);
      res.json({ success: true, message: "FAQ section deleted successfully" });
    } catch (error) {
      console.error('Delete FAQ section error:', error);
      res.status(500).json({ error: "Failed to delete FAQ section" });
    }
  });

  // FAQ endpoints
  app.get("/api/faqs", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const faqs = await hybridStorage.getFAQs(language);
      res.json(faqs);
    } catch (error) {
      console.error('Get FAQs error:', error);
      res.status(500).json({ error: "Failed to get FAQs" });
    }
  });

  app.post("/api/faqs", async (req, res) => {
    try {
      const { section_id, question_fr, question_en, answer_fr, answer_en, order_index, is_active } = req.body;
      
      if (!question_fr || !question_en || !answer_fr || !answer_en) {
        return res.status(400).json({ error: "All bilingual content is required" });
      }
      
      const newFAQ = await hybridStorage.createFAQ({
        section_id: section_id || null,
        question_fr,
        question_en,
        answer_fr,
        answer_en,
        order_index: order_index || 0,
        is_active: is_active !== false
      });
      
      res.status(201).json({ success: true, faq: newFAQ });
    } catch (error) {
      console.error('Create FAQ error:', error);
      res.status(500).json({ error: "Failed to create FAQ" });
    }
  });

  app.patch("/api/faqs/:id", async (req, res) => {
    try {
      const faqId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedFAQ = await hybridStorage.updateFAQ(faqId, updateData);
      res.json({ success: true, faq: updatedFAQ });
    } catch (error) {
      console.error('Update FAQ error:', error);
      res.status(500).json({ error: "Failed to update FAQ" });
    }
  });

  app.delete("/api/faqs/:id", async (req, res) => {
    try {
      const faqId = parseInt(req.params.id);
      
      await hybridStorage.deleteFAQ(faqId);
      res.json({ success: true, message: "FAQ deleted successfully" });
    } catch (error) {
      console.error('Delete FAQ error:', error);
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  app.patch("/api/faqs/:id/reorder", async (req, res) => {
    try {
      const faqId = parseInt(req.params.id);
      const { order_index } = req.body;
      
      if (typeof order_index !== 'number') {
        return res.status(400).json({ error: "order_index must be a number" });
      }
      
      const updatedFAQ = await hybridStorage.updateFAQ(faqId, { order_index });
      res.json({ success: true, faq: updatedFAQ });
    } catch (error) {
      console.error('Reorder FAQ error:', error);
      res.status(500).json({ error: "Failed to reorder FAQ" });
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

  // Legal Documents - Terms, privacy policy, etc.
  app.get("/api/legal/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const legal = await hybridStorage.getLegalDocuments();
      res.json(legal);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal document" });
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

  // FAQ Sections - GET all sections
  app.get("/api/faq-sections", async (req, res) => {
    try {
      const sections = await hybridStorage.getFAQSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ sections" });
    }
  });

  // FAQ Sections - POST create new section
  app.post("/api/faq-sections", async (req, res) => {
    try {
      const section = await hybridStorage.createFAQSection(req.body);
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: "Failed to create FAQ section" });
    }
  });

  // FAQ Sections - PATCH update section
  app.patch("/api/faq-sections/:id", async (req, res) => {
    try {
      const section = await hybridStorage.updateFAQSection(Number(req.params.id), req.body);
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: "Failed to update FAQ section" });
    }
  });

  // FAQ Sections - DELETE remove section
  app.delete("/api/faq-sections/:id", async (req, res) => {
    try {
      await hybridStorage.deleteFAQSection(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ section" });
    }
  });

  // FAQs - GET all FAQs
  app.get("/api/faqs", async (req, res) => {
    try {
      const faqs = await hybridStorage.getFAQs();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQs" });
    }
  });

  // FAQs - POST create new FAQ
  app.post("/api/faqs", async (req, res) => {
    try {
      const faq = await hybridStorage.createFAQ(req.body);
      res.json(faq);
    } catch (error) {
      res.status(500).json({ error: "Failed to create FAQ" });
    }
  });

  // FAQs - PATCH update FAQ
  app.patch("/api/faqs/:id", async (req, res) => {
    try {
      const faq = await hybridStorage.updateFAQ(Number(req.params.id), req.body);
      res.json(faq);
    } catch (error) {
      res.status(500).json({ error: "Failed to update FAQ" });
    }
  });

  // FAQs - DELETE remove FAQ
  app.delete("/api/faqs/:id", async (req, res) => {
    try {
      await hybridStorage.deleteFAQ(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  // FAQs - POST reorder FAQs
  app.post("/api/faqs/:id/reorder", async (req, res) => {
    try {
      const { order_index } = req.body;
      const faq = await hybridStorage.updateFAQ(Number(req.params.id), { order_index });
      res.json(faq);
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder FAQ" });
    }
  });

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
      
      // If not cached, try to download it now (production failsafe)
      if (!cachedVideo) {
        console.log(`⚡ Video not cached: ${videoFilename} - attempting on-demand download...`);
        try {
          await videoCache.downloadAndCacheVideo(videoFilename);
          cachedVideo = videoCache.getCachedVideoPath(videoFilename);
          console.log(`✅ On-demand download successful for ${videoFilename}`);
        } catch (downloadError: any) {
          console.log(`❌ On-demand download failed: ${downloadError.message} - will try direct CDN`);
        }
      }
      
      if (cachedVideo && existsSync(cachedVideo)) {
        console.log(`📦 Serving from cache: ${videoFilename}`);
        
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

      // Construct Supabase CDN URL from filename
      let videoUrl: string;
      
      // All videos are now stored in memopyk-gallery bucket
      videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${videoFilename}`;

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

      // Handle response body streaming
      if (response.body) {
        const reader = response.body.getReader();
        
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          } catch (error) {
            console.error('Stream error:', error);
            res.end();
          }
        };
        
        await pump();
      } else {
        res.end();
      }

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
    try {
      const { username, password } = req.body;
      
      if (username === "admin" && password === "memopyk2025admin") {
        res.json({ 
          success: true, 
          message: "Authentication successful",
          token: "memopyk-admin-token-" + Date.now()
        });
      } else {
        res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Authentication error" 
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

  // Analytics endpoints
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      // Simplified analytics dashboard - hybrid storage method not implemented
      const dashboard = { message: "Analytics dashboard not implemented yet" };
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
      // Simplified session tracking - hybrid storage method not implemented
      const result = { id: Date.now(), message: "Session tracked (simplified)" };
      res.json({ success: true, sessionId: result.id });
    } catch (error) {
      console.error('Session tracking error:', error);
      res.status(500).json({ error: "Failed to track session" });
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

  // Debug logging endpoint
  app.post('/api/debug-log', (req, res) => {
    const { type, data } = req.body;
    console.log(`🐛 DEBUG [${type}]:`, JSON.stringify(data, null, 2));
    res.json({ logged: true });
  });

  return createServer(app);
}