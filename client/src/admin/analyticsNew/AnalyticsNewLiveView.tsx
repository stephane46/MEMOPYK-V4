import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Globe, Monitor, Smartphone, Tablet, Eye, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { CountryFlag } from '@/components/admin/CountryFlag';

interface GA4RealtimeData {
  activeUsers: number;
  byCountry: Array<{ country: string; users: number }>;
  byDevice: Array<{ device: string; users: number }>;
  timestamp: string;
  cached: boolean;
}

interface CurrentlyWatchingSession {
  sessionId: string;
  videoId: string | null;
  videoTitle?: string;
  progress: number;
  currentTime: number;
  duration: number;
  location: string;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
  regionCode?: string | null;
  device: string;
  clarityUrl: string;
}

interface CurrentlyWatchingData {
  totalActive: number;
  sessions: CurrentlyWatchingSession[];
  timestamp: string;
}

const AnalyticsNewActiveUsersBadge: React.FC<{ count: number; loading?: boolean }> = ({ 
  count, 
  loading = false 
}) => (
  <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
    <span className="font-semibold">
      {loading ? (
        <div className="w-6 h-4 bg-green-200 animate-pulse rounded" />
      ) : (
        count
      )}
    </span>
    <span className="text-sm">active now</span>
  </div>
);

