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

  // Fetch SEO settings for selected page - FIXED: using correct API endpoint
  const { data: seoSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/seo'],
    queryFn: () => apiRequest('/api/seo', 'GET'),
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  // Note: Global SEO settings will be implemented when needed
  const globalSettings = null;
  const globalLoading = false;

  // Save SEO settings mutation - FIXED: using correct API endpoint
  const saveSeoMutation = useMutation({
    mutationFn: async (data: Partial<SeoSettings>) => {
      if (currentSettings?.id) {
        return apiRequest(`/api/seo/${currentSettings.id}`, 'PATCH', data);
      } else {
        return apiRequest('/api/seo', 'POST', { ...data, page: selectedPage });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo'] });
      queryClient.refetchQueries({ queryKey: ['/api/seo'] });
      toast({ title: "Success", description: "SEO settings saved successfully" });
      // Force page reload to clear cache
      setTimeout(() => window.location.reload(), 1000);
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

  // Find the settings for the selected page - FIXED: handle array response correctly
  const currentSettings = Array.isArray(seoSettings) 
    ? seoSettings.find((item: any) => item.page === selectedPage) || {}
    : {};
  const currentGlobal = {}; // Will be implemented when global settings are added

  const [formState, setFormState] = useState({
    metaTitleEn: '',
    metaTitleFr: '',
    metaDescriptionEn: '',
    metaDescriptionFr: '',
    urlSlugEn: '/en-US',
    urlSlugFr: '/fr-FR',
    robotsIndex: true,
    robotsFollow: true
  });

  // Update form state when settings change - but only when they actually change
  React.useEffect(() => {
    if (currentSettings && selectedPage) {
      const newFormState = {
        metaTitleEn: currentSettings.metaTitleEn || '',
        metaTitleFr: currentSettings.metaTitleFr || '',
        metaDescriptionEn: currentSettings.metaDescriptionEn || '',
        metaDescriptionFr: currentSettings.metaDescriptionFr || '',
        urlSlugEn: currentSettings.urlSlugEn || '/en-US',
        urlSlugFr: currentSettings.urlSlugFr || '/fr-FR',
        robotsIndex: currentSettings.robotsIndex !== false,
        robotsFollow: currentSettings.robotsFollow !== false
      };
      
      // Only update if there's an actual change to prevent infinite loops
      setFormState(prev => {
        const hasChanged = Object.keys(newFormState).some(key => 
          prev[key] !== newFormState[key]
        );
        return hasChanged ? newFormState : prev;
      });
    }
  }, [currentSettings, selectedPage]);

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
      setRobotsContent('User-agent: *\nDisallow: /admin\nAllow: /\n\nSitemap: https://memopyk.com/sitemap.xml');
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
      ? currentSettings.metaTitleFr || 'MEMOPYK – Films & albums souvenirs à partir de vos photos et vidéos'
      : currentSettings.metaTitleEn || 'MEMOPYK – Unique memory films & albums from your photos and videos';
  };

  const getCurrentDescription = () => {
    return currentLanguage === 'fr'
      ? currentSettings.metaDescriptionFr || 'MEMOPYK transforme vos photos et vidéos en albums et films souvenirs uniques. Un service 100 % humain, créatif et inspirant.'
      : currentSettings.metaDescriptionEn || 'MEMOPYK turns your photos and videos into unique souvenir films and albums. A fully human, creative, and inspiring service.';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SEO Management</h2>
        <p className="text-gray-800 dark:text-gray-200">Optimize your website's search engine visibility with comprehensive SEO tools</p>
      </div>

      {/* Compact Language Switcher */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Language:</h3>
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setCurrentLanguage('fr')}
              className={`px-4 py-2 text-sm rounded-l-lg ${
                currentLanguage === 'fr' ? 'language-button-active' : 'language-button-inactive'
              }`}
            >
              FR /fr
            </button>
            <button
              onClick={() => setCurrentLanguage('en')}
              className={`px-4 py-2 text-sm rounded-r-lg border-l border-gray-300 ${
                currentLanguage === 'en' ? 'language-button-active' : 'language-button-inactive'
              }`}
            >
              US /en
            </button>
          </div>
        </div>
        <span className="text-sm text-orange-600 font-medium">Switch content language</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6">
        {/* Left Column - Page Details */}
        <div className="xl:col-span-1 lg:col-span-1 space-y-6">
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
                  placeholder={currentLanguage === 'fr' ? 'MEMOPYK – Films & albums souvenirs à partir de vos photos et vidéos' : 'MEMOPYK – Unique memory films & albums from your photos and videos'}
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
                  placeholder={currentLanguage === 'fr' ? 'MEMOPYK transforme vos photos et vidéos en albums et films souvenirs uniques. Un service 100 % humain, créatif et inspirant.' : 'MEMOPYK turns your photos and videos into unique souvenir films and albums. A fully human, creative, and inspiring service.'}
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
                  placeholder={currentLanguage === 'fr' ? '/fr-FR' : '/en-US'}
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Current route: <span className="font-mono text-orange-600">
                    {currentLanguage === 'fr' 
                      ? (formState.urlSlugFr || '/fr-FR') 
                      : (formState.urlSlugEn || '/en-US')
                    }
                  </span>
                </p>
              </div>

              {/* Search Engine Controls */}
              <div className="space-y-4" key={`controls-${formState.robotsIndex}-${formState.robotsFollow}`}>
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Index switch clicked:', !formState.robotsIndex);
                        setFormState(prev => ({ ...prev, robotsIndex: !prev.robotsIndex }));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                        formState.robotsIndex ? 'bg-orange-500' : 'bg-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          formState.robotsIndex ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-sm font-medium cursor-pointer" onClick={() => {
                      console.log('Index label clicked');
                      setFormState(prev => ({ ...prev, robotsIndex: !prev.robotsIndex }));
                    }}>
                      Allow search engine indexing 
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${
                        formState.robotsIndex 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {formState.robotsIndex ? 'INDEX' : 'NOINDEX'}
                      </span>
                    </Label>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {formState.robotsIndex 
                        ? 'Search engines will include this page in search results' 
                        : 'Search engines will NOT show this page in search results'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Follow switch clicked:', !formState.robotsFollow);
                        setFormState(prev => ({ ...prev, robotsFollow: !prev.robotsFollow }));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                        formState.robotsFollow ? 'bg-orange-500' : 'bg-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          formState.robotsFollow ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-sm font-medium cursor-pointer" onClick={() => {
                      console.log('Follow label clicked');
                      setFormState(prev => ({ ...prev, robotsFollow: !prev.robotsFollow }));
                    }}>
                      Allow link following
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${
                        formState.robotsFollow 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {formState.robotsFollow ? 'FOLLOW' : 'NOFOLLOW'}
                      </span>
                    </Label>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {formState.robotsFollow 
                        ? 'Search engines will follow links on this page to discover other pages' 
                        : 'Search engines will NOT follow links on this page'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Tip:</strong> Keep both options enabled for maximum search visibility. Only disable if you want to hide this page from search engines.
                  </p>
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
                placeholder='<meta property="og:image" content="https://memopyk.com/logo.svg"/>&#10;<meta property="og:site_name" content="MEMOPYK"/>&#10;<meta name="author" content="MEMOPYK"/>'
                rows={4}
                className="font-mono text-sm"
              />
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
        <div className="xl:col-span-3 lg:col-span-2 space-y-6">
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
                    <div className="text-xs text-gray-700 dark:text-gray-300">
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