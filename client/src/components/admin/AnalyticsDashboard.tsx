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
  UserX
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

export function AnalyticsDashboard() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showIpManagement, setShowIpManagement] = useState(false);
  const [newExcludedIp, setNewExcludedIp] = useState('');
  const [newIpComment, setNewIpComment] = useState('');
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
    mutationFn: () => apiRequest('/api/analytics/test-data/generate', 'POST'),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Test Data Generated",
        description: `Added ${result.result.sessions} sessions, ${result.result.views} views, ${result.result.metrics} metrics, ${result.result.visitors} visitors`,
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
    mutationFn: () => apiRequest('/api/analytics/test-data/clear', 'POST'),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Test Data Cleared",
        description: `Removed ${result.result.sessionsRemoved + result.result.viewsRemoved + result.result.metricsRemoved + result.result.visitorsRemoved} test records. Real data preserved.`,
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
          <Button 
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            variant="outline"
          >
            Clear Filters
          </Button>
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
              </div>
            )}
            <Separator />
            
            {/* Test Data Management Section */}
            <div className="mb-8">
              <h4 className="font-medium mb-4">Test Data Management</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Generate realistic test data for demos or clear test data while preserving real analytics
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Button
                  onClick={() => generateTestDataMutation.mutate()}
                  variant="outline"
                  disabled={generateTestDataMutation.isPending}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 justify-start"
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
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
                <div className="font-medium text-blue-800">Test Data Features:</div>
                <ul className="text-blue-700 space-y-1 ml-4">
                  <li>• 75 test sessions with realistic country/city data</li>
                  <li>• 120 video views with completion metrics</li>
                  <li>• 200 performance metrics (page load, API response times)</li>
                  <li>• 25 active visitors for real-time dashboard</li>
                  <li>• All test data marked with TEST_ prefixes and test_data flags</li>
                  <li>• Safe removal preserves all real analytics data</li>
                </ul>
              </div>
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
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(dashboardData?.overview.totalViews || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gallery video views
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(dashboardData?.overview.uniqueVisitors || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Distinct IP addresses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Watch Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(dashboardData?.overview.totalWatchTime || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total engagement time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(dashboardData?.overview.averageSessionDuration || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per visitor session
                </p>
              </CardContent>
            </Card>
          </div>

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
        </>
      )}
    </div>
  );
}