const AnalyticsNewProgressBar: React.FC<{ 
  label: string; 
  value: number; 
  max: number;
  color?: string;
  animate?: boolean;
}> = ({ 
  label, 
  value, 
  max, 
  color = 'bg-[var(--analytics-new-orange)]',
  animate = true 
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--analytics-new-text)]">{label}</span>
        <span className="text-[var(--analytics-new-text-muted)]">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ease-out ${color} ${
            animate ? 'animate-pulse' : ''
          }`}
          style={{ 
            width: `${percentage}%`,
            transition: 'width 1s ease-out'
          }}
        />
      </div>
    </div>
  );
};

export const AnalyticsNewLiveView: React.FC = () => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [lastWatchingUpdate, setLastWatchingUpdate] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(!document.hidden);
  const [isLiveTabActive, setIsLiveTabActive] = useState<boolean>(false);
  
  // Check if the Live View tab is currently active
  useEffect(() => {
    const checkActiveTab = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const activeTab = urlParams.get('an_tab') || 'overview';
      setIsLiveTabActive(activeTab === 'live');
    };
    
    checkActiveTab();
    window.addEventListener('popstate', checkActiveTab);
    return () => window.removeEventListener('popstate', checkActiveTab);
  }, []);

  // Page Visibility API to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Calculate whether polling should be enabled
  const shouldPoll = isVisible && isLiveTabActive;
  
  // GA4 Realtime data - refetch every 10 seconds when active
  const { data: ga4Data, isLoading: ga4Loading, error: ga4Error } = useQuery<GA4RealtimeData>({
    queryKey: ['/api/ga4/realtime'],
    refetchInterval: shouldPoll ? 10000 : false, // 10 seconds when active
    refetchOnWindowFocus: false,
    enabled: shouldPoll, // Only query when tab is active and visible
  });

  // Currently watching data - refetch every 15 seconds when active
  const { data: watchingData, isLoading: watchingLoading, error: watchingError } = useQuery<CurrentlyWatchingData>({
    queryKey: ['/api/tracker/currently-watching'],
    refetchInterval: shouldPoll ? 15000 : false, // 15 seconds when active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    staleTime: 0, // Always fetch fresh data
    gcTime: 5000, // Only cache for 5 seconds to prevent stale data (TanStack Query v5)
    enabled: shouldPoll, // Only query when tab is active and visible
  });

  // Update last refresh time
  useEffect(() => {
    if (ga4Data?.timestamp) {
      setLastUpdate(new Date(ga4Data.timestamp).toLocaleTimeString());
    }
  }, [ga4Data?.timestamp]);

  // Update last watching refresh time
  useEffect(() => {
    if (watchingData?.timestamp) {
      setLastWatchingUpdate(new Date(watchingData.timestamp).toLocaleTimeString());
    }
  }, [watchingData?.timestamp]);

  // Error states
  if (ga4Error || watchingError) {
    return (
      <div className="analytics-new-container space-y-6">
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Failed to load live data"
          description="Unable to connect to realtime analytics. Please check your connection."
          showRetry={true}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/ga4/realtime'] });
            queryClient.invalidateQueries({ queryKey: ['/api/tracker/currently-watching'] });
          }}
        />
      </div>
    );
  }

  // Loading state
  if (ga4Loading && watchingLoading) {
    return (
      <div className="analytics-new-container space-y-6">
        <AnalyticsNewLoadingStates 
          mode="loading" 
          title="Loading live analytics..."
          description="Fetching real-time visitor activity"
        />
      </div>
    );
  }

  return (
    <div className="analytics-new-container space-y-6" data-testid="analytics-new-live-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-[var(--analytics-new-text)]">Live View</h2>
          {ga4Data && (
            <AnalyticsNewActiveUsersBadge 
              count={ga4Data.activeUsers} 
              loading={ga4Loading}
            />
          )}
        </div>
        <div className="text-sm text-[var(--analytics-new-text-muted)]">
          Last updated: {lastUpdate || 'Loading...'}
        </div>
      </div>

      {/* GA4 Realtime Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users by Country */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="w-5 h-5 text-[var(--analytics-new-orange)]" />
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              Active Users by Country
            </h3>
          </div>
          
          {ga4Loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-2 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : ga4Data?.byCountry ? (
            <div className="space-y-4">
              {ga4Data.byCountry.map((item, index) => (
                <AnalyticsNewProgressBar
                  key={item.country}
                  label={item.country}
                  value={item.users}
                  max={ga4Data.activeUsers}
                  color={index === 0 ? 'bg-[var(--analytics-new-orange)]' : 'bg-gray-400'}
                  animate={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-[var(--analytics-new-text-muted)]">No country data available</div>
          )}
        </div>

        {/* Active Users by Device */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Monitor className="w-5 h-5 text-[var(--analytics-new-orange)]" />
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              Active Users by Device
            </h3>
          </div>
          
          {ga4Loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-2 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : ga4Data?.byDevice ? (
            <div className="space-y-4">
              {ga4Data.byDevice.map((item, index) => {
                const DeviceIcon = item.device === 'Mobile' ? Smartphone : 
                                 item.device === 'Tablet' ? Tablet : Monitor;
                
                return (
                  <div key={item.device} className="flex items-center space-x-3">
                    <DeviceIcon className="w-4 h-4 text-[var(--analytics-new-orange)]" />
                    <div className="flex-1">
                      <AnalyticsNewProgressBar
                        label={item.device}
                        value={item.users}
                        max={ga4Data.activeUsers}
                        color={index === 0 ? 'bg-[var(--analytics-new-orange)]' : 'bg-blue-400'}
                        animate={true}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[var(--analytics-new-text-muted)]">No device data available</div>
          )}
        </div>
      </div>

      {/* Currently Watching Sessions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-[var(--analytics-new-orange)]" />
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              Currently Watching
            </h3>
            {watchingData && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
                {watchingData.totalActive} active sessions
              </span>
            )}
            <div className="text-sm text-[var(--analytics-new-text-muted)]">
              Auto-updated every 15 seconds
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-[var(--analytics-new-text-muted)]">
              Updated: {lastWatchingUpdate || 'Loading...'}
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/tracker/currently-watching'] })}
              className="text-[var(--analytics-new-orange)] hover:text-orange-600 text-sm font-medium"
              data-testid="refresh-currently-watching"
            >
              Refresh
            </button>
          </div>
        </div>

        {watchingLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex space-x-4 p-4 border border-gray-200 rounded">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : watchingData?.sessions && watchingData.sessions.length > 0 ? (
          <div className="space-y-4">
            {watchingData.sessions.map((session) => {
              // Helper functions for UI formatting
              const getVideoTitle = () => session.videoTitle || 'Video';
              const getLocationDisplay = () => {
                if (!session.country) return { hasFlag: false, text: 'Location unknown' };
                
                // Build city and region part
                let cityRegion = '';
                if (session.city) {
                  cityRegion = session.city;
                  if (session.region && session.region !== session.city) {
                    cityRegion += ` (${session.region})`;
                  }
                }
                
                return {
                  hasFlag: true,
                  country: session.country,
                  cityRegion: cityRegion || null,
                  countryCode: session.countryCode || null
                };
              };
              const getDeviceDisplay = () => {
                const device = session.device?.toLowerCase();
                if (device === 'desktop') return 'Desktop';
                if (device === 'mobile') return 'Mobile';
                if (device === 'tablet') return 'Tablet';
                return 'Desktop'; // fallback
              };
              const getTimeAgo = () => {
                const seconds = session.duration;
                if (seconds < 60) return `${seconds} s ago`;
                const minutes = Math.floor(seconds / 60);
                return `${minutes} min ago`;
              };
              const getShortId = () => {
                const id = session.sessionId.includes('...') 
                  ? session.sessionId.replace('...', '') 
                  : session.sessionId;
                return `#${id.slice(-4)}`;
              };

              const locationData = getLocationDisplay();

              return (
                <div 
                  key={session.sessionId} 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`watching-session-${session.sessionId}`}
                >
                  {/* Title row with video name and optional Clarity link */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-[var(--analytics-new-text)]">
                      {getVideoTitle()}
                    </h4>
                    {session.clarityUrl && (
                      <a
                        href={session.clarityUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--analytics-new-orange)] hover:text-orange-600 font-medium"
                        data-testid={`view-clarity-${session.sessionId}`}
                      >
                        View in Clarity ↗︎
                      </a>
                    )}
                  </div>

                  {/* Enhanced location display with flag */}
                  <div className="mb-3 space-y-1">
                    {locationData.hasFlag ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <CountryFlag country={locationData.country} size={16} />
                          <span className="text-sm font-light text-[var(--analytics-new-text-muted)]">
                            {locationData.country}
                          </span>
                        </div>
                        {locationData.cityRegion && (
                          <div className="text-sm font-bold text-[var(--analytics-new-text)]">
                            {locationData.cityRegion}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-[var(--analytics-new-text-muted)]">
                        {locationData.text}
                      </div>
                    )}
                  </div>

                  {/* Meta line: Device • timeAgo • #shortId */}
                  <div className="text-sm text-[var(--analytics-new-text-muted)] mb-3 flex items-center">
                    <span>
                      {getDeviceDisplay()} • {getTimeAgo()}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 ml-1 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            This shows when the viewer's last activity was detected. If it's only a few seconds ago, the video is actively playing. If it's longer, the viewer may have paused, left the page, or lost connection.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-gray-400 ml-1"> • {getShortId()}</span>
                  </div>

                  {/* Progress row: Progress bar + percentage label */}
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 bg-[var(--memopyk-orange)] rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${Math.max(0, Math.min(session.progress, 100))}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-[var(--analytics-new-text-muted)]">
                      {Math.round(Math.max(0, Math.min(session.progress, 100)))}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--analytics-new-text-muted)]">
            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div>No active sessions right now</div>
            <div className="text-sm">Sessions will appear here when visitors are watching videos</div>
          </div>
        )}
      </div>
    </div>
  );
};