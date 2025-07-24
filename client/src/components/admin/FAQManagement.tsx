import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Plus, Edit, Trash2, Eye, EyeOff, Save, X, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface FAQ {
  id: string;
  sectionNameEn: string;
  sectionNameFr: string;
  sectionOrder: number;
  orderIndex: number;
  questionEn: string;
  questionFr: string;
  answerEn: string;
  answerFr: string;
  isActive: boolean;
  sectionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface FAQSection {
  id: string;
  key: string;
  nameEn: string;
  nameFr: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const faqSchema = z.object({
  sectionNameEn: z.string().min(1, 'Section name (English) is required'),
  sectionNameFr: z.string().min(1, 'Section name (French) is required'),
  questionEn: z.string().min(1, 'Question (English) is required'),
  questionFr: z.string().min(1, 'Question (French) is required'),
  answerEn: z.string().min(1, 'Answer (English) is required'),
  answerFr: z.string().min(1, 'Answer (French) is required'),
  sectionOrder: z.number().min(0),
  orderIndex: z.number().min(0),
  isActive: z.boolean()
});

const sectionSchema = z.object({
  key: z.string().min(1, 'Section key is required'),
  nameEn: z.string().min(1, 'Section name (English) is required'),
  nameFr: z.string().min(1, 'Section name (French) is required'),
  orderIndex: z.number().min(0),
  isActive: z.boolean()
});

type FAQFormData = z.infer<typeof faqSchema>;
type SectionFormData = z.infer<typeof sectionSchema>;

export const FAQManagement: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingSection, setEditingSection] = useState<FAQSection | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch FAQs
  const { data: faqs = [], isLoading: faqsLoading } = useQuery<FAQ[]>({
    queryKey: ['/api/faqs'],
  });

  // Fetch FAQ sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery<FAQSection[]>({
    queryKey: ['/api/faq-sections'],
  });

  // FAQ form
  const faqForm = useForm<FAQFormData>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      sectionNameEn: '',
      sectionNameFr: '',
      questionEn: '',
      questionFr: '',
      answerEn: '',
      answerFr: '',
      sectionOrder: 0,
      orderIndex: 0,
      isActive: true
    }
  });

  // Section form
  const sectionForm = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      key: '',
      nameEn: '',
      nameFr: '',
      orderIndex: 0,
      isActive: true
    }
  });

  // Create FAQ mutation
  const createFaqMutation = useMutation({
    mutationFn: (data: FAQFormData) => apiRequest('/api/faqs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setShowCreateDialog(false);
      faqForm.reset();
      toast({
        title: "FAQ créée",
        description: "La FAQ a été créée avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error creating FAQ:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la FAQ.",
        variant: "destructive",
      });
    },
  });

  // Update FAQ mutation
  const updateFaqMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FAQFormData> }) => 
      apiRequest(`/api/faqs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setEditingFaq(null);
      toast({
        title: "FAQ mise à jour",
        description: "La FAQ a été mise à jour avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error updating FAQ:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la FAQ.",
        variant: "destructive",
      });
    },
  });

  // Delete FAQ mutation
  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/faqs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      toast({
        title: "FAQ supprimée",
        description: "La FAQ a été supprimée avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error deleting FAQ:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la FAQ.",
        variant: "destructive",
      });
    },
  });

  // Create section mutation
  const createSectionMutation = useMutation({
    mutationFn: (data: SectionFormData) => apiRequest('/api/faq-sections', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      setShowSectionDialog(false);
      sectionForm.reset();
      toast({
        title: "Section créée",
        description: "La section FAQ a été créée avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error creating section:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la section.",
        variant: "destructive",
      });
    },
  });

  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SectionFormData> }) => 
      apiRequest(`/api/faq-sections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      setEditingSection(null);
      toast({
        title: "Section mise à jour",
        description: "La section FAQ a été mise à jour avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error updating section:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la section.",
        variant: "destructive",
      });
    },
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/faq-sections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      toast({
        title: "Section supprimée",
        description: "La section FAQ a été supprimée avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error deleting section:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la section.",
        variant: "destructive",
      });
    },
  });

  const handleCreateFaq = (data: FAQFormData) => {
    createFaqMutation.mutate(data);
  };

  const handleUpdateFaq = (data: FAQFormData) => {
    if (editingFaq) {
      updateFaqMutation.mutate({ id: editingFaq.id, data });
    }
  };

  const handleCreateSection = (data: SectionFormData) => {
    createSectionMutation.mutate(data);
  };

  const handleUpdateSection = (data: SectionFormData) => {
    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, data });
    }
  };

  const toggleFaqVisibility = (faq: FAQ) => {
    updateFaqMutation.mutate({
      id: faq.id,
      data: { isActive: !faq.isActive }
    });
  };

  const toggleSectionVisibility = (section: FAQSection) => {
    updateSectionMutation.mutate({
      id: section.id,
      data: { isActive: !section.isActive }
    });
  };

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const startEditingFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    faqForm.reset({
      sectionNameEn: faq.sectionNameEn,
      sectionNameFr: faq.sectionNameFr,
      questionEn: faq.questionEn,
      questionFr: faq.questionFr,
      answerEn: faq.answerEn,
      answerFr: faq.answerFr,
      sectionOrder: faq.sectionOrder,
      orderIndex: faq.orderIndex,
      isActive: faq.isActive
    });
    setShowCreateDialog(true);
  };

  const startEditingSection = (section: FAQSection) => {
    setEditingSection(section);
    sectionForm.reset({
      key: section.key,
      nameEn: section.nameEn,
      nameFr: section.nameFr,
      orderIndex: section.orderIndex,
      isActive: section.isActive
    });
    setShowSectionDialog(true);
  };

  // Group FAQs by section
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const sectionKey = `${faq.sectionNameEn}|${faq.sectionNameFr}`;
    if (!acc[sectionKey]) {
      acc[sectionKey] = [];
    }
    acc[sectionKey].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  // Sort sections by sectionOrder
  const sortedSectionKeys = Object.keys(groupedFaqs).sort((a, b) => {
    const sectionA = groupedFaqs[a][0];
    const sectionB = groupedFaqs[b][0];
    return sectionA.sectionOrder - sectionB.sectionOrder;
  });

  if (faqsLoading || sectionsLoading) {
    return <div className="text-center py-8">Chargement des FAQs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FAQ</h2>
        <p className="text-gray-600 dark:text-gray-400">Gestion des questions fréquemment posées</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Section
            </Button>
          </DialogTrigger>
        </Dialog>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle FAQ
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* FAQ sections and items */}
      <div className="space-y-4">
        {sortedSectionKeys.map((sectionKey) => {
          const [sectionNameEn, sectionNameFr] = sectionKey.split('|');
          const sectionFaqs = groupedFaqs[sectionKey].sort((a, b) => a.orderIndex - b.orderIndex);
          const isExpanded = expandedSections.has(sectionKey);

          return (
            <Card key={sectionKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="flex items-center gap-2 text-left"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-orange-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{sectionNameFr}</CardTitle>
                      <CardDescription>{sectionNameEn}</CardDescription>
                    </div>
                  </button>
                  <Badge variant="secondary">
                    {sectionFaqs.length} FAQ{sectionFaqs.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {sectionFaqs.map((faq) => (
                      <div key={faq.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {faq.questionFr}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {faq.questionEn}
                            </p>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              Réponse (FR): {faq.answerFr.substring(0, 100)}...
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              Réponse (EN): {faq.answerEn.substring(0, 100)}...
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFaqVisibility(faq)}
                              className={faq.isActive ? "text-green-600" : "text-gray-400"}
                            >
                              {faq.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingFaq(faq)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFaqMutation.mutate(faq.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create/Edit FAQ Dialog */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFaq ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...faqForm}>
          <form onSubmit={faqForm.handleSubmit(editingFaq ? handleUpdateFaq : handleCreateFaq)} className="space-y-6">
            {/* Section Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={faqForm.control}
                name="sectionNameFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section (Français)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Créer votre film souvenir" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={faqForm.control}
                name="sectionNameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section (English)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Create your memory film" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Question */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={faqForm.control}
                name="questionFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question (Français)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Votre question en français" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={faqForm.control}
                name="questionEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question (English)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Your question in English" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Answer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={faqForm.control}
                name="answerFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Réponse (Français)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Votre réponse détaillée en français" rows={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={faqForm.control}
                name="answerEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Réponse (English)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Your detailed answer in English" rows={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order and Status */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={faqForm.control}
                name="sectionOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre de section</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={faqForm.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre dans section</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={faqForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Visible</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingFaq(null);
                  faqForm.reset();
                }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {createFaqMutation.isPending || updateFaqMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : null}
                {editingFaq ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Create/Edit Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Modifier la Section' : 'Nouvelle Section FAQ'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...sectionForm}>
            <form onSubmit={sectionForm.handleSubmit(editingSection ? handleUpdateSection : handleCreateSection)} className="space-y-4">
              <FormField
                control={sectionForm.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clé de section</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="create-your-film" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sectionForm.control}
                  name="nameFr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom (Français)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Créer votre film" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sectionForm.control}
                  name="nameEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Create your film" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sectionForm.control}
                  name="orderIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordre</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sectionForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Visible</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSectionDialog(false);
                    setEditingSection(null);
                    sectionForm.reset();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createSectionMutation.isPending || updateSectionMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {createSectionMutation.isPending || updateSectionMutation.isPending ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : null}
                  {editingSection ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FAQManagement;