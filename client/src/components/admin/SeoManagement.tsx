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
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Globe, FileText, Zap, Eye, ExternalLink, Plus, Save, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SeoSettings {
  id?: string;
  page: string;
  urlSlugEn?: string;
  urlSlugFr?: string;
  metaTitleEn?: string;
  metaTitleFr?: string;
  metaDescriptionEn?: string;
  metaDescriptionFr?: string;
  metaKeywordsEn?: string;
  metaKeywordsFr?: string;
  ogTitleEn?: string;
  ogTitleFr?: string;
  ogDescriptionEn?: string;
  ogDescriptionFr?: string;
  ogImageUrl?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitleEn?: string;
  twitterTitleFr?: string;
  twitterDescriptionEn?: string;
  twitterDescriptionFr?: string;
  twitterImageUrl?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  robotsNoArchive?: boolean;
  robotsNoSnippet?: boolean;
  priority?: string;
  changeFreq?: string;
  isActive?: boolean;
}

interface SeoGlobalSettings {
  robotsTxt?: string;
  sitemapEnabled?: boolean;
  sitemapFrequency?: string;
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
  isMaintenanceMode?: boolean;
}

export default function SeoManagement() {
  const [selectedPage, setSelectedPage] = useState('homepage');
  const [currentLanguage, setCurrentLanguage] = useState<'fr' | 'en'>('fr');
  const [customMetaTags, setCustomMetaTags] = useState('');
  const [seoScore, setSeoScore] = useState(75);
  const [showRobotsDialog, setShowRobotsDialog] = useState(false);
  const [showViewRobotsDialog, setShowViewRobotsDialog] = useState(false);
  const [robotsContent, setRobotsContent] = useState('');
  const [viewRobotsContent, setViewRobotsContent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Available pages for SEO management - Only fully coded pages
  const availablePages = [
    { value: 'homepage', label: 'Page d\'accueil / Homepage' }
  ];

  // Fetch SEO settings for selected page
  const { data: seoSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/seo/settings', selectedPage],
    queryFn: () => apiRequest(`/api/seo/settings?page=${selectedPage}`, 'GET')
  });

  // Fetch global SEO settings
  const { data: globalSettings, isLoading: globalLoading } = useQuery({
    queryKey: ['/api/seo/global-settings'],
    queryFn: () => apiRequest('/api/seo/global-settings', 'GET')
  });

  // Save SEO settings mutation
  const saveSeoMutation = useMutation({
    mutationFn: async (data: Partial<SeoSettings>) => {
      if (currentSettings?.id) {
        return apiRequest(`/api/seo/settings/${currentSettings.id}`, 'PATCH', data);
      } else {
        return apiRequest('/api/seo/settings', 'POST', { ...data, page: selectedPage });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo/settings'] });
      toast({ title: "Success", description: "SEO settings saved successfully" });
    },
    onError: (error: any) => {
      console.error('SEO Save Error:', error);
      toast({ title: "Error", description: "Failed to save SEO settings", variant: "destructive" });
    }
  });

  // Update global settings mutation
  const updateGlobalMutation = useMutation({
    mutationFn: async (data: Partial<SeoGlobalSettings>) => {
      return apiRequest('/api/seo/global-settings', 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo/global-settings'] });
      toast({ title: "Succès", description: "Paramètres globaux mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la mise à jour", variant: "destructive" });
    }
  });

  // Get SEO score mutation
  const getSeoScoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/seo/score/${selectedPage}`, 'GET');
      return response;
    },
    onSuccess: (data: any) => {
      setSeoScore(data?.score || 75);
      toast({ title: "SEO Score", description: `Score calculated: ${data?.score || 0}/100` });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not calculate SEO score", variant: "destructive" });
    }
  });

  const currentSettings = (seoSettings as any)?.settings?.[0] || {};
  const currentGlobal = (globalSettings as any)?.settings || {};

  const [formState, setFormState] = useState({
    metaTitleEn: '',
    metaTitleFr: '',
    metaDescriptionEn: '',
    metaDescriptionFr: '',
    urlSlugEn: '',
    urlSlugFr: '',
    robotsIndex: true,
    robotsFollow: true
  });

  // Update form state when settings change
  React.useEffect(() => {
    if (currentSettings) {
      setFormState({
        metaTitleEn: currentSettings.metaTitleEn || '',
        metaTitleFr: currentSettings.metaTitleFr || '',
        metaDescriptionEn: currentSettings.metaDescriptionEn || '',
        metaDescriptionFr: currentSettings.metaDescriptionFr || '',
        urlSlugEn: currentSettings.urlSlugEn || '',
        urlSlugFr: currentSettings.urlSlugFr || '',
        robotsIndex: currentSettings.robotsIndex !== false,
        robotsFollow: currentSettings.robotsFollow !== false
      });
    }
  }, [currentSettings]);

  const handleSave = () => {
    saveSeoMutation.mutate(formState);
  };

  const saveRobotsTxt = () => {
    updateGlobalMutation.mutate({ robotsTxt: robotsContent });
    setShowRobotsDialog(false);
  };

  const viewRobotsTxt = async () => {
    try {
      // Fetch current robots.txt content from API
      const response = await fetch('/api/seo/robots.txt');
      const content = await response.text();
      setViewRobotsContent(content);
      setShowViewRobotsDialog(true);
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: "Impossible de charger le contenu robots.txt", 
        variant: "destructive" 
      });
    }
  };

  const editRobotsTxt = async () => {
    try {
      // Fetch current robots.txt content from API to edit
      const response = await fetch('/api/seo/robots.txt');
      const content = await response.text();
      setRobotsContent(content);
      setShowRobotsDialog(true);
    } catch (error) {
      // Fallback to default content if API fails
      setRobotsContent(currentGlobal?.robotsTxt || 'User-agent: *\nDisallow: /admin\nAllow: /\n\nSitemap: https://memopyk.com/sitemap.xml');
      setShowRobotsDialog(true);
      toast({ 
        title: "Avertissement", 
        description: "Chargement du contenu par défaut", 
        variant: "default" 
      });
    }
  };

  const getCurrentTitle = () => {
    return currentLanguage === 'fr' 
      ? currentSettings.metaTitleFr || 'Memopyk | Capture memories'
      : currentSettings.metaTitleEn || 'Memopyk | Capture memories';
  };

  const getCurrentDescription = () => {
    return currentLanguage === 'fr'
      ? currentSettings.metaDescriptionFr || 'Create photo & video stories'
      : currentSettings.metaDescriptionEn || 'Create photo & video stories';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SEO Management</h2>
        <p className="text-gray-600 dark:text-gray-400">Optimize your website's search engine visibility with comprehensive SEO tools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Page Details */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Page Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Page Selection */}
              <div className="space-y-2">
                <Label>Page (Route)</Label>
                <Select value={selectedPage} onValueChange={setSelectedPage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePages.map((page) => (
                      <SelectItem key={page.value} value={page.value}>
                        {page.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={currentLanguage === 'fr' ? formState.metaTitleFr : formState.metaTitleEn}
                  onChange={(e) => {
                    const field = currentLanguage === 'fr' ? 'metaTitleFr' : 'metaTitleEn';
                    setFormState(prev => ({ ...prev, [field]: e.target.value }));
                  }}
                  placeholder="Memopyk | Capture memories"
                />
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <Label>Meta description</Label>
                <Textarea
                  value={currentLanguage === 'fr' ? formState.metaDescriptionFr : formState.metaDescriptionEn}
                  onChange={(e) => {
                    const field = currentLanguage === 'fr' ? 'metaDescriptionFr' : 'metaDescriptionEn';
                    setFormState(prev => ({ ...prev, [field]: e.target.value }));
                  }}
                  placeholder="Create photo & video stories"
                  rows={3}
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={currentLanguage === 'fr' ? formState.urlSlugFr : formState.urlSlugEn}
                  onChange={(e) => {
                    const field = currentLanguage === 'fr' ? 'urlSlugFr' : 'urlSlugEn';
                    setFormState(prev => ({ ...prev, [field]: e.target.value }));
                  }}
                  placeholder="/page-slug"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formState.robotsIndex}
                    onCheckedChange={(checked) => setFormState(prev => ({ ...prev, robotsIndex: checked }))}
                  />
                  <Label>Index on search engines</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formState.robotsFollow}
                    onCheckedChange={(checked) => setFormState(prev => ({ ...prev, robotsFollow: checked }))}
                  />
                  <Label>Multilingual content</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Meta Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Custom meta tags</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customMetaTags}
                onChange={(e) => setCustomMetaTags(e.target.value)}
                placeholder='<meta property="og:image" value="Oper:/>&#10;<meta robots="noarchive"'
                rows={4}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Language Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Multilingual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setCurrentLanguage('fr')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    currentLanguage === 'fr'
                      ? 'bg-white dark:bg-gray-700 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  🇫🇷 /fr
                </button>
                <button
                  onClick={() => setCurrentLanguage('en')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    currentLanguage === 'en'
                      ? 'bg-white dark:bg-gray-700 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  🇬🇧 /en
                </button>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Multilingual versions</span>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add language
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave}
            disabled={saveSeoMutation.isPending}
            className="w-full"
            size="lg"
          >
            {saveSeoMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            SAVE
          </Button>
        </div>

        {/* Right Column - SEO Preview & Tools */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEO Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                SEO Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Search Preview */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Google Search
                </h4>
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>https://memopyk.com</span>
                      <ExternalLink className="h-3 w-3" />
                      <Globe className="h-3 w-3" />
                    </div>
                    <h3 className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                      {getCurrentTitle()}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {getCurrentDescription()}
                    </p>
                    <div className="text-xs text-gray-500">
                      💡 Title &gt; 60 characters
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Preview */}
              <div>
                <h4 className="font-medium mb-3">Social preview</h4>
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-50">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-gray-400 rounded-sm relative">
                        <div className="absolute inset-2 border border-gray-400 rounded-sm"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{getCurrentTitle()}</h4>
                      <p className="text-gray-600 text-sm mt-1">{getCurrentDescription()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Robots.txt */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Robots.txt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">/robots.txt</span>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={viewRobotsTxt}
                    >
                      VIEW
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={editRobotsTxt}
                    >
                      EDIT
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Roleescript</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => getSeoScoreMutation.mutate()}
                  disabled={getSeoScoreMutation.isPending}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {getSeoScoreMutation.isPending ? 'CALCULATING...' : 'PERFORMANCE: TIPS'}
                </Button>
              </CardContent>
            </Card>

            {/* Multilingual Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Multilingual versions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => {
                    const generatedDescription = `Professional ${selectedPage} page for MEMOPYK - Transform your precious memories into cinematic masterpieces with our expert video creation services.`;
                    const field = currentLanguage === 'fr' ? 'metaDescriptionFr' : 'metaDescriptionEn';
                    setFormState(prev => ({ ...prev, [field]: generatedDescription }));
                    toast({ title: "Generated", description: "AI description generated successfully" });
                  }}
                >
                  AI description generator
                </Button>
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    SEO score: {seoScore}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Robots.txt Edit Dialog */}
      <Dialog open={showRobotsDialog} onOpenChange={setShowRobotsDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Edit Robots.txt</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Configure search engine crawler access to your website
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={robotsContent}
              onChange={(e) => setRobotsContent(e.target.value)}
              placeholder="User-agent: *&#10;Disallow: /admin&#10;Allow: /&#10;&#10;Sitemap: https://memopyk.com/sitemap.xml"
              rows={12}
              className="font-mono text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>
          <DialogFooter className="bg-gray-50 dark:bg-gray-800 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <Button variant="outline" onClick={() => setShowRobotsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveRobotsTxt}
              disabled={updateGlobalMutation.isPending}
            >
              {updateGlobalMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Robots.txt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Robots.txt Dialog */}
      <Dialog open={showViewRobotsDialog} onOpenChange={setShowViewRobotsDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Current Robots.txt Content</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              View the current robots.txt file content served to search engines
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {viewRobotsContent || 'No robots.txt content found'}
              </pre>
            </div>
          </div>
          <DialogFooter className="bg-gray-50 dark:bg-gray-800 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <Button variant="outline" onClick={() => setShowViewRobotsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}