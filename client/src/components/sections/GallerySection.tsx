import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Star, ArrowRight, Image as ImageIcon, Film, Users, Clock, Smartphone, Monitor, Instagram } from "lucide-react";
import { VideoOverlay } from "@/components/gallery/VideoOverlay";
import { MobileEnhancedGallery } from "@/components/mobile/MobileEnhancedGallery";
import { LazyImage } from "@/components/ui/LazyImage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
// Gallery item interface matching API response format (snake_case)
interface GalleryItem {
  id: string | number;
  title_en: string;
  title_fr: string;
  price_en: string;
  price_fr: string;
  source_en: string; // "80 photos & 10 videos" - top overlay
  source_fr: string; // "80 photos et 10 vidéos" - top overlay
  duration_en: string; // "2 minutes" - duration with film icon (up to 5 lines)
  duration_fr: string; // "2 minutes" - duration with film icon (up to 5 lines)
  situation_en: string; // "The Client is a wife..." - client description (up to 5 lines)
  situation_fr: string; // "Le client est une épouse..." - client description (up to 5 lines)
  story_en: string; // "This film shows..." - story description (up to 5 lines)
  story_fr: string; // "Ce film montre..." - story description (up to 5 lines)
  sorry_message_en: string; // "Sorry, we cannot show you the video at this stage"
  sorry_message_fr: string; // "Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
  format_platform_en: string; // "Social Media", "Social Feed", "Professional"
  format_platform_fr: string; // "Réseaux Sociaux", "Flux Social", "Professionnel"
  format_type_en: string; // "Mobile Stories", "Instagram Posts", "TV & Desktop"
  format_type_fr: string; // "Stories Mobiles", "Posts Instagram", "TV & Bureau"
  video_url_en: string;
  video_url_fr: string;
  video_filename: string; // CRITICAL: timestamp-prefixed filename (1753736019450-VitaminSeaC.mp4)
  video_width: number;
  video_height: number;
  video_orientation: string;
  image_url_en: string;
  image_url_fr: string;
  static_image_url_en: string | null; // 300x200 cropped English thumbnail (with -C suffix)
  static_image_url_fr: string | null; // 300x200 cropped French thumbnail (with -C suffix)
  static_image_url: string | null; // DEPRECATED: Legacy field
  use_same_video: boolean; // Shared mode indicator
  order_index: number;
  is_active: boolean;
  lightboxVideoUrl?: string; // Infrastructure workaround URL for lightbox display
}

