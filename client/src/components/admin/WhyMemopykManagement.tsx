import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Trash2, 
  Plus, 
  Save, 
  Edit3,
  ChevronUp,
  ChevronDown,
  Zap,
  Clock,
  Settings,
  Users,
  Shield,
  Star
} from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WhyMemopykCard {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  iconName: string;
  gradient: string;
  orderIndex: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Icon mapping
const ICON_MAP = {
  Zap,
  Clock,
  Settings,
  Users,
  Shield,
  Star
};

const GRADIENT_OPTIONS = [
  { value: "from-memopyk-dark-blue/20 to-memopyk-navy/10", label: "Blue Navy" },
  { value: "from-memopyk-sky-blue/20 to-memopyk-blue-gray/10", label: "Sky Blue" },
  { value: "from-memopyk-cream/40 to-memopyk-sky-blue/20", label: "Cream Sky" },
  { value: "from-memopyk-orange/20 to-memopyk-cream/30", label: "Orange Cream" },
  { value: "from-memopyk-navy/30 to-memopyk-dark-blue/20", label: "Navy Dark" },
  { value: "from-memopyk-navy/20 to-memopyk-dark-blue/10", label: "Navy Light" }
];

export function WhyMemopykManagement() {
  const [cards, setCards] = useState<WhyMemopykCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<WhyMemopykCard | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const response = await fetch('/api/why-memopyk-cards');
      const data = await response.json();
      if (response.ok) {
        setCards(data.sort((a: WhyMemopykCard, b: WhyMemopykCard) => a.orderIndex - b.orderIndex));
      } else {
        throw new Error(data.error || 'Failed to load cards');
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      toast({
        title: "Error",
        description: "Failed to load Why MEMOPYK cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async (cardData: Partial<WhyMemopykCard>) => {
    try {
      const url = editingCard 
        ? `/api/why-memopyk-cards/${editingCard.id}`
        : '/api/why-memopyk-cards';
      
      const method = editingCard ? 'PATCH' : 'POST';
      
      // Generate ID for new cards
      if (!editingCard && !cardData.id) {
        cardData.id = `card-${Date.now()}`;
      }
      
      // Set order index for new cards
      if (!editingCard) {
        cardData.orderIndex = cards.length;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: editingCard ? "Card updated successfully" : "Card created successfully",
        });
        
        setEditingCard(null);
        setIsCreating(false);
        await loadCards();
      } else {
        throw new Error(data.error || 'Failed to save card');
      }
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: "Error", 
        description: "Failed to save card",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    try {
      const response = await fetch(`/api/why-memopyk-cards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Card deleted successfully",
        });
        await loadCards();
      } else {
        throw new Error('Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
    }
  };

  const moveCard = async (cardId: string, direction: 'up' | 'down') => {
    const currentIndex = cards.findIndex(card => card.id === cardId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= cards.length) return;
    
    const updatedCards = [...cards];
    const [movedCard] = updatedCards.splice(currentIndex, 1);
    updatedCards.splice(newIndex, 0, movedCard);
    
    // Update order indices
    for (let i = 0; i < updatedCards.length; i++) {
      updatedCards[i].orderIndex = i;
    }
    
    setCards(updatedCards);
    
    // Save the new order
    try {
      await Promise.all(
        updatedCards.map(card =>
          fetch(`/api/why-memopyk-cards/${card.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIndex: card.orderIndex }),
          })
        )
      );
      
      toast({
        title: "Success",
        description: "Card order updated successfully",
      });
    } catch (error) {
      console.error('Error updating card order:', error);
      toast({
        title: "Error",
        description: "Failed to update card order",
        variant: "destructive",
      });
      // Reload to restore correct order
      await loadCards();
    }
  };

  const renderIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName as keyof typeof ICON_MAP] || Star;
    return <Icon className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading cards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Why MEMOPYK Cards</h2>
          <p className="text-gray-600">Manage benefit cards with bilingual content and rich text editing</p>
        </div>
        
        <Button onClick={() => setIsCreating(true)} disabled={isCreating || !!editingCard}>
          <Plus className="w-4 h-4 mr-2" />
          Add Card
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingCard) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCard ? 'Edit Card' : 'Create New Card'}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardForm
              card={editingCard}
              onSave={handleSaveCard}
              onCancel={() => {
                setEditingCard(null);
                setIsCreating(false);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Cards List */}
      <div className="grid gap-4">
        {cards.map((card, index) => (
          <Card key={card.id} className={cn(
            "border-l-4",
            card.isActive ? "border-l-green-500" : "border-l-gray-300"
          )}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icon Preview */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                    {renderIcon(card.iconName)}
                  </div>
                  
                  {/* Content Preview */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-lg">{card.titleEn} / {card.titleFr}</h3>
                      <Badge variant={card.isActive ? "default" : "secondary"}>
                        {card.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <strong>EN:</strong> {card.descriptionEn.slice(0, 100)}...
                      </div>
                      <div>
                        <strong>FR:</strong> {card.descriptionFr.slice(0, 100)}...
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {/* Reordering buttons */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveCard(card.id, 'up')}
                    disabled={index === 0}
                    data-testid={`move-up-${card.id}`}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveCard(card.id, 'down')}
                    disabled={index === cards.length - 1}
                    data-testid={`move-down-${card.id}`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCard(card)}
                    disabled={isCreating || !!editingCard}
                    data-testid={`edit-${card.id}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id)}
                    disabled={isCreating || !!editingCard}
                    data-testid={`delete-${card.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface CardFormProps {
  card: WhyMemopykCard | null;
  onSave: (card: Partial<WhyMemopykCard>) => void;
  onCancel: () => void;
}

function CardForm({ card, onSave, onCancel }: CardFormProps) {
  const [formData, setFormData] = useState<Partial<WhyMemopykCard>>({
    titleEn: card?.titleEn || '',
    titleFr: card?.titleFr || '',
    descriptionEn: card?.descriptionEn || '',
    descriptionFr: card?.descriptionFr || '',
    iconName: card?.iconName || 'Star',
    gradient: card?.gradient || 'from-memopyk-dark-blue/20 to-memopyk-navy/10',
    isActive: card?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titleEn || !formData.titleFr || !formData.descriptionEn || !formData.descriptionFr) {
      alert('Please fill in all required fields');
      return;
    }
    
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="english" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="english">English</TabsTrigger>
          <TabsTrigger value="french">Français</TabsTrigger>
        </TabsList>
        
        <TabsContent value="english" className="space-y-4">
          <div>
            <Label htmlFor="titleEn">Title (English) *</Label>
            <Input
              id="titleEn"
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              placeholder="Enter English title"
              required
              data-testid="input-title-en"
            />
          </div>
          
          <div>
            <Label htmlFor="descriptionEn">Description (English) *</Label>
            <RichTextEditor
              value={formData.descriptionEn || ''}
              onChange={(value) => setFormData({ ...formData, descriptionEn: value })}
              placeholder="Enter English description"
              data-testid="editor-description-en"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="french" className="space-y-4">
          <div>
            <Label htmlFor="titleFr">Titre (Français) *</Label>
            <Input
              id="titleFr"
              value={formData.titleFr}
              onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })}
              placeholder="Entrez le titre français"
              required
              data-testid="input-title-fr"
            />
          </div>
          
          <div>
            <Label htmlFor="descriptionFr">Description (Français) *</Label>
            <RichTextEditor
              value={formData.descriptionFr || ''}
              onChange={(value) => setFormData({ ...formData, descriptionFr: value })}
              placeholder="Entrez la description française"
              data-testid="editor-description-fr"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="iconName">Icon</Label>
          <select
            id="iconName"
            value={formData.iconName}
            onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
            data-testid="select-icon"
          >
            {Object.keys(ICON_MAP).map(iconName => (
              <option key={iconName} value={iconName}>{iconName}</option>
            ))}
          </select>
        </div>
        
        <div>
          <Label htmlFor="gradient">Gradient Style</Label>
          <select
            id="gradient"
            value={formData.gradient}
            onChange={(e) => setFormData({ ...formData, gradient: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
            data-testid="select-gradient"
          >
            {GRADIENT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          data-testid="switch-active"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-save">
          <Save className="w-4 h-4 mr-2" />
          Save Card
        </Button>
      </div>
    </form>
  );
}