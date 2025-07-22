import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Image as ImageIcon, Eye, X } from 'lucide-react';
import { useState } from 'react';

interface GalleryItem {
  id: number;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  video_url_en?: string;
  video_url_fr?: string;
  image_url_en?: string;
  image_url_fr?: string;
  price_en: string;
  price_fr: string;
  alt_text_en: string;
  alt_text_fr: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function GallerySection() {
  const { language } = useLanguage();
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch gallery items - filter for active items only
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'],
    select: (data) => data
      .filter(item => item.is_active)
      .sort((a, b) => a.order_index - b.order_index)
  });

  const getLocalizedContent = (item: GalleryItem) => ({
    title: language === 'fr' ? item.title_fr : item.title_en,
    description: language === 'fr' ? item.description_fr : item.description_en,
    price: language === 'fr' ? item.price_fr : item.price_en,
    videoUrl: language === 'fr' ? item.video_url_fr : item.video_url_en,
    imageUrl: language === 'fr' ? item.image_url_fr : item.image_url_en,
    altText: language === 'fr' ? item.alt_text_fr : item.alt_text_en,
  });

  const openPreview = (item: GalleryItem) => {
    setSelectedItem(item);
    setShowPreview(true);
  };

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-br from-memopyk-cream to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (galleryItems.length === 0) {
    return null; // Don't show section if no active items
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-memopyk-cream to-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{ color: '#011526' }}
          >
            {language === 'fr' ? 'Notre Galerie' : 'Our Gallery'}
          </h2>
          <p 
            className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            style={{ color: '#011526' }}
          >
            {language === 'fr' 
              ? 'Découvrez nos créations de films mémoire qui transforment vos moments précieux en souvenirs éternels.'
              : 'Discover our memory film creations that transform your precious moments into eternal memories.'
            }
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleryItems.map((item) => {
            const localizedContent = getLocalizedContent(item);
            
            return (
              <Card 
                key={item.id} 
                className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white border-0 overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* Media Preview */}
                  <div className="aspect-video relative overflow-hidden bg-gray-100">
                    {localizedContent.videoUrl ? (
                      <div className="relative w-full h-full">
                        <video
                          src={localizedContent.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div 
                          className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-all flex items-center justify-center cursor-pointer"
                          onClick={() => openPreview(item)}
                        >
                          <div 
                            className="rounded-full p-4 group-hover:scale-110 transition-transform shadow-xl"
                            style={{ backgroundColor: '#D67C4A' }}
                          >
                            <Play className="h-8 w-8 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    ) : localizedContent.imageUrl ? (
                      <div 
                        className="relative w-full h-full cursor-pointer group"
                        onClick={() => openPreview(item)}
                      >
                        <img
                          src={localizedContent.imageUrl}
                          alt={localizedContent.altText}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-16 w-16" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 
                        className="text-xl font-semibold line-clamp-2"
                        style={{ color: '#011526' }}
                      >
                        {localizedContent.title}
                      </h3>
                      <Badge 
                        className="ml-2 text-white font-semibold shrink-0"
                        style={{ backgroundColor: '#D67C4A' }}
                      >
                        {localizedContent.price}
                      </Badge>
                    </div>
                    
                    <p 
                      className="text-gray-600 mb-4 line-clamp-3"
                    >
                      {localizedContent.description}
                    </p>

                    <Button
                      onClick={() => openPreview(item)}
                      className="w-full text-white font-semibold py-2 px-4 rounded-lg transition-all hover:scale-105"
                      style={{ backgroundColor: '#D67C4A' }}
                    >
                      {language === 'fr' ? 'Voir les détails' : 'View Details'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call-to-Action */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            className="text-white font-semibold py-4 px-8 text-lg rounded-lg transition-all hover:scale-105 shadow-lg"
            style={{ backgroundColor: '#D67C4A' }}
          >
            {language === 'fr' 
              ? 'Créer votre film mémoire' 
              : 'Create Your Memory Film'
            }
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      {selectedItem && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center text-2xl" style={{ color: '#011526' }}>
                {getLocalizedContent(selectedItem).title}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPreview(false)}
                  className="ml-4"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Media Display */}
              <div className="aspect-video rounded-lg overflow-hidden">
                {getLocalizedContent(selectedItem).videoUrl ? (
                  <video
                    src={getLocalizedContent(selectedItem).videoUrl}
                    controls
                    className="w-full h-full object-cover"
                    autoPlay
                  />
                ) : getLocalizedContent(selectedItem).imageUrl ? (
                  <img
                    src={getLocalizedContent(selectedItem).imageUrl}
                    alt={getLocalizedContent(selectedItem).altText}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>

              {/* Content Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg text-gray-700 leading-relaxed">
                      {getLocalizedContent(selectedItem).description}
                    </p>
                  </div>
                  <Badge 
                    className="ml-4 text-lg px-4 py-2 text-white font-semibold"
                    style={{ backgroundColor: '#D67C4A' }}
                  >
                    {getLocalizedContent(selectedItem).price}
                  </Badge>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    size="lg"
                    className="flex-1 text-white font-semibold py-3 px-6 rounded-lg transition-all hover:scale-105"
                    style={{ backgroundColor: '#D67C4A' }}
                  >
                    {language === 'fr' ? 'Commander maintenant' : 'Order Now'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 py-3 px-6 rounded-lg"
                    style={{ borderColor: '#D67C4A', color: '#D67C4A' }}
                  >
                    {language === 'fr' ? 'En savoir plus' : 'Learn More'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}