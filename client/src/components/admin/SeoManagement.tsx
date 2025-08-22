import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  RefreshCw, 
  Globe, 
  Search, 
  FileText, 
  Link, 
  Code,
  Settings,
  Eye,
  Download
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SeoSettings {
  id?: string;
  page: string;
  metaTitleEn: string;
  metaTitleFr: string;
  metaDescriptionEn: string;
  metaDescriptionFr: string;
  urlSlugEn: string;
  urlSlugFr: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  customMetaTags?: string;
  keywords?: string;
  canonicalUrl?: string;
  openGraphImage?: string;
}

interface GlobalSettings {
  robotsTxt?: string;
  sitemap?: string;
  googleAnalyticsId?: string;
  googleSearchConsoleId?: string;
}

const SUPPORTED_PAGES = [
  { value: 'home', labelEn: 'Homepage', labelFr: 'Page d\'accueil' },
  { value: 'gallery', labelEn: 'Gallery', labelFr: 'Galerie' },
  { value: 'about', labelEn: 'About Us', labelFr: 'À propos' },
  { value: 'contact', labelEn: 'Contact', labelFr: 'Contact' },
  { value: 'legal', labelEn: 'Legal', labelFr: 'Mentions légales' },
  { value: 'privacy', labelEn: 'Privacy Policy', labelFr: 'Politique de confidentialité' },
];

const SeoManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPage, setSelectedPage] = useState<string>('home');
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'fr'>('en');
  const [customMetaTags, setCustomMetaTags] = useState<string>('');
  const [showRobotsDialog, setShowRobotsDialog] = useState<boolean>(false);
  const [robotsContent, setRobotsContent] = useState<string>('');
  const [showViewRobotsDialog, setShowViewRobotsDialog] = useState<boolean>(false);
  const [viewRobotsContent, setViewRobotsContent] = useState<string>('');

  // Fetch SEO settings for all pages
  const { data: seoData, isLoading } = useQuery({
    queryKey: ['/api/seo/settings'],
    enabled: true
  });

  // Fetch global settings
  const { data: globalData } = useQuery({
    queryKey: ['/api/seo/global'],
    enabled: true
  });

  // Mutations
  const saveSeoMutation = useMutation({
    mutationFn: async (settings: Partial<SeoSettings>) => {
      const response = await fetch('/api/seo/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, page: selectedPage })
      });
      if (!response.ok) throw new Error('Failed to save SEO settings');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "SEO settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/settings'] });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to save SEO settings", 
        variant: "destructive" 
      });
    }
  });

  const updateGlobalMutation = useMutation({
    mutationFn: async (settings: Partial<GlobalSettings>) => {
      const response = await fetch('/api/seo/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to update global settings');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Global settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/global'] });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update global settings", 
        variant: "destructive" 
      });
    }
  });

  // Get current settings for the selected page
  const allSettings = Array.isArray(seoData) ? seoData : [];
  const currentSettings = allSettings.find((s: SeoSettings) => s.page === selectedPage) || {};
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
          prev[key as keyof typeof prev] !== newFormState[key as keyof typeof newFormState]
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading SEO settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO Management
          </CardTitle>
          <CardDescription>
            Manage meta tags, URLs, and search engine settings for all pages
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Page & Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Page & Language Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Page</Label>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_PAGES.map(page => (
                    <SelectItem key={page.value} value={page.value}>
                      {currentLanguage === 'fr' ? page.labelFr : page.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <div className="flex space-x-2">
                <Button
                  variant={currentLanguage === 'en' ? 'default' : 'outline'}
                  onClick={() => setCurrentLanguage('en')}
                  size="sm"
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-1" />
                  English
                </Button>
                <Button
                  variant={currentLanguage === 'fr' ? 'default' : 'outline'}
                  onClick={() => setCurrentLanguage('fr')}
                  size="sm"
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-1" />
                  Français
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            {SUPPORTED_PAGES.find(p => p.value === selectedPage)?.[currentLanguage === 'fr' ? 'labelFr' : 'labelEn']} - {currentLanguage === 'fr' ? 'Français' : 'English'}
          </CardTitle>
          <CardDescription>
            Configure SEO settings for this page in {currentLanguage === 'fr' ? 'French' : 'English'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Meta Title */}
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input
                value={currentLanguage === 'fr' ? formState.metaTitleFr : formState.metaTitleEn}
                onChange={(e) => {
                  const field = currentLanguage === 'fr' ? 'metaTitleFr' : 'metaTitleEn';
                  setFormState(prev => ({ ...prev, [field]: e.target.value }));
                }}
                placeholder={`Meta title in ${currentLanguage === 'fr' ? 'French' : 'English'}`}
                maxLength={60}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Recommended: 50-60 characters
              </p>
            </div>

            {/* Meta Description */}
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={currentLanguage === 'fr' ? formState.metaDescriptionFr : formState.metaDescriptionEn}
                onChange={(e) => {
                  const field = currentLanguage === 'fr' ? 'metaDescriptionFr' : 'metaDescriptionEn';
                  setFormState(prev => ({ ...prev, [field]: e.target.value }));
                }}
                placeholder={`Meta description in ${currentLanguage === 'fr' ? 'French' : 'English'}`}
                maxLength={155}
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

            {/* Search Engine Controls - WORKING CHECKBOXES */}
            <div className="space-y-4" key={`checkboxes-${formState.robotsIndex}-${formState.robotsFollow}`}>
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="robotsIndex"
                    checked={formState.robotsIndex}
                    onChange={(e) => {
                      console.log('Index checkbox changed:', e.target.checked);
                      const newValue = e.target.checked;
                      setFormState(prev => {
                        const updated = { ...prev, robotsIndex: newValue };
                        console.log('Updated state:', updated);
                        return updated;
                      });
                    }}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <label htmlFor="robotsIndex" className="cursor-pointer flex-1">
                    <div className="font-medium">Allow search engine indexing</div>
                    <div className="text-sm text-gray-600">
                      Status: <span className="font-semibold">
                        {formState.robotsIndex ? 'ENABLED - Search engines will index this page' : 'DISABLED - Search engines will NOT index this page'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="robotsFollow"
                    checked={formState.robotsFollow}
                    onChange={(e) => {
                      console.log('Follow checkbox changed:', e.target.checked);
                      const newValue = e.target.checked;
                      setFormState(prev => {
                        const updated = { ...prev, robotsFollow: newValue };
                        console.log('Updated state:', updated);
                        return updated;
                      });
                    }}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <label htmlFor="robotsFollow" className="cursor-pointer flex-1">
                    <div className="font-medium">Allow link following</div>
                    <div className="text-sm text-gray-600">
                      Status: <span className="font-semibold">
                        {formState.robotsFollow ? 'ENABLED - Search engines will follow links on this page' : 'DISABLED - Search engines will NOT follow links on this page'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
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

      {/* Robots.txt Dialog */}
      <Dialog open={showRobotsDialog} onOpenChange={setShowRobotsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit robots.txt</DialogTitle>
            <DialogDescription>
              Configure which parts of your site search engines can access
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={robotsContent}
            onChange={(e) => setRobotsContent(e.target.value)}
            placeholder="User-agent: *&#10;Disallow: /private/&#10;Allow: /public/"
            rows={8}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRobotsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveRobotsTxt}>
              Save robots.txt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Robots.txt Dialog */}
      <Dialog open={showViewRobotsDialog} onOpenChange={setShowViewRobotsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Current robots.txt</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {viewRobotsContent || 'No robots.txt content found'}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowViewRobotsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeoManagement;