import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Diagnostic helper: compares the previewed element vs the exported blob
async function logDisplayDiagnostics(previewEl: HTMLElement | null, imageUrl: string) {
  if (!previewEl) {
    console.warn('[Diag] preview element is null');
    return;
  }

  const cs = getComputedStyle(previewEl);
  console.group('[Diag] Image Display Diagnostics');

  // Basic computed style checks
  console.log('mix-blend-mode:', cs.mixBlendMode);
  console.log('opacity:', cs.opacity);
  console.log('filter:', cs.filter);
  console.log('background:', cs.background);
  console.log('has ::before content:', getComputedStyle(previewEl, '::before').content);
  console.log('has ::after content:', getComputedStyle(previewEl, '::after').content);

  // Determine what image the preview is actually showing
  let displayedUrl: string | null = null;
  if (previewEl.tagName === 'IMG') {
    displayedUrl = (previewEl as HTMLImageElement).src;
  } else {
    const bg = cs.backgroundImage;
    if (bg && bg.startsWith('url(')) {
      displayedUrl = bg.slice(4, -1).replace(/["']/g, '');
    }
  }
  console.log('Displayed image URL:', displayedUrl);
  console.log('Expected image URL:', imageUrl);
  if (displayedUrl === imageUrl) {
    console.log('✅ Preview is using the expected image URL.');
  } else {
    console.warn('⚠️ Preview is NOT using the expected image URL (might be showing different source).');
  }

  // Optional: compare average color of displayed vs expected image to detect visual alteration
  const loadImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(`Failed to load image: ${url}`);
      img.src = url;
    });

  try {
    if (displayedUrl) {
      const [displayedImg, expectedImg] = await Promise.all([loadImage(displayedUrl), loadImage(imageUrl)]);
      const avgColor = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = Math.min(50, img.naturalWidth);
        c.height = Math.min(50, img.naturalHeight);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        return { r: r / count, g: g / count, b: b / count };
      };
      const avgDisplayed = avgColor(displayedImg);
      const avgExpected = avgColor(expectedImg);
      console.log('Average RGB of displayed image:', avgDisplayed);
      console.log('Average RGB of expected image:', avgExpected);
      const diff = {
        dr: Math.abs(avgDisplayed.r - avgExpected.r),
        dg: Math.abs(avgDisplayed.g - avgExpected.g),
        db: Math.abs(avgDisplayed.b - avgExpected.b),
      };
      console.log('Average color difference:', diff);
      if (diff.dr > 5 || diff.dg > 5 || diff.db > 5) {
        console.warn('[Diag] Significant average color difference; display may be altered or a different image is shown.');
      } else {
        console.log('[Diag] Displayed image and expected image are similar in average color.');
      }
    }
  } catch (e) {
    console.warn('[Diag] Image comparison failed:', e);
  }

  console.groupEnd();
}

  // Calculate actual displayed image dimensions within object-contain
  const calculateImageDimensions = (imgElement: HTMLImageElement): {width: number, height: number} => {
    const containerWidth = imgElement.offsetWidth;
    const containerHeight = imgElement.offsetHeight;
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    
    if (!naturalWidth || !naturalHeight) return {width: containerWidth, height: containerHeight};
    
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = naturalWidth / naturalHeight;
    
    let displayedWidth: number;
    let displayedHeight: number;
    
    if (imageRatio > containerRatio) {
      // Image is wider than container - width constrained
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imageRatio;
    } else {
      // Image is taller than container - height constrained  
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imageRatio;
    }
    
    console.log(`📊 Calculated dimensions: ${displayedWidth} x ${displayedHeight} (from ${naturalWidth} x ${naturalHeight} in ${containerWidth} x ${containerHeight})`);
    return {width: displayedWidth, height: displayedHeight};
  };




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
  Info,
  RotateCcw
} from "lucide-react";
import SimpleImageCropper from './SimpleImageCropper';
// Force cache bust v1.0.99 - ensure optimized component loads
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
  static_image_url: '',
  static_image_url_en: null as string | null,
  static_image_url_fr: null as string | null,
  reset: () => {
    persistentUploadState.video_url_en = '';
    persistentUploadState.image_url_en = '';
    persistentUploadState.video_url_fr = '';
    persistentUploadState.image_url_fr = '';
    persistentUploadState.video_filename = '';
    persistentUploadState.video_filename_en = '';
    persistentUploadState.video_filename_fr = '';
    persistentUploadState.static_image_url = '';
    persistentUploadState.static_image_url_en = null;
    persistentUploadState.static_image_url_fr = null;
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
  static_image_url: string | null; // Legacy field
  static_image_url_en?: string | null; // English static image
  static_image_url_fr?: string | null; // French static image
  cropSettings?: any; // Auto-crop settings for badge detection
  order_index: number;
  is_active: boolean;
}

