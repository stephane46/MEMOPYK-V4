import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  Users, 
  Eye, 
  Clock, 
  Globe, 
  Video, 
  TrendingUp, 
  Download,
  RefreshCw,
  Settings,
  Activity,
  Shield,
  ShieldX,
  MapPin,
  Ban,
  Plus,
  Trash2,
  UserX,
  RotateCcw,
  MessageSquare,
  X,
  TestTube
} from 'lucide-react';

interface AnalyticsDashboard {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    totalWatchTime: number;
    averageSessionDuration: number;
  };
  topCountries: Array<{ country: string; views: number }>;
  languageBreakdown: Array<{ language: string; views: number }>;
  videoPerformance: Array<{
    video_id: string;
    video_title: string;
    views: number;
    total_watch_time: number;
    average_completion_rate: number;
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

interface AnalyticsSettings {
  excludedIps: string[];
  completionThreshold: number;
  trackingEnabled: boolean;
  dataRetentionDays: number;
}

interface ActiveViewerIp {
  ip_address: string;
  country: string;
  city: string;
  first_seen: string;
  last_activity: string;
  session_count: number;
}

interface TimeSeriesData {
  date: string;
  visitors: number;
  totalViews: number;
  uniqueViews: number;
  countries: number;
  sessions: number;
  viewsPerVisitor: number;
}

export function AnalyticsDashboard() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showIpManagement, setShowIpManagement] = useState(false);
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);
  const [newExcludedIp, setNewExcludedIp] = useState('');
  const [newIpComment, setNewIpComment] = useState('');

  // Query for test data status
  const { data: testDataStatus } = useQuery({
    queryKey: ['/api/analytics/test-data/status'],
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [currentAdminIp, setCurrentAdminIp] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery<AnalyticsDashboard>({
    queryKey: ['/api/analytics/dashboard', dateFrom, dateTo],
    enabled: true
  });

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery<AnalyticsSettings>({
    queryKey: ['/api/analytics/settings'],
    enabled: showSettings || showIpManagement
  });

  // Fetch active viewer IPs
  const { data: activeIps, isLoading: activeIpsLoading } = useQuery<ActiveViewerIp[]>({
    queryKey: ['/api/analytics/active-ips'],
    enabled: showIpManagement
  });

  // Fetch time-series data for charts
  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery<TimeSeriesData[]>({
    queryKey: ['/api/analytics/time-series', dateFrom, dateTo],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<AnalyticsSettings>) => 
      apiRequest('/api/analytics/settings', 'PATCH', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      toast({
        title: "Settings Updated",
        description: "Analytics settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Settings update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update analytics settings.",
        variant: "destructive",
      });
    }
  });

  // Reset data mutation
  const resetDataMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/reset', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Data Reset",
        description: "All analytics data has been reset successfully.",
      });
    },
    onError: (error) => {
      console.error('Reset error:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset analytics data.",
        variant: "destructive",
      });
    }
  });

  // Data clearing mutations with granular control
  const clearSessionsMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/clear/sessions', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Sessions Cleared",
        description: "Analytics sessions data cleared successfully.",
      });
    }
  });

  const clearViewsMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/clear/views', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Views Cleared",
        description: "Analytics views data cleared successfully.",
      });
    }
  });

  const clearRealtimeVisitorsMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/clear/realtime-visitors', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Visitors Cleared",
        description: "Real-time visitors data cleared successfully.",
      });
    }
  });

  const clearPerformanceMetricsMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/clear/performance-metrics', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Performance Data Cleared",
        description: "Performance metrics cleared successfully.",
      });
    }
  });

  const clearEngagementHeatmapMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/clear/engagement-heatmap', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Heatmap Cleared",
        description: "Engagement heatmap data cleared successfully.",
      });
    }
  });

  const clearConversionFunnelMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/clear/conversion-funnel', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Funnel Data Cleared",
        description: "Conversion funnel data cleared successfully.",
      });
    }
  });

  const clearAllDataMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/clear/all', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/active-ips'] });
      toast({
        title: "All Data Cleared",
        description: "All analytics data and settings cleared successfully.",
      });
    },
    onError: (error) => {
      console.error('Clear all data error:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear all analytics data.",
        variant: "destructive",
      });
    }
  });

  // Test Data Management Mutations
  const generateTestDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/analytics/test-data/generate', 'POST');
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/test-data/status'] });
      const result = data.result || data;
      toast({
        title: "Test Data Generated",
        description: `Added ${result.sessions} sessions, ${result.views} views, ${result.metrics} metrics, ${result.visitors} visitors`,
      });
    },
    onError: (error) => {
      console.error('Generate test data error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate test analytics data.",
        variant: "destructive",
      });
    }
  });

  const clearTestDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/analytics/test-data/clear', 'POST');
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('Clear test data response:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/test-data/status'] });
      
      const result = data.result || data;
      const totalRemoved = (result.sessionsRemoved || 0) + (result.viewsRemoved || 0) + (result.metricsRemoved || 0) + (result.visitorsRemoved || 0);
      toast({
        title: "Test Data Cleared",
        description: `Removed ${totalRemoved} test records. Real data preserved.`,
      });
    },
    onError: (error) => {
      console.error('Clear test data error:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear test data.",
        variant: "destructive",
      });
    }
  });

  const clearAllTestDataMutation = useMutation({
    mutationFn: () => apiRequest('/api/analytics/reset', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/test-data/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      toast({
        title: "All Test Data Cleared",
        description: "All test analytics data has been completely cleared.",
      });
    },
    onError: (error) => {
      console.error('Clear all test data error:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear all test data.",
        variant: "destructive",
      });
    }
  });

  // Add excluded IP mutation
  const addExcludedIpMutation = useMutation({
    mutationFn: ({ ipAddress, comment }: { ipAddress: string; comment?: string }) => 
      apiRequest('/api/analytics/exclude-ip', 'POST', { ipAddress, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/active-ips'] });
      setNewExcludedIp('');
      setNewIpComment('');
      toast({
        title: "IP Excluded",
        description: "IP address has been excluded from tracking.",
      });
    },
    onError: (error) => {
      console.error('Exclude IP error:', error);
      toast({
        title: "Exclusion Failed",
        description: "Failed to exclude IP address.",
        variant: "destructive",
      });
    }
  });

  // Update IP comment mutation
  const updateIpCommentMutation = useMutation({
    mutationFn: ({ ipAddress, comment }: { ipAddress: string; comment: string }) => 
      apiRequest(`/api/analytics/exclude-ip/${encodeURIComponent(ipAddress)}/comment`, 'PATCH', { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      setEditingComment(null);
      setTempComment('');
      toast({
        title: "Comment Updated",
        description: "IP comment has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Update comment error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update IP comment.",
        variant: "destructive",
      });
    }
  });

  // Remove excluded IP mutation
  const removeExcludedIpMutation = useMutation({
    mutationFn: (ipAddress: string) => 
      apiRequest(`/api/analytics/exclude-ip/${encodeURIComponent(ipAddress)}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/active-ips'] });
      toast({
        title: "IP Restored",
        description: "IP address has been restored to tracking.",
      });
    },
    onError: (error) => {
      console.error('Remove excluded IP error:', error);
      toast({
        title: "Restore Failed",
        description: "Failed to restore IP address.",
        variant: "destructive",
      });
    }
  });

  // Recalculate historical completions mutation
  const recalculateHistoricalMutation = useMutation({
    mutationFn: (threshold: number) => 
      apiRequest('/api/analytics/recalculate-completions', 'POST', { threshold }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/views'] });
      toast({
        title: "Historical Data Updated",
        description: `Updated ${result.result?.updated || 0} out of ${result.result?.total || 0} historical video views.`,
      });
    },
    onError: (error) => {
      console.error('Recalculate historical error:', error);
      toast({
        title: "Recalculation Failed",
        description: "Failed to recalculate historical completion data.",
        variant: "destructive",
      });
    }
  });

  // Enhanced video analytics queries
  const { data: videoEngagementData, isLoading: engagementLoading } = useQuery({
    queryKey: ['/api/analytics/video-engagement'],
    enabled: true
  });

  const { data: uniqueViewsData, isLoading: uniqueViewsLoading } = useQuery({
    queryKey: ['/api/analytics/unique-views'],
    enabled: true
  });

  const { data: reEngagementData, isLoading: reEngagementLoading, error: reEngagementError } = useQuery({
    queryKey: ['/api/analytics/re-engagement'],
    enabled: true
  });



  // Fetch admin's current IP when IP management panel is opened
  useEffect(() => {
    if (showIpManagement && !currentAdminIp) {
      fetch('https://httpbin.org/ip')
        .then(response => response.json())
        .then(data => setCurrentAdminIp(data.origin))
        .catch(error => console.error('Failed to get current IP:', error));
    }
  }, [showIpManagement, currentAdminIp]);

  // Export data
  const handleExport = (format: 'json' | 'csv') => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    params.append('format', format);
    
    const url = `/api/analytics/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  // Refresh data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    toast({
      title: "Data Refreshed",
      description: "Analytics data has been refreshed.",
    });
  };

  // Format time duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  // Format numbers with proper locale
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  if (dashboardError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load analytics data</p>
              <Button onClick={handleRefresh} variant="outline" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Track gallery video performance and visitor engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)} variant={showAdvancedAnalytics ? "default" : "outline"}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Advanced Analytics
          </Button>
          <Button onClick={() => setShowIpManagement(!showIpManagement)} variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            IP Management
          </Button>
          <Button onClick={() => setShowSettings(!showSettings)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Test Data Status Banner */}
      {(testDataStatus as any)?.status?.hasTestData && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <TestTube className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Test Data Active</h3>
                  <p className="text-sm text-blue-700">
                    Dashboard includes {(testDataStatus as any)?.status?.counts?.total || 0} test records: {' '}
                    {(testDataStatus as any)?.status?.counts?.sessions || 0} sessions, {(testDataStatus as any)?.status?.counts?.views || 0} views, {' '}
                    {(testDataStatus as any)?.status?.counts?.visitors || 0} visitors, {(testDataStatus as any)?.status?.counts?.metrics || 0} metrics
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
                className="text-[#2A4759] border-[#89BAD9] hover:bg-[#F2EBDC]"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Test Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="dateFrom">From:</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="dateTo">To:</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setDateFrom(lastWeek);
                setDateTo(today);
              }}
              variant="outline"
              size="sm"
            >
              Last 7 Days
            </Button>
            <Button 
              onClick={() => {
                const today = new Date();
                const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
                setDateFrom(fourDaysAgo.toISOString().split('T')[0]);
                setDateTo(today.toISOString().split('T')[0]);
              }}
              variant="outline"
              size="sm"
            >
              Last 4 Days
            </Button>
            <Button 
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              variant="outline"
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button onClick={() => handleExport('json')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Analytics Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="text-center py-4">Loading settings...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tracking-enabled">Tracking Enabled</Label>
                  <Switch
                    id="tracking-enabled"
                    checked={settings?.trackingEnabled || false}
                    onCheckedChange={(checked) => 
                      updateSettingsMutation.mutate({ trackingEnabled: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="completion-threshold">Completion Threshold:</Label>
                    <Input
                      id="completion-threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={settings?.completionThreshold || 80}
                      onChange={(e) => 
                        updateSettingsMutation.mutate({ 
                          completionThreshold: parseInt(e.target.value) 
                        })
                      }
                      className="w-20"
                    />
                    <span>%</span>
                  </div>
                  <Button
                    onClick={() => recalculateHistoricalMutation.mutate(settings?.completionThreshold || 80)}
                    variant="outline"
                    size="sm"
                    disabled={recalculateHistoricalMutation.isPending}
                    className="text-[#D67C4A] border-[#D67C4A] hover:bg-[#F2EBDC]"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {recalculateHistoricalMutation.isPending ? 'Recalculating...' : 'Apply to Historical Data'}
                  </Button>
                </div>
              </div>
            )}
            <Separator />
            
            {/* Test Data Management Section */}
            <div className="mb-8">
              <h4 className="font-medium mb-4">Test Data Management</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Generate realistic test data for demos or clear test data while preserving real analytics
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Button
                  onClick={() => generateTestDataMutation.mutate()}
                  variant="outline"
                  disabled={generateTestDataMutation.isPending}
                  className="text-[#2A4759] border-[#89BAD9] hover:bg-[#F2EBDC] justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {generateTestDataMutation.isPending ? 'Generating...' : 'Generate Test Data'}
                </Button>
                
                <Button
                  onClick={() => clearTestDataMutation.mutate()}
                  variant="outline"
                  disabled={clearTestDataMutation.isPending}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50 justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearTestDataMutation.isPending ? 'Clearing...' : 'Clear Test Data Only'}
                </Button>
                
                <Button
                  onClick={() => clearAllTestDataMutation.mutate()}
                  variant="destructive"
                  disabled={clearAllTestDataMutation.isPending}
                  className="justify-start"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {clearAllTestDataMutation.isPending ? 'Clearing All...' : 'Clear All Test Data'}
                </Button>
              </div>
              
              {/* Dynamic Test Data Status */}
              {(testDataStatus as any)?.status?.hasTestData ? (
                <div className="bg-[#F2EBDC] p-4 rounded-lg text-sm space-y-2">
                  <div className="font-medium text-blue-800 flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    Current Test Data Status
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-blue-700">
                        <div className="font-medium">Active Test Records:</div>
                        <ul className="ml-4 space-y-1">
                          <li>• {(testDataStatus as any)?.status?.counts?.sessions || 0} test sessions</li>
                          <li>• {(testDataStatus as any)?.status?.counts?.views || 0} video views</li>
                          <li>• {(testDataStatus as any)?.status?.counts?.metrics || 0} performance metrics</li>
                          <li>• {(testDataStatus as any)?.status?.counts?.visitors || 0} realtime visitors</li>
                        </ul>
                      </div>
                    </div>
                    <div className="text-blue-700">
                      <div className="font-medium">Total: {(testDataStatus as any)?.status?.counts?.total || 0} records</div>
                      <div className="text-xs mt-2">
                        Generated: {(testDataStatus as any)?.status?.lastGenerated ? 
                          new Date((testDataStatus as any).status.lastGenerated).toLocaleString() : 'Unknown'}
                      </div>
                      <div className="text-xs">All marked with TEST_ prefixes and test_data flags</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <div className="font-medium text-gray-700 flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    No Test Data Present
                  </div>
                  <p className="text-gray-600 mt-2">
                    Generate test data to populate the analytics dashboard with realistic demo data including 
                    sessions, video views, performance metrics, and realtime visitors.
                  </p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Production Data Management Section */}
            <div>
              <h4 className="font-medium mb-4">Production Data Management</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Clear specific types of real analytics data or reset everything
              </p>
              
              {/* Granular Clearing Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Button 
                  onClick={() => clearSessionsMutation.mutate()}
                  variant="outline"
                  className="justify-start"
                  disabled={clearSessionsMutation.isPending}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {clearSessionsMutation.isPending ? 'Clearing...' : 'Clear Sessions'}
                </Button>
                
                <Button 
                  onClick={() => clearViewsMutation.mutate()}
                  variant="outline"
                  className="justify-start"
                  disabled={clearViewsMutation.isPending}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {clearViewsMutation.isPending ? 'Clearing...' : 'Clear Video Views'}
                </Button>
                
                <Button 
                  onClick={() => clearRealtimeVisitorsMutation.mutate()}
                  variant="outline"
                  className="justify-start"
                  disabled={clearRealtimeVisitorsMutation.isPending}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {clearRealtimeVisitorsMutation.isPending ? 'Clearing...' : 'Clear Real-time Visitors'}
                </Button>
                
                <Button 
                  onClick={() => clearPerformanceMetricsMutation.mutate()}
                  variant="outline"
                  className="justify-start"
                  disabled={clearPerformanceMetricsMutation.isPending}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {clearPerformanceMetricsMutation.isPending ? 'Clearing...' : 'Clear Performance Data'}
                </Button>
                
                <Button 
                  onClick={() => clearEngagementHeatmapMutation.mutate()}
                  variant="outline"
                  className="justify-start"
                  disabled={clearEngagementHeatmapMutation.isPending}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {clearEngagementHeatmapMutation.isPending ? 'Clearing...' : 'Clear Heatmap Data'}
                </Button>
                
                <Button 
                  onClick={() => clearConversionFunnelMutation.mutate()}
                  variant="outline"
                  className="justify-start"
                  disabled={clearConversionFunnelMutation.isPending}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {clearConversionFunnelMutation.isPending ? 'Clearing...' : 'Clear Funnel Data'}
                </Button>
              </div>
              
              {/* Clear All Data */}
              <Separator className="my-4" />
              <div className="flex justify-between items-center p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h5 className="font-medium text-red-900">Clear All Analytics Data</h5>
                  <p className="text-sm text-red-700">
                    This will permanently delete ALL analytics data and reset settings
                  </p>
                </div>
                <Button 
                  onClick={() => clearAllDataMutation.mutate()}
                  variant="destructive"
                  disabled={clearAllDataMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearAllDataMutation.isPending ? 'Clearing All...' : 'Clear All Data'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IP Management Panel */}
      {showIpManagement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              IP Address Management
            </CardTitle>
            <CardDescription>
              Manage viewer IP addresses and tracking exclusions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active IPs Section */}
            <div>
              <h4 className="font-medium mb-4">Active Viewer IPs</h4>
              {activeIpsLoading ? (
                <div className="text-center py-4">Loading active IPs...</div>
              ) : activeIps?.length ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activeIps.map((ip) => (
                    <div key={ip.ip_address} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-mono text-sm">{ip.ip_address}</div>
                        <div className="text-xs text-muted-foreground">
                          {ip.country}, {ip.city} • {ip.session_count} sessions
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last activity: {new Date(ip.last_activity).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => addExcludedIpMutation.mutate({ ipAddress: ip.ip_address })}
                        variant="outline"
                        size="sm"
                        disabled={addExcludedIpMutation.isPending}
                      >
                        Exclude
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No active viewer IPs found
                </div>
              )}
            </div>

            <Separator />

            {/* Admin IP Management Section */}
            <div>
              <h4 className="font-medium mb-4">Admin IP Management</h4>
              {currentAdminIp ? (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Your Current IP Address</p>
                      <p className="font-mono text-lg text-blue-700">{currentAdminIp}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings?.excludedIps?.some((item: any) => 
                        typeof item === 'string' ? item === currentAdminIp : item.ip === currentAdminIp
                      ) ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Excluded
                          </Badge>
                          <Button
                            onClick={() => removeExcludedIpMutation.mutate(currentAdminIp)}
                            variant="outline"
                            size="sm"
                            disabled={removeExcludedIpMutation.isPending}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            {removeExcludedIpMutation.isPending ? 'Restoring...' : 'Remove Exclusion'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addExcludedIpMutation.mutate({ ipAddress: currentAdminIp })}
                          variant="outline"
                          size="sm"
                          disabled={addExcludedIpMutation.isPending}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          {addExcludedIpMutation.isPending ? 'Excluding...' : 'Exclude from Analytics'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {settings?.excludedIps?.some((item: any) => 
                      typeof item === 'string' ? item === currentAdminIp : item.ip === currentAdminIp
                    ) 
                      ? "Your IP is currently excluded from analytics tracking"
                      : "Your admin activity is currently being tracked in analytics"
                    }
                  </p>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm text-muted-foreground">Loading your IP address...</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Add Excluded IP Section */}
            <div>
              <h4 className="font-medium mb-4">Add Excluded IP</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="192.168.1.1"
                    value={newExcludedIp}
                    onChange={(e) => setNewExcludedIp(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addExcludedIpMutation.mutate({ 
                      ipAddress: newExcludedIp, 
                      comment: newIpComment 
                    })}
                    disabled={!newExcludedIp || addExcludedIpMutation.isPending}
                  >
                    {addExcludedIpMutation.isPending ? 'Adding...' : 'Add'}
                  </Button>
                </div>
                <Input
                  type="text"
                  placeholder="Comment (e.g., 'my PC at home', 'Internet cafe')"
                  value={newIpComment}
                  onChange={(e) => setNewIpComment(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <Separator />

            {/* Excluded IPs Section */}
            <div>
              <h4 className="font-medium mb-4">Excluded IPs</h4>
              {settingsLoading ? (
                <div className="text-center py-4">Loading excluded IPs...</div>
              ) : settings?.excludedIps?.length ? (
                <div className="space-y-3">
                  {settings.excludedIps.map((item: any, index: number) => {
                    const ipAddress = typeof item === 'string' ? item : item.ip;
                    const comment = typeof item === 'string' ? '' : (item.comment || '');
                    const isEditing = editingComment === ipAddress;
                    
                    return (
                      <div key={ipAddress} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium">{ipAddress}</span>
                          <Button
                            onClick={() => removeExcludedIpMutation.mutate(ipAddress)}
                            variant="outline"
                            size="sm"
                            disabled={removeExcludedIpMutation.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                        
                        {/* Comment Section */}
                        <div className="space-y-2">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                placeholder="Enter comment (e.g., 'my PC at home')"
                                value={tempComment}
                                onChange={(e) => setTempComment(e.target.value)}
                                className="flex-1"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    updateIpCommentMutation.mutate({ 
                                      ipAddress, 
                                      comment: tempComment 
                                    });
                                  }
                                }}
                              />
                              <Button
                                onClick={() => updateIpCommentMutation.mutate({ 
                                  ipAddress, 
                                  comment: tempComment 
                                })}
                                size="sm"
                                disabled={updateIpCommentMutation.isPending}
                              >
                                Save
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingComment(null);
                                  setTempComment('');
                                }}
                                variant="outline"
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Comment:</p>
                                <p className="text-sm text-gray-700">
                                  {comment || <span className="italic text-gray-400">No comment</span>}
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  setEditingComment(ipAddress);
                                  setTempComment(comment);
                                }}
                                variant="ghost"
                                size="sm"
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No IPs are currently excluded from tracking
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {dashboardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-100 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Analytics Flow Explanation */}
          <Card className="mb-6 bg-gradient-to-r from-[#F2EBDC] to-[#89BAD9]/20 border-[#89BAD9]/30">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-[#2A4759] mb-2">Analytics Flow</h3>
                  <p className="text-sm text-[#2A4759]/80">Understanding your visitor journey through the metrics below</p>
                </div>
                
                {/* Progress Bar Steps */}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-8 h-8 bg-[#2A4759] rounded-full flex items-center justify-center text-white text-sm font-bold mb-2">1</div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-[#2A4759]">How many people visited</p>
                        <p className="text-xs text-[#2A4759]/70">Unique visitors to your site</p>
                      </div>
                    </div>
                    
                    {/* Arrow 1 */}
                    <div className="flex-shrink-0 mx-4">
                      <div className="w-8 h-0.5 bg-[#D67C4A]"></div>
                      <div className="w-0 h-0 border-l-4 border-l-[#D67C4A] border-t-2 border-t-transparent border-b-2 border-b-transparent ml-auto -mt-1"></div>
                    </div>
                    
                    {/* Step 2 */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-8 h-8 bg-[#2A4759] rounded-full flex items-center justify-center text-white text-sm font-bold mb-2">2</div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-[#2A4759]">What they clicked</p>
                        <p className="text-xs text-[#2A4759]/70">Gallery videos they watched</p>
                      </div>
                    </div>
                    
                    {/* Arrow 2 */}
                    <div className="flex-shrink-0 mx-4">
                      <div className="w-8 h-0.5 bg-[#D67C4A]"></div>
                      <div className="w-0 h-0 border-l-4 border-l-[#D67C4A] border-t-2 border-t-transparent border-b-2 border-b-transparent ml-auto -mt-1"></div>
                    </div>
                    
                    {/* Step 3 */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-8 h-8 bg-[#2A4759] rounded-full flex items-center justify-center text-white text-sm font-bold mb-2">3</div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-[#2A4759]">How long they watched</p>
                        <p className="text-xs text-[#2A4759]/70">Total video engagement time</p>
                      </div>
                    </div>
                    
                    {/* Arrow 3 */}
                    <div className="flex-shrink-0 mx-4">
                      <div className="w-8 h-0.5 bg-[#D67C4A]"></div>
                      <div className="w-0 h-0 border-l-4 border-l-[#D67C4A] border-t-2 border-t-transparent border-b-2 border-b-transparent ml-auto -mt-1"></div>
                    </div>
                    
                    {/* Step 4 */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-8 h-8 bg-[#2A4759] rounded-full flex items-center justify-center text-white text-sm font-bold mb-2">4</div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-[#2A4759]">How long they stayed overall</p>
                        <p className="text-xs text-[#2A4759]/70">Average visit duration</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(dashboardData?.overview.uniqueVisitors || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique people visited
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gallery Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(dashboardData?.overview.totalViews || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Videos clicked & watched
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(dashboardData?.overview.totalWatchTime || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total video engagement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Session Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(dashboardData?.overview.averageSessionDuration || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average visit duration
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Time Series Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Visitor & View Trends
              </CardTitle>
              <CardDescription>
                Daily visitor and view analytics over time
                {dateFrom || dateTo ? (
                  <span className="ml-2 text-sm font-medium text-orange-600">
                    • Filtered: {dateFrom || 'All time'} to {dateTo || 'Now'}
                  </span>
                ) : (
                  <span className="ml-2 text-sm text-muted-foreground">• Showing all available data</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeSeriesLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading chart data...</p>
                  </div>
                </div>
              ) : timeSeriesData?.length ? (
                <div className="space-y-6">
                  {/* Visitors Trend Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Daily Visitors & Sessions
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="date" 
                            fontSize={12}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                            formatter={(value: number, name: string) => [
                              value,
                              name === 'visitors' ? 'Visitors' : 'Sessions'
                            ]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="visitors" 
                            stackId="1"
                            stroke="#ea580c" 
                            fill="#ea580c" 
                            fillOpacity={0.6}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="sessions" 
                            stackId="1"
                            stroke="#f97316" 
                            fill="#f97316" 
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Views Trend Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Daily Video Views
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="date" 
                            fontSize={12}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                            formatter={(value: number, name: string) => [
                              value,
                              name === 'totalViews' ? 'Total Views' : 'Unique Views'
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="totalViews" 
                            stroke="#ea580c" 
                            strokeWidth={2}
                            dot={{ fill: '#ea580c', strokeWidth: 2, r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="uniqueViews" 
                            stroke="#f97316" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#f97316', strokeWidth: 2, r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No time-series data available</p>
                    <p className="text-sm text-muted-foreground">Visitor trends will appear here as data is collected</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Gallery Video Performance
              </CardTitle>
              <CardDescription>
                Performance metrics for gallery videos only
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.videoPerformance?.length ? (
                <div className="space-y-4">
                  {dashboardData.videoPerformance.map((video, index) => (
                    <div key={video.video_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {video.video_title || `Video ${video.video_id}`}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{formatNumber(video.views)} views</span>
                          <span>{formatDuration(video.total_watch_time)} total time</span>
                          <div className="flex items-center gap-2">
                            <span>Completion:</span>
                            <Progress 
                              value={video.average_completion_rate} 
                              className="w-20 h-2"
                            />
                            <span>{Math.round(video.average_completion_rate)}%</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No video performance data available</p>
                  <p className="text-sm">Gallery video views will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Geographic and Language Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.topCountries?.length ? (
                  <div className="space-y-3">
                    {dashboardData.topCountries.map((country, index) => (
                      <div key={country.country} className="flex items-center justify-between">
                        <span className="font-medium">{country.country}</span>
                        <Badge variant="outline">
                          {formatNumber(country.views)} visits
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No geographic data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Language Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.languageBreakdown?.length ? (
                  <div className="space-y-3">
                    {dashboardData.languageBreakdown.map((lang) => (
                      <div key={lang.language} className="flex items-center justify-between">
                        <span className="font-medium">
                          {lang.language === 'fr-FR' ? 'French' : 
                           lang.language === 'en-US' ? 'English' : 
                           lang.language}
                        </span>
                        <Badge variant="outline">
                          {formatNumber(lang.views)} sessions
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No language data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Range Info */}
          {dashboardData?.dateRange && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-sm text-muted-foreground">
                  Data range: {dashboardData.dateRange.from} to {dashboardData.dateRange.to}
                  {!dateFrom && !dateTo && (
                    <span className="ml-2 text-orange-600 font-medium">
                      (Showing all time data)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Analytics Panel */}
          {showAdvancedAnalytics && (
            <div className="space-y-6 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Enhanced Multi-View Analytics</h3>
                <Badge variant="outline" className="text-blue-600 border-blue-600">Advanced</Badge>
              </div>

              {/* Video Engagement Metrics */}
              {(videoEngagementData as any)?.metrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-600" />
                      Video Engagement Metrics
                    </CardTitle>
                    <CardDescription>
                      Comprehensive engagement analysis with total views, unique views, and re-watch behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatNumber((videoEngagementData as any).metrics.totalViews)}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-xs text-muted-foreground">Raw engagement count</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatNumber((videoEngagementData as any).metrics.uniqueViews)}
                        </div>
                        <p className="text-sm text-muted-foreground">Unique Views</p>
                        <p className="text-xs text-muted-foreground">True audience reach</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatNumber((videoEngagementData as any).metrics.reWatchViews)}
                        </div>
                        <p className="text-sm text-muted-foreground">Re-Watch Views</p>
                        <p className="text-xs text-muted-foreground">Additional engagement</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#D67C4A]">
                          {(videoEngagementData as any).metrics.engagementScore}/100
                        </div>
                        <p className="text-sm text-muted-foreground">Engagement Score</p>
                        <p className="text-xs text-muted-foreground">Composite score</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {((videoEngagementData as any).metrics.avgCompletionRate || 0).toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground">Avg Completion Rate</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {((videoEngagementData as any).metrics.bestCompletionRate || 0).toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground">Best Completion Rate</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {formatDuration((videoEngagementData as any).metrics.avgWatchTime || 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Avg Watch Time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Unique Video Views */}
              {(uniqueViewsData as any)?.uniqueViews && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Unique Video Views Analytics
                    </CardTitle>
                    <CardDescription>
                      Session-based grouping distinguishing new viewers vs returning viewers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {((uniqueViewsData as any).uniqueViews || []).slice(0, 10).map((view: any, index: number) => (
                        <div key={`${view.sessionId}-${view.videoId}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{view.videoId}</span>
                              <Badge variant={view.isReWatch ? "default" : "secondary"}>
                                {view.isReWatch ? `${view.reWatchCount} re-watches` : 'Single view'}
                              </Badge>
                              <Badge variant="outline" className={
                                view.engagementLevel === 'high' ? 'text-green-600 border-green-600' :
                                view.engagementLevel === 'medium' ? 'text-yellow-600 border-yellow-600' :
                                'text-gray-600 border-gray-600'
                              }>
                                {view.engagementLevel}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Best: {(view.bestCompletionRate || 0).toFixed(1)}%</span>
                              <span>Watch: {formatDuration(view.totalWatchTime || 0)}</span>
                              <span className="text-xs">Session: {(view.sessionId || '').slice(-8)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {((uniqueViewsData as any).uniqueViews || []).length > 10 && (
                        <div className="text-center text-sm text-muted-foreground py-2">
                          Showing top 10 of {((uniqueViewsData as any).uniqueViews || []).length} unique views
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Re-Engagement Analytics */}
              {(reEngagementData as any)?.reEngagement && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-[#D67C4A]" />
                      Re-Engagement Analytics
                    </CardTitle>
                    <CardDescription>
                      Advanced analysis of viewer re-watching patterns with business recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {((reEngagementData as any).reEngagement || []).map((video: any, index: number) => (
                        <div key={video.videoId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{video.videoId}</h4>
                            <Badge variant="outline" className={
                              video.engagementLevel === 'high' ? 'text-green-600 border-green-600' :
                              video.engagementLevel === 'medium' ? 'text-yellow-600 border-yellow-600' :
                              'text-gray-600 border-gray-600'
                            }>
                              {video.engagementLevel} engagement
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-lg font-semibold">{formatNumber(video.totalViews)}</div>
                              <p className="text-xs text-muted-foreground">Total Views</p>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{formatNumber(video.uniqueViewers)}</div>
                              <p className="text-xs text-muted-foreground">Unique Viewers</p>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{(video.reWatchRate || 0).toFixed(1)}%</div>
                              <p className="text-xs text-muted-foreground">Re-Watch Rate</p>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{(video.avgViewsPerReWatcher || 0).toFixed(1)}</div>
                              <p className="text-xs text-muted-foreground">Avg Views/Re-Watcher</p>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                            <strong>Business Insight:</strong> {video.businessInsight}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Business Intelligence Guide */}
              <Card className="bg-[#F2EBDC] dark:bg-[#011526] border-[#89BAD9] dark:border-[#2A4759]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Activity className="h-5 w-5" />
                    Business Intelligence Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-blue-700 dark:text-blue-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Marketing Teams:</h4>
                      <p>Use <strong>Total Views</strong> for reach metrics and campaign effectiveness measurement</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Content Teams:</h4>
                      <p>Use <strong>Unique Views + Completion</strong> for content effectiveness and viewer satisfaction</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Strategy Teams:</h4>
                      <p>Use <strong>Re-Watch Rates</strong> for content portfolio optimization and engagement analysis</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Business Teams:</h4>
                      <p>Use <strong>Engagement Scores</strong> for resource allocation and performance-based decisions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}