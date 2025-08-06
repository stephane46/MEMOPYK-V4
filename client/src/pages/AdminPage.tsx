import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Play, RefreshCw, BarChart3, Video, HardDrive, Users, MessageSquare, FileText, LogOut, TestTube, Rocket, X, Type, Save, Palette, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Upload, FileVideo, Database, Check, Zap, Search, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GalleryManagementNew from '@/components/admin/GalleryManagementNew';
import FormatBadgeManager from '@/components/admin/FormatBadgeManager';

import FAQManagementWorking from '@/components/admin/FAQManagementWorking';
import { LegalDocumentManagement } from '@/components/admin/LegalDocumentManagement';
import { CtaManagement } from '@/components/admin/CtaManagement';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import VideoCacheStatus from '@/components/admin/VideoCacheStatus';
import SeoManagement from '@/components/admin/SeoManagement';
import SystemTestDashboard from '@/components/admin/SystemTestDashboard';
import DeploymentManagement from '@/components/admin/DeploymentManagement';
import CryptoJS from 'crypto-js';


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
  const [activeSection, setActiveSection] = useState('deployment');
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

  // Auto-scroll to top when admin page loads or refreshes
  React.useEffect(() => {
    // Immediate scroll without animation for instant positioning
    window.scrollTo(0, 0);
    // Add a small delay to ensure DOM is fully rendered, then smooth scroll
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle page refresh (F5) and browser back/forward
  React.useEffect(() => {
    const handlePageLoad = () => {
      // Force scroll to top on page load/refresh
      window.scrollTo(0, 0);
    };

    // Handle browser back/forward navigation
    const handlePopState = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Add event listeners
    window.addEventListener('load', handlePageLoad);
    window.addEventListener('popstate', handlePopState);
    
    // Cleanup
    return () => {
      window.removeEventListener('load', handlePageLoad);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  
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
  const [previewFontSizeDesktop, setPreviewFontSizeDesktop] = useState(60);
  const [previewFontSizeTablet, setPreviewFontSizeTablet] = useState(45);
  const [previewFontSizeMobile, setPreviewFontSizeMobile] = useState(32);
  const [currentPreviewDevice, setCurrentPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [textPreview, setTextPreview] = useState('');
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '' });
  const [showNewTextForm, setShowNewTextForm] = useState(false);
  const [newTextData, setNewTextData] = useState({ 
    title_fr: '', 
    subtitle_fr: '', 
    title_en: '', 
    subtitle_en: '', 
    font_size_desktop: 60,
    font_size_tablet: 45,
    font_size_mobile: 32
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add logout functionality
  const handleLogout = () => {
    localStorage.removeItem('memopyk_admin_authenticated');
    window.dispatchEvent(new CustomEvent('authStateChange'));
    window.location.reload();
  };

  const sidebarItems = [
    { id: 'hero-management', label: 'Vidéos Hero', icon: Video },
    { id: 'gallery', label: 'Galerie Vidéos', icon: Play },
    { id: 'cache', label: 'Cache', icon: HardDrive },
    { id: 'faq', label: 'FAQ', icon: MessageSquare },
    { id: 'cta', label: 'Boutons CTA', icon: Zap },
    { id: 'legal-docs', label: 'Documents Légaux', icon: FileText },
    { id: 'seo-management', label: 'Gestion SEO', icon: Search },
    { id: 'analytics', label: 'Analytiques', icon: BarChart3 },
    { id: 'tests', label: 'Tests', icon: TestTube },
    { id: 'deployment', label: 'Déploiement', icon: Rocket },
  ];

  // Fetch hero videos
  const { data: heroVideos = [], isLoading: videosLoading } = useQuery<HeroVideo[]>({
    queryKey: ['/api/hero-videos'],
  });

  // Fetch hero text overlays
  const { data: heroTexts = [], isLoading: textsLoading } = useQuery<any[]>({
    queryKey: ['/api/hero-text'],
  });

  // Sync responsive font sizes when a text is selected
  useEffect(() => {
    if (selectedTextId && heroTexts.length > 0) {
      const selectedText = heroTexts.find((t: any) => t.id === selectedTextId);
      if (selectedText) {
        // Use responsive font sizes from database if available, otherwise use defaults
        setPreviewFontSizeDesktop(selectedText.font_size_desktop || selectedText.font_size || 60);
        setPreviewFontSizeTablet(selectedText.font_size_tablet || Math.round((selectedText.font_size || 60) * 0.75));
        setPreviewFontSizeMobile(selectedText.font_size_mobile || Math.round((selectedText.font_size || 60) * 0.53));
      }
    }
  }, [selectedTextId, heroTexts]);

  // Fetch cache statistics
  const { data: cacheStats, isLoading: cacheLoading } = useQuery<CacheStats>({
    queryKey: ['/api/video-cache/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Cache status tracking
  const [cacheStatus, setCacheStatus] = useState<{[key: string]: boolean}>({});

  // Helper function to create MD5 hash (same as server-side)
  const createMD5Hash = (filename: string): string => {
    return CryptoJS.MD5(filename).toString();
  };

  // Update cache status when stats change
  React.useEffect(() => {
    if (cacheStats && 'files' in cacheStats && Array.isArray((cacheStats as any).files)) {
      const statusMap: {[key: string]: boolean} = {};
      const cachedFiles = ((cacheStats as any).files) as string[];
      
      // Extract hashes from cached filenames (remove .mp4 extension)
      const cachedHashes = cachedFiles.map(file => file.replace('.mp4', ''));
      
      // Check each hero video file
      const heroVideoFiles = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
      heroVideoFiles.forEach(filename => {
        const expectedHash = createMD5Hash(filename);
        statusMap[filename] = cachedHashes.includes(expectedHash);
      });
      
      setCacheStatus(statusMap);
    }
  }, [cacheStats]);

  // Video reordering mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ videoId, newOrder }: { videoId: number; newOrder: number }) => {
      console.log('=== MUTATION STARTED ===');
      console.log('Sending PATCH to:', `/api/hero-videos/${videoId}/reorder`);
      console.log('Payload:', { order_index: newOrder });
      
      const response = await apiRequest(`/api/hero-videos/${videoId}/reorder`, 'PATCH', { order_index: newOrder });
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
      const response = await apiRequest(`/api/hero-videos/${videoId}/toggle`, 'PATCH', { is_active: isActive });
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
      const response = await apiRequest('/api/video-cache/refresh', 'POST');
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

  // Smart gallery cache refresh mutation - syncs cache with current database
  const smartCacheRefreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/refresh-gallery', 'POST');
      return await response.json() as {
        success: boolean;
        message: string;
        removed: string[];
        cached: string[];
        stats: any;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      const removedCount = data.removed?.length || 0;
      const cachedCount = data.cached?.length || 0;
      toast({ 
        title: "Smart Cache Refresh Complete", 
        description: `Removed ${removedCount} outdated files, cached ${cachedCount} new files` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to refresh gallery cache", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      toast({ 
        title: "Cache Completely Cleared", 
        description: `Removed ${result.videosRemoved} videos and ${result.imagesRemoved} images. Cache is now empty.`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear video cache", variant: "destructive" });
    }
  });

  // Hero text update mutation
  const updateTextMutation = useMutation({
    mutationFn: async ({ textId, data }: { textId: number; data: any }) => {
      const response = await apiRequest(`/api/hero-text/${textId}`, 'PATCH', data);
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
    mutationFn: async ({ textId, fontSizes }: { 
      textId: number; 
      fontSizes: { 
        desktop: number; 
        tablet: number; 
        mobile: number; 
        legacy?: number;
      } 
    }) => {
      const response = await apiRequest(`/api/hero-text/${textId}/apply`, 'PATCH', { 
        font_size: fontSizes.legacy || fontSizes.desktop, // Keep legacy compatibility
        font_size_desktop: fontSizes.desktop,
        font_size_tablet: fontSizes.tablet,
        font_size_mobile: fontSizes.mobile,
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
      const response = await apiRequest('/api/hero-text', 'POST', data);
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
      const response = await apiRequest(`/api/hero-text/${textId}`, 'DELETE');
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-full bg-gray-900 text-white flex flex-col z-40">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
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

        {/* Navigation - Scrollable */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Section Title */}
          <div className="mb-4 px-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sections</h3>
          </div>
          
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 group ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  style={isActive ? { backgroundColor: 'var(--memopyk-orange)' } : {}}
                >
                  {/* Icon with background that changes on hover */}
                  <div 
                    className={`p-2 rounded-md ${isActive ? '' : 'group-hover:bg-gray-700'}`}
                    style={isActive ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                  </div>
                  
                  {/* Label */}
                  <span className={`text-sm font-medium ${isActive ? 'text-white font-semibold' : 'text-gray-300 group-hover:text-white'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout - Fixed at bottom */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content with left margin to account for fixed sidebar */}
      <div className="ml-64">
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

              {/* Hero Video Cache Status - Section-Specific */}
              {heroTab === 'videos' && (
                <VideoCacheStatus 
                  videoFilenames={heroVideos.map(video => video.url_en).filter(url => url !== '')}
                  title="Hero Videos Cache Status"
                  showForceAllButton={false}
                  description="Manage caching for hero carousel videos only"
                />
              )}

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
                                      const response = await fetch('/api/hero-videos/upload', {
                                        method: 'POST',
                                        body: formData
                                      });
                                      
                                      if (response.ok) {
                                        const result = await response.json();
                                        const filename = result.filename;
                                        
                                        // Now create a new hero video entry with the uploaded file
                                        const createResponse = await fetch('/api/hero-videos', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            title_en: `New Video - ${file.name}`,
                                            title_fr: `Nouvelle Vidéo - ${file.name}`,
                                            url_en: filename,
                                            url_fr: filename,
                                            use_same_video: true,
                                            is_active: true,
                                            order_index: heroVideos.length + 1
                                          })
                                        });
                                        
                                        if (createResponse.ok) {
                                          toast({ title: "Success", description: "Video uploaded and added successfully!" });
                                          queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
                                        } else {
                                          toast({ title: "Upload Failed", description: "Video uploaded but failed to create entry", variant: "destructive" });
                                        }
                                      } else {
                                        const errorData = await response.json();
                                        toast({ title: "Upload Failed", description: errorData.error || "Upload failed", variant: "destructive" });
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
                                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                    <video
                                      src={`/api/video-proxy?filename=${encodeURIComponent(video.url_en)}`}
                                      className="w-full h-full object-cover cursor-pointer"
                                      muted
                                      preload="metadata"
                                      controls
                                      playsInline
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const videoElement = e.target as HTMLVideoElement;
                                        if (videoElement.paused) {
                                          videoElement.play();
                                        } else {
                                          videoElement.pause();
                                        }
                                      }}
                                    />
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
                                    
                                    {/* Cache Status */}
                                    <div className="flex items-center justify-center">
                                      {(() => {
                                        const filename = video.url_en;
                                        const isCached = cacheStatus[filename];
                                        return (
                                          <div className={`px-4 py-2 rounded-lg font-medium text-sm border-2 ${
                                            isCached 
                                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' 
                                              : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                                          }`}>
                                            {isCached ? (
                                              <>
                                                <Check className="inline h-4 w-4 mr-1" />
                                                ✅ Cached (~50ms load)
                                              </>
                                            ) : (
                                              <>
                                                <Zap className="inline h-4 w-4 mr-1" />
                                                ⏳ Not Cached (~1500ms load)
                                              </>
                                            )}
                                          </div>
                                        );
                                      })()}
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
                                            const result = await response.json();
                                            queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
                                            toast({ 
                                              title: "Video Cached Successfully!", 
                                              description: result.message || "Video is now cached for faster loading"
                                            });
                                          } else {
                                            const error = await response.json();
                                            toast({ 
                                              title: "Cache Failed", 
                                              description: error.error || "Failed to cache video", 
                                              variant: "destructive" 
                                            });
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
                                                fontSizes: {
                                                  desktop: text.font_size_desktop || text.font_size || 60,
                                                  tablet: text.font_size_tablet || Math.round((text.font_size || 60) * 0.75),
                                                  mobile: text.font_size_mobile || Math.round((text.font_size || 60) * 0.53),
                                                  legacy: text.font_size
                                                }
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
                                {/* Responsive Font Size Controls */}
                                <div className="space-y-6">
                                  {/* Device Preview Selector */}
                                  <div className="space-y-3">
                                    <Label className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                      <Monitor className="h-5 w-5" />
                                      Responsive Font Size Controls
                                    </Label>
                                    <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                      <button
                                        onClick={() => setCurrentPreviewDevice('desktop')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                          currentPreviewDevice === 'desktop'
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                      >
                                        <Monitor className="h-4 w-4" />
                                        Desktop
                                      </button>
                                      <button
                                        onClick={() => setCurrentPreviewDevice('tablet')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                          currentPreviewDevice === 'tablet'
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                      >
                                        <Tablet className="h-4 w-4" />
                                        Tablet
                                      </button>
                                      <button
                                        onClick={() => setCurrentPreviewDevice('mobile')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                          currentPreviewDevice === 'mobile'
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                      >
                                        <Smartphone className="h-4 w-4" />
                                        Mobile
                                      </button>
                                    </div>
                                  </div>

                                  {/* Current Device Font Size Slider */}
                                  <div className="space-y-4">
                                    <Label className="text-base font-medium">
                                      {currentPreviewDevice === 'desktop' && `Desktop Font Size: ${previewFontSizeDesktop}px`}
                                      {currentPreviewDevice === 'tablet' && `Tablet Font Size: ${previewFontSizeTablet}px`}
                                      {currentPreviewDevice === 'mobile' && `Mobile Font Size: ${previewFontSizeMobile}px`}
                                    </Label>
                                    <input
                                      type="range"
                                      min="16"
                                      max="120"
                                      value={
                                        currentPreviewDevice === 'desktop' ? previewFontSizeDesktop :
                                        currentPreviewDevice === 'tablet' ? previewFontSizeTablet :
                                        previewFontSizeMobile
                                      }
                                      onChange={(e) => {
                                        const newSize = Number(e.target.value);
                                        if (currentPreviewDevice === 'desktop') {
                                          setPreviewFontSizeDesktop(newSize);
                                        } else if (currentPreviewDevice === 'tablet') {
                                          setPreviewFontSizeTablet(newSize);
                                        } else {
                                          setPreviewFontSizeMobile(newSize);
                                        }
                                      }}
                                      className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                      style={{
                                        background: `linear-gradient(to right, #D67C4A 0%, #D67C4A ${((
                                          currentPreviewDevice === 'desktop' ? previewFontSizeDesktop :
                                          currentPreviewDevice === 'tablet' ? previewFontSizeTablet :
                                          previewFontSizeMobile
                                        ) - 16) / 104 * 100}%, #e5e7eb ${((
                                          currentPreviewDevice === 'desktop' ? previewFontSizeDesktop :
                                          currentPreviewDevice === 'tablet' ? previewFontSizeTablet :
                                          previewFontSizeMobile
                                        ) - 16) / 104 * 100}%)`
                                      }}
                                    />
                                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                      <div className="flex justify-between">
                                        <span>Desktop: {previewFontSizeDesktop}px</span>
                                        <span>Tablet: {previewFontSizeTablet}px</span>
                                        <span>Mobile: {previewFontSizeMobile}px</span>
                                      </div>
                                      <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                                        🎯 Current preview: {currentPreviewDevice.charAt(0).toUpperCase() + currentPreviewDevice.slice(1)}
                                      </p>
                                    </div>
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
                                              fontSize: `${
                                                currentPreviewDevice === 'desktop' ? previewFontSizeDesktop :
                                                currentPreviewDevice === 'tablet' ? previewFontSizeTablet :
                                                previewFontSizeMobile
                                              }px`,
                                              lineHeight: '1.2',
                                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                              fontFamily: currentPreviewDevice === 'mobile' ? 'Poppins, sans-serif' : 'Playfair Display, serif'
                                            }}
                                          >
                                            {selectedText.title_fr}
                                          </h1>
                                          <p 
                                            className="opacity-90"
                                            style={{ 
                                              fontSize: `${(
                                                currentPreviewDevice === 'desktop' ? previewFontSizeDesktop :
                                                currentPreviewDevice === 'tablet' ? previewFontSizeTablet :
                                                previewFontSizeMobile
                                              ) * 0.6}px`,
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
                                            data: { 
                                              font_size_desktop: previewFontSizeDesktop,
                                              font_size_tablet: previewFontSizeTablet,
                                              font_size_mobile: previewFontSizeMobile,
                                              font_size: previewFontSizeDesktop // Legacy field for backward compatibility
                                            }
                                          });
                                        }
                                      }
                                    }}
                                    disabled={updateTextMutation.isPending}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Responsive Sizes
                                  </Button>
                                  <Button
                                    className="bg-orange-500 hover:bg-orange-600"
                                    onClick={() => {
                                      if (selectedTextId) {
                                        applyTextMutation.mutate({ 
                                          textId: selectedTextId, 
                                          fontSizes: {
                                            desktop: previewFontSizeDesktop,
                                            tablet: previewFontSizeTablet,
                                            mobile: previewFontSizeMobile,
                                            legacy: previewFontSize
                                          }
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



          {/* Analytics Dashboard */}
          {activeSection === 'analytics' && (
            <AnalyticsDashboard />
          )}

          {/* Gallery */}
          {activeSection === 'gallery' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Galerie</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion des éléments de galerie portfolio - Interface améliorée</p>
              </div>
              <GalleryManagementNew key="gallery-v1.0.88" />
            </div>
          )}

          {/* Cache Management */}
          {activeSection === 'cache' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion du Cache</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion complète du cache pour tous les médias (Vidéos Hero, Vidéos Galerie, Images)</p>
              </div>
              
              {/* Cache Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Video className="h-5 w-5 text-blue-600" />
                      Vidéos Hero
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VideoCacheStatus
                      title="Hero Videos Cache Status"
                      description="Critical videos for homepage carousel - preloaded for instant display"
                      videoFilenames={heroVideos.map(v => v.url_en).filter(Boolean)}
                      showForceAllButton={false}
                      smartCacheRefreshMutation={{
                        mutate: () => {},
                        isPending: false
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Play className="h-5 w-5 text-green-600" />
                      Vidéos Galerie
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VideoCacheStatus
                      title="Gallery Videos Cache Status"
                      description="Portfolio gallery videos - optimized for lightbox display"
                      videoFilenames={['PomGalleryC.mp4', 'VitaminSeaC.mp4', 'safari-1.mp4']}
                      showForceAllButton={false}
                      smartCacheRefreshMutation={{
                        mutate: () => {},
                        isPending: false
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-purple-600" />
                      Actions Globales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gestion complète du cache pour production
                      </p>
                      
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          // This will use the mutation from VideoCacheStatus component
                          const event = new CustomEvent('triggerBulletproofCache');
                          window.dispatchEvent(event);
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        🚀 BULLETPROOF All Media Cache
                      </Button>
                      
                      <p className="text-xs text-gray-500">
                        Cache tous les médias (6 vidéos + 4 images) avec vérification complète
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}





          {/* FAQ */}
          {activeSection === 'faq' && (
            <div className="space-y-6">
              <FAQManagementWorking />
            </div>
          )}



          {/* CTA Management */}
          {activeSection === 'cta' && (
            <div className="space-y-6">
              <CtaManagement />
            </div>
          )}

          {/* Legal Documents */}
          {activeSection === 'legal-docs' && (
            <div className="space-y-6">
              <LegalDocumentManagement />
            </div>
          )}

          {/* SEO Management */}
          {activeSection === 'seo-management' && (
            <SeoManagement />
          )}

          {/* Tests */}
          {activeSection === 'tests' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tests</h2>
                <p className="text-gray-600 dark:text-gray-400">Tests système et validation</p>
              </div>
              <SystemTestDashboard />
            </div>
          )}

          {/* Deployment */}
          {activeSection === 'deployment' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Déploiement</h2>
                <p className="text-gray-600 dark:text-gray-400">Gestion du déploiement et de la production</p>
              </div>
              <DeploymentManagement />
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
                  {editingVideo ? 'Modifier vos fichiers vidéo (optionnel)' : 'Video Files'}
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
                          {editVideoData.url_en ? 'Remplacer la vidéo' : 'Drop your video here'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {editVideoData.url_en ? 'ou cliquez pour parcourir les fichiers' : 'or click to browse files'}
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
                    
                    {/* Current video display with preview */}
                    {editVideoData.url_en && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <Label className="text-sm font-medium text-green-800 dark:text-green-200">Vidéo actuelle téléchargée ✓</Label>
                        </div>
                        <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-3">
                          {editVideoData.url_en}
                        </p>
                        <div className="flex items-center gap-3">
                          <video 
                            src={`/api/video-proxy?filename=${encodeURIComponent(editVideoData.url_en)}`}
                            className="w-20 h-12 object-cover rounded border"
                            muted
                          />
                          <div className="text-xs text-green-600 dark:text-green-400">
                            <p className="font-medium">Remplacer la vidéo</p>
                            <p>Téléchargez une nouvelle vidéo ci-dessus</p>
                          </div>
                        </div>
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
                  <div className="grid grid-cols-2 gap-6 items-start">
                    {/* English Video Upload */}
                    <div className="space-y-3 flex flex-col">
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
                          {editVideoData.url_en ? 'Remplacer vidéo EN' : 'Upload EN Video'}
                        </label>
                      </div>
                      {editVideoData.url_en && (
                        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 h-auto">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <Label className="text-xs font-medium text-green-800 dark:text-green-200">Vidéo EN téléchargée ✓</Label>
                          </div>
                          <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-2 min-h-[1.5rem]">
                            {editVideoData.url_en}
                          </p>
                          <div className="flex items-start gap-2">
                            <video 
                              src={`/api/video-proxy?filename=${encodeURIComponent(editVideoData.url_en)}`}
                              className="w-16 h-10 object-cover rounded border flex-shrink-0"
                              muted
                            />
                            <span className="text-xs text-green-600 dark:text-green-400 flex-1 leading-tight">Remplacer ci-dessus</span>
                          </div>
                        </div>
                      )}
                      <Input
                        value={editVideoData.url_en}
                        onChange={(e) => setEditVideoData({ ...editVideoData, url_en: e.target.value })}
                        placeholder="VideoHeroEN.mp4"
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                      />
                    </div>
                    
                    {/* French Video Upload */}
                    <div className="space-y-3 flex flex-col">
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
                          {editVideoData.url_fr ? 'Remplacer vidéo FR' : 'Upload FR Video'}
                        </label>
                      </div>
                      {editVideoData.url_fr && (
                        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 h-auto">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <Label className="text-xs font-medium text-green-800 dark:text-green-200">Vidéo FR téléchargée ✓</Label>
                          </div>
                          <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-2 min-h-[1.5rem]">
                            {editVideoData.url_fr}
                          </p>
                          <div className="flex items-start gap-2">
                            <video 
                              src={`/api/video-proxy?filename=${encodeURIComponent(editVideoData.url_fr)}`}
                              className="w-16 h-10 object-cover rounded border flex-shrink-0"
                              muted
                            />
                            <span className="text-xs text-green-600 dark:text-green-400 flex-1 leading-tight">Remplacer ci-dessus</span>
                          </div>
                        </div>
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