import { useState, useEffect } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Wifi, WifiOff, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileEnhancedGalleryProps {
  items: any[];
  language: string;
  onVideoClick: (item: any) => void;
  onFlipCard: (id: string | number) => void;
  flippedCards: Set<string | number>;
}

export function MobileEnhancedGallery({
  items,
  language,
  onVideoClick,
  onFlipCard,
  flippedCards
}: MobileEnhancedGalleryProps) {
  const networkStatus = useNetworkStatus();
  const { orientation } = useDeviceOrientation();
  const [showNetworkBanner, setShowNetworkBanner] = useState(false);

  // Show network status banner on mobile when offline or slow connection
  useEffect(() => {
    const isSlowConnection = networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g';
    const shouldShow = !networkStatus.isOnline || isSlowConnection;
    setShowNetworkBanner(shouldShow);

    if (shouldShow) {
      const timer = setTimeout(() => setShowNetworkBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [networkStatus]);

  return (
    <div className="relative">
      {/* Network Status Banner */}
      {showNetworkBanner && (
        <div className={cn(
          "fixed top-16 left-0 right-0 z-40 p-3 text-center text-sm font-medium transition-all duration-300",
          !networkStatus.isOnline
            ? "bg-red-100 text-red-800 border-b border-red-200"
            : "bg-yellow-100 text-yellow-800 border-b border-yellow-200"
        )}>
          <div className="flex items-center justify-center gap-2">
            {!networkStatus.isOnline ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            {!networkStatus.isOnline
              ? (language === 'fr-FR' ? 'Mode hors ligne - Contenu limité' : 'Offline mode - Limited content')
              : (language === 'fr-FR' ? 'Connexion lente détectée' : 'Slow connection detected')
            }
          </div>
        </div>
      )}

      {/* Orientation-Aware Grid */}
      <div className={cn(
        "grid gap-4 sm:gap-6 lg:gap-8",
        orientation === 'landscape' && window.innerWidth < 768
          ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" // More columns in mobile landscape
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" // Standard responsive grid
      )}>
        {items.map((item, index) => {
          const isFlipped = flippedCards.has(item.id);
          const title = language === 'fr-FR' ? item.titleFr : item.titleEn;
          const hasVideo = Boolean(item.videoUrlEn && item.videoUrlFr);

          // Dynamic image URL selection with fallback
          const getImageUrl = () => {
            if (language === 'fr-FR') {
              return item.staticImageUrlFr || item.imageUrlFr || item.staticImageUrlEn || item.imageUrlEn;
            }
            return item.staticImageUrlEn || item.imageUrlEn || item.staticImageUrlFr || item.imageUrlFr;
          };

          return (
            <div
              key={item.id}
              className={cn(
                "card-flip-container group",
                isFlipped && "flipped"
              )}
            >
              <div className="card-flip-inner">
                {/* Front Card */}
                <div className="card-front absolute inset-0">
                  <div className="relative h-full bg-white rounded-xl shadow-lg overflow-hidden border hover:shadow-xl transition-all duration-300">
                    {/* Lazy-loaded Image */}
                    <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
                      <LazyImage
                        src={getImageUrl()}
                        alt={title}
                        className="w-full h-full object-contain"
                        placeholderClassName="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
                        fallbackSrc="/placeholder-gallery.jpg"
                        onError={() => console.warn(`Failed to load image for ${title}`)}
                      />
                      
                      {/* Mobile-Optimized Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Video Play Button - Enhanced for Mobile */}
                      {hasVideo && (
                        <Button
                          onClick={() => onVideoClick(item)}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-2 border-white/50 w-16 h-16 sm:w-20 sm:h-20 p-0 min-w-[44px] min-h-[44px]"
                          aria-label={`Play video: ${title}`}
                        >
                          <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-1" fill="currentColor" />
                        </Button>
                      )}

                      {/* Device Type Indicator */}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-black/20 text-white border-white/20 text-xs">
                          {orientation === 'landscape' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        </Badge>
                      </div>

                      {/* Priority Badge */}
                      {index < 2 && (
                        <Badge className="absolute top-2 left-2 bg-memopyk-orange text-white text-xs">
                          {language === 'fr-FR' ? 'Populaire' : 'Popular'}
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-memopyk-navy mb-2 text-sm sm:text-base line-clamp-2">
                        {title}
                      </h3>
                      
                      {/* Mobile-Optimized Action Button */}
                      <Button
                        onClick={() => onFlipCard(item.id)}
                        variant="outline"
                        size="sm"
                        className="w-full min-h-[44px] text-xs sm:text-sm"
                      >
                        {language === 'fr-FR' ? 'Voir détails' : 'View details'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Back Card - Same as existing but optimized */}
                <div className="card-back absolute inset-0 transform rotateY-180">
                  <div className="h-full bg-gradient-to-br from-memopyk-navy to-memopyk-blue-gray text-white rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-lg">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <h3 className="font-bold text-lg sm:text-xl mb-2 text-memopyk-cream">
                          {title}
                        </h3>
                        <p className="text-memopyk-orange font-semibold text-base sm:text-lg">
                          {language === 'fr-FR' ? item.priceFr : item.priceEn}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm">
                        <p><strong>{language === 'fr-FR' ? 'Source:' : 'Source:'}</strong> {language === 'fr-FR' ? item.sourceFr : item.sourceEn}</p>
                        <p><strong>{language === 'fr-FR' ? 'Durée:' : 'Duration:'}</strong> {language === 'fr-FR' ? item.durationFr : item.durationEn}</p>
                        <p><strong>{language === 'fr-FR' ? 'Format:' : 'Format:'}</strong> {language === 'fr-FR' ? item.formatPlatformFr : item.formatPlatformEn}</p>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm opacity-90">
                        <p>{language === 'fr-FR' ? item.situationFr : item.situationEn}</p>
                        <p>{language === 'fr-FR' ? item.storyFr : item.storyEn}</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => onFlipCard(item.id)}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full min-h-[44px] mt-4"
                    >
                      {language === 'fr-FR' ? 'Retourner' : 'Flip back'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}