import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Play, RefreshCw, BarChart3, Video, HardDrive, Users, MessageSquare, FileText, LogOut, TestTube, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeroVideo {
  id: number;
  title_en: string;
  title_fr: string;
  url_en: string;
  url_fr: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CacheStats {
  fileCount: number;
  totalSize: number;
  sizeMB: number;
  maxCacheSizeMB: number;
  maxCacheAgeHours: number;
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('hero-management');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add logout functionality
  const handleLogout = () => {
    localStorage.removeItem('memopyk_admin_authenticated');
    window.dispatchEvent(new CustomEvent('authStateChange'));
    window.location.reload();
  };

  const sidebarItems = [
    { id: 'hero-management', label: 'Gestion Hero', icon: Video },
    { id: 'gallery', label: 'Galerie', icon: Play },
    { id: 'faq', label: 'FAQ', icon: MessageSquare },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'legal-docs', label: 'Documents Légaux', icon: FileText },
    { id: 'analytics', label: 'Analytiques', icon: BarChart3 },
    { id: 'video-cache', label: 'Cache Vidéo', icon: HardDrive },
    { id: 'tests', label: 'Tests', icon: TestTube },
    { id: 'deployment', label: 'Déploiement', icon: Rocket },
  ];

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex-shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">MEMOPYK</h1>
              <p className="text-xs text-gray-400">Panel d'administration</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-orange-500 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">

          {/* Hero Management */}
          {activeSection === 'hero-management' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion Hero</h2>
                <p className="text-gray-600 dark:text-gray-400">Gérer les vidéos du carrousel héros avec support bilingue</p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
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
                                    <Play className="h-12 w-12 text-gray-400" />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant={video.is_active ? "default" : "secondary"}>
                                      {video.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                    <Badge variant="outline">
                                      Order: {video.order_index}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Video Metadata */}
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm font-medium">English Title</Label>
                                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{video.title_en}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">French Title</Label>
                                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{video.title_fr}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Video URLs</Label>
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                                      <div>EN: {video.url_en}</div>
                                      <div>FR: {video.url_fr}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={video.is_active}
                                      onCheckedChange={(checked) => 
                                        toggleMutation.mutate({ videoId: video.id, isActive: checked })
                                      }
                                      disabled={toggleMutation.isPending}
                                    />
                                    <Label className="text-sm font-medium">
                                      {video.is_active ? 'Active' : 'Inactive'}
                                    </Label>
                                  </div>

                                  <div className="flex flex-col space-y-2">
                                    <Label className="text-sm font-medium">Reorder Video</Label>
                                    <div className="flex space-x-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const newOrder = Math.max(1, video.order_index - 1);
                                          reorderMutation.mutate({ videoId: video.id, newOrder });
                                        }}
                                        disabled={video.order_index === 1 || reorderMutation.isPending}
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const maxOrder = Math.max(...heroVideos.map(v => v.order_index));
                                          const newOrder = Math.min(maxOrder, video.order_index + 1);
                                          reorderMutation.mutate({ videoId: video.id, newOrder });
                                        }}
                                        disabled={video.order_index === Math.max(...heroVideos.map(v => v.order_index)) || reorderMutation.isPending}
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                      const videoUrl = `/api/video-proxy?filename=${encodeURIComponent(video.url_en)}&bucket=memopyk-hero`;
                                      window.open(videoUrl, '_blank');
                                    }}
                                  >
                                    <Play className="h-4 w-4 mr-2" />
                                    Preview Video
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Video Cache Management */}
          {activeSection === 'video-cache' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cache Vidéo</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion du cache vidéo local pour une performance optimale</p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Video Cache Status
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">{cacheStats?.fileCount || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Cached Files</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">{cacheStats?.sizeMB?.toFixed(1) || 0}MB</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Size</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">0/12</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Videos Cached</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">
                              {cacheStats?.sizeMB && cacheStats?.maxCacheSizeMB 
                                ? Math.round((cacheStats.sizeMB / cacheStats.maxCacheSizeMB) * 100)
                                : 0}%
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Coverage</div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex space-x-4">
                        <Button
                          onClick={() => refreshCacheMutation.mutate()}
                          disabled={refreshCacheMutation.isPending}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Cache All Videos
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => clearCacheMutation.mutate()}
                          disabled={clearCacheMutation.isPending}
                        >
                          Clear Cache
                        </Button>
                      </div>

                      {cacheStats && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <div>• Cache limit: {cacheStats.maxCacheSizeMB}MB</div>
                          <div>• Cache automatically cleans up expired files after {cacheStats.maxCacheAgeHours} hours</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Other sections - placeholder */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytiques</h2>
                <p className="text-gray-600 dark:text-gray-400">Métriques de performance et analyses vidéo</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Tableau de Bord Analytique
                  </CardTitle>
                  <CardDescription>Prochainement - Métriques vidéo et de performance</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Gallery */}
          {activeSection === 'gallery' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Galerie</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion des éléments de galerie portfolio</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Gestion de Galerie</CardTitle>
                  <CardDescription>Prochainement - Interface de gestion de galerie</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* FAQ */}
          {activeSection === 'faq' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FAQ</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion des questions fréquemment posées</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Gestion FAQ</CardTitle>
                  <CardDescription>Prochainement - Éditeur de texte enrichi intégré</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Contacts */}
          {activeSection === 'contacts' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion des contacts et suivi des prospects</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des Contacts</CardTitle>
                  <CardDescription>Prochainement - Liste de contacts avec suivi de statut</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Legal Documents */}
          {activeSection === 'legal-docs' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documents Légaux</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion des documents juridiques</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des Documents Légaux</CardTitle>
                  <CardDescription>Prochainement - Édition de texte enrichi pour le contenu juridique</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Tests */}
          {activeSection === 'tests' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tests</h2>
                <p className="text-gray-600 dark:text-gray-400">Tests système et validation</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Tests Système</CardTitle>
                  <CardDescription>Prochainement - Interface de test et validation</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Deployment */}
          {activeSection === 'deployment' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Déploiement</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion du déploiement et de la production</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Gestion du Déploiement</CardTitle>
                  <CardDescription>Prochainement - Interface de déploiement en un clic</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}