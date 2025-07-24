import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVideoAnalytics } from "@/hooks/useVideoAnalytics";
import { Button } from "@/components/ui/button";
import { VideoOverlay } from "@/components/gallery/VideoOverlay";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Star, ArrowRight, Image as ImageIcon, Film, Users, Clock } from "lucide-react";
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
  sorryMessageEn: string; // "Sorry, we cannot show you the video at this stage"
  sorryMessageFr: string; // "Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
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

  const [flippedCards, setFlippedCards] = useState<Set<string | number>>(new Set());
  
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
        sorryMessageEn: item.sorry_message_en,
        sorryMessageFr: item.sorry_message_fr,
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

  const getItemSorryMessage = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.sorryMessageFr : item.sorryMessageEn;
  };

  const hasVideo = (item: GalleryItem) => {
    const videoUrl = language === 'fr-FR' ? item.videoUrlFr : item.videoUrlEn;
    return videoUrl && videoUrl.trim() !== '';
  };

  const handlePlayClick = (item: GalleryItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasVideo(item)) {
      // Original behavior: play video with pulsing orange button
      const videoUrl = language === 'fr-FR' ? item.videoUrlFr : item.videoUrlEn;
      console.log('🎬 DIRECT CDN VIDEO URL:', videoUrl);
      
      setPreviewItem({
        type: 'video',
        url: videoUrl,
        title: getItemTitle(item),
        itemId: String(item.id),
        width: item.videoWidth,
        height: item.videoHeight,
        orientation: item.videoOrientation as 'landscape' | 'portrait'
      });
      
      trackVideoView(String(item.id), getItemTitle(item), 'gallery');
    } else {
      // New behavior: flip card to show sorry message
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
            const thumbnailUrl = imageUrl;
            const itemHasVideo = hasVideo(item);
            const isFlipped = flippedCards.has(item.id);
            

            
            return (
              <div 
                key={item.id} 
                className={`card-flip-container ${isFlipped ? 'flipped' : ''} rounded-2xl`}
              >
                <div className="card-flip-inner">
                  {/* FRONT SIDE - Normal Gallery Card */}
                  <div className="card-front bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                    {/* Image with Overlays - Always 3:2 aspect ratio */}
                    <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-700 relative overflow-hidden rounded-t-2xl">
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
                            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-full text-sm backdrop-blur-sm">
                              <div className="font-medium">{getItemSource(item)}</div>
                              <div className="text-xs text-gray-300">provided by Client</div>
                            </div>
                          )}

                          {/* Price Tag - Bottom Right (3) */}
                          {getItemPrice(item) && (
                            <div 
                              className="absolute bottom-4 right-4 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm"
                              style={{ backgroundColor: 'rgba(214, 124, 74, 0.9)' }} // MEMOPYK orange with transparency
                            >
                              {getItemPrice(item)}
                            </div>
                          )}
                          
                          {/* Play Button - Center (3) */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            {itemHasVideo ? (
                              // Orange filled circle button for videos - matching your design
                              <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer"
                                onClick={(e) => handlePlayClick(item, e)}
                                style={{
                                  backgroundColor: '#D67C4A', // MEMOPYK orange from brand palette
                                  border: 'none'
                                }}
                              >
                                <div className="text-white text-xl ml-1">▶</div>
                              </div>
                            ) : (
                              // White circle button with border for card flip - matching your design
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md cursor-pointer bg-white border-2 border-gray-300"
                                onClick={(e) => handlePlayClick(item, e)}
                              >
                                <div className="text-gray-600 text-xl ml-1">▶</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image available
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="px-6 pt-1 pb-6">
                      {/* Duration (5) - Clock icon, single line height */}
                      <div className="mb-2 h-6 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemDuration(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>

                      {/* Title (4) - Fixed height: 32px */}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 h-8 overflow-hidden">
                        {getItemTitle(item)}
                      </h3>
                      
                      {/* Situation (6) - Users icon, fixed height: 80px (5 lines max) */}
                      <div className="mb-3 h-20 overflow-hidden">
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemSituation(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Story (7) - Film icon, fixed height: 80px (5 lines max) */}
                      <div className="h-20 overflow-hidden">
                        <div className="flex items-start gap-2">
                          <Film className="w-4 h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-sm leading-4" style={{ color: '#4B5563' }}>
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
                        onClick={(e) => handlePlayClick(item, e)}
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