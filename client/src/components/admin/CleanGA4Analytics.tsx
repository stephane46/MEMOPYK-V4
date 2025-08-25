import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Play, Users, Clock, RefreshCw, Globe, Eye, UserCheck, MapPin, Languages, MousePointer, X } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { formatFrenchDateTime } from '@/utils/date-format';

// Comprehensive language mapping with flags for 100+ languages
const LANGUAGE_MAP: Record<string, { display: string; flag: string }> = {
  // Major languages
  'en': { display: 'English', flag: '🇺🇸' },
  'fr': { display: 'Français', flag: '🇫🇷' },
  'es': { display: 'Español', flag: '🇪🇸' },
  'de': { display: 'Deutsch', flag: '🇩🇪' },
  'it': { display: 'Italiano', flag: '🇮🇹' },
  'pt': { display: 'Português', flag: '🇵🇹' },
  'ru': { display: 'Русский', flag: '🇷🇺' },
  'zh': { display: '中文', flag: '🇨🇳' },
  'ja': { display: '日本語', flag: '🇯🇵' },
  'ko': { display: '한국어', flag: '🇰🇷' },
  'ar': { display: 'العربية', flag: '🇸🇦' },
  'hi': { display: 'हिन्दी', flag: '🇮🇳' },
  
  // European languages
  'no': { display: 'Norwegian', flag: '🇳🇴' },
  'nb': { display: 'Norwegian', flag: '🇳🇴' },
  'nn': { display: 'Norwegian', flag: '🇳🇴' },
  'sv': { display: 'Svenska', flag: '🇸🇪' },
  'da': { display: 'Dansk', flag: '🇩🇰' },
  'nl': { display: 'Nederlands', flag: '🇳🇱' },
  'fi': { display: 'Suomi', flag: '🇫🇮' },
  'pl': { display: 'Polski', flag: '🇵🇱' },
  'cs': { display: 'Čeština', flag: '🇨🇿' },
  'sk': { display: 'Slovenčina', flag: '🇸🇰' },
  'hu': { display: 'Magyar', flag: '🇭🇺' },
  'ro': { display: 'Română', flag: '🇷🇴' },
  'bg': { display: 'Български', flag: '🇧🇬' },
  'hr': { display: 'Hrvatski', flag: '🇭🇷' },
  'sr': { display: 'Српски', flag: '🇷🇸' },
  'sl': { display: 'Slovenščina', flag: '🇸🇮' },
  'et': { display: 'Eesti', flag: '🇪🇪' },
  'lv': { display: 'Latviešu', flag: '🇱🇻' },
  'lt': { display: 'Lietuvių', flag: '🇱🇹' },
  'el': { display: 'Ελληνικά', flag: '🇬🇷' },
  'tr': { display: 'Türkçe', flag: '🇹🇷' },
  'uk': { display: 'Українська', flag: '🇺🇦' },
  'be': { display: 'Беларуская', flag: '🇧🇾' },
  'is': { display: 'Íslenska', flag: '🇮🇸' },
  'mt': { display: 'Malti', flag: '🇲🇹' },
  'ga': { display: 'Gaeilge', flag: '🇮🇪' },
  'cy': { display: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  'eu': { display: 'Euskera', flag: '🇪🇸' },
  'ca': { display: 'Català', flag: '🇪🇸' },
  'gl': { display: 'Galego', flag: '🇪🇸' },
  
  // Asian languages
  'th': { display: 'ไทย', flag: '🇹🇭' },
  'vi': { display: 'Tiếng Việt', flag: '🇻🇳' },
  'id': { display: 'Bahasa Indonesia', flag: '🇮🇩' },
  'ms': { display: 'Bahasa Melayu', flag: '🇲🇾' },
  'tl': { display: 'Filipino', flag: '🇵🇭' },
  'my': { display: 'မြန်မာ', flag: '🇲🇲' },
  'km': { display: 'ខ្មែរ', flag: '🇰🇭' },
  'lo': { display: 'ລາວ', flag: '🇱🇦' },
  'ka': { display: 'ქართული', flag: '🇬🇪' },
  'hy': { display: 'Հայերեն', flag: '🇦🇲' },
  'az': { display: 'Azərbaycan', flag: '🇦🇿' },
  'kk': { display: 'Қазақ', flag: '🇰🇿' },
  'ky': { display: 'Кыргыз', flag: '🇰🇬' },
  'uz': { display: 'Oʻzbek', flag: '🇺🇿' },
  'tk': { display: 'Türkmen', flag: '🇹🇲' },
  'tg': { display: 'Тоҷикӣ', flag: '🇹🇯' },
  'mn': { display: 'Монгол', flag: '🇲🇳' },
  'ne': { display: 'नेपाली', flag: '🇳🇵' },
  'si': { display: 'සිංහල', flag: '🇱🇰' },
  'bn': { display: 'বাংলা', flag: '🇧🇩' },
  'ur': { display: 'اردو', flag: '🇵🇰' },
  'fa': { display: 'فارسی', flag: '🇮🇷' },
  'ps': { display: 'پښتو', flag: '🇦🇫' },
  'he': { display: 'עברית', flag: '🇮🇱' },
  
  // African languages
  'sw': { display: 'Kiswahili', flag: '🇰🇪' },
  'am': { display: 'አማርኛ', flag: '🇪🇹' },
  'ha': { display: 'Hausa', flag: '🇳🇬' },
  'yo': { display: 'Yorùbá', flag: '🇳🇬' },
  'ig': { display: 'Igbo', flag: '🇳🇬' },
  'zu': { display: 'isiZulu', flag: '🇿🇦' },
  'xh': { display: 'isiXhosa', flag: '🇿🇦' },
  'af': { display: 'Afrikaans', flag: '🇿🇦' },
  
  // American languages
  'qu': { display: 'Quechua', flag: '🇵🇪' },
  'gn': { display: 'Guaraní', flag: '🇵🇾' },
  
  // Others
  'eo': { display: 'Esperanto', flag: '🌍' },
  'la': { display: 'Latin', flag: '🇻🇦' },
  'jv': { display: 'Basa Jawa', flag: '🇮🇩' },
  'su': { display: 'Basa Sunda', flag: '🇮🇩' },
  'ceb': { display: 'Cebuano', flag: '🇵🇭' },
  'mg': { display: 'Malagasy', flag: '🇲🇬' },
  'haw': { display: 'ʻŌlelo Hawaiʻi', flag: '🇺🇸' },
  'mi': { display: 'Te Reo Māori', flag: '🇳🇿' },
  'sm': { display: 'Gagana Samoa', flag: '🇼🇸' },
  'to': { display: 'Lea Fakatonga', flag: '🇹🇴' },
  'fj': { display: 'Vosa Vakaviti', flag: '🇫🇯' }
};

// Language formatting utility with comprehensive mapping
const formatLanguage = (langCode: string): { display: string; flag: string; variant: 'default' | 'secondary' } => {
  if (!langCode) return { display: 'Unknown', flag: '🌐', variant: 'secondary' };
  
  const code = langCode.toLowerCase().split(/[-_]/)[0]; // Get base language code
  
  // Check comprehensive mapping first
  const mapped = LANGUAGE_MAP[code];
  if (mapped) {
    const variant = code === 'fr' ? 'default' : 'secondary';
    return { ...mapped, variant };
  }
  
  // Fallback for unmapped languages
  const cleaned = langCode.replace(/[-_].*/, '').toLowerCase();
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return { display: capitalized, flag: '🌐', variant: 'secondary' };
};

// Site language utility (only French or English)
const formatSiteLanguage = (langName: string): { display: string; flag: string } => {
  const name = langName.toLowerCase();
  if (name === 'french' || name.includes('fr')) return { display: 'Français', flag: '🇫🇷' };
  return { display: 'English', flag: '🇺🇸' };
};

interface GA4MetricsResponse {
  // Visitor Analytics
  totalViews: number;
  uniqueVisitors: number;
  returnVisitors: number;
  averageSessionDuration: number;
  activeVisitors: number;
  // Video Analytics  
  totalVideoStarts: number;
  totalCompletions: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  completionRate: number;
  // Geographic Data
  topCountries: Array<{
    country: string;
    visitors: number;
    flag: string;
  }>;
  // Language & Traffic
  languageBreakdown: Array<{
    language: string;
    visitors: number;
    percentage: number;
  }>;
  siteLanguageChoice: Array<{
    language: string;
    visitors: number;
    percentage: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    visitors: number;
  }>;
  // Video Performance
  topVideos: Array<{
    videoId: string;
    videoTitle: string;
    plays: number;
    completions: number;
  }>;
}

interface RecentVisitor {
  ip_address: string;
  country: string;
  country_code?: string;
  city?: string;
  region?: string;
  language: string;
  last_visit: string;
  user_agent: string;
  visit_count?: number;
  session_duration?: number;
  previous_visit?: string;
}

export default function CleanGA4Analytics() {
  const [dateRange, setDateRange] = useState('90d'); // Match the filter default
  const [locale, setLocale] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReturningModalOpen, setIsReturningModalOpen] = useState(false);

  // Comprehensive GA4 + visitor analytics data fetch
  const { data: ga4Data, isLoading, error, refetch } = useQuery<GA4MetricsResponse>({
    queryKey: ['ga4-clean-comprehensive', dateRange, locale],
    queryFn: async () => {
      const params = new URLSearchParams({
        range: dateRange,
        locale: locale
      });
      
      const response = await fetch(`/api/ga4/clean-comprehensive?${params}`);
      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time data
    refetchInterval: 5 * 60 * 1000, // 5 minutes auto-refresh
  });

  // Fetch recent visitors for modal
  const { data: recentVisitors } = useQuery<RecentVisitor[]>({
    queryKey: ['/api/analytics/recent-visitors'],
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    enabled: isModalOpen, // Only fetch when modal is open
  });

  // Fetch returning visitors for modal
  const { data: returningVisitors } = useQuery<RecentVisitor[]>({
    queryKey: ['/api/analytics/returning-visitors'],
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    enabled: isReturningModalOpen, // Only fetch when modal is open
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (rate: number) => `${Math.round(rate * 100)}%`;

  // Modal handling
  const handleModalOpen = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);
  const handleReturningModalOpen = () => setIsReturningModalOpen(true);
  const handleReturningModalClose = () => setIsReturningModalOpen(false);

  // ESC key handler for modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isModalOpen) handleModalClose();
        if (isReturningModalOpen) handleReturningModalClose();
      }
    };

    if (isModalOpen || isReturningModalOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen, isReturningModalOpen]);

  // Helper functions for visitor data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 5) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return formatFrenchDateTime(date);
    } catch (error) {
      return 'Just now';
    }
  };

  const formatSessionDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Comprehensive Analytics (Clean)
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Visitor analytics, video engagement, and geographic insights
          </p>
        </div>
        
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateRange">Time Period</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="locale">Language</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="fr-FR">Français</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading GA4 data...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-6">
            <div className="text-red-600 dark:text-red-400">
              <h3 className="font-semibold">Error loading GA4 data</h3>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visitor Overview Metrics */}
      {ga4Data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalViews.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Page views across site
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-transform hover:scale-105 relative"
              onClick={handleModalOpen}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{ga4Data.uniqueVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Distinct visitors (IP-based)
                </p>
                <Eye className="absolute bottom-2 right-2 h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-transform hover:scale-105 relative"
              onClick={handleReturningModalOpen}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Return Visitors</CardTitle>
                <UserCheck className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{ga4Data.returnVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Returning visitors
                </p>
                <Eye className="absolute bottom-2 right-2 h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                <MousePointer className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.activeVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Currently browsing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Video Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Video Plays</CardTitle>
                <Play className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalVideoStarts.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Total video starts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(ga4Data.averageSessionDuration)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Time on site
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Video Completions</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalCompletions.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Videos finished
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(ga4Data.completionRate)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Video engagement
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Top Countries</span>
              </CardTitle>
              <CardDescription>Where your visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-w-md">
                {ga4Data.topCountries?.map((country, index) => (
                  <div key={country.country} className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                      {index + 1}
                    </div>
                    <CountryFlag country={country.country} size={24} />
                    <span className="font-medium flex-1">{country.country}</span>
                    <div className="font-semibold text-right min-w-[3rem]">{(country.visitors || 0).toLocaleString()}</div>
                  </div>
                )) || <p className="text-gray-500">No geographic data available</p>}
              </div>
            </CardContent>
          </Card>

          {/* Language & Traffic Sources */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Languages className="h-5 w-5" />
                  <span>Language Analysis</span>
                </CardTitle>
                <CardDescription>Site language choice vs browser language</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Column 1: Site Language */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                      Site Language Choice
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">Which MEMOPYK version they chose</p>
                    <div className="space-y-2">
                      {ga4Data.siteLanguageChoice?.map((lang) => {
                        // Debug: Log the site language choice data
                        console.log('🔍 SITE LANGUAGE CHOICE DEBUG:', lang);
                        const siteInfo = formatSiteLanguage(lang.language);
                        console.log('🔍 SITE LANGUAGE FORMAT RESULT:', siteInfo);
                        const isFrench = lang.language.toLowerCase() === 'french' || lang.language.toLowerCase().includes('fr');
                        return (
                          <div key={`site-${lang.language}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant={isFrench ? 'default' : 'secondary'}>
                                {siteInfo.flag} {siteInfo.display}
                              </Badge>
                              <span className="text-xs text-gray-600">{lang.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="text-sm font-semibold">{(lang.visitors || 0).toLocaleString()}</div>
                          </div>
                        );
                      }) || <p className="text-xs text-gray-500">No site language data</p>}
                    </div>
                  </div>

                  {/* Column 2: Browser Language */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                      Browser Language
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">Visitor's browser language setting</p>
                    <div className="space-y-2">
                      {ga4Data.languageBreakdown?.map((lang) => {
                        const browserInfo = formatLanguage(lang.language);
                        return (
                          <div key={`browser-${lang.language}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant={browserInfo.variant}>
                                {browserInfo.flag} {browserInfo.display}
                              </Badge>
                              <span className="text-xs text-gray-600">{lang.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="text-sm font-semibold">{(lang.visitors || 0).toLocaleString()}</div>
                          </div>
                        );
                      }) || <p className="text-xs text-gray-500">No browser language data</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Traffic Sources</span>
                </CardTitle>
                <CardDescription>How visitors found your site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ga4Data.topReferrers?.map((ref, index) => (
                    <div key={ref.referrer || 'direct'} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </div>
                        <span className="font-medium truncate max-w-[200px]">
                          {ref.referrer || 'Direct Traffic'}
                        </span>
                      </div>
                      <div className="font-semibold">{ref.visitors.toLocaleString()}</div>
                    </div>
                  )) || <p className="text-gray-500">No referrer data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Videos */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Videos</CardTitle>
              <CardDescription>Videos ranked by total plays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ga4Data.topVideos.map((video, index) => (
                  <div key={video.videoId} className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{video.videoTitle}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {video.videoId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{video.plays.toLocaleString()} plays</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {video.completions.toLocaleString()} completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Total Watch Time Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Total Watch Time</CardTitle>
              <CardDescription>Accumulated viewing time across all videos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-center py-6">
                {formatDuration(ga4Data.totalWatchTimeSeconds)}
              </div>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Total time viewers spent watching your videos
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Visitors Details Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && handleModalClose()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div 
              className="p-6 border-b border-gray-200 dark:border-gray-700"
              style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #89BAD9 100%)',
                color: '#ffffff'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3" style={{
                  color: '#ffffff'
                }}>
                  <Users style={{ width: '24px', height: '24px' }} />
                  Recent Visitors Details
                </div>
                <button
                  onClick={handleModalClose}
                  className="text-white hover:text-gray-200 transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {recentVisitors && recentVisitors.length > 0 ? (
                <div className="space-y-4">
                  {recentVisitors.map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-sm font-medium">{visitor.country}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Language</span>
                          </div>
                          <Badge variant="outline">
                            {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Last Visit</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(visitor.last_visit)}
                          </div>
                        </div>

                        {visitor.session_duration && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Session</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatSessionDuration(visitor.session_duration)}
                            </div>
                          </div>
                        )}

                        {visitor.visit_count && visitor.visit_count > 1 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <UserCheck className="h-4 w-4 text-indigo-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Visits</span>
                            </div>
                            <Badge variant="secondary">{visitor.visit_count} visits</Badge>
                          </div>
                        )}

                        <div className="lg:col-span-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MousePointer className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900 dark:text-white">IP & Browser</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div className="font-mono">{visitor.ip_address}</div>
                            <div className="text-xs mt-1 truncate" title={visitor.user_agent}>
                              {visitor.user_agent}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Users style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No recent visitors found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Returning Visitors Details Modal */}
      {isReturningModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && handleReturningModalClose()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div 
              className="p-6 border-b border-gray-200 dark:border-gray-700"
              style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #89BAD9 100%)',
                color: '#ffffff'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3" style={{
                  color: '#ffffff'
                }}>
                  <UserCheck style={{ width: '24px', height: '24px' }} />
                  Returning Visitors Details
                </div>
                <button
                  onClick={handleReturningModalClose}
                  className="text-white hover:text-gray-200 transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {returningVisitors && returningVisitors.length > 0 ? (
                <div className="space-y-4">
                  {returningVisitors.map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-sm font-medium">{visitor.country}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Language</span>
                          </div>
                          <Badge variant="outline">
                            {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Last Visit</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(visitor.last_visit)}
                          </div>
                        </div>

                        {visitor.session_duration && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Session</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatSessionDuration(visitor.session_duration)}
                            </div>
                          </div>
                        )}

                        {visitor.visit_count && visitor.visit_count > 1 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <UserCheck className="h-4 w-4 text-indigo-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Return Visits</span>
                            </div>
                            <Badge variant="secondary">{visitor.visit_count} times</Badge>
                          </div>
                        )}

                        {visitor.previous_visit && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Previous Visit</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(visitor.previous_visit)}
                            </div>
                          </div>
                        )}

                        <div className="lg:col-span-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MousePointer className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900 dark:text-white">IP & Browser</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div className="font-mono">{visitor.ip_address}</div>
                            <div className="text-xs mt-1 truncate" title={visitor.user_agent}>
                              {visitor.user_agent}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <UserCheck style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No returning visitors found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}