export default function GalleryManagementNew() {
  const { toast } = useToast();
  const frImageRef = useRef<HTMLImageElement>(null);
  const enImageRef = useRef<HTMLImageElement>(null);

  // Helper function to convert filename to full URL when displaying with cache-busting
  const getFullUrl = (value: string) => {
    if (!value) return '';
    // If it's already a full URL, return as-is
    if (value.startsWith('http')) return value;
    // If it's just a filename, convert to full Supabase URL
    return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${value}`;
  };

  // Helper function to get thumbnail URL with language-specific reframing support and real-time preview
  const getThumbnailUrl = (item: GalleryItem, language: 'en' | 'fr' = 'en') => {
    if (!item) return '';
    
    // Priority 0: Real-time pending upload preview (highest priority)
    const pendingImageUrl = language === 'fr' ? pendingPreviews.image_url_fr : pendingPreviews.image_url_en;
    if (pendingImageUrl) {
      return pendingImageUrl;
    }
    
    // Priority 1: Language-specific reframed image
    const staticImageUrl = language === 'fr' ? item.static_image_url_fr : item.static_image_url_en;
    if (staticImageUrl) {
      return staticImageUrl;
    }
    
    // Priority 2: Language-specific uploaded image
    const imageUrl = language === 'fr' ? item.image_url_fr : item.image_url_en;
    if (imageUrl) {
      return imageUrl;
    }
    
    // Priority 3: Legacy static image (deprecated)
    if (item.static_image_url) {
      return item.static_image_url;
    }
    
    return '';
  };

  // Helper function to get image with cache-busting - SUPER AGGRESSIVE METHOD
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [formRefreshKey, setFormRefreshKey] = useState(0); // Force form field refresh
  
  const getImageUrlWithCacheBust = (filename: string) => {
    if (!filename) return '';
    // Use cache-busting with multiple parameters + component refresh key
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const componentKey = forceRefreshKey;
    
    if (filename.includes('http')) {
      return `${filename}?bustCache=${timestamp}&version=${random}&refresh=${componentKey}&nocache=1&_=${Date.now()}`;
    }
    return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodeURIComponent(filename)}?bustCache=${timestamp}&version=${random}&refresh=${componentKey}&nocache=1&_=${Date.now()}`;
  };
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState<string | number | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperLanguage, setCropperLanguage] = useState<'en' | 'fr'>('en');
  const [showFormatBadgeManager, setShowFormatBadgeManager] = useState(false);
  
  // Real-time cropping state tracking
  const [activeCroppingState, setActiveCroppingState] = useState<{
    isActive: boolean;
    language: 'en' | 'fr';
    hasChanges: boolean;
  }>({ isActive: false, language: 'en', hasChanges: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Real-time preview state for pending uploads
  const [pendingPreviews, setPendingPreviews] = useState<{
    video_url_en?: string;
    video_url_fr?: string;
    image_url_en?: string;
    image_url_fr?: string;
    video_filename?: string;
    static_image_url?: string;
    static_image_url_en?: string;
    static_image_url_fr?: string;
    cropSettings?: any;
  }>({});




  


  // 🚨 ADMIN CACHE BYPASS v1.0.111 - Force fresh data for admin
  // 🚨 ADMIN CACHE SYNCHRONIZATION FIX v1.0.113 - Fixed admin cache key
  // 🔄 ALT+TAB FIX v1.0.115 - Disabled refetchOnWindowFocus to prevent form reset
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'], // Use same key as public site for cache consistency
    staleTime: 0, // Admin always gets fresh data
    gcTime: 0, // Immediate garbage collection
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: false, // FIXED: Disabled to prevent Alt+Tab scroll reset
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
    static_image_url_en: null as string | null,
    static_image_url_fr: null as string | null,
    cropSettings: null as any,
    is_active: true
  });

  // Update form data when selected item changes - SAFE: Check selectedItem exists first
  useEffect(() => {
    console.log("🔄 FORM SYNC TRIGGER - selectedItem:", selectedItem?.id, "isCreateMode:", isCreateMode);
    if (selectedItem && !isCreateMode) {
      console.log("🔄 UPDATING FORM DATA with price_en:", selectedItem.price_en);
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
        video_url_en: pendingPreviews.video_url_en || persistentUploadState.video_url_en || selectedItem.video_url_en || '',
        video_url_fr: pendingPreviews.video_url_fr || persistentUploadState.video_url_fr || selectedItem.video_url_fr || '',
        video_filename: pendingPreviews.video_filename || persistentUploadState.video_filename || selectedItem.video_filename || '',
        use_same_video: selectedItem.use_same_video !== undefined ? selectedItem.use_same_video : true, // RESTORED: Load bilingual setting
        video_width: selectedItem.video_width || 16,
        video_height: selectedItem.video_height || 9,
        video_orientation: selectedItem.video_orientation || 'landscape',
        image_url_en: pendingPreviews.image_url_en || persistentUploadState.image_url_en || selectedItem.image_url_en || '',
        image_url_fr: pendingPreviews.image_url_fr || persistentUploadState.image_url_fr || selectedItem.image_url_fr || '',
        static_image_url: selectedItem.static_image_url || '',
        static_image_url_en: selectedItem.static_image_url_en || null,
        static_image_url_fr: selectedItem.static_image_url_fr || null,
        cropSettings: selectedItem.cropSettings || null,
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
        static_image_url_en: null as string | null,
        static_image_url_fr: null as string | null,
        cropSettings: null as any,
        is_active: true
      });
      console.log("✅ FORM DATA RESET FOR CREATE MODE");
    }
  }, [selectedItem?.id, isCreateMode]); // Simplified dependencies to avoid undefined access

  // Auto-select first item when data loads OR when selected item no longer exists
  useEffect(() => {
    if (galleryItems.length > 0 && !isCreateMode) {
      // If no item is selected OR the selected item doesn't exist anymore
      if (!selectedVideoId || !galleryItems.find(item => item.id === selectedVideoId)) {
        console.log(`🔄 Auto-selecting first item. Current selection: ${selectedVideoId}, Available items: ${galleryItems.length}`);
        setSelectedVideoId(galleryItems[0].id);
      }
    } else if (galleryItems.length === 0 && !isCreateMode) {
      // No items available, clear selection
      setSelectedVideoId(null);
    }
  }, [galleryItems, selectedVideoId, isCreateMode]);



  // Create/Update mutations
  const createItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gallery', 'POST', data),
    onSuccess: () => {
      toast({ title: "✅ Succès", description: "Élément de galerie créé avec succès" });
      // Invalidate gallery cache
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      persistentUploadState.reset();
      setIsCreateMode(false);
      setPendingPreviews({}); // Clear pending previews after successful save
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
      
      // 🚨 SMART CACHE REFRESH v1.0.114 - Proper cache invalidation
      console.log("🔄 SMART CACHE REFRESH - Invalidating gallery cache only");
      
      // Invalidate only gallery-related queries for immediate refresh
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
      
      // Force complete form refresh by refetching and resetting state
      console.log("🔄 FORCING COMPLETE FORM REFRESH");
      const currentSelectedId = selectedVideoId;
      
      // Simple approach: Just refetch the data and let React handle the updates
      console.log("💰 SIMPLE REFRESH - Just refetching data");
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
      }, 100);
      
      setPendingPreviews({}); // Clear pending previews after successful save
      setForceRefreshKey(prev => prev + 1); // Force image refresh
      
      console.log("✅ SMART CACHE REFRESH COMPLETE - Gallery data will be fresh fetched");
      persistentUploadState.reset();
    },
    onError: (error: any) => {
      toast({ title: "❌ Erreur", description: "Erreur lors de la mise à jour de l'élément", variant: "destructive" });
      console.error('Update error:', error);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string | number) => {
      console.log(`🗑️ FRONTEND: Attempting to delete gallery item with ID: ${id}`);
      console.log(`🗑️ FRONTEND: ID type: ${typeof id}`);
      return apiRequest(`/api/gallery/${id}`, 'DELETE');
    },
    onSuccess: (response: any) => {
      console.log(`✅ FRONTEND: Delete successful - Response:`, response);
      
      // Clear all related caches aggressively
      queryClient.removeQueries({ queryKey: ['/api/gallery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      
      // Reset selected item to first available item
      setSelectedVideoId(null);
      setIsCreateMode(false);
      
      // Show success message based on response
      const message = response?.alreadyDeleted 
        ? "L'élément était déjà supprimé ou n'existait pas"
        : "Élément de galerie supprimé avec succès";
      
      toast({ 
        title: "✅ Succès", 
        description: message,
        className: "bg-emerald-50 border-emerald-200 text-emerald-900"
      });
      
      // Force refetch after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
      }, 100);
    },
    onError: (error: any) => {
      console.error('❌ FRONTEND: Delete error details:', error);
      console.error('❌ FRONTEND: Error message:', error?.message);
      console.error('❌ FRONTEND: Error response:', error?.response);
      
      const errorMessage = error?.message || error?.response?.data?.error || "Erreur inconnue lors de la suppression";
      
      toast({ 
        title: "❌ ERREUR DE SUPPRESSION", 
        description: `Détails: ${errorMessage}`,
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-900 font-medium"
      });
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
      console.log(`🗑️ FRONTEND: handleDelete called with selectedVideoId: ${selectedVideoId}`);
      console.log(`🗑️ FRONTEND: selectedVideoId type: ${typeof selectedVideoId}`);
      
      if (confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
        console.log(`🗑️ FRONTEND: User confirmed deletion, calling mutation...`);
        deleteItemMutation.mutate(selectedVideoId);
      } else {
        console.log(`🗑️ FRONTEND: User cancelled deletion`);
      }
    } else {
      console.log(`🗑️ FRONTEND: Cannot delete - selectedVideoId: ${selectedVideoId}, isCreateMode: ${isCreateMode}`);
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
                    <span>{item.title_en} - {item.title_fr}</span>
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
              {/* Status Controls - At Top */}
              <div className="pb-6 border-b border-gray-200 dark:border-gray-700 mb-8">
                <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center justify-center gap-2 mb-4">
                  <Power className="w-5 h-5" />
                  Statut & Activation
                </h3>
                <div className="flex flex-col items-center space-y-3">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => {
                      // Update form data immediately
                      setFormData({...formData, is_active: checked});
                      
                      // Auto-save the is_active change immediately
                      if (selectedVideoId && !isCreateMode) {
                        console.log('🔄 Auto-saving is_active change:', checked);
                        updateItemMutation.mutate({ 
                          id: selectedVideoId, 
                          data: { is_active: checked } 
                        });
                      }
                    }}
                    className="data-[state=checked]:bg-[#2A4759]"
                  />
                  <Label className="text-base font-medium text-[#011526] dark:text-[#F2EBDC] text-center">
                    {formData.is_active ? 'Actif' : 'Inactif'}
                    {updateItemMutation.isPending && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Sauvegarde...)</span>
                    )}
                  </Label>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                {/* French Row - Hidden when shared mode is enabled */}
                {!formData.use_same_video && (
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                      <Image className="w-5 h-5" />
                      Image Français
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between min-h-[2.5rem]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">🇫🇷 Français</span>

                        </div>
                        {!isCreateMode && selectedItem?.image_url_fr && (
                          <div className="flex gap-1">
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
                            {selectedItem.static_image_url_fr && (
                              <Button
                                onClick={async () => {
                                  try {
                                    const updateData = {
                                      static_image_url_fr: null,
                                      cropSettings: null,
                                      language: 'fr'
                                    };
                                    
                                    await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
                                    
                                    // Refresh both admin and public gallery data
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] }); // Admin cache
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });  // Public cache
                                    
                                    toast({ 
                                      title: "✅ Succès", 
                                      description: "Image française restaurée à l'original" 
                                    });
                                  } catch (error) {
                                    console.error('Error unframing French image:', error);
                                    toast({ 
                                      title: "❌ Erreur", 
                                      description: "Impossible de restaurer l'image française",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 px-2 py-1 text-xs"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Original
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-blue-200 dark:border-blue-600 relative">
                        {(formData.image_url_fr || selectedItem?.image_url_fr) ? (
                          <>
                            <img 
                              src={
                                // Prioritize formData (fresh uploads) over selectedItem (database values)
                                (formData.image_url_fr || selectedItem?.image_url_fr)?.startsWith('http')
                                  ? `${formData.image_url_fr || selectedItem?.image_url_fr}?v=${formData.image_url_fr ? 'new' : 'old'}`
                                  : (selectedItem ? getThumbnailUrl(selectedItem, 'fr') : null) || `/api/image-proxy?filename=${(formData.image_url_fr || selectedItem?.image_url_fr)?.split('/').pop()?.split('?')[0]}`
                              } 
                              alt="Aperçu Français"
                              className="w-full h-full object-contain"
                            />
                            {/* Show different badges for manual vs automatic cropping */}
                            {selectedItem?.static_image_url_fr && 
                             selectedItem.static_image_url_fr !== selectedItem.image_url_fr && 
                             selectedItem.static_image_url_fr !== formData.image_url_fr && (
                              <div className={`absolute top-2 right-2 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                                (selectedItem as any).cropSettings?.method === 'triple-layer-white-bg' 
                                  ? 'bg-emerald-500' 
                                  : 'bg-blue-500'
                              }`}>
                                {(() => {
                                  // Real-time badge: Show current cropping state or saved state
                                  if (activeCroppingState.isActive && activeCroppingState.language === 'fr') {
                                    return activeCroppingState.hasChanges ? '✂️ Recadré FR*' : '✂️ Auto FR';
                                  }
                                  
                                  // FIXED LOGIC: Check formData first (new uploads), then selectedItem (saved data)
                                  const cropSettings = formData.cropSettings || (selectedItem as any).cropSettings;
                                  
                                  // New Sharp auto-cropping (only shows badge if cropping actually occurred)
                                  if (cropSettings?.method === 'sharp-auto-thumbnail' && cropSettings?.cropped === true) {
                                    // In shared mode, show "Auto EN/FR" badge
                                    return formData.use_same_video ? '✂️ Auto EN/FR' : '✂️ Auto FR';
                                  }
                                  
                                  // Manual cropping: only show badge if the user has different original vs static images
                                  // This indicates actual cropping/reframing was performed
                                  if (cropSettings?.method === 'triple-layer-white-bg') {
                                    const hasOriginalImage = selectedItem?.image_url_fr;
                                    const hasStaticImage = selectedItem?.static_image_url_fr;
                                    const imagesDifferent = hasOriginalImage && hasStaticImage && 
                                                          selectedItem.image_url_fr !== selectedItem.static_image_url_fr;
                                    
                                    // Only show "Recadré" if we have different images (actual cropping occurred)
                                    if (imagesDifferent) {
                                      // In shared mode, show "Recadré EN/FR" badge
                                      return formData.use_same_video ? '✂️ Recadré EN/FR' : '✂️ Recadré FR';
                                    }
                                  }
                                  
                                  // No badge for: no cropSettings, no actual cropping, or same image URLs
                                  return '';
                                })()}
                              </div>
                            )}
                          </>
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
                  </div>

                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                      <PlayCircle className="w-5 h-5" />
                      Vidéo Français
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between min-h-[2.5rem]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">🇫🇷 Français</span>

                        </div>
                      </div>
                      {formData.video_url_fr || formData.video_filename ? (
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full border border-blue-200 dark:border-blue-600">
                          <video
                            controls
                            className="w-full h-full object-contain"
                            style={{ backgroundColor: 'black' }}
                          >
                            <source 
                              src={
                                // For new uploads with full URLs, use direct CDN streaming
                                (formData.video_url_fr || formData.video_filename)?.startsWith('http') 
                                  ? (formData.video_url_fr || formData.video_filename)
                                  : `/api/video-proxy?filename=${formData.video_url_fr || formData.video_filename}`
                              }
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
                  </div>
                </div>
                )}

                {/* English Row - Modified header when shared mode is enabled */}
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                      <Image className="w-5 h-5" />
                      {formData.use_same_video ? (
                        <>
                          <span>Image Partagée</span>
                          <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                        </>
                      ) : (
                        "English Image"
                      )}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between min-h-[2.5rem]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">🇺🇸 English</span>

                        </div>
                        {!isCreateMode && selectedItem?.image_url_en && (
                          <div className="flex gap-1">
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
                            {selectedItem.static_image_url_en && (
                              <Button
                                onClick={async () => {
                                  try {
                                    const updateData = {
                                      static_image_url_en: null,
                                      cropSettings: null,
                                      language: 'en'
                                    };
                                    
                                    await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
                                    
                                    // Refresh both admin and public gallery data
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] }); // Admin cache
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });  // Public cache
                                    
                                    toast({ 
                                      title: "✅ Success", 
                                      description: "English image restored to original" 
                                    });
                                  } catch (error) {
                                    console.error('Error unframing English image:', error);
                                    toast({ 
                                      title: "❌ Error", 
                                      description: "Unable to restore English image",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 px-2 py-1 text-xs"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Original
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-green-200 dark:border-green-600 relative">
                        {(formData.image_url_en || selectedItem?.image_url_en) ? (
                          <>
                            <img 
                              src={
                                // Prioritize formData (fresh uploads) over selectedItem (database values)
                                (formData.image_url_en || selectedItem?.image_url_en)?.startsWith('http')
                                  ? `${formData.image_url_en || selectedItem?.image_url_en}?v=${formData.image_url_en ? 'new' : 'old'}`
                                  : (selectedItem ? getThumbnailUrl(selectedItem, 'en') : null) || `/api/image-proxy?filename=${(formData.image_url_en || selectedItem?.image_url_en)?.split('/').pop()?.split('?')[0]}`
                              } 
                              alt="Aperçu English"
                              className="w-full h-full object-contain"
                            />
                            {/* Show different badges for manual vs automatic cropping */}
                            {(selectedItem?.static_image_url_en || selectedItem?.static_image_url) && (
                             (selectedItem?.static_image_url_en && selectedItem.static_image_url_en !== selectedItem.image_url_en) ||
                             (selectedItem?.static_image_url && selectedItem.static_image_url !== selectedItem.image_url_en)
                            ) && (
                              <div className={`absolute top-2 right-2 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                                (selectedItem as any).cropSettings?.method === 'triple-layer-white-bg' 
                                  ? 'bg-emerald-500' 
                                  : 'bg-blue-500'
                              }`}>
                                {(() => {
                                  console.log('🔍 BADGE DEBUG EN - cropSettings:', (selectedItem as any).cropSettings, 'method:', (selectedItem as any).cropSettings?.method);
                                  console.log('🔍 BADGE DEBUG EN - static_image_url_en:', selectedItem?.static_image_url_en);
                                  console.log('🔍 BADGE DEBUG EN - image_url_en:', selectedItem?.image_url_en);
                                  console.log('🔍 BADGE DEBUG EN - formData.use_same_video:', formData.use_same_video);
                                  
                                  // Real-time badge: Show current cropping state or saved state
                                  if (activeCroppingState.isActive && activeCroppingState.language === 'en') {
                                    return activeCroppingState.hasChanges ? '✂️ Recadré EN*' : '✂️ Auto EN';
                                  }
                                  
                                  // FIXED LOGIC: Check formData first (new uploads), then selectedItem (saved data)
                                  const cropSettings = formData.cropSettings || (selectedItem as any).cropSettings;
                                  console.log('🎯 BADGE CROP SETTINGS - formData.cropSettings:', formData.cropSettings);
                                  console.log('🎯 BADGE CROP SETTINGS - selectedItem.cropSettings:', (selectedItem as any).cropSettings);
                                  console.log('🎯 BADGE CROP SETTINGS - final cropSettings:', cropSettings);
                                  
                                  // New Sharp auto-cropping (only shows badge if cropping actually occurred)
                                  if (cropSettings?.method === 'sharp-auto-thumbnail' && cropSettings?.cropped === true) {
                                    // In shared mode, show "Auto EN/FR" badge
                                    return formData.use_same_video ? '✂️ Auto EN/FR' : '✂️ Auto EN';
                                  }
                                  
                                  // Manual cropping: only show badge if the user has different original vs static images
                                  // This indicates actual cropping/reframing was performed
                                  if (cropSettings?.method === 'triple-layer-white-bg') {
                                    const hasOriginalImage = selectedItem?.image_url_en;
                                    const hasStaticImage = selectedItem?.static_image_url_en;
                                    const imagesDifferent = hasOriginalImage && hasStaticImage && 
                                                          selectedItem.image_url_en !== selectedItem.static_image_url_en;
                                    
                                    // Only show "Recadré" if we have different images (actual cropping occurred)
                                    if (imagesDifferent) {
                                      // In shared mode, show "Recadré EN/FR" badge
                                      return formData.use_same_video ? '✂️ Recadré EN/FR' : '✂️ Recadré EN';
                                    }
                                  }
                                  
                                  // No badge for: no cropSettings, no actual cropping, or same image URLs
                                  return '';
                                })()}
                              </div>
                            )}
                          </>
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

                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                      <PlayCircle className="w-5 h-5" />
                      {formData.use_same_video ? (
                        <>
                          <span>Vidéo Partagée</span>
                          <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                        </>
                      ) : (
                        "English Video"
                      )}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between min-h-[2.5rem]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">🇺🇸 English</span>

                        </div>
                      </div>
                      {formData.video_url_en || formData.video_filename ? (
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full border border-green-200 dark:border-green-600">
                          <video
                            controls
                            className="w-full h-full object-contain"
                            style={{ backgroundColor: 'black' }}
                          >
                            <source 
                              src={
                                // For new uploads with full URLs, use direct CDN streaming
                                (formData.video_url_en || formData.video_filename)?.startsWith('http') 
                                  ? (formData.video_url_en || formData.video_filename)
                                  : `/api/video-proxy?filename=${formData.video_url_en || formData.video_filename}`
                              }
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
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    {formData.use_same_video ? (
                      <>
                        English <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">Source pour FR + EN</Badge>
                      </>
                    ) : (
                      "English"
                    )}
                  </h4>
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
                      value={formData.price_en || ''}
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
                
                {/* French Basic Information - Always visible for independent text management */}
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    Français
                    {formData.use_same_video && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">
                        Texte indépendant
                      </Badge>
                    )}
                  </h4>
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
                      value={formData.price_fr || ''}
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
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    {formData.use_same_video ? (
                      <>
                        English <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">Source pour FR + EN</Badge>
                      </>
                    ) : (
                      "English"
                    )}
                  </h4>
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
                
                {/* French Content Descriptions - Always visible for independent text management */}
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    Français
                    {formData.use_same_video && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">
                        Texte indépendant
                      </Badge>
                    )}
                  </h4>
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
                      Utiliser la même vidéo et la même photo pour FR et EN
                    </Label>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    {formData.use_same_video 
                      ? "✅ La même vidéo et la même photo sera utilisée pour les deux langues" 
                      : "⚠️ Vous pouvez maintenant spécifier des vidéos et photos différentes pour FR et EN"}
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
                            // Real-time preview: Update pending state immediately
                            setPendingPreviews(prev => ({
                              ...prev,
                              video_url_en: result.url,
                              video_url_fr: result.url,
                              video_filename: result.url
                            }));
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
                              title: "✅ Preview mise à jour", 
                              description: `Vidéo visible immédiatement: ${result.filename}`,
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
                            
                            // Handle auto-generated thumbnail data
                            const updatedFormData = {
                              ...formData,
                              image_url_en: result.url,
                              image_url_fr: result.url
                            };

                            // If auto-thumbnail was generated, store it
                            if (result.static_image_url) {
                              console.log('🎯 Auto-thumbnail detected, updating static URLs');
                              updatedFormData.static_image_url = result.static_image_url;
                              // In shared mode, both EN and FR get the same static image
                              updatedFormData.static_image_url_en = result.static_image_url;
                              updatedFormData.static_image_url_fr = result.static_image_url;
                              
                              // Store auto-crop settings if available (for badge logic)
                              if (result.auto_crop_settings) {
                                updatedFormData.cropSettings = result.auto_crop_settings;
                                console.log('🎯 Auto-crop settings applied:', result.auto_crop_settings);
                              }
                            }

                            // Real-time preview: Update pending state immediately for instant preview
                            setPendingPreviews(prev => ({
                              ...prev,
                              image_url_en: result.url,
                              image_url_fr: result.url,
                              static_image_url: result.static_image_url || prev.static_image_url,
                              static_image_url_en: result.static_image_url || prev.static_image_url_en,
                              static_image_url_fr: result.static_image_url || prev.static_image_url_fr
                            }));
                            
                            setFormData(updatedFormData);
                            persistentUploadState.image_url_en = result.url;
                            persistentUploadState.image_url_fr = result.url;
                            if (result.static_image_url) {
                              persistentUploadState.static_image_url = result.static_image_url;
                            }
                            
                            const badgeInfo = result.auto_crop_settings ? 
                              (result.auto_crop_settings.cropped ? " (Auto-crop applied)" : " (No crop needed)") : "";
                            
                            toast({ 
                              title: "📸 Aperçu instantané", 
                              description: `Image visible immédiatement: ${result.filename}${badgeInfo}`,
                              className: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                            });
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
                    
                    {/* French Upload Section (Blue) - Hidden when shared mode is enabled */}
                    {!formData.use_same_video && (
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
                              // Real-time preview: Update pending state immediately
                              setPendingPreviews(prev => ({
                                ...prev,
                                video_url_fr: result.url
                              }));
                              setFormData(prev => ({
                                ...prev,
                                video_url_fr: result.url,
                                video_filename: result.url
                              }));
                              persistentUploadState.video_url_fr = result.url;
                              persistentUploadState.video_filename_fr = result.url;
                              toast({ 
                                title: "📹 Aperçu instantané", 
                                description: `Vidéo française visible immédiatement: ${result.filename}`,
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
                              // Real-time preview: Update pending state immediately
                              setPendingPreviews(prev => ({
                                ...prev,
                                image_url_fr: result.url
                              }));
                              setFormData(prev => ({
                                ...prev,
                                image_url_fr: result.url
                              }));
                              persistentUploadState.image_url_fr = result.url;
                              toast({ 
                                title: "📸 Aperçu instantané FR", 
                                description: `Image française visible immédiatement: ${result.filename}`,
                                className: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              });
                            }}
                            currentFilename={formData.image_url_fr}
                          />
                        </div>
                      </div>
                    </div>
                    )}

                    {/* English Upload Section (Green) - Modified header when shared mode is enabled */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-green-600 rounded-full p-1">
                          <Upload className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-green-900 dark:text-green-100">
                          {formData.use_same_video ? (
                            <>
                              🌐 Fichiers Partagés <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">FR + EN</Badge>
                            </>
                          ) : (
                            "🇺🇸 English Files"
                          )}
                        </h4>
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                        {formData.use_same_video ? (
                          "Téléchargez les fichiers qui seront utilisés pour les deux langues (Français et English)."
                        ) : (
                          "Upload files specific to the English version."
                        )}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-green-900 dark:text-green-100 mb-2 block">
                            <Video className="h-4 w-4 inline mr-1" />
                            {formData.use_same_video ? "Vidéo (Partagée FR+EN)" : "English Video"}
                          </Label>
                          <DirectUpload
                            type="video"
                            onUploadComplete={(result) => {
                              console.log('✅ English video upload completed:', result);
                              // Real-time preview: Update pending state immediately
                              setPendingPreviews(prev => ({
                                ...prev,
                                video_url_en: result.url
                              }));
                              setFormData(prev => ({
                                ...prev,
                                video_url_en: result.url,
                                video_filename: result.url
                              }));
                              persistentUploadState.video_url_en = result.url;
                              persistentUploadState.video_filename_en = result.url;
                              toast({ 
                                title: "📹 Instant Preview", 
                                description: `English video visible immediately: ${result.filename}`,
                                className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              });
                            }}
                            currentFilename={formData.video_url_en}
                          />
                        </div>
                        <div>
                          <Label className="text-green-900 dark:text-green-100 mb-2 block">
                            <Image className="h-4 w-4 inline mr-1" />
                            {formData.use_same_video ? "Image (Partagée FR+EN)" : "English Image"}
                          </Label>
                          <DirectUpload
                            type="image"
                            acceptedTypes="image/*"
                            uploadId="english-image-upload-v87"
                            onUploadComplete={(result) => {
                              console.log('✅ English image upload completed:', result);
                              console.log('🎯 Auto-crop settings received:', result.auto_crop_settings);
                              console.log('🎯 Static image URL received:', result.static_image_url);
                              
                              // Real-time preview: Update pending state immediately
                              setPendingPreviews(prev => ({
                                ...prev,
                                image_url_en: result.url
                              }));
                              
                              // Handle auto-crop settings for new uploads
                              if (result.auto_crop_settings && result.static_image_url) {
                                console.log('🎯 Processing auto-crop settings for new upload');
                                setFormData(prev => ({
                                  ...prev,
                                  image_url_en: result.url,
                                  // Set static image URLs based on shared mode
                                  static_image_url_en: formData.use_same_video ? result.static_image_url || null : result.static_image_url || null,
                                  static_image_url_fr: formData.use_same_video ? result.static_image_url || null : prev.static_image_url_fr,
                                  // Store auto-crop settings for badge detection
                                  cropSettings: result.auto_crop_settings
                                }));
                              } else {
                                // No auto-cropping needed (image was already 3:2 ratio)
                                setFormData(prev => ({
                                  ...prev,
                                  image_url_en: result.url,
                                  // Clear static URLs since no cropping was needed
                                  static_image_url_en: null,
                                  static_image_url_fr: formData.use_same_video ? null : prev.static_image_url_fr,
                                  // Clear cropSettings since no cropping occurred
                                  cropSettings: null
                                }));
                              }
                              
                              persistentUploadState.image_url_en = result.url;
                              toast({ 
                                title: "📸 Instant Preview EN", 
                                description: `English image visible immediately: ${result.filename}`,
                                className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              });
                            }}
                            currentFilename={formData.image_url_en}
                          />
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

              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    English <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ml-2">Toujours séparé</Badge>
                  </h4>
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
                
                {/* French Format and Specifications - Always visible */}
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    Français <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-2">Toujours séparé</Badge>
                  </h4>
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
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
            </div>
            
            <SimpleImageCropper
              isOpen={cropperOpen}
              imageUrl={getFullUrl(
                // Priority 1: Latest uploaded image from formData (fresh uploads)
                selectedItem.use_same_video 
                  ? (formData.image_url_en || selectedItem.image_url_en)
                  : (cropperLanguage === 'fr' 
                    ? (formData.image_url_fr || selectedItem.image_url_fr)
                    : (formData.image_url_en || selectedItem.image_url_en))
              )}
              onOpen={() => {
                // Track when cropper opens
                setActiveCroppingState({
                  isActive: true,
                  language: cropperLanguage,
                  hasChanges: false
                });
              }}
              onCropChange={() => {
                // Track when user makes cropping changes
                setActiveCroppingState(prev => ({
                  ...prev,
                  hasChanges: true
                }));
              }}
              onSave={async (blob: Blob, cropSettings: any) => {
                try {
                  // Create FormData for upload
                  const formData = new FormData();
                  const filename = `static_${cropperLanguage}_${Date.now()}.jpg`;
                  formData.append('file', blob, filename);
                  formData.append('language', cropperLanguage);
                  
                  // Upload the cropped image
                  const uploadResponse = await fetch('/api/upload/image', {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (!uploadResponse.ok) {
                    throw new Error(`Upload failed: ${uploadResponse.status}`);
                  }
                  
                  const uploadResult = await uploadResponse.json();
                  
                  // Update the gallery item with the new static image URL
                  // In shared mode, update both language static URLs since they use the same source image
                  const updateData = selectedItem.use_same_video 
                    ? {
                        static_image_url_fr: uploadResult.url,
                        static_image_url_en: uploadResult.url,
                        cropSettings: cropSettings,
                        language: 'shared'
                      }
                    : {
                        [cropperLanguage === 'fr' ? 'static_image_url_fr' : 'static_image_url_en']: uploadResult.url,
                        cropSettings: cropSettings,
                        language: cropperLanguage
                      };
                  
                  console.log('🔍 CROP SETTINGS DEBUG - Saving:', JSON.stringify(cropSettings, null, 2));
                  console.log('🔍 UPDATE DATA DEBUG:', JSON.stringify(updateData, null, 2));
                  
                  const updateResponse = await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
                  console.log('🔍 UPDATE RESPONSE DEBUG:', updateResponse);
                  // Gallery item updated successfully
                  
                  // Close cropper and refresh data
                  setCropperOpen(false);
                  
                  // Reset cropping state after successful save
                  setActiveCroppingState({
                    isActive: false,
                    language: 'en',
                    hasChanges: false
                  });
                  
                  // Invalidate both admin and public gallery caches so changes appear everywhere
                  queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] }); // Admin cache
                  queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });  // Public cache
                  queryClient.removeQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
                  queryClient.removeQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
                  
                  // Force both admin and public component refresh
                  await queryClient.refetchQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
                  await queryClient.refetchQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
                  
                  // Wait for query to complete, then force UI refresh
                  setTimeout(() => {
                    setForceRefreshKey(prev => prev + 1);
                    console.log('🔍 AFTER REFRESH - selectedItem cropSettings:', (selectedItem as any)?.cropSettings);
                  }, 200);
                  
                  toast({ 
                    title: "✅ Succès", 
                    description: selectedItem.use_same_video 
                      ? `Image recadrée sauvegardée avec succès (Partagée FR+EN)`
                      : `Image recadrée sauvegardée avec succès (${cropperLanguage === 'fr' ? 'Français' : 'English'})` 
                  });
                  
                } catch (error) {
                  
                  toast({ 
                    title: "❌ Erreur", 
                    description: `Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                    variant: "destructive"
                  });
                }
              }}
              onCancel={() => {
                setCropperOpen(false);
                // Reset cropping state when closing
                setActiveCroppingState({
                  isActive: false,
                  language: 'en',
                  hasChanges: false
                });
              }}
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