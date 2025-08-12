console.log("📦 GallerySection loaded");

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Star, ArrowRight, Image as ImageIcon, Film, Users, Clock, Smartphone, Monitor, Instagram, Phone, Edit } from "lucide-react";
import { VideoOverlay } from "@/components/gallery/VideoOverlay";
import { MobileEnhancedGallery } from "@/components/mobile/MobileEnhancedGallery";
import { LazyImage } from "@/components/ui/LazyImage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { useVideoAnalytics } from "@/hooks/useVideoAnalytics";

// Gallery item interface using camelCase (transformed from API snake_case)
interface GalleryItem {
  id: string | number;
  titleEn: string;
  titleFr: string;
  priceEn: string;
  priceFr: string;
  sourceEn: string; // "80 photos & 10 videos" - top overlay
  sourceFr: string; // "80 photos et 10 vidéos" - top overlay
  durationEn: string; // "2 minutes" - duration with film icon (up to 5 lines)
  durationFr: string; // "2 minutes" - duration with film icon (up to 5 lines)
  situationEn: string; // "The Client is a wife..." - client description (up to 5 lines)
  situationFr: string; // "Le client est une épouse..." - client description (up to 5 lines)
  storyEn: string; // "This film shows..." - story description (up to 5 lines)
  storyFr: string; // "Ce film montre..." - story description (up to 5 lines)
  sorryMessageEn: string; // "Sorry, we cannot show you the video at this stage"
  sorryMessageFr: string; // "Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
  formatPlatformEn: string; // "Social Media", "Social Feed", "Professional"
  formatPlatformFr: string; // "Réseaux Sociaux", "Flux Social", "Professionnel"
  formatTypeEn: string; // "Mobile Stories", "Instagram Posts", "TV & Desktop"
  formatTypeFr: string; // "Stories Mobiles", "Posts Instagram", "TV & Bureau"
  videoUrlEn: string;
  videoUrlFr: string;
  videoFilename: string; // CRITICAL: timestamp-prefixed filename (1753736019450-VitaminSeaC.mp4)
  videoWidth: number;
  videoHeight: number;
  videoOrientation: string;
  imageUrlEn: string;
  imageUrlFr: string;
  staticImageUrlEn: string | null; // 300x200 cropped English thumbnail (with -C suffix)
  staticImageUrlFr: string | null; // 300x200 cropped French thumbnail (with -C suffix)
  staticImageUrl: string | null; // DEPRECATED: Legacy field
  useSameVideo: boolean; // Shared mode indicator
  orderIndex: number;
  isActive: boolean;
  lightboxVideoUrl?: string; // Infrastructure workaround URL for lightbox display
  isInstantReady?: boolean; // Indicates if video uses preloaded element for instant playback
  preloadedElement?: HTMLVideoElement; // The actual preloaded video element
}

