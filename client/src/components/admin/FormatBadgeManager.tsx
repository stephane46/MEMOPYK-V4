import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Save, X, Monitor, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormatBadgeTemplate {
  id: string;
  platformEn: string;
  platformFr: string;
  typeEn: string;
  typeFr: string;
  category: 'social' | 'professional' | 'custom';
}

const FormatBadgeManager: React.FC = () => {
  const { toast } = useToast();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Predefined format badge templates
  const [templates, setTemplates] = useState<FormatBadgeTemplate[]>([
    {
      id: '1',
      platformEn: 'Social Media',
      platformFr: 'Réseaux Sociaux',
      typeEn: 'Mobile Stories',
      typeFr: 'Stories Mobiles',
      category: 'social'
    },
    {
      id: '2',
      platformEn: 'Social Feed',
      platformFr: 'Flux Social',
      typeEn: 'Instagram Posts',
      typeFr: 'Posts Instagram',
      category: 'social'
    },
    {
      id: '3',
      platformEn: 'Professional',
      platformFr: 'Professionnel',
      typeEn: 'TV & Desktop',
      typeFr: 'TV & Bureau',
      category: 'professional'
    }
  ]);

  const [newTemplate, setNewTemplate] = useState<Omit<FormatBadgeTemplate, 'id'>>({
    platformEn: '',
    platformFr: '',
    typeEn: '',
    typeFr: '',
    category: 'custom'
  });

  const [editingTemplate, setEditingTemplate] = useState<FormatBadgeTemplate | null>(null);

  const handleAddTemplate = () => {
    if (!newTemplate.platformEn || !newTemplate.typeEn) {
      toast({
        title: "Champs requis",
        description: "Platform EN et Type EN sont obligatoires",
        variant: "destructive"
      });
      return;
    }

    const template: FormatBadgeTemplate = {
      ...newTemplate,
      id: Date.now().toString(),
      platformFr: newTemplate.platformFr || newTemplate.platformEn,
      typeFr: newTemplate.typeFr || newTemplate.typeEn
    };

    setTemplates([...templates, template]);
    setNewTemplate({
      platformEn: '',
      platformFr: '',
      typeEn: '',
      typeFr: '',
      category: 'custom'
    });
    setIsAddingNew(false);

    toast({
      title: "Template ajouté",
      description: "Nouveau format badge template créé avec succès"
    });
  };

  const handleEditTemplate = (template: FormatBadgeTemplate) => {
    setEditingTemplate({ ...template });
    setEditingId(template.id);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;

    setTemplates(templates.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    ));
    setEditingId(null);
    setEditingTemplate(null);

    toast({
      title: "Template mis à jour",
      description: "Format badge template modifié avec succès"
    });
  };

  const handleDeleteTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.category !== 'custom') {
      toast({
        title: "Suppression impossible",
        description: "Les templates prédéfinis ne peuvent pas être supprimés",
        variant: "destructive"
      });
      return;
    }

    setTemplates(templates.filter(t => t.id !== id));
    toast({
      title: "Template supprimé",
      description: "Format badge template supprimé avec succès"
    });
  };

  const getCategoryIcon = (category: string) => {
    return category === 'social' ? Smartphone : Monitor;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300';
      case 'professional': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <Card className="border-[#89BAD9] dark:border-[#2A4759]">
      <CardHeader>
        <CardTitle className="text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Gestionnaire Format Badge Templates
        </CardTitle>
        <p className="text-sm text-[#2A4759] dark:text-[#89BAD9]">
          Gérez les templates de format badges pour les appliquer rapidement aux éléments de galerie
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Existing Templates */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#011526] dark:text-[#F2EBDC]">Templates Disponibles</h3>
          
          {templates.map((template) => {
            const CategoryIcon = getCategoryIcon(template.category);
            const isEditing = editingId === template.id;
            
            return (
              <div key={template.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="w-4 h-4 text-[#2A4759]" />
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="border-[#89BAD9] text-[#2A4759] hover:bg-[#89BAD9]/10"
                        >
                          <Edit className="w-3 h-3" />
                          Modifier
                        </Button>
                        {template.category === 'custom' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </Button>
                        )}
                      </>
                    )}
                    {isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="border-green-300 text-green-600 hover:bg-green-50"
                        >
                          <Save className="w-3 h-3" />
                          Sauvegarder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditingTemplate(null);
                          }}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          <X className="w-3 h-3" />
                          Annuler
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && editingTemplate ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>English Platform</Label>
                      <Input
                        value={editingTemplate.platformEn}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          platformEn: e.target.value
                        })}
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>French Platform</Label>
                      <Input
                        value={editingTemplate.platformFr}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          platformFr: e.target.value
                        })}
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>English Type</Label>
                      <Input
                        value={editingTemplate.typeEn}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          typeEn: e.target.value
                        })}
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>French Type</Label>
                      <Input
                        value={editingTemplate.typeFr}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          typeFr: e.target.value
                        })}
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                        {template.platformEn}
                      </div>
                      <div className="text-[#2A4759] dark:text-[#89BAD9]">
                        {template.typeEn}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                        {template.platformFr}
                      </div>
                      <div className="text-[#2A4759] dark:text-[#89BAD9]">
                        {template.typeFr}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Template */}
        <div className="border-t pt-6">
          {!isAddingNew ? (
            <Button
              onClick={() => setIsAddingNew(true)}
              className="bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un nouveau template
            </Button>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-[#011526] dark:text-[#F2EBDC]">
                Nouveau Format Badge Template
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>English Platform *</Label>
                  <Input
                    value={newTemplate.platformEn}
                    onChange={(e) => setNewTemplate({
                      ...newTemplate,
                      platformEn: e.target.value
                    })}
                    placeholder="e.g., Social Media"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>French Platform</Label>
                  <Input
                    value={newTemplate.platformFr}
                    onChange={(e) => setNewTemplate({
                      ...newTemplate,
                      platformFr: e.target.value
                    })}
                    placeholder="e.g., Réseaux Sociaux"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>English Type *</Label>
                  <Input
                    value={newTemplate.typeEn}
                    onChange={(e) => setNewTemplate({
                      ...newTemplate,
                      typeEn: e.target.value
                    })}
                    placeholder="e.g., Mobile Stories"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>French Type</Label>
                  <Input
                    value={newTemplate.typeFr}
                    onChange={(e) => setNewTemplate({
                      ...newTemplate,
                      typeFr: e.target.value
                    })}
                    placeholder="e.g., Stories Mobiles"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newTemplate.category} 
                  onValueChange={(value: 'social' | 'professional' | 'custom') => 
                    setNewTemplate({ ...newTemplate, category: value })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddTemplate}
                  className="bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Créer Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewTemplate({
                      platformEn: '',
                      platformFr: '',
                      typeEn: '',
                      typeFr: '',
                      category: 'custom'
                    });
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="bg-[#F2EBDC]/50 dark:bg-[#011526]/20 p-4 rounded-lg">
          <h4 className="font-semibold text-[#011526] dark:text-[#F2EBDC] mb-2">
            Comment utiliser les templates:
          </h4>
          <ul className="text-sm text-[#2A4759] dark:text-[#89BAD9] space-y-1">
            <li>• Les templates créés ici apparaîtront dans les dropdown du Gallery Management</li>
            <li>• Chaque élément de galerie peut utiliser un template différent</li>
            <li>• Les templates personnalisés peuvent être modifiés ou supprimés</li>
            <li>• Si aucun template n'est choisi, le système utilise la détection automatique</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormatBadgeManager;