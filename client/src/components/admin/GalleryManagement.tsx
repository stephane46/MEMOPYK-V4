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
  Save,
  Crop,
  Download,
  Upload,
  CheckCircle
} from "lucide-react";
import ImageCropperEasyCrop from './ImageCropperEasyCrop';
import DirectUpload from './DirectUpload';

// Module-level persistent state that survives component re-creations
const persistentUploadState = {
  video_url_en: '',
  image_url_en: '',
  video_url_fr: '',
  image_url_fr: '',
  reset: () => {
    persistentUploadState.video_url_en = '';
    persistentUploadState.image_url_en = '';
    persistentUploadState.video_url_fr = '';
    persistentUploadState.image_url_fr = '';
  }
};

interface GalleryItem {
  id: number;
  title_en: string;
  title_fr: string;
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
  video_url_en?: string;
  video_url_fr?: string;
  video_width?: number;
  video_height?: number;
  video_orientation?: string;
  use_same_video?: boolean;
  image_url_en?: string;
  image_url_fr?: string;
  price_en: string;
  price_fr: string;
  alt_text_en: string;
  alt_text_fr: string;
  order_index: number;
  is_active: boolean;
  position_x?: number;
  position_y?: number;
  dimensions_width?: number;
  dimensions_height?: number;
  overlay_position?: string;
  overlay_styles?: string;
  video_format?: string;
  thumbnail_position?: string;
  aspect_ratio?: string;
  static_image_url?: string;
  crop_settings?: any;
  created_at: string;
  updated_at: string;
}