export default function GallerySection() {
  const { language } = useLanguage();
  
  console.log("📦 GallerySection render", { language });
  const [flippedCards, setFlippedCards] = useState<Set<string | number>>(new Set());
  const [lightboxVideo, setLightboxVideo] = useState<GalleryItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set());
  const networkStatus = useNetworkStatus();
  const { orientation } = useDeviceOrientation();
  
  // 📊 Initialize video analytics for gallery video tracking
  const { trackVideoView } = useVideoAnalytics();

  // Fetch CTA settings for the call-to-action section
  const { data: ctaSettings = [] } = useQuery({
    queryKey: ['/api/cta'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Detect mobile viewport - ALWAYS USE DESKTOP GALLERY FOR DEBUGGING
  useEffect(() => {
    const checkMobile = () => setIsMobile(false); // FORCE DESKTOP GALLERY
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
      title: "Galerie",
      subtitle: "Chaque film que nous créons est aussi unique que vos souvenirs.",
      description: "Parce que chaque histoire est différente, nous réalisons un devis personnalisé adapté à votre film. La galerie présente une sélection d'exemples de créations et des tarifs indicatifs. Pour donner vie à vos propres souvenirs, contactez-nous pour un devis fait rien que pour vous.",
      viewAll: "Voir Toute la Galerie",
      preview: "Aperçu",
      startingFrom: "À partir de",
      featured: "Recommandé",
      newItem: "Nouveau",
      video: "Vidéo",
      image: "Image"
    },
    'en-US': {
      title: "Gallery",
      subtitle: "Every film we create is as unique as your memories.",
      description: "Because each story is different, we craft a customized quotation tailored to your film. The gallery presents a selection of sample creations and indicative pricing. To bring your own memories to life, contact us for a quote designed just for you.",
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
    console.log("🖼 GallerySection#getImageUrl", item.id, {
      useSameVideo: item.useSameVideo,
      staticImageUrlEn: item.staticImageUrlEn,
      imageUrlEn: item.imageUrlEn
    });
    console.group(`🖼️ GallerySection#getImageUrl [id=${item.id}]`);
    console.log("useSameVideo:",    item.useSameVideo);
    console.log("staticImageUrlEn:", item.staticImageUrlEn);
    console.log("imageUrlEn:",       item.imageUrlEn);

    const thumb = item.useSameVideo
      ? item.staticImageUrlEn
      : (language === 'fr-FR' ? item.staticImageUrlFr : item.staticImageUrlEn);
    console.log("→ chosen thumb:", thumb);

    if (thumb) {
      console.log("✅ returning direct Supabase URL:", thumb);
      console.groupEnd();
      return thumb; // Use direct Supabase URL without proxy
    }

    console.log("🚨 falling back to original:", item.imageUrlEn);
    console.groupEnd();
    return item.imageUrlEn || "";
  };

  const getItemTitle = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.titleFr : item.titleEn;
  };

  const getItemPrice = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.priceFr : item.priceEn;
  };

  const getItemSource = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.sourceFr : item.sourceEn;
  };

  const getItemDuration = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.durationFr : item.durationEn;
  };

  const getItemSituation = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.situationFr : item.situationEn;
  };

  const getItemStory = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.storyFr : item.storyEn;
  };

  const getItemSorryMessage = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.sorryMessageFr : item.sorryMessageEn;
  };

  const hasVideo = (item: GalleryItem, index: number) => {
    // Check video availability using camelCase properties only
    const filename = item.videoFilename || item.videoUrlEn || item.videoUrlFr;
    const hasVideoResult = filename && filename.trim() !== '';
    
    // PRODUCTION DEBUG: Log hasVideo results to identify the issue
    console.log(`🎬 hasVideo check for item ${index}:`, {
      id: item.id,
      filename,
      videoFilename: item.videoFilename,
      videoUrlEn: item.videoUrlEn,
      videoUrlFr: item.videoUrlFr,
      hasVideoResult
    });
    
    return hasVideoResult;
  };

  const getVideoUrl = (item: GalleryItem, index: number) => {
    // FIXED v1.0.1754928443: USE SAME VIDEO PROXY AS HERO VIDEOS - EXTRACT FILENAME ONLY
    let filename = item.videoFilename || '';
    
    // If it's a full URL, extract just the filename
    if (filename.includes('/')) {
      filename = filename.split('/').pop() || '';
    }
    
    const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
    
    console.log(`🎬 GALLERY VIDEO PROXY v1.0.1754928443 - Item ${index}:`);
    console.log(`   - Raw videoFilename: ${item.videoFilename}`);
    console.log(`   - Extracted filename: ${filename}`);
    console.log(`   - Proxy URL: ${proxyUrl}`);
    console.log("✅ USING SAME VIDEO PROXY AS HERO VIDEOS (FILENAME ONLY)!");
    
    return proxyUrl;
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
    console.log(`🚨 EMERGENCY CLICK DEBUG: handlePlayClick triggered for item ${index}`);
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
      // Track video view analytics BEFORE opening lightbox
      const videoFilename = item.videoFilename || '';
      const cleanFilename = videoFilename.includes('/') ? videoFilename.split('/').pop() : videoFilename;
      console.log(`📊 PRODUCTION ANALYTICS: Tracking gallery video view for: ${cleanFilename}`);
      trackVideoView(cleanFilename || '');
      
      // Check if we have a preloaded video element for instant playback
      const filename = cleanFilename || '';
      const preloadedVideo = preloadedVideoElements.get(filename);
      
      if (preloadedVideo && preloadedVideo.readyState >= 3) {
        console.log(`⚡ INSTANT PLAYBACK: Using preloaded video element for ${filename}`);
        console.log(`📊 Video readyState: ${preloadedVideo.readyState}/4 - READY FOR INSTANT PLAY!`);
        console.log(`🎯 TRANSFERRING PRELOADED ELEMENT: Setting currentTime to 0 and ready for instant play`);
        
        // Reset the preloaded video to start and pause it
        preloadedVideo.currentTime = 0;
        preloadedVideo.pause();
        
        // Use the proxy URL but mark as instant ready so VideoOverlay knows to use preloaded data
        const videoUrl = getVideoUrl(item, index);
        setLightboxVideo({
          ...item, 
          lightboxVideoUrl: videoUrl,
          isInstantReady: true,
          preloadedElement: preloadedVideo
        });
      } else {
        console.log(`⏳ FALLBACK: No preloaded video for ${filename}, using regular proxy`);
        const videoUrl = getVideoUrl(item, index);
        setLightboxVideo({
          ...item, 
          lightboxVideoUrl: videoUrl,
          isInstantReady: false
        });
      }
      
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

  // 🎯 INSTANT GALLERY VIDEO SYSTEM - Store preloaded video elements for instant reuse
  const [preloadedVideoElements, setPreloadedVideoElements] = useState<Map<string, HTMLVideoElement>>(new Map());

  // 🚀 AGGRESSIVE PRELOADING SYSTEM - Create persistent video elements for instant startup
  useEffect(() => {
    if (!galleryItems.length) return;

    const createPreloadedVideo = async (videoUrl: string, filename: string) => {
      if (preloadedVideoElements.has(filename)) return;

      try {
        console.log(`🎯 CREATING PERSISTENT VIDEO ELEMENT: ${filename}`);
        
        // Create persistent video element that stays ready
        const video = document.createElement('video');
        video.src = videoUrl;
        video.preload = 'auto';
        video.style.display = 'none';
        video.muted = true;
        video.playsInline = true;
        
        // Add unique ID for tracking
        video.id = `preloaded-${filename}`;
        
        // Add to DOM and keep it there for instant access
        document.body.appendChild(video);
        
        // Wait for video to be ready
        const loadPromise = new Promise<void>((resolve) => {
          const handleReady = () => {
            console.log(`✅ INSTANT VIDEO READY: ${filename} - ${video.readyState}/4`);
            
            // Store the ready video element for instant reuse
            setPreloadedVideoElements(prev => {
              const newMap = new Map(prev);
              newMap.set(filename, video);
              return newMap;
            });
            
            setPreloadedVideos(prev => new Set(Array.from(prev).concat([filename])));
            resolve();
          };
          
          // Multiple ready state checks for maximum compatibility
          video.addEventListener('canplaythrough', handleReady, { once: true });
          video.addEventListener('canplay', handleReady, { once: true });
          video.addEventListener('loadeddata', handleReady, { once: true });
          
          // Immediate check if already loaded
          if (video.readyState >= 3) { // HAVE_FUTURE_DATA or better
            handleReady();
          }
          
          // Fallback timeout
          setTimeout(() => {
            if (video.readyState >= 1) { // At least HAVE_METADATA
              console.log(`⏰ FALLBACK READY: ${filename} - readyState: ${video.readyState}`);
              handleReady();
            }
          }, 2000);
        });
        
        // Force load immediately
        video.load();
        
        // Add 500ms timeout to let console messages appear
        setTimeout(() => {
          console.log(`🎯 CREATING PERSISTENT VIDEO ELEMENT: ${filename} - Video loaded, readyState: ${video.readyState}`);
        }, 500);
        
        await loadPromise;
        
      } catch (error) {
        console.warn(`⚠️ PRELOAD FAILED: ${filename}:`, error);
      }
    };

    // Start preloading ALL gallery videos immediately
    const startPreloading = () => {
      console.log(`🚀 INSTANT VIDEO SYSTEM: Preloading ${galleryItems.length} gallery items`);
      
      galleryItems.forEach((item, index) => {
        if (hasVideo(item, index)) {
          const videoUrl = getVideoUrl(item, index);
          const filename = item.videoFilename?.split('/').pop() || '';
          
          if (filename && !preloadedVideoElements.has(filename)) {
            console.log(`🚀 PRELOADING: ${filename}`);
            // Stagger preloads to avoid network congestion
            setTimeout(() => {
              createPreloadedVideo(videoUrl, filename);
            }, index * 200); // Reduced to 200ms for faster preloading
          }
        }
      });
    };

    // Start immediately after component mounts
    console.log(`🎯 SCHEDULING PRELOAD: Will start in 500ms`);
    const timeoutId = setTimeout(() => {
      console.log(`🎯 TIMEOUT TRIGGERED: Starting preload now`);
      startPreloading();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [galleryItems, preloadedVideoElements, hasVideo, getVideoUrl]);

  // Cleanup preloaded video elements on unmount
  useEffect(() => {
    return () => {
      preloadedVideoElements.forEach((video, filename) => {
        try {
          if (document.body.contains(video)) {
            console.log(`🧹 CLEANING UP: ${filename}`);
            document.body.removeChild(video);
          }
        } catch (error) {
          console.warn(`Cleanup warning for ${filename}:`, error);
        }
      });
    };
  }, [preloadedVideoElements]);

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
    <section id="gallery" className="pt-4 pb-8 bg-gradient-to-br from-memopyk-cream/30 to-white">
      <div className="container mx-auto px-4">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy mb-6 px-2">
            {t.title}
          </h2>
          <p className="text-lg sm:text-xl text-memopyk-dark-blue mb-2 px-4">
            {t.subtitle}
          </p>
          <p className="text-sm sm:text-base text-memopyk-navy max-w-4xl mx-auto px-4">
            {t.description}
          </p>
        </div>



        {/* Gallery Grid - Conditional Rendering for Mobile Enhancement */}
        {(() => {
          console.log(`📱 MOBILE DETECTION: isMobile=${isMobile}, showing ${isMobile ? 'MOBILE' : 'DESKTOP'} gallery`);
          return null;
        })()}
        {isMobile ? (
          <MobileEnhancedGallery
            items={galleryItems}
            language={language}
            onVideoClick={(item) => {
              // Track video view analytics for mobile gallery
              const videoFilename = item.videoFilename || '';
              const cleanFilename = videoFilename.includes('/') ? videoFilename.split('/').pop() : videoFilename;
              console.log(`📊 PRODUCTION ANALYTICS: Mobile gallery video view for: ${cleanFilename}`);
              trackVideoView(cleanFilename || '');
              
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
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12"
            onClick={(e) => {
              console.log(`🚨 EMERGENCY: Gallery container clicked!`, e.target);
            }}
          >
          {galleryItems.map((item, index) => {
            const imageUrl = getImageUrl(item);
            const thumbnailUrl = imageUrl;

            const itemHasVideo = hasVideo(item, index);
            
            // CRITICAL FIX: Cards with videos should NEVER be flipped by default
            // Only flip if explicitly flipped AND has no video
            const isFlipped = flippedCards.has(item.id) && !itemHasVideo;
            

            
            return (
              <div 
                key={item.id} 
                data-video-id={item.id}
                className={`card-flip-container ${isFlipped ? 'flipped' : ''} rounded-2xl cursor-pointer`}
                onClick={(e) => {
                  console.log(`🚨 EMERGENCY CLICK DEBUG: Card container clicked for item ${index}`);
                  // Only handle click if it's not from a child element
                  if (e.target === e.currentTarget) {
                    handlePlayClick(item, e, index);
                  }
                }}
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
                            className="w-full h-full object-cover cursor-pointer"
                            fallbackSrc="/placeholder-gallery.jpg"
                            onLoad={() => console.log(`🖼️ LazyImage loaded: ${thumbnailUrl}`)}
                            onError={() => console.log(`❌ LazyImage failed to load: ${thumbnailUrl}`)}
                            onClick={(e) => {
                              console.log(`🚨 EMERGENCY CLICK DEBUG: Image clicked for item ${index}`);
                              e.stopPropagation();
                              handlePlayClick(item, e, index);
                            }}
                          />
                          
                          {/* Top overlays - Mobile Responsive */}
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-center gap-2">
                            {/* Source Overlay (1) - Mobile Optimized */}
                            {getItemSource(item) && (
                              <div className="bg-black/70 text-white px-3 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm backdrop-blur-sm max-w-[180px] sm:max-w-none flex flex-col items-center justify-center min-h-[32px] sm:min-h-[36px]">
                                <div className="font-medium leading-tight whitespace-nowrap">{getItemSource(item)}</div>
                                <div className="text-xs text-gray-300 hidden sm:block">
                                  {language === 'fr-FR' ? 'fournies par Client' : 'provided by Client'}
                                </div>
                              </div>
                            )}


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
                          
                          {/* Desktop Play Button - Orange for Video, White for No Video */}
                          <div 
                            className="absolute inset-0 flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              console.log(`🚨 EMERGENCY CLICK DEBUG: Container clicked for item ${index}`);
                              handlePlayClick(item, e, index);
                            }}
                          >
                            {/* Dynamic Play Button Based on Video Availability */}
                            <div 
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer ${itemHasVideo ? 'animate-pulse-orange' : ''}`}
                              onClick={(e) => {
                                console.log(`🚨 EMERGENCY CLICK DEBUG: Play button clicked for item ${index}`);
                                e.stopPropagation(); // Prevent double handling
                                handlePlayClick(item, e, index);
                              }}
                              style={itemHasVideo ? {
                                // Orange for items WITH video
                                background: 'linear-gradient(135deg, rgba(214, 124, 74, 0.95) 0%, rgba(214, 124, 74, 0.85) 50%, rgba(184, 90, 47, 0.95) 100%)',
                                boxShadow: '0 4px 12px rgba(214, 124, 74, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                backdropFilter: 'blur(2px)'
                              } : {
                                // White for items WITHOUT video
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                backdropFilter: 'blur(2px)'
                              }}
                            >
                              {/* Play Triangle - White for Orange Button, Dark for White Button */}
                              <div className="text-lg sm:text-xl ml-0.5" style={{ 
                                color: itemHasVideo ? 'white' : '#2A4759' 
                              }}>
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

                    {/* Card Content - Mobile Optimized with balanced spacing */}
                    <div className="pt-1 pb-3 sm:pb-4 lg:pb-6">
                      {/* Title and Social Media Badge Row - Same line with responsive spacing */}
                      <div className="mb-1 sm:mb-1">
                        <div className="px-3 sm:px-4 lg:px-6 flex justify-between items-start gap-2">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white h-6 sm:h-8 overflow-hidden leading-6 sm:leading-8 flex-1">
                            {getItemTitle(item)}
                          </h3>
                        </div>
                        
                        {/* Social Media Badge positioned with overlay spacing */}
                        <div className="absolute right-2 sm:right-4 -mt-6 sm:-mt-8">
                          {/* Social Media Badge - Positioned to match price badge overlay spacing */}
                          {(() => {
                            const format = getViewingFormat(item);
                            const IconComponent = format.icon;
                            // Standardized labels
                            const standardPlatform = language === 'fr-FR' ? 'Format Recommandé' : 'Recommended Format';
                            return (
                              <div className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm flex-shrink-0 h-6 sm:h-8">
                                <IconComponent className="w-2.5 h-2.5 flex-shrink-0" />
                                <div className="min-w-0 flex flex-col justify-center items-center text-center">
                                  <div className="opacity-60 leading-tight truncate" style={{ fontSize: '8px' }}>{standardPlatform}</div>
                                  <div className="font-semibold leading-tight truncate" style={{ fontSize: '10px' }}>{format.type}</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                          
                      {/* Duration (5) - Mobile Optimized with content padding */}
                      <div className="px-3 sm:px-4 lg:px-6 mb-2 sm:mb-3 h-5 sm:h-6 overflow-hidden flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                        <div className="text-xs sm:text-sm leading-4 ml-1 sm:ml-2" style={{ color: '#4B5563' }}>
                          {getItemDuration(item) || <div className="h-4"></div>}
                        </div>
                      </div>
                      
                      {/* Story (6) - Mobile Optimized with content padding - 5 lines for mobile */}
                      <div className="px-3 sm:px-4 lg:px-6 mb-2 sm:mb-3 h-20 sm:h-20 overflow-hidden">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Film className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemStory(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Situation (7) - Mobile Optimized with content padding - 5 lines for mobile */}
                      <div className="px-3 sm:px-4 lg:px-6 h-20 sm:h-20 overflow-hidden">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemSituation(item) || <div className="h-4"></div>}
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

        {/* Enhanced Call to Action - After Gallery */}
        <div className="text-center mt-16">
          <div className="relative bg-gradient-to-br from-memopyk-dark-blue via-memopyk-navy to-memopyk-dark-blue p-10 rounded-3xl shadow-2xl border border-memopyk-orange/20 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-memopyk-orange/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-memopyk-sky-blue/10 rounded-full blur-2xl"></div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Compelling Subtitle */}
              <p className="text-lg md:text-xl text-memopyk-cream/90 mb-6 max-w-3xl mx-auto leading-relaxed">
                {language === 'fr-FR' 
                  ? "✨ Ne laissez pas vos souvenirs disparaître — révélez-les à travers un film personnel, unique et émouvant, créé grâce à une expertise professionnelle et une passion pour la mise en valeur de vos plus beaux moments. ✨"
                  : "✨ Don't let your memories disappear — reveal them through a personal, unique, and moving film, crafted with professional expertise and a passion for showcasing your most beautiful moments. ✨"
                }
              </p>

              {/* Value Proposition */}
              <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm md:text-base">
                <div className="flex items-center text-memopyk-cream/80">
                  <div className="w-2 h-2 bg-memopyk-orange rounded-full mr-2"></div>
                  {language === 'fr-FR' ? "Livraison 1-3 semaines" : "1-3 weeks delivery"}
                </div>
                <div className="flex items-center text-memopyk-cream/80">
                  <div className="w-2 h-2 bg-memopyk-orange rounded-full mr-2"></div>
                  {language === 'fr-FR' ? "2 séries de retours incluses" : "2 revision rounds included"}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {/* Use the same CTA settings as the main CTA section */}
                {(ctaSettings as any[])
                  .filter((cta: any) => cta.isActive)
                  .map((cta: any) => {
                    const url = language === 'fr-FR' ? cta.buttonUrlFr : cta.buttonUrlEn;
                    return (
                      <a
                        key={cta.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-3 bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-6 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer no-underline w-full sm:w-auto whitespace-nowrap min-w-0"
                      >
                        {cta.id === 'book_call' ? <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> : <Edit className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                        <span className="block">
                          {language === 'fr-FR' ? cta.buttonTextFr : cta.buttonTextEn}
                        </span>
                      </a>
                    );
                  })
                }
              </div>


            </div>
          </div>
        </div>

      </div>

      {/* Video Lightbox Modal */}
      {lightboxVideo && (
        <VideoOverlay
          videoUrl={lightboxVideo.lightboxVideoUrl || getVideoUrl(lightboxVideo, 0)}
          title={getItemTitle(lightboxVideo)}
          width={lightboxVideo.videoWidth || 16}
          height={lightboxVideo.videoHeight || 9}
          orientation={lightboxVideo.videoWidth > lightboxVideo.videoHeight ? 'landscape' : 'portrait'}
          onClose={closeLightbox}
          isInstantReady={lightboxVideo.isInstantReady}
          preloadedElement={lightboxVideo.preloadedElement}
        />
      )}
    </section>
  );
}