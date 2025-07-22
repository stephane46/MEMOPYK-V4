import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Crop
} from "lucide-react";
import { ImageCropper } from './ImageCropper';

interface GalleryItem {
  id: number;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
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
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // File upload handlers
  const handleVideoUpload = async (file: File | undefined) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      
      const response = await fetch('/api/gallery/upload-video', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      if (result.success) {
        toast({ title: "Succès", description: "Vidéo téléchargée avec succès!" });
        return result.url;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Video upload error:', error);
      toast({ title: "Erreur", description: "Échec du téléchargement de la vidéo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/gallery/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      if (result.success) {
        toast({ title: "Succès", description: "Image téléchargée avec succès!" });
        return result.url;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast({ title: "Erreur", description: "Échec du téléchargement de l'image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

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
      toast({ title: "Succès", description: "Élément de galerie créé avec succès!" });
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
      toast({ title: "Succès", description: "Élément mis à jour avec succès!" });
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
      toast({ title: "Succès", description: "Ordre mis à jour!" });
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
      toast({ title: "Succès", description: "Élément supprimé avec succès!" });
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
    const [formData, setFormData] = useState({
      title_en: item?.title_en || '',
      title_fr: item?.title_fr || '',
      description_en: item?.description_en || '',
      description_fr: item?.description_fr || '',
      video_url_en: item?.video_url_en || '',
      video_url_fr: item?.video_url_fr || '',
      video_width: item?.video_width || 0,
      video_height: item?.video_height || 0,
      video_orientation: item?.video_orientation || 'landscape',
      image_url_en: item?.image_url_en || '',
      image_url_fr: item?.image_url_fr || '',
      price_en: item?.price_en || '',
      price_fr: item?.price_fr || '',
      alt_text_en: item?.alt_text_en || '',
      alt_text_fr: item?.alt_text_fr || '',
      order_index: item?.order_index || galleryItems.length + 1,
      is_active: item?.is_active ?? true,
      use_same_video: item?.use_same_video ?? true
    });

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
            {uploading && <span className="text-sm text-orange-600 dark:text-orange-300">Téléchargement en cours...</span>}
          </h4>
          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
            <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
              📤 Téléchargez vos fichiers ici - les URLs seront automatiquement générées et remplies ci-dessous
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Vidéo de galerie
                </Label>
                
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
                
                <input
                  type="file"
                  accept="video/*"
                  onChange={async (e) => {
                    const url = await handleVideoUpload(e.target.files?.[0]);
                    if (url) {
                      if (formData.use_same_video) {
                        setFormData({ ...formData, video_url_en: url, video_url_fr: url });
                      } else {
                        setFormData({ ...formData, video_url_en: url });
                      }
                    }
                  }}
                  disabled={uploading}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.video_url_en ? 'Remplacer la vidéo (MP4, WebM, MOV - max 500MB)' : 'MP4, WebM, MOV (max 500MB)'}
                </p>
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  Image de couverture
                </Label>
                
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
                      <button
                        type="button"
                        onClick={() => setShowImageCropper(formData.image_url_en)}
                        className="text-xs text-memopyk-orange hover:underline"
                      >
                        Recadrer Image (300×200)
                      </button>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const url = await handleImageUpload(e.target.files?.[0]);
                    if (url) {
                      setFormData({ ...formData, image_url_en: url, image_url_fr: url });
                    }
                  }}
                  disabled={uploading}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.image_url_en ? 'Remplacer l\'image (JPG, PNG, WebP - max 50MB)' : 'JPG, PNG, WebP (max 50MB)'}
                </p>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="description_en" className="text-gray-700 dark:text-gray-300">Description (English)</Label>
            <Textarea
              id="description_en"
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              placeholder="Description in English"
              rows={3}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="description_fr" className="text-gray-700 dark:text-gray-300">Description (Français)</Label>
            <Textarea
              id="description_fr"
              value={formData.description_fr}
              onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
              placeholder="Description en français"
              rows={3}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
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
              <Label htmlFor="video_orientation" className="text-gray-700 dark:text-gray-300">Orientation *</Label>
              <select
                id="video_orientation"
                value={formData.video_orientation}
                onChange={(e) => setFormData({ ...formData, video_orientation: e.target.value })}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="landscape">Paysage (Landscape)</option>
                <option value="portrait">Portrait</option>
              </select>
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
          <Button variant="outline" onClick={onCancel}>
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
              if ((formData.video_url_en || formData.video_url_fr) && (!formData.video_width || !formData.video_height || !formData.video_orientation)) {
                toast({ 
                  title: "Erreur", 
                  description: "Les dimensions vidéo (largeur, hauteur, orientation) sont obligatoires quand une vidéo est fournie", 
                  variant: "destructive" 
                });
                return;
              }
              
              onSave(formData);
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

      <div className="space-y-4">
        {sortedItems.map((item, index) => (
          <Card key={item.id} className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Preview */}
                <div className="space-y-3">
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden">
                    {item.video_url_en ? (
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
                    ) : item.image_url_en ? (
                      <div 
                        className="w-full h-full cursor-pointer group"
                        onClick={() => setShowPreview({ type: 'image', url: item.image_url_en!, title: item.title_en })}
                      >
                        <img
                          src={item.image_url_en}
                          alt={item.alt_text_en}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
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
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p className="mb-1">{item.description_en}</p>
                        <p className="italic">{item.description_fr}</p>
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
            </DialogHeader>
            <ImageCropper
              imageUrl={showImageCropper.imageUrl}
              onSave={async (croppedBlob, cropSettings) => {
                try {
                  // Create form data for upload
                  const formData = new FormData();
                  formData.append('image', croppedBlob, `static_${showImageCropper.item?.id || 'temp'}.jpg`);
                  formData.append('crop_settings', JSON.stringify(cropSettings));
                  formData.append('item_id', (showImageCropper.item?.id || 0).toString());
                  
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
                    
                    // Update the item with the static image URL and settings
                    updateItemMutation.mutate({
                      id: showImageCropper.item?.id || 0,
                      data: {
                        static_image_url: result.url,
                        crop_settings: cropSettings
                      }
                    });
                    
                    setShowImageCropper(null);
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
              initialSettings={showImageCropper.item?.crop_settings}
              targetWidth={300}
              targetHeight={200}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}