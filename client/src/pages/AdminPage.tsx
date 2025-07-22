import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Play, RefreshCw, BarChart3, Video, HardDrive, Users, MessageSquare, FileText, LogOut, TestTube, Rocket, X, Type, Save, Palette, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Upload, FileVideo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GalleryManagement from '@/components/admin/GalleryManagement';

interface HeroVideo {
  id: number;
  title_en: string;
  title_fr: string;
  url_en: string;
  url_fr: string;
  useSameVideo: boolean;
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
  const [heroTab, setHeroTab] = useState('videos');
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);
  const [editingVideo, setEditingVideo] = useState<any | null>(null);
  const [editVideoData, setEditVideoData] = useState({
    url_en: '',
    url_fr: '',
    useSameVideo: true
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
  
  // File upload handler
  const handleFileUpload = async (file: File, isEnglish: boolean = true) => {
    if (!file.type.includes('video')) {
      toast({ title: "Error", description: "Please select a video file", variant: "destructive" });
      return;
    }
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('video', file);
    
    try {
      const response = await fetch('/api/hero-videos/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        const filename = result.filename;
        
        if (editVideoData.useSameVideo) {
          // Same video for both languages
          setEditVideoData(prev => ({ ...prev, url_en: filename, url_fr: filename }));
        } else {
          // Different videos for each language
          if (isEnglish) {
            setEditVideoData(prev => ({ ...prev, url_en: filename }));
          } else {
            setEditVideoData(prev => ({ ...prev, url_fr: filename }));
          }
        }
        
        toast({ title: "Success!", description: `Video uploaded: ${filename}` });
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.error || "Failed to upload video", variant: "destructive" });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingFile(false);
    }
  };
  
  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };
  const [previewFontSize, setPreviewFontSize] = useState(48);
  const [textPreview, setTextPreview] = useState('');
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '' });
  const [showNewTextForm, setShowNewTextForm] = useState(false);
  const [newTextData, setNewTextData] = useState({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '', font_size: 48 });
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

  // Fetch hero text overlays
  const { data: heroTexts = [], isLoading: textsLoading } = useQuery({
    queryKey: ['/api/hero-text'],
  });

  // Fetch cache statistics
  const { data: cacheStats, isLoading: cacheLoading } = useQuery<CacheStats>({
    queryKey: ['/api/video-cache/stats'],
  });

  // Video reordering mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ videoId, newOrder }: { videoId: number; newOrder: number }) => {
      console.log('=== MUTATION STARTED ===');
      console.log('Sending PATCH to:', `/api/hero-videos/${videoId}/order`);
      console.log('Payload:', { newOrder });
      
      const response = await apiRequest('PATCH', `/api/hero-videos/${videoId}/order`, { newOrder });
      const result = await response.json();
      console.log('=== MUTATION RESPONSE ===', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('=== MUTATION SUCCESS ===', data);
      queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
      toast({ title: "Success", description: "Video order updated successfully" });
    },
    onError: (error) => {
      console.log('=== MUTATION ERROR ===', error);
      toast({ title: "Error", description: "Failed to update video order", variant: "destructive" });
    }
  });

  // Video toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ videoId, isActive }: { videoId: number; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/hero-videos/${videoId}/toggle`, { is_active: isActive });
      return await response.json();
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
      const response = await apiRequest('POST', '/api/video-cache/refresh');
      return await response.json();
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
      const response = await apiRequest('DELETE', '/api/video-cache/clear');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      toast({ title: "Cache Cleared", description: "Video cache cleared successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear video cache", variant: "destructive" });
    }
  });

  // Hero text update mutation
  const updateTextMutation = useMutation({
    mutationFn: async ({ textId, data }: { textId: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/hero-text/${textId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      toast({ title: "Succès", description: "Texte hero mis à jour avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la mise à jour du texte", variant: "destructive" });
    }
  });

  // Apply text to site mutation
  const applyTextMutation = useMutation({
    mutationFn: async ({ textId, fontSize }: { textId: number; fontSize: number }) => {
      const response = await apiRequest('PATCH', `/api/hero-text/${textId}/apply`, { 
        font_size: fontSize,
        is_active: true 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      toast({ title: "Succès", description: "Texte appliqué au site avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de l'application du texte", variant: "destructive" });
    }
  });

  // Create new text mutation
  const createTextMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/hero-text', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      setShowNewTextForm(false);
      setNewTextData({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '', font_size: 48 });
      toast({ title: "Succès", description: "Nouveau texte créé avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la création du texte", variant: "destructive" });
    }
  });

  // Delete text mutation
  const deleteTextMutation = useMutation({
    mutationFn: async (textId: number) => {
      const response = await apiRequest('DELETE', `/api/hero-text/${textId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      setSelectedTextId(null);
      setEditingTextId(null);
      toast({ title: "Succès", description: "Texte supprimé avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la suppression du texte", variant: "destructive" });
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
              
              {/* Hero Tabs */}
              <div className="mb-6">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setHeroTab('videos')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      heroTab === 'videos'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Video className="inline-block h-4 w-4 mr-2" />
                    Gestion Vidéos
                  </button>
                  <button
                    onClick={() => setHeroTab('text')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      heroTab === 'text'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Type className="inline-block h-4 w-4 mr-2" />
                    Textes & Superpositions
                  </button>
                </nav>
              </div>

              {/* Videos Tab */}
              {heroTab === 'videos' && (
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
                    <div className="space-y-6">
                      {/* Add New Video Button */}
                      <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
                        <CardContent className="p-6">
                          <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800">
                              <Video className="h-6 w-6 text-gray-400" />
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Add New Hero Video</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload a new video to the hero carousel</p>
                            <div className="mt-6">
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                id="video-upload"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    toast({ title: "Upload Started", description: `Uploading ${file.name}...` });
                                    
                                    try {
                                      // Create FormData for file upload
                                      const formData = new FormData();
                                      formData.append('video', file);
                                      formData.append('title_en', `New Video - ${file.name}`);
                                      formData.append('title_fr', `Nouvelle Vidéo - ${file.name}`);
                                      
                                      // Upload to backend API
                                      const response = await fetch('/api/upload-video', {
                                        method: 'POST',
                                        body: formData
                                      });
                                      
                                      if (response.ok) {
                                        const result = await response.json();
                                        toast({ title: "Success", description: "Video uploaded successfully!" });
                                        
                                        // Refresh the video list
                                        queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
                                      } else {
                                        const error = await response.text();
                                        toast({ title: "Upload Failed", description: error, variant: "destructive" });
                                      }
                                    } catch (error) {
                                      console.error('Upload error:', error);
                                      toast({ title: "Upload Failed", description: "An error occurred during upload", variant: "destructive" });
                                    }
                                    
                                    // Reset the input
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <label
                                htmlFor="video-upload"
                                className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-semibold rounded-lg text-white cursor-pointer transition-all hover:scale-105 hover:opacity-90"
                                style={{ backgroundColor: '#D67C4A' }}
                              >
                                Upload Video
                              </label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Existing Videos */}
                      {heroVideos
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((video) => (
                          <Card key={video.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Video Preview */}
                                <div className="space-y-4">
                                  <div 
                                    className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-gray-700"
                                    onClick={() => {
                                      const videoUrl = `/api/video-proxy?filename=${encodeURIComponent(video.url_en)}`;
                                      setPreviewVideo({ url: videoUrl, title: video.title_en });
                                    }}
                                  >
                                    <video
                                      src={`/api/video-proxy?filename=${encodeURIComponent(video.url_en)}`}
                                      className="w-full h-full object-cover"
                                      muted
                                      preload="metadata"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                      <div 
                                        className="rounded-full p-4 group-hover:scale-110 transition-transform shadow-xl"
                                        style={{ backgroundColor: '#D67C4A' }}
                                      >
                                        <Play className="h-10 w-10 text-white fill-white" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    {/* Clear Position Indicator */}
                                    <div className="flex items-center justify-center">
                                      <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-lg">
                                        Plays {!video.order_index ? '1st' : video.order_index === 1 ? '1st' : video.order_index === 2 ? '2nd' : video.order_index === 3 ? '3rd' : `${video.order_index}th`}
                                      </div>
                                    </div>
                                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                      Order videos appear on your website
                                    </p>
                                    
                                    {/* Clear Status Indicator with Toggle */}
                                    <div className="flex items-center justify-center">
                                      <div className={`px-6 py-3 rounded-lg font-bold text-lg border-2 ${
                                        video.is_active 
                                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-500' 
                                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-500'
                                      }`}>
                                        {video.is_active ? '🟢 VISIBLE ON WEBSITE' : '🔴 HIDDEN FROM WEBSITE'}
                                      </div>
                                    </div>
                                    
                                    {/* Toggle Switch */}
                                    <div className="flex items-center justify-center space-x-3">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hidden</span>
                                      <Switch
                                        checked={video.is_active}
                                        onCheckedChange={(checked) => 
                                          toggleMutation.mutate({ videoId: video.id, isActive: checked })
                                        }
                                        disabled={toggleMutation.isPending}
                                        className="scale-150"
                                      />
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Visible</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Video Files */}
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm font-semibold" style={{ color: '#011526' }}>Video File</Label>
                                    <div 
                                      className="mt-1 text-xs font-mono p-3 rounded-md"
                                      style={{ backgroundColor: '#F2EBDC', color: '#2A4759' }}
                                    >
                                      {video.useSameVideo || video.url_en === video.url_fr ? (
                                        <div className="font-medium text-sm">
                                          {video.url_en}
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="font-medium">EN: {video.url_en}</div>
                                          <div className="font-medium">FR: {video.url_fr}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-6">
                                  {/* Video Order Controls */}

                                  {/* Position Controls */}
                                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border-2">
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-3">Change Display Order</h4>
                                    <div className="flex space-x-2 justify-center">
                                      <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const newOrder = video.order_index - 1;
                                          if (newOrder >= 1) {
                                            reorderMutation.mutate({ videoId: video.id, newOrder });
                                          }
                                        }}
                                        disabled={video.order_index <= 1 || reorderMutation.isPending}
                                        className="px-6 py-3"
                                      >
                                        <ArrowUp className="h-5 w-5 mr-2" />
                                        Move Earlier
                                      </Button>
                                      <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const maxOrder = Math.max(...heroVideos.map(v => v.order_index));
                                          const newOrder = video.order_index + 1;
                                          if (newOrder <= maxOrder) {
                                            reorderMutation.mutate({ videoId: video.id, newOrder });
                                          }
                                        }}
                                        disabled={video.order_index >= Math.max(...heroVideos.map(v => v.order_index)) || reorderMutation.isPending}
                                        className="px-6 py-3"
                                      >
                                        <ArrowDown className="h-5 w-5 mr-2" />
                                        Move Later
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingVideo(video);
                                        setEditVideoData({
                                          url_en: video.url_en,
                                          url_fr: video.url_fr,
                                          useSameVideo: video.useSameVideo ?? true
                                        });
                                      }}
                                    >
                                      Edit Video
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        try {
                                          // Force cache this specific video file
                                          const response = await fetch(`/api/video-cache/cache-video`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ filename: video.url_en })
                                          });
                                          
                                          if (response.ok) {
                                            queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
                                            toast({ title: "Cached", description: "Video cached successfully!" });
                                          } else {
                                            toast({ title: "Error", description: "Failed to cache video", variant: "destructive" });
                                          }
                                        } catch (error) {
                                          toast({ title: "Error", description: "Network error", variant: "destructive" });
                                        }
                                      }}
                                    >
                                      Cache Video
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete "${video.title_en}"? This will permanently remove the video from Supabase storage, database, and cache.`)) {
                                          fetch(`/api/hero-videos/${video.id}`, { method: 'DELETE' })
                                            .then(async (response) => {
                                              if (response.ok) {
                                                const result = await response.json();
                                                toast({ title: "Deleted", description: result.message });
                                                queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
                                                queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
                                              } else {
                                                const error = await response.text();
                                                toast({ title: "Delete Failed", description: error, variant: "destructive" });
                                              }
                                            })
                                            .catch((error) => {
                                              toast({ title: "Delete Failed", description: "Network error", variant: "destructive" });
                                            });
                                        }
                                      }}
                                    >
                                      Delete
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
              )}

              {/* Text Overlay Tab */}
              {heroTab === 'text' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Type className="h-5 w-5" />
                        Gestion des Textes Hero
                      </CardTitle>
                      <CardDescription>
                        Créer et gérer les superpositions de texte avec contrôles de police
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {textsLoading ? (
                        <div className="text-center py-8">Chargement des textes...</div>
                      ) : (
                        <div className="space-y-6">
                          {/* Text Library */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">Bibliothèque de Textes</h3>
                              <Button
                                onClick={() => setShowNewTextForm(true)}
                                className="bg-orange-500 hover:bg-orange-600"
                              >
                                + Nouveau Texte
                              </Button>
                            </div>

                            {/* New Text Form */}
                            {showNewTextForm && (
                              <Card className="mb-4 border-orange-200">
                                <CardHeader>
                                  <CardTitle>Créer un Nouveau Texte</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label>Titre (Français)</Label>
                                      <Input
                                        value={newTextData.title_fr}
                                        onChange={(e) => setNewTextData({ ...newTextData, title_fr: e.target.value })}
                                        placeholder="Ex: Transformez vos souvenirs..."
                                      />
                                    </div>
                                    <div>
                                      <Label>Titre (Anglais)</Label>
                                      <Input
                                        value={newTextData.title_en}
                                        onChange={(e) => setNewTextData({ ...newTextData, title_en: e.target.value })}
                                        placeholder="Ex: Transform your memories..."
                                      />
                                    </div>
                                    <div>
                                      <Label>Sous-titre (Français)</Label>
                                      <Input
                                        value={newTextData.subtitle_fr}
                                        onChange={(e) => setNewTextData({ ...newTextData, subtitle_fr: e.target.value })}
                                        placeholder="Ex: Créez des vidéos professionnelles..."
                                      />
                                    </div>
                                    <div>
                                      <Label>Sous-titre (Anglais)</Label>
                                      <Input
                                        value={newTextData.subtitle_en}
                                        onChange={(e) => setNewTextData({ ...newTextData, subtitle_en: e.target.value })}
                                        placeholder="Ex: Create professional videos..."
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Taille de Police par Défaut: {newTextData.font_size}px</Label>
                                    <input
                                      type="range"
                                      min="20"
                                      max="120"
                                      value={newTextData.font_size}
                                      onChange={(e) => setNewTextData({ ...newTextData, font_size: Number(e.target.value) })}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <Button
                                      onClick={() => createTextMutation.mutate(newTextData)}
                                      disabled={createTextMutation.isPending || !newTextData.title_fr || !newTextData.title_en}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Créer le Texte
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowNewTextForm(false);
                                        setNewTextData({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '', font_size: 48 });
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            <div className="grid gap-4">
                              {heroTexts.map((text: any) => (
                                <Card key={text.id} className={`transition-all ${
                                  selectedTextId === text.id ? 'ring-2 ring-orange-500' : ''
                                } ${text.is_active ? 'border-green-500 bg-green-50' : ''}`}>
                                  <CardContent className="p-4">
                                    {editingTextId === text.id ? (
                                      // Edit Mode
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <Label className="text-xs">Titre (Français)</Label>
                                            <Input
                                              value={editFormData.title_fr}
                                              onChange={(e) => setEditFormData({ ...editFormData, title_fr: e.target.value })}
                                              className="text-sm"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Titre (Anglais)</Label>
                                            <Input
                                              value={editFormData.title_en}
                                              onChange={(e) => setEditFormData({ ...editFormData, title_en: e.target.value })}
                                              className="text-sm"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Sous-titre (Français)</Label>
                                            <Input
                                              value={editFormData.subtitle_fr}
                                              onChange={(e) => setEditFormData({ ...editFormData, subtitle_fr: e.target.value })}
                                              className="text-sm"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Sous-titre (Anglais)</Label>
                                            <Input
                                              value={editFormData.subtitle_en}
                                              onChange={(e) => setEditFormData({ ...editFormData, subtitle_en: e.target.value })}
                                              className="text-sm"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              updateTextMutation.mutate({
                                                textId: text.id,
                                                data: editFormData
                                              });
                                              setEditingTextId(null);
                                            }}
                                            disabled={updateTextMutation.isPending}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            <Save className="h-3 w-3 mr-1" />
                                            Sauvegarder
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingTextId(null)}
                                          >
                                            Annuler
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      // View Mode
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                          <div 
                                            className="space-y-2 flex-1 cursor-pointer" 
                                            onClick={() => setSelectedTextId(text.id)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <h4 className="font-medium">{text.title_fr}</h4>
                                              {text.is_active && (
                                                <Badge className="bg-green-500">Actif sur le site</Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-600">{text.subtitle_fr}</p>
                                            <div className="text-xs text-gray-500">
                                              Taille: {text.font_size}px | Créé: {new Date(text.created_at).toLocaleDateString()}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedTextId(text.id);
                                              setPreviewFontSize(text.font_size);
                                              setTextPreview(`${text.title_fr}\n${text.subtitle_fr}`);
                                            }}
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Prévisualiser
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingTextId(text.id);
                                              setEditFormData({
                                                title_fr: text.title_fr,
                                                title_en: text.title_en,
                                                subtitle_fr: text.subtitle_fr,
                                                subtitle_en: text.subtitle_en
                                              });
                                            }}
                                          >
                                            <Type className="h-3 w-3 mr-1" />
                                            Modifier
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="bg-orange-500 hover:bg-orange-600"
                                            onClick={() => {
                                              applyTextMutation.mutate({ 
                                                textId: text.id, 
                                                fontSize: text.font_size 
                                              });
                                            }}
                                            disabled={applyTextMutation.isPending}
                                          >
                                            Appliquer au Site
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => {
                                              if (confirm(`Êtes-vous sûr de vouloir supprimer "${text.title_fr}" ?`)) {
                                                deleteTextMutation.mutate(text.id);
                                              }
                                            }}
                                            disabled={deleteTextMutation.isPending}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>

                          {/* Font Size Control & Preview */}
                          {selectedTextId && (
                            <Card className="border-orange-200">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Palette className="h-5 w-5" />
                                  Prévisualisation & Contrôles
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-6">
                                {/* Font Size Slider */}
                                <div className="space-y-4">
                                  <Label>Taille de Police: {previewFontSize}px</Label>
                                  <input
                                    type="range"
                                    min="20"
                                    max="120"
                                    value={previewFontSize}
                                    onChange={(e) => setPreviewFontSize(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                      background: `linear-gradient(to right, #D67C4A 0%, #D67C4A ${((previewFontSize - 20) / 100) * 100}%, #e5e7eb ${((previewFontSize - 20) / 100) * 100}%, #e5e7eb 100%)`
                                    }}
                                  />
                                  <div className="flex justify-between text-xs text-gray-500">
                                    <span>20px</span>
                                    <span>70px</span>
                                    <span>120px</span>
                                  </div>
                                </div>

                                {/* Live Preview */}
                                <div 
                                  className="bg-black rounded-lg p-8 min-h-[200px] flex items-center justify-center relative overflow-hidden"
                                  style={{
                                    backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                  }}
                                >
                                  <div className="text-center text-white">
                                    {selectedTextId && (() => {
                                      const selectedText = heroTexts.find((t: any) => t.id === selectedTextId);
                                      return selectedText ? (
                                        <div>
                                          <h1 
                                            className="font-bold mb-4"
                                            style={{ 
                                              fontSize: `${previewFontSize}px`,
                                              lineHeight: '1.2',
                                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                                            }}
                                          >
                                            {selectedText.title_fr}
                                          </h1>
                                          <p 
                                            className="opacity-90"
                                            style={{ 
                                              fontSize: `${previewFontSize * 0.6}px`,
                                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                                            }}
                                          >
                                            {selectedText.subtitle_fr}
                                          </p>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-3">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      if (selectedTextId) {
                                        const selectedText = heroTexts.find((t: any) => t.id === selectedTextId);
                                        if (selectedText) {
                                          updateTextMutation.mutate({
                                            textId: selectedTextId,
                                            data: { font_size: previewFontSize }
                                          });
                                        }
                                      }
                                    }}
                                    disabled={updateTextMutation.isPending}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Sauvegarder Taille
                                  </Button>
                                  <Button
                                    className="bg-orange-500 hover:bg-orange-600"
                                    onClick={() => {
                                      if (selectedTextId) {
                                        applyTextMutation.mutate({ 
                                          textId: selectedTextId, 
                                          fontSize: previewFontSize 
                                        });
                                      }
                                    }}
                                    disabled={applyTextMutation.isPending}
                                  >
                                    <Palette className="h-4 w-4 mr-2" />
                                    Appliquer avec cette Taille
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
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
                <CardContent className="p-6">
                  <GalleryManagement />
                </CardContent>
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

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Video Preview: {previewVideo?.title}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPreviewVideo(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="aspect-video">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="w-full h-full rounded-lg"
                onError={(e) => {
                  console.error('Video playback error:', e);
                  toast({ 
                    title: "Video Error", 
                    description: "Unable to load video preview", 
                    variant: "destructive" 
                  });
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Video Modal */}
      {editingVideo && (
        <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
          <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 -m-6 mb-6 p-6 rounded-t-lg">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Edit Hero Video
              </DialogTitle>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                Manage video file settings
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Same Video Switch - More prominent and clickable */}
              <div 
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  editVideoData.useSameVideo 
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600' 
                    : 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600'
                }`}
                onClick={() => {
                  const newValue = !editVideoData.useSameVideo;
                  if (newValue && editVideoData.url_en) {
                    setEditVideoData(prev => ({ 
                      ...prev, 
                      useSameVideo: newValue,
                      url_fr: prev.url_en
                    }));
                  } else {
                    setEditVideoData(prev => ({ 
                      ...prev, 
                      useSameVideo: newValue
                    }));
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={editVideoData.useSameVideo}
                      onCheckedChange={(checked) => {
                        if (checked && editVideoData.url_en) {
                          setEditVideoData(prev => ({ 
                            ...prev, 
                            useSameVideo: checked,
                            url_fr: prev.url_en
                          }));
                        } else {
                          setEditVideoData(prev => ({ 
                            ...prev, 
                            useSameVideo: checked
                          }));
                        }
                      }}
                    />
                    <Label className={`font-semibold text-lg cursor-pointer ${
                      editVideoData.useSameVideo 
                        ? 'text-green-900 dark:text-green-100' 
                        : 'text-orange-900 dark:text-orange-100'
                    }`}>
                      {editVideoData.useSameVideo 
                        ? "Same Video for Both Languages" 
                        : "Different Video for Each Language"
                      }
                    </Label>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    editVideoData.useSameVideo 
                      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' 
                      : 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                  }`}>
                    {editVideoData.useSameVideo ? "ON" : "OFF"}
                  </div>
                </div>
                <p className={`text-sm mt-2 ${
                  editVideoData.useSameVideo 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {editVideoData.useSameVideo 
                    ? "✓ One video file will be used for both French and English versions" 
                    : "⚠ You can specify different video files for French and English"
                  }
                </p>
              </div>



              {/* Video URLs */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
                  Video Files
                </h4>
                {editVideoData.useSameVideo ? (
                  <div className="space-y-4">
                    <Label className="text-gray-700 dark:text-gray-300 font-medium">
                      Video File (applies to both languages)
                    </Label>
                    
                    {/* File Upload Area */}
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive 
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <FileVideo className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          Drop your video here
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          or click to browse files
                        </p>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                          className="hidden"
                          id="video-upload-same"
                        />
                        <label
                          htmlFor="video-upload-same"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingFile ? 'Uploading...' : 'Browse Files'}
                        </label>
                      </div>
                    </div>
                    
                    {/* Current filename display */}
                    {editVideoData.url_en && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Current file:</Label>
                        <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                          {editVideoData.url_en}
                        </p>
                      </div>
                    )}
                    
                    {/* Manual filename input */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">
                        Or enter filename manually:
                      </Label>
                      <Input
                        value={editVideoData.url_en}
                        onChange={(e) => {
                          const url = e.target.value;
                          setEditVideoData({ ...editVideoData, url_en: url, url_fr: url });
                        }}
                        placeholder="VideoHero1.mp4"
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {/* English Video Upload */}
                    <div className="space-y-3">
                      <Label className="text-gray-700 dark:text-gray-300 font-medium">English Video</Label>
                      <div 
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={(e) => {
                          handleDrop(e);
                          // Override to set English specifically
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0) {
                            handleFileUpload(files[0], true);
                          }
                        }}
                      >
                        <FileVideo className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                          className="hidden"
                          id="video-upload-en"
                        />
                        <label
                          htmlFor="video-upload-en"
                          className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                        >
                          Upload EN Video
                        </label>
                      </div>
                      {editVideoData.url_en && (
                        <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          {editVideoData.url_en}
                        </p>
                      )}
                      <Input
                        value={editVideoData.url_en}
                        onChange={(e) => setEditVideoData({ ...editVideoData, url_en: e.target.value })}
                        placeholder="VideoHeroEN.mp4"
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                      />
                    </div>
                    
                    {/* French Video Upload */}
                    <div className="space-y-3">
                      <Label className="text-gray-700 dark:text-gray-300 font-medium">French Video</Label>
                      <div 
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0) {
                            handleFileUpload(files[0], false);
                          }
                        }}
                      >
                        <FileVideo className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], false)}
                          className="hidden"
                          id="video-upload-fr"
                        />
                        <label
                          htmlFor="video-upload-fr"
                          className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                        >
                          Upload FR Video
                        </label>
                      </div>
                      {editVideoData.url_fr && (
                        <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          {editVideoData.url_fr}
                        </p>
                      )}
                      <Input
                        value={editVideoData.url_fr}
                        onChange={(e) => setEditVideoData({ ...editVideoData, url_fr: e.target.value })}
                        placeholder="VideoHeroFR.mp4"
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/hero-videos/${editingVideo.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          url_en: editVideoData.url_en,
                          url_fr: editVideoData.url_fr,
                          use_same_video: editVideoData.useSameVideo
                        })
                      });
                      
                      if (response.ok) {
                        queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
                        toast({ title: "Success!", description: "Video updated successfully" });
                        setEditingVideo(null);
                      } else {
                        toast({ title: "Error", description: "Failed to update video", variant: "destructive" });
                      }
                    } catch (error) {
                      toast({ title: "Error", description: "Network error", variant: "destructive" });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingVideo(null)}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold px-6 py-2 flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}