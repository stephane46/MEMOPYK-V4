import React, { useState, useEffect } from 'react';
import { AnalyticsNewTabNavigation } from './AnalyticsNewTabNavigation';
import { AnalyticsNewGlobalFilters } from './AnalyticsNewGlobalFilters';
import { IpExclusionsManager } from '@/components/admin/IpExclusionsManager';
import { AnalyticsNewOverview } from './AnalyticsNewOverview';
import { AnalyticsNewLiveView } from './AnalyticsNewLiveView';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { AnalyticsNewVideo } from './AnalyticsNewVideo';
import { AnalyticsNewTrends } from './AnalyticsNewTrends';
import DataSourceBadge from './components/DataSourceBadge';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { Badge } from '@/components/ui/badge';
import { Calendar, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import './analyticsNew.tokens.css';

// Placeholder components for other tabs

const AnalyticsNewGeo: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Geographic Analytics</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Geographic data coming soon"
      description="Visitor distribution by location will be displayed here"
    />
  </div>
);

const AnalyticsNewCta: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">CTA Performance</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="CTA analytics coming soon"
      description="Call-to-action performance metrics will be displayed here"
    />
  </div>
);


const AnalyticsNewClarity: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Microsoft Clarity</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Clarity integration coming soon"
      description="Microsoft Clarity insights and heatmaps will be accessible here"
    />
  </div>
);

const AnalyticsNewFallback: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Diagnostics</h2>
    <AnalyticsNewLoadingStates 
      mode="error" 
      title="Error handling and diagnostics"
      description="System diagnostics and error recovery tools will be available here"
      showRetry={true}
    />
  </div>
);

interface AnalyticsNewDashboardProps {
  className?: string;
}

export const AnalyticsNewDashboard: React.FC<AnalyticsNewDashboardProps> = ({ 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { sinceDate, sinceDateEnabled } = useAnalyticsNewFilters();

  // Get IP exclusions count for badge
  const { data: exclusions = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/analytics/exclusions'],
  });

  // Format date for display (DD MMMM YYYY French format)
  const formatSinceDateForBadge = (dateString: string): string => {
    try {
      const date = DateTime.fromISO(dateString).setZone('Europe/Paris');
      return date.setLocale('fr').toFormat('dd LLLL yyyy');
    } catch (error) {
      return dateString; // Fallback to original if parsing fails
    }
  };

  // Get active IP exclusions count
  const activeExclusionsCount = exclusions.filter(exc => exc.active).length;

  // Navigation functions for badges
  const navigateToExclusions = () => {
    handleTabChange('exclusions');
  };

  // Read query parameter on component mount and URL changes
  // Default to overview when since date is enabled
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('an_tab');
    
    // If since date is enabled and no specific tab requested, default to overview
    if (!urlTab && sinceDateEnabled) {
      setActiveTab('overview');
    } else {
      setActiveTab(urlTab || 'overview');
    }
  }, [sinceDateEnabled]);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(params.get('an_tab') || 'overview');
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle tab changes and update URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Update URL with query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('an_tab', tabId);
    window.history.pushState({}, '', url.toString());
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalyticsNewOverview />;
      case 'live':
        return <AnalyticsNewLiveView />;
      case 'video':
        return <AnalyticsNewVideo />;
      case 'geo':
        return <AnalyticsNewGeo />;
      case 'cta':
        return <AnalyticsNewCta />;
      case 'trends':
        return <AnalyticsNewTrends />;
      case 'clarity':
        return <AnalyticsNewClarity />;
      case 'fallback':
        return <AnalyticsNewFallback />;
      case 'exclusions':
        return <IpExclusionsManager />;
      default:
        return <AnalyticsNewOverview />;
    }
  };

  return (
    <div 
      className={`analytics-new-container min-h-screen bg-[var(--analytics-new-background)] ${className}`}
      data-testid="analytics-new-dashboard"
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--analytics-new-text)] flex items-center gap-3">
                Analytics New Dashboard
                <DataSourceBadge />
              </h1>
              <p className="text-[var(--analytics-new-text-muted)] mt-1">
                Comprehensive analytics platform for MEMOPYK
              </p>
            </div>
            {/* Compact Header Badges */}
            <div className="flex items-center gap-2">
              {/* Since Date Badge - Always visible when ON */}
              {sinceDateEnabled && sinceDate && (
                <Badge 
                  variant="outline" 
                  className="seo-language-btn-active text-sm font-medium cursor-pointer transition-colors"
                  onClick={navigateToExclusions}
                  title="Hides data before this date in standard reports."
                  data-testid="since-badge"
                >
                  Since: {formatSinceDateForBadge(sinceDate)}
                </Badge>
              )}
              
              {/* IP Exclusions Badge - Visible when ≥1 active rule */}
              {activeExclusionsCount > 0 && (
                <Badge 
                  variant="outline" 
                  className="bg-gray-50 border-gray-300 text-gray-800 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={navigateToExclusions}
                  title={`${activeExclusionsCount} active IP/CIDR exclusions (relay blocking future events).`}
                  data-testid="ips-badge"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  IPs: {activeExclusionsCount}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Global Filters */}
          <AnalyticsNewGlobalFilters />
        </div>

        {/* Tab Navigation */}
        <AnalyticsNewTabNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};