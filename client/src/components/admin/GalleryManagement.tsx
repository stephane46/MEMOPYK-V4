import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowUp, 
  ArrowDown, 
  Play, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Image,
  Video,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GalleryItem {
  id: number;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  video_url_en?: string;
  video_url_fr?: string;
  image_url_en?: string;
  image_url_fr?: string;
  price_en: string;
  price_fr: string;
  alt_text_en: string;
  alt_text_fr: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function GalleryManagement() {
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState<{ type: 'video' | 'image'; url: string; title: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      image_url_en: item?.image_url_en || '',
      image_url_fr: item?.image_url_fr || '',
      price_en: item?.price_en || '',
      price_fr: item?.price_fr || '',
      alt_text_en: item?.alt_text_en || '',
      alt_text_fr: item?.alt_text_fr || '',
      order_index: item?.order_index || galleryItems.length + 1,
      is_active: item?.is_active ?? true
    });

    return (
      <div className="space-y-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title_en" className="text-gray-700 dark:text-gray-300">Titre (English)</Label>
            <Input
              id="title_en"
              value={formData.title_en}
              onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
              placeholder="Title in English"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="title_fr" className="text-gray-700 dark:text-gray-300">Titre (Français)</Label>
            <Input
              id="title_fr"
              value={formData.title_fr}
              onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
              placeholder="Titre en français"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="video_url_en" className="text-gray-700 dark:text-gray-300">URL Vidéo (English)</Label>
            <Input
              id="video_url_en"
              value={formData.video_url_en}
              onChange={(e) => setFormData({ ...formData, video_url_en: e.target.value })}
              placeholder="https://..."
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="video_url_fr" className="text-gray-700 dark:text-gray-300">URL Vidéo (Français)</Label>
            <Input
              id="video_url_fr"
              value={formData.video_url_fr}
              onChange={(e) => setFormData({ ...formData, video_url_fr: e.target.value })}
              placeholder="https://..."
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="image_url_en" className="text-gray-700 dark:text-gray-300">URL Image (English)</Label>
            <Input
              id="image_url_en"
              value={formData.image_url_en}
              onChange={(e) => setFormData({ ...formData, image_url_en: e.target.value })}
              placeholder="https://..."
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="image_url_fr" className="text-gray-700 dark:text-gray-300">URL Image (Français)</Label>
            <Input
              id="image_url_fr"
              value={formData.image_url_fr}
              onChange={(e) => setFormData({ ...formData, image_url_fr: e.target.value })}
              placeholder="https://..."
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
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
              placeholder="Alt text for accessibility"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="alt_text_fr" className="text-gray-700 dark:text-gray-300">Texte Alt (Français)</Label>
            <Input
              id="alt_text_fr"
              value={formData.alt_text_fr}
              onChange={(e) => setFormData({ ...formData, alt_text_fr: e.target.value })}
              placeholder="Texte alternatif pour accessibilité"
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
            onClick={() => onSave(formData)}
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
                        onClick={() => setShowPreview({ type: 'video', url: item.video_url_en!, title: item.title_en })}
                      >
                        <video
                          src={item.video_url_en}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    ) : item.image_url_en ? (
                      <img
                        src={item.image_url_en}
                        alt={item.alt_text_en}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setShowPreview({ type: 'image', url: item.image_url_en!, title: item.title_en })}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Image className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <Badge variant="outline">#{item.order_index}</Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-2 space-y-3">
                  <div>
                    <h4 className="font-semibold text-memopyk-navy">{item.title_fr}</h4>
                    <p className="text-sm text-gray-600">{item.description_fr}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Prix FR:</strong> {item.price_fr}
                    </div>
                    <div>
                      <strong>Prix EN:</strong> {item.price_en}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Créé: {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(item, 'up')}
                      disabled={index === 0 || reorderItemMutation.isPending}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(item, 'down')}
                      disabled={index === sortedItems.length - 1 || reorderItemMutation.isPending}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditingItem(item)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => updateItemMutation.mutate({ 
                      id: item.id, 
                      data: { is_active: !item.is_active } 
                    })}
                  >
                    {item.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {item.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer cet élément?')) {
                        deleteItemMutation.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingItem && (
        <Dialog open={true} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l'Élément de Galerie</DialogTitle>
            </DialogHeader>
            <GalleryItemForm
              item={editingItem}
              onSave={(data) => updateItemMutation.mutate({ id: editingItem.id, data })}
              onCancel={() => setEditingItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {showPreview && (
        <Dialog open={true} onOpenChange={() => setShowPreview(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                {showPreview.title}
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="aspect-video">
              {showPreview.type === 'video' ? (
                <video
                  src={showPreview.url}
                  controls
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <img
                  src={showPreview.url}
                  alt={showPreview.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}