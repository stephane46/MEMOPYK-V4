import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Edit, Save, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { CtaSettings } from '@shared/schema';

export function CtaManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCta, setEditingCta] = useState<CtaSettings | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: ctaSettings = [], isLoading } = useQuery<CtaSettings[]>({
    queryKey: ['/api/cta']
  });

  const updateCtaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CtaSettings> }) => {
      return apiRequest(`/api/cta/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cta'] });
      setEditingCta(null);
      toast({
        title: "Success",
        description: "CTA settings updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update CTA settings",
        variant: "destructive"
      });
    }
  });

  const createCtaMutation = useMutation({
    mutationFn: async (data: Omit<CtaSettings, 'createdAt' | 'updatedAt'>) => {
      return apiRequest('/api/cta', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cta'] });
      setIsCreating(false);
      setEditingCta(null);
      toast({
        title: "Success",
        description: "CTA created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create CTA",
        variant: "destructive"
      });
    }
  });

  const handleEdit = (cta: CtaSettings) => {
    setEditingCta(cta);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingCta({
      id: '',
      buttonTextFr: '',
      buttonTextEn: '',
      buttonUrl: '',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  };

  const handleSave = () => {
    if (!editingCta) return;

    if (isCreating) {
      createCtaMutation.mutate({
        id: editingCta.id,
        buttonTextFr: editingCta.buttonTextFr,
        buttonTextEn: editingCta.buttonTextEn,
        buttonUrl: editingCta.buttonUrl,
        isActive: editingCta.isActive
      });
    } else {
      updateCtaMutation.mutate({
        id: editingCta.id,
        data: {
          buttonTextFr: editingCta.buttonTextFr,
          buttonTextEn: editingCta.buttonTextEn,
          buttonUrl: editingCta.buttonUrl,
          isActive: editingCta.isActive
        }
      });
    }
  };

  const handleCancel = () => {
    setEditingCta(null);
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">CTA Button Management</h2>
        <div className="text-sm text-gray-600">
          Edit the existing CTA buttons below
        </div>
      </div>

      {/* Existing CTA Buttons */}
      <div className="grid gap-4">
        {ctaSettings.map((cta) => (
          <Card key={cta.id} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {cta.id === 'book_call' && <Phone className="h-4 w-4" />}
                {cta.id === 'quick_quote' && <Edit className="h-4 w-4" />}
                {cta.id === 'book_call' ? 'Book Call Button' : 'Quick Quote Button'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={cta.isActive}
                  onCheckedChange={(checked) => {
                    console.log('🔄 Updating CTA setting:', cta.id, { isActive: checked });
                    updateCtaMutation.mutate({
                      id: cta.id,
                      data: { isActive: checked }
                    });
                  }}
                  disabled={updateCtaMutation.isPending}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(cta)}
                >
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>English Button:</strong> {cta.buttonTextEn}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>French Button:</strong> {cta.buttonTextFr}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>URL:</strong> {cta.buttonUrl}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    cta.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cta.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/Create Form */}
      {editingCta && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Create CTA Button' : 'Edit CTA Button'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id">Button ID</Label>
                <Input
                  id="id"
                  value={editingCta.id}
                  onChange={(e) => setEditingCta({ ...editingCta, id: e.target.value })}
                  placeholder="e.g., book_call, quick_quote"
                  disabled={!isCreating}
                />
              </div>
              <div>
                <Label htmlFor="buttonUrl">Button URL</Label>
                <Input
                  id="buttonUrl"
                  value={editingCta.buttonUrl}
                  onChange={(e) => setEditingCta({ ...editingCta, buttonUrl: e.target.value })}
                  placeholder="https://example.com or tel:+123456789"
                />
              </div>
            </div>



            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buttonTextEn">English Button Text</Label>
                <Input
                  id="buttonTextEn"
                  value={editingCta.buttonTextEn}
                  onChange={(e) => setEditingCta({ ...editingCta, buttonTextEn: e.target.value })}
                  placeholder="Book a Call"
                />
              </div>
              <div>
                <Label htmlFor="buttonTextFr">French Button Text</Label>
                <Input
                  id="buttonTextFr"
                  value={editingCta.buttonTextFr}
                  onChange={(e) => setEditingCta({ ...editingCta, buttonTextFr: e.target.value })}
                  placeholder="Réserver un appel"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={editingCta.isActive}
                onCheckedChange={(checked) => 
                  setEditingCta({ ...editingCta, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave}
                disabled={updateCtaMutation.isPending || createCtaMutation.isPending}
                className="flex items-center gap-2"
              >
                {(updateCtaMutation.isPending || createCtaMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Save className="h-4 w-4" />
                {isCreating ? 'Create' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}