export default function GallerySection() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<string | number>>(new Set());
  const [lightboxVideo, setLightboxVideo] = useState<GalleryItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const networkStatus = useNetworkStatus();
  const { orientation } = useDeviceOrientation();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 🚨 CACHE SYNCHRONIZATION FIX v1.0.111 - Browser storage cache busting
  useEffect(() => {
    console.log("🚨 CACHE SYNCHRONIZATION FIX v1.0.112");
    console.log("✅ Cache properly configured for F5 refresh synchronization");
    console.log("📋 Data refreshes on page load and window focus");
    console.log("🎯 Efficient caching with 5-minute staleness");
    
    // Clear any browser-cached gallery data on component mount
    const clearBrowserCache = () => {
      try {
        // Clear localStorage items that might cache gallery data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('gallery') || key.includes('react-query')) {
            localStorage.removeItem(key);
          }
        });
        // Clear sessionStorage as well
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('gallery') || key.includes('react-query')) {
            sessionStorage.removeItem(key);
          }
        });
        console.log("🧹 Browser cache cleared for gallery data");
      } catch (e) {
        console.warn("Cache clear failed:", e);
      }
    };
    
    clearBrowserCache();
  }, []);
  
  // 🚨 CACHE SYNCHRONIZATION FIX v1.0.119 - Stable cache with forced refresh
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { data: rawData = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/gallery'], // 🚨 CACHE SYNC FIX v1.0.125 - Use same key as admin
    staleTime: 0, // No stale time - always fresh data
    gcTime: 0, // No garbage collection time - immediate cache clear
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 5000, // 🚨 Poll every 5 seconds in production for cache sync
    retry: 2, // Retry on failure
  });
  
  // Force refresh mechanism for admin updates
  useEffect(() => {
    const handleStorageChange = () => {
      console.log("🔄 Storage change detected - refreshing public gallery");
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom admin update events
    const handleAdminUpdate = () => {
      console.log("🔄 Admin update event - refreshing public gallery");
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('gallery-updated', handleAdminUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gallery-updated', handleAdminUpdate);
    };
  }, []);

  // Process and transform data
  const galleryItems = React.useMemo(() => {
    console.log('🔍 RAW GALLERY DATA:', rawData);
    console.log('🔍 FIRST ITEM DETAILS:', rawData[0]);
    console.log('🔍 IS_ACTIVE STATUS:', rawData[0]?.is_active);
    
    const filteredData = rawData
      .filter((item: any) => {
        console.log(`🔍 FILTER CHECK: Item ${item.id} - is_active: ${item.is_active}`);
        return item.is_active;
      })
      .sort((a: any, b: any) => a.order_index - b.order_index);
    
    console.log('🔍 FILTERED GALLERY ITEMS:', filteredData.length);
    
    return filteredData.map((item: any) => ({
      // Convert snake_case API response to camelCase for TypeScript compatibility
      id: item.id,
      titleEn: item.title_en,
      titleFr: item.title_fr,
      priceEn: item.price_en,
      priceFr: item.price_fr,
      sourceEn: item.source_en,
      sourceFr: item.source_fr,
      durationEn: item.duration_en,
      durationFr: item.duration_fr,
      situationEn: item.situation_en,
      situationFr: item.situation_fr,
      storyEn: item.story_en,
      storyFr: item.story_fr,
      sorryMessageEn: item.sorry_message_en,
      sorryMessageFr: item.sorry_message_fr,
      formatPlatformEn: item.format_platform_en,
      formatPlatformFr: item.format_platform_fr,
      formatTypeEn: item.format_type_en,
      formatTypeFr: item.format_type_fr,
      videoUrlEn: item.video_url_en,
      videoUrlFr: item.video_url_fr,
      videoFilename: item.video_filename || item.video_url_en || item.video_url_fr, // TIMESTAMP PREFIX FIX
      videoWidth: item.video_width,
      videoHeight: item.video_height,
      videoOrientation: item.video_orientation,
      imageUrlEn: item.image_url_en,
      imageUrlFr: item.image_url_fr,
      staticImageUrlEn: item.static_image_url_en,
      staticImageUrlFr: item.static_image_url_fr,
      staticImageUrl: item.static_image_url, // Legacy field
      useSameVideo: item.use_same_video, // Shared mode indicator
      orderIndex: item.order_index,
      isActive: item.is_active
    }));
  }, [rawData]);

  // Add gallery video logging similar to hero videos
  useEffect(() => {
    if (galleryItems.length > 0) {
      const galleryVideoFilenames = galleryItems.map(item => {
        const videoUrl = language === 'fr-FR' ? item.videoUrlFr : item.videoUrlEn;
        return videoUrl.includes('/') ? videoUrl.split('/').pop() : videoUrl;
      });
      console.log(`🎬 Gallery videos available: ${galleryItems.length}`, galleryVideoFilenames);
    }
  }, [galleryItems.length, language]);

  const content = {
    'fr-FR': {
      title: "Notre Galerie",
      subtitle: "Découvrez nos créations de films souvenirs",
      description: "Chaque film raconte une histoire unique. Explorez notre collection de créations personnalisées pour mariages, familles et événements spéciaux.",
      viewAll: "Voir Toute la Galerie",
      preview: "Aperçu",
      startingFrom: "À partir de",
      featured: "Recommandé",
      newItem: "Nouveau",
      video: "Vidéo",
      image: "Image"
    },
    'en-US': {
      title: "Our Gallery",
      subtitle: "Discover our memory film creations",
      description: "Every film tells a unique story. Explore our collection of personalized creations for weddings, families and special events.",
      viewAll: "View Full Gallery",
      preview: "Preview",
      startingFrom: "Starting from",
      featured: "Featured",
      newItem: "New",
      video: "Video",
      image: "Image"
    }
  };

  const t = content[language];

  const getImageUrl = (item: GalleryItem) => {
    // CORRECTED PRIORITY v1.0.120: Use static crops when available (respects cropping work)
    let imageUrl = '';
    let filename = '';
    
    // Priority 1: Use static crops first (these are the properly cropped, high-quality results)
    let staticImageUrl = '';
    if (item.useSameVideo) {
      // Shared mode: Use EN static crop for both languages (FIXED: use camelCase)
      staticImageUrl = item.staticImageUrlEn || '';
      console.log(`🔗 PUBLIC SHARED MODE: Using EN static crop for ${language}: ${staticImageUrl} for ${item.titleEn}`);
    } else {
      // Separate mode: Use language-specific static crop (FIXED: use camelCase)
      staticImageUrl = (language === 'fr-FR' ? item.staticImageUrlFr : item.staticImageUrlEn) || '';
      console.log(`🌍 SEPARATE MODE: Using ${language}-specific static crop: ${staticImageUrl} for ${item.titleEn}`);
    }
    
    if (staticImageUrl && staticImageUrl.trim() !== '') {
      imageUrl = staticImageUrl;
      console.log(`✂️ USING STATIC CROP (respecting cropping work) (${language}): ${imageUrl} for ${item.titleEn}`);
      
      // If it's already a full URL, use it directly with AGGRESSIVE cache busting
      if (imageUrl.startsWith('http')) {
        console.log(`✂️ STATIC CROP IS FULL URL - USING DIRECTLY WITH AGGRESSIVE CACHE BYPASS`);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const separator = imageUrl.includes('?') ? '&' : '?';
        // AGGRESSIVE cache bypass: multiple params + headers + fragment
        const directUrl = `${imageUrl}${separator}t=${timestamp}&r=${random}&bust=${timestamp}&nocache=${timestamp}&v=${random}&force=1#${timestamp}-${random}-bypass`;
        console.log(`🚨 AGGRESSIVE CACHE-BYPASS URL: ${directUrl}`);
        return directUrl;
      }
      
      // Handle filename extraction for proxy
      if (imageUrl.includes('/')) {
        filename = imageUrl.split('/').pop() || '';
        if (filename.includes('?')) {
          filename = filename.split('?')[0];
        }
      } else {
        filename = imageUrl;
      }
    } else {
      // Priority 2: Fallback to original images only if no static crop exists
      let originalImageUrl = '';
      if (item.useSameVideo) {
        originalImageUrl = item.imageUrlEn || '';
        console.log(`🔗 SHARED MODE FALLBACK: Using EN original for ${language} visitor: ${originalImageUrl} for ${item.titleEn}`);
      } else {
        originalImageUrl = (language === 'fr-FR' ? item.imageUrlFr : item.imageUrlEn) || '';
        console.log(`🌍 SEPARATE MODE FALLBACK: Using ${language}-specific original: ${originalImageUrl} for ${item.titleEn}`);
      }
      
      if (originalImageUrl && originalImageUrl.trim() !== '') {
        imageUrl = originalImageUrl;
        console.log(`🖼️ FALLBACK TO ORIGINAL (${language}): ${imageUrl} for ${item.title_en}`);
        
        // If it's already a full URL, use it directly with AGGRESSIVE cache busting  
        if (imageUrl.startsWith('http')) {
          console.log(`🖼️ ORIGINAL IS FULL URL - USING DIRECTLY WITH AGGRESSIVE CACHE BYPASS`);
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const separator = imageUrl.includes('?') ? '&' : '?';
          // AGGRESSIVE cache bypass for fallback images too
          const directUrl = `${imageUrl}${separator}t=${timestamp}&r=${random}&bust=${timestamp}&nocache=${timestamp}&v=${random}&force=1#${timestamp}-${random}-bypass`;
          console.log(`🚨 AGGRESSIVE CACHE-BYPASS FALLBACK URL: ${directUrl}`);
          return directUrl;
        }
        
        if (imageUrl.includes('/')) {
          filename = imageUrl.split('/').pop() || '';
          if (filename.includes('?')) {
            filename = filename.split('?')[0];
          }
        } else {
          filename = imageUrl;
        }
      } else {
        // Final fallback to latest uploads (legacy)
        const latestImageUrl = language === 'fr-FR' ? item.imageUrlFr : item.imageUrlEn;
        
        console.log(`🖼️ DEBUG LANGUAGE-SPECIFIC FALLBACK for ${item.titleEn}:`);
        console.log(`   - Current language: ${language}`);
        console.log(`   - item.imageUrlFr: ${item.imageUrlFr}`);
        console.log(`   - item.imageUrlEn: ${item.imageUrlEn}`);
        console.log(`   - Selected latestImageUrl: ${latestImageUrl}`);
        
        if (latestImageUrl && latestImageUrl.trim() !== '') {
          imageUrl = latestImageUrl;
          console.log(`🖼️ FALLBACK TO LATEST UPLOAD: ${imageUrl} for ${item.titleEn}`);
          
          // If it's already a full URL, use it directly
          if (imageUrl.startsWith('http')) {
            console.log(`🖼️ LATEST UPLOAD IS FULL URL - USING DIRECTLY`);
            console.log(`🖼️ DEBUG: Original URL: ${imageUrl}`);
            console.log(`🖼️ DEBUG: URL already encoded: ${imageUrl.includes('%20') ? 'YES' : 'NO'}`);
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const separator = imageUrl.includes('?') ? '&' : '?';
            const directUrl = `${imageUrl}${separator}cacheBust=${timestamp}&v=${random}&nocache=1#${timestamp}-${random}`;
            console.log(`🖼️ DIRECT CDN IMAGE URL v1.0.108: ${directUrl} (upload fallback)`);
            return directUrl;
          }
          
          filename = imageUrl.includes('/') ? (imageUrl.split('/').pop() || '') : imageUrl;
          // Remove query parameters from filename
          if (filename && filename.includes('?')) {
            filename = filename.split('?')[0];
          }
        } else {
          console.log(`🖼️ NO IMAGE AVAILABLE for ${item.title_en}`);
          return '';
        }
      }
    }
    
    // DIRECT CDN BYPASS: Use Supabase URL with aggressive cache-busting + hash fragment
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const hash = `#${timestamp}-${random}`; // Fragment identifier forces browser to treat as new resource
    const directUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodeURIComponent(filename || '')}?cacheBust=${timestamp}&v=${random}&nocache=1${hash}`;
    console.log(`🖼️ DIRECT CDN IMAGE URL v1.0.107: ${directUrl} (reframed static priority)`);
    return directUrl;
  };

  const getItemTitle = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.title_fr : item.title_en;
  };

  const getItemPrice = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.price_fr : item.price_en;
  };

  const getItemSource = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.source_fr : item.source_en;
  };

  const getItemDuration = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.duration_fr : item.duration_en;
  };

  const getItemSituation = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.situation_fr : item.situation_en;
  };

  const getItemStory = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.story_fr : item.story_en;
  };

  const getItemSorryMessage = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.sorry_message_fr : item.sorry_message_en;
  };

  const hasVideo = (item: GalleryItem, index: number) => {
    // GALLERY INDEPENDENCE FIX: All gallery items can have video functionality
    // Check video_filename field which contains the actual timestamp-prefixed filenames
    const filename = item.video_filename || item.video_url_en || item.video_url_fr;
    const hasVideoResult = filename && filename.trim() !== '';
    
    // PRODUCTION DEBUG: Log hasVideo results to identify the issue
    console.log(`🎬 hasVideo check for item ${index}:`, {
      id: item.id,
      filename,
      videoFilename: item.video_filename,
      videoUrlEn: item.video_url_en,
      videoUrlFr: item.video_url_fr,
      hasVideoResult
    });
    
    return hasVideoResult;
  };

  const getVideoUrl = (item: GalleryItem, index: number) => {
    // DIRECT CDN IMPLEMENTATION: Bypass video proxy entirely to avoid infrastructure blocking
    const filename = item.videoFilename || item.videoUrlEn || item.videoUrlFr;
    
    // Fix URL duplication - if filename is already a full URL, use it directly
    const directCdnUrl = filename.startsWith('https://') ? filename : `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
    
    console.log(`🎬 DIRECT CDN STREAMING for item ${index}: ${filename}`);
    console.log(`🔧 FIXED CDN URL: ${directCdnUrl}`);
    console.log(`⚠️ Note: Direct CDN streaming (slower 1500ms) to avoid infrastructure blocking`);
    
    return directCdnUrl;
  };

  // Get optimal viewing format info for marketing display - now using editable database fields
  const getViewingFormat = (item: GalleryItem) => {
    // Use editable format badge data from database if available, otherwise fall back to auto-detection
    const platformText = language === 'fr-FR' ? item.formatPlatformFr : item.formatPlatformEn;
    const typeText = language === 'fr-FR' ? item.formatTypeFr : item.formatTypeEn;
    
    // If admin has set custom format badge text, use it
    if (platformText && typeText) {
      // Determine icon based on type text content
      let icon = Monitor; // default
      if (typeText.toLowerCase().includes('stories') || typeText.toLowerCase().includes('mobile')) {
        icon = Smartphone;
      } else if (typeText.toLowerCase().includes('instagram') || typeText.toLowerCase().includes('social')) {
        icon = Instagram;
      } else if (typeText.toLowerCase().includes('tv') || typeText.toLowerCase().includes('desktop') || typeText.toLowerCase().includes('bureau')) {
        icon = Monitor;
      }
      
      return {
        platform: platformText,
        type: typeText,
        icon: icon,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]",
        formats: [] // Custom format badges don't need format arrays
      };
    }
    
    // Fall back to automatic detection if no custom format badge is set
    const width = item.videoWidth || 16;
    const height = item.videoHeight || 9;
    const aspectRatio = width / height;
    
    if (aspectRatio < 0.6) {
      // Very tall portrait (9:16 like TikTok/Stories)
      return {
        platform: language === 'fr-FR' ? "Réseaux Sociaux" : "Social Media",
        type: language === 'fr-FR' ? "Stories Mobiles" : "Mobile Stories",
        icon: Smartphone,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]",
        formats: language === 'fr-FR' ? ["TikTok", "Instagram Stories", "YouTube Shorts"] : ["TikTok", "Instagram Stories", "YouTube Shorts"]
      };
    } else if (aspectRatio < 1) {
      // Portrait but not as tall (4:5 like Instagram feed)
      return {
        platform: language === 'fr-FR' ? "Réseaux Sociaux" : "Social Feed",
        type: language === 'fr-FR' ? "Posts Instagram" : "Instagram Posts",
        icon: Instagram,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]",
        formats: language === 'fr-FR' ? ["Instagram Feed", "Facebook Posts", "Pinterest"] : ["Instagram Feed", "Facebook Posts", "Pinterest"]
      };
    } else {
      // Landscape (16:9 TV format)
      return {
        platform: language === 'fr-FR' ? "Professionnel" : "Professional",
        type: language === 'fr-FR' ? "TV & Bureau" : "TV & Desktop",
        icon: Monitor,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]", 
        formats: language === 'fr-FR' ? ["YouTube", "Affichage TV", "Présentations"] : ["YouTube", "TV Display", "Presentations"]
      };
    }
  };

  const handlePlayClick = (item: GalleryItem, e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hasVideoResult = hasVideo(item, index);
    console.log(`🎬 DIRECT CDN PLAYCLICK v1.0.51 - Item ${index}:`, {
      hasVideoResult,
      videoFilename: item.videoFilename,
      willOpenLightbox: hasVideoResult,
      willFlipCard: !hasVideoResult,
      streamingMethod: 'Direct CDN (bypassing proxy)'
    });
    
    if (hasVideoResult) {
      // Open video in lightbox
      const videoUrl = getVideoUrl(item, index);
      console.log(`🎬 OPENING LIGHTBOX for ${item.videoFilename}`);
      console.log(`✅ Using direct CDN streaming: ${videoUrl}`);
      setLightboxVideo({...item, lightboxVideoUrl: videoUrl});
      // Prevent body scrolling when lightbox is open
      document.body.style.overflow = 'hidden';
    } else {
      // Flip card to show sorry message for items without video
      console.log(`🎬 FLIPPING CARD for item without video`);
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    }
  };

  const closeLightbox = () => {
    setLightboxVideo(null);
    // Restore body scrolling
    document.body.style.overflow = 'unset';
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop (not the video player)
    if (e.target === e.currentTarget) {
      closeLightbox();
    }
  };

  // Close lightbox on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxVideo) {
        closeLightbox();
      }
    };

    if (lightboxVideo) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxVideo]);

  if (isLoading) {
    return (
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (galleryItems.length === 0) {
    return null; // Don't show section if no items
  }

  return (
    <section id="gallery" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 lg:mb-6 px-2">
            {t.title}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-2 px-4">
            {t.subtitle}
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto px-4">
            {t.description}
          </p>
        </div>



        {/* Gallery Grid - Conditional Rendering for Mobile Enhancement */}
        {isMobile ? (
          <MobileEnhancedGallery
            items={galleryItems}
            language={language}
            onVideoClick={(item) => {
              const videoUrl = getVideoUrl(item, 0);
              setLightboxVideo({...item, lightboxVideoUrl: videoUrl});
              document.body.style.overflow = 'hidden';
            }}
            onFlipCard={(id) => {
              setFlippedCards(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                return newSet;
              });
            }}
            flippedCards={flippedCards}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {galleryItems.map((item, index) => {
            const imageUrl = getImageUrl(item);
            const thumbnailUrl = imageUrl;
            console.log(`🔍 FINAL URL DEBUG for ${item.titleEn}:`, {
              imageUrl,
              thumbnailUrl,
              staticImageUrlEn: item.staticImageUrlEn,
              staticImageUrlFr: item.staticImageUrlFr,
              finalSrcAttribute: thumbnailUrl
            });
            const itemHasVideo = hasVideo(item, index);
            
            // CRITICAL FIX: Cards with videos should NEVER be flipped by default
            // Only flip if explicitly flipped AND has no video
            const isFlipped = flippedCards.has(item.id) && !itemHasVideo;
            

            
            return (
              <div 
                key={item.id} 
                className={`card-flip-container ${isFlipped ? 'flipped' : ''} rounded-2xl`}
              >
                <div className="card-flip-inner">
                  {/* FRONT SIDE - Normal Gallery Card */}
                  <div className="card-front bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                    {/* Image/Video with Overlays - Always 3:2 aspect ratio */}
                    <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-700 relative overflow-hidden rounded-t-2xl">
                      {thumbnailUrl ? (
                        /* Static Image - Default display */
                        <div className="w-full h-full relative">
                          {/* Main Image */}
                          <LazyImage
                            src={thumbnailUrl}
                            alt={getItemTitle(item)}
                            className="w-full h-full object-cover"
                            fallbackSrc="/placeholder-gallery.jpg"
                            onLoad={() => console.log(`🖼️ LazyImage loaded: ${thumbnailUrl}`)}
                            onError={() => console.log(`❌ LazyImage failed to load: ${thumbnailUrl}`)}
                          />
                          
                          {/* Top overlays - Mobile Responsive */}
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-start gap-2">
                            {/* Source Overlay (1) - Mobile Optimized */}
                            {getItemSource(item) && (
                              <div className="bg-black/70 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm backdrop-blur-sm max-w-[140px] sm:max-w-none">
                                <div className="font-medium leading-tight">{getItemSource(item)}</div>
                                <div className="text-xs text-gray-300 hidden sm:block">provided by Client</div>
                              </div>
                            )}

                            {/* Viewing Format Badge (2) - Mobile Optimized */}
                            {(() => {
                              const format = getViewingFormat(item);
                              const IconComponent = format.icon;
                              return (
                                <div className={`${format.color} text-white px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm max-w-[120px] sm:max-w-none`}>
                                  <IconComponent className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="font-bold leading-tight truncate text-xs sm:text-xs">{format.platform}</div>
                                    <div className="text-xs opacity-90 leading-tight truncate hidden sm:block">{format.type}</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Price Tag - Bottom Right (3) - Mobile Optimized */}
                          {getItemPrice(item) && (
                            <div 
                              className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm"
                              style={{ backgroundColor: 'rgba(214, 124, 74, 0.9)' }} // MEMOPYK orange with transparency
                            >
                              {getItemPrice(item)}
                            </div>
                          )}
                          
                          {/* Play Button - Mobile Optimized */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div 
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer touch-manipulation"
                              onClick={(e) => handlePlayClick(item, e, index)}
                              style={{
                                backgroundColor: itemHasVideo ? '#D67C4A' : '#ffffff', // Orange for video, white for flip
                                border: itemHasVideo ? 'none' : '2px solid #d1d5db'
                              }}
                            >
                              <div className={itemHasVideo ? "text-white text-lg sm:text-xl ml-0.5 sm:ml-1" : "text-gray-600 text-lg sm:text-xl ml-0.5 sm:ml-1"}>
                                ▶
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image available
                        </div>
                      )}
                    </div>

                    {/* Card Content - Mobile Optimized */}
                    <div className="px-3 sm:px-4 lg:px-6 pt-1 pb-3 sm:pb-4 lg:pb-6">
                      {/* Title (4) - Mobile Responsive */}
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-1 h-6 sm:h-8 overflow-hidden leading-6 sm:leading-8">
                        {getItemTitle(item)}
                      </h3>
                          
                      {/* Duration (5) - Mobile Optimized */}
                      <div className="mb-2 sm:mb-3 h-5 sm:h-6 overflow-hidden flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                        <div className="text-xs sm:text-sm leading-4 ml-1 sm:ml-2" style={{ color: '#4B5563' }}>
                          {getItemDuration(item) || <div className="h-4"></div>}
                        </div>
                      </div>
                      
                      {/* Situation (6) - Mobile Optimized */}
                      <div className="mb-2 sm:mb-3 h-16 sm:h-20 overflow-hidden">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemSituation(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Story (7) - Mobile Optimized */}
                      <div className="h-16 sm:h-20 overflow-hidden">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Film className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemStory(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE - Sorry Message */}
                  <div className="card-back">
                    <div className="text-center text-white">
                      <div className="text-2xl font-bold mb-4">
                        {language === 'fr-FR' ? 'Vidéo Non Disponible' : 'Video Not Available'}
                      </div>
                      <div className="text-lg">
                        {getItemSorryMessage(item)}
                      </div>
                      <button
                        onClick={(e) => handlePlayClick(item, e, index)}
                        className="mt-6 bg-white text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {language === 'fr-FR' ? 'Retour' : 'Back'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>


            );
          })}
          </div>
        )}





        {/* View All Button - Mobile Optimized */}
        {galleryItems.length > 6 && (
          <div className="text-center">
            <Button 
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base rounded-full transform hover:scale-105 transition-all duration-300 touch-manipulation min-h-[44px]"
            >
              {t.viewAll}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}




      </div>

      {/* Video Lightbox Modal */}
      {lightboxVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          {/* Video Container - 80% screen width, centered */}
          <div 
            className="relative mx-auto bg-black rounded-lg overflow-hidden shadow-2xl"
          >
            {/* Video Player - FIXED: 2/3 viewport scaling with correct aspect ratio */}
            <div 
              className="relative bg-black"
              ref={(containerRef) => {
                if (containerRef && lightboxVideo) {
                  console.log('🎬 80% VIEWPORT SCALING DEBUG v1.0.61 - Container created:');
                  console.log('   - Video filename:', lightboxVideo.videoFilename);
                  console.log('   - Admin dimensions: Width =', lightboxVideo.videoWidth, 'Height =', lightboxVideo.videoHeight);
                  
                  const adminWidth = lightboxVideo.videoWidth || 16;
                  const adminHeight = lightboxVideo.videoHeight || 9;
                  const aspectRatio = adminWidth / adminHeight;
                  
                  // Calculate 80% viewport scaling (updated from 2/3 = 66.66%)
                  const viewportWidth = window.innerWidth;
                  const viewportHeight = window.innerHeight;
                  const maxWidth = (viewportWidth * 80) / 100;
                  const maxHeight = (viewportHeight * 80) / 100;
                  
                  console.log('   - Viewport:', viewportWidth, 'x', viewportHeight);
                  console.log('   - Max container (80%):', maxWidth, 'x', maxHeight);
                  console.log('   - Video aspect ratio:', aspectRatio);
                  
                  // Scale based on largest dimension constraint
                  let containerWidth, containerHeight;
                  if (aspectRatio > 1) {
                    // Landscape: width is larger, limit by width
                    containerWidth = maxWidth;
                    containerHeight = maxWidth / aspectRatio;
                    if (containerHeight > maxHeight) {
                      containerHeight = maxHeight;
                      containerWidth = maxHeight * aspectRatio;
                    }
                  } else {
                    // Portrait: height is larger, limit by height
                    containerHeight = maxHeight;
                    containerWidth = maxHeight * aspectRatio;
                    if (containerWidth > maxWidth) {
                      containerWidth = maxWidth;
                      containerHeight = maxWidth / aspectRatio;
                    }
                  }
                  
                  console.log('   - Final container:', containerWidth, 'x', containerHeight);
                  console.log('   - Scaling factor:', containerWidth / adminWidth);
                  
                  containerRef.style.width = `${containerWidth}px`;
                  containerRef.style.height = `${containerHeight}px`;
                  containerRef.style.aspectRatio = `${adminWidth} / ${adminHeight}`;
                }
              }}
            >
              <video
                className="w-full h-full object-contain"
                controls
                autoPlay
                controlsList="nodownload nofullscreen noremoteplayback noplaybackrate nopictureinpicture"
                disablePictureInPicture
                disableRemotePlayback
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => {
                  // Click-to-play/pause functionality
                  const video = e.target as HTMLVideoElement;
                  if (video.paused) {
                    video.play();
                    console.log('▶️ Video resumed via click');
                  } else {
                    video.pause();
                    console.log('⏸️ Video paused via click');
                  }
                }}
                onError={(e) => {
                  console.error('❌ VIDEO PLAYBACK ERROR:', e);
                  console.error('❌ Video source URL:', lightboxVideo.lightboxVideoUrl);
                  console.error('❌ Video filename:', lightboxVideo.videoFilename);
                  const video = e.target as HTMLVideoElement;
                  console.error('❌ Video error code:', video.error?.code);
                  console.error('❌ Video error message:', video.error?.message);
                  closeLightbox();
                }}
                onLoadStart={() => {
                  console.log('🎬 Video load started:', lightboxVideo.lightboxVideoUrl);
                }}
                onCanPlay={() => {
                  console.log('✅ Video can play:', lightboxVideo.lightboxVideoUrl);
                }}
                onLoadedData={() => {
                  console.log('✅ Video data loaded - using admin dimensions with 2/3 viewport scaling');
                }}
                style={{ backgroundColor: 'black' }}
              >
                <source 
                  src={lightboxVideo.lightboxVideoUrl} 
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>


          </div>
        </div>
      )}
    </section>
  );
}