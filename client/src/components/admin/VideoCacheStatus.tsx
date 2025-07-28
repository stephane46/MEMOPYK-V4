import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  HardDrive, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Zap,
  Clock
} from 'lucide-react';

interface VideoCacheStatusProps {
  videoFilenames: string[];
  title?: string;
  showForceAllButton?: boolean;
  description?: string;
}

interface CacheStatsResponse {
  fileCount: number;
  sizeMB: string;
  [key: string]: unknown;
}

interface UnifiedCacheStats {
  videos: { fileCount: number; totalSize: number; sizeMB: string };
  images: { fileCount: number; totalSize: number; sizeMB: string };
  total: { fileCount: number; totalSize: number; sizeMB: string; limitMB: string; usagePercent: number };
  management: { maxCacheDays: number; autoCleanup: boolean; nextCleanup: string };
}

interface CacheStatus {
  cached: boolean;
  size?: number;
  lastModified?: string;
}

export const VideoCacheStatus: React.FC<VideoCacheStatusProps> = ({ 
  videoFilenames, 
  title = "Video Cache Status",
  showForceAllButton = false,
  description
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingVideos, setPendingVideos] = React.useState<Set<string>>(new Set());

  // Query cache status for specific videos
  const { data: cacheStatusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/video-cache/status', videoFilenames],
    queryFn: async () => {
      const response = await apiRequest('/api/video-cache/status', 'POST', { filenames: videoFilenames });
      return await response.json();
    },
    enabled: videoFilenames.length > 0,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Query overall cache stats
  const { data: cacheStats, refetch: refetchStats } = useQuery<CacheStatsResponse>({
    queryKey: ['/api/video-cache/stats'],
    refetchInterval: 30000
  });

  // Query unified cache stats with storage management
  const { data: unifiedStats, refetch: refetchUnified } = useQuery<UnifiedCacheStats>({
    queryKey: ['/api/unified-cache/stats'],
    refetchInterval: 30000
  });

  // Force cache single video mutation
  const forceCacheMutation = useMutation({
    mutationFn: async (filename: string) => {
      setPendingVideos(prev => new Set(Array.from(prev).concat([filename])));
      const response = await apiRequest('/api/video-cache/force', 'POST', { filename });
      const data = await response.json();
      return { response: data as {message?: string}, filename };
    },
    onSuccess: (data: {response: {message?: string}, filename: string}) => {
      const { response, filename } = data;
      setPendingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(filename);
        return newSet;
      });
      toast({
        title: "Video Cached",
        description: response.message || `${filename} has been cached successfully`,
      });
      refetchStatus();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
    },
    onError: (error: Error & {response?: {data?: {details?: string}}}, filename: string) => {
      setPendingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(filename);
        return newSet;
      });
      toast({
        title: "Cache Failed",
        description: `Failed to cache ${filename}: ${error.response?.data?.details || error.message}`,
        variant: "destructive",
      });
    }
  });

  // Force cache all videos mutation  
  const forceAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/force-all', 'POST');
      return await response.json() as {cached?: string[]};
    },
    onSuccess: (data: {cached?: string[]}) => {
      toast({
        title: "All Videos Cached",
        description: `Successfully cached ${data.cached?.length || 0} videos`,
      });
      refetchStatus();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
    },
    onError: (error: Error & {response?: {data?: {details?: string}}}) => {
      toast({
        title: "Bulk Cache Failed", 
        description: `Failed to cache all videos: ${error.response?.data?.details || error.message}`,
        variant: "destructive",
      });
    }
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/clear', 'POST');
      return await response.json() as {removed?: {videosRemoved: number; imagesRemoved: number}; message?: string};
    },
    onSuccess: (data) => {
      const result = data.removed || { videosRemoved: 0, imagesRemoved: 0 };
      toast({
        title: "Cache Completely Cleared",
        description: `Removed ${result.videosRemoved} videos and ${result.imagesRemoved} images. Cache is now empty.`,
      });
      refetchStatus();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
    },
    onError: (error: Error & {response?: {data?: {details?: string}}}) => {
      toast({
        title: "Clear Failed",
        description: `Failed to clear cache: ${error.response?.data?.details || error.message}`,
        variant: "destructive",
      });
    }
  });

  const cacheStatus: Record<string, CacheStatus> = (cacheStatusData as {status?: Record<string, CacheStatus>})?.status || {};

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const formatLastModified = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    if (diffHours < 1) return 'Just cached';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const getCacheAgeColor = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 1) return 'text-green-600'; // Fresh (< 1 day)
    if (diffDays < 7) return 'text-blue-600';  // Recent (< 1 week)
    if (diffDays < 30) return 'text-yellow-600'; // Older (< 1 month)
    return 'text-red-600'; // Very old (> 1 month)
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Checking cache status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cachedCount = Object.values(cacheStatus).filter(status => status.cached).length;
  const totalCount = videoFilenames.length;

  return (
    <div className="space-y-4">
      {/* Storage Management Overview */}
      {unifiedStats && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-900">
              <HardDrive className="h-5 w-5" />
              Storage Management Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Cache Usage</div>
                <div className="flex items-center gap-2">
                  <Badge variant={unifiedStats.total.usagePercent > 80 ? "destructive" : unifiedStats.total.usagePercent > 50 ? "default" : "secondary"}>
                    {unifiedStats.total.sizeMB}MB / {unifiedStats.total.limitMB}MB
                  </Badge>
                  <span className="text-sm text-gray-600">({unifiedStats.total.usagePercent}%)</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Management</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    <Clock className="h-3 w-3 mr-1" />
                    Manual Cleanup
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Media Files</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{unifiedStats.videos.fileCount} videos</Badge>
                  <Badge variant="outline">{unifiedStats.images.fileCount} images</Badge>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {unifiedStats.management.nextCleanup === "Manual" ? (
                <span>Manual management: Clear cache when needed for max 6 videos (3 hero + 3 gallery)</span>
              ) : (
                <span>Next cleanup: {new Date(unifiedStats.management.nextCleanup).toLocaleDateString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section-Specific Cache Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {title}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={cachedCount === totalCount ? "default" : "secondary"}>
                {cachedCount}/{totalCount} Cached
              </Badge>
              {showForceAllButton && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => forceAllMutation.mutate()}
                  disabled={forceAllMutation.isPending}
                >
                  {forceAllMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Force Cache All
                </Button>
              )}
            </div>
          </CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </CardHeader>
      <CardContent>
        {/* Section-specific cache stats only */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span>This Section: {cachedCount}/{totalCount} cached ({totalCount > 0 ? Math.round((cachedCount/totalCount)*100) : 0}%)</span>
            <span className="text-muted-foreground">
              Performance: ~50ms cached vs ~1500ms uncached
            </span>
          </div>
        </div>

        {/* Individual video status */}
        <div className="space-y-3">
          {videoFilenames.map((filename) => {
            const status = cacheStatus[filename];
            const isCached = status?.cached || false;
            
            return (
              <div key={filename} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {isCached ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {isCached ? (
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✅ Cached (~50ms)</span>
                          {status.size && <span>• {formatFileSize(status.size)}</span>}
                          {status.lastModified && (
                            <span className={`flex items-center gap-1 ${getCacheAgeColor(status.lastModified)}`}>
                              • <Clock className="h-3 w-3" /> {formatLastModified(status.lastModified)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-orange-600">⏳ Not Cached (~1500ms)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {!isCached && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => forceCacheMutation.mutate(filename)}
                    disabled={pendingVideos.has(filename)}
                  >
                    {pendingVideos.has(filename) ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Cache Now
                  </Button>
                )}
                
                {isCached && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => forceCacheMutation.mutate(filename)}
                    disabled={pendingVideos.has(filename)}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    {pendingVideos.has(filename) ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Refresh Cache
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {totalCount === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No videos to display cache status for</p>
          </div>
        )}

        {/* Clear Cache Button */}
        {totalCount > 0 && (
          <div className="mt-6 pt-4 border-t">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => clearCacheMutation.mutate()}
              disabled={clearCacheMutation.isPending}
              className="w-full"
            >
              {clearCacheMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <HardDrive className="h-4 w-4 mr-2" />
              )}
              Clear All Cache
            </Button>
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  );
};

export default VideoCacheStatus;