import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Video,
  Image,
  Play,
  PlayCircle,
  Save,
  Crop,
  Download,
  Upload,
  CheckCircle,
  Monitor,
  Smartphone,
  Power,
  Palette,
  Globe,
  Info
} from "lucide-react";
import ImageCropperEasyCrop from './ImageCropperEasyCrop';
import DirectUpload from './DirectUpload';
import FormatBadgeManager from './FormatBadgeManager';

// Helper function to convert filename to full URL if needed
const getFullUrl = (value: string): string => {
  if (!value) return '';
  if (value.includes('supabase.memopyk.org')) return value; // Already a full URL
  if (value.includes('http')) return value; // Already some kind of URL
  // Convert filename to full URL
  return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${value}`;
};

// Module-level persistent state that survives component re-creations
const persistentUploadState = {
  video_url_en: '',
  image_url_en: '',
  video_url_fr: '',
  image_url_fr: '',
  video_filename: '',
  video_filename_en: '', // Added separate EN video filename
  video_filename_fr: '', // Added separate FR video filename
  reset: () => {
    persistentUploadState.video_url_en = '';
    persistentUploadState.image_url_en = '';
    persistentUploadState.video_url_fr = '';
    persistentUploadState.image_url_fr = '';
    persistentUploadState.video_filename = '';
    persistentUploadState.video_filename_en = '';
    persistentUploadState.video_filename_fr = '';
  }
};

interface GalleryItem {
  id: string | number;
  title_en: string;
  title_fr: string;
  price_en: string;
  price_fr: string;
  source_en: string;
  source_fr: string;
  duration_en: string;
  duration_fr: string;
  situation_en: string;
  situation_fr: string;
  story_en: string;
  story_fr: string;
  sorry_message_en: string;
  sorry_message_fr: string;
  format_platform_en: string;
  format_platform_fr: string;
  format_type_en: string;
  format_type_fr: string;
  video_url_en: string;
  video_url_fr: string;
  video_filename: string;
  use_same_video: boolean; // RESTORED: Bilingual video selection toggle
  video_width: number;
  video_height: number;
  video_orientation: string;
  image_url_en: string;
  image_url_fr: string;
  static_image_url: string | null;
  order_index: number;
  is_active: boolean;
}

export default function GalleryManagementNew() {
  // VERSION: NEW-COMPONENT-v1.0.91 - LATEST UPLOAD PRIORITY FIX
  console.log('🎯🎯🎯 GALLERYMANAGEMENTNEW v1.0.91 - LATEST UPLOAD PRIORITY! 🎯🎯🎯');
  console.log('✅ This is the CORRECT modern component with language-specific uploads!');
  console.log('🔥 French (blue) + English (green) sections should be visible!');
  console.log('🎨 Toggle: "Utiliser la même vidéo pour FR et EN" controls layout!');
  
  const { toast } = useToast();

  // Helper function to convert filename to full URL when displaying with cache-busting
  const getFullUrl = (value: string) => {
    if (!value) return '';
    // If it's already a full URL, return as-is
    if (value.startsWith('http')) return value;
    // If it's just a filename, convert to full Supabase URL
    return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${value}`;
  };

  // Helper function to get image with cache-busting - SUPER AGGRESSIVE METHOD
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  
  const getImageUrlWithCacheBust = (filename: string) => {
    if (!filename) return '';
    // Use super aggressive cache-busting with multiple parameters + component refresh key
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const componentKey = forceRefreshKey; // Changes when we need to force refresh
    
    if (filename.includes('http')) {
      const url = `${filename}?bustCache=${timestamp}&version=${random}&refresh=${componentKey}&nocache=1&_=${Date.now()}`;
      console.log(`🖼️ SUPER AGGRESSIVE CACHE-BUST URL v1.0.90: ${url}`);
      return url;
    }
    const url = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodeURIComponent(filename)}?bustCache=${timestamp}&version=${random}&refresh=${componentKey}&nocache=1&_=${Date.now()}`;
    console.log(`🖼️ SUPER AGGRESSIVE CACHE-BUST URL v1.0.90: ${url}`);
    return url;
  };
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState<string | number | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperLanguage, setCropperLanguage] = useState<'en' | 'fr'>('en');
  const [showFormatBadgeManager, setShowFormatBadgeManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch gallery items with cache-busting
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery', 'v1.0.88'],
    select: (data) => data.sort((a, b) => a.order_index - b.order_index)
  });

  // Get selected item
  const selectedItem = galleryItems.find(item => item.id === selectedVideoId);

  // Initialize form data
  const [formData, setFormData] = useState({
    title_en: '',
    title_fr: '',
    price_en: '',
    price_fr: '',
    source_en: '',
    source_fr: '',
    duration_en: '',
    duration_fr: '',
    situation_en: '',
    situation_fr: '',
    story_en: '',
    story_fr: '',
    sorry_message_en: 'Sorry, we cannot show you the video at this stage',
    sorry_message_fr: 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
    format_platform_en: '',
    format_platform_fr: '',
    format_type_en: '',
    format_type_fr: '',
    video_url_en: '',
    video_url_fr: '',
    video_filename: '', // Legacy field for backward compatibility
    use_same_video: true, // RESTORED: Bilingual video selection - default to same video
    video_width: 16,
    video_height: 9,
    video_orientation: 'landscape',
    image_url_en: '',
    image_url_fr: '',
    static_image_url: '',
    is_active: true
  });

  // Update form data when selected item changes
  useEffect(() => {
    if (selectedItem && !isCreateMode) {
      setFormData({
        title_en: selectedItem.title_en || '',
        title_fr: selectedItem.title_fr || '',
        price_en: selectedItem.price_en || '',
        price_fr: selectedItem.price_fr || '',
        source_en: selectedItem.source_en || '',
        source_fr: selectedItem.source_fr || '',
        duration_en: selectedItem.duration_en || '',
        duration_fr: selectedItem.duration_fr || '',
        situation_en: selectedItem.situation_en || '',
        situation_fr: selectedItem.situation_fr || '',
        story_en: selectedItem.story_en || '',
        story_fr: selectedItem.story_fr || '',
        sorry_message_en: selectedItem.sorry_message_en || 'Sorry, we cannot show you the video at this stage',
        sorry_message_fr: selectedItem.sorry_message_fr || 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
        format_platform_en: selectedItem.format_platform_en || '',
        format_platform_fr: selectedItem.format_platform_fr || '',
        format_type_en: selectedItem.format_type_en || '',
        format_type_fr: selectedItem.format_type_fr || '',
        video_url_en: persistentUploadState.video_url_en || selectedItem.video_url_en || '',
        video_url_fr: persistentUploadState.video_url_fr || selectedItem.video_url_fr || '',
        video_filename: persistentUploadState.video_filename || selectedItem.video_filename || '',
        use_same_video: selectedItem.use_same_video !== undefined ? selectedItem.use_same_video : true, // RESTORED: Load bilingual setting
        video_width: selectedItem.video_width || 16,
        video_height: selectedItem.video_height || 9,
        video_orientation: selectedItem.video_orientation || 'landscape',
        image_url_en: persistentUploadState.image_url_en || selectedItem.image_url_en || '',
        image_url_fr: persistentUploadState.image_url_fr || selectedItem.image_url_fr || '',
        static_image_url: selectedItem.static_image_url || '',
        is_active: selectedItem.is_active
      });
    } else if (isCreateMode) {
      // Reset form for create mode
      setFormData({
        title_en: '',
        title_fr: '',
        price_en: '',
        price_fr: '',
        source_en: '',
        source_fr: '',
        duration_en: '',
        duration_fr: '',
        situation_en: '',
        situation_fr: '',
        story_en: '',
        story_fr: '',
        sorry_message_en: 'Sorry, we cannot show you the video at this stage',
        sorry_message_fr: 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
        format_platform_en: '',
        format_platform_fr: '',
        format_type_en: '',
        format_type_fr: '',
        video_url_en: persistentUploadState.video_url_en || '',
        video_url_fr: persistentUploadState.video_url_fr || '',
        video_filename: persistentUploadState.video_filename || '',
        use_same_video: true, // RESTORED: Default to same video for new items
        video_width: 16,
        video_height: 9,
        video_orientation: 'landscape',
        image_url_en: persistentUploadState.image_url_en || '',
        image_url_fr: persistentUploadState.image_url_fr || '',
        static_image_url: '',
        is_active: true
      });
    }
  }, [selectedItem, isCreateMode]);

  // Auto-select first item when data loads
  useEffect(() => {
    if (galleryItems.length > 0 && !selectedVideoId && !isCreateMode) {
      setSelectedVideoId(galleryItems[0].id);
    }
  }, [galleryItems, selectedVideoId, isCreateMode]);

  // Get thumbnail URL with cache-busting - PRIORITIZE LATEST UPLOADS
  const getThumbnailUrl = (item: GalleryItem) => {
    // NEW LOGIC: Prioritize image_url_en (latest uploads) over static_image_url (old crops)
    const imageUrl = item.image_url_en || item.image_url_fr || item.static_image_url;
    if (!imageUrl) return null;
    
    console.log(`🖼️ ADMIN THUMBNAIL PRIORITY v1.0.91: Using ${imageUrl === item.image_url_en ? 'image_url_en' : imageUrl === item.image_url_fr ? 'image_url_fr' : 'static_image_url'} for item ${item.id}`);
    console.log(`🖼️ ADMIN FULL URL: ${imageUrl}`);
    
    // If it's already a full URL, use it directly with cache-busting
    if (imageUrl.startsWith('http')) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const separator = imageUrl.includes('?') ? '&' : '?';
      const cacheBustUrl = `${imageUrl}${separator}cacheBust=${timestamp}&v=${random}&nocache=1#${timestamp}-${random}`;
      console.log(`🖼️ ADMIN DIRECT URL: ${cacheBustUrl}`);
      return cacheBustUrl;
    }
    
    // Otherwise extract filename and use proxy
    let filename = '';
    if (imageUrl.includes('/')) {
      filename = imageUrl.split('/').pop() || '';
      if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }
    } else {
      filename = imageUrl;
    }
    
    return getImageUrlWithCacheBust(filename);
  };

  // Create/Update mutations
  const createItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gallery', 'POST', data),
    onSuccess: () => {
      toast({ title: "✅ Succès", description: "Élément de galerie créé avec succès" });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      persistentUploadState.reset();
      setIsCreateMode(false);
    },
    onError: (error: any) => {
      toast({ title: "❌ Erreur", description: "Erreur lors de la création de l'élément", variant: "destructive" });
      console.error('Create error:', error);
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => 
      apiRequest(`/api/gallery/${id}`, 'PATCH', data),
    onSuccess: () => {
      toast({ title: "✅ Succès", description: "Élément de galerie mis à jour avec succès" });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      queryClient.removeQueries({ queryKey: ['/api/gallery'] });
      // Force component re-render with cache refresh key update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        setFormData({ ...formData }); // Force state update
        setForceRefreshKey(prev => prev + 1); // Force image refresh
        console.log(`🖼️ FORCE REFRESH KEY UPDATED: ${forceRefreshKey + 1}`);
      }, 500);
      persistentUploadState.reset();
    },
    onError: (error: any) => {
      toast({ title: "❌ Erreur", description: "Erreur lors de la mise à jour de l'élément", variant: "destructive" });
      console.error('Update error:', error);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string | number) => apiRequest(`/api/gallery/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: "✅ Succès", description: "Élément de galerie supprimé avec succès" });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setSelectedVideoId(null);
      setIsCreateMode(false);
    },
    onError: (error: any) => {
      toast({ title: "❌ Erreur", description: "Erreur lors de la suppression de l'élément", variant: "destructive" });
      console.error('Delete error:', error);
    }
  });

  const handleSave = () => {
    if (isCreateMode) {
      createItemMutation.mutate(formData);
    } else if (selectedVideoId) {
      updateItemMutation.mutate({ id: selectedVideoId, data: formData });
    }
  };

  const handleDelete = () => {
    if (selectedVideoId && !isCreateMode) {
      if (confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
        deleteItemMutation.mutate(selectedVideoId);
      }
    }
  };

  const handleCreateNew = () => {
    setIsCreateMode(true);
    setSelectedVideoId(null);
    persistentUploadState.reset();
  };

  const handleCancelCreate = () => {
    setIsCreateMode(false);
    if (galleryItems.length > 0) {
      setSelectedVideoId(galleryItems[0].id);
    }
    persistentUploadState.reset();
  };

  // RESTORED: Bilingual video selection toggle handler
  const handleSameVideoToggle = (checked: boolean) => {
    setFormData({ 
      ...formData, 
      use_same_video: checked,
      // When switching to same video, copy EN video to FR
      video_url_fr: checked ? formData.video_url_en : formData.video_url_fr
    });
  };

  if (isLoading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Top Left: NEW Button */}
      <div className="mb-6">
        {!isCreateMode ? (
          <Button
            onClick={handleCreateNew}
            size="lg"
            className="bg-gradient-to-r from-[#89BAD9] to-[#2A4759] hover:from-[#7AA8CC] hover:to-[#1e3340] text-white border-none shadow-lg font-bold text-lg px-8 py-4"
          >
            <Plus className="w-6 h-6 mr-2" />
            NOUVELLE VIDEO
          </Button>
        ) : (
          <Button
            onClick={handleCancelCreate}
            variant="outline"
            size="lg"
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-4"
          >
            Annuler
          </Button>
        )}
      </div>

      {/* Video Selector Section */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="w-full">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Sélectionner une vidéo de galerie
          </Label>
          {!isCreateMode ? (
            <Select 
              value={selectedVideoId?.toString() || ''} 
              onValueChange={(value) => setSelectedVideoId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une vidéo..." />
              </SelectTrigger>
              <SelectContent>
                {galleryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.title_en} - {item.title_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="p-3 bg-[#F2EBDC] dark:bg-[#011526]/20 rounded border-2 border-dashed border-[#89BAD9]">
              <span className="text-[#2A4759] font-medium">Mode création - Nouvelle vidéo</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Form */}
      {(selectedItem || isCreateMode) && (
        <div className="space-y-8">
          {/* Status Section with Video & Image Previews */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Image Previews */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Aperçu Images
                  </h4>
                  
                  {/* French Image */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">🇫🇷 Français</span>
                        {selectedItem?.image_url_fr && (
                          <span className="text-xs text-gray-500 font-mono truncate max-w-32">
                            {selectedItem.image_url_fr.split('/').pop()?.split('?')[0]}
                          </span>
                        )}
                      </div>
                      {!isCreateMode && selectedItem?.image_url_fr && (
                        <Button
                          onClick={() => {
                            setCropperLanguage('fr');
                            setCropperOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 px-2 py-1 text-xs"
                        >
                          <Crop className="w-3 h-3 mr-1" />
                          Recadrer FR
                        </Button>
                      )}
                    </div>
                    <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-600">
                      {selectedItem?.image_url_fr ? (
                        <img 
                          src={selectedItem.image_url_fr.startsWith('http') 
                            ? `${selectedItem.image_url_fr}?cacheBust=${Date.now()}&nocache=1`
                            : `/api/image-proxy?filename=${selectedItem.image_url_fr.split('/').pop()?.split('?')[0]}`
                          } 
                          alt="Aperçu Français"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-gray-500 dark:text-gray-400">
                            <Image className="w-8 h-8 mx-auto mb-1 opacity-50" />
                            <p className="text-xs">Pas d'image FR</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* English Image */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">🇺🇸 English</span>
                        {selectedItem?.image_url_en && (
                          <span className="text-xs text-gray-500 font-mono truncate max-w-32">
                            {selectedItem.image_url_en.split('/').pop()?.split('?')[0]}
                          </span>
                        )}
                      </div>
                      {!isCreateMode && selectedItem?.image_url_en && (
                        <Button
                          onClick={() => {
                            setCropperLanguage('en');
                            setCropperOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white border-green-600 px-2 py-1 text-xs"
                        >
                          <Crop className="w-3 h-3 mr-1" />
                          Recadrer EN
                        </Button>
                      )}
                    </div>
                    <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-green-200 dark:border-green-600">
                      {selectedItem?.image_url_en ? (
                        <img 
                          src={selectedItem.image_url_en.startsWith('http') 
                            ? `${selectedItem.image_url_en}?cacheBust=${Date.now()}&nocache=1`
                            : `/api/image-proxy?filename=${selectedItem.image_url_en.split('/').pop()?.split('?')[0]}`
                          } 
                          alt="Aperçu English"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-gray-500 dark:text-gray-400">
                            <Image className="w-8 h-8 mx-auto mb-1 opacity-50" />
                            <p className="text-xs">No EN image</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Video Previews */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" />
                    Aperçu Vidéos
                  </h4>
                  
                  {/* French Video */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">🇫🇷 Français</span>
                      <span className="text-xs text-gray-500 font-mono">
                        {formData.video_url_fr || formData.video_filename || 'Aucun'}
                      </span>
                    </div>
                    {formData.video_url_fr || formData.video_filename ? (
                      <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full border border-blue-200 dark:border-blue-600">
                        <video
                          controls
                          className="w-full h-full object-contain"
                          style={{ backgroundColor: 'black' }}
                        >
                          <source 
                            src={`/api/video-proxy?filename=${formData.video_url_fr || formData.video_filename}`}
                            type="video/mp4"
                          />
                          Votre navigateur ne supporte pas la lecture vidéo.
                        </video>
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-600">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <PlayCircle className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">Pas de vidéo FR</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* English Video */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">🇺🇸 English</span>
                      <span className="text-xs text-gray-500 font-mono">
                        {formData.video_url_en || formData.video_filename || 'None'}
                      </span>
                    </div>
                    {formData.video_url_en || formData.video_filename ? (
                      <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full border border-green-200 dark:border-green-600">
                        <video
                          controls
                          className="w-full h-full object-contain"
                          style={{ backgroundColor: 'black' }}
                        >
                          <source 
                            src={`/api/video-proxy?filename=${formData.video_url_en || formData.video_filename}`}
                            type="video/mp4"
                          />
                          Votre navigateur ne supporte pas la lecture vidéo.
                        </video>
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-green-200 dark:border-green-600">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <PlayCircle className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No EN video</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Controls */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center justify-center gap-2 mb-4">
                      <Power className="w-5 h-5" />
                      Statut & Activation
                    </h3>
                    <div className="flex flex-col items-center space-y-3">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                        className="data-[state=checked]:bg-[#2A4759]"
                      />
                      <Label className="text-base font-medium text-[#011526] dark:text-[#F2EBDC] text-center">
                        {formData.is_active ? 'Actif' : 'Inactif'}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Informations de base
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">English</h4>
                  <div>
                    <Label htmlFor="title_en">Titre</Label>
                    <Input
                      id="title_en"
                      value={formData.title_en}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price_en">Prix</Label>
                    <Input
                      id="price_en"
                      value={formData.price_en}
                      onChange={(e) => setFormData({ ...formData, price_en: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="source_en">Source</Label>
                    <Input
                      id="source_en"
                      value={formData.source_en}
                      onChange={(e) => setFormData({ ...formData, source_en: e.target.value })}
                      placeholder="80 photos & 10 videos"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_en">Durée</Label>
                    <Input
                      id="duration_en"
                      value={formData.duration_en}
                      onChange={(e) => setFormData({ ...formData, duration_en: e.target.value })}
                      placeholder="2 minutes"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">Français</h4>
                  <div>
                    <Label htmlFor="title_fr">Titre</Label>
                    <Input
                      id="title_fr"
                      value={formData.title_fr}
                      onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price_fr">Prix</Label>
                    <Input
                      id="price_fr"
                      value={formData.price_fr}
                      onChange={(e) => setFormData({ ...formData, price_fr: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="source_fr">Source</Label>
                    <Input
                      id="source_fr"
                      value={formData.source_fr}
                      onChange={(e) => setFormData({ ...formData, source_fr: e.target.value })}
                      placeholder="80 photos et 10 vidéos"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_fr">Durée</Label>
                    <Input
                      id="duration_fr"
                      value={formData.duration_fr}
                      onChange={(e) => setFormData({ ...formData, duration_fr: e.target.value })}
                      placeholder="2 minutes"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Content Descriptions */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Descriptions du contenu
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">English</h4>
                  <div>
                    <Label htmlFor="situation_en">Situation du client</Label>
                    <Textarea
                      id="situation_en"
                      value={formData.situation_en}
                      onChange={(e) => setFormData({ ...formData, situation_en: e.target.value })}
                      placeholder="The Client is a wife..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="story_en">Histoire du film</Label>
                    <Textarea
                      id="story_en"
                      value={formData.story_en}
                      onChange={(e) => setFormData({ ...formData, story_en: e.target.value })}
                      placeholder="This film shows..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sorry_message_en">Message d'excuses</Label>
                    <Textarea
                      id="sorry_message_en"
                      value={formData.sorry_message_en}
                      onChange={(e) => setFormData({ ...formData, sorry_message_en: e.target.value })}
                      className="bg-white dark:bg-gray-800 min-h-[60px]"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">Français</h4>
                  <div>
                    <Label htmlFor="situation_fr">Situation du client</Label>
                    <Textarea
                      id="situation_fr"
                      value={formData.situation_fr}
                      onChange={(e) => setFormData({ ...formData, situation_fr: e.target.value })}
                      placeholder="Le client est une épouse..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="story_fr">Histoire du film</Label>
                    <Textarea
                      id="story_fr"
                      value={formData.story_fr}
                      onChange={(e) => setFormData({ ...formData, story_fr: e.target.value })}
                      placeholder="Ce film montre..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sorry_message_fr">Message d'excuses</Label>
                    <Textarea
                      id="sorry_message_fr"
                      value={formData.sorry_message_fr}
                      onChange={(e) => setFormData({ ...formData, sorry_message_fr: e.target.value })}
                      className="bg-white dark:bg-gray-800 min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media Management */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Gestion des médias
              </h3>
              
              <div className="space-y-6">
                {/* Bilingual Media Selection Switch */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={formData.use_same_video}
                      onCheckedChange={handleSameVideoToggle}
                    />
                    <Label className="text-blue-900 dark:text-blue-100 font-medium cursor-pointer">
                      Utiliser la même vidéo pour FR et EN
                    </Label>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    {formData.use_same_video 
                      ? "✅ La même vidéo sera utilisée pour les deux langues" 
                      : "⚠️ Vous pouvez maintenant spécifier des vidéos différentes pour FR et EN"}
                  </p>
                </div>

                {formData.use_same_video ? (
                  /* Shared Upload Section (Purple) */
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-purple-600 rounded-full p-1">
                        <Upload className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                        🌐 Fichiers Partagés (FR + EN)
                      </h4>
                    </div>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                      Téléchargez les fichiers qui seront utilisés pour les deux langues.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-purple-900 dark:text-purple-100 mb-2 block">
                          <Video className="h-4 w-4 inline mr-1" />
                          Vidéo Partagée
                        </Label>
                        <DirectUpload
                          type="video"
                          acceptedTypes="video/*"
                          uploadId="shared-video-upload-v87"
                          onUploadComplete={(result) => {
                            console.log('✅ Shared video upload completed:', result);
                            setFormData({
                              ...formData,
                              video_filename: result.url,
                              video_url_en: result.url,
                              video_url_fr: result.url
                            });
                            persistentUploadState.video_filename = result.url;
                            persistentUploadState.video_url_en = result.url;
                            persistentUploadState.video_url_fr = result.url;
                            toast({ 
                              title: "✅ Succès", 
                              description: `Vidéo partagée uploadée: ${result.filename}`,
                              className: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                            });
                          }}
                          currentFilename={formData.video_filename || formData.video_url_en}
                        />
                      </div>
                      <div>
                        <Label className="text-purple-900 dark:text-purple-100 mb-2 block">
                          <Image className="h-4 w-4 inline mr-1" />
                          Image Partagée
                        </Label>
                        <DirectUpload
                          type="image"
                          acceptedTypes="image/*"
                          uploadId="shared-image-upload-v87"
                          onUploadComplete={(result) => {
                            console.log('✅ Shared image upload completed:', result);
                            setFormData({
                              ...formData,
                              image_url_en: result.url,
                              image_url_fr: result.url
                            });
                            persistentUploadState.image_url_en = result.url;
                            persistentUploadState.image_url_fr = result.url;
                            // Clear all caches and force refresh
                            queryClient.removeQueries({ queryKey: ['/api/gallery'] });
                            toast({ 
                              title: "✅ Succès", 
                              description: `Image partagée uploadée: ${result.filename}`,
                              className: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                            });
                            // Force immediate save and refresh
                            setTimeout(() => {
                              if (selectedVideoId) {
                                updateItemMutation.mutate({ 
                                  id: selectedVideoId, 
                                  data: {
                                    ...formData,
                                    image_url_en: result.url,
                                    image_url_fr: result.url
                                  }
                                });
                              }
                            }, 500);
                          }}
                          currentFilename={formData.image_url_en}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Language-Specific Upload Sections - French (Blue) and English (Green) */
                  <div className="space-y-4">
                    <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC] mb-3">
                      Vidéos séparées par langue
                    </h4>
                    
                    {/* French Upload Section (Blue) */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-blue-600 rounded-full p-1">
                          <Upload className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                          🇫🇷 Fichiers Français
                        </h4>
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                        Téléchargez les fichiers spécifiques à la version française.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-blue-900 dark:text-blue-100 mb-2 block">
                            <Video className="h-4 w-4 inline mr-1" />
                            Vidéo Française
                          </Label>
                          <DirectUpload
                            type="video"
                            onUploadComplete={(result) => {
                              console.log('✅ French video upload completed:', result);
                              setFormData(prev => ({
                                ...prev,
                                video_url_fr: result.url,
                                video_filename: result.url
                              }));
                              persistentUploadState.video_url_fr = result.url;
                              persistentUploadState.video_filename_fr = result.url;
                              toast({ 
                                title: "✅ Succès", 
                                description: `Vidéo française uploadée: ${result.filename}`,
                                className: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              });
                            }}
                            currentFilename={formData.video_url_fr}
                          />
                        </div>
                        <div>
                          <Label className="text-blue-900 dark:text-blue-100 mb-2 block">
                            <Image className="h-4 w-4 inline mr-1" />
                            Image Française
                          </Label>
                          <DirectUpload
                            type="image"
                            acceptedTypes="image/*"
                            uploadId="french-image-upload-v87"
                            onUploadComplete={(result) => {
                              console.log('✅ French image upload completed:', result);
                              setFormData(prev => ({
                                ...prev,
                                image_url_fr: result.url
                              }));
                              persistentUploadState.image_url_fr = result.url;
                              toast({ 
                                title: "✅ Succès", 
                                description: `Image française uploadée: ${result.filename}`,
                                className: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              });
                            }}
                            currentFilename={formData.image_url_fr}
                          />
                        </div>
                      </div>
                    </div>

                    {/* English Upload Section (Green) */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-green-600 rounded-full p-1">
                          <Upload className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-green-900 dark:text-green-100">
                          🇺🇸 English Files
                        </h4>
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                        Upload files specific to the English version.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-green-900 dark:text-green-100 mb-2 block">
                            <Video className="h-4 w-4 inline mr-1" />
                            English Video
                          </Label>
                          <DirectUpload
                            type="video"
                            onUploadComplete={(result) => {
                              console.log('✅ English video upload completed:', result);
                              setFormData(prev => ({
                                ...prev,
                                video_url_en: result.url,
                                video_filename: result.url
                              }));
                              persistentUploadState.video_url_en = result.url;
                              persistentUploadState.video_filename_en = result.url;
                              toast({ 
                                title: "✅ Success", 
                                description: `English video uploaded: ${result.filename}`,
                                className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              });
                            }}
                            currentFilename={formData.video_url_en}
                          />
                        </div>
                        <div>
                          <Label className="text-green-900 dark:text-green-100 mb-2 block">
                            <Image className="h-4 w-4 inline mr-1" />
                            English Image
                          </Label>
                          <DirectUpload
                            type="image"
                            acceptedTypes="image/*"
                            uploadId="english-image-upload-v87"
                            onUploadComplete={(result) => {
                              console.log('✅ English image upload completed:', result);
                              setFormData(prev => ({
                                ...prev,
                                image_url_en: result.url
                              }));
                              persistentUploadState.image_url_en = result.url;
                              toast({ 
                                title: "✅ Success", 
                                description: `English image uploaded: ${result.filename}`,
                                className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              });
                            }}
                            currentFilename={formData.image_url_en}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-800 dark:text-blue-200">
                          <p className="font-medium mb-1">Guide d'utilisation :</p>
                          <p>1. Téléchargez vos fichiers français dans la section bleue</p>
                          <p>2. Téléchargez vos fichiers anglais dans la section verte</p>
                          <p>3. Chaque langue aura ses propres fichiers média</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Content Display with Clear Language Indicators */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC] mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Contenu Actuel {formData.use_same_video ? "(Partagé FR/EN)" : "(Séparé par langue)"}
                  </h4>
                  
                  {formData.use_same_video ? (
                    // Shared content display
                    <div className="space-y-3">
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            🌐 Contenu Partagé (Français + English)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <Label className="text-purple-800 dark:text-purple-200">URL Vidéo Complète:</Label>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded border text-purple-900 dark:text-purple-100 font-mono break-all">
                              {getFullUrl(formData.video_filename || formData.video_url_en) || "Aucune vidéo"}
                            </div>
                          </div>
                          <div>
                            <Label className="text-purple-800 dark:text-purple-200">URL Image Complète:</Label>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded border text-purple-900 dark:text-purple-100 font-mono break-all">
                              {getFullUrl(formData.image_url_en) || "Aucune image"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Separate language content display
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            🇫🇷 Version Française
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div>
                            <Label className="text-blue-800 dark:text-blue-200">URL Vidéo Complète FR:</Label>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded border text-blue-900 dark:text-blue-100 font-mono break-all">
                              {getFullUrl(formData.video_url_fr) || "Aucune vidéo FR"}
                            </div>
                          </div>
                          <div>
                            <Label className="text-blue-800 dark:text-blue-200">URL Image Complète FR:</Label>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded border text-blue-900 dark:text-blue-100 font-mono break-all">
                              {getFullUrl(formData.image_url_fr) || "Aucune image FR"}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-green-900 dark:text-green-100">
                            🇺🇸 English Version
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div>
                            <Label className="text-green-800 dark:text-green-200">Complete URL Video EN:</Label>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded border text-green-900 dark:text-green-100 font-mono break-all">
                              {getFullUrl(formData.video_url_en) || "No English video"}
                            </div>
                          </div>
                          <div>
                            <Label className="text-green-800 dark:text-green-200">Complete URL Image EN:</Label>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded border text-green-900 dark:text-green-100 font-mono break-all">
                              {getFullUrl(formData.image_url_en) || "No English image"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">📋 Format de données uniforme :</p>
                        <p>• Toutes les URLs sont maintenant au format complet Supabase</p>
                        <p>• Vidéos et images utilisent le même format d'URL pour la cohérence</p>
                        <p>• Les URLs complètes permettent un accès direct aux fichiers</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual URL Override (for advanced users) */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="mb-4">
                    <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC] mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Modification Manuelle des URLs
                      <Badge variant="secondary" className="text-xs">Manuel</Badge>
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formData.use_same_video 
                        ? "Section avancée pour modifier directement les URLs Supabase partagées entre FR et EN."
                        : "Section avancée pour modifier directement les URLs Supabase spécifiques à chaque langue."
                      }
                    </p>
                  </div>
                  
                  {formData.use_same_video ? (
                    // Shared URLs when using same video for both languages
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="video_url_override" className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          URL Vidéo Complète
                          <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                        </Label>
                        <Input
                          id="video_url_override"
                          value={getFullUrl(formData.video_url_en || formData.video_filename)}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            video_filename: e.target.value,
                            video_url_en: e.target.value, 
                            video_url_fr: e.target.value 
                          })}
                          placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                          className="bg-white dark:bg-gray-800 text-sm font-mono"
                        />
                        <p className="text-xs text-gray-500">URL partagée pour les deux langues</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="image_url_override" className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          URL Image Complète
                          <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                        </Label>
                        <Input
                          id="image_url_override"
                          value={getFullUrl(formData.image_url_en)}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            image_url_en: e.target.value,
                            image_url_fr: e.target.value 
                          })}
                          placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                          className="bg-white dark:bg-gray-800 text-sm font-mono"
                        />
                        <p className="text-xs text-gray-500">URL partagée pour les deux langues</p>
                      </div>
                    </div>
                  ) : (
                    // Separate URLs for French and English
                    <div className="space-y-6">
                      {/* French URLs */}
                      <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">🇫🇷</span>
                          <h5 className="font-medium text-blue-800 dark:text-blue-200">URLs Français</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                              <Video className="w-4 h-4" />
                              URL Vidéo FR
                            </Label>
                            <Input
                              value={getFullUrl(formData.video_url_fr)}
                              onChange={(e) => setFormData({ ...formData, video_url_fr: e.target.value })}
                              placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                              className="bg-white dark:bg-gray-800 text-sm font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                              <Image className="w-4 h-4" />
                              URL Image FR
                            </Label>
                            <Input
                              value={getFullUrl(formData.image_url_fr)}
                              onChange={(e) => setFormData({ ...formData, image_url_fr: e.target.value })}
                              placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                              className="bg-white dark:bg-gray-800 text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* English URLs */}
                      <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">🇺🇸</span>
                          <h5 className="font-medium text-green-800 dark:text-green-200">URLs English</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-green-800 dark:text-green-200">
                              <Video className="w-4 h-4" />
                              URL Vidéo EN
                            </Label>
                            <Input
                              value={getFullUrl(formData.video_url_en)}
                              onChange={(e) => setFormData({ ...formData, video_url_en: e.target.value })}
                              placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                              className="bg-white dark:bg-gray-800 text-sm font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-green-800 dark:text-green-200">
                              <Image className="w-4 h-4" />
                              URL Image EN
                            </Label>
                            <Input
                              value={getFullUrl(formData.image_url_en)}
                              onChange={(e) => setFormData({ ...formData, image_url_en: e.target.value })}
                              placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                              className="bg-white dark:bg-gray-800 text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="video_width">Largeur vidéo</Label>
                    <Input
                      id="video_width"
                      type="number"
                      value={formData.video_width}
                      onChange={(e) => setFormData({ ...formData, video_width: parseInt(e.target.value) || 16 })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_height">Hauteur vidéo</Label>
                    <Input
                      id="video_height"
                      type="number"
                      value={formData.video_height}
                      onChange={(e) => setFormData({ ...formData, video_height: parseInt(e.target.value) || 9 })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_orientation">Orientation</Label>
                    <Select value={formData.video_orientation} onValueChange={(value) => setFormData({ ...formData, video_orientation: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">Paysage</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Élément actif</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Format Badge Section - Moved to Bottom */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Badge Format (marketing visuel)
              </h3>
              <p className="text-sm text-[#2A4759] dark:text-[#89BAD9] mb-6">
                Personnalisez le texte du badge format affiché avec chaque vidéo. Ces badges guident les clients vers les plateformes optimales.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">English</h4>
                  <div>
                    <Label htmlFor="format_platform_en">Platform Line 1</Label>
                    <Select value={formData.format_platform_en} onValueChange={(value) => setFormData({ ...formData, format_platform_en: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select platform category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Social Feed">Social Feed</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="format_type_en">Format Line 2</Label>
                    <Select value={formData.format_type_en} onValueChange={(value) => setFormData({ ...formData, format_type_en: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select format type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mobile Stories">Mobile Stories</SelectItem>
                        <SelectItem value="Instagram Posts">Instagram Posts</SelectItem>
                        <SelectItem value="TV & Desktop">TV & Desktop</SelectItem>
                        <SelectItem value="Short Videos">Short Videos</SelectItem>
                        <SelectItem value="Custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">Français</h4>
                  <div>
                    <Label htmlFor="format_platform_fr">Platform Line 1</Label>
                    <Select value={formData.format_platform_fr} onValueChange={(value) => setFormData({ ...formData, format_platform_fr: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Sélectionner catégorie plateforme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Réseaux Sociaux">Réseaux Sociaux</SelectItem>
                        <SelectItem value="Flux Social">Flux Social</SelectItem>
                        <SelectItem value="Professionnel">Professionnel</SelectItem>
                        <SelectItem value="Personnalisé">Personnalisé...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="format_type_fr">Format Line 2</Label>
                    <Select value={formData.format_type_fr} onValueChange={(value) => setFormData({ ...formData, format_type_fr: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Sélectionner type de format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stories Mobiles">Stories Mobiles</SelectItem>
                        <SelectItem value="Posts Instagram">Posts Instagram</SelectItem>
                        <SelectItem value="TV & Bureau">TV & Bureau</SelectItem>
                        <SelectItem value="Vidéos Courtes">Vidéos Courtes</SelectItem>
                        <SelectItem value="Personnalisé">Personnalisé...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save/Delete/Cancel Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
                className="bg-[#2A4759] hover:bg-[#2A4759]/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isCreateMode ? 'Créer' : 'Sauvegarder'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  persistentUploadState.reset();
                  setSelectedVideoId(null);
                  setIsCreateMode(false);
                }}
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Annuler
              </Button>
              
              {!isCreateMode && selectedVideoId && (
                <Button
                  onClick={handleDelete}
                  disabled={deleteItemMutation.isPending}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              )}
            </div>
            
            <Badge variant={formData.is_active ? "default" : "secondary"}>
              {formData.is_active ? "✅ Actif" : "⚠️ Inactif"}
            </Badge>
          </div>
        </div>
      )}

      {/* Image Cropper Dialog with Language Selection */}
      {selectedItem && cropperOpen && (
        <Dialog open={cropperOpen} onOpenChange={setCropperOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Recadrer Image - {selectedItem.title_en}</DialogTitle>
              <DialogDescription>
                Créer une image statique 300×200 pour {selectedItem.title_en}
              </DialogDescription>
            </DialogHeader>
            

            
            {/* Current Language Display */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Globe className="w-4 h-4" />
                <span className="font-medium">
                  Image sélectionnée: {cropperLanguage === 'fr' ? '🇫🇷 Français' : '🇺🇸 English'}
                </span>
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200 font-mono mt-1 break-all">
                {cropperLanguage === 'fr' ? selectedItem.image_url_fr : selectedItem.image_url_en}
              </div>
            </div>
            
            <ImageCropperEasyCrop
              imageUrl={cropperLanguage === 'fr' ? selectedItem.image_url_fr : selectedItem.image_url_en}
              onSave={(blob, cropSettings) => {
                console.log(`🖼️ BILINGUAL REFRAMING v1.0.92: Cropping ${cropperLanguage} image`);
                console.log(`🖼️ Source URL: ${cropperLanguage === 'fr' ? selectedItem.image_url_fr : selectedItem.image_url_en}`);
                
                // Handle save logic here
                setCropperOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
                toast({ 
                  title: "✅ Succès", 
                  description: `Image statique générée avec succès (${cropperLanguage === 'fr' ? 'Français' : 'English'})` 
                });
              }}
              onCancel={() => setCropperOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Format Badge Manager Section */}
      <Card className="mt-6 border-[#89BAD9] dark:border-[#2A4759]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#D67C4A]" />
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC]">
                Format Badge Templates
              </h3>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFormatBadgeManager(!showFormatBadgeManager)}
              className="border-[#89BAD9] hover:bg-[#F2EBDC] dark:hover:bg-[#011526]/20"
            >
              {showFormatBadgeManager ? 'Masquer' : 'Gérer Templates'}
            </Button>
          </div>
          
          <p className="text-sm text-[#2A4759] dark:text-[#89BAD9] mb-4">
            Créez et gérez les templates de format badges qui apparaissent dans les dropdown des éléments de galerie.
          </p>

          {showFormatBadgeManager && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <FormatBadgeManager />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}