import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVideoAnalytics } from "@/hooks/useVideoAnalytics";
import { Button } from "@/components/ui/button";
import { VideoOverlay } from "@/components/gallery/VideoOverlay";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Star, ArrowRight, Image as ImageIcon } from "lucide-react";

interface GalleryItem {
  id: number;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  video_url_en?: string;
  video_url_fr?: string;
  video_width?: number;
  video_height?: number;
  video_orientation?: 'landscape' | 'portrait';
  image_url_en?: string;
  image_url_fr?: string;
  price_en: string;
  price_fr: string;
  alt_text_en: string;
  alt_text_fr: string;
  order_index: number;
  is_active: boolean;
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
  
  // Fetch active gallery items
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'],
    select: (data) => data.filter(item => item.is_active).sort((a, b) => a.order_index - b.order_index)
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
      const videoUrl = language === 'fr-FR' ? item.video_url_fr : item.video_url_en;
      if (videoUrl) {
        // Extract filename from Supabase URL and use video proxy
        const filename = videoUrl.split('/').pop();
        return filename ? `/api/video-proxy?filename=${encodeURIComponent(filename)}` : null;
      }
      return null;
    } else {
      // Images can be displayed directly from Supabase
      return language === 'fr-FR' ? item.image_url_fr : item.image_url_en;
    }
  };

  const getItemTitle = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.title_fr : item.title_en;
  };

  const getItemDescription = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.description_fr : item.description_en;
  };

  const getItemPrice = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.price_fr : item.price_en;
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
            const hasVideo = getItemUrl(item, 'video');
            const hasImage = getItemUrl(item, 'image');
            const displayUrl = hasVideo || hasImage;
            const mediaType = hasVideo ? 'video' : 'image';
            
            return (
              <div 
                key={item.id} 
                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
              >
                {/* Media Preview */}
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  {displayUrl ? (
                    <div className="w-full h-full relative">
                      {hasVideo ? (
                        <video
                          src={hasVideo}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : hasImage ? (
                        <img
                          src={hasImage}
                          alt={language === 'fr-FR' ? item.alt_text_fr : item.alt_text_en}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                      
                      {/* Orange Pulsing Play Button - Always Visible for Videos */}
                      {hasVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button
                            onClick={() => {
                              if (displayUrl) {
                                setPreviewItem({ 
                                  type: mediaType, 
                                  url: displayUrl, 
                                  title: getItemTitle(item),
                                  itemId: item.id,
                                  width: item.video_width,
                                  height: item.video_height,
                                  orientation: item.video_orientation
                                });
                                // Track gallery video preview clicks for analytics
                                trackVideoView(`gallery-${item.id}`, 0, false);
                              }
                            }}
                            className="bg-memopyk-orange hover:bg-memopyk-orange/80 text-white rounded-full p-6 shadow-2xl animate-pulse-elegant transform hover:scale-110 transition-all duration-300 border-4 border-white/20 backdrop-blur-sm"
                          >
                            <Play className="h-8 w-8 ml-1" />
                          </button>
                        </div>
                      )}
                      
                      {/* Hover Overlay for Images */}
                      {hasImage && !hasVideo && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Button
                              onClick={() => {
                                if (displayUrl) {
                                  setPreviewItem({ 
                                    type: mediaType, 
                                    url: displayUrl, 
                                    title: getItemTitle(item),
                                    itemId: item.id,
                                    width: item.video_width,
                                    height: item.video_height,
                                    orientation: item.video_orientation
                                  });
                                }
                              }}
                              className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-4 transform scale-90 group-hover:scale-100 transition-all duration-300"
                            >
                              <Eye className="h-6 w-6" />
                            </Button>
                          </div>
                        </div>
                      )}
                      

                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="h-16 w-16" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors">
                    {getItemTitle(item)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {getItemDescription(item)}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-orange-500">
                      <span className="text-sm text-gray-500 font-normal">{t.startingFrom}</span><br/>
                      {getItemPrice(item)}
                    </div>
                    <Button
                      onClick={() => {
                        if (displayUrl) {
                          setPreviewItem({ 
                            type: mediaType, 
                            url: displayUrl, 
                            title: getItemTitle(item),
                            itemId: item.id,
                            width: item.video_width,
                            height: item.video_height,
                            orientation: item.video_orientation
                          });
                          // Track gallery video preview clicks for analytics
                          if (mediaType === 'video') {
                            trackVideoView(`gallery-${item.id}`, 0, false);
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-all"
                    >
                      {t.preview}
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
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