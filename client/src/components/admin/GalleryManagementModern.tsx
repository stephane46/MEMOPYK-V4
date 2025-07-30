import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Video,
  Image,
  Play,
  Save,
  Upload,
  Power,
  FileText,
  Globe
} from "lucide-react";
import DirectUpload from './DirectUpload';

// Version tracking for debugging
console.log('🚀🚀🚀 MODERN GALLERY MANAGEMENT v1.0.83 - CLEAN LIST INTERFACE 🚀🚀🚀');
console.log('💡 New simple list interface with language-specific upload system!');
console.log('🔥 If you see this v1.0.83 message, the NEW interface is loading!');

interface GalleryItem {
  id: string;
  title_en: string;
  title_fr: string;
  source_en: string;
  source_fr: string;
  duration_en: string;
  duration_fr: string;
  price_en: string;
  price_fr: string;
  video_url_en?: string;
  video_url_fr?: string;
  image_url_en?: string;
  image_url_fr?: string;
  is_active: boolean;
  order_index: number;
}

interface FormData {
  title_en: string;
  title_fr: string;
  source_en: string;
  source_fr: string;
  duration_en: string;
  duration_fr: string;
  price_en: string;
  price_fr: string;
  video_url_en: string;
  video_url_fr: string;
  image_url_en: string;
  image_url_fr: string;
  is_active: boolean;
  order_index: number;
  use_same_video: boolean;
}