export default function GalleryManagement() {
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState<{ type: 'video' | 'image'; url: string; title: string } | null>(null);
  const [showImageCropper, setShowImageCropper] = useState<{ imageUrl: string; item: GalleryItem } | null>(null);
  // Upload state removed - using DirectUpload components only

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cache management state
  const [cacheStatsRefreshKey, setCacheStatsRefreshKey] = useState(0);

  // Cache stats query
  const { data: cacheStats, refetch: refetchCacheStats } = useQuery({
    queryKey: ['/api/video-cache/stats', cacheStatsRefreshKey],
    staleTime: 1000, // Refresh every second for real-time updates
  });

  // Cache all gallery videos mutation
  const cacheGalleryVideosMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/cache-gallery-videos', 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "✅ Cache des vidéos de galerie",
        description: "Toutes les vidéos de galerie ont été mises en cache avec succès",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      });
      refetchCacheStats();
      setCacheStatsRefreshKey(prev => prev + 1);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erreur de cache",
        description: "Échec de la mise en cache des vidéos de galerie",
        variant: "destructive",
        className: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      });
    }
  });



  // Traditional upload handlers removed - using only DirectUpload system

  // Fetch gallery items
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'],
  });

  // Create gallery item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: Partial<GalleryItem>) => {
      return apiRequest('POST', '/api/gallery', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setShowCreateDialog(false);
      toast({ 
        title: "✅ Succès", 
        description: "Élément de galerie créé avec succès!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la création de l'élément", variant: "destructive" });
    }
  });

  // Update gallery item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GalleryItem> }) => {
      return apiRequest('PATCH', `/api/gallery/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setEditingItem(null);
      toast({ 
        title: "✅ Succès", 
        description: "Élément mis à jour avec succès!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la mise à jour", variant: "destructive" });
    }
  });

  // Reorder gallery item mutation
  const reorderItemMutation = useMutation({
    mutationFn: async ({ id, order_index }: { id: number; order_index: number }) => {
      return apiRequest('PATCH', `/api/gallery/${id}/reorder`, { order_index });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      toast({ 
        title: "✅ Succès", 
        description: "Ordre mis à jour!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec du réordonnancement", variant: "destructive" });
    }
  });

  // Delete gallery item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      toast({ 
        title: "✅ Succès", 
        description: "Élément supprimé avec succès!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la suppression", variant: "destructive" });
    }
  });

  const handleReorder = (item: GalleryItem, direction: 'up' | 'down') => {
    const sortedItems = [...galleryItems].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedItems.findIndex(i => i.id === item.id);
    
    if (direction === 'up' && currentIndex > 0) {
      const newOrder = sortedItems[currentIndex - 1].order_index;
      reorderItemMutation.mutate({ id: item.id, order_index: newOrder });
    } else if (direction === 'down' && currentIndex < sortedItems.length - 1) {
      const newOrder = sortedItems[currentIndex + 1].order_index;
      reorderItemMutation.mutate({ id: item.id, order_index: newOrder });
    }
  };

  const GalleryItemForm = ({ item, onSave, onCancel }: { 
    item?: GalleryItem; 
    onSave: (data: Partial<GalleryItem>) => void; 
    onCancel: () => void; 
  }) => {
    
    // Use module-level persistent state that survives component re-creations
    
    const [formData, setFormData] = useState(() => {
      console.log('🔄 INITIALIZING formData state with item:', item);
      console.log('🔄 Module persistent state during init:', persistentUploadState);
      
      // If we have persistent state from previous uploads, use it
      const hasPersistedUrls = persistentUploadState.video_url_en || persistentUploadState.image_url_en;
      console.log('🔄 Has persisted URLs:', hasPersistedUrls);
      
      return {
        title_en: item?.title_en || '',
        title_fr: item?.title_fr || '',
        source_en: item?.source_en || '',
        source_fr: item?.source_fr || '',
        duration_en: item?.duration_en || '',
        duration_fr: item?.duration_fr || '',
        situation_en: item?.situation_en || '',
        situation_fr: item?.situation_fr || '',
        story_en: item?.story_en || '',
        story_fr: item?.story_fr || '',
        sorry_message_en: item?.sorry_message_en || 'Sorry, we cannot show you the video at this stage',
        sorry_message_fr: item?.sorry_message_fr || 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
        video_url_en: item?.video_url_en || persistentUploadState.video_url_en || '',
        video_url_fr: item?.video_url_fr || persistentUploadState.video_url_fr || '',
        video_width: item?.video_width || 0,
        video_height: item?.video_height || 0,
        video_orientation: item?.video_orientation || 'landscape',
        image_url_en: item?.image_url_en || persistentUploadState.image_url_en || '',
        image_url_fr: item?.image_url_fr || persistentUploadState.image_url_fr || '',
        price_en: item?.price_en || '',
        price_fr: item?.price_fr || '',
        alt_text_en: item?.alt_text_en || '',
        alt_text_fr: item?.alt_text_fr || '',
        order_index: item?.order_index || 999,
        is_active: item?.is_active ?? true,
        use_same_video: item?.use_same_video ?? true
      };
    });

    // Debug: Track formData changes (removed to fix infinite loop)
    // useEffect(() => {
    //   console.log('📊 FormData state changed:', {
    //     video_url_en: formData.video_url_en,
    //     image_url_en: formData.image_url_en,
    //     use_same_video: formData.use_same_video
    //   });
    // }, [formData.video_url_en, formData.image_url_en, formData.use_same_video]);

    // When use_same_video changes, sync the video URLs
    const handleSameVideoToggle = (useSame: boolean) => {
      if (useSame && formData.video_url_en) {
        setFormData(prev => ({ 
          ...prev, 
          use_same_video: useSame,
          video_url_fr: prev.video_url_en
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          use_same_video: useSame
        }));
      }
    };

    return (
      <div className="space-y-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        {/* File Upload Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
          <h4 className="font-semibold mb-3 text-orange-900 dark:text-orange-100 flex items-center gap-2">
            <Video className="h-5 w-5" />
            {item ? '1. Modifier vos fichiers média (optionnel)' : '1. Télécharger vos fichiers média'}
          </h4>
          
          {/* Upload progress removed - DirectUpload components handle their own progress */}
          {/* Current media display section */}
          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
            <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
              📤 Téléchargement uniquement via le système Direct Upload ci-dessous
            </p>
            
            {/* Current Video Display */}
            {formData.video_url_en && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  ✅ Vidéo actuelle:
                </p>
                <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all">
                  {formData.video_url_en}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <video 
                    src={`/api/video-proxy?filename=${encodeURIComponent(formData.video_url_en.split('/').pop() || formData.video_url_en)}`}
                    className="w-20 h-12 object-cover rounded border"
                    muted
                  />
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Dimensions: {formData.video_width} × {formData.video_height}px<br/>
                    Orientation: {formData.video_orientation}
                  </div>
                </div>
              </div>
            )}

            {/* Current Image Display */}
            {formData.image_url_en && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  ✅ Image actuelle:
                </p>
                <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-2">
                  {formData.image_url_en}
                </p>
                <div className="flex items-center gap-2">
                  <img 
                    src={`/api/video-proxy?filename=${encodeURIComponent(formData.image_url_en.split('/').pop() || formData.image_url_en)}`}
                    alt="Current preview"
                    className="w-20 h-12 object-cover rounded border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="text-xs text-green-600 dark:text-green-400">
                    <p className="font-medium">Image de couverture</p>
                    <p>Remplacer via Direct Upload ci-dessous</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Direct Upload for Large Files */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-purple-500 rounded-full p-1">
                <Upload className="h-4 w-4 text-white" />
              </div>
              <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                Téléchargement de Fichiers
              </h4>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
              Téléchargez vos vidéos et images directement. Supporte tous les formats et tailles jusqu'à 5GB.
              Le système contourne automatiquement les limites du serveur.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-purple-900 dark:text-purple-100 mb-2 block">
                  <Video className="h-4 w-4 inline mr-1" />
                  Vidéo (.mp4, .mov, .avi...)
                </Label>
                <DirectUpload
                  bucket="memopyk-gallery"
                  acceptedTypes="video/*"
                  maxSizeMB={5000}
                  uploadId="gallery-video-upload"
                  onUploadComplete={(result) => {
                    console.log('Direct video upload completed:', result);
                    const url = result.url;
                    
                    // Save to module-level persistent state
                    persistentUploadState.video_url_en = url;
                    if (formData.use_same_video) {
                      persistentUploadState.video_url_fr = url;
                    }
                    console.log('💾 Saved direct upload to persistent state:', persistentUploadState);
                    
                    setFormData(prev => {
                      const newData = prev.use_same_video 
                        ? { ...prev, video_url_en: url, video_url_fr: url }
                        : { ...prev, video_url_en: url };
                      console.log('Updated formData with direct upload:', newData);
                      return newData;
                    });
                    
                    toast({
                      title: "✅ Succès",
                      description: "Vidéo téléchargée directement avec succès!",
                      className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    });
                  }}
                  onUploadError={(error) => {
                    console.error('Direct video upload failed:', error);
                    toast({
                      title: "❌ Erreur",
                      description: `Échec du téléchargement direct: ${error}`,
                      variant: "destructive"
                    });
                  }}
                />
              </div>
              
              <div>
                <Label className="text-purple-900 dark:text-purple-100 mb-2 block">
                  <Image className="h-4 w-4 inline mr-1" />
                  Image (.jpg, .png, .gif...)
                </Label>
                <DirectUpload
                  bucket="memopyk-gallery"
                  acceptedTypes="image/*"
                  maxSizeMB={5000}
                  uploadId="gallery-image-upload"
                  onUploadComplete={(result) => {
                    console.log('Direct image upload completed:', result);
                    const url = result.url;
                    
                    // Save to module-level persistent state
                    persistentUploadState.image_url_en = url;
                    persistentUploadState.image_url_fr = url;
                    console.log('💾 Saved direct image upload to persistent state:', persistentUploadState);
                    
                    setFormData(prev => {
                      const newData = { 
                        ...prev, 
                        video_url_en: persistentUploadState.video_url_en || prev.video_url_en,
                        video_url_fr: persistentUploadState.video_url_fr || prev.video_url_fr,
                        image_url_en: url, 
                        image_url_fr: url 
                      };
                      console.log('Updated formData with direct image upload:', newData);
                      return newData;
                    });
                    
                    toast({
                      title: "✅ Succès",
                      description: "Image téléchargée directement avec succès!",
                      className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    });
                  }}
                  onUploadError={(error) => {
                    console.error('Direct image upload failed:', error);
                    toast({
                      title: "❌ Erreur",
                      description: `Échec du téléchargement direct: ${error}`,
                      variant: "destructive"
                    });
                  }}
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Guide d'utilisation :</p>
                  <p>1. Téléchargez d'abord votre vidéo (.mp4, .mov, .avi...)</p>
                  <p>2. Puis téléchargez votre image de couverture (.jpg, .png...)</p>
                  <p>3. Chaque fichier se reset automatiquement après téléchargement</p>
                  <p className="mt-1 font-medium">✨ Supporte jusqu'à 5GB • Contourne les limites serveur</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Same Video Switch */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.use_same_video}
              onCheckedChange={handleSameVideoToggle}
            />
            <Label className="text-blue-900 dark:text-blue-100 font-medium">
              Utiliser la même vidéo pour FR et EN
            </Label>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Activé par défaut - La vidéo sera utilisée dans les deux langues
          </p>
        </div>

        {/* Title Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
            ✍️ 2. Informations de base (obligatoire)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title_en" className="text-gray-700 dark:text-gray-300">Titre (English) *</Label>
              <Input
                id="title_en"
                value={formData.title_en}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                placeholder="Ex: Wedding Memory Film"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="title_fr" className="text-gray-700 dark:text-gray-300">Titre (Français) *</Label>
              <Input
                id="title_fr"
                value={formData.title_fr}
                onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                placeholder="Ex: Film Souvenir de Mariage"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Source Section */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold mb-3 text-purple-900 dark:text-purple-100 flex items-center gap-2">
            📷 3. Source (affiché en overlay sur l'image)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source_en" className="text-gray-700 dark:text-gray-300">Source (English)</Label>
              <Textarea
                id="source_en"
                value={formData.source_en}
                onChange={(e) => setFormData({ ...formData, source_en: e.target.value })}
                placeholder="Ex: 80 photos & 10 videos"
                rows={2}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="source_fr" className="text-gray-700 dark:text-gray-300">Source (Français)</Label>
              <Textarea
                id="source_fr"
                value={formData.source_fr}
                onChange={(e) => setFormData({ ...formData, source_fr: e.target.value })}
                placeholder="Ex: 80 photos et 10 vidéos"
                rows={2}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Duration Section */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold mb-3 text-green-900 dark:text-green-100 flex items-center gap-2">
            🎬 4. Durée (avec icône film)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration_en" className="text-gray-700 dark:text-gray-300">Durée (English) - Quelques mots seulement</Label>
              <Input
                id="duration_en"
                value={formData.duration_en}
                onChange={(e) => setFormData({ ...formData, duration_en: e.target.value })}
                placeholder="Ex: 2 minutes"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="duration_fr" className="text-gray-700 dark:text-gray-300">Durée (Français) - Quelques mots seulement</Label>
              <Input
                id="duration_fr"
                value={formData.duration_fr}
                onChange={(e) => setFormData({ ...formData, duration_fr: e.target.value })}
                placeholder="Ex: 2 minutes"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Situation Section */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold mb-3 text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
            👥 5. Situation (avec icône client)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="situation_en" className="text-gray-700 dark:text-gray-300">Situation (English) - Max 5 lignes</Label>
              <Textarea
                id="situation_en"
                value={formData.situation_en}
                onChange={(e) => setFormData({ ...formData, situation_en: e.target.value })}
                placeholder="Ex: Intimate wedding ceremony in a beautiful garden setting"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="situation_fr" className="text-gray-700 dark:text-gray-300">Situation (Français) - Max 5 lignes</Label>
              <Textarea
                id="situation_fr"
                value={formData.situation_fr}
                onChange={(e) => setFormData({ ...formData, situation_fr: e.target.value })}
                placeholder="Ex: Cérémonie de mariage intime dans un magnifique cadre de jardin"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <h4 className="font-semibold mb-3 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
            📖 6. Histoire (avec icône film)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="story_en" className="text-gray-700 dark:text-gray-300">Histoire (English) - Max 5 lignes</Label>
              <Textarea
                id="story_en"
                value={formData.story_en}
                onChange={(e) => setFormData({ ...formData, story_en: e.target.value })}
                placeholder="Ex: A heartwarming tale of two souls united in love and commitment"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="story_fr" className="text-gray-700 dark:text-gray-300">Histoire (Français) - Max 5 lignes</Label>
              <Textarea
                id="story_fr"
                value={formData.story_fr}
                onChange={(e) => setFormData({ ...formData, story_fr: e.target.value })}
                placeholder="Ex: Une histoire touchante de deux âmes unies par l'amour et l'engagement"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Sorry Message Section - When no video is available */}
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold mb-3 text-red-900 dark:text-red-100 flex items-center gap-2">
            ⚠️ Message d'excuse (quand pas de vidéo)
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            Ce message s'affiche quand l'utilisateur clique sur le bouton blanc (pas de vidéo disponible)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sorry_message_en" className="text-gray-700 dark:text-gray-300">Message d'excuse (English)</Label>
              <Textarea
                id="sorry_message_en"
                value={formData.sorry_message_en}
                onChange={(e) => setFormData({ ...formData, sorry_message_en: e.target.value })}
                placeholder="Ex: Sorry, we cannot show you the video at this stage"
                rows={3}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="sorry_message_fr" className="text-gray-700 dark:text-gray-300">Message d'excuse (Français)</Label>
              <Textarea
                id="sorry_message_fr"
                value={formData.sorry_message_fr}
                onChange={(e) => setFormData({ ...formData, sorry_message_fr: e.target.value })}
                placeholder="Ex: Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
                rows={3}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Video URL Display */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
            🔗 URLs générées automatiquement
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Ces URLs sont remplies automatiquement quand vous téléchargez des fichiers ci-dessus
          </p>
          {formData.use_same_video ? (
            <div>
              <Label htmlFor="video_url_en" className="text-gray-700 dark:text-gray-300">URL Vidéo (utilisée pour FR et EN)</Label>
              <Input
                id="video_url_en"
                value={formData.video_url_en}
                onChange={(e) => {
                  const url = e.target.value;
                  setFormData({ ...formData, video_url_en: url, video_url_fr: url });
                }}
                placeholder="Sera rempli après upload de vidéo..."
                className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="video_url_en" className="text-gray-700 dark:text-gray-300">URL Vidéo (English)</Label>
                <Input
                  id="video_url_en"
                  value={formData.video_url_en}
                  onChange={(e) => setFormData({ ...formData, video_url_en: e.target.value })}
                  placeholder="Sera rempli après upload..."
                  className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="video_url_fr" className="text-gray-700 dark:text-gray-300">URL Vidéo (Français)</Label>
                <Input
                  id="video_url_fr"
                  value={formData.video_url_fr}
                  onChange={(e) => setFormData({ ...formData, video_url_fr: e.target.value })}
                  placeholder="Sera rempli après upload..."
                  className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Video Dimensions Section - CRITICAL for video overlay sizing */}
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold mb-3 text-red-900 dark:text-red-100 flex items-center gap-2">
            📐 3. Dimensions Vidéo (OBLIGATOIRE pour l'affichage)
          </h4>
          <p className="text-sm text-red-800 dark:text-red-200 mb-4">
            ⚠️ Ces dimensions sont critiques pour l'affichage correct dans l'overlay vidéo. Vérifiez les propriétés de votre fichier vidéo.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="video_width" className="text-gray-700 dark:text-gray-300">Largeur (pixels) *</Label>
              <Input
                id="video_width"
                type="number"
                value={formData.video_width}
                onChange={(e) => setFormData({ ...formData, video_width: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 1920"
                min={1}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="video_height" className="text-gray-700 dark:text-gray-300">Hauteur (pixels) *</Label>
              <Input
                id="video_height"
                type="number"
                value={formData.video_height}
                onChange={(e) => setFormData({ ...formData, video_height: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 1080"
                min={1}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="video_orientation" className="text-gray-700 dark:text-gray-300">Orientation (Auto-détectée)</Label>
              <div className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {formData.video_width && formData.video_height 
                  ? (formData.video_width > formData.video_height ? 'Paysage (Landscape)' : 'Portrait')
                  : 'Entrez les dimensions pour voir l\'orientation'
                }
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                L'orientation est calculée automatiquement: largeur &gt; hauteur = paysage, sinon portrait
              </div>
            </div>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300 mt-2">
            💡 Astuce: Clic droit sur votre fichier vidéo → Propriétés → Détails pour voir les dimensions exactes
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price_en" className="text-gray-700 dark:text-gray-300">Prix (English)</Label>
            <Input
              id="price_en"
              value={formData.price_en}
              onChange={(e) => setFormData({ ...formData, price_en: e.target.value })}
              placeholder="$299"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="price_fr" className="text-gray-700 dark:text-gray-300">Prix (Français)</Label>
            <Input
              id="price_fr"
              value={formData.price_fr}
              onChange={(e) => setFormData({ ...formData, price_fr: e.target.value })}
              placeholder="299€"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="alt_text_en" className="text-gray-700 dark:text-gray-300">Texte Alt (English)</Label>
            <Input
              id="alt_text_en"
              value={formData.alt_text_en}
              onChange={(e) => setFormData({ ...formData, alt_text_en: e.target.value })}
              placeholder="Alternative text for accessibility"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="alt_text_fr" className="text-gray-700 dark:text-gray-300">Texte Alt (Français)</Label>
            <Input
              id="alt_text_fr"
              value={formData.alt_text_fr}
              onChange={(e) => setFormData({ ...formData, alt_text_fr: e.target.value })}
              placeholder="Texte alternatif pour l'accessibilité"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            <Label htmlFor="order_index" className="text-gray-700 dark:text-gray-300">Ordre d'affichage</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              min={1}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active" className="text-gray-700 dark:text-gray-300">Actif</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => {
            persistentUploadState.reset();
            console.log('🧹 Cleared module persistent state on cancel');
            onCancel();
          }}>
            Annuler
          </Button>
          <Button 
            onClick={() => {
              // Validate required fields
              if (!formData.title_en || !formData.title_fr) {
                toast({ 
                  title: "Erreur", 
                  description: "Les titres en français et anglais sont obligatoires", 
                  variant: "destructive" 
                });
                return;
              }
              
              // Validate video dimensions if video URL is provided
              if ((formData.video_url_en || formData.video_url_fr) && (!formData.video_width || !formData.video_height)) {
                toast({ 
                  title: "Erreur", 
                  description: "Les dimensions vidéo (largeur, hauteur) sont obligatoires quand une vidéo est fournie", 
                  variant: "destructive" 
                });
                return;
              }
              
              // Auto-calculate orientation based on dimensions
              const finalData = {
                ...formData,
                video_orientation: formData.video_width > formData.video_height ? 'landscape' : 'portrait'
              };
              
              console.log('📐 AUTO-ORIENTATION CALCULATION:', {
                width: formData.video_width,
                height: formData.video_height,
                calculatedOrientation: finalData.video_orientation
              });
              
              onSave(finalData);
              persistentUploadState.reset();
              console.log('🧹 Cleared module persistent state after save');
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement de la galerie...</div>;
  }

  const sortedItems = [...galleryItems].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">


      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Éléments de Galerie</h3>
          <p className="text-sm text-gray-600">Gérez les éléments de votre galerie de films</p>
        </div>
        <div className="flex gap-3">
          {/* Cache Gallery Videos Button */}
          <Button
            onClick={() => cacheGalleryVideosMutation.mutate()}
            disabled={cacheGalleryVideosMutation.isPending}
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
          >
            {cacheGalleryVideosMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Cache Vidéos
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel Élément
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Créer un Nouvel Élément de Galerie</DialogTitle>
              </DialogHeader>
              <GalleryItemForm
                onSave={(data) => createItemMutation.mutate(data)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cache Status Panel - Gallery Videos */}
      {cacheStats && typeof cacheStats === 'object' && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 rounded-full p-2">
                <Download className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Cache Intelligent des Vidéos
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {typeof cacheStats === 'object' && cacheStats && 'fileCount' in cacheStats ? Number(cacheStats.fileCount) : 0} vidéos en cache • {typeof cacheStats === 'object' && cacheStats && 'sizeMB' in cacheStats ? Number(cacheStats.sizeMB) : 0}MB • Chargement ultra-rapide (~50ms)
                </p>
              </div>
            </div>
            <div className="text-xs text-green-700 dark:text-green-300">
              Remplacement intelligent : Gestion automatique du cache
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedItems.map((item, index) => (
          <Card key={item.id} className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Preview - Show static cropped image or original image thumbnail with video overlay icon */}
                <div className="space-y-3">
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden">
                    {(item.static_image_url || item.image_url_en) ? (
                      <div 
                        className="w-full h-full cursor-pointer group relative"
                        onClick={() => {
                          // If has video, show video preview; otherwise show image
                          if (item.video_url_en) {
                            const filename = item.video_url_en!.split('/').pop()!;
                            const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
                            setShowPreview({ type: 'video', url: proxyUrl, title: item.title_en });
                          } else {
                            setShowPreview({ type: 'image', url: item.static_image_url || item.image_url_en!, title: item.title_en });
                          }
                        }}
                      >
                        <img
                          src={item.static_image_url || item.image_url_en!}
                          alt={item.alt_text_en}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn('Image failed to load:', item.static_image_url || item.image_url_en);
                            // If static image fails, try original image
                            if (item.static_image_url && item.image_url_en) {
                              e.currentTarget.src = item.image_url_en;
                            } else {
                              e.currentTarget.style.display = 'none';
                            }
                          }}
                        />
                        
                        {/* Video indicator overlay */}
                        {item.video_url_en && (
                          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            Video
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          {item.video_url_en ? (
                            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                          ) : (
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                          )}
                        </div>
                      </div>
                    ) : item.video_url_en ? (
                      <div 
                        className="w-full h-full cursor-pointer group"
                        onClick={() => {
                          const filename = item.video_url_en!.split('/').pop()!;
                          const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
                          setShowPreview({ type: 'video', url: proxyUrl, title: item.title_en });
                        }}
                      >
                        <video
                          src={`/api/video-proxy?filename=${encodeURIComponent(item.video_url_en!.split('/').pop()!)}`}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Image className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                      {item.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <span className="text-xs text-gray-500">#{item.order_index}</span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="lg:col-span-2 space-y-4">
                  {editingItem?.id === item.id ? (
                    <GalleryItemForm
                      item={item}
                      onSave={(data) => updateItemMutation.mutate({ id: item.id, data })}
                      onCancel={() => setEditingItem(null)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.title_en}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.title_fr}</p>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Source:</p>
                          <p className="mb-1">{item.source_en}</p>
                          <p className="italic">{item.source_fr}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Duration:</p>
                          <p className="mb-1">{item.duration_en}</p>
                          <p className="italic">{item.duration_fr}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-green-600 dark:text-green-400">{item.price_en}</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{item.price_fr}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="lg:col-span-1 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(editingItem?.id === item.id ? null : item)}
                    className="w-full justify-start"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {editingItem?.id === item.id ? "Annuler" : "Modifier"}
                  </Button>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(item, 'up')}
                      disabled={index === 0}
                      className="flex-1"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(item, 'down')}
                      disabled={index === sortedItems.length - 1}
                      className="flex-1"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  

                  
                  {/* Static Image Cropper Button */}
                  {item.image_url_en && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageCropper({ imageUrl: item.image_url_en!, item })}
                      className="w-full justify-start text-memopyk-orange hover:text-memopyk-orange"
                    >
                      <Crop className="h-3 w-3 mr-1" />
                      Recadrer Image (300×200)
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateItemMutation.mutate({ 
                      id: item.id, 
                      data: { is_active: !item.is_active }
                    })}
                    className="w-full justify-start"
                  >
                    {item.is_active ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {item.is_active ? "Masquer" : "Afficher"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
                        deleteItemMutation.mutate(item.id);
                      }
                    }}
                    className="w-full text-red-600 hover:text-red-700 justify-start"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {galleryItems.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucun élément de galerie</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Commencez par créer votre premier élément de galerie.</p>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer le premier élément
          </Button>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">{showPreview.title}</DialogTitle>
            </DialogHeader>
            <div className="aspect-video w-full">
              {showPreview.type === 'video' ? (
                <video
                  src={showPreview.url}
                  controls
                  className="w-full h-full object-cover rounded"
                  autoPlay
                />
              ) : (
                <img
                  src={showPreview.url}
                  alt={showPreview.title}
                  className="w-full h-full object-cover rounded"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Cropper Modal */}
      {showImageCropper && (
        <Dialog open={!!showImageCropper} onOpenChange={() => setShowImageCropper(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                Génération d'Image Statique - {showImageCropper.item?.title_en || 'Article de galerie'}
              </DialogTitle>
              <DialogDescription>
                Glissez pour repositionner l'image et générez une image statique 300×200 pour la galerie.
              </DialogDescription>
            </DialogHeader>
            <ImageCropperEasyCrop
              imageUrl={showImageCropper.imageUrl}
              onSave={async (croppedBlob: Blob, cropSettings: any) => {
                try {
                  // Create form data for upload
                  const formData = new FormData();
                  formData.append('image', croppedBlob, `static_${showImageCropper.item?.id || 'temp'}.jpg`);
                  formData.append('crop_settings', JSON.stringify(cropSettings));
                  formData.append('item_id', showImageCropper.item?.id?.toString() || '');
                  
                  // Upload cropped image
                  const response = await fetch('/api/gallery/upload-static-image', {
                    method: 'POST',
                    body: formData,
                  });
                  
                  const result = await response.json();
                  
                  if (result.success) {
                    toast({ 
                      title: "Succès", 
                      description: "Image statique générée et sauvegardée avec succès!" 
                    });
                    
                    // Close the modal and refresh the data
                    setShowImageCropper(null);
                    
                    // Invalidate all gallery-related queries to refresh the data everywhere
                    await queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
                    await queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
                  } else {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  console.error('Static image generation error:', error);
                  toast({ 
                    title: "Erreur", 
                    description: "Échec de la génération d'image statique", 
                    variant: "destructive" 
                  });
                }
              }}
              onCancel={() => setShowImageCropper(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}