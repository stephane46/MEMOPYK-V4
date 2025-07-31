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
  Info,
  RotateCcw
} from "lucide-react";
import SimpleImageCropper from './SimpleImageCropper';
import DirectUpload from './DirectUpload';

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

// Create consistent image URL with cache-busting for thumbnail previews
const getImageUrlWithCacheBust = (imageUrl: string | undefined): string => {
  if (!imageUrl) return '';
  if (imageUrl.includes('cacheBust')) return imageUrl; // Already has cache-busting
  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}cacheBust=${Date.now()}&nocache=1`;
};

export default function GalleryManagementNew({ key }: { key?: string }) {
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en'>('fr');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Inline cropping states - moved after other state declarations
  const [frCropMode, setFrCropMode] = useState(false);
  const [enCropMode, setEnCropMode] = useState(false);
  const [frCropPosition, setFrCropPosition] = useState({ x: 50, y: 50 });
  const [enCropPosition, setEnCropPosition] = useState({ x: 50, y: 50 });
  const [frIsDragging, setFrIsDragging] = useState(false);
  const [enIsDragging, setEnIsDragging] = useState(false);
  const [frDragStart, setFrDragStart] = useState({ x: 0, y: 0, positionX: 50, positionY: 50 });
  const [enDragStart, setEnDragStart] = useState({ x: 0, y: 0, positionX: 50, positionY: 50 });
  const [frCropSaving, setFrCropSaving] = useState(false);
  const [enCropSaving, setEnCropSaving] = useState(false);

  // Real-time preview system state
  const [pendingPreviews, setPendingPreviews] = useState<{
    video_url_en?: string;
    video_url_fr?: string;
    image_url_en?: string;
    image_url_fr?: string;
    video_filename?: string;
  }>({});

  // Enhanced getThumbnailUrl with pending preview priority
  const getThumbnailUrl = (item: any, language: 'fr' | 'en'): string => {
    console.log(`🔍 ADMIN THUMBNAIL PRIORITY v1.0.109 - Getting ${language.toUpperCase()} thumbnail`);
    
    // Priority 0: Check pending previews first (real-time uploads)
    if (language === 'fr' && pendingPreviews.image_url_fr) {
      console.log('USING PENDING PREVIEW FR:', pendingPreviews.image_url_fr);
      return getImageUrlWithCacheBust(pendingPreviews.image_url_fr);
    }
    if (language === 'en' && pendingPreviews.image_url_en) {
      console.log('USING PENDING PREVIEW EN:', pendingPreviews.image_url_en);
      return getImageUrlWithCacheBust(pendingPreviews.image_url_en);
    }
    
    // Priority 1: Latest uploads (image_url_en/fr) over old crops (static_image_url)
    const latestImageUrl = language === 'fr' ? item.image_url_fr : item.image_url_en;
    const staticImageUrl = language === 'fr' ? item.static_image_url_fr : item.static_image_url_en;
    
    if (latestImageUrl) {
      console.log(`USING LATEST UPLOAD ${language.toUpperCase()}:`, latestImageUrl);
      return getImageUrlWithCacheBust(latestImageUrl);
    }
    
    // Priority 2: Static image (cropped)
    if (staticImageUrl) {
      console.log(`USING STATIC IMAGE ${language.toUpperCase()}:`, staticImageUrl);
      return getImageUrlWithCacheBust(staticImageUrl);
    }
    
    // Priority 3: Fallback to opposite language
    const fallbackImageUrl = language === 'fr' ? item.image_url_en : item.image_url_fr;
    if (fallbackImageUrl) {
      console.log(`USING FALLBACK ${language === 'fr' ? 'EN' : 'FR'}:`, fallbackImageUrl);
      return getImageUrlWithCacheBust(fallbackImageUrl);
    }
    
    console.log(`NO THUMBNAIL FOUND for ${language.toUpperCase()}`);
    return '';
  };

  // Inline canvas generation function (reused from SimpleImageCropper)
  const generateCroppedImage = async (imageUrl: string, position: { x: number; y: number }, language: 'fr' | 'en') => {
    console.log(`🚀 INLINE CROPPER v1.0.111 - Starting canvas generation for ${language.toUpperCase()}`);
    
    // Reuse the exact canvas generation logic from SimpleImageCropper
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    // TRIPLE WHITE BACKGROUND SYSTEM - Nuclear approach
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 200);
    
    // Layer 2: ImageData pixel-level white fill
    const imageData = ctx.createImageData(300, 200);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255;     // Red
      imageData.data[i + 1] = 255; // Green
      imageData.data[i + 2] = 255; // Blue
      imageData.data[i + 3] = 255; // Alpha
    }
    ctx.putImageData(imageData, 0, 0);
    console.log('✅ TRIPLE WHITE BACKGROUND: fillRect + ImageData pixel control applied');
    
    // Load image
    const img = document.createElement('img') as HTMLImageElement;
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
    
    console.log('✅ Image loaded successfully');
    
    // Calculate positioning for cover effect (same logic as SimpleImageCropper)
    const scale = Math.max(300 / img.naturalWidth, 200 / img.naturalHeight);
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;
    
    const offsetX = (scaledWidth - 300) * (-position.x / 100);
    const offsetY = (scaledHeight - 200) * (-position.y / 100);
    
    // Draw the image with proper composite operation
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
    console.log('✅ Image drawn on canvas');
    
    // Export as JPEG with maximum quality
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        console.log('✅ INLINE CROPPER: JPEG blob created:', blob?.size, 'bytes');
        resolve(blob!);
      }, 'image/jpeg', 1.0);
    });

    return blob;
  };

  // Inline save function that reuses existing upload/database update logic
  const saveInlineCrop = async (language: 'fr' | 'en') => {
    if (!selectedItem) return;
    
    const position = language === 'fr' ? frCropPosition : enCropPosition;
    const imageUrl = language === 'fr' ? selectedItem.image_url_fr : selectedItem.image_url_en;
    
    if (!imageUrl) {
      toast({
        title: "Erreur",
        description: `Aucune image ${language === 'fr' ? 'française' : 'anglaise'} disponible pour le recadrage`,
        variant: "destructive"
      });
      return;
    }

    if (language === 'fr') {
      setFrCropSaving(true);
    } else {
      setEnCropSaving(true);
    }

    try {
      console.log(`🚀 INLINE SAVE v1.0.111 - Starting save for ${language.toUpperCase()}`);
      
      // Generate cropped image using canvas
      const blob = await generateCroppedImage(imageUrl, position, language);
      
      // Upload to server using existing endpoint (reuse from SimpleImageCropper)
      const formData = new FormData();
      const timestamp = Date.now();
      const filename = `static_${language}_${timestamp}.jpg`;
      formData.append('file', blob, filename);

      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ Upload successful:', uploadResult);

      // Update database using existing API endpoint
      const updateData = {
        [`static_image_url_${language}`]: uploadResult.url
      };

      const response = await fetch(`/api/gallery/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Database update failed');
      }

      console.log(`✅ Database updated for ${language.toUpperCase()}`);
      
      // Refresh cache and exit crop mode
      queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.111'] });
      
      if (language === 'fr') {
        setFrCropMode(false);
      } else {
        setEnCropMode(false);
      }

      toast({
        title: "Succès",
        description: `Image ${language === 'fr' ? 'française' : 'anglaise'} recadrée et sauvegardée avec succès`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error saving inline crop:', error);
      toast({
        title: "Erreur",
        description: "Échec de la sauvegarde du recadrage",
        variant: "destructive"
      });
    } finally {
      if (language === 'fr') {
        setFrCropSaving(false);
      } else {
        setEnCropSaving(false);
      }
    }
  };

  // Global mouse move handler for smooth dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (frIsDragging) {
        e.preventDefault(); 
        const sensitivity = 0.2; // Reduced sensitivity for smoother control
        const deltaX = (e.clientX - frDragStart.x) * sensitivity;
        const deltaY = (e.clientY - frDragStart.y) * sensitivity;
        
        const newX = Math.max(0, Math.min(100, frDragStart.positionX + deltaX));
        const newY = Math.max(0, Math.min(100, frDragStart.positionY + deltaY));
        
        setFrCropPosition({ x: newX, y: newY });
      }
      
      if (enIsDragging) {
        e.preventDefault();
        const sensitivity = 0.2;
        const deltaX = (e.clientX - enDragStart.x) * sensitivity;
        const deltaY = (e.clientY - enDragStart.y) * sensitivity;
        
        const newX = Math.max(0, Math.min(100, enDragStart.positionX + deltaX));
        const newY = Math.max(0, Math.min(100, enDragStart.positionY + deltaY));
        
        setEnCropPosition({ x: newX, y: newY });
      }
    };

    const handleGlobalMouseUp = () => {
      setFrIsDragging(false);
      setEnIsDragging(false);
    };

    if (frIsDragging || enIsDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [frIsDragging, enIsDragging, frDragStart, enDragStart]);

  // Form management states
  const [formData, setFormData] = useState({
    title_fr: '',
    title_en: '',
    description_fr: '',
    description_en: '',
    video_url_fr: '',
    video_url_en: '',
    image_url_fr: '',
    image_url_en: '',
    video_filename: '',
    order_index: 0,
    is_active: true,
    use_same_video: true,
    format_platform_fr: '',
    format_type_fr: '',
    format_platform_en: '',
    format_type_en: ''
  });

  // Fetch gallery items
  const { data: galleryItems, isLoading: galleryLoading } = useQuery({
    queryKey: ['/api/gallery', 'v1.0.111'],
    queryFn: async () => {
      const response = await apiRequest('/api/gallery', 'GET');
      console.log('🔍 ADMIN GALLERY FETCH v1.0.112 - Raw response:', response);
      // If response is already parsed data, return it
      if (Array.isArray(response)) {
        console.log('✅ Response is already array:', response.length);
        return response;
      }
      // If response is a Response object, parse it
      if (response && typeof response.json === 'function') {
        const data = await response.json();
        console.log('✅ Parsed response data:', data);
        return Array.isArray(data) ? data : [];
      }
      console.log('⚠️ Unexpected response format, returning empty array');
      return [];
    },
  });

  // Create mutation  
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gallery', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.111'] });
      setIsCreateMode(false);
      resetForm();
      setPendingPreviews({}); // Clear pending previews after successful save
      toast({ title: "Succès", description: "Élément créé avec succès" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/gallery/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.111'] });
      setSelectedItem(null);
      resetForm();
      setPendingPreviews({}); // Clear pending previews after successful save
      toast({ title: "Succès", description: "Élément mis à jour avec succès" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/gallery/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.111'] });
      toast({ title: "Succès", description: "Élément supprimé avec succès" });
    }
  });

  // Reset form function
  const resetForm = () => {
    setFormData({
      title_fr: '',
      title_en: '',
      description_fr: '',
      description_en: '',
      video_url_fr: '',
      video_url_en: '',
      image_url_fr: '',
      image_url_en: '',
      video_filename: '',
      order_index: 0,
      is_active: true,
      use_same_video: true,
      format_platform_fr: '',
      format_type_fr: '',
      format_platform_en: '',
      format_type_en: ''
    });
    persistentUploadState.reset();
    setSelectedItem(null);
    setIsCreateMode(false);
  };

  // Initialize form data when editing
  useEffect(() => {
    if (selectedItem && !isCreateMode) {
      setFormData({
        title_fr: selectedItem.title_fr || '',  
        title_en: selectedItem.title_en || '',
        description_fr: selectedItem.description_fr || '',
        description_en: selectedItem.description_en || '',
        video_url_fr: pendingPreviews.video_url_fr || selectedItem.video_url_fr || '',
        video_url_en: pendingPreviews.video_url_en || selectedItem.video_url_en || '',
        image_url_fr: pendingPreviews.image_url_fr || selectedItem.image_url_fr || '',
        image_url_en: pendingPreviews.image_url_en || selectedItem.image_url_en || '',
        video_filename: pendingPreviews.video_filename || selectedItem.video_filename || '',
        order_index: selectedItem.order_index || 0,
        is_active: selectedItem.is_active ?? true,
        use_same_video: selectedItem.use_same_video ?? true,
        format_platform_fr: selectedItem.format_platform_fr || '',
        format_type_fr: selectedItem.format_type_fr || '',
        format_platform_en: selectedItem.format_platform_en || '',
        format_type_en: selectedItem.format_type_en || ''
      });
    } else if (isCreateMode) {
      setFormData(prev => ({
        ...prev,
        video_url_fr: pendingPreviews.video_url_fr || persistentUploadState.video_url_fr || '',
        video_url_en: pendingPreviews.video_url_en || persistentUploadState.video_url_en || '',
        image_url_fr: pendingPreviews.image_url_fr || persistentUploadState.image_url_fr || '',
        image_url_en: pendingPreviews.image_url_en || persistentUploadState.image_url_en || '',
        video_filename: pendingPreviews.video_filename || persistentUploadState.video_filename || ''
      }));
    }
  }, [selectedItem, isCreateMode, pendingPreviews]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      video_url_fr: formData.use_same_video ? formData.video_url_en : formData.video_url_fr,
    };
    
    if (selectedItem && !isCreateMode) {
      updateMutation.mutate({ id: selectedItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (galleryLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#011526] dark:text-white">
          🎬 Gestion de la Galerie
        </h1>
        
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setIsCreateMode(true);
              resetForm();
            }}
            className="bg-[#D67C4A] hover:bg-[#C66A38] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvel Élément
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Item List */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4 text-[#011526] dark:text-white">
              Éléments de la Galerie
            </h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {galleryItems?.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'border-[#D67C4A] bg-[#D67C4A]/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[#D67C4A]/50'
                  }`}
                  onClick={() => {
                    setSelectedItem(item);
                    setIsCreateMode(false);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">
                        {item.title_fr || item.title_en || 'Sans titre'}
                        {item.static_image_url_fr || item.static_image_url_en ? (
                          <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800 text-xs">
                            ✂️ Recadré
                          </Badge>
                        ) : null}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Ordre: {item.order_index}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        item.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(item.id);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!galleryItems || galleryItems.length === 0) && (
                <p className="text-center text-gray-500 py-8">
                  Aucun élément dans la galerie
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Form */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4 text-[#011526] dark:text-white">
              {isCreateMode ? 'Créer un Nouvel Élément' : selectedItem ? 'Modifier l\'Élément' : 'Sélectionner un Élément'}
            </h2>
            
            {(isCreateMode || selectedItem) && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title_fr" className="text-[#011526] dark:text-white">
                        🇫🇷 Titre Français
                      </Label>
                      <Input
                        id="title_fr"
                        value={formData.title_fr}
                        onChange={(e) => setFormData(prev => ({ ...prev, title_fr: e.target.value }))}
                        className="border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="title_en" className="text-[#011526] dark:text-white">
                        🇺🇸 Titre Anglais
                      </Label>
                      <Input
                        id="title_en"
                        value={formData.title_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
                        className="border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description_fr" className="text-[#011526] dark:text-white">
                        🇫🇷 Description Française
                      </Label>
                      <Textarea
                        id="description_fr"
                        value={formData.description_fr}
                        onChange={(e) => setFormData(prev => ({ ...prev, description_fr: e.target.value }))}
                        className="border-gray-300 dark:border-gray-600"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description_en" className="text-[#011526] dark:text-white">
                        🇺🇸 Description Anglaise
                      </Label>
                      <Textarea
                        id="description_en"
                        value={formData.description_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                        className="border-gray-300 dark:border-gray-600"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Video Section */}
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-semibold text-[#011526] dark:text-white flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Configuration Vidéo
                      </h3>
                      
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="use_same_video" className="text-sm text-[#011526] dark:text-white">
                          Même vidéo FR + EN
                        </Label>
                        <Switch
                          id="use_same_video"
                          checked={formData.use_same_video}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_same_video: checked }))}
                        />
                      </div>
                    </div>

                    {formData.use_same_video ? (
                      /* Shared Video Section */
                      <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h4 className="font-medium text-purple-800 dark:text-purple-200 flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          🟣 Fichiers Partagés (FR + EN)
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[#011526] dark:text-white mb-2 block">
                              📹 Upload Vidéo Partagée
                            </Label>
                            <DirectUpload
                              type="video"
                              onUploadComplete={(result) => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  video_url_en: result.url,
                                  video_filename: result.filename 
                                }));
                                setPendingPreviews(prev => ({
                                  ...prev,
                                  video_url_en: result.url,
                                  video_filename: result.filename
                                }));
                                toast({ 
                                  title: "✅ Upload réussi", 
                                  description: "📹 Vidéo partagée FR+EN uploadée avec succès" 
                                });
                              }}
                              acceptedTypes=".mp4,.mov,.avi"
                              uploadId="shared-video"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-[#011526] dark:text-white mb-2 block">
                              🖼️ Upload Image Partagée
                            </Label>
                            <DirectUpload
                              type="image"
                              onUploadComplete={(result) => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  image_url_en: result.url,
                                  image_url_fr: result.url 
                                }));
                                setPendingPreviews(prev => ({
                                  ...prev,
                                  image_url_en: result.url,
                                  image_url_fr: result.url
                                }));
                                toast({ 
                                  title: "✅ Upload réussi", 
                                  description: "📸 Image partagée FR+EN uploadée avec succès" 
                                });
                              }}
                              acceptedTypes=".jpg,.jpeg,.png,.gif"
                              uploadId="shared-image"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Separate Language Sections */
                      <div className="space-y-6">
                        {/* French Section */}
                        <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                            🇫🇷 Fichiers Français
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-[#011526] dark:text-white mb-2 block">
                                📹 Upload Vidéo Française
                              </Label>
                              <DirectUpload
                                type="video"
                                onUploadComplete={(result) => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    video_url_fr: result.url 
                                  }));
                                  setPendingPreviews(prev => ({
                                    ...prev,
                                    video_url_fr: result.url
                                  }));
                                  toast({ 
                                    title: "✅ Upload réussi", 
                                    description: "📹 Vidéo française uploadée avec succès" 
                                  });
                                }}
                                acceptedTypes=".mp4,.mov,.avi"
                                uploadId="french-video"
                              />
                            </div>
                            
                            <div>
                              <Label className="text-[#011526] dark:text-white mb-2 block">
                                🖼️ Upload Image Française
                              </Label>
                              <DirectUpload
                                type="image"
                                onUploadComplete={(result) => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    image_url_fr: result.url 
                                  }));
                                  setPendingPreviews(prev => ({
                                    ...prev,
                                    image_url_fr: result.url
                                  }));
                                  toast({ 
                                    title: "✅ Upload réussi", 
                                    description: "📸 Image française uploadée avec succès" 
                                  });
                                }}
                                acceptedTypes=".jpg,.jpeg,.png,.gif"
                                uploadId="french-image"
                              />
                            </div>
                          </div>
                        </div>

                        {/* English Section */}
                        <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <h4 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                            🇺🇸 English Files
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-[#011526] dark:text-white mb-2 block">
                                📹 Upload English Video
                              </Label>
                              <DirectUpload
                                type="video"
                                onUploadComplete={(result) => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    video_url_en: result.url 
                                  }));
                                  setPendingPreviews(prev => ({
                                    ...prev,
                                    video_url_en: result.url
                                  }));
                                  toast({ 
                                    title: "✅ Upload successful", 
                                    description: "📹 English video uploaded successfully" 
                                  });
                                }}
                                acceptedTypes=".mp4,.mov,.avi"
                                uploadId="english-video"
                              />
                            </div>
                            
                            <div>
                              <Label className="text-[#011526] dark:text-white mb-2 block">
                                🖼️ Upload English Image
                              </Label>
                              <DirectUpload
                                type="image"
                                onUploadComplete={(result) => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    image_url_en: result.url 
                                  }));
                                  setPendingPreviews(prev => ({
                                    ...prev,
                                    image_url_en: result.url
                                  }));
                                  toast({ 
                                    title: "✅ Upload successful", 
                                    description: "📸 English image uploaded successfully" 
                                  });
                                }}
                                acceptedTypes=".jpg,.jpeg,.png,.gif"
                                uploadId="english-image"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Image Preview Section - Only show when editing existing items */}
                {!isCreateMode && selectedItem && (
                  <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-md font-semibold text-[#011526] dark:text-white mb-4 flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        Aperçu des Images
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* French Image Preview */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-blue-600 dark:text-blue-400 font-medium">
                              🇫🇷 Image Française
                            </Label>
                            {selectedItem?.image_url_fr && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    setFrCropMode(true);
                                    setFrCropPosition({ x: 50, y: 50 });
                                  }}
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 text-xs"
                                >
                                  {frCropMode ? 'Annuler' : 'Recadrer FR'}
                                </Button>
                                {selectedItem?.static_image_url_fr && (
                                  <Button
                                    onClick={async () => {
                                      try {
                                        const updateData = {
                                          static_image_url_fr: null,
                                          crop_settings: null,
                                          language: 'fr'
                                        };
                                        
                                        await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
                                        
                                        // Refresh data
                                        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
                                        
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
                            {selectedItem?.image_url_fr ? (
                              <>
                                {frCropMode ? (
                                  // Inline Cropping Mode for French
                                  <div className="w-full h-full relative bg-white flex items-center justify-center">
                                    <div 
                                      className="relative bg-white border-2 border-blue-400"
                                      style={{ width: '300px', height: '200px' }}
                                    >
                                      <div 
                                        className="w-full h-full cursor-move relative overflow-hidden"
                                        style={{
                                          backgroundImage: `url("${selectedItem.image_url_fr.startsWith('http') 
                                            ? selectedItem.image_url_fr
                                            : `/api/image-proxy?filename=${selectedItem.image_url_fr.split('/').pop()?.split('?')[0]}`
                                          }")`,
                                          backgroundSize: 'cover',
                                          backgroundPosition: `${frCropPosition.x}% ${frCropPosition.y}%`,
                                          backgroundRepeat: 'no-repeat'
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setFrIsDragging(true);
                                          setFrDragStart({
                                            x: e.clientX,
                                            y: e.clientY,
                                            positionX: frCropPosition.x,
                                            positionY: frCropPosition.y
                                          });
                                        }}

                                        onMouseUp={() => setFrIsDragging(false)}
                                        onMouseLeave={() => setFrIsDragging(false)}
                                      >
                                        <div className="absolute inset-0 border-2 border-blue-400 border-dashed pointer-events-none" />
                                      </div>
                                      <div className="absolute -top-6 left-0 text-xs text-blue-600 bg-white px-2 py-1 rounded shadow font-medium whitespace-nowrap">
                                        Zone de recadrage 3:2 - Glissez pour positionner
                                      </div>
                                    </div>
                                    
                                    {/* Inline Save/Cancel Controls */}
                                    <div className="absolute bottom-4 right-4 flex gap-2">
                                      <Button
                                        onClick={() => saveInlineCrop('fr')}
                                        disabled={frCropSaving}
                                        size="sm"
                                        className="bg-blue-500 hover:bg-blue-600 text-white"
                                      >
                                        {frCropSaving ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                            Sauvegarde...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-3 h-3 mr-1" />
                                            Sauver
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        onClick={() => setFrCropMode(false)}
                                        size="sm"
                                        variant="outline"
                                        className="border-gray-300"
                                      >
                                        Annuler
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  // Normal Preview Mode for French
                                  <>
                                    <img 
                                      src={getThumbnailUrl(selectedItem, 'fr') || (selectedItem.image_url_fr.startsWith('http') 
                                        ? `${selectedItem.image_url_fr}?cacheBust=${Date.now()}&nocache=1`
                                        : `/api/image-proxy?filename=${selectedItem.image_url_fr.split('/').pop()?.split('?')[0]}`
                                      )} 
                                      alt="Aperçu Français"
                                      className="w-full h-full object-contain"
                                    />
                                    {/* Reframing badge overlay */}
                                    {selectedItem?.static_image_url_fr && (
                                      <div className="absolute top-2 left-2 bg-emerald-500 text-white px-2 py-1 rounded text-xs font-medium">
                                        ✂️ Recadré
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                  <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Aucune image française</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* English Image Preview */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-green-600 dark:text-green-400 font-medium">
                              🇺🇸 English Image
                            </Label>
                            {selectedItem?.image_url_en && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    setEnCropMode(true);
                                    setEnCropPosition({ x: 50, y: 50 });
                                  }}
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs"
                                >
                                  {enCropMode ? 'Cancel' : 'Recadrer EN'}
                                </Button>
                                {selectedItem?.static_image_url_en && (
                                  <Button
                                    onClick={async () => {
                                      try {
                                        const updateData = {
                                          static_image_url_en: null,
                                          crop_settings: null,
                                          language: 'en'
                                        };
                                        
                                        await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
                                        
                                        // Refresh data
                                        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
                                        
                                        toast({ 
                                          title: "✅ Success", 
                                          description: "English image restored to original" 
                                        });
                                      } catch (error) {
                                        console.error('Error unframing English image:', error);
                                        toast({ 
                                          title: "❌ Error", 
                                          description: "Failed to restore English image",
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
                            {selectedItem?.image_url_en ? (
                              <>
                                {enCropMode ? (
                                  // Inline Cropping Mode for English
                                  <div className="w-full h-full relative bg-white flex items-center justify-center">
                                    <div 
                                      className="relative bg-white border-2 border-green-400"
                                      style={{ width: '300px', height: '200px' }}
                                    >
                                      <div 
                                        className="w-full h-full cursor-move relative overflow-hidden"
                                        style={{
                                          backgroundImage: `url("${selectedItem.image_url_en.startsWith('http') 
                                            ? selectedItem.image_url_en
                                            : `/api/image-proxy?filename=${selectedItem.image_url_en.split('/').pop()?.split('?')[0]}`
                                          }")`,
                                          backgroundSize: 'cover',
                                          backgroundPosition: `${enCropPosition.x}% ${enCropPosition.y}%`,
                                          backgroundRepeat: 'no-repeat'
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setEnIsDragging(true);
                                          setEnDragStart({
                                            x: e.clientX,
                                            y: e.clientY,
                                            positionX: enCropPosition.x,
                                            positionY: enCropPosition.y
                                          });
                                        }}

                                        onMouseUp={() => setEnIsDragging(false)}
                                        onMouseLeave={() => setEnIsDragging(false)}
                                      >
                                        <div className="absolute inset-0 border-2 border-green-400 border-dashed pointer-events-none" />
                                      </div>
                                      <div className="absolute -top-6 left-0 text-xs text-green-600 bg-white px-2 py-1 rounded shadow font-medium whitespace-nowrap">
                                        3:2 Crop Area - Drag to Position
                                      </div>
                                    </div>
                                    
                                    {/* Inline Save/Cancel Controls */}
                                    <div className="absolute bottom-4 right-4 flex gap-2">
                                      <Button
                                        onClick={() => saveInlineCrop('en')}
                                        disabled={enCropSaving}
                                        size="sm"
                                        className="bg-green-500 hover:bg-green-600 text-white"
                                      >
                                        {enCropSaving ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-3 h-3 mr-1" />
                                            Save
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        onClick={() => setEnCropMode(false)}
                                        size="sm"
                                        variant="outline"
                                        className="border-gray-300"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  // Normal Preview Mode for English
                                  <>
                                    <img 
                                      src={getThumbnailUrl(selectedItem, 'en') || (selectedItem.image_url_en.startsWith('http') 
                                        ? `${selectedItem.image_url_en}?cacheBust=${Date.now()}&nocache=1`
                                        : `/api/image-proxy?filename=${selectedItem.image_url_en.split('/').pop()?.split('?')[0]}`
                                      )} 
                                      alt="English Preview"
                                      className="w-full h-full object-contain"
                                    />
                                    {/* Reframing badge overlay */}
                                    {selectedItem?.static_image_url_en && (
                                      <div className="absolute top-2 left-2 bg-emerald-500 text-white px-2 py-1 rounded text-xs font-medium">
                                        ✂️ Reframed
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                  <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No English image</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Format Badge Management */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-[#011526] dark:text-white flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Badge Format (marketing visuel)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-blue-600 dark:text-blue-400">🇫🇷 Plateforme Française</Label>
                      <Select value={formData.format_platform_fr} onValueChange={(value) => setFormData(prev => ({ ...prev, format_platform_fr: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner plateforme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reseaux-sociaux">Réseaux Sociaux</SelectItem>
                          <SelectItem value="professionnel">Professionnel</SelectItem>
                          <SelectItem value="tv-desktop">TV & Desktop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 dark:text-green-400">🇺🇸 English Platform</Label>
                      <Select value={formData.format_platform_en} onValueChange={(value) => setFormData(prev => ({ ...prev, format_platform_en: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="social-media">Social Media</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="tv-desktop">TV & Desktop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order_index" className="text-[#011526] dark:text-white">
                      Ordre d'Affichage
                    </Label>
                    <Input
                      id="order_index"
                      type="number"
                      value={formData.order_index}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                      className="border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active" className="text-[#011526] dark:text-white">
                      Élément Actif
                    </Label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4">
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-[#D67C4A] hover:bg-[#C66A38] text-white"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {isCreateMode ? 'Création...' : 'Mise à jour...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isCreateMode ? 'Créer' : 'Mettre à jour'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
            
            {!isCreateMode && !selectedItem && (
              <div className="text-center py-8 text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un élément à modifier ou créez-en un nouveau</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Dialog */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recadrer l'Image</DialogTitle>
            <DialogDescription>
              Ajustez le recadrage pour créer une miniature 300x200 pixels avec arrière-plan blanc.
            </DialogDescription>
          </DialogHeader>
          
          {showCropper && selectedItem && (
            <SimpleImageCropper
              imageUrl={selectedLanguage === 'fr' ? selectedItem.image_url_fr : selectedItem.image_url_en}
              onSave={async (blob) => {
                try {
                  console.log('🚀 CROPPER SAVE v1.0.112 - Starting save process');
                  
                  // Upload cropped image
                  const formData = new FormData();
                  const timestamp = Date.now();
                  const filename = `static_${selectedLanguage}_${timestamp}.jpg`;
                  formData.append('file', blob, filename);

                  const uploadResponse = await fetch('/api/upload/image', {
                    method: 'POST',
                    body: formData
                  });

                  if (!uploadResponse.ok) {
                    throw new Error('Upload failed');
                  }

                  const uploadResult = await uploadResponse.json();
                  console.log('✅ Upload successful:', uploadResult);

                  // Update database
                  const updateData = {
                    [`static_image_url_${selectedLanguage}`]: uploadResult.url
                  };

                  const response = await fetch(`/api/gallery/${selectedItem.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                  });

                  if (!response.ok) {
                    throw new Error('Database update failed');
                  }

                  console.log('✅ Database updated successfully');

                  // Refresh data
                  queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.112'] });
                  
                  setShowCropper(false);
                  toast({
                    title: "✅ Succès",
                    description: `Image ${selectedLanguage === 'fr' ? 'française' : 'anglaise'} recadrée et sauvegardée`
                  });

                } catch (error) {
                  console.error('Cropper save error:', error);
                  toast({
                    title: "❌ Erreur",
                    description: "Échec de la sauvegarde du recadrage",
                    variant: "destructive"
                  });
                }
              }}
              onCancel={() => setShowCropper(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}