const GalleryManagementModern: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title_en: '',
    title_fr: '',
    source_en: '',
    source_fr: '',
    duration_en: '',
    duration_fr: '',
    price_en: '',
    price_fr: '',
    video_url_en: '',
    video_url_fr: '',
    image_url_en: '',
    image_url_fr: '',
    is_active: true,
    order_index: 1,
    use_same_video: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch gallery items
  const { data: galleryItems = [], isLoading } = useQuery({
    queryKey: ['/api/gallery'],
    queryFn: () => apiRequest('/api/gallery', 'GET')
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: (data: Partial<GalleryItem>) => apiRequest('/api/gallery', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: "Élément créé avec succès",
        className: "bg-green-50 border-green-200"
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la création: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GalleryItem> }) => 
      apiRequest(`/api/gallery/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setEditingItem(null);
      resetForm();
      toast({
        title: "Succès",
        description: "Élément mis à jour avec succès",
        className: "bg-green-50 border-green-200"
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/gallery/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      toast({
        title: "Succès",
        description: "Élément supprimé avec succès",
        className: "bg-green-50 border-green-200"
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression: ${error}`,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title_en: '',
      title_fr: '',
      source_en: '',
      source_fr: '',
      duration_en: '',
      duration_fr: '',
      price_en: '',
      price_fr: '',
      video_url_en: '',
      video_url_fr: '',
      image_url_en: '',
      image_url_fr: '',
      is_active: true,
      order_index: galleryItems.length + 1,
      use_same_video: true
    });
  };

  const handleCreate = () => {
    setEditingItem(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({
      title_en: item.title_en || '',
      title_fr: item.title_fr || '',
      source_en: item.source_en || '',
      source_fr: item.source_fr || '',
      duration_en: item.duration_en || '',
      duration_fr: item.duration_fr || '',
      price_en: item.price_en || '',
      price_fr: item.price_fr || '',
      video_url_en: item.video_url_en || '',
      video_url_fr: item.video_url_fr || '',
      image_url_en: item.image_url_en || '',
      image_url_fr: item.image_url_fr || '',
      is_active: item.is_active,
      order_index: item.order_index,
      use_same_video: (item.video_url_en === item.video_url_fr) && Boolean(item.video_url_en)
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title_en || !formData.title_fr) {
      toast({
        title: "Erreur",
        description: "Les titres en français et anglais sont obligatoires",
        variant: "destructive"
      });
      return;
    }

    const dataToSave = { ...formData };
    
    // If using same video, sync the video URLs
    if (formData.use_same_video && formData.video_url_en) {
      dataToSave.video_url_fr = formData.video_url_en;
    }

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: dataToSave });
    } else {
      createItemMutation.mutate(dataToSave);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Galerie Moderne</h2>
          <p className="text-gray-600 dark:text-gray-400">Interface simplifiée pour la gestion des éléments</p>
        </div>
        <Button onClick={handleCreate} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Élément
        </Button>
      </div>

      {/* Gallery Items List */}
      <div className="grid gap-4">
        {galleryItems.map((item: GalleryItem) => (
          <Card key={item.id} className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.title_en} / {item.title_fr}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.source_en} • {item.duration_en} • {item.price_en}
                      </p>
                    </div>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteItemMutation.mutate(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier l\'élément' : 'Créer un nouvel élément'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informations de base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title_en">Titre (Anglais) *</Label>
                    <Input
                      id="title_en"
                      value={formData.title_en}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      placeholder="English title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title_fr">Titre (Français) *</Label>
                    <Input
                      id="title_fr"
                      value={formData.title_fr}
                      onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                      placeholder="Titre français"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="source_en">Source (Anglais)</Label>
                    <Input
                      id="source_en"
                      value={formData.source_en}
                      onChange={(e) => setFormData({ ...formData, source_en: e.target.value })}
                      placeholder="80 photos & 10 videos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="source_fr">Source (Français)</Label>
                    <Input
                      id="source_fr"
                      value={formData.source_fr}
                      onChange={(e) => setFormData({ ...formData, source_fr: e.target.value })}
                      placeholder="80 photos et 10 vidéos"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration_en">Durée (Anglais)</Label>
                    <Input
                      id="duration_en"
                      value={formData.duration_en}
                      onChange={(e) => setFormData({ ...formData, duration_en: e.target.value })}
                      placeholder="2 minutes"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_fr">Durée (Français)</Label>
                    <Input
                      id="duration_fr"
                      value={formData.duration_fr}
                      onChange={(e) => setFormData({ ...formData, duration_fr: e.target.value })}
                      placeholder="2 minutes"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price_en">Prix (Anglais)</Label>
                    <Input
                      id="price_en"
                      value={formData.price_en}
                      onChange={(e) => setFormData({ ...formData, price_en: e.target.value })}
                      placeholder="$299"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price_fr">Prix (Français)</Label>
                    <Input
                      id="price_fr"
                      value={formData.price_fr}
                      onChange={(e) => setFormData({ ...formData, price_fr: e.target.value })}
                      placeholder="299€"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Actif</Label>
                </div>
              </CardContent>
            </Card>

            {/* Video Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Gestion des Vidéos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Language Toggle */}
                <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <Switch
                    checked={formData.use_same_video}
                    onCheckedChange={(checked) => setFormData({ ...formData, use_same_video: checked })}
                  />
                  <Label className="text-blue-900 dark:text-blue-100 font-medium">
                    Utiliser la même vidéo pour FR et EN
                  </Label>
                </div>

                {/* Upload Sections */}
                {formData.use_same_video ? (
                  // Single upload for both languages
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-purple-600 rounded-full p-1">
                        <Upload className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                        🌍 Vidéo Partagée (FR + EN)
                      </h4>
                    </div>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                      Cette vidéo sera utilisée pour les deux langues.
                    </p>
                    
                    <div>
                      <Label className="text-purple-900 dark:text-purple-100 mb-2 block">
                        <Video className="h-4 w-4 inline mr-1" />
                        Vidéo (.mp4, .mov, .avi...)
                      </Label>
                      <DirectUpload
                        bucket="memopyk-videos"
                        acceptedTypes="video/*"
                        maxSizeMB={5000}
                        uploadId="gallery-video-shared-upload"
                        onUploadComplete={(result) => {
                          const filename = result.url.split('/').pop() || '';
                          setFormData(prev => ({
                            ...prev,
                            video_url_en: filename,
                            video_url_fr: filename
                          }));
                          
                          toast({
                            title: "✅ Succès",
                            description: `Vidéo partagée téléchargée: ${filename}`,
                            className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          });
                        }}
                        onUploadError={(error) => {
                          toast({
                            title: "❌ Erreur",
                            description: `Échec du téléchargement: ${error}`,
                            variant: "destructive"
                          });
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  // Separate uploads for French and English
                  <div className="space-y-6">
                    {/* French Upload Section */}
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
                      
                      <div>
                        <Label className="text-blue-900 dark:text-blue-100 mb-2 block">
                          <Video className="h-4 w-4 inline mr-1" />
                          Vidéo Française
                        </Label>
                        <DirectUpload
                          bucket="memopyk-videos"
                          acceptedTypes="video/*"
                          maxSizeMB={5000}
                          uploadId="gallery-video-fr-upload"
                          onUploadComplete={(result) => {
                            const filename = result.url.split('/').pop() || '';
                            setFormData(prev => ({
                              ...prev,
                              video_url_fr: filename
                            }));
                            
                            toast({
                              title: "✅ Succès",
                              description: `Vidéo française téléchargée: ${filename}`,
                              className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            });
                          }}
                          onUploadError={(error) => {
                            toast({
                              title: "❌ Erreur",
                              description: `Échec vidéo française: ${error}`,
                              variant: "destructive"
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* English Upload Section */}
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
                      
                      <div>
                        <Label className="text-green-900 dark:text-green-100 mb-2 block">
                          <Video className="h-4 w-4 inline mr-1" />
                          English Video
                        </Label>
                        <DirectUpload
                          bucket="memopyk-videos"
                          acceptedTypes="video/*"
                          maxSizeMB={5000}
                          uploadId="gallery-video-en-upload"
                          onUploadComplete={(result) => {
                            const filename = result.url.split('/').pop() || '';
                            setFormData(prev => ({
                              ...prev,
                              video_url_en: filename
                            }));
                            
                            toast({
                              title: "✅ Success",
                              description: `English video uploaded: ${filename}`,
                              className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            });
                          }}
                          onUploadError={(error) => {
                            toast({
                              title: "❌ Error",
                              description: `English video upload failed: ${error}`,
                              variant: "destructive"
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Actions */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={createItemMutation.isPending || updateItemMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editingItem ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryManagementModern;