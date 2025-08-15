import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Play, RefreshCw, BarChart3, Video, HardDrive, Users, MessageSquare, FileText, LogOut, TestTube, Rocket, X, Type, Save, Palette, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Upload, FileVideo, Database, Check, Zap, Search, Monitor, Tablet, Smartphone, Clock } from 'lucide-react';
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
import PerformanceTestDashboard from '@/components/admin/PerformanceTestDashboard';
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
  const [currentPreviewDevice, setCurrentPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewLanguage, setPreviewLanguage] = useState<'fr-FR' | 'en-US'>('fr-FR');
  const [previewFontSizeDesktop, setPreviewFontSizeDesktop] = useState(60);
  const [previewFontSizeTablet, setPreviewFontSizeTablet] = useState(45);
  const [previewFontSizeMobile, setPreviewFontSizeMobile] = useState(32);
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ title_fr: '', title_en: '', subtitle_fr: '', subtitle_en: '' });
  const [showNewTextForm, setShowNewTextForm] = useState(false);
  const [newTextData, setNewTextData] = useState({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '', font_size_desktop: 60, font_size_tablet: 45, font_size_mobile: 32 });
  const [currentPreviewLanguage, setCurrentPreviewLanguage] = useState<'fr' | 'en'>('fr');
  const [isBulletproofCacheRunning, setIsBulletproofCacheRunning] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Check GA dev mode on component mount and listen for storage changes
  useEffect(() => {
    const checkDevMode = () => {
      setIsDevMode(localStorage.getItem('ga_dev') === '1');
    };
    
    // Initial check
    checkDevMode();
    
    // Listen for localStorage changes
    window.addEventListener('storage', checkDevMode);
    
    // Check periodically in case bookmarklet was used on the same page
    const interval = setInterval(checkDevMode, 1000);
    
    return () => {
      window.removeEventListener('storage', checkDevMode);
      clearInterval(interval);
    };
  }, []);

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

  // Handle bulletproof cache loading state
  React.useEffect(() => {
    const handleBulletproofComplete = () => {
      setIsBulletproofCacheRunning(false);
    };

    const handleBulletproofError = () => {
      setIsBulletproofCacheRunning(false);
    };

    // Listen for completion events from VideoCacheStatus component
    window.addEventListener('bulletproofCacheComplete', handleBulletproofComplete);
    window.addEventListener('bulletproofCacheError', handleBulletproofError);
    
    return () => {
      window.removeEventListener('bulletproofCacheComplete', handleBulletproofComplete);
      window.removeEventListener('bulletproofCacheError', handleBulletproofError);
    };
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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Queries and mutations are defined with the main queries section below

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
  const { data: cacheStats, isLoading: cacheLoading } = useQuery<any>({
    queryKey: ['/api/unified-cache/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch detailed cache breakdown
  const { data: cacheBreakdown } = useQuery<any>({
    queryKey: ['/api/cache/breakdown'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Cache statistics are now handled centrally in the "ALL MEDIA CACHE" section


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
      // Invalidate all hero-text queries (admin and public site with language variants)
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
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
      // Invalidate all hero-text queries (admin and public site with language variants)
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
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
      // Invalidate all hero-text queries (admin and public site with language variants)
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
      setShowNewTextForm(false);
      setNewTextData({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '', font_size_desktop: 60, font_size_tablet: 45, font_size_mobile: 36 });
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
      // Invalidate all hero-text queries (admin and public site with language variants)
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
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
              
              {/* Hero Tabs with Bold Orange Colors */}
              <div className="mb-6">
                <nav className="flex space-x-2" aria-label="Tabs">
                  <button
                    onClick={() => setHeroTab('videos')}
                    className="py-4 px-6 font-bold text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-xl border-2"
                    style={{
                      backgroundColor: heroTab === 'videos' ? '#f97316' : '#ffffff',
                      color: heroTab === 'videos' ? '#ffffff' : '#374151',
                      borderColor: heroTab === 'videos' ? '#ea580c' : '#e5e7eb'
                    }}
                  >
                    <Video className="inline-block h-5 w-5 mr-2" />
                    Gestion Vidéos
                  </button>
                  <button
                    onClick={() => setHeroTab('text')}
                    className="py-4 px-6 font-bold text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-xl border-2"
                    style={{
                      backgroundColor: heroTab === 'text' ? '#f97316' : '#ffffff',
                      color: heroTab === 'text' ? '#ffffff' : '#374151',
                      borderColor: heroTab === 'text' ? '#ea580c' : '#e5e7eb'
                    }}
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

                                  <div className="grid grid-cols-2 gap-2">
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
                                      <small className="text-gray-500 block mb-1">Utilisez Entrée pour créer des sauts de ligne</small>
                                      <Textarea
                                        value={newTextData.title_fr}
                                        onChange={(e) => setNewTextData({ ...newTextData, title_fr: e.target.value })}
                                        placeholder="Ex: Transformez vos souvenirs&#10;en films cinématographiques"
                                        rows={3}
                                        className="resize-none"
                                      />
                                    </div>
                                    <div>
                                      <Label>Titre (Anglais)</Label>
                                      <small className="text-gray-500 block mb-1">Use Enter to create line breaks</small>
                                      <Textarea
                                        value={newTextData.title_en}
                                        onChange={(e) => setNewTextData({ ...newTextData, title_en: e.target.value })}
                                        placeholder="Ex: Transform your memories&#10;into cinematic films"
                                        rows={3}
                                        className="resize-none"
                                      />
                                    </div>
                                    <div>
                                      <Label>Sous-titre (Français)</Label>
                                      <small className="text-gray-500 block mb-1">Utilisez Entrée pour créer des sauts de ligne</small>
                                      <Textarea
                                        value={newTextData.subtitle_fr}
                                        onChange={(e) => setNewTextData({ ...newTextData, subtitle_fr: e.target.value })}
                                        placeholder="Ex: Créez des vidéos professionnelles&#10;avec notre expertise cinématographique"
                                        rows={3}
                                        className="resize-none"
                                      />
                                    </div>
                                    <div>
                                      <Label>Sous-titre (Anglais)</Label>
                                      <small className="text-gray-500 block mb-1">Use Enter to create line breaks</small>
                                      <Textarea
                                        value={newTextData.subtitle_en}
                                        onChange={(e) => setNewTextData({ ...newTextData, subtitle_en: e.target.value })}
                                        placeholder="Ex: Create professional videos&#10;with our cinematic expertise"
                                        rows={3}
                                        className="resize-none"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Taille de Police Desktop: {newTextData.font_size_desktop}px</Label>
                                    <input
                                      type="range"
                                      min="20"
                                      max="120"
                                      value={newTextData.font_size_desktop}
                                      onChange={(e) => setNewTextData({ ...newTextData, font_size_desktop: Number(e.target.value) })}
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
                                        setNewTextData({ title_fr: '', subtitle_fr: '', title_en: '', subtitle_en: '', font_size_desktop: 60, font_size_tablet: 45, font_size_mobile: 36 });
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
                                            <small className="text-gray-400 block text-xs">Entrée = saut de ligne</small>
                                            <Textarea
                                              value={editFormData.title_fr}
                                              onChange={(e) => setEditFormData({ ...editFormData, title_fr: e.target.value })}
                                              className="text-sm resize-none"
                                              rows={2}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Titre (Anglais)</Label>
                                            <small className="text-gray-400 block text-xs">Enter = line break</small>
                                            <Textarea
                                              value={editFormData.title_en}
                                              onChange={(e) => setEditFormData({ ...editFormData, title_en: e.target.value })}
                                              className="text-sm resize-none"
                                              rows={2}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Sous-titre (Français)</Label>
                                            <small className="text-gray-400 block text-xs">Entrée = saut de ligne</small>
                                            <Textarea
                                              value={editFormData.subtitle_fr}
                                              onChange={(e) => setEditFormData({ ...editFormData, subtitle_fr: e.target.value })}
                                              className="text-sm resize-none"
                                              rows={2}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Sous-titre (Anglais)</Label>
                                            <small className="text-gray-400 block text-xs">Enter = line break</small>
                                            <Textarea
                                              value={editFormData.subtitle_en}
                                              onChange={(e) => setEditFormData({ ...editFormData, subtitle_en: e.target.value })}
                                              className="text-sm resize-none"
                                              rows={2}
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
                                              setPreviewFontSizeDesktop(text.font_size_desktop || text.font_size || 60);
                                              setPreviewFontSizeTablet(text.font_size_tablet || Math.round((text.font_size || 60) * 0.75));
                                              setPreviewFontSizeMobile(text.font_size_mobile || Math.round((text.font_size || 60) * 0.53));
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
                                      Contrôles de Taille de Police Responsive
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
                                        Ordinateur
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
                                        Tablette
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
                                      {currentPreviewDevice === 'desktop' && `Taille Police Ordinateur: ${previewFontSizeDesktop}px`}
                                      {currentPreviewDevice === 'tablet' && `Taille Police Tablette: ${previewFontSizeTablet}px`}
                                      {currentPreviewDevice === 'mobile' && `Taille Police Mobile: ${previewFontSizeMobile}px`}
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
                                        <span>Ordinateur: {previewFontSizeDesktop}px</span>
                                        <span>Tablette: {previewFontSizeTablet}px</span>
                                        <span>Mobile: {previewFontSizeMobile}px</span>
                                      </div>
                                      <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                                        🎯 Aperçu actuel: {
                                          currentPreviewDevice === 'desktop' ? 'Ordinateur' :
                                          currentPreviewDevice === 'tablet' ? 'Tablette' :
                                          'Mobile'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Language Toggle - Clear Design */}
                                <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                  <button
                                    onClick={() => setPreviewLanguage('fr-FR')}
                                    className={`px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center gap-2 ${
                                      previewLanguage === 'fr-FR'
                                        ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    🇫🇷
                                    <span className="font-bold">FRANÇAIS</span>
                                    {previewLanguage === 'fr-FR' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                  </button>
                                  <button
                                    onClick={() => setPreviewLanguage('en-US')}
                                    className={`px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center gap-2 ${
                                      previewLanguage === 'en-US'
                                        ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    🇺🇸
                                    <span className="font-bold">ENGLISH</span>
                                    {previewLanguage === 'en-US' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                  </button>
                                </div>

                                {/* Aperçu en Direct - Pleine Largeur Comme Site Public */}
                                <div 
                                  className="bg-black rounded-lg p-4 sm:p-8 min-h-[300px] flex items-center justify-center relative overflow-hidden w-full"
                                  style={{
                                    backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                  }}
                                >
                                  <div className="text-center text-white max-w-7xl w-full px-3 sm:px-6 lg:px-8">
                                    {selectedTextId ? (() => {
                                      const selectedText = heroTexts.find((t: any) => t.id === selectedTextId);
                                      return selectedText ? (
                                        <div>
                                          <h1 
                                            className="font-playfair font-bold mb-2 sm:mb-4 lg:mb-6 leading-tight"
                                            style={{ 
                                              fontSize: `${Math.round((
                                                currentPreviewDevice === 'desktop' ? previewFontSizeDesktop :
                                                currentPreviewDevice === 'tablet' ? previewFontSizeTablet :
                                                previewFontSizeMobile
                                              ) * 0.65)}px`,
                                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                                            }}
                                          >
                                            {(() => {
                                              const text = previewLanguage === 'fr-FR' 
                                                ? (selectedText.title_fr || "Transformez vos souvenirs\nen films cinématographiques")
                                                : (selectedText.title_en || "Transform your memories\ninto cinematic films");
                                              
                                              // Handle multiple escaping scenarios: raw newlines, \n, \\n
                                              let processedText = text;
                                              if (processedText.includes('\\n')) {
                                                processedText = processedText.replace(/\\n/g, '\n');
                                              }
                                              const lines = processedText.split('\n');
                                              return lines.map((line: string, index: number) => (
                                                <React.Fragment key={index}>
                                                  {line}
                                                  {index < lines.length - 1 && <br />}
                                                </React.Fragment>
                                              ));
                                            })()}
                                          </h1>
                                          {/* Only render subtitle if it exists and is not empty */}
                                          {((previewLanguage === 'fr-FR' && selectedText.subtitle_fr && selectedText.subtitle_fr.trim()) || 
                                            (previewLanguage === 'en-US' && selectedText.subtitle_en && selectedText.subtitle_en.trim())) && (
                                            <p 
                                              className="mb-4 sm:mb-6 lg:mb-8 text-white/90 font-poppins leading-snug"
                                              style={{ 
                                                fontSize: `${Math.round((
                                                  currentPreviewDevice === 'desktop' ? previewFontSizeDesktop :
                                                  currentPreviewDevice === 'tablet' ? previewFontSizeTablet :
                                                  previewFontSizeMobile
                                                ) * 0.31)}px`,
                                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                                              }}
                                            >
                                              {(() => {
                                                const text = previewLanguage === 'fr-FR'
                                                  ? selectedText.subtitle_fr
                                                  : selectedText.subtitle_en;
                                                
                                                // Handle multiple escaping scenarios: raw newlines, \n, \\n
                                                let processedText = text;
                                                if (processedText.includes('\\n')) {
                                                  processedText = processedText.replace(/\\n/g, '\n');
                                                }
                                                return processedText.split('\n').map((line: string, index: number) => (
                                                  <React.Fragment key={index}>
                                                    {line}
                                                    {index < processedText.split('\n').length - 1 && <br />}
                                                  </React.Fragment>
                                                ));
                                              })()}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-gray-400">
                                          <p>Texte non trouvé pour l'ID: {selectedTextId}</p>
                                        </div>
                                      );
                                    })() : (
                                      <div className="text-gray-400">
                                        <p>Cliquez sur "Prévisualiser" pour voir le texte ici</p>
                                      </div>
                                    )}
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
                                    Sauvegarder Tailles Responsive
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
                                            legacy: previewFontSizeDesktop
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
              
              {/* Storage Management Overview */}
              {cacheStats && (
                <Card className="border-2 border-orange-200 bg-orange-50 mb-6">
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
                          <Badge variant={cacheStats.total?.sizeMB > 800 ? "destructive" : cacheStats.total?.sizeMB > 500 ? "default" : "secondary"}>
                            {cacheStats.total?.sizeMB}MB / {cacheStats.total?.limitMB}MB
                          </Badge>
                          <span className="text-sm text-gray-600">({cacheStats.total?.usagePercent || 0}%)</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Auto Cleanup</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                            {cacheStats.management?.maxCacheDays || 30} days
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {cacheStats.management?.autoCleanup ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Media Files</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{cacheStats.total?.fileCount || 0} files</Badge>
                          <Badge variant="outline">{cacheStats.total?.sizeMB || 0}MB total</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      Auto cleanup removes files older than {cacheStats.management?.maxCacheDays || 30} days. Manual cleanup available below.
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Video Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Video className="h-5 w-5 text-blue-600" />
                      Vidéos Hero
                    </CardTitle>
                    <CardDescription>Vidéos critiques du carrousel homepage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoCacheStatus
                      title="Hero Videos Cache Status"
                      description="Critical videos for homepage carousel - preloaded for instant display"
                      videoFilenames={heroVideos.map(v => v.url_en).filter(Boolean)}
                      showForceAllButton={false}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Play className="h-5 w-5 text-green-600" />
                      Vidéos Galerie
                    </CardTitle>
                    <CardDescription>Vidéos portfolio optimisées pour lightbox</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoCacheStatus
                      title="Gallery Videos Cache Status"
                      description="Portfolio gallery videos - optimized for lightbox display"
                      videoFilenames={['PomGalleryC.mp4', 'VitaminSeaC.mp4', 'safari-1.mp4']}
                      showForceAllButton={false}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Global Cache Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <HardDrive className="h-6 w-6 text-purple-600" />
                    Actions Globales du Cache
                  </CardTitle>
                  <CardDescription>
                    Gestion complète du cache pour tous les médias (Hero Videos + Gallery Videos + Images)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      size="lg"
                      variant="default"
                      disabled={isBulletproofCacheRunning}
                      onClick={() => {
                        setIsBulletproofCacheRunning(true);
                        const event = new CustomEvent('triggerAllMediaCache');
                        window.dispatchEvent(event);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium h-20 flex-col gap-2 disabled:opacity-70"
                    >
                      <div className="flex items-center gap-2">
                        {isBulletproofCacheRunning ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <Zap className="h-5 w-5" />
                        )}
                        <span className="text-lg">
                          {isBulletproofCacheRunning ? '⚡ Processing All Media...' : '🚀 All Media Cache'}
                        </span>
                      </div>
                      <span className="text-sm opacity-90">
                        {isBulletproofCacheRunning ? 'This will take 15-45 seconds...' : 'Cache tous les médias avec vérification complète'}
                      </span>
                    </Button>
                    
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-20 flex-col gap-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      onClick={() => {
                        // Smart cleanup functionality - removes only outdated files
                        const event = new CustomEvent('triggerClearCache');
                        window.dispatchEvent(event);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <span className="text-lg">🧹 Smart Cleanup</span>
                      </div>
                      <span className="text-sm opacity-90">Supprime fichiers expirés (&gt;30j) + orphelins uniquement</span>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="h-20 flex-col gap-2 border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
                      onClick={async () => {
                        try {
                          const response = await apiRequest('/api/cache/cleanup-orphaned-static-images', 'POST');
                          const data = await response.json();
                          
                          if (data.cleaned > 0) {
                            toast({
                              title: "Images orphelines supprimées",
                              description: `${data.cleaned} images orphelines supprimées. Cache maintenant: ${data.referencedImages.length} images pour ${data.referencedImages.length} galeries actives.`,
                            });
                          } else {
                            toast({
                              title: "Aucune image orpheline",
                              description: "Toutes les images en cache sont utilisées par des galeries actives.",
                            });
                          }
                          
                          // Refresh cache stats
                          queryClient.invalidateQueries({ queryKey: ['/api/cache/breakdown'] });
                        } catch (error) {
                          toast({
                            title: "Erreur nettoyage",
                            description: "Impossible de nettoyer les images orphelines.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        <span className="text-lg">🗑️ Images Orphelines</span>
                      </div>
                      <span className="text-sm opacity-90">Supprime images inutilisées uniquement</span>
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <strong>Contenu:</strong> {cacheBreakdown ? 
                          `${cacheBreakdown.heroVideos.count} Vidéos Hero + ${cacheBreakdown.galleryVideos.count} Vidéos Galerie + ${cacheBreakdown.galleryStaticImages.count} Images Statiques (≈${cacheBreakdown.total.sizeMB}MB total)` : 
                          '6 vidéos + 4 images (≈290MB total)'
                        }
                      </div>

                      <div><strong>Usage:</strong> Recommandé après chaque déploiement en production</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tests & Performance</h2>
                <p className="text-gray-600 dark:text-gray-400">Tests système, performance et validation</p>
              </div>
              
              {/* GA4 Developer Mode - Clean & Elegant */}
              <Card className="bg-gradient-to-r from-blue-50 to-orange-50 border border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        🧪
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">MEMOPYK Test</h3>
                        <p className="text-gray-600">Clean testing environment</p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                      isDevMode ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'
                    }`}>
                      {isDevMode ? '🧪 MODE TEST' : '✅ MODE NORMAL'}
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-4">
                    <a
                      href="javascript:(function(){try{var k='ga_dev',b='ga-test-banner',on=localStorage.getItem(k)==='1';if(on){localStorage.removeItem(k);var e=document.getElementById(b);if(e)e.remove();if(typeof window.gtag==='function'){window.gtag('event','debug_toggle',{debug_mode:false,source:'bookmarklet'});}alert('MEMOPYK Test Mode DISABLED');}else{localStorage.setItem(k,'1');var el=document.getElementById(b);if(!el){el=document.createElement('div');el.id=b;el.textContent='🧪 MEMOPYK TEST MODE';el.style.cssText='position:fixed;bottom:12px;right:12px;background:#ff9800;color:#fff;padding:8px 12px;font:600 13px/1.2 system-ui,Segoe UI,Roboto,Arial;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:2147483647;';document.body.appendChild(el);}else{el.style.display='block';}if(typeof window.gtag==='function'){window.gtag('event','debug_toggle',{debug_mode:true,source:'bookmarklet'});}alert('MEMOPYK Test Mode ENABLED');}}catch(err){alert('Toggle failed: '+err);}console.log('MEMOPYK Test bookmarklet executed successfully');})();"
                      title="Toggle MEMOPYK Test Mode"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-800 border-2 border-orange-400 rounded-xl hover:bg-gray-50 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                      draggable={true}
                    >
                      🧪 MEMOPYK Test
                    </a>

                    <div className="text-center space-y-2">
                      <p className="text-sm text-gray-700">
                        <strong>Instructions:</strong> Show bookmarks (Ctrl+Shift+B) • Drag button to bookmarks • Click to toggle
                      </p>
                      <p className="text-xs text-green-700 font-medium">
                        Compatible: Chrome, Edge, Firefox, Safari
                      </p>
                    </div>
                  </div>

                  {isDevMode && (
                    <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                      <p className="text-sm text-orange-800 font-medium text-center">
                        🧪 MEMOPYK TEST MODE ACTIVE - Actions marked debug_mode=true (no impact on production analytics)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <PerformanceTestDashboard />
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
              <span>Aperçu Vidéo: {previewVideo?.title}</span>
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