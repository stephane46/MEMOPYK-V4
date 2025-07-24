import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVideoAnalytics } from "@/hooks/useVideoAnalytics";
import { Button } from "@/components/ui/button";
import { VideoOverlay } from "@/components/gallery/VideoOverlay";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Star, ArrowRight, Image as ImageIcon } from "lucide-react";
// Gallery item interface matching the new schema
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
  videoUrlEn: string;
  videoUrlFr: string;
  videoWidth: number;
  videoHeight: number;
  videoOrientation: string;
  imageUrlEn: string;
  imageUrlFr: string;
  staticImageUrl: string | null; // 300x200 cropped thumbnail
  orderIndex: number;
  isActive: boolean;
}

export default function GallerySection() {
  const { language } = useLanguage();
  const { trackVideoView } = useVideoAnalytics();
  const [previewItem, setPreviewItem] = useState<{ 
    type: 'video' | 'image'; 
    url: string; 
    title: string; 
    itemId: number;
    width?: number;
    height?: number;
    orientation?: 'landscape' | 'portrait';
  } | null>(null);
  
  // Fetch active gallery items with type conversion from snake_case API
  const { data: galleryItems = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/gallery'],
    staleTime: 0, // Always refetch to get latest static images
    gcTime: 0, // Don't cache to ensure fresh data
    select: (data) => data
      .filter(item => item.is_active)
      .sort((a, b) => a.order_index - b.order_index)
      .map(item => ({
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
        videoUrlEn: item.video_url_en,
        videoUrlFr: item.video_url_fr,
        videoWidth: item.video_width,
        videoHeight: item.video_height,
        videoOrientation: item.video_orientation,
        imageUrlEn: item.image_url_en,
        imageUrlFr: item.image_url_fr,
        staticImageUrl: item.static_image_url,
        orderIndex: item.order_index,
        isActive: item.is_active
      }))
  });

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

  const getItemUrl = (item: GalleryItem, type: 'video' | 'image') => {
    if (type === 'video') {
      // Use direct CDN URLs since proxy system has deployment issues
      const videoUrl = language === 'fr-FR' ? item.videoUrlFr : item.videoUrlEn;
      console.log(`🎬 DIRECT CDN VIDEO URL: ${videoUrl}`);
      return videoUrl;
    } else {
      // Prioritize static image (300x200 cropped) if available, otherwise use regular image
      if (item.staticImageUrl && item.staticImageUrl.trim() !== '') {
        return item.staticImageUrl;
      }
      return language === 'fr-FR' ? item.imageUrlFr : item.imageUrlEn;
    }
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
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {t.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            {t.subtitle}
          </p>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t.description}
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {galleryItems.map((item, index) => {
            const videoUrl = getItemUrl(item, 'video');
            const imageUrl = getItemUrl(item, 'image');
            
            // For thumbnail display: prioritize static image, then regular image, then video thumbnail
            const thumbnailUrl = imageUrl; // getItemUrl('image') already prioritizes static images
            
            // For preview modals: use video if available, otherwise image
            const hasVideo = Boolean(videoUrl);
            const hasImage = Boolean(imageUrl);
            const previewUrl = hasVideo ? videoUrl : imageUrl;
            const mediaType = hasVideo ? 'video' : 'image';
            
            return (
              <div 
                key={item.id} 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                {/* Image with Overlays - Always 3:2 aspect ratio */}
                <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  {thumbnailUrl ? (
                    <div className="w-full h-full relative">
                      {/* Main Image */}
                      <img
                        src={thumbnailUrl}
                        alt={getItemTitle(item)}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Top-left Source Overlay (1) */}
                      {getItemSource(item) && (
                        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
                          <div className="font-medium">{getItemSource(item)}</div>
                          <div className="text-xs opacity-90">provided by Client</div>
                        </div>
                      )}
                      
                      {/* Orange Play Button - Center (for videos only) */}
                      {hasVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button
                            onClick={() => {
                              console.log(`🎬 GALLERY VIDEO CLICK DEBUG:`);
                              console.log(`   - Item ID: ${item.id}`);
                              console.log(`   - Has Video: ${hasVideo}`);
                              console.log(`   - Preview URL: "${previewUrl}"`);
                              console.log(`   - Media Type: ${mediaType}`);
                              console.log(`   - Video Width: ${item.videoWidth}`);
                              console.log(`   - Video Height: ${item.videoHeight}`);
                              console.log(`   - Video Orientation: ${item.videoOrientation}`);
                              console.log(`   - Full item data:`, item);
                              
                              if (previewUrl) {
                                console.log(`✅ Setting preview item with URL: ${previewUrl}`);
                                setPreviewItem({ 
                                  type: mediaType, 
                                  url: previewUrl, 
                                  title: getItemTitle(item),
                                  itemId: parseInt(item.id),
                                  width: item.videoWidth,
                                  height: item.videoHeight,
                                  orientation: item.videoOrientation
                                });
                                trackVideoView(`gallery-${item.id}`, 0, false);
                              } else {
                                console.error(`❌ No preview URL available for item ${item.id}`);
                              }
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-2xl transform hover:scale-110 transition-all duration-300"
                          >
                            <Play className="h-6 w-6 ml-1" />
                          </button>
                        </div>
                      )}
                      
                      {/* Bottom-right Price Tag (2) */}
                      {getItemPrice(item) && (
                        <div className="absolute bottom-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {getItemPrice(item)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="h-16 w-16" />
                    </div>
                  )}
                </div>

                {/* Content Below Image - Fixed Height Sections for Alignment */}
                <div className="p-6">
                  {/* Title (3) - Fixed height */}
                  <div className="h-8 mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {getItemTitle(item)}
                    </h3>
                  </div>
                  
                  {/* Duration with Film Icon (4) - Fixed height for 5 lines */}
                  <div className="h-20 mb-4">
                    {getItemDuration(item) ? (
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                        <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                        </div>
                        <p className="text-sm leading-relaxed line-clamp-5">
                          {getItemDuration(item)}
                        </p>
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>
                  
                  {/* Situation with Client Icon (5) - Fixed height for 5 lines */}
                  <div className="h-20 mb-4">
                    {getItemSituation(item) ? (
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                        <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                        </div>
                        <p className="text-sm leading-relaxed line-clamp-5">
                          {getItemSituation(item)}
                        </p>
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>
                  
                  {/* Story with Film Icon (6) - Fixed height for 5 lines */}
                  <div className="h-20">
                    {getItemStory(item) ? (
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                        <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                        </div>
                        <p className="text-sm leading-relaxed line-clamp-5">
                          {getItemStory(item)}
                        </p>
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        {galleryItems.length > 6 && (
          <div className="text-center">
            <Button 
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full transform hover:scale-105 transition-all duration-300"
            >
              {t.viewAll}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}



        {/* Inline Video Overlay */}
        {previewItem && previewItem.type === 'video' && previewItem.width && previewItem.height && previewItem.orientation && (
          <VideoOverlay
            videoUrl={previewItem.url}
            title={previewItem.title}
            width={previewItem.width}
            height={previewItem.height}
            orientation={previewItem.orientation}
            onClose={() => setPreviewItem(null)}
          />
        )}
      </div>
    </section>
  );
}