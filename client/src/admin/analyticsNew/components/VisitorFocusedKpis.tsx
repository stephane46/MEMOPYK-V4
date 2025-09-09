import React, { useState } from 'react';
import { Eye, Users, UserCheck, RotateCcw, X, MapPin, Clock, Languages } from 'lucide-react';
import { useGa4Report } from "../hooks/useGa4Report";
import type { KpisResponse } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';
import { Badge } from '@/components/ui/badge';
import { CountryFlag } from '@/components/admin/CountryFlag';

interface VisitorFocusedKpisProps {
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d";
  className?: string;
  // Add explicit start/end dates to ensure synchronization with main dashboard
  startDate?: string;
  endDate?: string;
}

export function VisitorFocusedKpis({ preset = "7d", className = "", startDate, endDate }: VisitorFocusedKpisProps) {
  const { data, loading, error } = useGa4Report<KpisResponse>({ report: "kpis", preset });
  
  // Modal states
  const [isTotalViewsModalOpen, setIsTotalViewsModalOpen] = useState(false);
  const [isUniqueVisitorsModalOpen, setIsUniqueVisitorsModalOpen] = useState(false);
  const [isReturnVisitorsModalOpen, setIsReturnVisitorsModalOpen] = useState(false);
  
  // Modal data states
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
  const [returningVisitors, setReturningVisitors] = useState<any[]>([]);
  
  // Loading states for modals
  const [isLoadingRecentVisitors, setIsLoadingRecentVisitors] = useState(false);
  const [isLoadingReturningVisitors, setIsLoadingReturningVisitors] = useState(false);

  if (loading) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Error loading visitor metrics"
          description="Unable to fetch visitor analytics data"
          showRetry={true}
        />
      </div>
    );
  }

  if (!data || !data.kpis) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No visitor data available"
          description="No visitor analytics data found for the selected period"
        />
      </div>
    );
  }

  const { totalViews, uniqueVisitors, returnVisitors } = data.kpis;

  // Helper function to calculate date range from preset
  const getDateRangeFromPreset = (preset: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case 'today':
        return {
          startDate: today.toISOString().slice(0, 10),
          endDate: today.toISOString().slice(0, 10)
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          startDate: yesterday.toISOString().slice(0, 10),
          endDate: yesterday.toISOString().slice(0, 10)
        };
      case '7d':
        const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        return {
          startDate: sevenDaysAgo.toISOString().slice(0, 10),
          endDate: today.toISOString().slice(0, 10)
        };
      case '30d':
        const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        return {
          startDate: thirtyDaysAgo.toISOString().slice(0, 10),
          endDate: today.toISOString().slice(0, 10)
        };
      case '90d':
        const ninetyDaysAgo = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000);
        return {
          startDate: ninetyDaysAgo.toISOString().slice(0, 10),
          endDate: today.toISOString().slice(0, 10)
        };
      default:
        const defaultSevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        return {
          startDate: defaultSevenDaysAgo.toISOString().slice(0, 10),
          endDate: today.toISOString().slice(0, 10)
        };
    }
  };

  // Modal handlers
  const handleTotalViewsModalOpen = async () => {
    setIsTotalViewsModalOpen(true);
    setIsLoadingRecentVisitors(true);
    // Fetch recent visitors data using explicit date range (prioritize props over preset)
    try {
      let calcStartDate, calcEndDate;
      if (startDate && endDate) {
        calcStartDate = startDate;
        calcEndDate = endDate;
      } else {
        const dateRange = getDateRangeFromPreset(preset);
        calcStartDate = dateRange.startDate;
        calcEndDate = dateRange.endDate;
      }
      
      const response = await fetch(`/api/private-log/visitor-details?startDate=${calcStartDate}&endDate=${calcEndDate}`);
      const allData = await response.json();
      
      if (allData.length === 0) {
        // Try broader date range as fallback
        console.log(`⚠️ No private log data for ${calcStartDate} to ${calcEndDate}, trying broader range...`);
        
        // Calculate 7-day range around the target date
        const targetDate = new Date(calcEndDate);
        const fallbackStart = new Date(targetDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        const fallbackStartStr = fallbackStart.toISOString().slice(0, 10);
        const fallbackEndStr = calcEndDate;
        
        const fallbackResponse = await fetch(`/api/private-log/visitor-details?startDate=${fallbackStartStr}&endDate=${fallbackEndStr}`);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.length === 0) {
          // Still no data even with broader range
          setRecentVisitors([{
            id: 'no-data',
            ip_address: 'N/A',
            country: 'No private log data available',
            region: `GA4 shows ${totalViews?.value || 0} views for this period`,
            city: 'but private log is empty',
            language: 'N/A',
            last_visit: new Date().toISOString(),
            user_agent: 'Private log tracking may be disabled or delayed',
            visit_count: 0,
            session_duration: 0,
            previous_visit: null,
            source: 'system_message'
          }]);
          return;
        }
        
        // Use fallback data but limit to match GA4 count
        console.log(`✅ Using broader range data (${fallbackData.length} sessions) to match GA4 count`);
        const totalViewsCount = totalViews?.value || 0;
        const limitedData = fallbackData.slice(0, totalViewsCount);
        
        // Add notice that broader period data is being used
        const dataWithNotice = limitedData.map((visitor: any, index: number) => ({
          ...visitor,
          // Add notice to first visitor only
          ...(index === 0 && {
            fallback_notice: `⚠️ Showing recent data (${fallbackStartStr} to ${fallbackEndStr}) - no data for selected date`
          })
        }));
        
        setRecentVisitors(dataWithNotice);
        return;
      }
      
      // Filter to match the Total Views count from GA4 KPIs
      const totalViewsCount = totalViews?.value || 0;
      const limitedData = allData.slice(0, totalViewsCount);
      
      setRecentVisitors(limitedData);
    } catch (error) {
      console.error('Failed to fetch recent visitors:', error);
    } finally {
      setIsLoadingRecentVisitors(false);
    }
  };

  const handleUniqueVisitorsModalOpen = async () => {
    setIsUniqueVisitorsModalOpen(true);
    setIsLoadingRecentVisitors(true);
    // Fetch recent visitors data using explicit date range (prioritize props over preset)
    try {
      let calcStartDate, calcEndDate;
      if (startDate && endDate) {
        calcStartDate = startDate;
        calcEndDate = endDate;
      } else {
        const dateRange = getDateRangeFromPreset(preset);
        calcStartDate = dateRange.startDate;
        calcEndDate = dateRange.endDate;
      }
      
      const response = await fetch(`/api/private-log/visitor-details?startDate=${calcStartDate}&endDate=${calcEndDate}`);
      const allData = await response.json();
      
      if (allData.length === 0) {
        // Try broader date range as fallback
        console.log(`⚠️ No private log data for ${calcStartDate} to ${calcEndDate}, trying broader range...`);
        
        const targetDate = new Date(calcEndDate);
        const fallbackStart = new Date(targetDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        const fallbackStartStr = fallbackStart.toISOString().slice(0, 10);
        const fallbackEndStr = calcEndDate;
        
        const fallbackResponse = await fetch(`/api/private-log/visitor-details?startDate=${fallbackStartStr}&endDate=${fallbackEndStr}`);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.length === 0) {
          setRecentVisitors([{
            id: 'no-data',
            ip_address: 'N/A',
            country: 'No private log data available',
            region: `GA4 shows ${uniqueVisitors?.value || 0} unique visitors for this period`,
            city: 'but private log is empty',
            language: 'N/A',
            last_visit: new Date().toISOString(),
            user_agent: 'Private log tracking may be disabled or delayed',
            visit_count: 0,
            session_duration: 0,
            previous_visit: null,
            source: 'system_message'
          }]);
          return;
        }
        
        // Use fallback data and apply unique visitor logic
        console.log(`✅ Using broader range data (${fallbackData.length} sessions) for unique visitors`);
        const uniqueVisitorsCount = uniqueVisitors?.value || 0;
        const seenIPs = new Set();
        const uniqueData = fallbackData.filter((visitor: any) => {
          if (seenIPs.has(visitor.ip_address)) {
            return false;
          }
          seenIPs.add(visitor.ip_address);
          return true;
        }).slice(0, uniqueVisitorsCount);
        
        // Add notice that broader period data is being used
        const dataWithNotice = uniqueData.map((visitor: any, index: number) => ({
          ...visitor,
          // Add notice to first visitor only
          ...(index === 0 && {
            fallback_notice: `⚠️ Showing recent data (${fallbackStartStr} to ${fallbackEndStr}) - no unique visitor data for selected date`
          })
        }));
        
        setRecentVisitors(dataWithNotice);
        return;
      }
      
      // Filter to show unique visitors only (deduplicate by IP address)
      const uniqueVisitorsCount = uniqueVisitors?.value || 0;
      const seenIPs = new Set();
      const uniqueData = allData.filter((visitor: any) => {
        if (seenIPs.has(visitor.ip_address)) {
          return false;
        }
        seenIPs.add(visitor.ip_address);
        return true;
      }).slice(0, uniqueVisitorsCount);
      
      setRecentVisitors(uniqueData);
    } catch (error) {
      console.error('Failed to fetch recent visitors:', error);
    } finally {
      setIsLoadingRecentVisitors(false);
    }
  };

  const handleReturnVisitorsModalOpen = async () => {
    setIsReturnVisitorsModalOpen(true);
    setIsLoadingReturningVisitors(true);
    // Fetch returning visitors data using explicit date range (prioritize props over preset)
    try {
      let calcStartDate, calcEndDate;
      if (startDate && endDate) {
        calcStartDate = startDate;
        calcEndDate = endDate;
      } else {
        const dateRange = getDateRangeFromPreset(preset);
        calcStartDate = dateRange.startDate;
        calcEndDate = dateRange.endDate;
      }
      
      const response = await fetch(`/api/private-log/visitor-details?startDate=${calcStartDate}&endDate=${calcEndDate}`);
      const allData = await response.json();
      
      if (allData.length === 0) {
        // Try broader date range as fallback
        console.log(`⚠️ No private log data for ${calcStartDate} to ${calcEndDate}, trying broader range...`);
        
        const targetDate = new Date(calcEndDate);
        const fallbackStart = new Date(targetDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        const fallbackStartStr = fallbackStart.toISOString().slice(0, 10);
        const fallbackEndStr = calcEndDate;
        
        const fallbackResponse = await fetch(`/api/private-log/visitor-details?startDate=${fallbackStartStr}&endDate=${fallbackEndStr}`);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.length === 0) {
          setReturningVisitors([{
            id: 'no-data',
            ip_address: 'N/A',
            country: 'No private log data available',
            region: `GA4 shows ${returnVisitors?.value || 0} return visitors for this period`,
            city: 'but private log is empty',
            language: 'N/A',
            last_visit: new Date().toISOString(),
            user_agent: 'Private log tracking may be disabled or delayed',
            visit_count: 0,
            session_duration: 0,
            previous_visit: null,
            source: 'system_message'
          }]);
          return;
        }
        
        // Use fallback data and apply returning visitor logic
        console.log(`✅ Using broader range data (${fallbackData.length} sessions) for return visitors`);
        const returnVisitorsCount = returnVisitors?.value || 0;
        const ipCounts = new Map();
        
        fallbackData.forEach((visitor: any) => {
          const count = ipCounts.get(visitor.ip_address) || 0;
          ipCounts.set(visitor.ip_address, count + 1);
        });
        
        const returningData = fallbackData.filter((visitor: any) => 
          ipCounts.get(visitor.ip_address) > 1
        ).slice(0, returnVisitorsCount);
        
        // Add notice that broader period data is being used
        const dataWithNotice = returningData.map((visitor: any, index: number) => ({
          ...visitor,
          // Add notice to first visitor only
          ...(index === 0 && {
            fallback_notice: `⚠️ Showing recent data (${fallbackStartStr} to ${fallbackEndStr}) - no return visitor data for selected date`
          })
        }));
        
        setReturningVisitors(dataWithNotice);
        return;
      }
      
      // Filter to show returning visitors only (simulate return visitor detection)
      // For now, we'll show visitors that appear multiple times in the dataset
      const returnVisitorsCount = returnVisitors?.value || 0;
      const ipCounts = new Map();
      
      // Count visits per IP
      allData.forEach((visitor: any) => {
        const count = ipCounts.get(visitor.ip_address) || 0;
        ipCounts.set(visitor.ip_address, count + 1);
      });
      
      // Filter visitors that have multiple visits (returning visitors)
      const returningData = allData.filter((visitor: any) => 
        ipCounts.get(visitor.ip_address) > 1
      ).slice(0, returnVisitorsCount);
      
      setReturningVisitors(returningData);
    } catch (error) {
      console.error('Failed to fetch returning visitors:', error);
    } finally {
      setIsLoadingReturningVisitors(false);
    }
  };

  const formatLanguage = (lang: string) => {
    const languageMap: { [key: string]: { flag: string; display: string } } = {
      'fr': { flag: '🇫🇷', display: 'French' },
      'fr-FR': { flag: '🇫🇷', display: 'French' },
      'fr-fr': { flag: '🇫🇷', display: 'French' },
      'en': { flag: '🇺🇸', display: 'English' },
      'en-US': { flag: '🇺🇸', display: 'English (US)' },
      'en-us': { flag: '🇺🇸', display: 'English (US)' },
      'en-GB': { flag: '🇬🇧', display: 'English (UK)' }
    };
    return languageMap[lang] || { flag: '🌐', display: lang || 'Unknown' };
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  return (
    <>
      <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
        <VisitorKpiCard 
          label="Total Views" 
          value={totalViews?.value || 0}
          trend={totalViews?.trend || []}
          icon={Eye}
          color="blue"
          onDetailClick={handleTotalViewsModalOpen}
          change={totalViews?.change || 0}
          description="Page views across site"
          data-testid="kpi-total-views"
        />
        <VisitorKpiCard 
          label="Unique Visitors" 
          value={uniqueVisitors?.value || 0}
          trend={uniqueVisitors?.trend || []}
          icon={Users}
          color="green"
          onDetailClick={handleUniqueVisitorsModalOpen}
          change={uniqueVisitors?.change || 0}
          description="Distinct visitors (IP-based)"
          data-testid="kpi-unique-visitors"
        />
        <VisitorKpiCard 
          label="Return Visitors" 
          value={returnVisitors?.value || 0}
          trend={returnVisitors?.trend || []}
          icon={RotateCcw}
          color="purple"
          onDetailClick={handleReturnVisitorsModalOpen}
          change={returnVisitors?.change || 0}
          description="Returning visitors"
          data-testid="kpi-return-visitors"
        />
      </div>

      {/* Total Views Modal */}
      {isTotalViewsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setIsTotalViewsModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div 
              className="p-6 border-b border-gray-200"
              style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #89BAD9 100%)',
                color: '#ffffff'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye style={{ width: '24px', height: '24px' }} />
                  <span>Total Views Details</span>
                  {(() => {
                    const missingCount = recentVisitors.filter(visitor => 
                      !visitor.country || visitor.country === 'Unknown' || 
                      !visitor.city || visitor.city === 'Unknown'
                    ).length;
                    
                    return missingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full ml-3">
                        🏴‍☠️ {missingCount} pending
                      </span>
                    ) : recentVisitors.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full ml-3">
                        ✅ All enriched
                      </span>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => setIsTotalViewsModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Fallback Notice Banner */}
              {recentVisitors && recentVisitors.length > 0 && recentVisitors[0]?.fallback_notice && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="text-orange-600">⚠️</div>
                    <div className="text-sm text-orange-800">
                      <strong>Data from broader period:</strong> No private log data found for the selected date.
                      Showing recent visitor data from a 7-day range to match GA4 metrics.
                    </div>
                  </div>
                </div>
              )}
              
              {isLoadingRecentVisitors ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p style={{ margin: 0 }}>Fetching visitor data...</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>This may take up to 30 seconds</p>
                  </div>
                </div>
              ) : recentVisitors && recentVisitors.length > 0 ? (
                <div className="space-y-4">
                  {recentVisitors.slice(0, 50).map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-sm font-medium">{visitor.country || 'Unknown'}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900">Language</span>
                          </div>
                          <Badge variant="outline">
                            {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900">Visit Time</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {getRelativeTime(visitor.last_visit || visitor.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Eye style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No recent views found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unique Visitors Modal */}
      {isUniqueVisitorsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setIsUniqueVisitorsModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div 
              className="p-6 border-b border-gray-200"
              style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #89BAD9 100%)',
                color: '#ffffff'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users style={{ width: '24px', height: '24px' }} />
                  <span>Unique Visitors Details</span>
                  {(() => {
                    const missingCount = recentVisitors.filter(visitor => 
                      !visitor.country || visitor.country === 'Unknown' || 
                      !visitor.city || visitor.city === 'Unknown'
                    ).length;
                    
                    return missingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full ml-3">
                        🏴‍☠️ {missingCount} pending
                      </span>
                    ) : recentVisitors.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full ml-3">
                        ✅ All enriched
                      </span>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => setIsUniqueVisitorsModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Fallback Notice Banner */}
              {recentVisitors && recentVisitors.length > 0 && recentVisitors[0]?.fallback_notice && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="text-orange-600">⚠️</div>
                    <div className="text-sm text-orange-800">
                      <strong>Data from broader period:</strong> No private log data found for the selected date.
                      Showing recent visitor data from a 7-day range to match GA4 metrics.
                    </div>
                  </div>
                </div>
              )}
              
              {isLoadingRecentVisitors ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    <p style={{ margin: 0 }}>Fetching visitor data...</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>This may take up to 30 seconds</p>
                  </div>
                </div>
              ) : recentVisitors && recentVisitors.length > 0 ? (
                <div className="space-y-4">
                  {recentVisitors.slice(0, 50).map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-sm font-medium">{visitor.country || 'Unknown'}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900">Language</span>
                          </div>
                          <Badge variant="outline">
                            {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900">First Visit</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {getRelativeTime(visitor.last_visit || visitor.created_at)}
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
                    <p style={{ margin: 0 }}>No unique visitors found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Visitors Modal */}
      {isReturnVisitorsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setIsReturnVisitorsModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div 
              className="p-6 border-b border-gray-200"
              style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #89BAD9 100%)',
                color: '#ffffff'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck style={{ width: '24px', height: '24px' }} />
                  <span>Return Visitors Details</span>
                  {(() => {
                    const missingCount = returningVisitors.filter(visitor => 
                      !visitor.country || visitor.country === 'Unknown' || 
                      !visitor.city || visitor.city === 'Unknown'
                    ).length;
                    
                    return missingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full ml-3">
                        🏴‍☠️ {missingCount} pending
                      </span>
                    ) : returningVisitors.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full ml-3">
                        ✅ All enriched
                      </span>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => setIsReturnVisitorsModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {isLoadingReturningVisitors ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    <p style={{ margin: 0 }}>Fetching visitor data...</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>This may take up to 30 seconds</p>
                  </div>
                </div>
              ) : returningVisitors && returningVisitors.length > 0 ? (
                <div className="space-y-4">
                  {returningVisitors.map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-sm font-medium">{visitor.country || 'Unknown'}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900">Language</span>
                          </div>
                          <Badge variant="outline">
                            {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900">Last Visit</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {getRelativeTime(visitor.last_visit)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {visitor.visit_count} visits total
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
    </>
  );
}

interface VisitorKpiCardProps {
  label: string;
  value: number;
  trend?: Array<{ date: string; value: number }>;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onDetailClick: () => void;
  change: number; // Percentage change vs previous period
  description: string; // Descriptive text under the value
  'data-testid'?: string;
}

function VisitorKpiCard({ 
  label, 
  value, 
  trend, 
  icon: Icon, 
  color, 
  onDetailClick,
  change,
  description,
  'data-testid': testId 
}: VisitorKpiCardProps) {
  const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";

  const colorClasses = {
    blue: {
      border: 'border-l-blue-500',
      icon: 'text-blue-500',
      eyeIcon: 'text-blue-500 hover:text-blue-700'
    },
    green: {
      border: 'border-l-green-500',
      icon: 'text-green-500',
      eyeIcon: 'text-green-500 hover:text-green-700'
    },
    purple: {
      border: 'border-l-purple-500',
      icon: 'text-purple-500',
      eyeIcon: 'text-purple-500 hover:text-purple-700'
    },
    orange: {
      border: 'border-l-orange-500',
      icon: 'text-orange-500',
      eyeIcon: 'text-orange-500 hover:text-orange-700'
    },
    red: {
      border: 'border-l-red-500',
      icon: 'text-red-500',
      eyeIcon: 'text-red-500 hover:text-red-700'
    }
  };

  const colors = colorClasses[color];

  return (
    <div 
      className={`analytics-new-card border-l-4 ${colors.border} relative`} 
      data-testid={testId}
    >
      {/* Header with icon and label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${colors.icon}`} />
          <div className="text-sm font-medium text-[var(--analytics-new-text-muted)]">
            {label}
          </div>
        </div>
        {USE_MOCK && (
          <div className="text-xs text-orange-500 font-medium">🧪 Mock</div>
        )}
      </div>

      {/* Value display */}
      <div className="text-2xl font-bold text-[var(--analytics-new-text)] mb-2">
        {value.toLocaleString()}
      </div>

      {/* Percentage change */}
      <div className={`text-xs flex items-center gap-1 mt-1 ${
        change >= 0 ? "text-green-600" : "text-red-600"
      }`}>
        {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous period
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--analytics-new-text-muted)] mt-1">
        {description}
      </p>

      {/* Sparkline trend */}
      {trend && trend.length > 0 && (
        <div className="flex items-center space-x-1 mb-3">
          {trend.slice(-7).map((point, index) => (
            <div
              key={index}
              className="flex-1 bg-gray-200 rounded-sm overflow-hidden"
              style={{ height: '4px' }}
            >
              <div
                className={`h-full bg-[var(--analytics-new-accent)] transition-all duration-300`}
                style={{ 
                  width: trend.length > 1 
                    ? `${Math.max(10, (point.value / Math.max(...trend.map(t => t.value))) * 100)}%` 
                    : '100%'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Eye icon for detailed view (bottom right) */}
      <button
        onClick={onDetailClick}
        className={`absolute bottom-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors ${colors.eyeIcon}`}
        title={`View ${label} details`}
        data-testid={`${testId}-detail-button`}
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}