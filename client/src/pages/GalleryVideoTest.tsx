import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, Image, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Gallery item type from the main gallery (snake_case from API)
interface GalleryItem {
  id: string;
  title_en: string;
  title_fr: string;
  video_url_en: string;
  video_url_fr: string;
  image_url_en: string;
  image_url_fr: string;
  static_image_url_en: string;
  static_image_url_fr: string;
  is_active: boolean;
}

export default function GalleryVideoTest() {
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());

  // Fetch gallery items
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const activeItems = galleryItems.filter(item => item.is_active);

  const toggleVideo = (videoId: string) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  // Helper to get video filename from URL
  const getVideoFilename = (videoUrl: string): string => {
    if (!videoUrl) return '';
    return videoUrl.includes('/') ? videoUrl.split('/').pop() || '' : videoUrl;
  };

  // Helper to get image filename from URL
  const getImageFilename = (imageUrl: string): string => {
    if (!imageUrl) return '';
    return imageUrl.includes('/') ? imageUrl.split('/').pop() || '' : imageUrl;
  };

  console.log('🔍 Gallery Debug:', {
    totalItems: galleryItems.length,
    activeItems: activeItems.length,
    firstItem: galleryItems[0] ? {
      id: galleryItems[0].id,
      is_active: galleryItems[0].is_active,
      title_en: galleryItems[0].title_en,
      video_url_en: galleryItems[0].video_url_en,
      image_url_en: galleryItems[0].image_url_en
    } : null
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">Loading gallery items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Gallery Video & Image Cache Test
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Testing gallery videos and images served from VPS cache instead of direct Supabase CDN
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Video className="w-4 h-4 mr-1" />
              Videos: Via /api/video-proxy (cached)
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <Image className="w-4 h-4 mr-1" />
              Images: Via /api/image-proxy (cached)
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeItems.map((item) => {
            const videoFilename = getVideoFilename(item.video_url_en);
            const imageFilename = getImageFilename(item.static_image_url_en || item.image_url_en);
            const isPlaying = playingVideos.has(item.id);

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">{item.title_en || 'Untitled Gallery Item'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Image Test Section */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2 text-gray-700">
                      Image (Cache Test):
                    </h4>
                    <div className="relative">
                      <img
                        src={`/api/image-proxy?filename=${imageFilename}`}
                        alt={item.title_en || 'Gallery Item'}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          console.error(`Image cache failed for ${imageFilename}`);
                          // Fallback to direct CDN
                          (e.target as HTMLImageElement).src = item.static_image_url_en || item.image_url_en;
                        }}
                      />
                      <Badge className="absolute top-2 right-2 bg-green-600 text-white text-xs">
                        Cache
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      File: {imageFilename}
                    </p>
                  </div>

                  {/* Video Test Section */}
                  {videoFilename && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-gray-700">
                        Video (Cache Test):
                      </h4>
                      <div className="relative">
                        <video
                          className="w-full h-32 object-cover rounded-lg"
                          controls={false}
                          muted
                          loop
                          playsInline
                          ref={(video) => {
                            if (video) {
                              if (isPlaying) {
                                video.play().catch(console.error);
                              } else {
                                video.pause();
                              }
                            }
                          }}
                          onError={(e) => {
                            console.error(`Video cache failed for ${videoFilename}`);
                          }}
                        >
                          <source 
                            src={`/api/gallery-video-proxy?filename=${videoFilename}`} 
                            type="video/mp4" 
                          />
                          Your browser does not support the video tag.
                        </video>
                        
                        {/* Play/Pause Button */}
                        <Button
                          size="sm"
                          className="absolute inset-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => toggleVideo(item.id)}
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6" />
                          ) : (
                            <Play className="w-6 h-6" />
                          )}
                        </Button>
                        
                        <Badge className="absolute top-2 right-2 bg-blue-600 text-white text-xs">
                          Cache
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        File: {videoFilename}
                      </p>
                    </div>
                  )}

                  {/* Performance Comparison */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold text-xs text-gray-700 mb-2">Performance:</h5>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Expected: ~50ms (cache)</div>
                      <div>Current CDN: ~1500ms</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {activeItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No active gallery items found.</p>
          </div>
        )}
      </div>
    </div>
  );
}