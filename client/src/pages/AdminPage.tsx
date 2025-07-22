import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Play, Upload, Trash2, RefreshCw, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeroVideo {
  id: number;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  video_url: string;
  thumbnail_url?: string;
  order_index: number;
  is_active: boolean;
  duration?: number;
  file_size?: number;
}

interface CacheStats {
  fileCount: number;
  totalSize: number;
  sizeMB: string;
  maxCacheSizeMB: number;
  maxCacheAgeHours: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('hero-videos');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add logout functionality
  const handleLogout = () => {
    localStorage.removeItem('memopyk_admin_authenticated');
    window.dispatchEvent(new CustomEvent('authStateChange'));
    window.location.reload();
  };

  // Fetch hero videos
  const { data: heroVideos = [], isLoading: videosLoading } = useQuery<HeroVideo[]>({
    queryKey: ['/api/hero-videos'],
  });

  // Fetch cache statistics
  const { data: cacheStats, isLoading: cacheLoading } = useQuery<CacheStats>({
    queryKey: ['/api/video-cache/stats'],
  });

  // Video reordering mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ videoId, newOrder }: { videoId: number; newOrder: number }) => {
      return apiRequest(`/api/hero-videos/${videoId}/reorder`, 'PATCH', { order_index: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
      toast({ title: "Success", description: "Video order updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update video order", variant: "destructive" });
    }
  });

  // Video toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ videoId, isActive }: { videoId: number; isActive: boolean }) => {
      return apiRequest(`/api/hero-videos/${videoId}/toggle`, 'PATCH', { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
      toast({ title: "Success", description: "Video status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update video status", variant: "destructive" });
    }
  });

  // Cache refresh mutation
  const refreshCacheMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/video-cache/refresh', 'POST');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      toast({ 
        title: "Cache Refreshed", 
        description: `Successfully refreshed ${data.cached?.length || 0} critical videos`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to refresh video cache", variant: "destructive" });
    }
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/video-cache/clear', 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      toast({ title: "Cache Cleared", description: "Video cache cleared successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear video cache", variant: "destructive" });
    }
  });

  const handleReorder = (video: HeroVideo, direction: 'up' | 'down') => {
    const currentIndex = video.order_index;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Find video that currently has the target index
    const targetVideo = heroVideos.find((v) => v.order_index === newIndex);
    
    if (targetVideo) {
      // Swap orders
      reorderMutation.mutate({ videoId: video.id, newOrder: newIndex });
      reorderMutation.mutate({ videoId: targetVideo.id, newOrder: currentIndex });
    }
  };

  const handleToggleActive = (video: HeroVideo) => {
    toggleMutation.mutate({ videoId: video.id, isActive: !video.is_active });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                MEMOPYK Admin Panel
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage content, analytics, and system settings
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hero-videos">Hero Videos</TabsTrigger>
            <TabsTrigger value="hero-text">Hero Text</TabsTrigger>
            <TabsTrigger value="cache-management">Cache Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Hero Videos Management */}
          <TabsContent value="hero-videos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Hero Video Management
                </CardTitle>
                <CardDescription>
                  Manage hero carousel videos with bilingual support, ordering, and metadata
                </CardDescription>
              </CardHeader>
              <CardContent>
                {videosLoading ? (
                  <div className="text-center py-8">Loading videos...</div>
                ) : (
                  <div className="space-y-4">
                    {heroVideos
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((video) => (
                        <Card key={video.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Video Preview */}
                              <div className="space-y-4">
                                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                  {video.thumbnail_url ? (
                                    <img 
                                      src={video.thumbnail_url} 
                                      alt={video.title_en}
                                      className="w-full h-full object-cover rounded-lg"
                                    />
                                  ) : (
                                    <Play className="h-12 w-12 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={video.is_active ? "default" : "secondary"}>
                                    {video.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge variant="outline">
                                    Order: {video.order_index}
                                  </Badge>
                                  {video.duration && (
                                    <Badge variant="outline">
                                      {formatDuration(video.duration)}
                                    </Badge>
                                  )}
                                  {video.file_size && (
                                    <Badge variant="outline">
                                      {formatFileSize(video.file_size)}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Video Metadata */}
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium">English Title</Label>
                                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    {video.title_en}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">French Title</Label>
                                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    {video.title_fr}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Video URL</Label>
                                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm font-mono break-all">
                                    {video.video_url}
                                  </div>
                                </div>
                              </div>

                              {/* Video Controls */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <Label>Active Status</Label>
                                  <Switch
                                    checked={video.is_active}
                                    onCheckedChange={() => handleToggleActive(video)}
                                    disabled={toggleMutation.isPending}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Video Order</Label>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReorder(video, 'up')}
                                      disabled={video.order_index === 1 || reorderMutation.isPending}
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReorder(video, 'down')}
                                      disabled={video.order_index === heroVideos.length || reorderMutation.isPending}
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="pt-4 border-t">
                                  <Button variant="outline" size="sm" className="w-full">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Edit Video
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cache Management */}
          <TabsContent value="cache-management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Video Cache Management
                </CardTitle>
                <CardDescription>
                  Manage local video cache for optimal performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cacheLoading ? (
                  <div className="text-center py-8">Loading cache stats...</div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{cacheStats?.fileCount || 0}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Cached Files</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{cacheStats?.sizeMB || '0.0'} MB</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            of {cacheStats?.maxCacheSizeMB || 500} MB
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{cacheStats?.maxCacheAgeHours || 24}h</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Max Cache Age</div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={() => refreshCacheMutation.mutate()}
                        disabled={refreshCacheMutation.isPending}
                        className="flex-1"
                      >
                        {refreshCacheMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh Critical Videos
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => clearCacheMutation.mutate()}
                        disabled={clearCacheMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Cache
                      </Button>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium mb-2">Cache Information</h4>
                      <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                        <li>• Critical videos (hero carousel) are automatically cached on server startup</li>
                        <li>• Cache refreshes videos from Supabase storage</li>
                        <li>• Local cache provides instant video serving (4-57ms response times)</li>
                        <li>• Cache automatically cleans up expired files after {cacheStats?.maxCacheAgeHours || 24} hours</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder tabs */}
          <TabsContent value="hero-text">
            <Card>
              <CardHeader>
                <CardTitle>Hero Text Management</CardTitle>
                <CardDescription>Coming soon - Text editor with font size controls</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription>Coming soon - Video analytics and performance metrics</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}